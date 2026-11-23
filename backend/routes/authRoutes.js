import express from 'express';
import {
  getGoogleAuthUrl,
  handleGoogleCallback,
  getCurrentUser,
  logout,
  disconnectGoogle,
  enableDemoMode
} from '../controllers/authController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { authLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// OAuth initiate & callback
router.get('/google', authLimiter, getGoogleAuthUrl);
router.get('/google/callback', handleGoogleCallback);

// Demo mode activator
router.post('/demo', enableDemoMode);

// Authenticated user profile & state
router.get('/me', requireAuth, getCurrentUser);
router.post('/logout', requireAuth, logout);
router.post('/disconnect', requireAuth, disconnectGoogle);

export default router;
