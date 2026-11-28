import express from 'express';
import {
  parseScheduleInstruction,
  listScheduledEmails,
  createScheduledEmail,
  updateScheduledEmail,
  cancelScheduledEmail,
  deleteScheduledEmail,
  triggerSchedulerRun,
  processUserDueScheduledEmails
} from '../controllers/scheduledEmailController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { verifySchedulerSecret } from '../middleware/schedulerAuth.js';
import { apiLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// Internal cron endpoint protected strictly by shared constant-time SCHEDULER_SECRET
router.post('/internal/process', verifySchedulerSecret, triggerSchedulerRun);

// User-facing scheduling routes (authenticated & rate-limited)
router.use(apiLimiter);
router.use(requireAuth);

router.get('/', listScheduledEmails);
router.post('/', createScheduledEmail);
router.post('/parse', parseScheduleInstruction);
router.post('/process-mine', processUserDueScheduledEmails);
router.put('/:id', updateScheduledEmail);
router.patch('/:id/cancel', cancelScheduledEmail);
router.delete('/:id', deleteScheduledEmail);

export default router;
