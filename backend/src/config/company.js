// Centralised AfroGazette company / tax details used on invoices and other
// outbound documents. Values can be overridden via environment variables so
// production values don't have to live in code.
//
// There is deliberately no VAT field here. AfroGazette is registered for
// income tax only, not VAT, so no outbound document may carry a VAT number
// or a VAT line. A COMPANY_VAT_NUMBER env var was once read here and had
// been set on the production server to the company registration number,
// which printed "VAT Registration No: 18661/2021" on live client quotations
// — a VAT registration the business does not hold. Reading no such variable
// at all is what makes that unrepeatable; do not reintroduce one without a
// real VAT registration certificate to put behind it.

const company = {
    legalName: process.env.COMPANY_LEGAL_NAME || 'AFRO GAZETTE',
    tradeName: process.env.COMPANY_TRADE_NAME || 'Afro Gazette',
    registrationNumber: process.env.COMPANY_REG_NUMBER || '18661/2021',
    tin: process.env.COMPANY_TIN || '2001743610',
    address: {
        line1: process.env.COMPANY_ADDR_LINE1 || 'Office 4, Karimapondo Building',
        line2: process.env.COMPANY_ADDR_LINE2 || '78 Leopold Takawira',
        city: process.env.COMPANY_ADDR_CITY || 'Harare',
        country: process.env.COMPANY_ADDR_COUNTRY || 'Zimbabwe'
    },
    phone: process.env.COMPANY_PHONE || '+263 77 8826661',
    email: process.env.COMPANY_EMAIL || 'support@afrogazette.co.zw',
    website: process.env.COMPANY_WEBSITE || 'www.afrogazette.co.zw',
    currency: process.env.COMPANY_CURRENCY || 'USD',
    // Banking details for quotations. Deliberately unset: the only account
    // available today is a personal one, and a client-facing document from a
    // registered company should not direct payment into an individual's
    // account — a corporate payer's beneficiary-name check flags exactly that
    // mismatch. Until a business account exists, quotations say how to
    // request the details instead (see quotationController).
    //
    // Fill these in via the environment when the business account opens and
    // the payment block starts printing on its own; no code change needed.
    // Any single line left empty is simply dropped from the document.
    bank: {
        name: process.env.COMPANY_BANK_NAME || '',
        branch: process.env.COMPANY_BANK_BRANCH || '',
        // Must be the exact name the bank holds the account in: a payer's
        // beneficiary-name check compares this string against the account,
        // and a mismatch stalls the payment. Never "tidy" it to the trading
        // name to make the document read better.
        accountName: process.env.COMPANY_BANK_ACCOUNT_NAME || '',
        accountNumber: process.env.COMPANY_BANK_ACCOUNT_NUMBER || '',
        swift: process.env.COMPANY_BANK_SWIFT || ''
    },
    // Free text, e.g. 'EcoCash 0778826661 (Afro Gazette)'. Omitted when unset.
    mobileMoney: process.env.COMPANY_MOBILE_MONEY || ''
};

/**
 * True when at least one banking field is configured. Used to decide whether
 * to draw the payment block at all rather than printing an empty panel.
 */
company.hasPaymentDetails = Boolean(
    company.bank.name || company.bank.accountNumber || company.bank.accountName || company.mobileMoney
);

module.exports = company;
