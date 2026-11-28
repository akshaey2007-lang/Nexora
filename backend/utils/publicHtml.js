import fs from 'fs';
import path from 'path';

function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const HOME_HTML = `
  <div style="font-family:Inter,-apple-system,BlinkMacSystemFont,sans-serif;max-width:960px;margin:0 auto;padding:32px 20px;color:#0f172a;line-height:1.6;">
    <header style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #e2e8f0;padding-bottom:16px;margin-bottom:40px;">
      <strong style="font-size:18px;">NEXORA MAIL</strong>
      <nav style="display:flex;gap:16px;font-size:14px;">
        <a href="/privacy" style="color:#4f46e5;">Privacy Policy</a>
        <a href="/terms" style="color:#4f46e5;">Terms of Service</a>
      </nav>
    </header>
    <main>
      <h1 style="font-size:36px;margin-bottom:16px;">NEXORA MAIL — Focused Gmail Management Workspace</h1>
      <p style="font-size:16px;color:#475569;margin-bottom:24px;">
        NEXORA MAIL is a web-based email management application built on the official Google Gmail API.
        It gives users a fast, distraction-free interface to read, compose, reply, forward, search, star, archive, and organize their Gmail messages securely.
      </p>
      <section style="margin-bottom:28px;">
        <h2 style="font-size:20px;margin-bottom:10px;">Purpose &amp; Core Capabilities</h2>
        <ul>
          <li>Synchronize and manage Gmail folders including Inbox, Starred, Important, Sent, Drafts, Archive, Spam, Trash, and custom labels.</li>
          <li>Compose and send rich-text emails with attachments via server-side RFC 2822 MIME formatting.</li>
          <li>Search messages using Gmail query operators and perform bulk triage actions (mark read/unread, star, archive, trash, restore).</li>
          <li>Protect user credentials using AES-256-GCM encryption and HTTP-only session cookies, with zero disk storage of attachments.</li>
        </ul>
      </section>
      <section style="margin-bottom:28px;">
        <h2 style="font-size:20px;margin-bottom:10px;">Google API Data Usage &amp; Privacy</h2>
        <p style="color:#475569;">
          NEXORA MAIL requests only the minimum OAuth scopes required (<code>openid</code>, <code>userinfo.email</code>, <code>userinfo.profile</code>, and <code>https://www.googleapis.com/auth/gmail.modify</code>).
          Your Gmail content is never sold, shared with third parties, or used for advertising or AI model training, and complies with Google API Services User Data Policy (including Limited Use requirements).
        </p>
        <p style="margin-top:12px;">
          Read our full <a href="/privacy" style="color:#4f46e5;font-weight:600;">Privacy Policy</a> and <a href="/terms" style="color:#4f46e5;font-weight:600;">Terms of Service</a>.
        </p>
      </section>
    </main>
    <footer style="border-top:1px solid #e2e8f0;padding-top:16px;margin-top:40px;font-size:13px;color:#64748b;">
      &copy; 2026 NEXORA MAIL &bull; <a href="/privacy" style="color:#4f46e5;">Privacy Policy</a> &bull; <a href="/terms" style="color:#4f46e5;">Terms of Service</a>
    </footer>
  </div>
`;

const PRIVACY_HTML = `
  <div style="font-family:Inter,-apple-system,BlinkMacSystemFont,sans-serif;max-width:780px;margin:0 auto;padding:32px 20px;color:#0f172a;line-height:1.65;">
    <header style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #e2e8f0;padding-bottom:16px;margin-bottom:32px;">
      <a href="/" style="font-weight:700;font-size:16px;color:#0f172a;text-decoration:none;">NEXORA MAIL</a>
      <a href="/" style="font-size:13px;color:#4f46e5;">Back to Home</a>
    </header>
    <main>
      <h1 style="font-size:28px;margin-bottom:8px;">Privacy Policy — NEXORA MAIL</h1>
      <p style="font-size:13px;color:#64748b;margin-bottom:24px;">Effective Date: November 26, 2026</p>
      <h2>1. Information We Access</h2>
      <p>When you sign in to NEXORA MAIL with Google OAuth 2.0, we access only the minimum scopes needed to operate your email workspace: <code>openid</code>, <code>userinfo.email</code>, <code>userinfo.profile</code>, and <code>https://www.googleapis.com/auth/gmail.modify</code>.</p>
      <h2>2. How We Use &amp; Protect Your Data</h2>
      <ul>
        <li><strong>Gmail Remains Source of Truth:</strong> NEXORA MAIL retrieves messages directly from Gmail and does not permanently store incoming emails or attachments. Only user-confirmed Scheduled Emails are stored in MongoDB until dispatched via Gmail API or deleted.</li>
        <li><strong>Local On-Device AI:</strong> NEXORA AI processes writing and smart-reply requests locally inside your browser via WebLLM/WebGPU without transmitting mailbox data to external AI APIs.</li>
        <li><strong>Encrypted Storage:</strong> OAuth refresh and access tokens are encrypted at rest with AES-256-GCM and bound to HTTP-only session cookies.</li>
        <li><strong>No Third-Party Sharing or AI Training:</strong> We never sell, share, rent, or transfer Google user data to third parties, advertisers, or machine learning models.</li>
      </ul>
      <h2>3. Google API Services User Data Policy (Limited Use)</h2>
      <p>NEXORA MAIL's use and transfer to any other app of information received from Google APIs will adhere to the <a href="https://developers.google.com/terms/api-services-user-data-policy">Google API Services User Data Policy</a>, including the Limited Use requirements.</p>
      <h2>4. Revoking Access &amp; Data Deletion</h2>
      <p>You can disconnect your account anytime inside NEXORA MAIL (Settings &rarr; Disconnect) or revoke permissions at <a href="https://myaccount.google.com/permissions">myaccount.google.com/permissions</a>.</p>
      <h2>5. Contact</h2>
      <p>Developer Contact: <a href="mailto:akshaey2007@gmail.com">akshaey2007@gmail.com</a></p>
    </main>
  </div>
`;

const TERMS_HTML = `
  <div style="font-family:Inter,-apple-system,BlinkMacSystemFont,sans-serif;max-width:780px;margin:0 auto;padding:32px 20px;color:#0f172a;line-height:1.65;">
    <header style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #e2e8f0;padding-bottom:16px;margin-bottom:32px;">
      <a href="/" style="font-weight:700;font-size:16px;color:#0f172a;text-decoration:none;">NEXORA MAIL</a>
      <a href="/" style="font-size:13px;color:#4f46e5;">Back to Home</a>
    </header>
    <main>
      <h1 style="font-size:28px;margin-bottom:8px;">Terms of Service — NEXORA MAIL</h1>
      <p style="font-size:13px;color:#64748b;margin-bottom:24px;">Effective Date: November 26, 2026</p>
      <h2>1. Acceptance of Terms</h2>
      <p>By connecting your Google account to NEXORA MAIL, you agree to use the service lawfully and in compliance with Google's Terms of Service.</p>
      <h2>2. Service Availability</h2>
      <p>NEXORA MAIL acts as an interface to the Google Gmail API and is provided as-is subject to API availability and quotas.</p>
      <h2>3. User Responsibilities</h2>
      <p>You remain responsible for safeguarding your Google credentials and all messages sent through your connected mailbox.</p>
      <h2>4. Contact</h2>
      <p>Developer Contact: <a href="mailto:akshaey2007@gmail.com">akshaey2007@gmail.com</a></p>
    </main>
  </div>
`;

let cachedTemplate = null;

function getTemplate(distPath) {
  const indexPath = path.join(distPath, 'index.html');
  if (!cachedTemplate || process.env.NODE_ENV !== 'production') {
    cachedTemplate = fs.readFileSync(indexPath, 'utf-8');
  }
  return cachedTemplate;
}

export function renderSpaWithPublicFallback(distPath, routePath, baseUrl = 'https://nexora-mail-nopu.onrender.com') {
  let html = getTemplate(distPath);
  const cleanBase = baseUrl.replace(/\/$/, '');

  // Inject Google Search Console meta verification tag if configured via env var
  let siteVerify = (process.env.GOOGLE_SITE_VERIFICATION || '').trim();
  const extraHeadTags = [];

  if (siteVerify) {
    // Support either raw token or full <meta name="google-site-verification" content="..." /> tag
    const contentMatch = siteVerify.match(/content=["']([^"']+)["']/i);
    if (contentMatch) {
      siteVerify = contentMatch[1].trim();
    }
    extraHeadTags.push(`<meta name="google-site-verification" content="${escapeHtml(siteVerify)}" />`);
  }

  let fallbackBody = '';
  let pageTitle = 'NEXORA MAIL';
  let pageDescription =
    'NEXORA MAIL is an email management web application built on the official Google Gmail API for reading, composing, searching, and organizing Gmail.';
  let isIndexable = false;

  if (routePath === '/privacy') {
    fallbackBody = PRIVACY_HTML;
    pageTitle = 'Privacy Policy — NEXORA MAIL';
    pageDescription = 'Privacy Policy and Google API Limited Use compliance for NEXORA MAIL.';
    isIndexable = true;
  } else if (routePath === '/terms') {
    fallbackBody = TERMS_HTML;
    pageTitle = 'Terms of Service — NEXORA MAIL';
    pageDescription = 'Terms of Service for using the NEXORA MAIL web application.';
    isIndexable = true;
  } else if (routePath === '/') {
    fallbackBody = HOME_HTML;
    pageTitle = 'NEXORA MAIL — Focused Gmail Management Workspace';
    isIndexable = true;
  }

  if (isIndexable) {
    const canonicalUrl = `${cleanBase}${routePath === '/' ? '/' : routePath}`;
    extraHeadTags.push(`<meta name="robots" content="index, follow" />`);
    extraHeadTags.push(`<link rel="canonical" href="${escapeHtml(canonicalUrl)}" />`);
    extraHeadTags.push(`<meta property="og:type" content="website" />`);
    extraHeadTags.push(`<meta property="og:site_name" content="NEXORA MAIL" />`);
    extraHeadTags.push(`<meta property="og:title" content="${escapeHtml(pageTitle)}" />`);
    extraHeadTags.push(`<meta property="og:description" content="${escapeHtml(pageDescription)}" />`);
    extraHeadTags.push(`<meta property="og:url" content="${escapeHtml(canonicalUrl)}" />`);
    extraHeadTags.push(`<meta property="og:image" content="${escapeHtml(cleanBase)}/nexora-icon.png" />`);
    extraHeadTags.push(`<meta name="twitter:card" content="summary" />`);
    extraHeadTags.push(`<meta name="twitter:title" content="${escapeHtml(pageTitle)}" />`);
    extraHeadTags.push(`<meta name="twitter:description" content="${escapeHtml(pageDescription)}" />`);
    extraHeadTags.push(`<meta name="twitter:image" content="${escapeHtml(cleanBase)}/nexora-icon.png" />`);

    if (routePath === '/') {
      const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: 'NEXORA MAIL',
        applicationCategory: 'CommunicationApplication',
        operatingSystem: 'Web',
        url: cleanBase,
        description: pageDescription
      };
      extraHeadTags.push(`<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>`);
    }
  } else {
    extraHeadTags.push(`<meta name="robots" content="noindex, nofollow" />`);
  }

  if (extraHeadTags.length > 0) {
    html = html.replace('</head>', `    ${extraHeadTags.join('\n    ')}\n  </head>`);
  }

  if (fallbackBody) {
    html = html.replace(/<title>.*?<\/title>/, `<title>${pageTitle}</title>`);
    html = html.replace('<div id="root"></div>', `<div id="root">${fallbackBody}</div>`);
  }

  return html;
}
