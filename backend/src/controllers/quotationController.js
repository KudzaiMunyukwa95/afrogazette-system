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
        const {
            clientId, clientName, clientCompany, clientContact, validUntil, items, notes,
            clientAddressLine1, clientAddressLine2, clientCity, clientCountry,
            clientTin, clientVatNumber
        } = req.body;

        if (!clientName || !String(clientName).trim()) {
            return res.status(400).json({ success: false, message: 'Client name is required' });
        }
        const cleanItems = (Array.isArray(items) ? items : [])
            .map(i => ({ description: String(i.description || '').trim(), amount: Number(i.amount) || 0 }))
            .filter(i => i.description && i.amount > 0);
        if (cleanItems.length === 0) {
            return res.status(400).json({ success: false, message: 'At least one line item with a description and amount is required' });
        }

        const repResult = await pool.query('SELECT full_name, email FROM users WHERE id = $1', [req.user.id]);
        const salesRepName = repResult.rows[0]?.full_name || '—';
        const salesRepEmail = repResult.rows[0]?.email || '';

        // A quote for a client we already hold a record for bills to that
        // record — the same source of truth the invoice will use, so the two
        // documents can't disagree on the client's address or tax number.
        // clientId stays optional: a quotation is a pre-sale document, so it
        // must not force a client record into existence for a prospect.
        let clientRecord = null;
        if (clientId) {
            const clientResult = await pool.query(
                `SELECT name, company, contact_person, email, phone,
                        address_line1, address_line2, city, country, tin, vat_number
                 FROM clients WHERE id = $1`,
                [clientId]
            );
            clientRecord = clientResult.rows[0] || null;
        }

        // Stored details win field by field, with anything typed on the form
        // filling the gaps — so an existing client whose record has no
        // address yet can still be quoted properly today, without the form
        // being able to quietly contradict what the invoice will bill to.
        const trimmed = (v) => (v == null ? null : String(v).trim() || null);
        const pick = (recordValue, typedValue) => trimmed(recordValue) || trimmed(typedValue);
        const r = clientRecord || {};
        const billing = {
            name: pick(r.name, clientName),
            company: pick(r.company, clientCompany),
            contactPerson: trimmed(r.contact_person),
            email: trimmed(r.email),
            // The form has one free-text contact box, so it can be a phone or
            // an email — printed as-is rather than guessed at and mislabelled.
            phone: pick(r.phone, clientContact),
            addressLine1: pick(r.address_line1, clientAddressLine1),
            addressLine2: pick(r.address_line2, clientAddressLine2),
            city: pick(r.city, clientCity),
            country: pick(r.country, clientCountry),
            tin: pick(r.tin, clientTin),
            vatNumber: pick(r.vat_number, clientVatNumber)
        };

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
        const partiesY = titleY + 72;
        const colWidth = (contentWidth - 20) / 2;

        const labelStrip = (x, label) => {
            doc.font('Helvetica-Bold').fontSize(9).fillColor(TEXT_GRAY).text(label, x, partiesY);
            doc.rect(x, partiesY + 13, 28, 2).fill(BRAND_RED);
        };
        labelStrip(margin, 'QUOTED FOR');
        labelStrip(margin + colWidth + 20, 'ISSUED BY');

        // Same shape as the invoice's BILL TO block — a quote a client's
        // finance office has to act on needs the addressed-to details in
        // full (postal address and tax numbers included), not just a name
        // and a phone number.
        const billY = partiesY + 22;
        const billLines = [];
        const headlineName = billing.company || billing.name;
        billLines.push({ text: headlineName, font: 'Helvetica-Bold', size: 12, color: TEXT_DARK });
        if (billing.company && billing.name && billing.name !== billing.company) {
            billLines.push({ text: `Attn: ${billing.name}`, font: 'Helvetica', size: 10, color: TEXT_MEDIUM });
        }
        if (billing.contactPerson) {
            billLines.push({ text: `Contact: ${billing.contactPerson}`, font: 'Helvetica', size: 9.5, color: TEXT_MEDIUM });
        }
        if (billing.addressLine1) billLines.push({ text: billing.addressLine1, font: 'Helvetica', size: 9.5, color: TEXT_MEDIUM });
        if (billing.addressLine2) billLines.push({ text: billing.addressLine2, font: 'Helvetica', size: 9.5, color: TEXT_MEDIUM });
        const cityCountry = [billing.city, billing.country].filter(Boolean).join(', ');
        if (cityCountry) billLines.push({ text: cityCountry, font: 'Helvetica', size: 9.5, color: TEXT_MEDIUM });
        if (billing.email) billLines.push({ text: billing.email, font: 'Helvetica', size: 9.5, color: TEXT_MEDIUM });
        if (billing.phone) billLines.push({ text: billing.phone, font: 'Helvetica', size: 9.5, color: TEXT_MEDIUM });
        if (billing.tin) billLines.push({ text: `TIN: ${billing.tin}`, font: 'Helvetica-Bold', size: 9.5, color: TEXT_DARK });
        if (billing.vatNumber) billLines.push({ text: `VAT: ${billing.vatNumber}`, font: 'Helvetica-Bold', size: 9.5, color: TEXT_DARK });

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
        if (salesRepEmail) {
            doc.text(salesRepEmail, issuedX, iy, { width: colWidth });
            iy += 13;
        }
        doc.text(`${company.address.line1}, ${company.address.line2}`, issuedX, iy, { width: colWidth });
        iy += 13;
        doc.text(`${company.address.city}, ${company.address.country}`, issuedX, iy, { width: colWidth });
        iy += 13;
        doc.text(`Currency: ${company.currency}`, issuedX, iy, { width: colWidth });

        // =========================================================
        // LINE-ITEM TABLE
        // =========================================================
        const tableTop = Math.max(by, iy) + 24;
        const colDescX = margin + 10;
        const colAmountRightEdge = pageWidth - margin - 10;

        // Returns the y to start the first row at, so a table continued onto
        // a second page gets the same header rather than orphaned rows.
        const drawTableHeader = (y) => {
            doc.rect(margin, y, contentWidth, 26).fill(BRAND_BLACK);
            doc.font('Helvetica-Bold').fontSize(8.5).fillColor(WHITE);
            doc.text('DESCRIPTION', colDescX, y + 9);
            doc.text('AMOUNT', colAmountRightEdge - 90, y + 9, { width: 90, align: 'right' });
            return y + 36;
        };
        drawTableHeader(tableTop);

        // The footer is drawn at a fixed offset from the bottom of every page,
        // so nothing above it may run past this line — a quote with a dozen
        // line items has to break onto a second page rather than print over
        // its own fine print.
        const footerHeight = 86;
        const footerY = pageHeight - footerHeight;
        const contentBottom = footerY - 20;

        // Returns the y to carry on drawing at, starting a new page first if
        // the next `needed` points wouldn't fit above the footer.
        const roomFor = (y, needed, onBreak) => {
            if (y + needed <= contentBottom) return y;
            doc.addPage();
            const top = margin + 20;
            return onBreak ? onBreak(top) : top;
        };

        let rowY = tableTop + 36;
        const descWidth = contentWidth - 120;
        cleanItems.forEach(item => {
            doc.font('Helvetica').fontSize(10);
            const rowHeight = doc.heightOfString(item.description, { width: descWidth });
            rowY = roomFor(rowY, Math.max(rowHeight, 14) + 19, drawTableHeader);

            doc.font('Helvetica').fontSize(10).fillColor(TEXT_DARK)
                .text(item.description, colDescX, rowY, { width: descWidth });
            doc.font('Helvetica-Bold').fontSize(10).fillColor(TEXT_DARK)
                .text(money(item.amount), colAmountRightEdge - 90, rowY, { width: 90, align: 'right' });
            const rowBottom = rowY + Math.max(rowHeight, 14) + 10;
            doc.moveTo(margin, rowBottom).lineTo(pageWidth - margin, rowBottom).strokeColor(BORDER).lineWidth(0.5).stroke();
            rowY = rowBottom + 9;
        });

        // =========================================================
        // TOTAL
        // =========================================================
        const totalsLeft = pageWidth - margin - 230;
        const totalsValueRight = pageWidth - margin - 10;
        let ty = roomFor(rowY + 6, 38);

        doc.rect(totalsLeft - 10, ty, 240, 38).fill(BRAND_RED);
        doc.font('Helvetica-Bold').fontSize(11).fillColor(WHITE)
            .text('TOTAL QUOTED', totalsLeft, ty + 13, { width: 130 });
        doc.fontSize(15)
            .text(money(total), totalsValueRight - 130, ty + 11, { width: 130, align: 'right' });
        ty += 50;

        // Validity / disclaimer strip
        ty = roomFor(ty, 30);
        doc.rect(margin, ty, contentWidth, 30).fill(PANEL);
        doc.font('Helvetica-Bold').fontSize(9).fillColor(TEXT_MEDIUM)
            .text('NOT A TAX INVOICE', margin + 14, ty + 11);
        doc.font('Helvetica').fontSize(9).fillColor(TEXT_MEDIUM)
            .text(
                (validUntil ? `Prices valid until ${formatDate(validUntil)}` : 'Prices subject to confirmation') +
                '  •  Payment due in full to confirm booking.',
                margin + 140, ty + 11
            );
        ty += 38;

        // =========================================================
        // PAYMENT DETAILS
        // =========================================================
        // A corporate client raises payment from this document, so it has to
        // say where the money goes. Every line is env-configured and any
        // missing one is dropped — the block disappears entirely rather than
        // print a half-filled panel or a placeholder account number.
        if (company.hasPaymentDetails) {
            const payLines = [
                company.bank.name && ['Bank', company.bank.name],
                company.bank.branch && ['Branch', company.bank.branch],
                company.bank.accountName && ['Account Name', company.bank.accountName],
                company.bank.accountNumber && ['Account Number', company.bank.accountNumber],
                company.bank.swift && ['SWIFT', company.bank.swift],
                company.mobileMoney && ['Mobile Money', company.mobileMoney]
            ].filter(Boolean);

            // One column reads better, but a fully-configured block (bank,
            // branch, account name and number, SWIFT, mobile money) is tall
            // enough to push a routine quote onto a second page — so it goes
            // to two columns only once it gets long.
            const payColumns = payLines.length > 4 ? 2 : 1;
            const payRows = Math.ceil(payLines.length / payColumns);
            const payBoxHeight = 26 + payRows * 13 + 10;
            ty = roomFor(ty, payBoxHeight + 10);

            doc.rect(margin, ty, contentWidth, payBoxHeight).fill(PANEL);
            doc.rect(margin, ty, 3, payBoxHeight).fill(BRAND_RED);
            doc.font('Helvetica-Bold').fontSize(9).fillColor(TEXT_DARK)
                .text('PAYMENT DETAILS', margin + 14, ty + 10);

            const payColWidth = (contentWidth - 28) / payColumns;
            payLines.forEach(([label, value], index) => {
                const colX = margin + 14 + Math.floor(index / payRows) * payColWidth;
                const py = ty + 26 + (index % payRows) * 13;
                doc.font('Helvetica').fontSize(8.5).fillColor(TEXT_GRAY)
                    .text(label, colX, py, { width: 82 });
                doc.font('Helvetica-Bold').fontSize(8.5).fillColor(TEXT_MEDIUM)
                    .text(value, colX + 86, py, { width: payColWidth - 96 });
            });
            ty += payBoxHeight + 12;
        }

        if (notes && String(notes).trim()) {
            const noteText = String(notes).trim();
            doc.font('Helvetica').fontSize(9);
            const noteHeight = doc.heightOfString(noteText, { width: contentWidth });
            ty = roomFor(ty, noteHeight + 18);

            doc.font('Helvetica-Bold').fontSize(9).fillColor(TEXT_GRAY).text('NOTES', margin, ty);
            ty += 14;
            doc.font('Helvetica').fontSize(9).fillColor(TEXT_MEDIUM)
                .text(noteText, margin, ty, { width: contentWidth });
        }

        // =========================================================
        // FOOTER (fine print — no QR: nothing persisted to verify against)
        // =========================================================
        // Drawn on every page at the end, so a quote that ran to two pages
        // carries the same registered details and disclaimer on both.
        const drawFooter = (pageNo, pageCount) => {
            doc.moveTo(margin, footerY - 10).lineTo(pageWidth - margin, footerY - 10).strokeColor(BORDER).lineWidth(0.5).stroke();

            doc.font('Helvetica-Bold').fontSize(9).fillColor(TEXT_DARK)
                .text(company.legalName, margin, footerY, { width: contentWidth });
            doc.font('Helvetica').fontSize(8).fillColor(TEXT_MEDIUM);
            doc.text(
                `${company.address.line1}, ${company.address.line2}, ${company.address.city}, ${company.address.country}`,
                margin, footerY + 13, { width: contentWidth }
            );
            doc.text(`Registration No: ${company.registrationNumber}   •   TIN: ${company.tin}`, margin, footerY + 24, { width: contentWidth });
            // Same VAT-status statement the invoice carries — a client's
            // finance office needs to know up front that no VAT is coming.
            doc.text(
                company.vatNumber
                    ? `VAT Registration No: ${company.vatNumber}`
                    : 'Registered for Income Tax only. Not registered for VAT — no VAT is chargeable on these prices.',
                margin, footerY + 35, { width: contentWidth }
            );
            doc.text(`${company.website}   •   ${company.email}   •   ${company.phone}`, margin, footerY + 46, { width: contentWidth });
            doc.fillColor(TEXT_GRAY).fontSize(7.5)
                .text(
                    'This is a price quotation, not a tax invoice or receipt, and does not confirm a booking. ' +
                    `All amounts are stated in ${company.currency}.`,
                    margin, footerY + 59, { width: contentWidth - 60 }
                );
            if (pageCount > 1) {
                doc.text(`Page ${pageNo} of ${pageCount}`, pageWidth - margin - 60, footerY + 59, { width: 60, align: 'right' });
            }
        };

        const range = doc.bufferedPageRange();
        for (let i = 0; i < range.count; i++) {
            doc.switchToPage(range.start + i);
            drawFooter(i + 1, range.count);
        }
        doc.flushPages();

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
