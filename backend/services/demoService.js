import { logger } from '../utils/logger.js';

/**
 * In-Memory Demo Email Store
 * Explicitly labelled for offline evaluation and preview.
 * Allows all actions (read, unread, star, trash, restore, compose, drafts, search)
 * so that users can evaluate the full application without waiting for Google Cloud review!
 */

const INITIAL_DEMO_EMAILS = [
  {
    id: 'demo-msg-001',
    threadId: 'demo-thread-001',
    from: 'NEXORA Platform <welcome@nexoramail.com>',
    fromName: 'NEXORA Platform',
    fromEmail: 'welcome@nexoramail.com',
    to: 'alex.mercer@nexoramail.com',
    subject: 'Welcome to NEXORA MAIL — Your Enterprise Email Command Center',
    snippet: 'Welcome aboard! Experience high-performance Gmail management, real-time message categorization, and enterprise encryption.',
    bodyHtml: `
      <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #17243B; line-height: 1.6; max-width: 600px; padding: 24px; background: #ffffff; border-radius: 12px; border: 1px solid #E8EBF2;">
        <div style="margin-bottom: 24px; padding-bottom: 16px; border-bottom: 2px solid #536DFE;">
          <h1 style="color: #17243B; font-size: 24px; font-weight: 700; margin: 0 0 8px 0;">Welcome to NEXORA MAIL</h1>
          <p style="color: #536DFE; font-size: 14px; font-weight: 600; margin: 0;">Enterprise-Grade Gmail Client</p>
        </div>
        <p style="font-size: 15px; color: #374151;">Hello Alex,</p>
        <p style="font-size: 15px; color: #374151;">We are thrilled to welcome you to <strong>NEXORA MAIL</strong> — built specifically for speed, executive clarity, and secure Google Workspace communication.</p>
        
        <div style="background: #F7F8FC; border-left: 4px solid #21A58B; padding: 16px; border-radius: 6px; margin: 20px 0;">
          <h4 style="margin: 0 0 8px 0; color: #17243B; font-size: 14px;">Key Capabilities Activated:</h4>
          <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #4B5563;">
            <li>Full Gmail API synchronization with server-side OAuth 2.0</li>
            <li>Zero disk storage of attachments and AES-256-GCM token encryption</li>
            <li>Instant message actions: star, archive, compose, and drafts</li>
            <li>Complete light/dark SaaS interface with responsive mobile drawer</li>
          </ul>
        </div>

        <p style="font-size: 14px; color: #6B7280;">To connect your live Gmail account at any time, navigate to <strong>Settings &rarr; Google Account</strong> and grant Gmail Modify permissions.</p>
        
        <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #E8EBF2; font-size: 13px; color: #8791A5;">
          <p style="margin: 0;">The NEXORA Engineering Team</p>
          <p style="margin: 4px 0 0 0;">Secure. Focused. Productive.</p>
        </div>
      </div>
    `,
    bodyText: 'Welcome aboard! Experience high-performance Gmail management, real-time message categorization, and enterprise encryption.',
    date: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    internalDate: (Date.now() - 1000 * 60 * 30).toString(),
    isUnread: true,
    isStarred: true,
    isImportant: true,
    isDraft: false,
    isTrash: false,
    isSpam: false,
    isSent: false,
    labels: ['INBOX', 'UNREAD', 'STARRED', 'IMPORTANT'],
    attachments: [
      {
        id: 'att-welcome-guide',
        filename: 'NEXORA_Getting_Started_Guide.pdf',
        mimeType: 'application/pdf',
        size: 345020
      }
    ],
    hasAttachments: true
  },
  {
    id: 'demo-msg-002',
    threadId: 'demo-thread-002',
    from: 'Elena Rostova <elena.rostova@acmecorp.io>',
    fromName: 'Elena Rostova',
    fromEmail: 'elena.rostova@acmecorp.io',
    to: 'alex.mercer@nexoramail.com',
    subject: 'Q3 Enterprise Architecture Roadmap Review',
    snippet: 'Alex, could you review the attached Kubernetes deployment blueprints before our sync tomorrow at 10:00 AM?',
    bodyHtml: `
      <div style="font-family: sans-serif; line-height: 1.5; color: #17243B;">
        <p>Hi Alex,</p>
        <p>Could you review the attached architecture blueprints before our engineering leadership sync tomorrow morning at 10:00 AM EST?</p>
        <p>Key areas we want feedback on:</p>
        <ol>
          <li>Distributed caching layer failover protocols.</li>
          <li>API gateway rate-limiting policies for external partner webhooks.</li>
          <li>Database connection pooling optimization under peak load.</li>
        </ol>
        <p>Let me know if you need any adjustments to the slide deck before the presentation.</p>
        <p>Best regards,<br><strong>Elena Rostova</strong><br>VP of Engineering, Acme Corp</p>
      </div>
    `,
    bodyText: 'Alex, could you review the attached Kubernetes deployment blueprints before our sync tomorrow at 10:00 AM?',
    date: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    internalDate: (Date.now() - 1000 * 60 * 60 * 3).toString(),
    isUnread: true,
    isStarred: false,
    isImportant: true,
    isDraft: false,
    isTrash: false,
    isSpam: false,
    isSent: false,
    labels: ['INBOX', 'UNREAD', 'IMPORTANT'],
    attachments: [
      {
        id: 'att-k8s-blueprint',
        filename: 'Q3_Architecture_Roadmap.pdf',
        mimeType: 'application/pdf',
        size: 1420950
      }
    ],
    hasAttachments: true
  },
  {
    id: 'demo-msg-003',
    threadId: 'demo-thread-003',
    from: 'Google Cloud Platform <cloud-noreply@google.com>',
    fromName: 'Google Cloud Platform',
    fromEmail: 'cloud-noreply@google.com',
    to: 'alex.mercer@nexoramail.com',
    subject: 'Security alert: New OAuth 2.0 Client credentials authorized',
    snippet: 'A new OAuth application (NEXORA MAIL) was successfully authorized to access Gmail modify scopes.',
    bodyHtml: `
      <div style="font-family: sans-serif; line-height: 1.5; color: #202124;">
        <h3 style="color: #1a73e8;">Google Cloud Security Notice</h3>
        <p>NEXORA MAIL has been granted access to your Google Account (alex.mercer@nexoramail.com).</p>
        <p>Scope requested: <code>https://www.googleapis.com/auth/gmail.modify</code></p>
        <p>If you authorized this application, no further action is required.</p>
      </div>
    `,
    bodyText: 'A new OAuth application (NEXORA MAIL) was successfully authorized to access Gmail modify scopes.',
    date: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
    internalDate: (Date.now() - 1000 * 60 * 60 * 12).toString(),
    isUnread: false,
    isStarred: true,
    isImportant: false,
    isDraft: false,
    isTrash: false,
    isSpam: false,
    isSent: false,
    labels: ['INBOX', 'STARRED'],
    attachments: [],
    hasAttachments: false
  },
  {
    id: 'demo-msg-004',
    threadId: 'demo-thread-004',
    from: 'Marcus Thorne <marcus@vanguardanalytics.ai>',
    fromName: 'Marcus Thorne',
    fromEmail: 'marcus@vanguardanalytics.ai',
    to: 'alex.mercer@nexoramail.com',
    subject: 'Partnership Agreement & NDA Draft',
    snippet: 'Attached is the mutual non-disclosure agreement for the upcoming collaborative analytics integration.',
    bodyHtml: `
      <div style="font-family: sans-serif; line-height: 1.5; color: #17243B;">
        <p>Hello Alex,</p>
        <p>Thank you for the productive conversation on Thursday. Attached you will find the revised mutual NDA and scope specification for the upcoming integration.</p>
        <p>Please review and let us know if your legal team has any comments or redlines.</p>
        <p>Cheers,<br>Marcus</p>
      </div>
    `,
    bodyText: 'Attached is the mutual non-disclosure agreement for the upcoming collaborative analytics integration.',
    date: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    internalDate: (Date.now() - 1000 * 60 * 60 * 24).toString(),
    isUnread: false,
    isStarred: false,
    isImportant: false,
    isDraft: false,
    isTrash: false,
    isSpam: false,
    isSent: false,
    labels: ['INBOX'],
    attachments: [
      {
        id: 'att-nda-agreement',
        filename: 'Mutual_NDA_Vanguard_NEXORA.docx',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        size: 589400
      }
    ],
    hasAttachments: true
  },
  {
    id: 'demo-sent-001',
    threadId: 'demo-thread-sent-001',
    from: 'alex.mercer@nexoramail.com',
    fromName: 'Alex Mercer',
    fromEmail: 'alex.mercer@nexoramail.com',
    to: 'sarah.connor@cyberdyne.org',
    subject: 'Re: Cloud Architecture & Deployment Milestones',
    snippet: 'Sarah, we have finalized the Render and MongoDB Atlas deployment pipeline. Everything is green.',
    bodyHtml: `
      <div style="font-family: sans-serif; line-height: 1.5; color: #17243B;">
        <p>Hi Sarah,</p>
        <p>We have finalized the Render and MongoDB Atlas deployment pipeline. All automated health checks and encryption tests are passing.</p>
        <p>Let's schedule the final live demonstration on Thursday at 2:00 PM.</p>
        <p>Best,<br>Alex</p>
      </div>
    `,
    bodyText: 'Sarah, we have finalized the Render and MongoDB Atlas deployment pipeline. Everything is green.',
    date: new Date(Date.now() - 1000 * 60 * 60 * 36).toISOString(),
    internalDate: (Date.now() - 1000 * 60 * 60 * 36).toString(),
    isUnread: false,
    isStarred: false,
    isImportant: false,
    isDraft: false,
    isTrash: false,
    isSpam: false,
    isSent: true,
    labels: ['SENT'],
    attachments: [],
    hasAttachments: false
  },
  {
    id: 'demo-draft-001',
    threadId: 'demo-thread-draft-001',
    from: 'alex.mercer@nexoramail.com',
    fromName: 'Alex Mercer',
    fromEmail: 'alex.mercer@nexoramail.com',
    to: 'investors@nexorafund.com',
    subject: 'NEXORA MAIL Seed Round Briefing Memo',
    snippet: 'Draft briefing memo regarding NEXORA MAIL product traction, Gmail API compliance, and Q4 targets.',
    bodyHtml: `
      <div style="font-family: sans-serif; line-height: 1.5; color: #17243B;">
        <p>Dear Investors,</p>
        <p>Here is an executive summary of our product roadmap, security architecture, and user milestones for NEXORA MAIL.</p>
        <p>[Draft in progress...]</p>
      </div>
    `,
    bodyText: 'Dear Investors, Here is an executive summary of our product roadmap...',
    date: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    internalDate: (Date.now() - 1000 * 60 * 60 * 5).toString(),
    isUnread: false,
    isStarred: false,
    isImportant: false,
    isDraft: true,
    isTrash: false,
    isSpam: false,
    isSent: false,
    labels: ['DRAFT'],
    attachments: [],
    hasAttachments: false
  }
];

class DemoEmailStore {
  constructor() {
    this.emails = JSON.parse(JSON.stringify(INITIAL_DEMO_EMAILS));
  }

  reset() {
    this.emails = JSON.parse(JSON.stringify(INITIAL_DEMO_EMAILS));
  }

  list({ folder = 'inbox', q = '' } = {}) {
    let filtered = this.emails.filter(e => {
      if (folder === 'inbox') return e.labels.includes('INBOX') && !e.isTrash && !e.isSpam;
      if (folder === 'sent') return e.isSent && !e.isTrash;
      if (folder === 'starred') return e.isStarred && !e.isTrash;
      if (folder === 'drafts') return e.isDraft && !e.isTrash;
      if (folder === 'important') return e.isImportant && !e.isTrash;
      if (folder === 'spam') return e.isSpam;
      if (folder === 'trash') return e.isTrash;
      return true;
    });

    if (q) {
      const query = q.toLowerCase();
      filtered = filtered.filter(e => 
        (e.subject && e.subject.toLowerCase().includes(query)) ||
        (e.from && e.from.toLowerCase().includes(query)) ||
        (e.to && e.to.toLowerCase().includes(query)) ||
        (e.snippet && e.snippet.toLowerCase().includes(query))
      );
    }

    filtered.sort((a, b) => parseInt(b.internalDate) - parseInt(a.internalDate));

    return {
      messages: filtered,
      nextPageToken: null,
      resultSizeEstimate: filtered.length,
      isDemo: true
    };
  }

  get(id) {
    const email = this.emails.find(e => e.id === id);
    if (!email) return null;
    return { ...email, isDemo: true };
  }

  toggleStar(id) {
    const email = this.emails.find(e => e.id === id);
    if (!email) return null;
    email.isStarred = !email.isStarred;
    if (email.isStarred) {
      if (!email.labels.includes('STARRED')) email.labels.push('STARRED');
    } else {
      email.labels = email.labels.filter(l => l !== 'STARRED');
    }
    return email;
  }

  markRead(id, isRead = true) {
    const email = this.emails.find(e => e.id === id);
    if (!email) return null;
    email.isUnread = !isRead;
    if (isRead) {
      email.labels = email.labels.filter(l => l !== 'UNREAD');
    } else {
      if (!email.labels.includes('UNREAD')) email.labels.push('UNREAD');
    }
    return email;
  }

  archive(id) {
    const email = this.emails.find(e => e.id === id);
    if (!email) return null;
    email.labels = email.labels.filter(l => l !== 'INBOX');
    return email;
  }

  trash(id) {
    const email = this.emails.find(e => e.id === id);
    if (!email) return null;
    email.isTrash = true;
    email.labels = email.labels.filter(l => l !== 'INBOX');
    if (!email.labels.includes('TRASH')) email.labels.push('TRASH');
    return email;
  }

  untrash(id) {
    const email = this.emails.find(e => e.id === id);
    if (!email) return null;
    email.isTrash = false;
    email.labels = email.labels.filter(l => l !== 'TRASH');
    if (!email.labels.includes('INBOX')) email.labels.push('INBOX');
    return email;
  }

  send({ to, cc, bcc, subject, body, isHtml = true, attachments = [] }) {
    const newId = `demo-sent-${Date.now()}`;
    const newEmail = {
      id: newId,
      threadId: `demo-thread-${Date.now()}`,
      from: 'Alex Mercer <alex.mercer@nexoramail.com>',
      fromName: 'Alex Mercer',
      fromEmail: 'alex.mercer@nexoramail.com',
      to: Array.isArray(to) ? to.join(', ') : to,
      cc: cc || '',
      bcc: bcc || '',
      subject: subject || '(No Subject)',
      snippet: body ? body.replace(/<[^>]+>/g, '').substring(0, 100) : '',
      bodyHtml: isHtml ? body : `<div style="white-space: pre-wrap;">${body}</div>`,
      bodyText: body.replace(/<[^>]+>/g, ''),
      date: new Date().toISOString(),
      internalDate: Date.now().toString(),
      isUnread: false,
      isStarred: false,
      isImportant: false,
      isDraft: false,
      isTrash: false,
      isSpam: false,
      isSent: true,
      labels: ['SENT'],
      attachments: attachments.map((a, idx) => ({
        id: `att-demo-${Date.now()}-${idx}`,
        filename: a.originalname || a.filename || 'attachment',
        mimeType: a.mimetype || 'application/octet-stream',
        size: a.size || 1024
      })),
      hasAttachments: attachments.length > 0,
      isDemo: true
    };

    this.emails.unshift(newEmail);
    return newEmail;
  }

  createDraft(draftData) {
    const newId = `demo-draft-${Date.now()}`;
    const newDraft = {
      id: newId,
      draftId: newId,
      threadId: `demo-thread-draft-${Date.now()}`,
      from: 'alex.mercer@nexoramail.com',
      fromName: 'Alex Mercer',
      fromEmail: 'alex.mercer@nexoramail.com',
      to: draftData.to || '',
      subject: draftData.subject || '(Draft)',
      snippet: draftData.body ? draftData.body.replace(/<[^>]+>/g, '').substring(0, 80) : '',
      bodyHtml: draftData.body || '',
      bodyText: draftData.body ? draftData.body.replace(/<[^>]+>/g, '') : '',
      date: new Date().toISOString(),
      internalDate: Date.now().toString(),
      isDraft: true,
      labels: ['DRAFT'],
      attachments: [],
      hasAttachments: false,
      isDemo: true
    };
    this.emails.unshift(newDraft);
    return newDraft;
  }

  updateDraft(id, draftData) {
    const email = this.emails.find(e => e.id === id);
    if (!email) return this.createDraft(draftData);
    email.to = draftData.to || email.to;
    email.subject = draftData.subject || email.subject;
    email.bodyHtml = draftData.body || email.bodyHtml;
    email.bodyText = draftData.body ? draftData.body.replace(/<[^>]+>/g, '') : email.bodyText;
    email.snippet = email.bodyText.substring(0, 80);
    email.date = new Date().toISOString();
    return email;
  }

  deleteDraft(id) {
    this.emails = this.emails.filter(e => e.id !== id);
    return { success: true, id };
  }

  getCounts() {
    return {
      inbox: this.emails.filter(e => e.labels.includes('INBOX') && e.isUnread && !e.isTrash).length,
      starred: this.emails.filter(e => e.isStarred && !e.isTrash).length,
      sent: this.emails.filter(e => e.isSent && !e.isTrash).length,
      drafts: this.emails.filter(e => e.isDraft && !e.isTrash).length,
      spam: this.emails.filter(e => e.isSpam).length,
      trash: this.emails.filter(e => e.isTrash).length,
      important: this.emails.filter(e => e.isImportant && !e.isTrash).length,
      isDemo: true
    };
  }
}

export const demoStore = new DemoEmailStore();
export default demoStore;
