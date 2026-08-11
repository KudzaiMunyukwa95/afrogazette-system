const pool = require('../config/database');

// Every report accepts startDate/endDate (YYYY-MM-DD). Defaults to the
// current calendar month if omitted, so "no params" always gives a sane
// real-time-ish answer rather than an error or all-time dump.
const resolveRange = (query) => {
  const now = new Date();
  const defaultStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const defaultEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const start = query.startDate ? new Date(`${query.startDate}T00:00:00Z`) : defaultStart;
  const end = query.endDate ? new Date(`${query.endDate}T23:59:59.999Z`) : defaultEnd;
  return { start: start.toISOString(), end: end.toISOString() };
};

// Sales reps only ever see their own numbers; admins see company-wide by
// default and can drill into one rep via ?repId=.
const resolveRepScope = (req) => {
  if (req.user.role === 'sales_rep') return req.user.id;
  return req.query.repId || null;
};

/**
 * Flight mix — daily/weekly/monthly pack split, by revenue and count.
 * Bucketing matches the commission tiers in config/ratePolicy.js so this
 * report and actual commission payouts always agree on what counts as what.
 */
const getFlightMix = async (req, res) => {
  try {
    const { start, end } = resolveRange(req.query);
    const repId = resolveRepScope(req);

    const conditions = [`a.status IN ('active', 'expired')`, `COALESCE(a.approved_at, a.created_at) >= $1`, `COALESCE(a.approved_at, a.created_at) < $2`];
    const values = [start, end];
    if (repId) {
      values.push(repId);
      conditions.push(`a.sales_rep_id = $${values.length}`);
    }

    const result = await pool.query(`
      SELECT
        CASE
          WHEN a.days_paid >= 15 THEN 'monthly'
          WHEN a.days_paid >= 3 THEN 'weekly'
          ELSE 'daily'
        END AS flight,
        a.destination_type,
        COUNT(*) AS bookings,
        COALESCE(SUM(a.amount_paid), 0) AS revenue,
        COALESCE(SUM(a.commission_amount), 0) AS commission
      FROM adverts a
      WHERE ${conditions.join(' AND ')}
      GROUP BY flight, a.destination_type
      ORDER BY flight, a.destination_type
    `, values);

    res.json({ success: true, data: { range: { start, end }, rows: result.rows } });
  } catch (error) {
    console.error('Get flight mix error:', error);
    res.status(500).json({ success: false, message: 'Server error fetching flight mix' });
  }
};

/**
 * Occupancy — actual slot-days used (from daily_slot_assignments, the
 * source of truth for what's really scheduled) vs. total capacity
 * (time_slots.max_capacity x days in range), by destination.
 */
const getOccupancy = async (req, res) => {
  try {
    const { start, end } = resolveRange(req.query);
    const startDate = start.split('T')[0];
    const endDate = end.split('T')[0];

    const capacityResult = await pool.query(`
      SELECT slot_type, COALESCE(SUM(max_capacity), 0) AS daily_capacity, COUNT(*) AS slot_count
      FROM time_slots
      GROUP BY slot_type
    `);

    const usageResult = await pool.query(`
      SELECT ts.slot_type, COUNT(*) AS used
      FROM daily_slot_assignments dsa
      JOIN time_slots ts ON dsa.slot_id = ts.id
      WHERE dsa.assignment_date >= $1 AND dsa.assignment_date < $2
      GROUP BY ts.slot_type
    `, [startDate, endDate]);

    const trendResult = await pool.query(`
      SELECT dsa.assignment_date, ts.slot_type, COUNT(*) AS used
      FROM daily_slot_assignments dsa
      JOIN time_slots ts ON dsa.slot_id = ts.id
      WHERE dsa.assignment_date >= $1 AND dsa.assignment_date < $2
      GROUP BY dsa.assignment_date, ts.slot_type
      ORDER BY dsa.assignment_date ASC
    `, [startDate, endDate]);

    const daysInRange = Math.max(1, Math.round((new Date(endDate) - new Date(startDate)) / 86400000));
    const usageByType = Object.fromEntries(usageResult.rows.map(r => [r.slot_type, parseInt(r.used)]));

    const byType = capacityResult.rows.map(r => {
      const totalCapacity = parseInt(r.daily_capacity) * daysInRange;
      const used = usageByType[r.slot_type] || 0;
      return {
        slotType: r.slot_type,
        dailyCapacity: parseInt(r.daily_capacity),
        totalCapacity,
        used,
        occupancyPercent: totalCapacity > 0 ? Math.round((used / totalCapacity) * 1000) / 10 : null
      };
    });

    res.json({
      success: true,
      data: { range: { start: startDate, end: endDate }, daysInRange, byType, trend: trendResult.rows }
    });
  } catch (error) {
    console.error('Get occupancy error:', error);
    res.status(500).json({ success: false, message: 'Server error fetching occupancy' });
  }
};

/**
 * Client retention — new vs. returning clients within the period, the
 * all-time repeat rate, and a dormant-client list (the exact audience the
 * win-back script in the Sales Kit targets).
 */
const getRetention = async (req, res) => {
  try {
    const { start, end } = resolveRange(req.query);
    const repId = resolveRepScope(req);

    const repCondition = repId ? 'AND sales_rep_id = $3' : '';
    const periodValues = repId ? [start, end, repId] : [start, end];

    const periodResult = await pool.query(`
      WITH first_booking AS (
        SELECT client_name, MIN(COALESCE(approved_at, created_at)) AS first_date
        FROM adverts
        WHERE status IN ('active', 'expired') ${repId ? 'AND sales_rep_id = $3' : ''}
        GROUP BY client_name
      ),
      period_clients AS (
        SELECT DISTINCT client_name
        FROM adverts
        WHERE status IN ('active', 'expired')
          AND COALESCE(approved_at, created_at) >= $1
          AND COALESCE(approved_at, created_at) < $2
          ${repCondition}
      )
      SELECT
        COUNT(*) FILTER (WHERE fb.first_date < $1) AS returning_clients,
        COUNT(*) FILTER (WHERE fb.first_date >= $1) AS new_clients
      FROM period_clients pc
      JOIN first_booking fb ON fb.client_name = pc.client_name
    `, periodValues);

    const repeatCondition = repId ? 'AND sales_rep_id = $1' : '';
    const repeatValues = repId ? [repId] : [];
    const repeatResult = await pool.query(`
      SELECT
        COUNT(*) AS total_clients,
        COUNT(*) FILTER (WHERE cnt > 1) AS repeat_clients
      FROM (
        SELECT client_name, COUNT(*) AS cnt
        FROM adverts
        WHERE status IN ('active', 'expired') ${repeatCondition}
        GROUP BY client_name
      ) t
    `, repeatValues);

    const dormantResult = await pool.query(`
      SELECT client_name, MAX(COALESCE(approved_at, created_at)) AS last_booking, SUM(amount_paid) AS lifetime_value, COUNT(*) AS total_bookings
      FROM adverts
      WHERE status IN ('active', 'expired') ${repeatCondition}
      GROUP BY client_name
      HAVING MAX(COALESCE(approved_at, created_at)) < NOW() - INTERVAL '30 days'
      ORDER BY last_booking DESC
      LIMIT 50
    `, repeatValues);

    const totalClients = parseInt(repeatResult.rows[0].total_clients) || 0;
    const repeatClients = parseInt(repeatResult.rows[0].repeat_clients) || 0;

    res.json({
      success: true,
      data: {
        range: { start, end },
        period: {
          newClients: parseInt(periodResult.rows[0]?.new_clients || 0),
          returningClients: parseInt(periodResult.rows[0]?.returning_clients || 0)
        },
        allTime: {
          totalClients,
          repeatClients,
          repeatRatePercent: totalClients > 0 ? Math.round((repeatClients / totalClients) * 1000) / 10 : 0
        },
        dormantClients: dormantResult.rows
      }
    });
  } catch (error) {
    console.error('Get retention error:', error);
    res.status(500).json({ success: false, message: 'Server error fetching retention' });
  }
};

/**
 * Commission & margin — commission cost as a share of revenue, company-wide
 * and per rep, plus a monthly trend. Directly answers "is our payroll ratio
 * healthy" without a manual spreadsheet exercise each time.
 */
const getMargin = async (req, res) => {
  try {
    const { start, end } = resolveRange(req.query);
    const repId = resolveRepScope(req);

    const repCondition = repId ? 'AND a.sales_rep_id = $3' : '';
    const values = repId ? [start, end, repId] : [start, end];

    const byRepResult = await pool.query(`
      SELECT u.id, u.full_name,
        COALESCE(SUM(a.amount_paid), 0) AS revenue,
        COALESCE(SUM(a.commission_amount), 0) AS commission
      FROM users u
      JOIN adverts a ON a.sales_rep_id = u.id
      WHERE a.status IN ('active', 'expired')
        AND COALESCE(a.approved_at, a.created_at) >= $1
        AND COALESCE(a.approved_at, a.created_at) < $2
        ${repCondition}
      GROUP BY u.id, u.full_name
      ORDER BY revenue DESC
    `, values);

    const trendResult = await pool.query(`
      SELECT DATE_TRUNC('month', COALESCE(a.approved_at, a.created_at)) AS month,
        COALESCE(SUM(a.amount_paid), 0) AS revenue,
        COALESCE(SUM(a.commission_amount), 0) AS commission
      FROM adverts a
      WHERE a.status IN ('active', 'expired')
        AND COALESCE(a.approved_at, a.created_at) >= $1
        AND COALESCE(a.approved_at, a.created_at) < $2
        ${repCondition}
      GROUP BY month
      ORDER BY month ASC
    `, values);

    const byRep = byRepResult.rows.map(r => {
      const revenue = parseFloat(r.revenue);
      const commission = parseFloat(r.commission);
      return {
        id: r.id,
        fullName: r.full_name,
        revenue,
        commission,
        commissionPercent: revenue > 0 ? Math.round((commission / revenue) * 1000) / 10 : 0
      };
    });

    const totalRevenue = byRep.reduce((s, r) => s + r.revenue, 0);
    const totalCommission = byRep.reduce((s, r) => s + r.commission, 0);

    res.json({
      success: true,
      data: {
        range: { start, end },
        company: {
          revenue: totalRevenue,
          commission: totalCommission,
          commissionPercent: totalRevenue > 0 ? Math.round((totalCommission / totalRevenue) * 1000) / 10 : 0
        },
        byRep,
        trend: trendResult.rows.map(r => ({
          month: r.month,
          revenue: parseFloat(r.revenue),
          commission: parseFloat(r.commission)
        }))
      }
    });
  } catch (error) {
    console.error('Get margin error:', error);
    res.status(500).json({ success: false, message: 'Server error fetching margin' });
  }
};

/**
 * Target history — every past month's target vs. attained, per rep,
 * not just the current month like the dashboard progress bar shows.
 */
const getTargetHistory = async (req, res) => {
  try {
    const repId = resolveRepScope(req);
    const repCondition = repId ? 'AND u.id = $1' : '';
    const values = repId ? [repId] : [];

    const result = await pool.query(`
      SELECT
        rt.month,
        u.id AS rep_id,
        u.full_name,
        rt.target_amount,
        COALESCE(SUM(CASE
          WHEN a.status IN ('active', 'expired')
           AND COALESCE(a.approved_at, a.created_at) >= rt.month
           AND COALESCE(a.approved_at, a.created_at) < (rt.month + INTERVAL '1 month')
          THEN a.amount_paid ELSE 0
        END), 0) AS attained
      FROM rep_targets rt
      JOIN users u ON rt.user_id = u.id
      LEFT JOIN adverts a ON a.sales_rep_id = u.id
      WHERE 1=1 ${repCondition}
      GROUP BY rt.month, u.id, u.full_name, rt.target_amount
      ORDER BY rt.month DESC, u.full_name ASC
    `, values);

    const rows = result.rows.map(r => {
      const target = parseFloat(r.target_amount);
      const attained = parseFloat(r.attained);
      return {
        month: r.month,
        repId: r.rep_id,
        fullName: r.full_name,
        target,
        attained,
        percent: target > 0 ? Math.round((attained / target) * 1000) / 10 : null
      };
    });

    res.json({ success: true, data: { rows } });
  } catch (error) {
    console.error('Get target history error:', error);
    res.status(500).json({ success: false, message: 'Server error fetching target history' });
  }
};

/**
 * Competitor mentions — list + aggregation (admin sees everyone, reps see
 * their own log) and creation (any authenticated rep can log one).
 */
const getCompetitorMentions = async (req, res) => {
  try {
    const { start, end } = resolveRange(req.query);
    const repId = resolveRepScope(req);
    const repCondition = repId ? 'AND cm.sales_rep_id = $3' : '';
    const values = repId ? [start, end, repId] : [start, end];

    const listResult = await pool.query(`
      SELECT cm.*, u.full_name AS rep_name
      FROM competitor_mentions cm
      JOIN users u ON cm.sales_rep_id = u.id
      WHERE cm.created_at >= $1 AND cm.created_at < $2 ${repCondition}
      ORDER BY cm.created_at DESC
      LIMIT 200
    `, values);

    const aggResult = await pool.query(`
      SELECT competitor_name, COUNT(*) AS mentions, AVG(competitor_price) AS avg_price
      FROM competitor_mentions cm
      WHERE cm.created_at >= $1 AND cm.created_at < $2 ${repCondition}
      GROUP BY competitor_name
      ORDER BY mentions DESC
      LIMIT 20
    `, values);

    res.json({
      success: true,
      data: {
        range: { start, end },
        mentions: listResult.rows,
        summary: aggResult.rows.map(r => ({
          competitorName: r.competitor_name,
          mentions: parseInt(r.mentions),
          avgPrice: r.avg_price != null ? Math.round(parseFloat(r.avg_price) * 100) / 100 : null
        }))
      }
    });
  } catch (error) {
    console.error('Get competitor mentions error:', error);
    res.status(500).json({ success: false, message: 'Server error fetching competitor mentions' });
  }
};

const createCompetitorMention = async (req, res) => {
  try {
    const { clientName, competitorName, competitorPrice, notes } = req.body;

    if (!competitorName || !competitorName.trim()) {
      return res.status(400).json({ success: false, message: 'Competitor name is required' });
    }

    const result = await pool.query(`
      INSERT INTO competitor_mentions (sales_rep_id, client_name, competitor_name, competitor_price, notes)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [req.user.id, clientName || null, competitorName.trim(), competitorPrice || null, notes || null]);

    res.status(201).json({ success: true, message: 'Competitor mention logged', data: result.rows[0] });
  } catch (error) {
    console.error('Create competitor mention error:', error);
    res.status(500).json({ success: false, message: 'Server error logging competitor mention' });
  }
};

/**
 * Real-time snapshot — today's numbers as they stand right now, refreshed
 * on every call rather than cached to any period. The "real-time" half of
 * "real-time and over-time" reporting.
 */
const getRealtimeSnapshot = async (req, res) => {
  try {
    const repId = resolveRepScope(req);
    const repCondition = repId ? 'AND sales_rep_id = $1' : '';
    const values = repId ? [repId] : [];

    const todayResult = await pool.query(`
      SELECT
        COUNT(*) AS bookings_today,
        COALESCE(SUM(amount_paid), 0) AS revenue_today
      FROM adverts
      WHERE status IN ('active', 'expired')
        AND COALESCE(approved_at, created_at)::date = CURRENT_DATE
        ${repCondition}
    `, values);

    const pendingResult = await pool.query(`
      SELECT COUNT(*) AS pending_count
      FROM adverts
      WHERE status = 'pending' ${repId ? 'AND sales_rep_id = $1' : ''}
    `, values);

    const slotsToday = await pool.query(`
      SELECT ts.slot_type, COUNT(*) AS used
      FROM daily_slot_assignments dsa
      JOIN time_slots ts ON dsa.slot_id = ts.id
      WHERE dsa.assignment_date = CURRENT_DATE
      GROUP BY ts.slot_type
    `);

    res.json({
      success: true,
      data: {
        asOf: new Date().toISOString(),
        bookingsToday: parseInt(todayResult.rows[0].bookings_today),
        revenueToday: parseFloat(todayResult.rows[0].revenue_today),
        pendingApprovals: parseInt(pendingResult.rows[0].pending_count),
        slotsUsedToday: slotsToday.rows.map(r => ({ slotType: r.slot_type, used: parseInt(r.used) }))
      }
    });
  } catch (error) {
    console.error('Get realtime snapshot error:', error);
    res.status(500).json({ success: false, message: 'Server error fetching realtime snapshot' });
  }
};

module.exports = {
  getFlightMix,
  getOccupancy,
  getRetention,
  getMargin,
  getTargetHistory,
  getCompetitorMentions,
  createCompetitorMention,
  getRealtimeSnapshot
};
