const pool = require('../config/database');

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
        const salesRepId = req.user.id;

        const result = await pool.query(
            `SELECT 
        c.*,
        COUNT(a.id) as total_adverts,
        COALESCE(SUM(a.amount_paid), 0) as total_spent
      FROM clients c
      LEFT JOIN adverts a ON c.id = a.client_id
      WHERE c.id = $1 AND c.sales_rep_id = $2
      GROUP BY c.id`,
            [id, salesRepId]
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
        const salesRepId = req.user.id;
        const { q = '' } = req.query;

        const result = await pool.query(
            `SELECT id, name, email, phone, company
       FROM clients
       WHERE sales_rep_id = $1
         AND (name ILIKE $2 OR email ILIKE $2 OR company ILIKE $2)
       ORDER BY name ASC
       LIMIT 10`,
            [salesRepId, `%${q}%`]
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
 * Create new client
 */
const createClient = async (req, res) => {
    try {
        const { name, email, phone, company, notes } = req.body;
        const salesRepId = req.user.id;

        if (!name || name.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'Client name is required'
            });
        }

        const result = await pool.query(
            `INSERT INTO clients (name, email, phone, company, notes, sales_rep_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
            [name.trim(), email || null, phone || null, company || null, notes || null, salesRepId]
        );

        res.status(201).json({
            success: true,
            message: 'Client created successfully',
            data: { client: result.rows[0] }
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
        const { name, email, phone, company, notes } = req.body;
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

        const result = await pool.query(
            `UPDATE clients
       SET name = $1, email = $2, phone = $3, company = $4, notes = $5, updated_at = CURRENT_TIMESTAMP
       WHERE id = $6
       RETURNING *`,
            [name, email || null, phone || null, company || null, notes || null, id]
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
        const salesRepId = req.user.id;

        if (!keepId || !mergeIds || !Array.isArray(mergeIds) || mergeIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid merge request. Provide keepId and mergeIds array.'
            });
        }

        await client.query('BEGIN');

        // Verify ownership of all clients
        const allIds = [keepId, ...mergeIds];
        const ownerCheck = await client.query(
            'SELECT id FROM clients WHERE id = ANY($1) AND sales_rep_id = $2',
            [allIds, salesRepId]
        );

        if (ownerCheck.rows.length !== allIds.length) {
            await client.query('ROLLBACK');
            return res.status(403).json({
                success: false,
                message: 'You can only merge your own clients'
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

module.exports = {
    getClients,
    getClientById,
    searchClients,
    createClient,
    updateClient,
    deleteClient,
    mergeClients
};
