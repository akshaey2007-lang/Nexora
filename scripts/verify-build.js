import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('\x1b[32m%s\x1b[0m', '🔍 Running NEXORA MAIL Pre-Flight & Build Verification...');

const requiredDirs = [
  'backend/config',
  'backend/controllers',
  'backend/middleware',
  'backend/models',
  'backend/routes',
  'backend/services',
  'backend/utils',
  'frontend/src/components',
  'frontend/src/components/ai',
  'frontend/src/pages',
  'frontend/src/layouts',
  'frontend/src/context',
  'frontend/src/services',
  'frontend/src/services/ai',
  'frontend/src/services/scheduling',
  'frontend/src/utils'
];

let allGood = true;

for (const dir of requiredDirs) {
  const fullPath = path.join(rootDir, dir);
  if (!fs.existsSync(fullPath)) {
    console.error(`❌ Missing directory: ${dir}`);
    allGood = false;
  }
}

const requiredFiles = [
  'backend/server.js',
  'backend/package.json',
  'frontend/package.json',
  'frontend/vite.config.js',
  'backend/models/ScheduledEmail.js',
  'backend/services/schedulerService.js',
  'backend/services/gmailSchedulingService.js',
  'backend/routes/scheduledEmailRoutes.js',
  'frontend/src/services/ai/webllmService.js',
  '.github/workflows/scheduled-email-dispatcher.yml',
  'render.yaml',
  'README.md'
];

for (const file of requiredFiles) {
  const fullPath = path.join(rootDir, file);
  if (!fs.existsSync(fullPath)) {
    console.warn(`⚠️ Warning: Expected file not found yet: ${file}`);
  }
}

if (allGood) {
  console.log('\x1b[32m%s\x1b[0m', '✅ Project architecture directories verified.');
} else {
  console.log('\x1b[33m%s\x1b[0m', 'ℹ️ Verification completed with pending files to generate.');
}
