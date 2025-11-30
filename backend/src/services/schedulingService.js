const pool = require('../config/database');

/**
 * Calculate remaining days for an advert
 */
const calculateRemainingDays = (startDate, daysPaid) => {
  const start = new Date(startDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  start.setHours(0, 0, 0, 0);

  const daysPassed = Math.floor((today - start) / (1000 * 60 * 60 * 24));
  const remaining = daysPaid - daysPassed;

  return Math.max(0, remaining);
};

/**
 * Update remaining days for all active adverts
 * This runs daily via cron job
 */
const updateRemainingDays = async () => {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Starting daily remaining days update...');

    await client.query('BEGIN');

    // Get all active adverts
    const activeAdverts = await client.query(`
      SELECT id, start_date, days_paid, remaining_days
      FROM adverts
      WHERE status = 'active'
    `);

    let updatedCount = 0;
    let expiredCount = 0;

    for (const advert of activeAdverts.rows) {
      const newRemainingDays = calculateRemainingDays(advert.start_date, advert.days_paid);

      // If remaining days changed
      if (newRemainingDays !== advert.remaining_days) {
        if (newRemainingDays <= 0) {
          // Move to expired
          await client.query(`
            UPDATE adverts
            SET status = 'expired',
                remaining_days = 0,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
          `, [advert.id]);
          expiredCount++;
        } else {
          // Update remaining days
          await client.query(`
            UPDATE adverts
            SET remaining_days = $1,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
          `, [newRemainingDays, advert.id]);
          updatedCount++;
        }
      }
    }

    await client.query('COMMIT');

    console.log(`✅ Daily update complete:`);
    console.log(`   - Updated: ${updatedCount} adverts`);
    console.log(`   - Expired: ${expiredCount} adverts`);

    return {
      success: true,
      updatedCount,
      expiredCount
    };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error updating remaining days:', error);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Clean up old daily slot assignments (older than 90 days)
 * This helps keep the database clean
 */
const cleanupOldAssignments = async () => {
  try {
    console.log('🧹 Cleaning up old slot assignments...');

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 90);
    const cutoffStr = cutoffDate.toISOString().split('T')[0];

    const result = await pool.query(`
      DELETE FROM daily_slot_assignments
      WHERE assignment_date < $1
    `, [cutoffStr]);

    console.log(`✅ Cleaned up ${result.rowCount} old assignments`);

    return {
      success: true,
      deletedCount: result.rowCount
    };
  } catch (error) {
    console.error('❌ Error cleaning up assignments:', error);
    throw error;
  }
};

/**
 * Get schedule conflicts for a specific advert and slot
 */
const checkScheduleConflicts = async (advertId, slotId) => {
  try {
    // Get advert details
    const advertResult = await pool.query(
      'SELECT * FROM adverts WHERE id = $1',
      [advertId]
    );

    if (advertResult.rows.length === 0) {
      throw new Error('Advert not found');
    }

    const advert = advertResult.rows[0];
    const startDate = new Date(advert.start_date);
    const conflicts = [];

    // Check each day
    for (let i = 0; i < advert.days_paid; i++) {
      const checkDate = new Date(startDate);
      checkDate.setDate(checkDate.getDate() + i);
      const dateStr = checkDate.toISOString().split('T')[0];

      // Check capacity (max 2 per slot)
      const capacityCheck = await pool.query(`
        SELECT COUNT(*) as count
        FROM daily_slot_assignments
        WHERE slot_id = $1 AND assignment_date = $2
      `, [slotId, dateStr]);

      if (parseInt(capacityCheck.rows[0].count) >= 2) {
        conflicts.push({
          date: dateStr,
          type: 'capacity',
          message: 'Slot is full (2/2)'
        });
        continue;
      }

      // Check category conflict
      const categoryCheck = await pool.query(`
        SELECT a.client_name, a.category
        FROM daily_slot_assignments dsa
        JOIN adverts a ON dsa.advert_id = a.id
        WHERE dsa.slot_id = $1 
          AND dsa.assignment_date = $2
          AND a.category = $3
          AND a.id != $4
      `, [slotId, dateStr, advert.category, advertId]);

      if (categoryCheck.rows.length > 0) {
        conflicts.push({
          date: dateStr,
          type: 'category',
          message: `Category "${advert.category}" already scheduled`,
          conflictingClient: categoryCheck.rows[0].client_name
        });
      }
    }

    return {
      hasConflicts: conflicts.length > 0,
      conflicts
    };
  } catch (error) {
    console.error('Error checking schedule conflicts:', error);
    throw error;
  }
};

module.exports = {
  calculateRemainingDays,
  updateRemainingDays,
  cleanupOldAssignments,
  checkScheduleConflicts
};
