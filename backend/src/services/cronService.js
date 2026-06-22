const cron = require('node-cron');
const pool = require('../config/database');
const { createNotification } = require('../controllers/notificationController');

/**
 * Update remaining days for all active adverts
 * Uses CALENDAR DATE comparison (not timestamps)
 */
const updateRemainingDays = async () => {
  try {
    console.log('📅 Updating remaining days...');

    // Update remaining_days using DATE comparison
    const updateResult = await pool.query(`
      UPDATE adverts
      SET remaining_days = GREATEST(
        0,
        (DATE(end_date) - DATE(CURRENT_DATE))
      )
      WHERE status = 'active'
      RETURNING id, client_name, remaining_days
    `);

    console.log(`✅ Updated ${updateResult.rows.length} adverts`);

    // Mark expired adverts
    const expireResult = await pool.query(`
      UPDATE adverts
      SET status = 'expired'
      WHERE status = 'active'
        AND remaining_days <= 0
      RETURNING id, client_name
    `);

    if (expireResult.rows.length > 0) {
      console.log(`📅 Expired ${expireResult.rows.length} adverts:`);
      expireResult.rows.forEach(advert => {
        console.log(`   - ${advert.client_name} (ID: ${advert.id})`);
      });
    }

    return {
      updated: updateResult.rows.length,
      expired: expireResult.rows.length
    };
  } catch (error) {
    console.error('❌ Error updating remaining days:', error);
    throw error;
  }
};

/**
 * Cleanup old daily slot assignments
 */
const cleanupOldAssignments = async () => {
  try {
    console.log('🗑️  Cleaning old assignments...');

    const result = await pool.query(`
      DELETE FROM daily_slot_assignments
      WHERE assignment_date < CURRENT_DATE - INTERVAL '30 days'
    `);

    console.log(`✅ Cleaned ${result.rowCount} old assignments`);

    return result.rowCount;
  } catch (error) {
    console.error('❌ Error cleaning assignments:', error);
    throw error;
  }
};

/**
 * Check for adverts expiring in 1 day and notify sales reps
 */
const checkExpiringAdverts = async () => {
  try {
    console.log('🔔 Checking for adverts expiring soon...');

    // Get adverts expiring tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const result = await pool.query(`
      SELECT a.id, a.client_name, a.sales_rep_id, a.end_date
      FROM adverts a
      WHERE a.status = 'active'
        AND DATE(a.end_date) = $1
    `, [tomorrowStr]);

    console.log(`Found ${result.rows.length} adverts expiring tomorrow`);

    // Send notifications to sales reps
    for (const advert of result.rows) {
      await createNotification(
        advert.sales_rep_id,
        'Advert Expiring Soon',
        `Your advert for "${advert.client_name}" expires tomorrow. Consider renewing it.`,
        'warning',
        advert.id
      );
    }

    console.log(`✅ Sent ${result.rows.length} expiring advert notifications`);
    return result.rows.length;
  } catch (error) {
    console.error('❌ Error checking expiring adverts:', error);
    throw error;
  }
};

/**
 * Initialize all cron jobs
 */
const initializeCronJobs = () => {
  console.log('⏰ Initializing cron jobs...');

  // Update remaining days daily at 00:01 (1 minute past midnight)
  cron.schedule('1 0 * * *', async () => {
    console.log('\n════════════════════════════════════════');
    console.log('⏰ DAILY REMAINING DAYS UPDATE');
    console.log('════════════════════════════════════════');
    console.log('🕐 Started:', new Date().toISOString());

    try {
      const result = await updateRemainingDays();

      console.log('════════════════════════════════════════');
      console.log('✅ DAILY UPDATE COMPLETED');
      console.log(`📊 Updated: ${result.updated} adverts`);
      console.log(`📅 Expired: ${result.expired} adverts`);
      console.log('════════════════════════════════════════\n');
    } catch (error) {
      console.error('❌ Cron job error:', error);
    }
  });

  // Cleanup old assignments weekly (Sundays at 2 AM)
  cron.schedule('0 2 * * 0', async () => {
    console.log('\n⏰ Running weekly cleanup...');

    try {
      await cleanupOldAssignments();
    } catch (error) {
      console.error('❌ Cleanup error:', error);
    }
  });

  // Check for expiring adverts daily at 9 AM
  cron.schedule('0 9 * * *', async () => {
    console.log('\n⏰ Checking for expiring adverts...');

    try {
      await checkExpiringAdverts();
    } catch (error) {
      console.error('❌ Expiring adverts check error:', error);
    }
  });

  console.log('✅ Cron jobs initialized');
  console.log('   📅 Daily update: 00:01 (1 min past midnight)');
  console.log('   🔔 Expiring adverts check: 09:00 daily');
  console.log('   🗑️  Weekly cleanup: Sundays at 02:00');
};

/**
 * Manual trigger for testing
 */
const manualUpdate = async () => {
  try {
    console.log('🔧 MANUAL UPDATE TRIGGERED');
    console.log('════════════════════════════════════════');

    const result = await updateRemainingDays();

    console.log('════════════════════════════════════════');
    console.log('✅ MANUAL UPDATE COMPLETED');
    console.log(`📊 Updated: ${result.updated} adverts`);
    console.log(`📅 Expired: ${result.expired} adverts`);
    console.log('════════════════════════════════════════\n');

    return {
      success: true,
      ...result
    };
  } catch (error) {
    console.error('❌ Manual update error:', error);
    throw error;
  }
};

module.exports = {
  initializeCronJobs,
  updateRemainingDays,
  cleanupOldAssignments,
  checkExpiringAdverts,
  manualUpdate
};
