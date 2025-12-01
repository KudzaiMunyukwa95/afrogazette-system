const { createNotification } = require('./controllers/notificationController');
const pool = require('./config/database');

/**
 * Cron job to check for adverts expiring in 1 day and notify sales reps
 * Runs daily at 9 AM
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
    } catch (error) {
        console.error('❌ Error checking expiring adverts:', error);
    }
};

module.exports = { checkExpiringAdverts };
