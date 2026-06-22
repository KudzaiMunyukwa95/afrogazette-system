const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');
const SVGtoPDF = require('svg-to-pdfkit');

const pool = require('../config/database');
const company = require('../config/company');

// ---------- helpers -------------------------------------------------------

const BRAND_RED = '#E53939';
const BRAND_BLACK = '#0F0F10';
const TEXT_DARK = '#111827';
const TEXT_GRAY = '#6B7280';
const TEXT_MEDIUM = '#4B5563';
const BORDER = '#E5E7EB';
const PANEL = '#F9FAFB';
const WHITE = '#FFFFFF';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const formatDate = (value) => {
    if (!value) return '—';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '—';
    return `${String(d.getDate()).padStart(2, '0')} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};

const money = (value) => {
    const n = Number(value || 0);
    return `${company.currency} ${n.toFixed(2)}`;
};

const titleCase = (s) => (s || '')
    .toString()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

const renderLogo = (doc, x, y, maxWidth, maxHeight) => {
    const svgPath = path.join(__dirname, '../assets/logo.svg');
    const pngPath = path.join(__dirname, '../assets/logo.png');

    if (fs.existsSync(svgPath)) {
        try {
            let svg = fs.readFileSync(svgPath, 'utf8').replace(/<image[^>]*>/g, '');
            SVGtoPDF(doc, svg, x, y, {
                width: maxWidth,
                height: maxHeight,
                preserveAspectRatio: 'xMinYMid meet'
            });
            return true;
        } catch (err) {
            console.error('SVG logo render failed:', err.message);
        }
    }
    if (fs.existsSync(pngPath)) {
        try {
            doc.image(pngPath, x, y, { fit: [maxWidth, maxHeight] });
            return true;
        } catch (err) {
            console.error('PNG logo render failed:', err.message);
        }
    }
    // Text fallback
    doc.font('Helvetica-Bold').fontSize(22).fillColor(BRAND_RED).text('afro', x, y + 4, { continued: true });
    doc.fillColor(BRAND_BLACK).text('gazette');
    return false;
};

// ---------- PDF generator -------------------------------------------------

/**
 * Generate the AfroGazette tax invoice / receipt PDF.
 * Single-page A4. All ads in the system are paid, so the document doubles
 * as a fiscal receipt.
 */
const generateInvoicePDF = (invoiceData, filePath) => new Promise(async (resolve, reject) => {
    try {
        const doc = new PDFDocument({ size: 'A4', margin: 0, bufferPages: true });
        const stream = fs.createWriteStream(filePath);
        doc.pipe(stream);

        const pageWidth = doc.page.width;       // 595
        const pageHeight = doc.page.height;     // 842
        const margin = 40;
        const contentWidth = pageWidth - 2 * margin;

        // =========================================================
        // HEADER (black band, logo left, company block right)
        // =========================================================
        const headerHeight = 110;
        doc.rect(0, 0, pageWidth, headerHeight).fill(BRAND_BLACK);

        renderLogo(doc, margin, 28, 160, 50);

        // Company details on the right
        const rightColX = pageWidth / 2;
        const rightColWidth = pageWidth - margin - rightColX;
        doc.font('Helvetica-Bold').fontSize(11).fillColor(WHITE)
            .text(company.legalName, rightColX, 24, { width: rightColWidth, align: 'right' });
        doc.font('Helvetica').fontSize(8.5).fillColor('#D1D5DB');
        let y = 40;
        const headerLines = [
            company.address.line1,
            `${company.address.line2}, ${company.address.city}, ${company.address.country}`,
            `${company.phone}  |  ${company.email}`,
            `TIN: ${company.tin}   |   Reg No: ${company.registrationNumber}`,
            company.vatNumber ? `VAT No: ${company.vatNumber}` : 'Not VAT-registered'
        ];
        headerLines.forEach(line => {
            doc.text(line, rightColX, y, { width: rightColWidth, align: 'right' });
            y += 12;
        });

        // =========================================================
        // DOCUMENT TITLE STRIP
        // =========================================================
        const titleY = headerHeight + 22;
        doc.font('Helvetica-Bold').fontSize(22).fillColor(TEXT_DARK)
            .text('TAX INVOICE / RECEIPT', margin, titleY);

        // Meta box (right side)
        const metaX = pageWidth - margin - 200;
        const metaY = titleY + 4;
        const metaRow = (label, value, dy, valueColor = TEXT_DARK, valueBold = true) => {
            doc.font('Helvetica').fontSize(9).fillColor(TEXT_GRAY)
                .text(label, metaX, metaY + dy, { width: 80 });
            doc.font(valueBold ? 'Helvetica-Bold' : 'Helvetica').fontSize(9).fillColor(valueColor)
                .text(value, metaX + 85, metaY + dy, { width: 115, align: 'right' });
        };
        metaRow('Invoice No', invoiceData.invoice_number || '—', 0);
        metaRow('Issue Date', formatDate(invoiceData.generated_at), 16);
        metaRow('Payment Date', formatDate(invoiceData.payment_date || invoiceData.generated_at), 32);
        metaRow('Status', 'PAID', 48, BRAND_RED, true);

        // =========================================================
        // BILL TO  &  ISSUED BY
        // =========================================================
        const partiesY = titleY + 90;
        const colWidth = (contentWidth - 20) / 2;

        const labelStrip = (x, label) => {
            doc.font('Helvetica-Bold').fontSize(9).fillColor(TEXT_GRAY)
                .text(label, x, partiesY);
            doc.rect(x, partiesY + 13, 28, 2).fill(BRAND_RED);
        };

        labelStrip(margin, 'BILL TO');
        labelStrip(margin + colWidth + 20, 'ISSUED BY');

        // Bill To block
        const billY = partiesY + 22;
        const billLines = [];
        const headlineName = invoiceData.client_company || invoiceData.client_name || 'Client';
        billLines.push({ text: headlineName, font: 'Helvetica-Bold', size: 12, color: TEXT_DARK });
        if (invoiceData.client_company && invoiceData.client_name && invoiceData.client_name !== invoiceData.client_company) {
            billLines.push({ text: `Attn: ${invoiceData.client_name}`, font: 'Helvetica', size: 10, color: TEXT_MEDIUM });
        }
        if (invoiceData.client_contact_person) {
            billLines.push({ text: `Contact: ${invoiceData.client_contact_person}`, font: 'Helvetica', size: 9.5, color: TEXT_MEDIUM });
        }
        if (invoiceData.client_address_line1) billLines.push({ text: invoiceData.client_address_line1, font: 'Helvetica', size: 9.5, color: TEXT_MEDIUM });
        if (invoiceData.client_address_line2) billLines.push({ text: invoiceData.client_address_line2, font: 'Helvetica', size: 9.5, color: TEXT_MEDIUM });
        const cityCountry = [invoiceData.client_city, invoiceData.client_country].filter(Boolean).join(', ');
        if (cityCountry) billLines.push({ text: cityCountry, font: 'Helvetica', size: 9.5, color: TEXT_MEDIUM });
        if (invoiceData.client_email) billLines.push({ text: invoiceData.client_email, font: 'Helvetica', size: 9.5, color: TEXT_MEDIUM });
        if (invoiceData.client_phone) billLines.push({ text: invoiceData.client_phone, font: 'Helvetica', size: 9.5, color: TEXT_MEDIUM });
        if (invoiceData.client_tin) billLines.push({ text: `TIN: ${invoiceData.client_tin}`, font: 'Helvetica-Bold', size: 9.5, color: TEXT_DARK });
        if (invoiceData.client_vat_number) billLines.push({ text: `VAT: ${invoiceData.client_vat_number}`, font: 'Helvetica-Bold', size: 9.5, color: TEXT_DARK });

        let by = billY;
        billLines.forEach(line => {
            doc.font(line.font).fontSize(line.size).fillColor(line.color)
                .text(line.text, margin, by, { width: colWidth });
            by += line.size + 3;
        });

        // Issued By block
        const issuedX = margin + colWidth + 20;
        let iy = billY;
        doc.font('Helvetica-Bold').fontSize(12).fillColor(TEXT_DARK)
            .text(company.tradeName, issuedX, iy, { width: colWidth });
        iy += 16;
        doc.font('Helvetica').fontSize(9.5).fillColor(TEXT_MEDIUM)
            .text(`Sales Rep: ${invoiceData.sales_rep_name || '—'}`, issuedX, iy, { width: colWidth });
        iy += 13;
        if (invoiceData.payment_method) {
            doc.text(`Payment Method: ${titleCase(invoiceData.payment_method)}`, issuedX, iy, { width: colWidth });
            iy += 13;
        }
        doc.text(`Currency: ${company.currency}`, issuedX, iy, { width: colWidth });

        // =========================================================
        // LINE-ITEM TABLE
        // =========================================================
        const tableTop = Math.max(by, iy) + 28;
        const colDescX = margin + 10;
        const colCategoryX = margin + 240;
        const colPeriodX = margin + 340;
        const colDaysX = margin + 430;
        const colAmountRightEdge = pageWidth - margin - 10;

        // Header
        doc.rect(margin, tableTop, contentWidth, 26).fill(BRAND_BLACK);
        doc.font('Helvetica-Bold').fontSize(8.5).fillColor(WHITE);
        doc.text('DESCRIPTION', colDescX, tableTop + 9);
        doc.text('CATEGORY', colCategoryX, tableTop + 9);
        doc.text('PERIOD', colPeriodX, tableTop + 9);
        doc.text('DAYS', colDaysX, tableTop + 9);
        doc.text('AMOUNT', colAmountRightEdge - 70, tableTop + 9, { width: 70, align: 'right' });

        // Row
        const rowY = tableTop + 36;
        const descWidth = colCategoryX - colDescX - 10;

        doc.font('Helvetica').fontSize(10).fillColor(TEXT_DARK);
        doc.text(invoiceData.caption || '—', colDescX, rowY, { width: descWidth });
        const descHeight = doc.heightOfString(invoiceData.caption || '—', { width: descWidth });

        doc.fontSize(9.5).fillColor(TEXT_MEDIUM);
        doc.text(titleCase(invoiceData.category), colCategoryX, rowY, { width: 90 });

        const periodText = invoiceData.start_date
            ? `${formatDate(invoiceData.start_date)} to\n${formatDate(invoiceData.end_date)}`
            : '—';
        doc.text(periodText, colPeriodX, rowY, { width: 85 });

        doc.text(String(invoiceData.days_paid || '—'), colDaysX, rowY, { width: 40 });

        doc.font('Helvetica-Bold').fontSize(10).fillColor(TEXT_DARK)
            .text(money(invoiceData.amount), colAmountRightEdge - 90, rowY, { width: 90, align: 'right' });

        // Row divider
        const rowBottom = rowY + Math.max(descHeight, 32) + 12;
        doc.moveTo(margin, rowBottom).lineTo(pageWidth - margin, rowBottom).strokeColor(BORDER).lineWidth(0.5).stroke();

        // =========================================================
        // TOTALS
        // =========================================================
        const amount = Number(invoiceData.amount || 0);
        const isVatRegistered = !!company.vatNumber && company.vatRate > 0;
        // VAT-inclusive pricing: subtotal is back-calculated when VAT applies.
        const subtotal = isVatRegistered ? amount / (1 + company.vatRate) : amount;
        const vat = isVatRegistered ? amount - subtotal : 0;

        const totalsLeft = pageWidth - margin - 230;
        const totalsValueRight = pageWidth - margin - 10;
        let ty = rowBottom + 18;

        const totalLine = (label, value, labelColor = TEXT_GRAY, valueColor = TEXT_DARK, bold = false) => {
            doc.font('Helvetica').fontSize(10).fillColor(labelColor)
                .text(label, totalsLeft, ty, { width: 130 });
            doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(10).fillColor(valueColor)
                .text(value, totalsValueRight - 100, ty, { width: 100, align: 'right' });
            ty += 18;
        };

        totalLine('Subtotal', money(subtotal));
        if (isVatRegistered) {
            totalLine(`VAT (${(company.vatRate * 100).toFixed(0)}%)`, money(vat));
        } else {
            totalLine('VAT', 'N/A (not VAT-registered)', TEXT_GRAY, TEXT_GRAY);
        }
        ty += 4;

        // Grand total banner
        doc.rect(totalsLeft - 10, ty, 240, 38).fill(BRAND_RED);
        doc.font('Helvetica-Bold').fontSize(11).fillColor(WHITE)
            .text('TOTAL PAID', totalsLeft, ty + 13, { width: 130 });
        doc.fontSize(15)
            .text(money(amount), totalsValueRight - 130, ty + 11, { width: 130, align: 'right' });
        ty += 50;

        // Payment confirmation strip
        doc.rect(margin, ty, contentWidth, 30).fill(PANEL);
        doc.font('Helvetica-Bold').fontSize(9).fillColor('#047857')
            .text('PAID IN FULL', margin + 14, ty + 11);
        doc.font('Helvetica').fontSize(9).fillColor(TEXT_MEDIUM)
            .text(
                `Received on ${formatDate(invoiceData.payment_date || invoiceData.generated_at)}` +
                (invoiceData.payment_method ? `  •  ${titleCase(invoiceData.payment_method)}` : '') +
                `  •  Thank you for your business.`,
                margin + 110, ty + 11
            );

        // =========================================================
        // FOOTER (QR + verification + fine print)
        // =========================================================
        const footerHeight = 110;
        const footerY = pageHeight - footerHeight;

        // Top divider
        doc.moveTo(margin, footerY - 10).lineTo(pageWidth - margin, footerY - 10).strokeColor(BORDER).lineWidth(0.5).stroke();

        // QR
        const qrPayload = [
            `INV:${invoiceData.invoice_number}`,
            `AMT:${amount.toFixed(2)}`,
            `CUR:${company.currency}`,
            `DATE:${new Date(invoiceData.generated_at).toISOString().split('T')[0]}`,
            `TIN:${company.tin}`
        ].join('|');
        try {
            const qrDataUrl = await QRCode.toDataURL(qrPayload, { margin: 1, width: 200 });
            doc.image(qrDataUrl, margin, footerY, { width: 70, height: 70 });
            doc.font('Helvetica').fontSize(7.5).fillColor(TEXT_GRAY)
                .text('Scan to verify', margin, footerY + 74, { width: 70, align: 'center' });
        } catch (err) {
            console.error('QR generation failed:', err.message);
        }

        // Fine print
        const fpX = margin + 90;
        const fpWidth = pageWidth - margin - fpX;
        doc.font('Helvetica-Bold').fontSize(9).fillColor(TEXT_DARK)
            .text(`${company.legalName}`, fpX, footerY, { width: fpWidth });
        doc.font('Helvetica').fontSize(8).fillColor(TEXT_MEDIUM);
        let fpY = footerY + 13;
        doc.text(`Registration No: ${company.registrationNumber}   •   TIN: ${company.tin}`, fpX, fpY, { width: fpWidth });
        fpY += 11;
        doc.text(
            company.vatNumber
                ? `VAT Registration No: ${company.vatNumber}   •   VAT Rate: ${(company.vatRate * 100).toFixed(0)}%`
                : `This entity is not currently VAT-registered.`,
            fpX, fpY, { width: fpWidth }
        );
        fpY += 11;
        doc.text(`${company.website}   •   ${company.email}   •   ${company.phone}`, fpX, fpY, { width: fpWidth });
        fpY += 14;
        doc.fillColor(TEXT_GRAY).fontSize(7.5)
            .text(
                'This document serves as both a tax invoice and an official receipt of payment. ' +
                'All amounts are stated in ' + company.currency + '. Computer-generated; no signature required.',
                fpX, fpY, { width: fpWidth }
            );

        doc.end();
        stream.on('finish', () => resolve(filePath));
        stream.on('error', reject);
    } catch (error) {
        reject(error);
    }
});

// ---------- controllers ---------------------------------------------------

/**
 * Get all invoices (Admin) or My Invoices (Sales Rep)
 */
const getInvoices = async (req, res) => {
    try {
        let query = `
            SELECT i.*, u.full_name AS sales_rep_name
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

        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Get invoices error:', error);
        res.status(500).json({ success: false, message: 'Server error fetching invoices' });
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
            SELECT
                i.*,
                a.category,
                a.caption,
                a.days_paid,
                a.advert_type,
                a.payment_method,
                a.payment_date,
                a.start_date,
                a.end_date,
                u.full_name        AS sales_rep_name,
                c.name             AS client_contact_person,
                c.company          AS client_company,
                c.email            AS client_email,
                c.phone            AS client_phone,
                c.contact_person   AS client_contact_role,
                c.address_line1    AS client_address_line1,
                c.address_line2    AS client_address_line2,
                c.city             AS client_city,
                c.country          AS client_country,
                c.tin              AS client_tin,
                c.vat_number       AS client_vat_number
            FROM invoices i
            JOIN adverts a ON i.advert_id = a.id
            JOIN users u   ON i.sales_rep_id = u.id
            LEFT JOIN clients c ON a.client_id = c.id
            WHERE i.id = $1
        `, [id]);

        const row = detailsResult.rows[0];

        // If we don't have a linked client record, fall back to the snapshot name
        // stored on the invoice so legacy invoices still print sensibly.
        if (!row.client_contact_person) {
            row.client_contact_person = invoice.client_name;
        }
        // Prefer the dedicated contact_person column for the "Contact:" line.
        row.client_contact_person = row.client_contact_role || row.client_contact_person;

        await generateInvoicePDF(row, filePath);

        res.download(filePath, fileName);
    } catch (error) {
        console.error('Download invoice error:', error);
        res.status(500).json({ success: false, message: 'Server error downloading invoice' });
    }
};

module.exports = {
    getInvoices,
    downloadInvoice,
    generateInvoicePDF
};
