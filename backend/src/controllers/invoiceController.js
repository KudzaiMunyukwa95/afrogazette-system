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

            // Render Logo (Prioritize SVG for quality, then PNG, then Text)
            const logoSvgPath = path.join(__dirname, '../../../frontend/public/logo.svg');
            const logoPngPath = path.join(__dirname, '../../../frontend/public/logo.png');

            let logoRendered = false;

            // Try SVG first for best quality
            if (fs.existsSync(logoSvgPath)) {
                try {
                    let svgContent = fs.readFileSync(logoSvgPath, 'utf8');
                    // Remove <image> tags which might reference missing files
                    svgContent = svgContent.replace(/<image[^>]*>/g, '');

                    SVGtoPDF(doc, svgContent, marginX, 25, {
                        width: 150,
                        height: 50,
                        preserveAspectRatio: 'xMinYMid meet'
                    });
                    logoRendered = true;
                } catch (err) {
                    console.error('Error rendering SVG logo:', err);
                }
            }

            // Fallback to PNG if SVG fails
            if (!logoRendered && fs.existsSync(logoPngPath)) {
                try {
                    doc.image(logoPngPath, marginX, 25, { width: 150 });
                    logoRendered = true;
                } catch (err) {
                    console.error('Error rendering PNG logo:', err);
                }
            }

            // Final fallback to text
            if (!logoRendered) {
                doc.font('Helvetica-Bold').fontSize(24).fillColor(BRAND_RED).text('afro', marginX, 35, { continued: true });
                doc.fillColor(WHITE).text('gazette');
            }

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
            // WhatsApp (Standard Path)
            drawIcon('M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2m.01 1.67c2.2 0 4.26.86 5.82 2.42a8.225 8.225 0 0 1 2.41 5.83c0 4.54-3.7 8.23-8.24 8.23-1.48 0-2.93-.39-4.19-1.15l-.3-.18-3.12.82.83-3.04-.19-.31a8.19 8.19 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24M8.53 7.33c-.19-.43-.43-.43-.63-.44-.18 0-.38 0-.58 0-.2 0-.52.08-.79.38-.27.29-1.04 1.01-1.04 2.47s1.06 2.86 1.21 3.07c.15.21 2.09 3.2 5.06 4.49.71.31 1.26.49 1.69.63.72.23 1.37.19 1.88.11.58-.09 1.76-.72 2.01-1.42.25-.7.25-1.29.17-1.42-.08-.14-.28-.21-.58-.36-.3-.15-1.76-.87-2.03-1.01-.27-.13-.46-.19-.66.14-.2.32-.77.97-.94 1.17-.17.2-.34.23-.64.08-.3-.15-1.26-.46-2.4-1.47-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.29-.34.44-.51.15-.17.2-.29.3-.49.1-.19.05-.36-.02-.51-.08-.15-.7-1.69-.96-2.31Z', socialX, iconY);
            doc.text('+263 77 8826661', socialX + 20, iconY + 4);

            // Facebook (Standard Path)
            drawIcon('M12 2.04c-5.5 0-10 4.49-10 10.02 0 5 3.66 9.15 8.44 9.9v-7H7.9v-2.9h2.54V9.85c0-2.51 1.49-3.89 3.78-3.89 1.09 0 2.23.19 2.23.19v2.47h-1.26c-1.24 0-1.63.77-1.63 1.56v1.88h2.78l-.45 2.9h-2.33v7a10 10 0 0 0 8.44-9.9c0-5.53-4.5-10.02-10-10.02Z', socialX, iconY + rowGap);
            doc.text('AfroGazette News', socialX + 20, iconY + rowGap + 4);

            // Instagram (Standard Path)
            drawIcon('M7.8 2h8.4C19.4 2 22 4.6 22 7.8v8.4a5.8 5.8 0 0 1-5.8 5.8H7.8C4.6 22 2 19.4 2 16.2V7.8A5.8 5.8 0 0 1 7.8 2m-.2 2A3.6 3.6 0 0 0 4 7.6v8.8C4 18.39 5.61 20 7.6 20h8.8a3.6 3.6 0 0 0 3.6-3.6V7.6C20 5.61 18.39 4 16.4 4H7.6m9.65 1.5a1.25 1.25 0 0 1 1.25 1.25A1.25 1.25 0 0 1 17.25 8 1.25 1.25 0 0 1 16 6.75a1.25 1.25 0 0 1 1.25-1.25M12 7a5 5 0 0 1 5 5 5 5 0 0 1-5 5 5 5 0 0 1-5-5m0 2a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3Z', socialX, iconY + rowGap * 2);
            doc.text('AfroGazette News', socialX + 20, iconY + rowGap * 2 + 4);

            // Column 2
            const col2X = socialX + colWidth;

            // TikTok (Standard Path)
            drawIcon('M12.5 3a.5.5 0 0 0-.5.5v3.5a.5.5 0 0 0 .5.5 4 4 0 0 1 4 4 .5.5 0 0 0 .5.5h3.5a.5.5 0 0 0 .5-.5v-3.5a.5.5 0 0 0-.5-.5 7 7 0 0 0-7-7zM8 13a5 5 0 1 0 5 5V6a.5.5 0 0 0-.5-.5h-3a.5.5 0 0 0-.5.5v7.5A1.5 1.5 0 1 1 8 13z', col2X, iconY);
            doc.text('AfroGazette News', col2X + 20, iconY + 4);

            // YouTube (Standard Path)
            drawIcon('M21.58 7.19a2.7 2.7 0 0 0-1.9-1.9C18 5 12 5 12 5s-6 0-7.68.29a2.7 2.7 0 0 0-1.9 1.9C2 8.87 2 12.38 2 12.38s0 3.51.42 5.19a2.7 2.7 0 0 0 1.9 1.9C6 19.77 12 19.77 12 19.77s6 0 7.68-.29a2.7 2.7 0 0 0 1.9-1.9C22 15.89 22 12.38 22 12.38s0-3.51-.42-5.19zM10 15.5V9.27l6.25 3.12L10 15.5z', col2X, iconY + rowGap);
            doc.text('AfroGazette News', col2X + 20, iconY + rowGap + 4);

            // Website (Standard Path)
            drawIcon('M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8zm0-14a6 6 0 1 0 6 6 6 6 0 0 0-6-6zm0 10a4 4 0 1 1 4-4 4 4 0 0 1-4 4z', col2X, iconY + rowGap * 2);
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
