/**
 * Escapes HTML special characters to prevent XSS.
 * Shared across all UI modules.
 */
export function escHtml (str) {
  return String(str).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]))
}
