import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const require = createRequire(import.meta.url);
const root = fileURLToPath(new URL('..', import.meta.url));
// Local browser fixtures must stay offline even when .env selects the live API.
const env = { ...process.env, VITE_API_BASE_URL: '/api' };
const vite = path.join(path.dirname(require.resolve('vite/package.json')), 'bin', 'vite.js');
const playwright = path.join(path.dirname(require.resolve('@playwright/test/package.json')), 'cli.js');
for (const args of [[vite, 'build'], [playwright, 'test', ...process.argv.slice(2)]]) {
  const result = spawnSync(process.execPath, args, { cwd:root, env, stdio:'inherit', windowsHide:true });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
