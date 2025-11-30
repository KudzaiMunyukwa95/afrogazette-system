const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const pool = require('../config/database');
const QRCode = require('qrcode');

/**
 * Enterprise-Grade Invoice PDF Generator
 * Premium layout with AfroGazette branding
 */
const generateInvoicePDF = async (invoiceData, filePath) => {
    return new Promise(async (resolve, reject) => {
        try {
            const doc = new PDFDocument({
                margin: 50,
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
            doc.rect(0, 0, pageWidth, 8).fill(BRAND_RED);

            // --- HEADER SECTION ---
            const headerTop = 30;

            // Logo (left side)
            const logoPath = path.join(__dirname, '../../public/images/logo.png');
            if (fs.existsSync(logoPath)) {
                doc.image(logoPath, 50, headerTop, { width: 150 });
            } else {
                // Fallback text logo
                doc.font('Helvetica-Bold').fontSize(32);
                doc.fillColor(BRAND_RED).text('afro', 50, headerTop, { continued: true });
                doc.fillColor(BRAND_BLACK).text('gazette');
            }

            // Company Details (right side)
            doc.font('Helvetica').fontSize(9).fillColor(MEDIUM_GRAY);
            const rightX = pageWidth - 250;
            let yPos = headerTop;

            doc.text('AfroGazette', rightX, yPos, { width: 200, align: 'right' });
            yPos += 12;
            doc.text('Office 4, Karimapondo Building', rightX, yPos, { width: 200, align: 'right' });
            yPos += 12;
            doc.text('78 Leopold Takawira, Harare, Zimbabwe', rightX, yPos, { width: 200, align: 'right' });
            yPos += 12;
            doc.text('support@afrogazette.co.zw', rightX, yPos, { width: 200, align: 'right' });
            yPos += 12;
            doc.text('+263 77 8826661', rightX, yPos, { width: 200, align: 'right' });
            yPos += 12;
            doc.text('www.afrogazette.co.zw', rightX, yPos, { width: 200, align: 'right' });

            // --- INVOICE TITLE & METADATA BOX ---
            const metaBoxTop = 130;

            // Invoice Title
            doc.font('Helvetica-Bold').fontSize(28).fillColor(BRAND_BLACK);
            doc.text('INVOICE', 50, metaBoxTop);

            // Metadata Box (right side)
            const metaBoxX = pageWidth - 250;
            const metaBoxWidth = 200;
            const metaBoxHeight = 140;

            doc.roundedRect(metaBoxX, metaBoxTop, metaBoxWidth, metaBoxHeight, 3)
                .lineWidth(1)
                .strokeColor(BORDER_GRAY)
                .stroke();

            // Metadata content
            doc.font('Helvetica').fontSize(9).fillColor(MEDIUM_GRAY);
            let metaY = metaBoxTop + 15;

            doc.text('Invoice Number:', metaBoxX + 15, metaY);
            doc.font('Helvetica-Bold').fillColor(BRAND_BLACK).text(invoiceData.invoice_number, metaBoxX + 15, metaY + 12);
            metaY += 35;

            doc.font('Helvetica').fillColor(MEDIUM_GRAY).text('Issue Date:', metaBoxX + 15, metaY);
            doc.font('Helvetica-Bold').fillColor(BRAND_BLACK).text(new Date(invoiceData.generated_at).toLocaleDateString('en-US'), metaBoxX + 15, metaY + 12);
            metaY += 35;

            doc.font('Helvetica').fillColor(MEDIUM_GRAY).text('Currency:', metaBoxX + 15, metaY);
            doc.font('Helvetica-Bold').fillColor(BRAND_BLACK).text('USD', metaBoxX + 15, metaY + 12);
            metaY += 35;

            doc.font('Helvetica').fillColor(MEDIUM_GRAY).text('Status:', metaBoxX + 15, metaY);
            const statusColor = invoiceData.status === 'PAID' ? '#10B981' : BRAND_RED;
            doc.font('Helvetica-Bold').fillColor(statusColor).text(invoiceData.status, metaBoxX + 15, metaY + 12);

            // --- BILL TO SECTION ---
            const billToTop = metaBoxTop + metaBoxHeight + 30;

            doc.font('Helvetica-Bold').fontSize(11).fillColor(BRAND_BLACK);
            doc.text('BILL TO', 50, billToTop);
            doc.rect(50, billToTop + 18, 150, 2).fill(BRAND_RED);

            doc.font('Helvetica').fontSize(10).fillColor(BRAND_BLACK);
            doc.text(invoiceData.client_name, 50, billToTop + 30);

            if (invoiceData.client_company) {
                doc.fontSize(9).fillColor(MEDIUM_GRAY);
                doc.text(invoiceData.client_company, 50, billToTop + 45);
            }

            // Prepared By (right side)
            doc.font('Helvetica-Bold').fontSize(11).fillColor(BRAND_BLACK);
            doc.text('PREPARED BY', metaBoxX, billToTop);
            doc.rect(metaBoxX, billToTop + 18, 150, 2).fill(BRAND_RED);

            doc.font('Helvetica').fontSize(10).fillColor(BRAND_BLACK);
            doc.text(invoiceData.sales_rep_name || 'AfroGazette Team', metaBoxX, billToTop + 30);

            // --- TABLE SECTION ---
            const tableTop = billToTop + 90;
            const tableWidth = pageWidth - 100;

            // Table Header
            doc.rect(50, tableTop, tableWidth, 35).fill(BRAND_BLACK);

            doc.font('Helvetica-Bold').fontSize(9).fillColor('#FFFFFF');
            doc.text('DESCRIPTION', 60, tableTop + 12, { width: 200 });
            doc.text('TYPE', 270, tableTop + 12, { width: 100 });
            doc.text('DURATION', 370, tableTop + 12, { width: 70 });
            doc.text('UNIT PRICE', 440, tableTop + 12, { width: 70, align: 'right' });
            doc.text('TOTAL', pageWidth - 110, tableTop + 12, { width: 60, align: 'right' });

            // Table Row
            const rowTop = tableTop + 45;
            const rowHeight = 50;

            // Alternating row background
            doc.rect(50, rowTop, tableWidth, rowHeight).fill(LIGHT_GRAY);

            doc.font('Helvetica').fontSize(9).fillColor(BRAND_BLACK);

            // Description
            const description = `${invoiceData.caption || 'Advertisement Campaign'}`;
            doc.text(description, 60, rowTop + 15, { width: 200 });

            // Type
            const advertType = (invoiceData.advert_type || 'text_ad').replace(/_/g, ' ');
            const formattedType = advertType.charAt(0).toUpperCase() + advertType.slice(1);
            doc.text(formattedType, 270, rowTop + 15, { width: 100 });

            // Duration
            doc.text(`${invoiceData.days_paid} Days`, 370, rowTop + 15, { width: 70 });

            // Unit Price
            doc.text(`$${Number(invoiceData.amount).toFixed(2)}`, 440, rowTop + 15, { width: 70, align: 'right' });

            // Total
            doc.font('Helvetica-Bold');
            doc.text(`$${Number(invoiceData.amount).toFixed(2)}`, pageWidth - 110, rowTop + 15, { width: 60, align: 'right' });

            // Table border
            doc.rect(50, tableTop, tableWidth, rowHeight + 35).strokeColor(BORDER_GRAY).stroke();

            // --- PAYMENT METHOD ---
            const paymentTop = rowTop + rowHeight + 20;
            doc.font('Helvetica').fontSize(9).fillColor(MEDIUM_GRAY);
            doc.text('Payment Method:', 60, paymentTop);
            doc.font('Helvetica-Bold').fillColor(BRAND_BLACK);
            const paymentMethod = (invoiceData.payment_method || 'cash').replace(/_/g, ' ');
            const formattedPayment = paymentMethod.charAt(0).toUpperCase() + paymentMethod.slice(1);
            doc.text(formattedPayment, 150, paymentTop);

            // --- TOTALS SECTION ---
            const totalsTop = paymentTop + 40;
            const totalsX = pageWidth - 250;

            // Subtotal
            doc.font('Helvetica').fontSize(10).fillColor(MEDIUM_GRAY);
            doc.text('Subtotal:', totalsX, totalsTop);
            doc.font('Helvetica-Bold').fillColor(BRAND_BLACK);
            doc.text(`$${Number(invoiceData.amount).toFixed(2)}`, totalsX + 100, totalsTop, { width: 100, align: 'right' });

            // Final Total Box
            const totalBoxTop = totalsTop + 30;
            doc.roundedRect(totalsX, totalBoxTop, 200, 40, 3).fill(BRAND_RED);

            doc.font('Helvetica-Bold').fontSize(14).fillColor('#FFFFFF');
            doc.text('TOTAL', totalsX + 20, totalBoxTop + 12);
            doc.fontSize(16);
            doc.text(`$${Number(invoiceData.amount).toFixed(2)}`, totalsX + 100, totalBoxTop + 10, { width: 80, align: 'right' });

            // --- QR CODE & SOCIAL MEDIA FOOTER ---
            const footerTop = pageHeight - 180;

            // QR Code
            const channelUrl = 'https://whatsapp.com/channel/0029VaCpFg0ICVfdASZ22l39';
            const qrCodeDataUrl = await QRCode.toDataURL(channelUrl, {
                color: { dark: '#000000', light: '#FFFFFF' },
                width: 100,
                margin: 1
            });

            doc.image(qrCodeDataUrl, 50, footerTop, { width: 80 });
            doc.font('Helvetica').fontSize(8).fillColor(MEDIUM_GRAY);
            doc.text('Scan to Follow Us', 50, footerTop + 85, { width: 80, align: 'center' });

            // Social Media Links
            doc.font('Helvetica-Bold').fontSize(10).fillColor(BRAND_BLACK);
            doc.text('Connect With Us', 180, footerTop);

            doc.font('Helvetica').fontSize(8).fillColor(MEDIUM_GRAY);
            let socialY = footerTop + 20;
            const socialLinks = [
                { icon: '📱', text: 'WhatsApp: +263 77 8826661' },
                { icon: '📘', text: 'Facebook: @AfroGazette' },
                { icon: '📷', text: 'Instagram: @afrogazette' },
                { icon: '🎵', text: 'TikTok: @afrogazette' },
                { icon: '▶️', text: 'YouTube: AfroGazette' },
                { icon: '🌐', text: 'www.afrogazette.co.zw' }
            ];

            socialLinks.forEach(link => {
                doc.text(link.icon, 180, socialY);
                doc.text(link.text, 200, socialY);
                socialY += 12;
            });

            // --- BRANDED FOOTER STRIP ---
            const bottomStripTop = pageHeight - 50;
            doc.rect(0, bottomStripTop, pageWidth, 50).fill(BRAND_BLACK);

            doc.font('Helvetica').fontSize(8).fillColor('#FFFFFF');
            doc.text('Powered by AfroGazette Enterprise', 0, bottomStripTop + 12, { width: pageWidth, align: 'center' });

            doc.fontSize(7).fillColor('#999999');
            const currentYear = new Date().getFullYear();
            doc.text(`Copyright © ${currentYear} AfroGazette. All rights reserved.`, 0, bottomStripTop + 25, { width: pageWidth, align: 'center' });
            doc.text('Registration Number: 42277A0252025', 0, bottomStripTop + 36, { width: pageWidth, align: 'center' });

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
