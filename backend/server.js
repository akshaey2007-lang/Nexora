import express from 'express';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import { connectDB, isDbConnected } from './config/db.js';
import { logger } from './utils/logger.js';
import { errorHandler } from './middleware/errorHandler.js';

import authRoutes from './routes/authRoutes.js';
import emailRoutes from './routes/emailRoutes.js';
import settingsRoutes from './routes/settingsRoutes.js';
import { handleGoogleCallback } from './controllers/authController.js';

// Resolve environment paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Load environment variables (.env in backend or root)
dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config({ path: path.join(rootDir, '.env') });

const app = express();
const PORT = process.env.PORT || 5000;
const isProd = process.env.NODE_ENV === 'production';
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

// 1. Database Connection
await connectDB();

// 2. Security Middleware
app.use(
  helmet({
    contentSecurityPolicy: false, // Allows flexible rendering of email content and vite assets
    crossOriginEmbedderPolicy: false
  })
);

// 3. CORS Configuration
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5000',
  'http://localhost:3000',
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or same-origin in prod)
      if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.onrender.com')) {
        callback(null, true);
      } else {
        callback(null, true); // Permissive in dev, or specific origins
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);

// 4. Request Parsers
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Trust proxy for Render / Cloudflare deployments so secure cookies work
app.set('trust proxy', 1);

// 5. Session Storage Setup
const sessionSecret = process.env.SESSION_SECRET || 'nexora_mail_fallback_session_secret_32chars!';

let store;
if (process.env.MONGODB_URI && isDbConnected()) {
  try {
    store = MongoStore.create({
      mongoUrl: process.env.MONGODB_URI,
      collectionName: 'sessions',
      ttl: 14 * 24 * 60 * 60, // 14 days
      autoRemove: 'native'
    });
    logger.info('Using MongoDB Atlas persistent session store.');
  } catch (err) {
    logger.warn('Failed to configure MongoStore, falling back to memory session store', err.message);
  }
} else {
  logger.info('Running with in-memory session storage.');
}

app.use(
  session({
    name: 'nexora.sid',
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    store,
    cookie: {
      httpOnly: true,
      secure: 'auto', // Uses HTTPS cookies in production (via trust proxy) and works on HTTP localhost
      sameSite: 'lax', // Preserves session across Google OAuth top-level GET redirects without 3rd-party cookie blocking
      maxAge: 14 * 24 * 60 * 60 * 1000 // 14 days
    }
  })
);

// 6. Health Check Endpoint
app.get('/api/health', (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID || '';
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || '';
  const hasGoogleCredentials = Boolean(
    clientId &&
    !clientId.includes('your_google_client_id') &&
    clientSecret &&
    !clientSecret.includes('your_google_client_secret')
  );

  res.json({
    status: 'healthy',
    service: 'NEXORA MAIL API',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    database: isDbConnected() ? 'connected' : 'standalone/session',
    hasGoogleCredentials,
    environment: process.env.NODE_ENV || 'development'
  });
});

// 7. Mount API Routes
app.use('/auth', authRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/emails', emailRoutes);
app.use('/api/settings', settingsRoutes);

// 8. Production Static File Serving (Monorepo deployment on Render)
const frontendDistPath = path.join(rootDir, 'frontend', 'dist');

// Support dynamic Google Search Console HTML file verification via GOOGLE_VERIFICATION_FILE env var
app.use((req, res, next) => {
  const verifyFile = (process.env.GOOGLE_VERIFICATION_FILE || '').trim().replace(/^\//, '');
  if (verifyFile && req.path === `/${verifyFile}`) {
    return res.type('text/html').send(`google-site-verification: ${verifyFile}`);
  }
  return next();
});

// Handle Google OAuth callbacks sent to root '/' if GOOGLE_REDIRECT_URI omits '/auth/google/callback'
app.get('/', (req, res, next) => {
  if (req.query.code || req.query.error) {
    return handleGoogleCallback(req, res, next);
  }
  return next();
});

if (fs.existsSync(frontendDistPath)) {
  logger.info(`Serving static frontend assets from ${frontendDistPath}`);
  app.use(express.static(frontendDistPath));

  // Client-side routing fallback for React Router SPA
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/auth')) {
      return next();
    }
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  });
} else {
  app.get('/', (req, res) => {
    res.json({
      message: 'NEXORA MAIL API Server is running.',
      documentation: '/api/health',
      frontend: 'Frontend dist not found. Run "npm run build" in frontend directory.'
    });
  });
}

// 9. Central Error Handler
app.use(errorHandler);

// 10. Start Server
app.listen(PORT, () => {
  logger.success(`=================================================`);
  logger.success(`🚀 NEXORA MAIL Server running on port ${PORT}`);
  logger.success(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.success(`🔗 Health Check: http://localhost:${PORT}/api/health`);
  logger.success(`=================================================`);
});

export default app;
