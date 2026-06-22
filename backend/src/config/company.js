// Centralised AfroGazette company / tax details used on invoices and other
// outbound documents. Values can be overridden via environment variables so
// production values (especially the VAT number) don't have to live in code.

const company = {
    legalName: process.env.COMPANY_LEGAL_NAME || 'AFRO GAZETTE',
    tradeName: process.env.COMPANY_TRADE_NAME || 'Afro Gazette',
    registrationNumber: process.env.COMPANY_REG_NUMBER || '18661/2021',
    tin: process.env.COMPANY_TIN || '2001743610',
    // VAT registration: leave empty if not VAT-registered. When empty,
    // invoices will omit the VAT line and print a "Not VAT-registered" note.
    vatNumber: process.env.COMPANY_VAT_NUMBER || '',
    vatRate: parseFloat(process.env.COMPANY_VAT_RATE || '0'), // e.g. 0.15 for 15%
    address: {
        line1: process.env.COMPANY_ADDR_LINE1 || 'Office 4, Karimapondo Building',
        line2: process.env.COMPANY_ADDR_LINE2 || '78 Leopold Takawira',
        city: process.env.COMPANY_ADDR_CITY || 'Harare',
        country: process.env.COMPANY_ADDR_COUNTRY || 'Zimbabwe'
    },
    phone: process.env.COMPANY_PHONE || '+263 77 8826661',
    email: process.env.COMPANY_EMAIL || 'support@afrogazette.co.zw',
    website: process.env.COMPANY_WEBSITE || 'www.afrogazette.co.zw',
    currency: process.env.COMPANY_CURRENCY || 'USD'
};

module.exports = company;
