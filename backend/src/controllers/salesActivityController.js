const pool = require('../config/database');
const { normalizeContactPhone } = require('../utils/phone');
const rules = require('../utils/salesActivityRules');

const {
  OUTCOME, CLIENT_TYPE, LIST_FIELDS, AUDITED_FIELDS,
  todayInHarare, isDateString, addDays, weekBounds, countWorkingDays,
  followUpStatus, validateActivity, canEditActivity, canViewActivity,
  diffActivity, summarize, targetProgress
} = rules;

// DATE / NUMERIC columns come back as text so a JS Date never drags the
// server's timezone into what are plain calendar dates.
const ACTIVITY_COLUMNS = `
  a.id, a.activity_date::text AS activity_date, a.rep_user_id, a.client_id,
  a.contact_person, a.contact_title, a.line_of_business, a.phone, a.email,
  a.contact_method, a.product_pitched, a.client_type, a.outcome,
  a.quoted_amount_usd::float8 AS quoted_amount_usd, a.feedback_notes,
  a.main_objection, a.next_action, a.follow_up_date::text AS follow_up_date,
  a.is_withdrawn, a.created_at, a.updated_at`;

// "Latest" = the rep's most recent row for that client. Older rows' follow-ups
// have been acted on by the later contact, so they are Superseded, not Overdue.
const RANKED_CTE = `
  WITH ranked AS (
    SELECT a.*,
      (ROW_NUMBER() OVER (PARTITION BY a.client_id, a.rep_user_id
                          ORDER BY a.activity_date DESC, a.id DESC) = 1) AS is_latest
    FROM sales_activities a
    WHERE NOT a.is_withdrawn
  )`;

const decorate = (row, today) => ({
  ...row,
  follow_up_status: followUpStatus(row, today, { isLatest: row.is_latest !== false })
});

const isAdminUser = (req) => req.user.role === 'admin';

const validationFailed = (res, errors) =>
  res.status(400).json({
    success: false,
    message: 'Validation failed',
    errors: Object.entries(errors).map(([field, message]) => ({ field, message }))
  });

const serverError = (res, label, error) => {
  console.error(`${label}:`, error);
  res.status(500).json({ success: false, message: `Server error: ${label.toLowerCase()}` });
};

const loadOptions = async (db = pool) => {
  const result = await db.query(
    `SELECT list_key, label FROM sales_activity_options
     WHERE is_active ORDER BY list_key, sort_order, id`
  );
  const options = {};
  for (const r of result.rows) (options[r.list_key] = options[r.list_key] || []).push(r.label);
  return options;
};

const loadTargetConfig = async (db = pool) => {
  const [settings, overrides] = await Promise.all([
    db.query('SELECT key, value FROM sales_activity_settings'),
    db.query('SELECT user_id, daily_target FROM sales_activity_rep_targets')
  ]);
  const map = Object.fromEntries(settings.rows.map((r) => [r.key, r.value]));
  const defaultDailyTarget = parseInt(map.default_daily_target, 10);
  const workingDays = parseInt(map.working_days_per_week, 10);
  const byRep = new Map(overrides.rows.map((r) => [r.user_id, r.daily_target]));
  return {
    defaultDailyTarget: Number.isInteger(defaultDailyTarget) ? defaultDailyTarget : rules.DEFAULT_DAILY_TARGET,
    workingDays: Number.isInteger(workingDays) ? workingDays : rules.DEFAULT_WORKING_DAYS,
    overrides: byRep,
    dailyTargetFor(userId) {
      return byRep.has(userId) ? byRep.get(userId) : this.defaultDailyTarget;
    }
  };
};

// Reps are always pinned to themselves; admins may look at any rep.
const resolveRepId = (req) => {
  if (!isAdminUser(req)) return req.user.id;
  const id = parseInt(req.query.repId, 10);
  return Number.isInteger(id) ? id : null;
};

// ---------------------------------------------------------------- options

const getOptions = async (req, res) => {
  try {
    const includeInactive = isAdminUser(req) && req.query.all === '1';
    const result = await pool.query(
      `SELECT id, list_key, label, sort_order, is_active, is_locked
       FROM sales_activity_options
       ${includeInactive ? '' : 'WHERE is_active'}
       ORDER BY list_key, sort_order, id`
    );
    const lists = {};
    for (const r of result.rows) (lists[r.list_key] = lists[r.list_key] || []).push(r);
    res.json({ success: true, data: { options: lists } });
  } catch (error) {
    serverError(res, 'Fetching options', error);
  }
};

const createOption = async (req, res) => {
  try {
    const { listKey, label } = req.body;
    if (!Object.values(LIST_FIELDS).includes(listKey)) {
      return validationFailed(res, { listKey: 'Unknown list' });
    }
    if (!label || !String(label).trim()) return validationFailed(res, { label: 'Label is required' });

    const result = await pool.query(
      `INSERT INTO sales_activity_options (list_key, label, sort_order)
       VALUES ($1, $2, COALESCE((SELECT MAX(sort_order) FROM sales_activity_options WHERE list_key = $1), 0) + 1)
       ON CONFLICT (list_key, label) DO NOTHING
       RETURNING id, list_key, label, sort_order, is_active, is_locked`,
      [listKey, String(label).trim()]
    );
    if (result.rows.length === 0) {
      return res.status(409).json({ success: false, message: 'That option already exists' });
    }
    res.status(201).json({ success: true, data: { option: result.rows[0] } });
  } catch (error) {
    serverError(res, 'Creating option', error);
  }
};

const updateOption = async (req, res) => {
  const client = await pool.connect();
  try {
    const { label, isActive, sortOrder } = req.body;
    await client.query('BEGIN');

    const found = await client.query('SELECT * FROM sales_activity_options WHERE id = $1 FOR UPDATE', [req.params.id]);
    if (found.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Option not found' });
    }
    const option = found.rows[0];
    const newLabel = label === undefined ? option.label : String(label).trim();

    if (option.is_locked && (newLabel !== option.label || isActive === false)) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'This option drives the sales-activity rules and can only be reordered'
      });
    }
    if (!newLabel) {
      await client.query('ROLLBACK');
      return validationFailed(res, { label: 'Label is required' });
    }

    const updated = await client.query(
      `UPDATE sales_activity_options
       SET label = $1, is_active = COALESCE($2, is_active), sort_order = COALESCE($3, sort_order)
       WHERE id = $4
       RETURNING id, list_key, label, sort_order, is_active, is_locked`,
      [newLabel, typeof isActive === 'boolean' ? isActive : null, Number.isInteger(sortOrder) ? sortOrder : null, option.id]
    );

    // Activities store the label, so a rename must carry the existing rows
    // with it or reports would split one option into two. The column name
    // comes from the LIST_FIELDS whitelist, never from user input.
    if (newLabel !== option.label) {
      const column = Object.keys(LIST_FIELDS).find((f) => LIST_FIELDS[f] === option.list_key);
      await client.query(`UPDATE sales_activities SET ${column} = $1 WHERE ${column} = $2`, [newLabel, option.label]);
    }

    await client.query('COMMIT');
    res.json({ success: true, data: { option: updated.rows[0] } });
  } catch (error) {
    await client.query('ROLLBACK');
    if (error.code === '23505') {
      return res.status(409).json({ success: false, message: 'That option already exists' });
    }
    serverError(res, 'Updating option', error);
  } finally {
    client.release();
  }
};

// ---------------------------------------------------------------- settings / targets

const getSettings = async (req, res) => {
  try {
    const config = await loadTargetConfig();
    const reps = await pool.query(
      `SELECT id, full_name FROM users WHERE role = 'sales_rep' ORDER BY full_name`
    );
    res.json({
      success: true,
      data: {
        defaultDailyTarget: config.defaultDailyTarget,
        workingDaysPerWeek: config.workingDays,
        reps: reps.rows.map((r) => ({
          id: r.id,
          fullName: r.full_name,
          dailyTarget: config.dailyTargetFor(r.id),
          weeklyTarget: config.dailyTargetFor(r.id) * config.workingDays,
          isOverride: config.overrides.has(r.id)
        }))
      }
    });
  } catch (error) {
    serverError(res, 'Fetching settings', error);
  }
};

const updateSettings = async (req, res) => {
  try {
    const { defaultDailyTarget, workingDaysPerWeek } = req.body;
    const errors = {};
    if (defaultDailyTarget !== undefined
      && !(Number.isInteger(defaultDailyTarget) && defaultDailyTarget >= 0 && defaultDailyTarget <= 500)) {
      errors.defaultDailyTarget = 'Must be a whole number from 0 to 500';
    }
    if (workingDaysPerWeek !== undefined
      && !(Number.isInteger(workingDaysPerWeek) && workingDaysPerWeek >= 1 && workingDaysPerWeek <= 7)) {
      errors.workingDaysPerWeek = 'Must be a whole number from 1 to 7';
    }
    if (Object.keys(errors).length) return validationFailed(res, errors);

    const upsert = (key, value) => pool.query(
      `INSERT INTO sales_activity_settings (key, value) VALUES ($1, $2)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
      [key, String(value)]
    );
    if (defaultDailyTarget !== undefined) await upsert('default_daily_target', defaultDailyTarget);
    if (workingDaysPerWeek !== undefined) await upsert('working_days_per_week', workingDaysPerWeek);

    res.json({ success: true, message: 'Settings updated' });
  } catch (error) {
    serverError(res, 'Updating settings', error);
  }
};

// dailyTarget null removes the override so the rep falls back to the default.
const setRepTarget = async (req, res) => {
  try {
    const userId = parseInt(req.params.userId, 10);
    const { dailyTarget } = req.body;
    if (dailyTarget !== null && !(Number.isInteger(dailyTarget) && dailyTarget >= 0 && dailyTarget <= 500)) {
      return validationFailed(res, { dailyTarget: 'Must be a whole number from 0 to 500, or null to use the default' });
    }
    if (dailyTarget === null) {
      await pool.query('DELETE FROM sales_activity_rep_targets WHERE user_id = $1', [userId]);
    } else {
      await pool.query(
        `INSERT INTO sales_activity_rep_targets (user_id, daily_target) VALUES ($1, $2)
         ON CONFLICT (user_id) DO UPDATE SET daily_target = EXCLUDED.daily_target, updated_at = CURRENT_TIMESTAMP`,
        [userId, dailyTarget]
      );
    }
    res.json({ success: true, message: 'Target updated' });
  } catch (error) {
    if (error.code === '23503') return res.status(404).json({ success: false, message: 'User not found' });
    serverError(res, 'Updating rep target', error);
  }
};

// ---------------------------------------------------------------- progress

const getProgress = async (req, res) => {
  try {
    const repId = resolveRepId(req);
    if (!repId) return validationFailed(res, { repId: 'repId is required' });

    const today = todayInHarare();
    const { start, end } = weekBounds(today);
    const config = await loadTargetConfig();

    const counts = await pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE activity_date = $2)::int AS today,
         COUNT(*)::int AS week
       FROM sales_activities
       WHERE rep_user_id = $1 AND NOT is_withdrawn AND activity_date BETWEEN $3 AND $4`,
      [repId, today, start, end]
    );

    res.json({
      success: true,
      data: {
        today,
        weekStart: start,
        weekEnd: end,
        ...targetProgress({
          loggedToday: counts.rows[0].today,
          loggedThisWeek: counts.rows[0].week,
          dailyTarget: config.dailyTargetFor(repId),
          today,
          workingDays: config.workingDays
        })
      }
    });
  } catch (error) {
    serverError(res, 'Fetching progress', error);
  }
};

// ---------------------------------------------------------------- today's follow-ups

// Due today first, then overdue (oldest first). Only each client's latest
// row counts, and closed deals have nothing left to follow up.
const getTodayFollowUps = async (req, res) => {
  try {
    const repId = resolveRepId(req);
    const today = todayInHarare();
    const result = await pool.query(
      `${RANKED_CTE}
       SELECT ${ACTIVITY_COLUMNS}, c.name AS client_name, c.company, u.full_name AS rep_name,
              a.is_latest
       FROM ranked a
       JOIN clients c ON c.id = a.client_id
       JOIN users u ON u.id = a.rep_user_id
       WHERE a.is_latest
         AND a.outcome NOT IN ($1, $2)
         AND a.follow_up_date <= $3
         AND ($4::int IS NULL OR a.rep_user_id = $4)
       ORDER BY (a.follow_up_date = $3) DESC, a.follow_up_date ASC, a.id ASC`,
      [OUTCOME.WON, OUTCOME.LOST, today, repId]
    );
    res.json({ success: true, data: { today, followUps: result.rows.map((r) => decorate(r, today)) } });
  } catch (error) {
    serverError(res, 'Fetching follow-ups', error);
  }
};

// ---------------------------------------------------------------- client context / prospects

// Everything the log form needs once a client is picked: whether they're a
// new or repeat client, whether this rep already logged them today (soft
// warning), and the last contact's details to pre-fill the form.
const getClientContext = async (req, res) => {
  try {
    const clientId = parseInt(req.query.clientId, 10);
    if (!Number.isInteger(clientId)) return validationFailed(res, { clientId: 'clientId is required' });

    const today = todayInHarare();
    const date = isDateString(req.query.date) ? req.query.date : today;
    const repId = isAdminUser(req) && parseInt(req.query.repId, 10) ? parseInt(req.query.repId, 10) : req.user.id;

    const [client, prior, advert, dup, last] = await Promise.all([
      pool.query('SELECT id, name, company, phone, email, contact_person, is_prospect FROM clients WHERE id = $1', [clientId]),
      pool.query('SELECT 1 FROM sales_activities WHERE client_id = $1 AND NOT is_withdrawn LIMIT 1', [clientId]),
      pool.query('SELECT 1 FROM adverts WHERE client_id = $1 LIMIT 1', [clientId]),
      pool.query(
        `SELECT id, outcome, created_at FROM sales_activities
         WHERE client_id = $1 AND rep_user_id = $2 AND activity_date = $3 AND NOT is_withdrawn`,
        [clientId, repId, date]
      ),
      pool.query(
        `SELECT activity_date::text AS activity_date, outcome, contact_person, contact_title,
                line_of_business, phone, email
         FROM sales_activities WHERE client_id = $1 AND NOT is_withdrawn
         ORDER BY activity_date DESC, id DESC LIMIT 1`,
        [clientId]
      )
    ]);

    if (client.rows.length === 0) return res.status(404).json({ success: false, message: 'Client not found' });

    res.json({
      success: true,
      data: {
        client: client.rows[0],
        suggestedClientType: prior.rows.length || advert.rows.length ? CLIENT_TYPE.REPEAT : CLIENT_TYPE.NEW,
        duplicateToday: dup.rows.length > 0,
        duplicateCount: dup.rows.length,
        lastActivity: last.rows[0] || null
      }
    });
  } catch (error) {
    serverError(res, 'Fetching client context', error);
  }
};

// Lightweight prospect, created inline from the log form. Phone is the
// identity check (same as createClient) so two reps can't create the same
// company twice; a clash returns the existing client for the UI to pick.
const createProspect = async (req, res) => {
  try {
    const name = String(req.body.name || '').trim();
    const errors = {};
    if (name.length < 2) errors.name = 'Company or client name is required';
    const phone = normalizeContactPhone(req.body.phone);
    if (!phone) errors.phone = 'Enter a valid phone number (e.g. 0771234567 or +263771234567)';
    if (Object.keys(errors).length) return validationFailed(res, errors);

    const existing = await pool.query(
      `SELECT c.id, c.name, c.company, c.phone, u.full_name AS sales_rep_name
       FROM clients c
       LEFT JOIN users u ON c.sales_rep_id = u.id
       WHERE c.phone = $1
          OR EXISTS (SELECT 1 FROM client_phones cp WHERE cp.client_id = c.id AND cp.phone = $1)`,
      [phone]
    );
    if (existing.rows.length > 0) {
      const c = existing.rows[0];
      return res.status(409).json({
        success: false,
        message: `This number already belongs to ${c.name}${c.sales_rep_name ? ` (${c.sales_rep_name})` : ''}. Use that client instead.`,
        data: { client: c }
      });
    }

    const result = await pool.query(
      `INSERT INTO clients (name, phone, company, contact_person, sales_rep_id, is_prospect)
       VALUES ($1, $2, $3, $4, $5, true)
       RETURNING id, name, company, phone, contact_person, is_prospect`,
      [name, phone, req.body.company ? String(req.body.company).trim() : null,
        req.body.contact_person ? String(req.body.contact_person).trim() : null, req.user.id]
    );
    res.status(201).json({ success: true, data: { client: result.rows[0] } });
  } catch (error) {
    serverError(res, 'Creating prospect', error);
  }
};

// ---------------------------------------------------------------- list / detail

const getActivities = async (req, res) => {
  try {
    const today = todayInHarare();
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit, 10) || 30, 100);
    const repId = resolveRepId(req);

    const result = await pool.query(
      `${RANKED_CTE}
       SELECT ${ACTIVITY_COLUMNS}, c.name AS client_name, c.company, u.full_name AS rep_name,
              a.is_latest, COUNT(*) OVER ()::int AS total_count
       FROM ranked a
       JOIN clients c ON c.id = a.client_id
       JOIN users u ON u.id = a.rep_user_id
       WHERE ($1::int IS NULL OR a.rep_user_id = $1)
         AND ($2::date IS NULL OR a.activity_date >= $2)
         AND ($3::date IS NULL OR a.activity_date <= $3)
         AND ($4::text IS NULL OR a.outcome = $4)
         AND ($5::text IS NULL OR a.line_of_business = $5)
         AND ($6::int IS NULL OR a.client_id = $6)
         AND ($7::boolean IS NOT TRUE OR
              (a.is_latest AND a.outcome NOT IN ($8, $9) AND a.follow_up_date < $10))
       ORDER BY a.activity_date DESC, a.id DESC
       LIMIT $11 OFFSET $12`,
      [
        repId,
        isDateString(req.query.from) ? req.query.from : null,
        isDateString(req.query.to) ? req.query.to : null,
        req.query.outcome || null,
        req.query.lineOfBusiness || null,
        parseInt(req.query.clientId, 10) || null,
        req.query.overdueOnly === '1',
        OUTCOME.WON, OUTCOME.LOST, today,
        limit, (page - 1) * limit
      ]
    );

    const total = result.rows[0]?.total_count || 0;
    res.json({
      success: true,
      data: {
        activities: result.rows.map(({ total_count, ...r }) => decorate(r, today)),
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
      }
    });
  } catch (error) {
    serverError(res, 'Fetching activities', error);
  }
};

const fetchOne = async (id, db = pool) => {
  const result = await db.query(
    `${RANKED_CTE}
     SELECT ${ACTIVITY_COLUMNS}, c.name AS client_name, c.company, u.full_name AS rep_name, a.is_latest
     FROM ranked a
     JOIN clients c ON c.id = a.client_id
     JOIN users u ON u.id = a.rep_user_id
     WHERE a.id = $1`,
    [id]
  );
  return result.rows[0] || null;
};

// Withdrawn rows are excluded from the ranked CTE, so load the raw row for
// permission and edit checks.
const fetchRaw = async (id, db = pool, lock = false) => {
  const result = await db.query(
    `SELECT a.id, a.activity_date::text AS activity_date, a.rep_user_id, a.client_id,
            a.contact_person, a.contact_title, a.line_of_business, a.phone, a.email,
            a.contact_method, a.product_pitched, a.client_type, a.outcome,
            a.quoted_amount_usd::text AS quoted_amount_usd, a.feedback_notes,
            a.main_objection, a.next_action, a.follow_up_date::text AS follow_up_date, a.is_withdrawn
     FROM sales_activities a WHERE a.id = $1 ${lock ? 'FOR UPDATE' : ''}`,
    [id]
  );
  return result.rows[0] || null;
};

const getActivityById = async (req, res) => {
  try {
    const raw = await fetchRaw(req.params.id);
    if (!raw || !canViewActivity(req.user, raw)) {
      return res.status(404).json({ success: false, message: 'Activity not found' });
    }
    const today = todayInHarare();
    const activity = (await fetchOne(raw.id)) || { ...raw, is_latest: false };

    let history = [];
    if (isAdminUser(req)) {
      const h = await pool.query(
        `SELECT h.id, h.action, h.field, h.old_value, h.new_value, h.changed_at, u.full_name AS changed_by_name
         FROM sales_activity_history h JOIN users u ON u.id = h.changed_by
         WHERE h.activity_id = $1 ORDER BY h.changed_at DESC, h.id DESC`,
        [raw.id]
      );
      history = h.rows;
    }
    res.json({ success: true, data: { activity: decorate(activity, today), history } });
  } catch (error) {
    serverError(res, 'Fetching activity', error);
  }
};

// ---------------------------------------------------------------- create / update / withdraw

const INSERT_FIELDS = AUDITED_FIELDS;

const createActivity = async (req, res) => {
  const client = await pool.connect();
  try {
    const today = todayInHarare();
    const options = await loadOptions(client);
    const { errors, value } = validateActivity(req.body, { today, isAdmin: isAdminUser(req), options });

    // Admins may log on a rep's behalf; everyone else logs as themselves.
    let repId = req.user.id;
    if (isAdminUser(req) && req.body.rep_user_id) {
      repId = parseInt(req.body.rep_user_id, 10);
      const rep = await client.query('SELECT id FROM users WHERE id = $1', [repId]);
      if (rep.rows.length === 0) errors.rep_user_id = 'Rep not found';
    }

    if (!errors.client_id) {
      const found = await client.query('SELECT id FROM clients WHERE id = $1', [value.client_id]);
      if (found.rows.length === 0) errors.client_id = 'Client not found';
    }
    if (Object.keys(errors).length) return validationFailed(res, errors);

    const dup = await client.query(
      `SELECT 1 FROM sales_activities
       WHERE client_id = $1 AND rep_user_id = $2 AND activity_date = $3 AND NOT is_withdrawn LIMIT 1`,
      [value.client_id, repId, value.activity_date]
    );

    await client.query('BEGIN');
    const columns = ['rep_user_id', 'created_by', ...INSERT_FIELDS];
    const params = [repId, req.user.id, ...INSERT_FIELDS.map((f) => value[f] ?? null)];
    const inserted = await client.query(
      `INSERT INTO sales_activities (${columns.join(', ')})
       VALUES (${columns.map((_, i) => `$${i + 1}`).join(', ')})
       RETURNING id`,
      params
    );
    const id = inserted.rows[0].id;
    await client.query(
      `INSERT INTO sales_activity_history (activity_id, changed_by, action) VALUES ($1, $2, 'created')`,
      [id, req.user.id]
    );
    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'Activity logged',
      data: {
        activity: decorate(await fetchOne(id), today),
        warnings: dup.rows.length ? ['You already logged this client today'] : []
      }
    });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    serverError(res, 'Creating activity', error);
  } finally {
    client.release();
  }
};

const updateActivity = async (req, res) => {
  const client = await pool.connect();
  try {
    const today = todayInHarare();
    await client.query('BEGIN');

    const existing = await fetchRaw(req.params.id, client, true);
    if (!existing || !canViewActivity(req.user, existing)) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Activity not found' });
    }
    if (!canEditActivity(req.user, existing)) {
      await client.query('ROLLBACK');
      return res.status(409).json({ success: false, message: 'A withdrawn entry cannot be edited' });
    }

    const options = await loadOptions(client);
    const { errors, value } = validateActivity(req.body, {
      today, isAdmin: isAdminUser(req), options, existing
    });
    if (!errors.client_id && value.client_id !== existing.client_id) {
      const found = await client.query('SELECT id FROM clients WHERE id = $1', [value.client_id]);
      if (found.rows.length === 0) errors.client_id = 'Client not found';
    }
    if (Object.keys(errors).length) {
      await client.query('ROLLBACK');
      return validationFailed(res, errors);
    }

    // Compare as the stored text form so 1000 vs 1000.00 isn't a "change".
    const before = { ...existing, quoted_amount_usd: existing.quoted_amount_usd === null ? null : Number(existing.quoted_amount_usd) };
    const changes = diffActivity(before, value);

    if (changes.length > 0) {
      const sets = INSERT_FIELDS.map((f, i) => `${f} = $${i + 1}`);
      await client.query(
        `UPDATE sales_activities SET ${sets.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${INSERT_FIELDS.length + 1}`,
        [...INSERT_FIELDS.map((f) => value[f] ?? null), existing.id]
      );
      for (const c of changes) {
        await client.query(
          `INSERT INTO sales_activity_history (activity_id, changed_by, action, field, old_value, new_value)
           VALUES ($1, $2, 'updated', $3, $4, $5)`,
          [existing.id, req.user.id, c.field, c.old_value, c.new_value]
        );
      }
    }
    await client.query('COMMIT');

    res.json({
      success: true,
      message: changes.length ? 'Activity updated' : 'No changes',
      data: { activity: decorate(await fetchOne(existing.id), today), changedFields: changes.map((c) => c.field) }
    });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    serverError(res, 'Updating activity', error);
  } finally {
    client.release();
  }
};

// The only way to remove an entry: it stays in the table and the audit trail.
const withdrawActivity = async (req, res) => {
  const client = await pool.connect();
  try {
    const reason = String(req.body.reason || '').trim();
    if (reason.length < 5) return validationFailed(res, { reason: 'Say why this entry is being withdrawn' });

    await client.query('BEGIN');
    const existing = await fetchRaw(req.params.id, client, true);
    if (!existing || !canViewActivity(req.user, existing)) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Activity not found' });
    }
    if (existing.is_withdrawn) {
      await client.query('ROLLBACK');
      return res.status(409).json({ success: false, message: 'Already withdrawn' });
    }

    await client.query(
      `UPDATE sales_activities
       SET is_withdrawn = true, withdrawn_at = CURRENT_TIMESTAMP, withdrawn_by = $2,
           withdraw_reason = $3, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [existing.id, req.user.id, reason]
    );
    await client.query(
      `INSERT INTO sales_activity_history (activity_id, changed_by, action, field, new_value)
       VALUES ($1, $2, 'withdrawn', 'withdraw_reason', $3)`,
      [existing.id, req.user.id, reason]
    );
    await client.query('COMMIT');
    res.json({ success: true, message: 'Activity withdrawn' });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    serverError(res, 'Withdrawing activity', error);
  } finally {
    client.release();
  }
};

// ---------------------------------------------------------------- manager summary

const countBy = (rows, key) => {
  const counts = {};
  for (const r of rows) {
    const k = r[key];
    if (k) counts[k] = (counts[k] || 0) + 1;
  }
  return Object.entries(counts).map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count);
};

/**
 * Admin dashboard data for a date range (default: this week, Harare time),
 * optionally narrowed to one rep: totals, a per-rep breakdown with target
 * attainment, and the chart series.
 */
const getSummary = async (req, res) => {
  try {
    const today = todayInHarare();
    const week = weekBounds(today);
    const from = isDateString(req.query.from) ? req.query.from : week.start;
    const to = isDateString(req.query.to) ? req.query.to : week.end;
    if (from > to) return validationFailed(res, { from: 'From date must not be after To date' });
    const repFilter = parseInt(req.query.repId, 10) || null;

    const config = await loadTargetConfig();
    const [repsRes, periodRes, latestRes, todayRes] = await Promise.all([
      pool.query(
        `SELECT id, full_name FROM users
         WHERE role = 'sales_rep' OR id IN (SELECT rep_user_id FROM sales_activities)
         ORDER BY full_name`
      ),
      pool.query(
        `SELECT id, rep_user_id, client_id, activity_date::text AS activity_date, outcome,
                quoted_amount_usd::float8 AS quoted_amount_usd, client_type, line_of_business, main_objection
         FROM sales_activities
         WHERE NOT is_withdrawn AND activity_date BETWEEN $1 AND $2
           AND ($3::int IS NULL OR rep_user_id = $3)`,
        [from, to, repFilter]
      ),
      pool.query(
        `${RANKED_CTE}
         SELECT id, rep_user_id, client_id, activity_date::text AS activity_date, outcome,
                quoted_amount_usd::float8 AS quoted_amount_usd, follow_up_date::text AS follow_up_date
         FROM ranked WHERE is_latest AND ($1::int IS NULL OR rep_user_id = $1)`,
        [repFilter]
      ),
      pool.query(
        `SELECT rep_user_id, COUNT(*)::int AS count FROM sales_activities
         WHERE NOT is_withdrawn AND activity_date = $1 GROUP BY rep_user_id`,
        [today]
      )
    ]);

    const loggedTodayByRep = new Map(todayRes.rows.map((r) => [r.rep_user_id, r.count]));
    const workdays = countWorkingDays(from, to, config.workingDays);
    const reps = repsRes.rows.filter((r) => !repFilter || r.id === repFilter);

    const perRep = reps.map((rep) => {
      const periodRows = periodRes.rows.filter((r) => r.rep_user_id === rep.id);
      const latestRows = latestRes.rows.filter((r) => r.rep_user_id === rep.id);
      const dailyTarget = config.dailyTargetFor(rep.id);
      const periodTarget = dailyTarget * workdays;
      const stats = summarize(periodRows, latestRows, today);
      return {
        repId: rep.id,
        repName: rep.full_name,
        dailyTarget,
        periodTarget,
        hitTarget: periodTarget > 0 && stats.contactsLogged >= periodTarget,
        percentOfTarget: periodTarget > 0 ? Math.round((stats.contactsLogged / periodTarget) * 100) : null,
        loggedToday: loggedTodayByRep.get(rep.id) || 0,
        ...stats
      };
    });

    // Period counts come from all rows together; pipeline / overdue are the
    // sum of each rep's own positions (two reps chasing one client both count).
    const totals = summarize(periodRes.rows, [], today);
    totals.pipelineValue = perRep.reduce((s, r) => s + r.pipelineValue, 0);
    totals.overdueFollowUps = perRep.reduce((s, r) => s + r.overdueFollowUps, 0);

    const perDay = {};
    for (const r of periodRes.rows) {
      const key = `${r.activity_date}|${r.rep_user_id}`;
      perDay[key] = (perDay[key] || 0) + 1;
    }

    res.json({
      success: true,
      data: {
        range: { from, to, workingDays: workdays },
        today,
        totals,
        reps: perRep,
        notLoggedToday: perRep.filter((r) => r.loggedToday === 0).map((r) => ({ repId: r.repId, repName: r.repName })),
        charts: {
          contactsPerDay: Object.entries(perDay).map(([k, count]) => {
            const [date, repId] = k.split('|');
            return { date, repId: Number(repId), count };
          }).sort((a, b) => a.date.localeCompare(b.date)),
          funnel: countBy(periodRes.rows, 'outcome'),
          objections: countBy(periodRes.rows.filter((r) => r.main_objection !== 'None'), 'main_objection'),
          lineOfBusiness: countBy(periodRes.rows, 'line_of_business')
        }
      }
    });
  } catch (error) {
    serverError(res, 'Fetching summary', error);
  }
};

module.exports = {
  getOptions, createOption, updateOption,
  getSettings, updateSettings, setRepTarget,
  getProgress, getTodayFollowUps, getClientContext, createProspect,
  getActivities, getActivityById, createActivity, updateActivity, withdrawActivity,
  getSummary
};
