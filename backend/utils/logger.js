const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  magenta: '\x1b[35m'
};

const timestamp = () => new Date().toISOString().replace('T', ' ').substring(0, 19);

export const logger = {
  info: (msg, meta = '') => {
    console.log(`${colors.cyan}[${timestamp()}] [INFO]${colors.reset} ${msg}`, meta ? meta : '');
  },
  success: (msg, meta = '') => {
    console.log(`${colors.green}[${timestamp()}] [SUCCESS]${colors.reset} ${msg}`, meta ? meta : '');
  },
  warn: (msg, meta = '') => {
    console.warn(`${colors.yellow}[${timestamp()}] [WARN]${colors.reset} ${msg}`, meta ? meta : '');
  },
  error: (msg, err = '') => {
    console.error(`${colors.red}[${timestamp()}] [ERROR]${colors.reset} ${msg}`, err ? err : '');
  },
  debug: (msg, meta = '') => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`${colors.dim}[${timestamp()}] [DEBUG] ${msg}${colors.reset}`, meta ? meta : '');
    }
  }
};
