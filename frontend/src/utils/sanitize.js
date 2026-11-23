import DOMPurify from 'dompurify';

/**
 * Sanitizes untrusted email HTML content to prevent XSS attacks while keeping email formatting intact.
 */
export function sanitizeEmailHtml(rawHtml) {
  if (!rawHtml) return '';

  return DOMPurify.sanitize(rawHtml, {
    USE_PROFILES: { html: true },
    ADD_ATTR: ['target', 'style', 'class', 'align', 'valign', 'bgcolor', 'border', 'cellpadding', 'cellspacing', 'width', 'height'],
    ADD_TAGS: ['style', 'font', 'center'],
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input', 'button'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover']
  });
}
