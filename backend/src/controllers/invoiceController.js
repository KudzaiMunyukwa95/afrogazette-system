const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const pool = require('../config/database');
const QRCode = require('qrcode');
const SVGtoPDF = require('svg-to-pdfkit');

/**
 * Enterprise-Grade Invoice PDF Generator - Premium Edition
 * Optimized for single-page layout with refined spacing, typography, and design
 */
const generateInvoicePDF = async (invoiceData, filePath) => {
    return new Promise(async (resolve, reject) => {
        try {
            const doc = new PDFDocument({
                margin: 0,
                size: 'A4',
                bufferPages: true,
                autoFirstPage: true
            });
            const stream = fs.createWriteStream(filePath);

            doc.pipe(stream);

            // --- PREMIUM BRAND COLORS ---
            const BRAND_RED = '#E53939';
            const BRAND_BLACK = '#000000';
            const TABLE_BLACK = '#111111'; // Softer black for table
            const TEXT_DARK = '#111827';
            const TEXT_GRAY = '#6B7280';
            const TEXT_MEDIUM = '#4B5563';
            const BORDER_COLOR = '#E5E7EB';
            const WHITE = '#FFFFFF';

            const pageWidth = doc.page.width;
            const pageHeight = doc.page.height;
            const marginX = 40;

            // --- REFINED HEADER (80px height) ---
            const headerHeight = 80;
            doc.rect(0, 0, pageWidth, headerHeight).fill(BRAND_BLACK);

            // Logo Rendering (SVG first, PNG fallback, Text last)
            const logoSvgPath = path.join(__dirname, '../../../frontend/public/logo.svg');
            const logoPngPath = path.join(__dirname, '../../../frontend/public/logo.png');
            let logoRendered = false;

            if (fs.existsSync(logoSvgPath)) {
                try {
                    let svgContent = fs.readFileSync(logoSvgPath, 'utf8');
                    // Remove image tags from SVG to prevent errors
                    svgContent = svgContent.replace(/<image[^>]*>/g, '');
                    SVGtoPDF(doc, svgContent, marginX, 20, {
                        width: 150,
                        height: 40,
                        preserveAspectRatio: 'xMinYMid meet'
                    });
                    logoRendered = true;
                } catch (err) {
                    console.error('SVG logo error:', err);
                }
            }

            if (!logoRendered && fs.existsSync(logoPngPath)) {
                try {
                    doc.image(logoPngPath, marginX, 20, { width: 150 });
                    logoRendered = true;
                } catch (err) {
                    console.error('PNG logo error:', err);
                }
            }

            if (!logoRendered) {
                doc.font('Helvetica-Bold').fontSize(24).fillColor(BRAND_RED).text('afro', marginX, 28, { continued: true });
                doc.fillColor(WHITE).text('gazette');
            }

            // Company Details (Vertically centered, tighter spacing)
            doc.font('Helvetica').fontSize(9).fillColor(WHITE);
            let headerY = 22;
            doc.text('AfroGazette', marginX, headerY, { align: 'right', width: pageWidth - 2 * marginX });
            headerY += 12;
            doc.text('Office 4, Karimapondo Building', marginX, headerY, { align: 'right', width: pageWidth - 2 * marginX });
            headerY += 12;
            doc.text('78 Leopold Takawira, Harare, Zimbabwe', marginX, headerY, { align: 'right', width: pageWidth - 2 * marginX });
            headerY += 12;
            doc.text('support@afrogazette.co.zw | +263 77 8826661', marginX, headerY, { align: 'right', width: pageWidth - 2 * marginX });

            // --- INVOICE TITLE & METADATA (Increased spacing) ---
            const contentTop = headerHeight + 50;
            doc.font('Helvetica-Bold').fontSize(28).fillColor(TEXT_DARK);
            doc.text('INVOICE', marginX, contentTop);

            // Metadata Box (aligned with title baseline)
            const metaX = pageWidth - 220;
            const metaY = contentTop + 4;
            doc.font('Helvetica').fontSize(9).fillColor(TEXT_GRAY);
            doc.text('Invoice #:', metaX, metaY);
            doc.font('Helvetica-Bold').fontSize(9).fillColor(TEXT_DARK).text(invoiceData.invoice_number, metaX + 60, metaY, { align: 'right', width: 120 });

            doc.font('Helvetica').fontSize(9).fillColor(TEXT_GRAY).text('Date:', metaX, metaY + 16);
            doc.font('Helvetica-Bold').fontSize(9).fillColor(TEXT_DARK).text(new Date(invoiceData.generated_at).toLocaleDateString(), metaX + 60, metaY + 16, { align: 'right', width: 120 });

            doc.font('Helvetica').fontSize(9).fillColor(TEXT_GRAY).text('Status:', metaX, metaY + 32);
            doc.font('Helvetica-Bold').fontSize(9).fillColor(BRAND_RED).text(invoiceData.status.toUpperCase(), metaX + 60, metaY + 32, { align: 'right', width: 120 });

            // --- BILL TO & FROM (Grid Layout) ---
            const sectionY = contentTop + 60;
            const colWidth = (pageWidth - 2 * marginX) / 2;

            // Bill To
            doc.font('Helvetica-Bold').fontSize(10).fillColor(TEXT_GRAY).text('BILL TO', marginX, sectionY);
            doc.rect(marginX, sectionY + 14, 30, 2).fill(BRAND_RED);

            doc.font('Helvetica-Bold').fontSize(12).fillColor(TEXT_DARK).text(invoiceData.client_name, marginX, sectionY + 24);
            if (invoiceData.client_company) {
                doc.font('Helvetica').fontSize(10).fillColor(TEXT_MEDIUM).text(invoiceData.client_company, marginX, sectionY + 40);
            }

            // Sales Rep (From)
            doc.font('Helvetica-Bold').fontSize(10).fillColor(TEXT_GRAY).text('ISSUED BY', marginX + colWidth, sectionY);
            doc.rect(marginX + colWidth, sectionY + 14, 30, 2).fill(BRAND_RED);

            doc.font('Helvetica-Bold').fontSize(12).fillColor(TEXT_DARK).text(invoiceData.sales_rep_name, marginX + colWidth, sectionY + 24);
            doc.font('Helvetica').fontSize(10).fillColor(TEXT_MEDIUM).text('Sales Representative', marginX + colWidth, sectionY + 40);

            // --- TABLE (Clean, Modern) ---
            const tableTop = sectionY + 80;
            const tableHeaderHeight = 30;

            // Table Header Background
            doc.rect(marginX, tableTop, pageWidth - 2 * marginX, tableHeaderHeight).fill('#F3F4F6');

            // Table Header Text
            const col1 = marginX + 10;
            const col2 = marginX + 200;
            const col3 = marginX + 300;
            const col4 = pageWidth - marginX - 10; // Right aligned

            doc.font('Helvetica-Bold').fontSize(9).fillColor(TEXT_DARK);
            doc.text('DESCRIPTION', col1, tableTop + 10);
            doc.text('CATEGORY', col2, tableTop + 10);
            doc.text('DURATION', col3, tableTop + 10);
            doc.text('AMOUNT', col4 - 50, tableTop + 10, { align: 'right', width: 50 });

            // Table Row
            const rowY = tableTop + tableHeaderHeight + 10;
            doc.font('Helvetica').fontSize(10).fillColor(TABLE_BLACK);

            // Description (Truncate if too long)
            const caption = invoiceData.caption.length > 60 ? invoiceData.caption.substring(0, 60) + '...' : invoiceData.caption;
            doc.text(caption, col1, rowY);

            // Category
            doc.text(invoiceData.category.replace(/_/g, ' ').toUpperCase(), col2, rowY);

            // Duration
            doc.text(`${invoiceData.days_paid} Days`, col3, rowY);

            // Amount
            doc.font('Helvetica-Bold').text(`$${Number(invoiceData.amount).toFixed(2)}`, col4 - 80, rowY, { align: 'right', width: 80 });

            // Line under row
            doc.moveTo(marginX, rowY + 20).lineTo(pageWidth - marginX, rowY + 20).strokeColor(BORDER_COLOR).stroke();

            // --- TOTALS SECTION (Right Aligned) ---
            const totalsY = rowY + 40;
            const totalsWidth = 200;
            const totalsX = pageWidth - marginX - totalsWidth;

            // Subtotal
            doc.font('Helvetica').fontSize(10).fillColor(TEXT_GRAY).text('Subtotal', totalsX, totalsY);
            doc.font('Helvetica-Bold').fontSize(10).fillColor(TEXT_DARK).text(`$${Number(invoiceData.amount).toFixed(2)}`, pageWidth - marginX - 80, totalsY, { align: 'right', width: 80 });

            // Commission
            doc.font('Helvetica').fontSize(10).fillColor(TEXT_GRAY).text('Commission (10%)', totalsX, totalsY + 20);
            doc.font('Helvetica-Bold').fontSize(10).fillColor(TEXT_DARK).text(`$${Number(invoiceData.commission_amount).toFixed(2)}`, pageWidth - marginX - 80, totalsY + 20, { align: 'right', width: 80 });

            // Total Box
            const totalBoxY = totalsY + 45;
            doc.rect(totalsX - 10, totalBoxY, totalsWidth + 10, 40).fill(BRAND_RED);
            doc.font('Helvetica-Bold').fontSize(12).fillColor(WHITE).text('TOTAL DUE', totalsX, totalBoxY + 12);
            doc.font('Helvetica-Bold').fontSize(16).fillColor(WHITE).text(`$${Number(invoiceData.amount).toFixed(2)}`, pageWidth - marginX - 100, totalBoxY + 10, { align: 'right', width: 100 });

            // --- FOOTER (Fixed at bottom) ---
            const footerHeight = 130;
            const footerY = pageHeight - footerHeight;

            // QR Code (Sharp, High Res)
            const qrCodeData = `INV:${invoiceData.invoice_number}|AMT:${invoiceData.amount}|DATE:${new Date(invoiceData.generated_at).toISOString().split('T')[0]}`;
            const qrCodeDataUrl = await QRCode.toDataURL(qrCodeData, { margin: 1, width: 150 });
            doc.image(qrCodeDataUrl, marginX, footerY + 10, { width: 80, height: 80 });

            // Social Icons
            // Social Icons Removed - Text Only
            const socialX = marginX + 100;
            doc.font('Helvetica-Bold').fontSize(9).fillColor(TEXT_DARK);
            doc.text('Connect With Us', socialX, footerY);
            doc.font('Helvetica').fontSize(8).text('www.afrogazette.co.zw', socialX, footerY + 15);
            doc.text('+263 77 8826661', socialX, footerY + 30);

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
