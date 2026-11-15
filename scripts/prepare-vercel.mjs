import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('..', import.meta.url));
const { values } = parseArgs({ options: { source: { type:'string' }, output: { type:'string' } } });
const source = path.resolve(root, values.source || '.');
const output = path.resolve(root, values.output || 'work/deployment/vercel-api');
const work = path.join(root, 'work', 'deployment');
if (!output.startsWith(work + path.sep)) throw new Error('Output must be a new folder inside work/deployment.');
if (existsSync(output)) throw new Error('Output already exists; choose a new --output folder to preserve prior deployment state.');
const manifest = JSON.parse(readFileSync(path.join(source,'Data','Karachi','manifest.json'),'utf8'));
const registrations = readdirSync(path.join(source,'Data'), {withFileTypes:true})
  .filter(entry => entry.isDirectory())
  .map(entry => path.join(source,'Data',entry.name,'manifest.json'))
  .filter(existsSync)
  .flatMap(file => JSON.parse(readFileSync(file,'utf8')).datasets);
if (manifest.datasets.length < 6 || registrations.some(d => d.provenance === 'mock' || d.data_kind === 'synthetic') ||
    new Set(registrations.map(d => d.id)).size !== registrations.length) {
  throw new Error('Expected unique real source registrations; do not deploy synthetic test fixtures.');
}
const commit = execFileSync('git', ['-C',source,'rev-parse','HEAD'], {encoding:'utf8',windowsHide:true}).trim();
mkdirSync(output, {recursive:true});
const filter = file => !['__pycache__','.venv','node_modules'].includes(path.basename(file)) && !file.endsWith('.pyc');
cpSync(path.join(source,'backend','app'), path.join(output,'backend','app'), {recursive:true,filter});
// Include each registered city and preserve original source-export bytes.
cpSync(path.join(source,'Data'), path.join(output,'Data'), {recursive:true,filter});
if (existsSync(path.join(source,'backend','config'))) {
  cpSync(path.join(source,'backend','config'), path.join(output,'backend','config'), {recursive:true,filter});
}
cpSync(path.join(source,'backend','requirements.txt'),path.join(output,'requirements.txt'));
for (const file of ['main.py','vercel.json','.vercelignore']) cpSync(path.join(root,'deploy','vercel',file),path.join(output,file));
writeFileSync(path.join(output,'.python-version'),'3.12\n');
writeFileSync(path.join(output,'deployment-source.json'),JSON.stringify({commit,packaged_at:new Date().toISOString()},null,2)+'\n');
console.log(JSON.stringify({output,source_commit:commit,datasets:registrations.length}));
