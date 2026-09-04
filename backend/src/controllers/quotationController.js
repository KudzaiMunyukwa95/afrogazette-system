const PDFDocument = require('pdfkit');

const pool = require('../config/database');
const company = require('../config/company');
const { renderLogo } = require('../utils/pdfLogo');

// Quotations are deliberately not persisted — a rep fills a form and gets a
// PDF straight back. No table, no history, no verification page: unlike
// invoices, there's no completed sale behind this to look up later. The
// quotation number printed on the PDF is only a reference for conversations
// with the client, not a lookup key anywhere in this system.

const BRAND_RED = '#E53939';
const BRAND_BLACK = '#0F0F10';
const TEXT_DARK = '#111827';
const TEXT_GRAY = '#6B7280';
const TEXT_MEDIUM = '#4B5563';
const BORDER = '#E5E7EB';
const PANEL = '#F9FAFB';
const WHITE = '#FFFFFF';

const formatDate = (value) => {
    const d = value ? new Date(value) : new Date();
    if (Number.isNaN(d.getTime())) return '—';
    const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${String(d.getDate()).padStart(2, '0')} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};

const money = (value) => `${company.currency} ${Number(value || 0).toFixed(2)}`;

const quotationNumber = () => `AG-QUO-${Date.now().toString().slice(-6)}`;

/**
 * Generates a quotation PDF and streams it straight to the response —
 * nothing is ever written to disk, matching the "nothing persisted" nature
 * of this feature.
 */
const generateQuotation = async (req, res) => {
    try {
        const { clientName, clientCompany, clientContact, validUntil, items, notes } = req.body;

        if (!clientName || !String(clientName).trim()) {
            return res.status(400).json({ success: false, message: 'Client name is required' });
        }
        const cleanItems = (Array.isArray(items) ? items : [])
            .map(i => ({ description: String(i.description || '').trim(), amount: Number(i.amount) || 0 }))
            .filter(i => i.description && i.amount > 0);
        if (cleanItems.length === 0) {
            return res.status(400).json({ success: false, message: 'At least one line item with a description and amount is required' });
        }

        const repResult = await pool.query('SELECT full_name FROM users WHERE id = $1', [req.user.id]);
        const salesRepName = repResult.rows[0]?.full_name || '—';

        const number = quotationNumber();
        const total = cleanItems.reduce((sum, i) => sum + i.amount, 0);
        const issuedAt = new Date();

        const doc = new PDFDocument({ size: 'A4', margin: 0, bufferPages: true });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="quotation-${number}.pdf"`);
        doc.pipe(res);

        const pageWidth = doc.page.width;
        const pageHeight = doc.page.height;
        const margin = 40;
        const contentWidth = pageWidth - 2 * margin;

        // =========================================================
        // HEADER (black band, logo left, company block right)
        // =========================================================
        const headerHeight = 110;
        doc.rect(0, 0, pageWidth, headerHeight).fill(BRAND_BLACK);

        renderLogo(doc, margin, 28, 160, 50);

        const rightColX = pageWidth / 2;
        const rightColWidth = pageWidth - margin - rightColX;
        doc.font('Helvetica-Bold').fontSize(11).fillColor(WHITE)
            .text(company.legalName, rightColX, 24, { width: rightColWidth, align: 'right' });
        doc.font('Helvetica').fontSize(8.5).fillColor('#D1D5DB');
        let hy = 40;
        [
            company.address.line1,
            `${company.address.line2}, ${company.address.city}, ${company.address.country}`,
            `${company.phone}  |  ${company.email}`,
            `TIN: ${company.tin}   |   Reg No: ${company.registrationNumber}`
        ].forEach(line => {
            doc.text(line, rightColX, hy, { width: rightColWidth, align: 'right' });
            hy += 12;
        });

        // =========================================================
        // DOCUMENT TITLE STRIP
        // =========================================================
        const titleY = headerHeight + 22;
        doc.font('Helvetica-Bold').fontSize(22).fillColor(TEXT_DARK)
            .text('QUOTATION', margin, titleY);

        const metaX = pageWidth - margin - 200;
        const metaY = titleY + 4;
        const metaRow = (label, value, dy, valueColor = TEXT_DARK) => {
            doc.font('Helvetica').fontSize(9).fillColor(TEXT_GRAY)
                .text(label, metaX, metaY + dy, { width: 80 });
            doc.font('Helvetica-Bold').fontSize(9).fillColor(valueColor)
                .text(value, metaX + 85, metaY + dy, { width: 115, align: 'right' });
        };
        metaRow('Quote No', number, 0);
        metaRow('Issue Date', formatDate(issuedAt), 16);
        metaRow('Valid Until', validUntil ? formatDate(validUntil) : '—', 32, BRAND_RED);

        // =========================================================
        // QUOTED FOR  &  ISSUED BY
        // =========================================================
        const partiesY = titleY + 90;
        const colWidth = (contentWidth - 20) / 2;

        const labelStrip = (x, label) => {
            doc.font('Helvetica-Bold').fontSize(9).fillColor(TEXT_GRAY).text(label, x, partiesY);
            doc.rect(x, partiesY + 13, 28, 2).fill(BRAND_RED);
        };
        labelStrip(margin, 'QUOTED FOR');
        labelStrip(margin + colWidth + 20, 'ISSUED BY');

        const billY = partiesY + 22;
        const billLines = [];
        const headlineName = clientCompany || clientName;
        billLines.push({ text: headlineName, font: 'Helvetica-Bold', size: 12, color: TEXT_DARK });
        if (clientCompany && clientName && clientName !== clientCompany) {
            billLines.push({ text: `Attn: ${clientName}`, font: 'Helvetica', size: 10, color: TEXT_MEDIUM });
        }
        if (clientContact) {
            billLines.push({ text: clientContact, font: 'Helvetica', size: 9.5, color: TEXT_MEDIUM });
        }
        let by = billY;
        billLines.forEach(line => {
            doc.font(line.font).fontSize(line.size).fillColor(line.color)
                .text(line.text, margin, by, { width: colWidth });
            by += line.size + 3;
        });

        const issuedX = margin + colWidth + 20;
        let iy = billY;
        doc.font('Helvetica-Bold').fontSize(12).fillColor(TEXT_DARK)
            .text(company.tradeName, issuedX, iy, { width: colWidth });
        iy += 16;
        doc.font('Helvetica').fontSize(9.5).fillColor(TEXT_MEDIUM)
            .text(`Sales Rep: ${salesRepName}`, issuedX, iy, { width: colWidth });
        iy += 13;
        doc.text(`Currency: ${company.currency}`, issuedX, iy, { width: colWidth });

        // =========================================================
        // LINE-ITEM TABLE
        // =========================================================
        const tableTop = Math.max(by, iy) + 28;
        const colDescX = margin + 10;
        const colAmountRightEdge = pageWidth - margin - 10;

        doc.rect(margin, tableTop, contentWidth, 26).fill(BRAND_BLACK);
        doc.font('Helvetica-Bold').fontSize(8.5).fillColor(WHITE);
        doc.text('DESCRIPTION', colDescX, tableTop + 9);
        doc.text('AMOUNT', colAmountRightEdge - 90, tableTop + 9, { width: 90, align: 'right' });

        let rowY = tableTop + 36;
        const descWidth = contentWidth - 120;
        cleanItems.forEach(item => {
            doc.font('Helvetica').fontSize(10).fillColor(TEXT_DARK)
                .text(item.description, colDescX, rowY, { width: descWidth });
            const rowHeight = doc.heightOfString(item.description, { width: descWidth });
            doc.font('Helvetica-Bold').fontSize(10).fillColor(TEXT_DARK)
                .text(money(item.amount), colAmountRightEdge - 90, rowY, { width: 90, align: 'right' });
            const rowBottom = rowY + Math.max(rowHeight, 14) + 12;
            doc.moveTo(margin, rowBottom).lineTo(pageWidth - margin, rowBottom).strokeColor(BORDER).lineWidth(0.5).stroke();
            rowY = rowBottom + 12;
        });

        // =========================================================
        // TOTAL
        // =========================================================
        const totalsLeft = pageWidth - margin - 230;
        const totalsValueRight = pageWidth - margin - 10;
        let ty = rowY + 6;

        doc.rect(totalsLeft - 10, ty, 240, 38).fill(BRAND_RED);
        doc.font('Helvetica-Bold').fontSize(11).fillColor(WHITE)
            .text('TOTAL QUOTED', totalsLeft, ty + 13, { width: 130 });
        doc.fontSize(15)
            .text(money(total), totalsValueRight - 130, ty + 11, { width: 130, align: 'right' });
        ty += 50;

        // Validity / disclaimer strip
        doc.rect(margin, ty, contentWidth, 30).fill(PANEL);
        doc.font('Helvetica-Bold').fontSize(9).fillColor(TEXT_MEDIUM)
            .text('NOT A TAX INVOICE', margin + 14, ty + 11);
        doc.font('Helvetica').fontSize(9).fillColor(TEXT_MEDIUM)
            .text(
                (validUntil ? `Prices valid until ${formatDate(validUntil)}` : 'Prices subject to confirmation') +
                '  •  Payment due in full to confirm booking.',
                margin + 140, ty + 11
            );
        ty += 42;

        if (notes && String(notes).trim()) {
            doc.font('Helvetica-Bold').fontSize(9).fillColor(TEXT_GRAY).text('NOTES', margin, ty);
            ty += 14;
            doc.font('Helvetica').fontSize(9).fillColor(TEXT_MEDIUM)
                .text(String(notes).trim(), margin, ty, { width: contentWidth });
        }

        // =========================================================
        // FOOTER (fine print — no QR: nothing persisted to verify against)
        // =========================================================
        const footerHeight = 70;
        const footerY = pageHeight - footerHeight;
        doc.moveTo(margin, footerY - 10).lineTo(pageWidth - margin, footerY - 10).strokeColor(BORDER).lineWidth(0.5).stroke();

        doc.font('Helvetica-Bold').fontSize(9).fillColor(TEXT_DARK)
            .text(company.legalName, margin, footerY, { width: contentWidth });
        doc.font('Helvetica').fontSize(8).fillColor(TEXT_MEDIUM);
        doc.text(`Registration No: ${company.registrationNumber}   •   TIN: ${company.tin}`, margin, footerY + 13, { width: contentWidth });
        doc.text(`${company.website}   •   ${company.email}   •   ${company.phone}`, margin, footerY + 26, { width: contentWidth });
        doc.fillColor(TEXT_GRAY).fontSize(7.5)
            .text('This is a price quotation, not a tax invoice or receipt, and does not confirm a booking.', margin, footerY + 40, { width: contentWidth });

        doc.end();
    } catch (error) {
        console.error('Generate quotation error:', error);
        if (!res.headersSent) {
            res.status(500).json({ success: false, message: 'Server error generating quotation' });
        } else {
            res.end();
        }
    }
};

module.exports = { generateQuotation };
