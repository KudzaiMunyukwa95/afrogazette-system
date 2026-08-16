const pool = require('../config/database');

/**
 * Combined admin activity feed — advert decisions (admin_actions) and
 * expense/requisition decisions (expense_status_history) merged into one
 * chronological log, since both tables track "who did what to what, when"
 * but were never visible anywhere as an actual audit trail before this.
 */
const getActivityLog = async (req, res) => {
  try {
    const { page = 1, limit = 30, type } = req.query;
    const limitNum = Math.min(parseInt(limit) || 30, 100);
    const offset = (parseInt(page) - 1) * limitNum;

    const events = [];

    if (!type || type === 'advert') {
      const advertResult = await pool.query(`
        SELECT
          aa.id,
          'advert' AS type,
          aa.action_type AS action,
          aa.reason,
          aa.notes,
          aa.created_at,
          u.full_name AS actor_name,
          raiser.full_name AS raised_by_name,
          a.id AS target_id,
          a.client_name AS target_label,
          a.amount_paid AS target_amount,
          a.discount_reason AS discount_reason
        FROM admin_actions aa
        JOIN users u ON aa.admin_id = u.id
        LEFT JOIN adverts a ON aa.advert_id = a.id
        LEFT JOIN users raiser ON a.sales_rep_id = raiser.id
        ORDER BY aa.created_at DESC
        LIMIT 200
      `);
      events.push(...advertResult.rows);
    }

    if (!type || type === 'expense') {
      // expense_status_history logs every create too ("Direct Expense
      // Created" / "Requisition Created") — those aren't admin decisions,
      // so only surface actual approve/reject transitions here.
      const expenseResult = await pool.query(`
        SELECT
          h.id,
          'expense' AS type,
          LOWER(h.new_status) AS action,
          h.comment AS reason,
          NULL AS notes,
          h.created_at,
          u.full_name AS actor_name,
          raiser.full_name AS raised_by_name,
          e.id AS target_id,
          e.reason AS target_label,
          e.amount AS target_amount
        FROM expense_status_history h
        JOIN users u ON h.changed_by_user_id = u.id
        LEFT JOIN expenses e ON h.expense_id = e.id
        LEFT JOIN users raiser ON e.raised_by_user_id = raiser.id
        WHERE h.new_status IN ('Approved', 'Rejected')
        ORDER BY h.created_at DESC
        LIMIT 200
      `);
      events.push(...expenseResult.rows);
    }

    events.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    const total = events.length;
    const page_events = events.slice(offset, offset + limitNum);

    res.json({
      success: true,
      data: {
        events: page_events,
        pagination: {
          page: parseInt(page),
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum)
        }
      }
    });
  } catch (error) {
    console.error('Get activity log error:', error);
    res.status(500).json({ success: false, message: 'Server error fetching activity log' });
  }
};

module.exports = { getActivityLog };
