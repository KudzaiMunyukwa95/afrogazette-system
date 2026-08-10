// Renders WhatsApp's lightweight formatting syntax (*bold*, _italic_) as real
// HTML for on-screen preview only. The raw string — asterisks and
// underscores intact — is what actually gets copied to the clipboard, since
// that's what WhatsApp itself parses on paste.
const escapeHtml = (str) =>
  str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

export const whatsAppToHtml = (text) => {
  if (!text) return '';
  let escaped = escapeHtml(text);
  escaped = escaped.replace(/\*(.+?)\*/g, '<strong>$1</strong>');
  escaped = escaped.replace(/_(.+?)_/g, '<em>$1</em>');
  return escaped.replace(/\n/g, '<br />');
};
