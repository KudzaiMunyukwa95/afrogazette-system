const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const pool = require('../config/database');
const QRCode = require('qrcode');

/**
 * Generate PDF Invoice
 * @param {Object} invoiceData - Data for the invoice
 * @param {string} filePath - Path to save the PDF
 */
const generateInvoicePDF = async (invoiceData, filePath) => {
    return new Promise(async (resolve, reject) => {
        try {
            const doc = new PDFDocument({ margin: 50, size: 'A4' });
            const stream = fs.createWriteStream(filePath);

            doc.pipe(stream);

            // --- COLORS ---
            const PRIMARY_RED = '#E63946';
            const DARK_BLACK = '#1A1A1A';
            const LIGHT_GRAY = '#F8F9FA';
            const TEXT_GRAY = '#666666';

            // --- HEADER ---
            // Red accent bar at top
            doc.rect(0, 0, doc.page.width, 10).fill(PRIMARY_RED);

            // Logo (Text based for now)
            doc.moveDown(2);
            doc.font('Helvetica-Bold').fontSize(28);
            doc.fillColor(PRIMARY_RED).text('afro', 50, 50, { continued: true });
            doc.fillColor(DARK_BLACK).text('gazette');

            // Company Info
            doc.fontSize(10).font('Helvetica').fillColor(TEXT_GRAY);
            doc.text('Office 4, Karimapondo Building', 50, 85);
            doc.text('78 Leopold Takawira, Harare', 50, 100);
            doc.text('Zimbabwe', 50, 115);
            doc.text('support@afrogazette.co.zw', 50, 130);

            // Invoice Details Box (Right side)
            const invoiceBoxTop = 50;
            doc.roundedRect(350, invoiceBoxTop, 200, 100, 5).fill(LIGHT_GRAY);

            doc.fillColor(DARK_BLACK).fontSize(20).font('Helvetica-Bold');
            doc.text('INVOICE', 370, invoiceBoxTop + 15);

            doc.fontSize(10).font('Helvetica');
            doc.text('Invoice #:', 370, invoiceBoxTop + 45);
            doc.font('Helvetica-Bold').text(invoiceData.invoice_number, 450, invoiceBoxTop + 45, { align: 'right', width: 80 });

            doc.font('Helvetica').text('Date:', 370, invoiceBoxTop + 60);
            doc.font('Helvetica-Bold').text(new Date(invoiceData.generated_at).toLocaleDateString(), 450, invoiceBoxTop + 60, { align: 'right', width: 80 });

            doc.font('Helvetica').text('Status:', 370, invoiceBoxTop + 75);
            doc.fillColor(invoiceData.status === 'PAID' ? '#2ECC71' : PRIMARY_RED);
            doc.font('Helvetica-Bold').text(invoiceData.status, 450, invoiceBoxTop + 75, { align: 'right', width: 80 });

            // --- BILL TO ---
            doc.moveDown(4);
            const billToTop = 180;
            doc.fillColor(DARK_BLACK).fontSize(12).font('Helvetica-Bold').text('BILL TO', 50, billToTop);
            doc.rect(50, billToTop + 15, 200, 1).fill(PRIMARY_RED);

            doc.fontSize(11).font('Helvetica').fillColor(DARK_BLACK).text(invoiceData.client_name, 50, billToTop + 25);
            if (invoiceData.client_company) doc.text(invoiceData.client_company, 50, billToTop + 40);

            // --- TABLE ---
            const tableTop = 280;

            // Table Header Background
            doc.rect(50, tableTop, 500, 30).fill(DARK_BLACK);

            // Table Headers
            doc.fillColor('#FFFFFF').fontSize(10).font('Helvetica-Bold');
            doc.text('DESCRIPTION', 60, tableTop + 10);
            doc.text('TYPE', 300, tableTop + 10);
            doc.text('DURATION', 400, tableTop + 10);
            doc.text('AMOUNT', 480, tableTop + 10, { align: 'right', width: 60 });

            // Table Row
            const rowTop = tableTop + 40;
            doc.fillColor(DARK_BLACK).font('Helvetica');

            // Format Description
            const advertTypeFormatted = (invoiceData.advert_type || 'Text Ad').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            const description = `${invoiceData.caption || 'Advertisement'} - ${invoiceData.category}`;

            doc.text(description, 60, rowTop, { width: 230 });
            doc.text(advertTypeFormatted, 300, rowTop);
            doc.text(`${invoiceData.days_paid} Days`, 400, rowTop);
            doc.text(`$${Number(invoiceData.amount).toFixed(2)}`, 480, rowTop, { align: 'right', width: 60 });

            // Line under row
            doc.rect(50, rowTop + 20, 500, 1).fill('#EEEEEE');

            // --- TOTALS ---
            const totalTop = rowTop + 50;
            doc.rect(350, totalTop, 200, 40).fill(LIGHT_GRAY);

            doc.fillColor(DARK_BLACK).fontSize(14).font('Helvetica-Bold');
            doc.text('TOTAL', 370, totalTop + 12);
            doc.fillColor(PRIMARY_RED);
            doc.text(`$${Number(invoiceData.amount).toFixed(2)}`, 450, totalTop + 12, { align: 'right', width: 80 });

            // --- FOOTER & QR CODE ---
            const footerTop = 650;

            // Generate QR Code
            const channelUrl = 'https://whatsapp.com/channel/0029VaCpFg0ICVfdASZ22l39';
            const qrCodeDataUrl = await QRCode.toDataURL(channelUrl, { color: { dark: PRIMARY_RED, light: '#00000000' } });

            // Add QR Code image
            doc.image(qrCodeDataUrl, 450, footerTop - 20, { width: 80 });

            // Footer Text
            doc.fontSize(10).font('Helvetica-Bold').fillColor(DARK_BLACK);
            doc.text('Follow our Channel', 450, footerTop + 65, { align: 'center', width: 80 });

            // Social Links (Left side of footer)
            doc.fontSize(10).font('Helvetica').fillColor(TEXT_GRAY);
            doc.text('Thank you for choosing AfroGazette.', 50, footerTop);
            doc.text('For inquiries, contact us at:', 50, footerTop + 15);
            doc.fillColor(PRIMARY_RED).text('+263 77 123 4567', 50, footerTop + 30);

            // Bottom Bar
            doc.rect(0, 750, doc.page.width, 20).fill(DARK_BLACK);
            doc.fillColor('#FFFFFF').fontSize(8).text('www.afrogazette.co.zw', 0, 755, { align: 'center' });

            doc.end();

            stream.on('finish', () => resolve(filePath));
            stream.on('error', (err) => reject(err));
        } catch (error) {
            reject(error);
        }
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

        const invoicesDir = path.join(__dirname, '../../public/invoices');
        if (!fs.existsSync(invoicesDir)) {
            fs.mkdirSync(invoicesDir, { recursive: true });
        }

        const fileName = `invoice-${invoice.invoice_number}.pdf`;
        const filePath = path.join(invoicesDir, fileName);

        // Fetch extra details for the PDF
        const detailsResult = await pool.query(`
      SELECT i.*, a.category, a.caption, a.days_paid, a.advert_type, u.full_name as sales_rep_name,
             c.company as client_company
      FROM invoices i
      JOIN adverts a ON i.advert_id = a.id
      JOIN users u ON i.sales_rep_id = u.id
      LEFT JOIN clients c ON a.client_id = c.id
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
    generateInvoicePDF
};
