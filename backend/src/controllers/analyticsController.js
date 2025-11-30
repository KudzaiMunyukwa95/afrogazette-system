const pool = require('../config/database');

/**
 * Get admin dashboard analytics
 */
const getDashboard = async (req, res) => {
  try {
    // Status statistics
    const statusStats = await pool.query(`
      SELECT status, COUNT(*) as count
      FROM adverts
      GROUP BY status
    `);

    // Revenue statistics (total sales and commissions)
    const revenueStats = await pool.query(`
      SELECT 
        SUM(amount_paid) as total_revenue,
        SUM(commission_amount) as total_commission,
        AVG(amount_paid) as average_revenue,
        AVG(commission_amount) as average_commission
      FROM adverts
      WHERE status IN ('active', 'approved')
    `);

    // Sales rep performance
    const salesRepStats = await pool.query(`
      SELECT 
        u.id,
        u.full_name,
        u.email,
        COUNT(*) as total_adverts,
        SUM(amount_paid) as total_revenue,
        SUM(commission_amount) as total_commission,
        COUNT(CASE WHEN a.status = 'pending' THEN 1 END) as pending_count,
        COUNT(CASE WHEN a.status = 'active' THEN 1 END) as active_count,
        COUNT(CASE WHEN a.status = 'expired' THEN 1 END) as expired_count
      FROM users u
      LEFT JOIN adverts a ON u.id = a.sales_rep_id
      WHERE u.role = 'sales_rep'
      AND (a.status IS NULL OR a.status IN ('active', 'approved', 'pending', 'expired', 'rejected')) -- Include all for counts, but filter sums below
      GROUP BY u.id, u.full_name, u.email
      ORDER BY total_revenue DESC NULLS LAST
    `);

    // Category statistics
    const categoryStats = await pool.query(`
      SELECT 
        category,
        COUNT(*) as count,
        SUM(amount_paid) as revenue,
        SUM(commission_amount) as commission
      FROM adverts
      GROUP BY category
      ORDER BY revenue DESC
    `);

    // Expiring soon (within 7 days)
    const expiringSoon = await pool.query(`
      SELECT 
        a.id,
        a.client_name,
        a.category,
        a.end_date,
        a.remaining_days,
        a.destination_type,
        ts.slot_label,
        u.full_name as sales_rep_name
      FROM adverts a
      LEFT JOIN time_slots ts ON a.assigned_slot_id = ts.id
      LEFT JOIN users u ON a.sales_rep_id = u.id
      WHERE a.status = 'active'
        AND a.remaining_days <= 7
        AND a.remaining_days > 0
      ORDER BY a.remaining_days ASC
      LIMIT 20
    `);

    // Today's slot utilization by type
    const today = new Date().toISOString().split('T')[0];
    const slotUtilization = await pool.query(`
      SELECT 
        ts.slot_label,
        ts.slot_type,
        ts.max_capacity,
        COUNT(dsa.id) as occupied
      FROM time_slots ts
      LEFT JOIN daily_slot_assignments dsa 
        ON ts.id = dsa.slot_id 
        AND dsa.assignment_date = $1
      GROUP BY ts.id, ts.slot_label, ts.slot_type, ts.max_capacity
      ORDER BY ts.slot_type, ts.slot_time
    `, [today]);

    res.json({
      success: true,
      data: {
        statusStats: statusStats.rows,
        revenueStats: revenueStats.rows[0],
        salesRepStats: salesRepStats.rows,
        categoryStats: categoryStats.rows,
        expiringSoon: expiringSoon.rows,
        slotUtilization: slotUtilization.rows
      }
    });
  } catch (error) {
    console.error('Get dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching dashboard'
    });
  }
};

/**
 * Get sales rep dashboard (current month only)
 */
const getMyDashboard = async (req, res) => {
  try {
    const salesRepId = req.user.id;

    // Current month date range
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const endOfMonth = new Date(startOfMonth);
    endOfMonth.setMonth(endOfMonth.getMonth() + 1);

    // Summary statistics for current month
    const summary = await pool.query(`
      SELECT 
        COUNT(*) as total_adverts,
        SUM(amount_paid) as total_sales,
        SUM(commission_amount) as total_commission,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_count,
        COUNT(CASE WHEN status = 'expired' THEN 1 END) as expired_count,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as declined_count
      FROM adverts
      WHERE sales_rep_id = $1
        AND payment_date >= $2
        AND payment_date < $3
    `, [salesRepId, startOfMonth.toISOString(), endOfMonth.toISOString()]);

    // Active adverts
    const active = await pool.query(`
      SELECT 
        a.*,
        ts.slot_label,
        ts.slot_type,
        ts.slot_time
      FROM adverts a
      LEFT JOIN time_slots ts ON a.assigned_slot_id = ts.id
      WHERE a.sales_rep_id = $1
        AND a.status = 'active'
      ORDER BY a.end_date ASC
    `, [salesRepId]);

    // Pending adverts
    const pending = await pool.query(`
      SELECT *
      FROM adverts
      WHERE sales_rep_id = $1
        AND status = 'pending'
      ORDER BY created_at DESC
    `, [salesRepId]);

    // Expired adverts from this month
    const expired = await pool.query(`
      SELECT *
      FROM adverts
      WHERE sales_rep_id = $1
        AND status = 'expired'
        AND payment_date >= $2
        AND payment_date < $3
      ORDER BY end_date DESC
      LIMIT 10
    `, [salesRepId, startOfMonth.toISOString(), endOfMonth.toISOString()]);

    res.json({
      success: true,
      data: {
        summary: summary.rows[0],
        active: active.rows,
        pending: pending.rows,
        expired: expired.rows,
        monthRange: {
          start: startOfMonth.toISOString().split('T')[0],
          end: endOfMonth.toISOString().split('T')[0]
        }
      }
    });
  } catch (error) {
    console.error('Get my dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching dashboard'
    });
  }
};

/**
 * Get monthly performance report
 */
const getMonthlyReport = async (req, res) => {
  try {
    const { month, year } = req.query;

    let startDate, endDate;

    if (month && year) {
      startDate = new Date(year, month - 1, 1);
      endDate = new Date(year, month, 1);
    } else {
      // Default to current month
      startDate = new Date();
      startDate.setDate(1);
      startDate.setHours(0, 0, 0, 0);

      endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + 1);
    }

    // Monthly stats by sales rep
    const monthlyStats = await pool.query(`
      SELECT 
        u.id,
        u.full_name,
        u.email,
        COUNT(*) as total_adverts,
        SUM(a.amount_paid) as total_sales,
        SUM(a.commission_amount) as total_commission,
        COUNT(CASE WHEN a.status = 'active' THEN 1 END) as active_count,
        COUNT(CASE WHEN a.status = 'expired' THEN 1 END) as expired_count,
        COUNT(CASE WHEN a.destination_type = 'groups' THEN 1 END) as groups_count,
        COUNT(CASE WHEN a.destination_type = 'channel' THEN 1 END) as channel_count
      FROM users u
      LEFT JOIN adverts a ON u.id = a.sales_rep_id
        AND a.payment_date >= $1
        AND a.payment_date < $2
      WHERE u.role = 'sales_rep'
      GROUP BY u.id, u.full_name, u.email
      HAVING COUNT(*) > 0
      ORDER BY total_commission DESC
    `, [startDate.toISOString(), endDate.toISOString()]);

    // Overall monthly totals
    const monthlyTotals = await pool.query(`
      SELECT 
        COUNT(*) as total_adverts,
        SUM(amount_paid) as total_sales,
        SUM(commission_amount) as total_commission,
        COUNT(CASE WHEN destination_type = 'groups' THEN 1 END) as groups_count,
        COUNT(CASE WHEN destination_type = 'channel' THEN 1 END) as channel_count
      FROM adverts
      WHERE payment_date >= $1
        AND payment_date < $2
    `, [startDate.toISOString(), endDate.toISOString()]);

    res.json({
      success: true,
      data: {
        period: {
          start: startDate.toISOString().split('T')[0],
          end: endDate.toISOString().split('T')[0],
          month: startDate.toLocaleString('default', { month: 'long' }),
          year: startDate.getFullYear()
        },
        salesRepStats: monthlyStats.rows,
        totals: monthlyTotals.rows[0]
      }
    });
  } catch (error) {
    console.error('Get monthly report error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching monthly report'
    });
  }
};

module.exports = {
  getDashboard,
  getMyDashboard,
  getMonthlyReport
};
