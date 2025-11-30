const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const pool = require('../config/database');
const QRCode = require('qrcode');

/**
 * Enterprise-Grade Invoice PDF Generator
 * Optimized for single-page layout with premium branding
 */
const generateInvoicePDF = async (invoiceData, filePath) => {
    return new Promise(async (resolve, reject) => {
        try {
            const doc = new PDFDocument({
                margin: 40,
                size: 'A4',
                bufferPages: true
            });
            const stream = fs.createWriteStream(filePath);

            doc.pipe(stream);

            // --- BRAND COLORS ---
            const BRAND_RED = '#E63946';
            const BRAND_BLACK = '#1A1A1A';
            const LIGHT_GRAY = '#F5F5F5';
            const MEDIUM_GRAY = '#666666';
            const BORDER_GRAY = '#E0E0E0';

            const pageWidth = doc.page.width;
            const pageHeight = doc.page.height;

            // --- TOP RED ACCENT BAR ---
            doc.rect(0, 0, pageWidth, 6).fill(BRAND_RED);

            // --- HEADER SECTION (Compact) ---
            const headerTop = 20;

            // Logo (left side) - smaller
            const logoPath = path.join(__dirname, '../../public/images/logo.png');
            if (fs.existsSync(logoPath)) {
                doc.image(logoPath, 40, headerTop, { width: 120 });
            } else {
                // Fallback text logo
                doc.font('Helvetica-Bold').fontSize(24);
                doc.fillColor(BRAND_RED).text('afro', 40, headerTop, { continued: true });
                doc.fillColor(BRAND_BLACK).text('gazette');
            }

            // Company Details (right side) - compact
            doc.font('Helvetica').fontSize(8).fillColor(MEDIUM_GRAY);
            const rightX = pageWidth - 200;
            let yPos = headerTop;

            doc.text('AfroGazette', rightX, yPos, { width: 160, align: 'right' });
            yPos += 10;
            doc.text('Office 4, Karimapondo Building', rightX, yPos, { width: 160, align: 'right' });
            yPos += 10;
            doc.text('78 Leopold Takawira, Harare, Zimbabwe', rightX, yPos, { width: 160, align: 'right' });
            yPos += 10;
            doc.text('support@afrogazette.co.zw | +263 77 8826661', rightX, yPos, { width: 160, align: 'right' });

            // --- INVOICE TITLE & METADATA BOX (Compact) ---
            const metaBoxTop = 90;

            // Invoice Title
            doc.font('Helvetica-Bold').fontSize(24).fillColor(BRAND_BLACK);
            doc.text('INVOICE', 40, metaBoxTop);

            // Metadata Box (right side) - smaller
            const metaBoxX = pageWidth - 200;
            const metaBoxWidth = 160;
            const metaBoxHeight = 100;

            doc.roundedRect(metaBoxX, metaBoxTop, metaBoxWidth, metaBoxHeight, 3)
                .lineWidth(1)
                .strokeColor(BORDER_GRAY)
                .stroke();

            // Metadata content - compact
            doc.font('Helvetica').fontSize(8).fillColor(MEDIUM_GRAY);
            let metaY = metaBoxTop + 10;

            doc.text('Invoice #:', metaBoxX + 10, metaY);
            doc.font('Helvetica-Bold').fontSize(9).fillColor(BRAND_BLACK).text(invoiceData.invoice_number, metaBoxX + 10, metaY + 10);
            metaY += 25;

            doc.font('Helvetica').fontSize(8).fillColor(MEDIUM_GRAY).text('Date:', metaBoxX + 10, metaY);
            doc.font('Helvetica-Bold').fontSize(9).fillColor(BRAND_BLACK).text(new Date(invoiceData.generated_at).toLocaleDateString('en-US'), metaBoxX + 10, metaY + 10);
            metaY += 25;

            doc.font('Helvetica').fontSize(8).fillColor(MEDIUM_GRAY).text('Currency: USD', metaBoxX + 10, metaY);
            metaY += 15;

            const statusColor = invoiceData.status === 'PAID' ? '#10B981' : BRAND_RED;
            doc.font('Helvetica-Bold').fontSize(9).fillColor(statusColor).text(invoiceData.status, metaBoxX + 10, metaY);

            // --- BILL TO & PREPARED BY SECTION (Side by side, compact) ---
            const billToTop = metaBoxTop + metaBoxHeight + 20;

            // Bill To (Left)
            doc.font('Helvetica-Bold').fontSize(10).fillColor(BRAND_BLACK);
            doc.text('BILL TO', 40, billToTop);
            doc.rect(40, billToTop + 15, 100, 2).fill(BRAND_RED);

            doc.font('Helvetica').fontSize(9).fillColor(BRAND_BLACK);
            doc.text(invoiceData.client_name, 40, billToTop + 22);

            // Prepared By (Right)
            doc.font('Helvetica-Bold').fontSize(10).fillColor(BRAND_BLACK);
            doc.text('PREPARED BY', 250, billToTop);
            doc.rect(250, billToTop + 15, 100, 2).fill(BRAND_RED);

            doc.font('Helvetica').fontSize(9).fillColor(BRAND_BLACK);
            doc.text(invoiceData.sales_rep_name || 'AfroGazette Team', 250, billToTop + 22);

            // --- TABLE SECTION (Compact) ---
            const tableTop = billToTop + 60;
            const tableWidth = pageWidth - 80;

            // Table Header
            doc.rect(40, tableTop, tableWidth, 28).fill(BRAND_BLACK);

            doc.font('Helvetica-Bold').fontSize(8).fillColor('#FFFFFF');
            doc.text('DESCRIPTION', 50, tableTop + 10, { width: 180 });
            doc.text('TYPE', 240, tableTop + 10, { width: 80 });
            doc.text('DURATION', 330, tableTop + 10, { width: 60 });
            doc.text('UNIT PRICE', 400, tableTop + 10, { width: 60, align: 'right' });
            doc.text('TOTAL', pageWidth - 90, tableTop + 10, { width: 50, align: 'right' });

            // Table Row
            const rowTop = tableTop + 32;
            const rowHeight = 35;

            // Alternating row background
            doc.rect(40, rowTop, tableWidth, rowHeight).fill(LIGHT_GRAY);

            doc.font('Helvetica').fontSize(8).fillColor(BRAND_BLACK);

            // Description
            const description = `${invoiceData.caption || 'Advertisement Campaign'}`;
            doc.text(description, 50, rowTop + 12, { width: 180 });

            // Type
            const advertType = (invoiceData.advert_type || 'text_ad').replace(/_/g, ' ');
            const formattedType = advertType.charAt(0).toUpperCase() + advertType.slice(1);
            doc.text(formattedType, 240, rowTop + 12, { width: 80 });

            // Duration
            doc.text(`${invoiceData.days_paid} Days`, 330, rowTop + 12, { width: 60 });

            // Unit Price
            doc.text(`$${Number(invoiceData.amount).toFixed(2)}`, 400, rowTop + 12, { width: 60, align: 'right' });

            // Total
            doc.font('Helvetica-Bold');
            doc.text(`$${Number(invoiceData.amount).toFixed(2)}`, pageWidth - 90, rowTop + 12, { width: 50, align: 'right' });

            // Table border
            doc.rect(40, tableTop, tableWidth, rowHeight + 32).strokeColor(BORDER_GRAY).stroke();

            // --- PAYMENT METHOD (Compact) ---
            const paymentTop = rowTop + rowHeight + 12;
            doc.font('Helvetica').fontSize(8).fillColor(MEDIUM_GRAY);
            doc.text('Payment Method:', 50, paymentTop);
            doc.font('Helvetica-Bold').fillColor(BRAND_BLACK);
            const paymentMethod = (invoiceData.payment_method || 'cash').replace(/_/g, ' ');
            const formattedPayment = paymentMethod.charAt(0).toUpperCase() + paymentMethod.slice(1);
            doc.text(formattedPayment, 130, paymentTop);

            // --- TOTALS SECTION (Compact) ---
            const totalsTop = paymentTop + 25;
            const totalsX = pageWidth - 200;

            // Subtotal
            doc.font('Helvetica').fontSize(9).fillColor(MEDIUM_GRAY);
            doc.text('Subtotal:', totalsX, totalsTop);
            doc.font('Helvetica-Bold').fillColor(BRAND_BLACK);
            doc.text(`$${Number(invoiceData.amount).toFixed(2)}`, totalsX + 80, totalsTop, { width: 80, align: 'right' });

            // Final Total Box (Reduced height)
            const totalBoxTop = totalsTop + 20;
            doc.roundedRect(totalsX, totalBoxTop, 160, 32, 3).fill(BRAND_RED);

            doc.font('Helvetica-Bold').fontSize(12).fillColor('#FFFFFF');
            doc.text('TOTAL', totalsX + 15, totalBoxTop + 10);
            doc.fontSize(14);
            doc.text(`$${Number(invoiceData.amount).toFixed(2)}`, totalsX + 80, totalBoxTop + 8, { width: 65, align: 'right' });

            // --- COMPACT FOOTER WITH QR & SOCIAL (Single Row) ---
            const footerTop = pageHeight - 140;

            // QR Code (smaller)
            const channelUrl = 'https://whatsapp.com/channel/0029VaCpFg0ICVfdASZ22l39';
            const qrCodeDataUrl = await QRCode.toDataURL(channelUrl, {
                color: { dark: '#000000', light: '#FFFFFF' },
                width: 80,
                margin: 1
            });

            doc.image(qrCodeDataUrl, 40, footerTop, { width: 60 });
            doc.font('Helvetica').fontSize(7).fillColor(MEDIUM_GRAY);
            doc.text('Scan to Follow Us', 40, footerTop + 65, { width: 60, align: 'center' });

            // Social Media Links (Compact, in one row)
            doc.font('Helvetica-Bold').fontSize(9).fillColor(BRAND_BLACK);
            doc.text('Connect With Us', 120, footerTop);

            doc.font('Helvetica').fontSize(7).fillColor(MEDIUM_GRAY);
            const socialY = footerTop + 15;

            // Two columns of social links
            doc.text('📱 WhatsApp: +263 77 8826661', 120, socialY);
            doc.text('📘 Facebook: @AfroGazette', 120, socialY + 12);
            doc.text('📷 Instagram: @afrogazette', 120, socialY + 24);

            doc.text('🎵 TikTok: @afrogazette', 300, socialY);
            doc.text('▶️ YouTube: AfroGazette', 300, socialY + 12);
            doc.text('🌐 www.afrogazette.co.zw', 300, socialY + 24);

            // --- BRANDED FOOTER STRIP (Compact) ---
            const bottomStripTop = pageHeight - 40;
            doc.rect(0, bottomStripTop, pageWidth, 40).fill(BRAND_BLACK);

            doc.font('Helvetica').fontSize(7).fillColor('#FFFFFF');
            doc.text('Powered by AfroGazette Enterprise', 0, bottomStripTop + 10, { width: pageWidth, align: 'center' });

            doc.fontSize(6).fillColor('#999999');
            const currentYear = new Date().getFullYear();
            doc.text(`Copyright © ${currentYear} AfroGazette. All rights reserved. | Registration Number: 42277A0252025`, 0, bottomStripTop + 22, { width: pageWidth, align: 'center' });

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
      SELECT i.*, a.category, a.caption, a.days_paid, a.advert_type, a.payment_method,
             u.full_name as sales_rep_name, c.company as client_company
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
