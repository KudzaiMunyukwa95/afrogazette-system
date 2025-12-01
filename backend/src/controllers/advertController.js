const pool = require('../config/database');
const { calculateRemainingDays } = require('../services/schedulingService');
const { createNotification, notifyAdmins } = require('./notificationController');

/**
 * Create new advert (sales rep)
 */
const createAdvert = async (req, res) => {
  try {
    const {
      clientId,
      clientName,
      category,
      caption,
      mediaUrl,
      daysPaid,
      paymentDate,
      amountPaid,
      startDate,
      advertType = 'text_ad',
      paymentMethod = 'cash'
    } = req.body;

    const salesRepId = req.user.id;
    let finalClientName = clientName;

    // If client_id is provided, fetch client name from clients table
    if (clientId) {
      const clientResult = await pool.query(
        'SELECT name FROM clients WHERE id = $1 AND sales_rep_id = $2',
        [clientId, salesRepId]
      );

      if (clientResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Client not found'
        });
      }

      finalClientName = clientResult.rows[0].name;
    }

    // Insert advert with pending status
    const result = await pool.query(
      `INSERT INTO adverts (
        client_id, client_name, category, caption, media_url, days_paid,
        payment_date, amount_paid, start_date, sales_rep_id, status, advert_type, payment_method
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending', $11, $12)
      RETURNING *`,
      [clientId || null, finalClientName, category, caption, mediaUrl, daysPaid, paymentDate, parseFloat(amountPaid).toFixed(2), startDate, salesRepId, advertType, paymentMethod]
    );

    const newAdvert = result.rows[0];

    // Notify admins about new pending advert
    await notifyAdmins(
      'New Pending Advert',
      `New advert created by ${req.user.full_name || req.user.email} for client "${newAdvert.client_name}".`,
      'info',
      newAdvert.id
    );

    res.status(201).json({
      success: true,
      message: 'Advert created successfully',
      data: newAdvert
    });
  } catch (error) {
    console.error('Create advert error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error creating advert'
    });
  }
};

/**
 * Get adverts - filtered by role
 * - Sales rep: only their own adverts
 * - Admin: all adverts
 */
const getAdverts = async (req, res) => {
  try {
    const { status, page = 1, limit = 15 } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT 
        a.*,
        u.full_name as sales_rep_name,
        u.email as sales_rep_email,
        ts.slot_label,
        ts.slot_time
      FROM adverts a
      LEFT JOIN users u ON a.sales_rep_id = u.id
      LEFT JOIN time_slots ts ON a.assigned_slot_id = ts.id
    `;

    const conditions = [];
    const values = [];
    let paramCount = 1;

    // Sales reps can only see their own adverts
    if (req.user.role === 'sales_rep') {
      conditions.push(`a.sales_rep_id = $${paramCount++}`);
      values.push(req.user.id);
    }

    // Filter by status if provided
    if (status) {
      conditions.push(`a.status = $${paramCount++}`);
      values.push(status);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    // Get total count for pagination
    const countQuery = `SELECT COUNT(*) FROM adverts a` +
      (conditions.length > 0 ? ' WHERE ' + conditions.join(' AND ') : '');
    const countResult = await pool.query(countQuery, values);
    const total = parseInt(countResult.rows[0].count);

    query += ' ORDER BY a.created_at DESC';

    // Add pagination
    query += ` LIMIT $${paramCount++} OFFSET $${paramCount++}`;
    values.push(limit, offset);

    const result = await pool.query(query, values);

    res.json({
      success: true,
      data: {
        adverts: result.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get adverts error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching adverts'
    });
  }
};

/**
 * Get pending adverts (admin only)
 */
const getPendingAdverts = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        a.*,
        u.full_name as sales_rep_name,
        u.email as sales_rep_email
      FROM adverts a
      LEFT JOIN users u ON a.sales_rep_id = u.id
      WHERE a.status = 'pending'
      ORDER BY a.created_at ASC
    `);

    res.json({
      success: true,
      data: {
        adverts: result.rows
      }
    });
  } catch (error) {
    console.error('Get pending adverts error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching pending adverts'
    });
  }
};

/**
 * Approve advert and assign slot (admin only)
 */
const approveAdvert = async (req, res) => {
  const client = await pool.connect();

  try {
    const { id } = req.params;
    const { slotId } = req.body;

    await client.query('BEGIN');

    // Get advert details
    const advertResult = await client.query(
      'SELECT * FROM adverts WHERE id = $1',
      [id]
    );

    if (advertResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Advert not found'
      });
    }

    const advert = advertResult.rows[0];

    if (advert.status !== 'pending') {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Only pending adverts can be approved'
      });
    }

    // Verify slot exists
    const slotResult = await client.query(
      'SELECT * FROM time_slots WHERE id = $1',
      [slotId]
    );

    if (slotResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Time slot not found'
      });
    }

    // Check slot availability and category conflicts for each day
    const startDate = new Date(advert.start_date);
    const daysPaid = advert.days_paid;

    for (let i = 0; i < daysPaid; i++) {
      const checkDate = new Date(startDate);
      checkDate.setDate(checkDate.getDate() + i);
      const dateStr = checkDate.toISOString().split('T')[0];

      // Check how many adverts are already in this slot on this date
      const capacityCheck = await client.query(`
        SELECT COUNT(*) as count
        FROM daily_slot_assignments
        WHERE slot_id = $1 AND assignment_date = $2
      `, [slotId, dateStr]);

      if (parseInt(capacityCheck.rows[0].count) >= 2) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          message: `Slot is full on ${dateStr}. Maximum 2 adverts per slot allowed.`
        });
      }

      // Check for category conflict on this date
      const categoryCheck = await client.query(`
        SELECT a.client_name, a.category
        FROM daily_slot_assignments dsa
        JOIN adverts a ON dsa.advert_id = a.id
        WHERE dsa.slot_id = $1 
          AND dsa.assignment_date = $2
          AND a.category = $3
          AND a.id != $4
      `, [slotId, dateStr, advert.category, id]);

      if (categoryCheck.rows.length > 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          message: `Category conflict on ${dateStr}. Another "${advert.category}" advert is already scheduled in this slot.`
        });
      }
    }

    // Calculate end date
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + daysPaid - 1);

    // Update advert to active
    await client.query(`
      UPDATE adverts
      SET status = 'active',
          assigned_slot_id = $1,
          approved_by = $2,
          approved_at = CURRENT_TIMESTAMP,
          end_date = $3,
          remaining_days = $4,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $5
    `, [slotId, req.user.id, endDate.toISOString().split('T')[0], daysPaid, id]);

    // Create daily slot assignments for each day
    for (let i = 0; i < daysPaid; i++) {
      const assignmentDate = new Date(startDate);
      assignmentDate.setDate(assignmentDate.getDate() + i);
      const dateStr = assignmentDate.toISOString().split('T')[0];

      await client.query(`
        INSERT INTO daily_slot_assignments (advert_id, slot_id, assignment_date)
        VALUES ($1, $2, $3)
      `, [id, slotId, dateStr]);
    }

    // Generate Invoice
    const invoiceNumber = `AG-INV-${Date.now().toString().slice(-6)}`;
    const commissionAmount = (parseFloat(advert.amount_paid) * 0.10).toFixed(2); // 10% commission

    await client.query(`
      INSERT INTO invoices (
        invoice_number, advert_id, client_name, amount, 
        commission_amount, sales_rep_id, approved_by, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'PAID')
    `, [
      invoiceNumber,
      id,
      advert.client_name,
      advert.amount_paid,
      commissionAmount,
      advert.sales_rep_id,
      req.user.id
    ]);

    // Send notification to sales rep
    await createNotification(
      advert.sales_rep_id,
      'Advert Approved',
      `Your advert for "${advert.client_name}" has been approved and scheduled.`,
      'success',
      id
    );

    await client.query('COMMIT');

    // Fetch updated advert
    const updatedAdvert = await client.query(`
      SELECT 
        a.*,
        u.full_name as sales_rep_name,
        ts.slot_label,
        ts.slot_time
      FROM adverts a
      LEFT JOIN users u ON a.sales_rep_id = u.id
      LEFT JOIN time_slots ts ON a.assigned_slot_id = ts.id
      WHERE a.id = $1
    `, [id]);

    res.json({
      success: true,
      message: 'Advert approved and scheduled successfully',
      data: {
        advert: updatedAdvert.rows[0]
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Approve advert error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error approving advert'
    });
  } finally {
    client.release();
  }
};

/**
 * Decline advert with reason (admin only)
 * Works WITHOUT admin_actions table - uses cancelled status
 */
const declineAdvert = async (req, res) => {
  const client = await pool.connect();

  try {
    const { id } = req.params;
    const { reason, notes } = req.body;

    if (!reason || reason.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Decline reason is required'
      });
    }

    await client.query('BEGIN');

    // Check if advert exists and is pending
    const advertResult = await client.query(
      'SELECT * FROM adverts WHERE id = $1',
      [id]
    );

    if (advertResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Advert not found'
      });
    }

    const advert = advertResult.rows[0];

    if (advert.status !== 'pending') {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Only pending adverts can be declined'
      });
    }

    // Update advert status to cancelled
    await client.query(
      `UPDATE adverts 
       SET status = 'cancelled', 
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [id]
    );

    // Try to log to admin_actions if table exists (won't fail if it doesn't)
    try {
      await client.query(
        `INSERT INTO admin_actions (advert_id, admin_id, action_type, reason, notes)
         VALUES ($1, $2, 'declined', $3, $4)`,
        [id, req.user.id, reason, notes || null]
      );
    } catch (err) {
      // Table doesn't exist yet, that's ok - just log the decline
      console.log('Admin actions table not available yet, decline logged to advert status');
    }

    // Send notification to sales rep
    await createNotification(
      advert.sales_rep_id,
      'Advert Declined',
      `Your advert for "${advert.client_name}" was declined. Reason: ${reason}`,
      'error',
      id
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Advert declined successfully',
      data: {
        advertId: id,
        status: 'cancelled',
        reason
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Decline advert error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error declining advert'
    });
  } finally {
    client.release();
  }
};

/**
 * Update advert (admin only)
 */
const updateAdvert = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Build dynamic update query
    const fields = [];
    const values = [];
    let paramCount = 1;

    const allowedFields = [
      'client_name', 'category', 'caption', 'media_url',
      'days_paid', 'payment_date', 'amount_paid', 'start_date'
    ];

    for (const [key, value] of Object.entries(updates)) {
      const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      if (allowedFields.includes(snakeKey)) {
        fields.push(`${snakeKey} = $${paramCount++}`);
        values.push(value);
      }
    }

    if (fields.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid fields to update'
      });
    }

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    const result = await pool.query(
      `UPDATE adverts
       SET ${fields.join(', ')}
       WHERE id = $${paramCount}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Advert not found'
      });
    }

    res.json({
      success: true,
      message: 'Advert updated successfully',
      data: {
        advert: result.rows[0]
      }
    });
  } catch (error) {
    console.error('Update advert error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating advert'
    });
  }
};

/**
 * Delete advert
 */
const deleteAdvert = async (req, res) => {
  const client = await pool.connect();

  try {
    const { id } = req.params;

    await client.query('BEGIN');

    // Check if advert exists and ownership
    const advertCheck = await client.query(
      'SELECT * FROM adverts WHERE id = $1',
      [id]
    );

    if (advertCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Advert not found'
      });
    }

    const advert = advertCheck.rows[0];

    // Sales reps can only delete their own pending adverts
    if (req.user.role === 'sales_rep' &&
      (advert.sales_rep_id !== req.user.id || advert.status !== 'pending')) {
      await client.query('ROLLBACK');
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own pending adverts'
      });
    }

    // Delete advert (cascades to daily_slot_assignments)
    await client.query('DELETE FROM adverts WHERE id = $1', [id]);

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Advert deleted successfully'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Delete advert error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error deleting advert'
    });
  } finally {
    client.release();
  }
};

/**
 * Permanently delete advert (admin only)
 */
const permanentlyDeleteAdvert = async (req, res) => {
  const client = await pool.connect();

  try {
    const { id } = req.params;
    const { reason } = req.body;

    await client.query('BEGIN');

    // Check if advert exists
    const advertCheck = await client.query(
      'SELECT * FROM adverts WHERE id = $1',
      [id]
    );

    if (advertCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Advert not found'
      });
    }

    // Try to log action if table exists
    if (reason) {
      try {
        await client.query(
          `INSERT INTO admin_actions (advert_id, admin_id, action_type, reason)
           VALUES ($1, $2, 'deleted', $3)`,
          [id, req.user.id, reason]
        );
      } catch (err) {
        console.log('Admin actions table not available, deletion not logged');
      }
    }

    // Delete advert (cascades to daily_slot_assignments)
    await client.query('DELETE FROM adverts WHERE id = $1', [id]);

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Advert permanently deleted'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Permanently delete advert error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error deleting advert'
    });
  } finally {
    client.release();
  }
};

/**
 * Extend advert days (admin only)
 */
const extendAdvert = async (req, res) => {
  const client = await pool.connect();

  try {
    const { id } = req.params;
    const { additionalDays, amountPaid } = req.body;

    await client.query('BEGIN');

    // Get advert
    const advertResult = await client.query(
      'SELECT * FROM adverts WHERE id = $1',
      [id]
    );

    if (advertResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Advert not found'
      });
    }

    const advert = advertResult.rows[0];

    if (!advert.assigned_slot_id) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Cannot extend advert without assigned slot'
      });
    }

    // Calculate new end date
    const currentEndDate = new Date(advert.end_date || advert.start_date);
    const newEndDate = new Date(currentEndDate);
    newEndDate.setDate(newEndDate.getDate() + parseInt(additionalDays));

    const newDaysPaid = advert.days_paid + parseInt(additionalDays);
    const newRemainingDays = calculateRemainingDays(advert.start_date, newDaysPaid);

    // Check slot availability for extension period
    const extensionStartDate = new Date(currentEndDate);
    extensionStartDate.setDate(extensionStartDate.getDate() + 1);

    for (let i = 0; i < additionalDays; i++) {
      const checkDate = new Date(extensionStartDate);
      checkDate.setDate(checkDate.getDate() + i);
      const dateStr = checkDate.toISOString().split('T')[0];

      // Check capacity
      const capacityCheck = await client.query(`
        SELECT COUNT(*) as count
        FROM daily_slot_assignments
        WHERE slot_id = $1 AND assignment_date = $2
      `, [advert.assigned_slot_id, dateStr]);

      if (parseInt(capacityCheck.rows[0].count) >= 2) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          message: `Slot is full on ${dateStr}. Cannot extend.`
        });
      }

      // Check category conflict
      const categoryCheck = await client.query(`
        SELECT a.client_name
        FROM daily_slot_assignments dsa
        JOIN adverts a ON dsa.advert_id = a.id
        WHERE dsa.slot_id = $1 
          AND dsa.assignment_date = $2
          AND a.category = $3
          AND a.id != $4
      `, [advert.assigned_slot_id, dateStr, advert.category, id]);

      if (categoryCheck.rows.length > 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          message: `Category conflict on ${dateStr}. Cannot extend.`
        });
      }
    }

    // Update advert
    await client.query(`
      UPDATE adverts
      SET days_paid = $1,
          end_date = $2,
          remaining_days = $3,
          amount_paid = amount_paid + $4,
          status = CASE WHEN status = 'expired' THEN 'active' ELSE status END,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $5
    `, [newDaysPaid, newEndDate.toISOString().split('T')[0], newRemainingDays, amountPaid || 0, id]);

    // Add new daily assignments
    for (let i = 0; i < additionalDays; i++) {
      const assignmentDate = new Date(extensionStartDate);
      assignmentDate.setDate(assignmentDate.getDate() + i);
      const dateStr = assignmentDate.toISOString().split('T')[0];

      await client.query(`
        INSERT INTO daily_slot_assignments (advert_id, slot_id, assignment_date)
        VALUES ($1, $2, $3)
        ON CONFLICT DO NOTHING
      `, [id, advert.assigned_slot_id, dateStr]);
    }

    await client.query('COMMIT');

    res.json({
      success: true,
      message: `Advert extended by ${additionalDays} days`,
      data: {
        newEndDate: newEndDate.toISOString().split('T')[0],
        newDaysPaid,
        newRemainingDays
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Extend advert error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error extending advert'
    });
  } finally {
    client.release();
  }
};

/**
 * Get decline history for an advert (admin only)
 * Returns empty array if admin_actions table doesn't exist yet
 */
const getAdvertHistory = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if table exists first
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public'
        AND table_name = 'admin_actions'
      ) as table_exists;
    `);

    if (!tableCheck.rows[0].table_exists) {
      return res.json({
        success: true,
        message: 'History tracking will be available after database migration',
        data: {
          history: []
        }
      });
    }

    // Table exists, fetch history
    const result = await pool.query(
      `SELECT 
        aa.id,
        aa.action_type,
        aa.reason,
        aa.notes,
        aa.created_at,
        u.full_name as admin_name,
        u.email as admin_email
      FROM admin_actions aa
      LEFT JOIN users u ON aa.admin_id = u.id
      WHERE aa.advert_id = $1
      ORDER BY aa.created_at DESC`,
      [id]
    );

    res.json({
      success: true,
      data: {
        history: result.rows
      }
    });
  } catch (error) {
    console.error('Get advert history error:', error);
    // Return empty history on error (don't fail the request)
    res.json({
      success: true,
      data: {
        history: []
      }
    });
  }
};

module.exports = {
  createAdvert,
  getAdverts,
  getPendingAdverts,
  approveAdvert,
  updateAdvert,
  deleteAdvert,
  extendAdvert,
  declineAdvert,           // NEW
  permanentlyDeleteAdvert, // NEW
  getAdvertHistory         // NEW
};
