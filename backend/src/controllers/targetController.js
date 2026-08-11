const pool = require('../config/database');

// Normalizes any of 'YYYY-MM', 'YYYY-MM-DD', or omitted (-> current month)
// into a first-of-month 'YYYY-MM-DD' string, which is what's stored/queried.
const normalizeMonth = (input) => {
  const base = input ? new Date(`${input.length === 7 ? input + '-01' : input}T00:00:00Z`) : new Date();
  const y = base.getUTCFullYear();
  const m = String(base.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}-01`;
};

const monthRange = (monthStr) => {
  const start = new Date(`${monthStr}T00:00:00Z`);
  const end = new Date(start);
  end.setUTCMonth(end.getUTCMonth() + 1);
  return { start: start.toISOString(), end: end.toISOString() };
};

const attainedQuery = `
  SELECT COALESCE(SUM(amount_paid), 0) AS attained
  FROM adverts
  WHERE sales_rep_id = $1
    AND status IN ('active', 'expired')
    AND COALESCE(approved_at, created_at) >= $2
    AND COALESCE(approved_at, created_at) < $3
`;

/**
 * Current user's own target + attained for a given month (default: this month).
 */
const getMyTarget = async (req, res) => {
  try {
    const month = normalizeMonth(req.query.month);
    const { start, end } = monthRange(month);

    const targetResult = await pool.query(
      'SELECT target_amount FROM rep_targets WHERE user_id = $1 AND month = $2',
      [req.user.id, month]
    );
    const attainedResult = await pool.query(attainedQuery, [req.user.id, start, end]);

    const target = parseFloat(targetResult.rows[0]?.target_amount || 0);
    const attained = parseFloat(attainedResult.rows[0].attained);

    res.json({
      success: true,
      data: {
        month,
        target,
        attained,
        percent: target > 0 ? Math.round((attained / target) * 1000) / 10 : null
      }
    });
  } catch (error) {
    console.error('Get my target error:', error);
    res.status(500).json({ success: false, message: 'Server error fetching target' });
  }
};

/**
 * Every sales rep's target + attained for a given month (admin only) —
 * powers both the editable targets table and the per-rep dashboard breakdown.
 * Reps with no target row set yet still appear, with target 0 — new hires
 * need nothing beyond a users row to show up here.
 */
const getAllTargets = async (req, res) => {
  try {
    const month = normalizeMonth(req.query.month);
    const { start, end } = monthRange(month);

    const result = await pool.query(`
      SELECT
        u.id,
        u.full_name,
        u.email,
        COALESCE(rt.target_amount, 0) AS target,
        COALESCE(SUM(CASE
          WHEN a.status IN ('active', 'expired')
           AND COALESCE(a.approved_at, a.created_at) >= $2
           AND COALESCE(a.approved_at, a.created_at) < $3
          THEN a.amount_paid ELSE 0
        END), 0) AS attained
      FROM users u
      LEFT JOIN rep_targets rt ON rt.user_id = u.id AND rt.month = $1
      LEFT JOIN adverts a ON a.sales_rep_id = u.id
      WHERE u.role = 'sales_rep'
      GROUP BY u.id, u.full_name, u.email, rt.target_amount
      ORDER BY u.full_name ASC
    `, [month, start, end]);

    const reps = result.rows.map(r => {
      const target = parseFloat(r.target);
      const attained = parseFloat(r.attained);
      return {
        id: r.id,
        fullName: r.full_name,
        email: r.email,
        target,
        attained,
        percent: target > 0 ? Math.round((attained / target) * 1000) / 10 : null
      };
    });

    res.json({ success: true, data: { month, reps } });
  } catch (error) {
    console.error('Get all targets error:', error);
    res.status(500).json({ success: false, message: 'Server error fetching targets' });
  }
};

/**
 * Company-wide target (sum of every rep's target) vs company-wide attained,
 * plus the same per-rep breakdown — one call for the admin dashboard.
 */
const getCompanyTarget = async (req, res) => {
  try {
    const month = normalizeMonth(req.query.month);
    const { start, end } = monthRange(month);

    const repsResult = await pool.query(`
      SELECT
        u.id,
        u.full_name,
        COALESCE(rt.target_amount, 0) AS target,
        COALESCE(SUM(CASE
          WHEN a.status IN ('active', 'expired')
           AND COALESCE(a.approved_at, a.created_at) >= $2
           AND COALESCE(a.approved_at, a.created_at) < $3
          THEN a.amount_paid ELSE 0
        END), 0) AS attained
      FROM users u
      LEFT JOIN rep_targets rt ON rt.user_id = u.id AND rt.month = $1
      LEFT JOIN adverts a ON a.sales_rep_id = u.id
      WHERE u.role = 'sales_rep'
      GROUP BY u.id, u.full_name, rt.target_amount
      ORDER BY u.full_name ASC
    `, [month, start, end]);

    const reps = repsResult.rows.map(r => {
      const target = parseFloat(r.target);
      const attained = parseFloat(r.attained);
      return {
        id: r.id,
        fullName: r.full_name,
        target,
        attained,
        percent: target > 0 ? Math.round((attained / target) * 1000) / 10 : null
      };
    });

    const companyTarget = reps.reduce((sum, r) => sum + r.target, 0);
    const companyAttained = reps.reduce((sum, r) => sum + r.attained, 0);

    res.json({
      success: true,
      data: {
        month,
        target: companyTarget,
        attained: companyAttained,
        percent: companyTarget > 0 ? Math.round((companyAttained / companyTarget) * 1000) / 10 : null,
        reps
      }
    });
  } catch (error) {
    console.error('Get company target error:', error);
    res.status(500).json({ success: false, message: 'Server error fetching company target' });
  }
};

/**
 * Set (upsert) one rep's target for a given month. Works identically for
 * a rep who's never had a target before, so new hires need no setup.
 */
const setTarget = async (req, res) => {
  try {
    const { userId } = req.params;
    const { targetAmount, month: monthInput } = req.body;

    if (targetAmount === undefined || isNaN(parseFloat(targetAmount)) || parseFloat(targetAmount) < 0) {
      return res.status(400).json({ success: false, message: 'A valid, non-negative targetAmount is required' });
    }

    const userCheck = await pool.query(
      "SELECT id FROM users WHERE id = $1 AND role = 'sales_rep'",
      [userId]
    );
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Sales rep not found' });
    }

    const month = normalizeMonth(monthInput);

    const result = await pool.query(`
      INSERT INTO rep_targets (user_id, month, target_amount, set_by)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (user_id, month)
      DO UPDATE SET target_amount = $3, set_by = $4, updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `, [userId, month, parseFloat(targetAmount).toFixed(2), req.user.id]);

    res.json({ success: true, message: 'Target updated', data: result.rows[0] });
  } catch (error) {
    console.error('Set target error:', error);
    res.status(500).json({ success: false, message: 'Server error setting target' });
  }
};

module.exports = {
  getMyTarget,
  getAllTargets,
  getCompanyTarget,
  setTarget
};
