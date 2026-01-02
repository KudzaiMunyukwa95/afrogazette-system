const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const pool = require('../config/database');
const SVGtoPDF = require('svg-to-pdfkit');

/**
 * Generate Financial Report PDF
 */
const generateFinancialReportPDF = async (reportData, filePath) => {
    return new Promise(async (resolve, reject) => {
        try {
            const doc = new PDFDocument({
                margins: {
                    top: 0,
                    bottom: 0,
                    left: 0,
                    right: 0
                },
                size: 'A4',
                bufferPages: true,
                autoFirstPage: false // Important: We control the first page to trigger the event
            });
            const stream = fs.createWriteStream(filePath);

            doc.pipe(stream);

            // --- STYLING CONSTANTS ---
            const BRAND_RED = '#E53939';
            const BRAND_BLACK = '#000000';
            const TABLE_HEADER_BG = '#F3F4F6';
            const TEXT_DARK = '#111827';
            const TEXT_GRAY = '#6B7280';
            const BORDER_COLOR = '#E5E7EB';
            const WHITE = '#FFFFFF';
            const ROW_ALT_BG = '#F9FAFB'; // Light gray for zebra striping

            const marginX = 40;
            // PDFKit A4 size in points (standard)
            const pageWidth = 595.28;
            const pageHeight = 841.89;
            const contentWidth = pageWidth - 2 * marginX;

            // --- HEADER HANDLER ---
            // This runs automatically whenever a new page is added
            doc.on('pageAdded', () => {
                const headerHeight = 80;
                doc.rect(0, 0, pageWidth, headerHeight).fill(BRAND_BLACK);

                // Logo
                const logoSvgPath = path.join(__dirname, '../../../frontend/public/logo.svg');
                const logoPngPath = path.join(__dirname, '../../../frontend/public/logo.png');
                let logoRendered = false;

                if (fs.existsSync(logoSvgPath)) {
                    try {
                        let svgContent = fs.readFileSync(logoSvgPath, 'utf8');
                        svgContent = svgContent.replace(/<image[^>]*>/g, '');
                        SVGtoPDF(doc, svgContent, marginX, 20, {
                            width: 150,
                            height: 40,
                            preserveAspectRatio: 'xMinYMid meet'
                        });
                        logoRendered = true;
                    } catch (err) { console.error('SVG logo error:', err); }
                }

                if (!logoRendered && fs.existsSync(logoPngPath)) {
                    try {
                        doc.image(logoPngPath, marginX, 20, { width: 150 });
                        logoRendered = true;
                    } catch (err) { console.error('PNG logo error:', err); }
                }

                if (!logoRendered) {
                    doc.font('Helvetica-Bold').fontSize(24).fillColor(BRAND_RED).text('afro', marginX, 28, { continued: true });
                    doc.fillColor(WHITE).text('gazette');
                }

                // Company Details
                doc.font('Helvetica').fontSize(9).fillColor(WHITE);
                let headerY = 22;
                doc.text('AfroGazette', marginX, headerY, { align: 'right', width: contentWidth });
                headerY += 12;
                doc.text('Office 4, Karimapondo Building', marginX, headerY, { align: 'right', width: contentWidth });
                headerY += 12;
                doc.text('78 Leopold Takawira, Harare, Zimbabwe', marginX, headerY, { align: 'right', width: contentWidth });
                headerY += 12;
                doc.text('support@afrogazette.co.zw | +263 77 8826661', marginX, headerY, { align: 'right', width: contentWidth });

                // Reset Y for content
                doc.y = 100;
            });

            // --- CONTENT HELPERS ---

            const checkSpace = (neededSpace) => {
                if (doc.y + neededSpace > pageHeight - 50) {
                    doc.addPage();
                }
            };

            const drawSectionHeader = (title) => {
                checkSpace(60);
                doc.moveDown(1);
                doc.font('Helvetica-Bold').fontSize(14).fillColor(TEXT_DARK).text(title, marginX, doc.y);
                doc.rect(marginX, doc.y + 5, contentWidth, 2).fill(BRAND_RED);
                doc.moveDown(0.5); // Add some spacing after the line
                doc.y += 10;
            };

            const drawTableHeader = (columns) => {
                checkSpace(30);
                const startY = doc.y;
                doc.rect(marginX, startY, contentWidth, 25).fill(TABLE_HEADER_BG);
                doc.font('Helvetica-Bold').fontSize(10).fillColor(TEXT_DARK);

                columns.forEach(col => {
                    doc.text(col.label, col.x, startY + 8, { width: col.width, align: col.align || 'left' });
                });

                doc.y = startY + 30;
            };

            const drawTableRow = (columns, isEven) => {
                checkSpace(20);
                const startY = doc.y;

                if (!isEven) {
                    doc.rect(marginX, startY - 2, contentWidth, 16).fill(ROW_ALT_BG);
                }

                doc.font('Helvetica').fontSize(10).fillColor(TEXT_DARK);
                columns.forEach(col => {
                    doc.text(col.value, col.x, startY, { width: col.width, align: col.align || 'left' });
                });

                doc.y = startY + 16;
            };

            // --- START GENERATION ---
            doc.addPage(); // Trigger first page

            // Report Title
            doc.font('Helvetica-Bold').fontSize(24).fillColor(TEXT_DARK);
            doc.text('Financial Report', marginX, doc.y);
            doc.moveDown(0.5);
            doc.font('Helvetica').fontSize(12).fillColor(TEXT_GRAY);
            doc.text(`Reporting Period: ${reportData.dateRange}`, marginX, doc.y);
            doc.moveDown(0.5);
            doc.font('Helvetica').fontSize(10).fillColor(TEXT_GRAY);
            doc.text(`Generated on: ${new Date().toLocaleDateString()} | Prepared by: ${reportData.preparedBy}`, marginX, doc.y);

            // Executive Summary
            drawSectionHeader('Executive Summary');

            const cardWidth = contentWidth / 4;
            const summaryY = doc.y;

            // Draw cards
            const summaries = [
                { label: 'Total Income', value: reportData.summary.totalIncome, format: 'currency' },
                { label: 'Total Expenses', value: reportData.summary.totalExpenses, format: 'currency' },
                { label: 'Net Position', value: reportData.summary.netPosition, format: 'currency', color: true },
                { label: 'Net Margin', value: reportData.summary.margin, format: 'percent' }
            ];

            summaries.forEach((item, index) => {
                const x = marginX + (index * cardWidth);
                doc.font('Helvetica').fontSize(10).fillColor(TEXT_GRAY).text(item.label, x, summaryY);

                let valStr = '';
                let color = TEXT_DARK;

                if (item.format === 'currency') {
                    valStr = `$${item.value.toFixed(2)}`;
                    if (item.color) color = item.value >= 0 ? '#059669' : '#DC2626';
                } else {
                    valStr = `${item.value.toFixed(1)}%`;
                }

                doc.font('Helvetica-Bold').fontSize(14).fillColor(color).text(valStr, x, summaryY + 15);
            });

            doc.y = summaryY + 45;

            // Payment Methods Table
            drawSectionHeader('Summary by Payment Method');

            const pmCols = [
                { label: 'METHOD', x: marginX + 10, width: 100 },
                { label: 'INCOME', x: marginX + 150, width: 80, align: 'right' },
                { label: 'EXPENSE', x: marginX + 250, width: 80, align: 'right' },
                { label: 'NET', x: marginX + 350, width: 80, align: 'right' }
            ];

            drawTableHeader(pmCols);

            reportData.paymentMethods.forEach((pm, i) => {
                const netVal = pm.income - pm.expense;
                drawTableRow([
                    { value: pm.method.toUpperCase(), x: marginX + 10, width: 100 },
                    { value: `$${pm.income.toFixed(2)}`, x: marginX + 150, width: 80, align: 'right' },
                    { value: `$${pm.expense.toFixed(2)}`, x: marginX + 250, width: 80, align: 'right' },
                    { value: `$${netVal.toFixed(2)}`, x: marginX + 350, width: 80, align: 'right' }
                ], i % 2 === 0);
            });

            // Income Details
            drawSectionHeader('Income Details');

            const incCols = [
                { label: 'DATE', x: marginX + 10, width: 70 },
                { label: 'CLIENT / DESCRIPTION', x: marginX + 90, width: 250 },
                { label: 'METHOD', x: marginX + 350, width: 60 },
                { label: 'AMOUNT', x: pageWidth - marginX - 90, width: 80, align: 'right' }
            ];

            drawTableHeader(incCols);

            reportData.incomeDetails.forEach((item, i) => {
                drawTableRow([
                    { value: new Date(item.date).toLocaleDateString(), x: marginX + 10, width: 70 },
                    { value: (item.description || 'N/A').substring(0, 40), x: marginX + 90, width: 250 },
                    { value: item.method, x: marginX + 350, width: 60 },
                    { value: `$${parseFloat(item.amount).toFixed(2)}`, x: pageWidth - marginX - 90, width: 80, align: 'right' }
                ], i % 2 === 0);
            });

            // Expense Details
            drawSectionHeader('Expense Details');

            const expCols = [
                { label: 'DATE', x: marginX + 10, width: 70 },
                { label: 'REASON', x: marginX + 90, width: 150 },
                { label: 'CATEGORY', x: marginX + 250, width: 90 },
                { label: 'METHOD', x: marginX + 350, width: 60 },
                { label: 'AMOUNT', x: pageWidth - marginX - 90, width: 80, align: 'right' }
            ];

            drawTableHeader(expCols);

            reportData.expenseDetails.forEach((item, i) => {
                drawTableRow([
                    { value: new Date(item.date).toLocaleDateString(), x: marginX + 10, width: 70 },
                    { value: item.reason.substring(0, 25), x: marginX + 90, width: 150 },
                    { value: item.category || '-', x: marginX + 250, width: 90 },
                    { value: item.method, x: marginX + 350, width: 60 },
                    { value: `$${parseFloat(item.amount).toFixed(2)}`, x: pageWidth - marginX - 90, width: 80, align: 'right' }
                ], i % 2 === 0);
            });


            // Final Footer Loop
            const range = doc.bufferedPageRange();
            for (let i = range.start; i < range.start + range.count; i++) {
                doc.switchToPage(i);
                doc.font('Helvetica-Oblique').fontSize(8).fillColor(TEXT_GRAY);
                doc.text('Internal Financial Report – For Management Use Only', marginX, pageHeight - 40, { align: 'center', width: contentWidth });
                doc.text(`Page ${i + 1} of ${range.count}`, marginX, pageHeight - 28, { align: 'center', width: contentWidth });
            }

            doc.end();

            stream.on('finish', () => resolve(filePath));
            stream.on('error', (err) => reject(err));
        } catch (error) {
            reject(error);
        }
    });
};

/**
 * Download Financial Report Controller
 */
const downloadFinancialReport = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        // Fetch Income Details
        let incomeQuery = `
            SELECT i.generated_at as date, 
                   COALESCE(c.name, a.client_name, 'Unknown Client') as description, 
                   a.payment_method as method, 
                   i.amount
            FROM invoices i
            JOIN adverts a ON i.advert_id = a.id
            LEFT JOIN clients c ON a.client_id = c.id
            WHERE i.amount > 0
        `;
        const params = [];
        let paramCount = 1;
        if (startDate) { incomeQuery += ` AND i.generated_at >= $${paramCount}`; params.push(startDate); paramCount++; }
        if (endDate) { incomeQuery += ` AND i.generated_at < $${paramCount}::date + INTERVAL '1 day'`; params.push(endDate); paramCount++; }
        incomeQuery += ` ORDER BY i.generated_at DESC`;
        const incomeResult = await pool.query(incomeQuery, params);

        // Fetch Expense Details
        let expenseQuery = `
            SELECT expense_date as date, reason, category, payment_method as method, amount
            FROM expenses
            WHERE status = 'Approved' AND amount > 0
        `;
        // Reuse params as they are the same for date filtering
        let expParamCount = 1;
        if (startDate) { expenseQuery += ` AND expense_date >= $${expParamCount}`; expParamCount++; }
        if (endDate) { expenseQuery += ` AND expense_date < $${expParamCount}::date + INTERVAL '1 day'`; expParamCount++; }
        expenseQuery += ` ORDER BY expense_date DESC`;
        const expenseResult = await pool.query(expenseQuery, params);

        // Calculate Summary
        const totalIncome = incomeResult.rows.reduce((sum, item) => sum + parseFloat(item.amount), 0);
        const totalExpenses = expenseResult.rows.reduce((sum, item) => sum + parseFloat(item.amount), 0);
        const netPosition = totalIncome - totalExpenses;
        const margin = totalIncome > 0 ? (netPosition / totalIncome) * 100 : 0;

        // Calculate Payment Method Summary
        const methods = ['cash', 'ecocash', 'innbucks'];
        const paymentMethods = methods.map(method => {
            const inc = incomeResult.rows.filter(i => (i.method || '').toLowerCase() === method).reduce((s, i) => s + parseFloat(i.amount), 0);
            const exp = expenseResult.rows.filter(e => (e.method || '').toLowerCase() === method).reduce((s, e) => s + parseFloat(e.amount), 0);
            return { method, income: inc, expense: exp };
        });

        const reportData = {
            dateRange: `${startDate || 'Start'} to ${endDate || 'End'}`,
            preparedBy: req.user.full_name || 'Admin',
            summary: { totalIncome, totalExpenses, netPosition, margin },
            paymentMethods,
            incomeDetails: incomeResult.rows,
            expenseDetails: expenseResult.rows
        };

        // 2. Generate PDF
        const reportsDir = path.join(__dirname, '../../public/reports');
        if (!fs.existsSync(reportsDir)) {
            fs.mkdirSync(reportsDir, { recursive: true });
        }

        const fileName = `Financial_Report_${startDate || 'all'}_${endDate || 'all'}.pdf`;
        const filePath = path.join(reportsDir, fileName);

        await generateFinancialReportPDF(reportData, filePath);

        res.download(filePath, fileName);

    } catch (error) {
        console.error('Download financial report error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error generating report'
        });
    }
};

module.exports = {
    downloadFinancialReport
};
