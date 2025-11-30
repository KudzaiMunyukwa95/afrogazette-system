const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const pool = require('../config/database');
const QRCode = require('qrcode');
const SVGtoPDF = require('svg-to-pdfkit');

/**
 * Enterprise-Grade Invoice PDF Generator
 * Optimized for single-page layout with premium branding and SVG support
 */
const generateInvoicePDF = async (invoiceData, filePath) => {
    return new Promise(async (resolve, reject) => {
        try {
            const doc = new PDFDocument({
                margin: 0, // We handle margins manually for full control
                size: 'A4',
                bufferPages: true,
                autoFirstPage: true
            });
            const stream = fs.createWriteStream(filePath);

            doc.pipe(stream);

            // --- BRAND COLORS ---
            const BRAND_RED = '#E63946';
            const BRAND_BLACK = '#000000'; // Pure black as requested
            const TEXT_DARK = '#111827';
            const TEXT_GRAY = '#6B7280';
            const BORDER_COLOR = '#E5E7EB';
            const WHITE = '#FFFFFF';

            const pageWidth = doc.page.width;
            const pageHeight = doc.page.height;
            const marginX = 40;

            // --- HEADER SECTION (Black Strip) ---
            const headerHeight = 100;
            doc.rect(0, 0, pageWidth, headerHeight).fill(BRAND_BLACK);

            // Render SVG Logo
            const logoPath = path.join(__dirname, '../../public/logo.svg'); // Assuming frontend/public is mapped or copied

            // Company Details (Right-aligned, White)
            doc.font('Helvetica').fontSize(9).fillColor(WHITE);
            const rightX = pageWidth - marginX;
            let headerY = 30;

            doc.text('AfroGazette', marginX, headerY, { align: 'right', width: pageWidth - 2 * marginX });
            headerY += 14;
            doc.text('Office 4, Karimapondo Building', marginX, headerY, { align: 'right', width: pageWidth - 2 * marginX });
            headerY += 14;
            doc.text('78 Leopold Takawira, Harare, Zimbabwe', marginX, headerY, { align: 'right', width: pageWidth - 2 * marginX });
            headerY += 14;
            doc.text('support@afrogazette.co.zw | +263 77 8826661', marginX, headerY, { align: 'right', width: pageWidth - 2 * marginX });

            // --- INVOICE TITLE & METADATA ---
            const contentTop = headerHeight + 40;

            doc.font('Helvetica-Bold').fontSize(28).fillColor(TEXT_DARK);
            doc.text('INVOICE', marginX, contentTop);

            // Metadata Box
            const metaX = pageWidth - 220;
            const metaY = contentTop;

            doc.font('Helvetica').fontSize(9).fillColor(TEXT_GRAY);
            doc.text('Invoice #:', metaX, metaY);
            doc.font('Helvetica-Bold').fillColor(TEXT_DARK).text(invoiceData.invoice_number, metaX + 60, metaY, { align: 'right', width: 120 });

            doc.font('Helvetica').fillColor(TEXT_GRAY).text('Date:', metaX, metaY + 18);
            doc.font('Helvetica-Bold').fillColor(TEXT_DARK).text(new Date(invoiceData.generated_at).toLocaleDateString('en-US'), metaX + 60, metaY + 18, { align: 'right', width: 120 });

            doc.font('Helvetica').fillColor(TEXT_GRAY).text('Status:', metaX, metaY + 36);
            const statusColor = invoiceData.status === 'PAID' ? '#10B981' : BRAND_RED;
            doc.font('Helvetica-Bold').fillColor(statusColor).text(invoiceData.status, metaX + 60, metaY + 36, { align: 'right', width: 120 });

            // --- BILL TO & PREPARED BY ---
            const billToY = contentTop + 80;

            // Bill To
            doc.font('Helvetica-Bold').fontSize(10).fillColor(TEXT_GRAY).text('BILL TO', marginX, billToY);
            doc.rect(marginX, billToY + 15, 40, 2).fill(BRAND_RED);

            doc.font('Helvetica-Bold').fontSize(11).fillColor(TEXT_DARK).text(invoiceData.client_name, marginX, billToY + 25);
            if (invoiceData.client_company) {
                doc.font('Helvetica').fontSize(10).fillColor(TEXT_GRAY).text(invoiceData.client_company, marginX, billToY + 40);
            }

            // Prepared By
            const prepX = pageWidth / 2;
            doc.font('Helvetica-Bold').fontSize(10).fillColor(TEXT_GRAY).text('PREPARED BY', prepX, billToY);
            doc.rect(prepX, billToY + 15, 40, 2).fill(BRAND_RED);

            doc.font('Helvetica-Bold').fontSize(11).fillColor(TEXT_DARK).text(invoiceData.sales_rep_name || 'AfroGazette Team', prepX, billToY + 25);

            // --- TABLE ---
            const tableTop = billToY + 80;
            const tableWidth = pageWidth - 2 * marginX;

            // Header
            doc.rect(marginX, tableTop, tableWidth, 30).fill(BRAND_BLACK);
            doc.font('Helvetica-Bold').fontSize(9).fillColor(WHITE);

            const col1 = marginX + 15;
            const col2 = marginX + 220;
            const col3 = marginX + 300;
            const col4 = marginX + 380;
            const col5 = pageWidth - marginX - 15;

            doc.text('DESCRIPTION', col1, tableTop + 10);
            doc.text('TYPE', col2, tableTop + 10);
            doc.text('DURATION', col3, tableTop + 10);
            doc.text('UNIT PRICE', col4, tableTop + 10, { align: 'right', width: 60 });
            doc.text('TOTAL', col5 - 60, tableTop + 10, { align: 'right', width: 60 });

            // Row
            const rowY = tableTop + 30;
            const rowHeight = 40;

            doc.font('Helvetica').fontSize(9).fillColor(TEXT_DARK);

            // Description
            doc.text(invoiceData.caption || 'Advertisement Campaign', col1, rowY + 14, { width: 200 });

            // Type
            const advertType = (invoiceData.advert_type || 'text_ad').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            doc.text(advertType, col2, rowY + 14);

            // Duration
            doc.text(`${invoiceData.days_paid} Days`, col3, rowY + 14);

            // Unit Price
            doc.text(`$${Number(invoiceData.amount).toFixed(2)}`, col4, rowY + 14, { align: 'right', width: 60 });

            // Total
            doc.font('Helvetica-Bold');
            doc.text(`$${Number(invoiceData.amount).toFixed(2)}`, col5 - 60, rowY + 14, { align: 'right', width: 60 });

            // Bottom border
            doc.moveTo(marginX, rowY + rowHeight).lineTo(pageWidth - marginX, rowY + rowHeight).strokeColor(BORDER_COLOR).stroke();

            // Payment Method
            doc.font('Helvetica').fontSize(9).fillColor(TEXT_GRAY);
            doc.text('Payment Method:', marginX, rowY + rowHeight + 15);
            doc.font('Helvetica-Bold').fillColor(TEXT_DARK);
            const paymentMethod = (invoiceData.payment_method || 'cash').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            doc.text(paymentMethod, marginX + 85, rowY + rowHeight + 15);

            // --- TOTALS ---
            const totalsY = rowY + rowHeight + 40;
            const totalsWidth = 200;
            const totalsX = pageWidth - marginX - totalsWidth;

            // Subtotal
            doc.font('Helvetica').fontSize(10).fillColor(TEXT_GRAY);
            doc.text('Subtotal', totalsX, totalsY);
            doc.font('Helvetica-Bold').fillColor(TEXT_DARK);
            doc.text(`$${Number(invoiceData.amount).toFixed(2)}`, pageWidth - marginX - 80, totalsY, { align: 'right', width: 80 });

            // Total Bar
            const totalBarY = totalsY + 25;
            doc.rect(totalsX, totalBarY, totalsWidth, 40).fill(BRAND_RED);

            doc.font('Helvetica-Bold').fontSize(12).fillColor(WHITE);
            doc.text('TOTAL', totalsX + 15, totalBarY + 13);
            doc.fontSize(14);
            doc.text(`$${Number(invoiceData.amount).toFixed(2)}`, pageWidth - marginX - 100, totalBarY + 12, { align: 'right', width: 85 });

            // --- FOOTER (Single Row, Fixed Icons) ---
            const footerHeight = 80;
            const footerY = pageHeight - footerHeight - 20;

            // QR Code
            const channelUrl = 'https://whatsapp.com/channel/0029VaCpFg0ICVfdASZ22l39';
            const qrCodeDataUrl = await QRCode.toDataURL(channelUrl, {
                color: { dark: '#000000', light: '#FFFFFF' },
                width: 70,
                margin: 0
            });
            doc.image(qrCodeDataUrl, marginX, footerY, { width: 60 });
            doc.font('Helvetica').fontSize(7).fillColor(TEXT_GRAY);
            doc.text('Scan to Follow Us', marginX, footerY + 65, { width: 60, align: 'center' });

            // Social Icons Helper
            const drawIcon = (pathStr, x, y, scale = 0.7) => {
                try {
                    if (isNaN(x) || isNaN(y)) {
                        console.error('Invalid coordinates for icon:', { x, y });
                        return;
                    }
                    doc.save();
                    doc.translate(x, y);
                    doc.scale(scale);
                    doc.path(pathStr).fill(BRAND_BLACK);
                    doc.restore();
                } catch (err) {
                    console.error('Error drawing icon:', err);
                }
            };

            const iconY = footerY + 20;
            const colWidth = 140;
            const rowGap = 18;
            const socialX = marginX + 100;

            doc.font('Helvetica').fontSize(8).fillColor(TEXT_DARK);
            doc.text('Connect With Us', socialX, footerY);

            // Column 1
            // WhatsApp
            drawIcon('M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z', socialX, iconY);
            doc.text('+263 77 8826661', socialX + 20, iconY + 4);

            // Facebook
            drawIcon('M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z', socialX, iconY + rowGap);
            doc.text('@AfroGazette', socialX + 20, iconY + rowGap + 4);

            // Instagram
            drawIcon('M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z', socialX, iconY + rowGap * 2);
            doc.text('@afrogazette', socialX + 20, iconY + rowGap * 2 + 4);

            // Column 2
            const col2X = socialX + colWidth;

            // TikTok
            drawIcon('M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z', col2X, iconY);
            doc.text('@afrogazette', col2X + 20, iconY + 4);

            // YouTube
            drawIcon('M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z', col2X, iconY + rowGap);
            doc.text('AfroGazette', col2X + 20, iconY + rowGap + 4);

            // Website
            drawIcon('M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S16.627 0 12 0zm-1 21.407A10.008 10.008 0 012.603 13H6.2c.162 3.256 1.458 6.22 3.8 8.407zM6.2 11H2.603A10.008 10.008 0 0111 2.593V11H6.2zm6.8 10.407c2.342-2.187 3.638-5.151 3.8-8.407h3.597A10.008 10.008 0 0113 21.407zM13 11V2.593A10.008 10.008 0 0121.397 11H13z', col2X, iconY + rowGap * 2);
            doc.text('www.afrogazette.co.zw', col2X + 20, iconY + rowGap * 2 + 4);

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
