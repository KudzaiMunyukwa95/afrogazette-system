// Zimbabwe mobile number normalization — reps type numbers as 0771234567,
// 077 123 4567, +263771234567, or 263771234567 interchangeably. Everything
// is normalized to a single canonical form (+263XXXXXXXXX) so phone-based
// client matching actually works instead of missing matches on formatting
// differences alone.

const ZIM_MOBILE_PREFIXES = ['71', '73', '77', '78'];

// Returns the canonical +263XXXXXXXXX form, or null if the input isn't a
// recognizable Zimbabwean mobile number.
const normalizeZimPhone = (input) => {
  if (!input) return null;
  let digits = String(input).replace(/[^\d]/g, '');

  if (digits.startsWith('00263')) digits = digits.slice(5);
  else if (digits.startsWith('263')) digits = digits.slice(3);
  else if (digits.startsWith('0')) digits = digits.slice(1);

  // digits should now be 9 digits: prefix (2) + subscriber number (7)
  if (digits.length !== 9) return null;
  if (!ZIM_MOBILE_PREFIXES.includes(digits.slice(0, 2))) return null;

  return `+263${digits}`;
};

const isValidZimPhone = (input) => normalizeZimPhone(input) !== null;

// For display: +263771234567 -> 077 123 4567
const formatZimPhoneForDisplay = (normalized) => {
  if (!normalized || !normalized.startsWith('+263')) return normalized || '';
  const digits = normalized.slice(4);
  return `0${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5)}`;
};

module.exports = { normalizeZimPhone, isValidZimPhone, formatZimPhoneForDisplay };
