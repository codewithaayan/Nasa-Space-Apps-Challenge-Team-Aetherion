import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';

const root = fileURLToPath(new URL('..', import.meta.url));
const backend = path.join(root, 'backend');
const python = process.env.PYTHON || path.join(backend, '.venv', process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python');
if (!existsSync(python)) {
  throw new Error('Create backend/.venv and install backend/requirements.txt first; see README.md.');
}
const modeIndex = process.argv.indexOf('--fixtures');
const env = { ...process.env };
if (modeIndex >= 0) {
  const mode = process.argv[modeIndex + 1];
  if (!['real', 'comparison'].includes(mode)) throw new Error('Unknown test fixture mode');
  const prepared = spawnSync(python, ['-m', 'scripts.prepare_e2e_fixtures', mode], { cwd:backend, env, stdio:'inherit', windowsHide:true });
  if (prepared.status !== 0) process.exit(prepared.status || 1);
  env.DATA_ROOT = path.join(root,'work','e2e',mode,'grids');
  if (mode === 'comparison') env.CSV_DATA_ROOT = path.join(root,'work','e2e',mode,'csv');
}
const port = env.BACKEND_PORT || '8000';
const children = [];
const launch = (command,args,cwd) => {
  const child = spawn(command,args,{cwd,env,stdio:'inherit',windowsHide:true});
  children.push(child);
  child.on('error', error => { console.error(error.message); shutdown(1); });
  child.on('exit', code => { if (!stopping) shutdown(code || 0); });
};
let stopping = false;
function shutdown(code) {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill();
  process.exitCode = code;
}
process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
launch(python, ['-m','uvicorn','app.main:app','--host','127.0.0.1','--port',port], backend);
if (process.argv.includes('--dev')) {
  let ready = false;
  const deadline = Date.now() + 60000;
  while (!stopping && Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/health`, {signal:AbortSignal.timeout(1000)});
      if (response.ok) { ready = true; break; }
    } catch { /* Backend imports may still be warming up. */ }
    await new Promise(resolve => setTimeout(resolve,200));
  }
  if (!ready || stopping) { shutdown(1); }
  else {
  env.BACKEND_URL = `http://127.0.0.1:${port}`;
  // dev:all runs both local services even when .env selects the live API.
  env.VITE_API_BASE_URL = '/api';
  launch(process.execPath, [path.join(root,'node_modules','vite','bin','vite.js'),'--host','127.0.0.1','--port',env.FRONTEND_PORT || '5173','--strictPort'], root);
  }
}
