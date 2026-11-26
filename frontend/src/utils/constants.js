export const FOLDERS = [
  { id: 'inbox', label: 'Inbox', icon: 'Inbox', countKey: 'inbox', showCount: true },
  { id: 'starred', label: 'Starred', icon: 'Star', countKey: 'starred', showCount: false },
  { id: 'important', label: 'Important', icon: 'Bookmark', countKey: 'important', showCount: true },
  { id: 'sent', label: 'Sent', icon: 'Send', countKey: 'sent', showCount: false },
  { id: 'drafts', label: 'Drafts', icon: 'FileText', countKey: 'drafts', showCount: true },
  { id: 'archive', label: 'Archive', icon: 'Archive', countKey: null, showCount: false },
  { id: 'spam', label: 'Spam', icon: 'AlertOctagon', countKey: 'spam', showCount: true },
  { id: 'trash', label: 'Trash', icon: 'Trash2', countKey: 'trash', showCount: false }
];

export const EMPTY_STATES = {
  inbox: {
    title: 'Your inbox is empty.',
    description: 'Incoming messages delivered to your Gmail account will appear here.'
  },
  starred: {
    title: 'No starred emails.',
    description: 'Star important messages to find them quickly from here.'
  },
  important: {
    title: 'No important emails.',
    description: 'Messages marked as important in Gmail will appear in this view.'
  },
  sent: {
    title: 'No sent emails yet.',
    description: 'Messages you send from Nexora Mail or Gmail will appear here.'
  },
  drafts: {
    title: 'No drafts available.',
    description: 'Start composing a message and save it as a draft to continue later.'
  },
  archive: {
    title: 'No archived emails.',
    description: 'Emails removed from your inbox without deleting are stored here.'
  },
  spam: {
    title: 'No spam messages.',
    description: 'Suspicious or unwanted messages filtered by Gmail appear here.'
  },
  trash: {
    title: 'Trash is empty.',
    description: 'Messages moved to Trash can be restored from here.'
  }
};

export const APP_NAME = 'Nexora Mail';
