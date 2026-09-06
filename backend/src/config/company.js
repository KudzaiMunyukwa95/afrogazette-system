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
    // Banking details printed on quotations so a corporate client can raise a
    // payment without phoning to ask where to send it. Every line is
    // env-overridable and any line left empty is dropped from the document —
    // a page a client pays against must never carry a placeholder, so the
    // whole payment block disappears rather than print a blank field.
    bank: {
        name: process.env.COMPANY_BANK_NAME || 'First Capital Bank',
        branch: process.env.COMPANY_BANK_BRANCH || '',
        // The account is a personal one, not an account in the company's
        // name. It is printed exactly as the bank holds it: a payer's
        // beneficiary-name check compares this against the account, and a
        // mismatch stalls the payment — so this must never be "corrected"
        // to the trading name to make the document read more tidily.
        accountName: process.env.COMPANY_BANK_ACCOUNT_NAME || 'KUDZAI MUNYUKWA',
        accountNumber: process.env.COMPANY_BANK_ACCOUNT_NUMBER || '19002677897',
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
