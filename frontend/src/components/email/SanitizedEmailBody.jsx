import React, { useMemo } from 'react';
import { sanitizeEmailHtml } from '../../utils/sanitize';

export default function SanitizedEmailBody({ bodyHtml, bodyText }) {
  const sanitized = useMemo(() => {
    if (bodyHtml) {
      return sanitizeEmailHtml(bodyHtml);
    }
    if (bodyText) {
      const escaped = bodyText
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      return `<div style="white-space: pre-wrap; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">${escaped}</div>`;
    }
    return '<p class="text-nexora-muted italic">This email has no text content.</p>';
  }, [bodyHtml, bodyText]);

  return (
    <div
      className="email-content-rendered prose dark:prose-invert max-w-none text-sm text-gray-800 dark:text-gray-200"
      dangerouslySetInnerHTML={{ __html: sanitized }}
    />
  );
}
