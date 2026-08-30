const pool = require('../config/database');
const { normalizeZimPhone, isValidZimPhone } = require('../utils/phone');

/**
 * Get all clients for the authenticated sales rep
 */
const getClients = async (req, res) => {
    try {
        const salesRepId = req.user.id;
        const { page = 1, limit = 15, search = '' } = req.query;
        const offset = (page - 1) * limit;

        let query = `
      SELECT 
        c.*,
        COUNT(a.id) as total_adverts,
        COALESCE(SUM(a.amount_paid), 0) as total_spent
      FROM clients c
      LEFT JOIN adverts a ON c.id = a.client_id
      WHERE c.sales_rep_id = $1
    `;

        const params = [salesRepId];
        let paramCount = 2;

        // Add search filter if provided
        if (search) {
            query += ` AND (
        c.name ILIKE $${paramCount} OR 
        c.email ILIKE $${paramCount} OR 
        c.company ILIKE $${paramCount} OR
        c.phone ILIKE $${paramCount}
      )`;
            params.push(`%${search}%`);
            paramCount++;
        }

        query += ` GROUP BY c.id ORDER BY c.name ASC`;

        // Get total count
        const countQuery = `SELECT COUNT(*) FROM clients WHERE sales_rep_id = $1` +
            (search ? ` AND (name ILIKE $2 OR email ILIKE $2 OR company ILIKE $2 OR phone ILIKE $2)` : '');
        const countResult = await pool.query(countQuery, search ? [salesRepId, `%${search}%`] : [salesRepId]);
        const total = parseInt(countResult.rows[0].count);

        // Add pagination
        query += ` LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
        params.push(limit, offset);

        const result = await pool.query(query, params);

        res.json({
            success: true,
            data: {
                clients: result.rows,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    totalPages: Math.ceil(total / limit)
                }
            }
        });
    } catch (error) {
        console.error('Get clients error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching clients'
        });
    }
};

/**
 * Get single client by ID (with ownership check)
 */
const getClientById = async (req, res) => {
    try {
        const { id } = req.params;

        // Viewable by any authenticated rep/admin — needed to click through
        // from the Free Clients list or search results regardless of who
        // currently owns the client.
        const result = await pool.query(
            `SELECT
        c.*,
        u.full_name AS sales_rep_name,
        COUNT(a.id) as total_adverts,
        COALESCE(SUM(a.amount_paid), 0) as total_spent,
        MAX(a.start_date) AS last_advert_date
      FROM clients c
      LEFT JOIN users u ON c.sales_rep_id = u.id
      LEFT JOIN adverts a ON c.id = a.client_id
      WHERE c.id = $1
      GROUP BY c.id, u.full_name`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Client not found'
            });
        }

        res.json({
            success: true,
            data: { client: result.rows[0] }
        });
    } catch (error) {
        console.error('Get client error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching client'
        });
    }
};

/**
 * Search clients (autocomplete)
 */
const searchClients = async (req, res) => {
    try {
        const { q = '' } = req.query;

        // Company-wide, not scoped to the searching rep — a rep must be able
        // to find a client another rep created, or every naming variant
        // becomes a new row. If the query looks like a phone number, also
        // match on the normalized form so formatting differences don't
        // produce a false "no existing client" miss.
        const normalizedQueryPhone = normalizeZimPhone(q);

        // Ownership for the 60-day window follows whoever booked this client
        // most recently (see clientController's getFreeClients/getAllClients
        // for the same fix) — not clients.sales_rep_id, which is only set
        // once at creation and would show the original creator forever even
        // after someone else has since booked and become the real owner.
        const result = await pool.query(
            `SELECT
                c.id, c.name, c.email, c.phone, c.company,
                latest.sales_rep_id AS owner_rep_id,
                u.full_name AS owner_rep_name,
                latest.start_date AS last_advert_date,
                CASE WHEN latest.start_date IS NULL THEN NULL
                     ELSE (CURRENT_DATE - latest.start_date) END AS days_since_last_advert,
                CASE WHEN latest.start_date IS NULL THEN false
                     ELSE (CURRENT_DATE - latest.start_date) < 60 END AS is_within_ownership_window
             FROM clients c
             LEFT JOIN LATERAL (
                SELECT a.sales_rep_id, a.start_date
                FROM adverts a
                WHERE a.client_id = c.id
                ORDER BY a.start_date DESC
                LIMIT 1
             ) latest ON true
             LEFT JOIN users u ON latest.sales_rep_id = u.id
             WHERE c.name ILIKE $1 OR c.email ILIKE $1 OR c.company ILIKE $1
                OR ($2::text IS NOT NULL AND c.phone = $2)
             ORDER BY c.name ASC
             LIMIT 10`,
            [`%${q}%`, normalizedQueryPhone]
        );

        res.json({
            success: true,
            data: { clients: result.rows }
        });
    } catch (error) {
        console.error('Search clients error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error searching clients'
        });
    }
};

/**
 * Validate billing-related client fields. Returns an error message string
 * if invalid, or null if everything checks out.
 */
const validateClientPayload = (payload) => {
    const { name, email, phone, tin, vat_number, address_line1, city } = payload;

    if (!name || name.trim() === '') {
        return 'Client name is required';
    }
    if (name.trim().length < 2) {
        return 'Client name must be at least 2 characters';
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return 'Invalid email address';
    }

    // Phone is the identity key that stops duplicate client records from
    // being created under name-spelling variants — required, and must be a
    // real Zimbabwean mobile number so normalizeZimPhone() can match it
    // reliably against existing clients.
    if (!phone || !phone.trim()) {
        return 'Phone number is required';
    }
    if (!isValidZimPhone(phone)) {
        return 'Enter a valid Zimbabwean mobile number (e.g. 077 123 4567)';
    }

    // TIN: Zimbabwean TINs are 10 digits. Be permissive but sane.
    if (tin && !/^\d{8,12}$/.test(tin.replace(/\s/g, ''))) {
        return 'TIN must be 8–12 digits';
    }
    if (vat_number && !/^[\d-]{6,20}$/.test(vat_number.replace(/\s/g, ''))) {
        return 'Invalid VAT number';
    }

    // If the client has a TIN/VAT they're a business — require at least an address line + city.
    const hasTaxId = (tin && tin.trim()) || (vat_number && vat_number.trim());
    if (hasTaxId && (!address_line1 || !address_line1.trim() || !city || !city.trim())) {
        return 'Business clients (with TIN/VAT) must have an address line and city';
    }

    return null;
};

/**
 * Create new client
 */
const createClient = async (req, res) => {
    try {
        const {
            name, email, phone, company, notes,
            contact_person, address_line1, address_line2,
            city, country, tin, vat_number
        } = req.body;
        const salesRepId = req.user.id;

        const validationError = validateClientPayload(req.body);
        if (validationError) {
            return res.status(400).json({ success: false, message: validationError });
        }

        const normalizedPhone = normalizeZimPhone(phone);

        // Phone is the identity check across the whole company, not just this
        // rep's own list — this is what actually stops a second rep from
        // creating "Amanda M" when "Madam Amanda" already exists under a
        // different rep, which the old per-rep-scoped check could never catch.
        const existing = await pool.query(
            `SELECT c.*, u.full_name AS sales_rep_name
             FROM clients c LEFT JOIN users u ON c.sales_rep_id = u.id
             WHERE c.phone = $1`,
            [normalizedPhone]
        );
        if (existing.rows.length > 0) {
            return res.status(409).json({
                success: false,
                message: `This number is already registered to ${existing.rows[0].name} (${existing.rows[0].sales_rep_name || 'unassigned'}). Use that client instead of creating a new one.`,
                data: { client: existing.rows[0] }
            });
        }

        const result = await pool.query(
            `INSERT INTO clients (
                name, email, phone, company, notes,
                contact_person, address_line1, address_line2, city, country,
                tin, vat_number, sales_rep_id
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            RETURNING *`,
            [
                name.trim(),
                email || null,
                normalizedPhone,
                company || null,
                notes || null,
                contact_person || null,
                address_line1 || null,
                address_line2 || null,
                city || null,
                country || 'Zimbabwe',
                tin || null,
                vat_number || null,
                salesRepId
            ]
        );

        const newClient = result.rows[0];

        // Standardizing a name that already has history under it should
        // restore that history, not just start a fresh, disconnected
        // record — otherwise "add a phone number" quietly orphans every
        // booking that happened before this client was properly linked.
        const relinked = await pool.query(
            `UPDATE adverts SET client_id = $1
             WHERE client_id IS NULL AND lower(trim(client_name)) = lower(trim($2))
             RETURNING id`,
            [newClient.id, name]
        );

        res.status(201).json({
            success: true,
            message: relinked.rows.length > 0
                ? `Client created and ${relinked.rows.length} past booking(s) linked to this record`
                : 'Client created successfully',
            data: { client: newClient, relinkedAdverts: relinked.rows.length }
        });
    } catch (error) {
        console.error('Create client error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error creating client'
        });
    }
};

/**
 * Update client (with ownership check)
 */
const updateClient = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            name, email, phone, company, notes,
            contact_person, address_line1, address_line2,
            city, country, tin, vat_number
        } = req.body;
        const salesRepId = req.user.id;

        const validationError = validateClientPayload(req.body);
        if (validationError) {
            return res.status(400).json({ success: false, message: validationError });
        }

        // Any rep can view/select any client (see searchClients), but editing
        // stays restricted to the current owner or an admin — reactivating a
        // dormant client for a new booking doesn't require rewriting their
        // contact details.
        const ownerCheck = await pool.query(
            'SELECT id FROM clients WHERE id = $1 AND (sales_rep_id = $2 OR $3 = true)',
            [id, salesRepId, req.user.role === 'admin']
        );

        if (ownerCheck.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Client not found'
            });
        }

        const normalizedPhone = normalizeZimPhone(phone);
        const dupCheck = await pool.query(
            'SELECT id, name FROM clients WHERE phone = $1 AND id != $2',
            [normalizedPhone, id]
        );
        if (dupCheck.rows.length > 0) {
            return res.status(409).json({
                success: false,
                message: `This number already belongs to ${dupCheck.rows[0].name}. Merge these two instead of using the same number on both.`
            });
        }

        const result = await pool.query(
            `UPDATE clients
            SET name = $1, email = $2, phone = $3, company = $4, notes = $5,
                contact_person = $6, address_line1 = $7, address_line2 = $8,
                city = $9, country = $10, tin = $11, vat_number = $12,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $13
            RETURNING *`,
            [
                name.trim(),
                email || null,
                normalizedPhone,
                company || null,
                notes || null,
                contact_person || null,
                address_line1 || null,
                address_line2 || null,
                city || null,
                country || 'Zimbabwe',
                tin || null,
                vat_number || null,
                id
            ]
        );

        res.json({
            success: true,
            message: 'Client updated successfully',
            data: { client: result.rows[0] }
        });
    } catch (error) {
        console.error('Update client error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error updating client'
        });
    }
};

/**
 * Delete client (with ownership check and advert check)
 */
const deleteClient = async (req, res) => {
    try {
        const { id } = req.params;
        const salesRepId = req.user.id;

        // Check ownership
        const ownerCheck = await pool.query(
            'SELECT id FROM clients WHERE id = $1 AND sales_rep_id = $2',
            [id, salesRepId]
        );

        if (ownerCheck.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Client not found'
            });
        }

        // Check if client has adverts
        const advertCheck = await pool.query(
            'SELECT COUNT(*) as count FROM adverts WHERE client_id = $1',
            [id]
        );

        if (parseInt(advertCheck.rows[0].count) > 0) {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete client with existing adverts. Please merge with another client instead.'
            });
        }

        await pool.query('DELETE FROM clients WHERE id = $1', [id]);

        res.json({
            success: true,
            message: 'Client deleted successfully'
        });
    } catch (error) {
        console.error('Delete client error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error deleting client'
        });
    }
};

/**
 * Merge multiple clients into one
 */
const mergeClients = async (req, res) => {
    const client = await pool.connect();

    try {
        const { keepId, mergeIds } = req.body;

        if (!keepId || !mergeIds || !Array.isArray(mergeIds) || mergeIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid merge request. Provide keepId and mergeIds array.'
            });
        }

        await client.query('BEGIN');

        // Duplicates routinely span two different reps' client lists (that's
        // the whole reason they exist), so merging can't be restricted to
        // "your own" clients the way the old ownership-scoped check required
        // — any authenticated rep can merge, since fixing a duplicate helps
        // everyone regardless of who created either record.
        const allIds = [keepId, ...mergeIds];
        const existCheck = await client.query(
            'SELECT id FROM clients WHERE id = ANY($1)',
            [allIds]
        );

        if (existCheck.rows.length !== allIds.length) {
            await client.query('ROLLBACK');
            return res.status(404).json({
                success: false,
                message: 'One or more clients in this merge no longer exist'
            });
        }

        // Transfer all adverts from merge clients to keep client
        await client.query(
            'UPDATE adverts SET client_id = $1 WHERE client_id = ANY($2)',
            [keepId, mergeIds]
        );

        // Delete merged clients
        await client.query(
            'DELETE FROM clients WHERE id = ANY($1)',
            [mergeIds]
        );

        await client.query('COMMIT');
        console.log(`Client merge by user ${req.user.id}: merged [${mergeIds.join(', ')}] into ${keepId}`);

        // Get updated client with new stats
        const updatedClient = await client.query(
            `SELECT 
        c.*,
        COUNT(a.id) as total_adverts,
        COALESCE(SUM(a.amount_paid), 0) as total_spent
      FROM clients c
      LEFT JOIN adverts a ON c.id = a.client_id
      WHERE c.id = $1
      GROUP BY c.id`,
            [keepId]
        );

        res.json({
            success: true,
            message: `Successfully merged ${mergeIds.length} client(s)`,
            data: { client: updatedClient.rows[0] }
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Merge clients error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error merging clients'
        });
    } finally {
        client.release();
    }
};

/**
 * Free clients — clients whose most recent booking is 60+ days old. This is
 * the same dormancy rule that resolves the "I worked this client months
 * ago" commission disputes: past the window, the client is open, and
 * whoever books them next gets the commission. Made visible here instead of
 * left as a memorized rule reps have to argue about.
 */
const DORMANCY_DAYS = 60;

const getFreeClients = async (req, res) => {
    try {
        // Real dormant clients don't stop being real just because a booking
        // predates clientId being required. Bookings made before this feature
        // shipped mostly only have a free-text client_name with no clients-
        // table row at all — excluding those would hide most of the business's
        // actual dormant relationships, not just the ones cleanly modeled.
        // So this unions two sources: (1) proper clients-table rows via
        // client_id, same as before, and (2) the most recent booking per
        // distinct name among adverts that were never linked to a client
        // record, skipped only where that exact name already has a real
        // clients row (to avoid double-listing the same person once linked
        // data and old free-text data happen to share a name). The unlinked
        // ones carry is_linked: false so the frontend can flag them as
        // needing a real client record — clicking one should prompt creating
        // it with a phone number, not silently pretend it's already clean.
        const result = await pool.query(
            `WITH linked AS (
                -- Ownership follows the rep of the most recent ADVERT, not
                -- clients.sales_rep_id — that column is only ever set once,
                -- at client creation, and never updated. Once clients are
                -- shared company-wide, a different rep booking the same
                -- client later is the normal case, and reading the stale
                -- creator instead of the actual last booker would silently
                -- misattribute ownership for exactly the scenario this
                -- whole feature exists to get right.
                SELECT DISTINCT ON (c.id)
                    c.id, c.name, c.phone,
                    a.sales_rep_id, u.full_name AS last_rep_name,
                    a.start_date AS last_advert_date,
                    true AS is_linked
                FROM clients c
                JOIN adverts a ON a.client_id = c.id
                LEFT JOIN users u ON a.sales_rep_id = u.id
                ORDER BY c.id, a.start_date DESC
             ),
             unlinked_latest AS (
                SELECT DISTINCT ON (lower(trim(a.client_name)))
                    a.client_name AS name,
                    a.sales_rep_id,
                    a.start_date AS last_advert_date
                FROM adverts a
                WHERE a.client_id IS NULL
                  AND a.client_name IS NOT NULL
                  AND trim(a.client_name) != ''
                ORDER BY lower(trim(a.client_name)), a.start_date DESC
             ),
             unlinked AS (
                SELECT
                    NULL::integer AS id, ul.name, NULL::text AS phone, ul.sales_rep_id,
                    u.full_name AS last_rep_name, ul.last_advert_date, false AS is_linked
                FROM unlinked_latest ul
                LEFT JOIN users u ON ul.sales_rep_id = u.id
                WHERE NOT EXISTS (
                    SELECT 1 FROM clients c WHERE lower(trim(c.name)) = lower(trim(ul.name))
                )
             )
             SELECT *, (CURRENT_DATE - last_advert_date) AS days_dormant
             FROM (
                SELECT * FROM linked
                UNION ALL
                SELECT * FROM unlinked
             ) combined
             WHERE last_advert_date <= CURRENT_DATE - INTERVAL '${DORMANCY_DAYS} days'
             ORDER BY last_advert_date ASC`
        );

        res.json({
            success: true,
            data: { clients: result.rows, dormancyDays: DORMANCY_DAYS }
        });
    } catch (error) {
        console.error('Get free clients error:', error);
        res.status(500).json({ success: false, message: 'Server error fetching free clients' });
    }
};

/**
 * Possible duplicate clients — grouped by normalized name (lowercase,
 * trimmed, common titles stripped, whitespace collapsed). Phone-based
 * matching can't find historical duplicates because old records mostly
 * predate the phone requirement; this is the best a query can do for
 * existing data. A rep reviews each group and merges the real matches —
 * this can't be fully automatic without more data than exists.
 */
const getPossibleDuplicates = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT
                regexp_replace(
                    lower(trim(regexp_replace(c.name, '^(mr|mrs|ms|miss|dr|madam|mr\\.|mrs\\.|dr\\.)\\s+', '', 'i'))),
                    '\\s+', ' ', 'g'
                ) AS normalized_name,
                c.id, c.name, c.phone, c.company, c.sales_rep_id,
                u.full_name AS sales_rep_name,
                COUNT(a.id) AS total_adverts,
                MAX(a.start_date) AS last_advert_date
             FROM clients c
             LEFT JOIN users u ON c.sales_rep_id = u.id
             LEFT JOIN adverts a ON a.client_id = c.id
             GROUP BY c.id, u.full_name
             ORDER BY normalized_name ASC`
        );

        const groups = {};
        for (const row of result.rows) {
            if (!groups[row.normalized_name]) groups[row.normalized_name] = [];
            groups[row.normalized_name].push(row);
        }

        const duplicates = Object.entries(groups)
            .filter(([, clients]) => clients.length > 1)
            .map(([normalizedName, clients]) => ({ normalizedName, clients }));

        res.json({
            success: true,
            data: { duplicateGroups: duplicates }
        });
    } catch (error) {
        console.error('Get possible duplicates error:', error);
        res.status(500).json({ success: false, message: 'Server error finding duplicate clients' });
    }
};

/**
 * All clients, linked and unlinked, no dormancy filter — the general
 * standardization view. Free Clients only shows the 60+ day-dormant slice
 * of this same problem; active clients booked recently can be just as
 * unlinked/phone-less, and waiting for them to go dormant before surfacing
 * them here would mean the next booking against them hits the phone-
 * required booking gate with no warning beforehand.
 */
const getAllClients = async (req, res) => {
    try {
        const result = await pool.query(
            `WITH linked_agg AS (
                SELECT
                    c.id, c.name, c.phone,
                    MAX(a.start_date) AS last_advert_date,
                    COUNT(a.id) AS total_adverts,
                    COALESCE(SUM(a.amount_paid), 0) AS total_spent
                FROM clients c
                LEFT JOIN adverts a ON a.client_id = c.id
                GROUP BY c.id
             ),
             -- Ownership follows the rep of the most recent ADVERT, not
             -- clients.sales_rep_id (only ever set once, at creation, never
             -- updated) — kept separate from the aggregate above since a
             -- plain GROUP BY can't also tell you which specific row is the
             -- latest one.
             linked_latest_rep AS (
                SELECT DISTINCT ON (a.client_id)
                    a.client_id, a.sales_rep_id
                FROM adverts a
                WHERE a.client_id IS NOT NULL
                ORDER BY a.client_id, a.start_date DESC
             ),
             linked AS (
                SELECT
                    la.id, la.name, la.phone,
                    llr.sales_rep_id, u.full_name AS last_rep_name,
                    la.last_advert_date, la.total_adverts, la.total_spent,
                    true AS is_linked
                FROM linked_agg la
                LEFT JOIN linked_latest_rep llr ON llr.client_id = la.id
                LEFT JOIN users u ON llr.sales_rep_id = u.id
             ),
             unlinked_norm AS (
                SELECT
                    a.id, a.client_name, a.start_date, a.amount_paid,
                    lower(trim(a.client_name)) AS norm_name
                FROM adverts a
                WHERE a.client_id IS NULL
                  AND a.client_name IS NOT NULL
                  AND trim(a.client_name) != ''
             ),
             unlinked_display_name AS (
                SELECT DISTINCT ON (norm_name) norm_name, client_name AS name
                FROM unlinked_norm
                ORDER BY norm_name, start_date DESC
             ),
             unlinked_agg AS (
                SELECT
                    norm_name,
                    MAX(start_date) AS last_advert_date,
                    COUNT(id) AS total_adverts,
                    COALESCE(SUM(amount_paid), 0) AS total_spent
                FROM unlinked_norm
                GROUP BY norm_name
             ),
             unlinked AS (
                SELECT
                    NULL::integer AS id, dn.name, NULL::text AS phone,
                    NULL::integer AS sales_rep_id, NULL::text AS last_rep_name,
                    ua.last_advert_date, ua.total_adverts, ua.total_spent,
                    false AS is_linked
                FROM unlinked_agg ua
                JOIN unlinked_display_name dn ON dn.norm_name = ua.norm_name
                WHERE NOT EXISTS (
                    SELECT 1 FROM clients c WHERE lower(trim(c.name)) = ua.norm_name
                )
             )
             SELECT * FROM linked
             UNION ALL
             SELECT * FROM unlinked
             ORDER BY is_linked ASC, last_advert_date DESC NULLS LAST`
        );

        res.json({ success: true, data: { clients: result.rows } });
    } catch (error) {
        console.error('Get all clients error:', error);
        res.status(500).json({ success: false, message: 'Server error fetching clients' });
    }
};

/**
 * Standardize an unlinked (free-text-only) client: create a real clients
 * row and relink its history. Deliberately separate from createClient
 * rather than overloading it — standardizing often means fixing a typo in
 * the same action as adding a phone, and relinking has to match against
 * the ORIGINAL misspelled name from the historical adverts, not whatever
 * corrected name is being saved going forward. Matching on the new name
 * instead would silently fail to reconnect exactly the typo cases this
 * exists to fix.
 */
const standardizeClient = async (req, res) => {
    try {
        const { originalName, name, phone, email, company } = req.body;

        if (!originalName || !originalName.trim()) {
            return res.status(400).json({ success: false, message: 'originalName is required to find the bookings to relink' });
        }

        const validationError = validateClientPayload(req.body);
        if (validationError) {
            return res.status(400).json({ success: false, message: validationError });
        }

        const normalizedPhone = normalizeZimPhone(phone);
        const existing = await pool.query(
            `SELECT c.*, u.full_name AS sales_rep_name
             FROM clients c LEFT JOIN users u ON c.sales_rep_id = u.id
             WHERE c.phone = $1`,
            [normalizedPhone]
        );
        if (existing.rows.length > 0) {
            return res.status(409).json({
                success: false,
                message: `This number is already registered to ${existing.rows[0].name} (${existing.rows[0].sales_rep_name || 'unassigned'}). Use that client instead.`,
                data: { client: existing.rows[0] }
            });
        }

        const result = await pool.query(
            `INSERT INTO clients (name, email, phone, company, sales_rep_id)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [name.trim(), email || null, normalizedPhone, company || null, req.user.id]
        );
        const newClient = result.rows[0];

        const relinked = await pool.query(
            `UPDATE adverts SET client_id = $1
             WHERE client_id IS NULL AND lower(trim(client_name)) = lower(trim($2))
             RETURNING id`,
            [newClient.id, originalName]
        );

        res.status(201).json({
            success: true,
            message: `Standardized — ${relinked.rows.length} past booking(s) linked to this record`,
            data: { client: newClient, relinkedAdverts: relinked.rows.length }
        });
    } catch (error) {
        console.error('Standardize client error:', error);
        res.status(500).json({ success: false, message: 'Server error standardizing client' });
    }
};

module.exports = {
    getClients,
    getClientById,
    searchClients,
    createClient,
    updateClient,
    deleteClient,
    mergeClients,
    getFreeClients,
    getPossibleDuplicates,
    getAllClients,
    standardizeClient
};
