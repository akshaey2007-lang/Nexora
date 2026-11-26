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
      return `<div style="white-space: pre-wrap; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #0f172a;">${escaped}</div>`;
    }
    return '<p style="color:#64748b;font-style:italic;">This email has no text content.</p>';
  }, [bodyHtml, bodyText]);

  return (
    <div className="bg-white rounded-xl border border-nexora-border dark:border-nexora-border-dark p-4 sm:p-6 shadow-nexora-xs">
      <div
        className="email-content-rendered max-w-none text-sm text-slate-900"
        dangerouslySetInnerHTML={{ __html: sanitized }}
      />
    </div>
  );
}
