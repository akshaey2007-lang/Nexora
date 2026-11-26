import express from 'express';
import {
  getGoogleAuthUrl,
  handleGoogleCallback,
  getCurrentUser,
  getPublicConfig,
  logout,
  disconnectGoogle
} from '../controllers/authController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { authLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// Public configuration check
router.get('/config', getPublicConfig);

// OAuth initiate & callback
router.get('/google', authLimiter, getGoogleAuthUrl);
router.get('/google/callback', handleGoogleCallback);

// Authenticated user profile & state
router.get('/me', requireAuth, getCurrentUser);
router.post('/logout', requireAuth, logout);
router.post('/disconnect', requireAuth, disconnectGoogle);

export default router;
