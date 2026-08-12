const fs = require('fs');
const path = require('path');
const SVGtoPDF = require('svg-to-pdfkit');

// Lives inside backend/src/assets — the backend and frontend deploy as
// separate Docker services on Coolify, so a path reaching into
// frontend/public (as the financial-report PDF used to) resolves to
// nothing in the deployed backend container even though it works in a
// local monorepo checkout. Assets referenced by backend-generated PDFs
// must live inside the backend's own build context.
const SVG_PATH = path.join(__dirname, '../assets/logo.svg');
const PNG_PATH = path.join(__dirname, '../assets/logo.png');

/**
 * Draws the AfroGazette logo at (x, y), preferring the SVG, falling back to
 * PNG, falling back to a styled text wordmark if neither asset is present.
 * Shared by every PDF generator so the logo can't silently diverge between
 * documents the way it did between invoices and financial reports.
 */
const renderLogo = (doc, x, y, maxWidth, maxHeight, { fallbackTextColor = '#FFFFFF', brandRed = '#E53939' } = {}) => {
    if (fs.existsSync(SVG_PATH)) {
        try {
            let svg = fs.readFileSync(SVG_PATH, 'utf8').replace(/<image[^>]*>/g, '');
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
    if (fs.existsSync(PNG_PATH)) {
        try {
            doc.image(PNG_PATH, x, y, { fit: [maxWidth, maxHeight] });
            return true;
        } catch (err) {
            console.error('PNG logo render failed:', err.message);
        }
    }
    // Text fallback — only reached if both asset files are genuinely missing
    doc.font('Helvetica-Bold').fontSize(22).fillColor(brandRed).text('afro', x, y + 4, { continued: true });
    doc.fillColor(fallbackTextColor).text('gazette');
    return false;
};

module.exports = { renderLogo };
