import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import path from 'node:path';
import { loadEnv } from 'vite';

// A static host cannot serve the Python /api routes. Require its real address.
const root = fileURLToPath(new URL('..', import.meta.url));
const value = process.env.VITE_API_BASE_URL ?? loadEnv('production', root, 'VITE_').VITE_API_BASE_URL;
if (!value) throw new Error('Set VITE_API_BASE_URL to the deployed HTTPS backend URL ending in /api.');
const api = new URL(value);
if (api.protocol !== 'https:' || api.username || api.password || api.search || api.hash ||
    api.pathname.replace(/\/$/, '') !== '/api' ||
    ['localhost', '127.0.0.1', '[::1]'].includes(api.hostname)) {
  throw new Error('VITE_API_BASE_URL must be a public HTTPS backend URL ending in /api, without credentials or query parameters.');
}
const require = createRequire(import.meta.url);
const vite = path.join(path.dirname(require.resolve('vite/package.json')), 'bin', 'vite.js');
const build = spawn(process.execPath, [vite, 'build'], {
  cwd: root,
  env: { ...process.env, VITE_API_BASE_URL: api.href.replace(/\/$/, '') },
  stdio: 'inherit',
  windowsHide: true,
});
build.on('error', error => { console.error(error.message); process.exitCode = 1; });
build.on('exit', code => { process.exitCode = code ?? 1; });
