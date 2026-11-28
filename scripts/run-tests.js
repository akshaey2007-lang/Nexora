import { spawnSync } from 'child_process';

const res = spawnSync(
  process.execPath,
  ['--test', 'frontend/tests/ai.test.js', 'backend/tests/scheduling.test.js', 'backend/tests/security.test.js'],
  {
    stdio: 'inherit',
    env: {
      ...process.env,
      NODE_ENV: 'test',
      ENABLE_IN_PROCESS_SCHEDULER: 'false'
    }
  }
);

process.exit(res.status ?? 1);
