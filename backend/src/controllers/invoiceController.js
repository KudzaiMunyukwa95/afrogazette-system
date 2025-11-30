const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const pool = require('../config/database');

/**
 * Generate PDF Invoice
 * @param {Object} invoiceData - Data for the invoice
 * @param {string} filePath - Path to save the PDF
 */
const generateInvoicePDF = (invoiceData, filePath) => {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ margin: 50 });
        const stream = fs.createWriteStream(filePath);

        doc.pipe(stream);

        // Header
        doc
            .fillColor('#444444')
            .fontSize(20)
            .text('AfroGazette', 110, 57)
            .fontSize(10)
            .text('AfroGazette', 200, 50, { align: 'right' })
            .text('Office 4', 200, 65, { align: 'right' })
            .text('Karimapondo Building', 200, 80, { align: 'right' })
            .text('78 Leopold Takawira', 200, 95, { align: 'right' })
            .text('Harare', 200, 110, { align: 'right' })
            .moveDown();

        // Invoice Details
        doc
            .fillColor('#000000')
            .fontSize(20)
            .text('INVOICE', 50, 160);

        doc
            .fontSize(10)
            .text(`Invoice Number: ${invoiceData.invoice_number}`, 50, 200)
            .text(`Date: ${new Date(invoiceData.generated_at).toLocaleDateString()}`, 50, 215)
            .text(`Status: ${invoiceData.status}`, 50, 230)
            .text(`Sales Rep: ${invoiceData.sales_rep_name}`, 50, 245);

        doc
            .text(`Bill To:`, 300, 200)
            .text(`${invoiceData.client_name}`, 300, 215)
            .moveDown();

        // Table Header
        const tableTop = 330;
        doc.font('Helvetica-Bold');
        doc.text('Description', 50, tableTop);
        doc.text('Category', 250, tableTop);
        doc.text('Days', 350, tableTop);
        doc.text('Amount', 450, tableTop, { align: 'right' });

        const itemTop = 350;
        doc.font('Helvetica');
        doc.text(invoiceData.caption || 'Advertisement', 50, itemTop);
        doc.text(invoiceData.category, 250, itemTop);
        doc.text(invoiceData.days_paid.toString(), 350, itemTop);
        doc.text(`$${Number(invoiceData.amount).toFixed(2)}`, 450, itemTop, { align: 'right' });

        // Total
        const totalTop = 400;
        doc.font('Helvetica-Bold');
        doc.text('Total:', 350, totalTop);
        doc.text(`$${Number(invoiceData.amount).toFixed(2)}`, 450, totalTop, { align: 'right' });

        // Footer
        doc
            .fontSize(10)
            .text(
                'Thank you for your business.',
                50,
                700,
                { align: 'center', width: 500 }
            );

        doc.end();

        stream.on('finish', () => resolve(filePath));
        stream.on('error', (err) => reject(err));
    });
};

/**
 * Get all invoices (Admin) or My Invoices (Sales Rep)
 */
const getInvoices = async (req, res) => {
    try {
        let query = `
      SELECT i.*, u.full_name as sales_rep_name 
      FROM invoices i
      LEFT JOIN users u ON i.sales_rep_id = u.id
    `;
        const params = [];

        if (req.user.role === 'sales_rep') {
            query += ` WHERE i.sales_rep_id = $1`;
            params.push(req.user.id);
        }

        query += ` ORDER BY i.generated_at DESC`;

        const result = await pool.query(query, params);

        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        console.error('Get invoices error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching invoices'
        });
    }
};

/**
 * Download Invoice PDF
 */
const downloadInvoice = async (req, res) => {
    try {
        const { id } = req.params;

        // Check permissions
        const invoiceResult = await pool.query('SELECT * FROM invoices WHERE id = $1', [id]);

        if (invoiceResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Invoice not found' });
        }

        const invoice = invoiceResult.rows[0];

        if (req.user.role === 'sales_rep' && invoice.sales_rep_id !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        // Generate PDF on the fly if it doesn't exist (or just always generate for simplicity)
        // In a real app, you might store the path. Here we'll generate it to a temp file.
        const invoicesDir = path.join(__dirname, '../../public/invoices');
        if (!fs.existsSync(invoicesDir)) {
            fs.mkdirSync(invoicesDir, { recursive: true });
        }

        const fileName = `invoice-${invoice.invoice_number}.pdf`;
        const filePath = path.join(invoicesDir, fileName);

        // Fetch extra details for the PDF
        const detailsResult = await pool.query(`
      SELECT i.*, a.category, a.caption, a.days_paid, u.full_name as sales_rep_name
      FROM invoices i
      JOIN adverts a ON i.advert_id = a.id
      JOIN users u ON i.sales_rep_id = u.id
      WHERE i.id = $1
    `, [id]);

        const fullInvoiceData = detailsResult.rows[0];

        await generateInvoicePDF(fullInvoiceData, filePath);

        res.download(filePath, fileName);

    } catch (error) {
        console.error('Download invoice error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error downloading invoice'
        });
    }
};

module.exports = {
    getInvoices,
    downloadInvoice,
    generateInvoicePDF // Exported for use in advertController
};
