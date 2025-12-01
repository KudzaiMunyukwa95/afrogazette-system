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
                margin: 40,
                size: 'A4',
                bufferPages: true,
                autoFirstPage: true
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

            const pageWidth = doc.page.width;
            const pageHeight = doc.page.height;
            const marginX = 40;

            // --- HEADER FUNCTION (Repeated on new pages) ---
            const drawHeader = () => {
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
                doc.text('AfroGazette', marginX, headerY, { align: 'right', width: pageWidth - 2 * marginX });
                headerY += 12;
                doc.text('Office 4, Karimapondo Building', marginX, headerY, { align: 'right', width: pageWidth - 2 * marginX });
                headerY += 12;
                doc.text('78 Leopold Takawira, Harare, Zimbabwe', marginX, headerY, { align: 'right', width: pageWidth - 2 * marginX });
                headerY += 12;
                doc.text('support@afrogazette.co.zw | +263 77 8826661', marginX, headerY, { align: 'right', width: pageWidth - 2 * marginX });
            };

            // Draw initial header
            drawHeader();

            // --- REPORT TITLE ---
            let currentY = 110;
            doc.font('Helvetica-Bold').fontSize(24).fillColor(TEXT_DARK);
            doc.text('Financial Report', marginX, currentY);

            currentY += 30;
            doc.font('Helvetica').fontSize(12).fillColor(TEXT_GRAY);
            doc.text(`Reporting Period: ${reportData.dateRange}`, marginX, currentY);

            currentY += 20;
            doc.font('Helvetica').fontSize(10).fillColor(TEXT_GRAY);
            doc.text(`Generated on: ${new Date().toLocaleDateString()} | Prepared by: ${reportData.preparedBy}`, marginX, currentY);

            // --- EXECUTIVE SUMMARY ---
            currentY += 40;
            doc.font('Helvetica-Bold').fontSize(14).fillColor(TEXT_DARK).text('Executive Summary', marginX, currentY);
            doc.rect(marginX, currentY + 20, pageWidth - 2 * marginX, 2).fill(BRAND_RED);

            currentY += 40;

            // Summary Cards (simulated with text)
            const cardWidth = (pageWidth - 2 * marginX) / 4;

            // Total Income
            doc.font('Helvetica').fontSize(10).fillColor(TEXT_GRAY).text('Total Income', marginX, currentY);
            doc.font('Helvetica-Bold').fontSize(14).fillColor(TEXT_DARK).text(`$${reportData.summary.totalIncome.toFixed(2)}`, marginX, currentY + 15);

            // Total Expenses
            doc.font('Helvetica').fontSize(10).fillColor(TEXT_GRAY).text('Total Expenses', marginX + cardWidth, currentY);
            doc.font('Helvetica-Bold').fontSize(14).fillColor(TEXT_DARK).text(`$${reportData.summary.totalExpenses.toFixed(2)}`, marginX + cardWidth, currentY + 15);

            // Net Position
            doc.font('Helvetica').fontSize(10).fillColor(TEXT_GRAY).text('Net Position', marginX + cardWidth * 2, currentY);
            const netColor = reportData.summary.netPosition >= 0 ? '#059669' : '#DC2626'; // Green or Red
            doc.font('Helvetica-Bold').fontSize(14).fillColor(netColor).text(`$${reportData.summary.netPosition.toFixed(2)}`, marginX + cardWidth * 2, currentY + 15);

            // Margin
            doc.font('Helvetica').fontSize(10).fillColor(TEXT_GRAY).text('Net Margin', marginX + cardWidth * 3, currentY);
            doc.font('Helvetica-Bold').fontSize(14).fillColor(TEXT_DARK).text(`${reportData.summary.margin.toFixed(1)}%`, marginX + cardWidth * 3, currentY + 15);

            currentY += 60;

            // --- PAYMENT METHOD SUMMARY ---
            doc.font('Helvetica-Bold').fontSize(14).fillColor(TEXT_DARK).text('Summary by Payment Method', marginX, currentY);
            doc.rect(marginX, currentY + 20, pageWidth - 2 * marginX, 1).fill(BORDER_COLOR);

            currentY += 35;

            // Table Header
            doc.rect(marginX, currentY, pageWidth - 2 * marginX, 25).fill(TABLE_HEADER_BG);
            doc.font('Helvetica-Bold').fontSize(10).fillColor(TEXT_DARK);
            doc.text('METHOD', marginX + 10, currentY + 8);
            doc.text('INCOME', marginX + 150, currentY + 8, { align: 'right', width: 80 });
            doc.text('EXPENSE', marginX + 250, currentY + 8, { align: 'right', width: 80 });
            doc.text('NET', marginX + 350, currentY + 8, { align: 'right', width: 80 });

            currentY += 30;

            // Table Rows
            doc.font('Helvetica').fontSize(10).fillColor(TEXT_DARK);
            reportData.paymentMethods.forEach(pm => {
                doc.text(pm.method, marginX + 10, currentY);
                doc.text(`$${pm.income.toFixed(2)}`, marginX + 150, currentY, { align: 'right', width: 80 });
                doc.text(`$${pm.expense.toFixed(2)}`, marginX + 250, currentY, { align: 'right', width: 80 });

                const netVal = pm.income - pm.expense;
                const netCol = netVal >= 0 ? '#059669' : '#DC2626';
                doc.fillColor(netCol).text(`$${netVal.toFixed(2)}`, marginX + 350, currentY, { align: 'right', width: 80 });
                doc.fillColor(TEXT_DARK); // Reset color

                currentY += 20;
                doc.moveTo(marginX, currentY - 5).lineTo(pageWidth - marginX, currentY - 5).strokeColor(BORDER_COLOR).stroke();
            });

            currentY += 40;

            // --- INCOME SECTION ---
            if (currentY > pageHeight - 150) { doc.addPage(); drawHeader(); currentY = 110; }

            doc.font('Helvetica-Bold').fontSize(14).fillColor(TEXT_DARK).text('Income Details', marginX, currentY);
            doc.rect(marginX, currentY + 20, pageWidth - 2 * marginX, 1).fill(BORDER_COLOR);
            currentY += 35;

            // Income Table Header
            doc.rect(marginX, currentY, pageWidth - 2 * marginX, 25).fill(TABLE_HEADER_BG);
            doc.font('Helvetica-Bold').fontSize(9).fillColor(TEXT_DARK);
            doc.text('DATE', marginX + 10, currentY + 8);
            doc.text('CLIENT / DESCRIPTION', marginX + 80, currentY + 8);
            doc.text('METHOD', marginX + 350, currentY + 8);
            doc.text('AMOUNT', pageWidth - marginX - 90, currentY + 8, { align: 'right', width: 80 });

            currentY += 30;

            // Income Rows
            doc.font('Helvetica').fontSize(9).fillColor(TEXT_DARK);
            reportData.incomeDetails.forEach(item => {
                if (currentY > pageHeight - 50) { doc.addPage(); drawHeader(); currentY = 110; }

                doc.text(new Date(item.date).toLocaleDateString(), marginX + 10, currentY);
                doc.text(item.description.substring(0, 45), marginX + 80, currentY);
                doc.text(item.method, marginX + 350, currentY);
                doc.text(`$${parseFloat(item.amount).toFixed(2)}`, pageWidth - marginX - 90, currentY, { align: 'right', width: 80 });

                currentY += 18;
                doc.moveTo(marginX, currentY - 5).lineTo(pageWidth - marginX, currentY - 5).strokeColor(BORDER_COLOR).stroke();
            });

            currentY += 40;

            // --- EXPENSES SECTION ---
            if (currentY > pageHeight - 150) { doc.addPage(); drawHeader(); currentY = 110; }

            doc.font('Helvetica-Bold').fontSize(14).fillColor(TEXT_DARK).text('Expense Details', marginX, currentY);
            doc.rect(marginX, currentY + 20, pageWidth - 2 * marginX, 1).fill(BORDER_COLOR);
            currentY += 35;

            // Expense Table Header
            doc.rect(marginX, currentY, pageWidth - 2 * marginX, 25).fill(TABLE_HEADER_BG);
            doc.font('Helvetica-Bold').fontSize(9).fillColor(TEXT_DARK);
            doc.text('DATE', marginX + 10, currentY + 8);
            doc.text('REASON', marginX + 80, currentY + 8);
            doc.text('CATEGORY', marginX + 250, currentY + 8);
            doc.text('METHOD', marginX + 350, currentY + 8);
            doc.text('AMOUNT', pageWidth - marginX - 90, currentY + 8, { align: 'right', width: 80 });

            currentY += 30;

            // Expense Rows
            doc.font('Helvetica').fontSize(9).fillColor(TEXT_DARK);
            reportData.expenseDetails.forEach(item => {
                if (currentY > pageHeight - 50) { doc.addPage(); drawHeader(); currentY = 110; }

                doc.text(new Date(item.date).toLocaleDateString(), marginX + 10, currentY);
                doc.text(item.reason.substring(0, 30), marginX + 80, currentY);
                doc.text(item.category || '-', marginX + 250, currentY);
                doc.text(item.method, marginX + 350, currentY);
                doc.text(`$${parseFloat(item.amount).toFixed(2)}`, pageWidth - marginX - 90, currentY, { align: 'right', width: 80 });

                currentY += 18;
                doc.moveTo(marginX, currentY - 5).lineTo(pageWidth - marginX, currentY - 5).strokeColor(BORDER_COLOR).stroke();
            });

            // --- FOOTER (On every page) ---
            const range = doc.bufferedPageRange();
            for (let i = range.start; i < range.start + range.count; i++) {
                doc.switchToPage(i);

                const footerY = pageHeight - 40;
                doc.font('Helvetica-Oblique').fontSize(8).fillColor(TEXT_GRAY);
                doc.text('Internal Financial Report – For Management Use Only', marginX, footerY, { align: 'center', width: pageWidth - 2 * marginX });
                doc.text(`Page ${i + 1} of ${range.count}`, marginX, footerY + 12, { align: 'center', width: pageWidth - 2 * marginX });
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

        // 1. Fetch Data
        // ... (Logic to fetch income and expense details similar to financeController but detailed lists)

        // Fetch Income Details
        let incomeQuery = `
            SELECT i.generated_at as date, c.company as description, a.payment_method as method, i.amount
            FROM invoices i
            JOIN adverts a ON i.advert_id = a.id
            LEFT JOIN clients c ON a.client_id = c.id
            WHERE 1=1
        `;
        const params = [];
        let paramCount = 1;
        if (startDate) { incomeQuery += ` AND i.generated_at >= $${paramCount}`; params.push(startDate); paramCount++; }
        if (endDate) { incomeQuery += ` AND i.generated_at < $${paramCount}::date + INTERVAL '1 day'`; params.push(endDate); paramCount++; }
        incomeQuery += ` ORDER BY i.generated_at DESC`;
        const incomeResult = await pool.query(incomeQuery, params);

        // Fetch Expense Details
        let expenseQuery = `
            SELECT created_at as date, reason, category, payment_method as method, amount
            FROM expenses
            WHERE status = 'Approved'
        `;
        // Reuse params as they are the same for date filtering
        let expParamCount = 1;
        if (startDate) { expenseQuery += ` AND created_at >= $${expParamCount}`; expParamCount++; }
        if (endDate) { expenseQuery += ` AND created_at < $${expParamCount}::date + INTERVAL '1 day'`; expParamCount++; }
        expenseQuery += ` ORDER BY created_at DESC`;
        const expenseResult = await pool.query(expenseQuery, params);

        // Calculate Summary
        const totalIncome = incomeResult.rows.reduce((sum, item) => sum + parseFloat(item.amount), 0);
        const totalExpenses = expenseResult.rows.reduce((sum, item) => sum + parseFloat(item.amount), 0);
        const netPosition = totalIncome - totalExpenses;
        const margin = totalIncome > 0 ? (netPosition / totalIncome) * 100 : 0;

        // Calculate Payment Method Summary
        const methods = ['Cash', 'EcoCash', 'Innbucks'];
        const paymentMethods = methods.map(method => {
            const inc = incomeResult.rows.filter(i => i.method === method).reduce((s, i) => s + parseFloat(i.amount), 0);
            const exp = expenseResult.rows.filter(e => e.method === method).reduce((s, e) => s + parseFloat(e.amount), 0);
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
