import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));

// Load env vars from server/.env (for local dev fallback)
try {
  require('dotenv').config({ path: join(__dirname, '..', 'server', '.env') });
} catch {}

const app = require('../server/app.js');

export default app;
