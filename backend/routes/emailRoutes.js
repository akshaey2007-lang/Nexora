import express from 'express';
import multer from 'multer';
import {
  getInbox,
  getSent,
  getStarred,
  getImportant,
  getArchive,
  getByLabel,
  getDrafts,
  getDraftById,
  getSpam,
  getTrash,
  getEmailById,
  sendEmail,
  createDraft,
  updateDraft,
  deleteDraft,
  sendDraft,
  markRead,
  toggleStar,
  archiveEmail,
  trashEmail,
  restoreEmail,
  bulkAction,
  searchEmails,
  getAttachment,
  getUnreadCounts,
  getMailboxProfile
} from '../controllers/emailController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { apiLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// Configure Multer for in-memory attachment processing (No files permanently saved on disk)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 15 * 1024 * 1024, // 15MB attachment limit
    files: 5
  }
});

// Protect all email routes with requireAuth & rate limiter
router.use(apiLimiter);
router.use(requireAuth);

// Category & Folder Endpoints
router.get('/inbox', getInbox);
router.get('/sent', getSent);
router.get('/starred', getStarred);
router.get('/important', getImportant);
router.get('/archive', getArchive);
router.get('/label/:labelId', getByLabel);
router.get('/drafts', getDrafts);
router.get('/draft/:id', getDraftById);
router.get('/spam', getSpam);
router.get('/trash', getTrash);
router.get('/counts', getUnreadCounts);
router.get('/profile', getMailboxProfile);

// Search
router.get('/search', searchEmails);

// Bulk operations
router.post('/bulk', bulkAction);

// Single Email Operations
router.get('/:id', getEmailById);

// Send Email (Supports multi-part form data with attachments)
router.post('/send', upload.array('attachments', 5), sendEmail);

// Draft Operations
router.post('/draft', upload.array('attachments', 5), createDraft);
router.put('/draft/:id', upload.array('attachments', 5), updateDraft);
router.delete('/draft/:id', deleteDraft);
router.post('/draft/:id/send', sendDraft);

// Status and Label Modifications
router.patch('/:id/read', markRead);
router.patch('/:id/star', toggleStar);
router.patch('/:id/archive', archiveEmail);
router.patch('/:id/trash', trashEmail);
router.patch('/:id/restore', restoreEmail);

// Attachment retrieval
router.get('/:messageId/attachments/:attachmentId', getAttachment);

export default router;
