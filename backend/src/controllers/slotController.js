const pool = require('../config/database');

/**
 * Get all time slots
 */
const getAllSlots = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM time_slots
      ORDER BY slot_time ASC
    `);

    res.json({
      success: true,
      data: {
        slots: result.rows
      }
    });
  } catch (error) {
    console.error('Get all slots error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching slots'
    });
  }
};

/**
 * Get today's schedule
 */
const getTodaySchedule = async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    const result = await pool.query(`
      SELECT 
        ts.id as slot_id,
        ts.slot_time,
        ts.slot_label,
        a.id as advert_id,
        a.client_name,
        a.category,
        a.caption,
        a.media_url,
        a.remaining_days,
        u.full_name as sales_rep_name
      FROM time_slots ts
      LEFT JOIN daily_slot_assignments dsa ON ts.id = dsa.slot_id AND dsa.assignment_date = $1
      LEFT JOIN adverts a ON dsa.advert_id = a.id
      LEFT JOIN users u ON a.sales_rep_id = u.id
      ORDER BY ts.slot_time ASC
    `, [today]);

    // Group by slot
    const schedule = {};
    result.rows.forEach(row => {
      const slotKey = row.slot_id;
      if (!schedule[slotKey]) {
        schedule[slotKey] = {
          slotId: row.slot_id,
          slotTime: row.slot_time,
          slotLabel: row.slot_label,
          adverts: []
        };
      }

      if (row.advert_id) {
        schedule[slotKey].adverts.push({
          advertId: row.advert_id,
          clientName: row.client_name,
          category: row.category,
          caption: row.caption,
          mediaUrl: row.media_url,
          remainingDays: row.remaining_days,
          salesRepName: row.sales_rep_name
        });
      }
    });

    res.json({
      success: true,
      data: {
        date: today,
        schedule: Object.values(schedule)
      }
    });
  } catch (error) {
    console.error('Get today schedule error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching today\'s schedule'
    });
  }
};

/**
 * Get calendar schedule for a specific date
 */
const getCalendarSchedule = async (req, res) => {
  try {
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'Date parameter is required (format: YYYY-MM-DD)'
      });
    }

    const result = await pool.query(`
      SELECT 
        ts.id as slot_id,
        ts.slot_time,
        ts.slot_label,
        a.id as advert_id,
        a.client_name,
        a.category,
        a.caption,
        a.media_url,
        a.remaining_days,
        u.full_name as sales_rep_name
      FROM time_slots ts
      LEFT JOIN daily_slot_assignments dsa ON ts.id = dsa.slot_id AND dsa.assignment_date = $1
      LEFT JOIN adverts a ON dsa.advert_id = a.id
      LEFT JOIN users u ON a.sales_rep_id = u.id
      ORDER BY ts.slot_time ASC
    `, [date]);

    // Group by slot
    const schedule = {};
    result.rows.forEach(row => {
      const slotKey = row.slot_id;
      if (!schedule[slotKey]) {
        schedule[slotKey] = {
          slotId: row.slot_id,
          slotTime: row.slot_time,
          slotLabel: row.slot_label,
          adverts: [],
          available: 2 // Max capacity
        };
      }

      if (row.advert_id) {
        schedule[slotKey].adverts.push({
          advertId: row.advert_id,
          clientName: row.client_name,
          category: row.category,
          caption: row.caption,
          mediaUrl: row.media_url,
          remainingDays: row.remaining_days,
          salesRepName: row.sales_rep_name
        });
        schedule[slotKey].available--;
      }
    });

    res.json({
      success: true,
      data: {
        date,
        schedule: Object.values(schedule)
      }
    });
  } catch (error) {
    console.error('Get calendar schedule error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching calendar schedule'
    });
  }
};

/**
 * Get vacant slots for a specific date range
 */
const getVacantSlots = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate) {
      return res.status(400).json({
        success: false,
        message: 'startDate parameter is required (format: YYYY-MM-DD)'
      });
    }

    const finalEndDate = endDate || startDate;

    const result = await pool.query(`
      WITH date_series AS (
        SELECT generate_series($1::date, $2::date, '1 day'::interval)::date AS check_date
      ),
      slot_occupancy AS (
        SELECT 
          ds.check_date,
          ts.id as slot_id,
          ts.slot_label,
          ts.slot_time,
          COUNT(dsa.id) as occupied_count
        FROM date_series ds
        CROSS JOIN time_slots ts
        LEFT JOIN daily_slot_assignments dsa ON ts.id = dsa.slot_id AND dsa.assignment_date = ds.check_date
        GROUP BY ds.check_date, ts.id, ts.slot_label, ts.slot_time
      )
      SELECT 
        check_date,
        slot_id,
        slot_label,
        slot_time,
        occupied_count,
        (2 - occupied_count) as available_capacity
      FROM slot_occupancy
      WHERE occupied_count < 2
      ORDER BY check_date, slot_time
    `, [startDate, finalEndDate]);

    res.json({
      success: true,
      data: {
        vacantSlots: result.rows
      }
    });
  } catch (error) {
    console.error('Get vacant slots error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching vacant slots'
    });
  }
};

/**
 * Get slot availability for approval (checking specific advert)
 */
const checkSlotAvailability = async (req, res) => {
  try {
    const { advertId, slotId } = req.query;

    if (!advertId || !slotId) {
      return res.status(400).json({
        success: false,
        message: 'advertId and slotId parameters are required'
      });
    }

    // Get advert details
    const advertResult = await pool.query(
      'SELECT * FROM adverts WHERE id = $1',
      [advertId]
    );

    if (advertResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Advert not found'
      });
    }

    const advert = advertResult.rows[0];
    const startDate = new Date(advert.start_date);
    const conflicts = [];

    // Check each day
    for (let i = 0; i < advert.days_paid; i++) {
      const checkDate = new Date(startDate);
      checkDate.setDate(checkDate.getDate() + i);
      const dateStr = checkDate.toISOString().split('T')[0];

      // Check capacity
      const capacityResult = await pool.query(`
        SELECT COUNT(*) as count
        FROM daily_slot_assignments
        WHERE slot_id = $1 AND assignment_date = $2
      `, [slotId, dateStr]);

      const occupied = parseInt(capacityResult.rows[0].count);

      // Check category conflict
      const categoryResult = await pool.query(`
        SELECT a.client_name, a.category
        FROM daily_slot_assignments dsa
        JOIN adverts a ON dsa.advert_id = a.id
        WHERE dsa.slot_id = $1 
          AND dsa.assignment_date = $2
          AND a.category = $3
      `, [slotId, dateStr, advert.category]);

      if (occupied >= 2) {
        conflicts.push({
          date: dateStr,
          reason: 'Slot is full (2/2 capacity)',
          type: 'capacity'
        });
      } else if (categoryResult.rows.length > 0) {
        conflicts.push({
          date: dateStr,
          reason: `Category conflict: "${categoryResult.rows[0].category}" already scheduled`,
          type: 'category',
          conflictingClient: categoryResult.rows[0].client_name
        });
      }
    }

    res.json({
      success: true,
      data: {
        available: conflicts.length === 0,
        conflicts,
        message: conflicts.length === 0 
          ? 'Slot is available for all days' 
          : `Found ${conflicts.length} conflict(s)`
      }
    });
  } catch (error) {
    console.error('Check slot availability error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error checking slot availability'
    });
  }
};

module.exports = {
  getAllSlots,
  getTodaySchedule,
  getCalendarSchedule,
  getVacantSlots,
  checkSlotAvailability
};
