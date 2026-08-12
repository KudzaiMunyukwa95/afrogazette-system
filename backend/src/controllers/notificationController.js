const pool = require('../config/database');

/**
 * Get notifications for current user
 */
const getNotifications = async (req, res) => {
    try {
        const userId = req.user.id;
        const { page = 1, limit = 20 } = req.query;
        const offset = (page - 1) * limit;

        // Get notifications
        const result = await pool.query(`
      SELECT *
      FROM notifications
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `, [userId, limit, offset]);

        // Get unread count
        const countResult = await pool.query(`
      SELECT COUNT(*) as count
      FROM notifications
      WHERE user_id = $1 AND is_read = FALSE
    `, [userId]);

        res.json({
            success: true,
            data: {
                notifications: result.rows,
                unreadCount: parseInt(countResult.rows[0].count)
            }
        });
    } catch (error) {
        console.error('Get notifications error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching notifications'
        });
    }
};

/**
 * Mark notification as read
 */
const markAsRead = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        await pool.query(`
      UPDATE notifications
      SET is_read = TRUE
      WHERE id = $1 AND user_id = $2
    `, [id, userId]);

        res.json({
            success: true,
            message: 'Notification marked as read'
        });
    } catch (error) {
        console.error('Mark notification read error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error updating notification'
        });
    }
};

/**
 * Mark all notifications as read
 */
const markAllAsRead = async (req, res) => {
    try {
        const userId = req.user.id;

        await pool.query(`
      UPDATE notifications
      SET is_read = TRUE
      WHERE user_id = $1 AND is_read = FALSE
    `, [userId]);

        res.json({
            success: true,
            message: 'All notifications marked as read'
        });
    } catch (error) {
        console.error('Mark all notifications read error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error updating notifications'
        });
    }
};

/**
 * Helper to create a notification (internal use)
 */
const createNotification = async (userId, title, message, type = 'info', relatedId = null) => {
    try {
        await pool.query(`
      INSERT INTO notifications (user_id, title, message, type, related_id)
      VALUES ($1, $2, $3, $4, $5)
    `, [userId, title, message, type, relatedId]);
        return true;
    } catch (error) {
        console.error('Create notification error:', error);
        return false;
    }
};

/**
 * Marks every notification tied to a given advert as read (internal use).
 * A "New Pending Advert" notification only makes sense while the advert is
 * actually pending — without this, approving/declining/deleting an advert
 * from the Approvals page (rather than by clicking the bell notification
 * itself) left it sitting unread indefinitely, "lingering" after the
 * underlying advert was already resolved.
 */
const resolveAdvertNotifications = async (advertId) => {
    try {
        // Scoped to the pending-alert type specifically — not every
        // notification tied to this advert, so a fresh "Advert Approved" /
        // "Advert Declined" notification created for the rep right after
        // this call still arrives unread as intended.
        await pool.query(`
      UPDATE notifications
      SET is_read = TRUE
      WHERE related_id = $1 AND title = 'New Pending Advert' AND is_read = FALSE
    `, [advertId]);
        return true;
    } catch (error) {
        console.error('Resolve advert notifications error:', error);
        return false;
    }
};

/**
 * Helper to notify all admins (internal use)
 */
const notifyAdmins = async (title, message, type = 'info', relatedId = null) => {
    try {
        // Get all admin IDs
        const result = await pool.query(`SELECT id FROM users WHERE role = 'admin'`);
        const admins = result.rows;

        // Create notifications for each admin
        const queries = admins.map(admin =>
            pool.query(`
        INSERT INTO notifications (user_id, title, message, type, related_id)
        VALUES ($1, $2, $3, $4, $5)
      `, [admin.id, title, message, type, relatedId])
        );

        await Promise.all(queries);
        return true;
    } catch (error) {
        console.error('Notify admins error:', error);
        return false;
    }
};

module.exports = {
    getNotifications,
    markAsRead,
    markAllAsRead,
    createNotification,
    notifyAdmins,
    resolveAdvertNotifications
};
