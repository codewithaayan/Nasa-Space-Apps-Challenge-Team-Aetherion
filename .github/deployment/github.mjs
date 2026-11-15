import { readFileSync, appendFileSync } from 'node:fs';

export const config = JSON.parse(readFileSync(new URL('./config.json', import.meta.url), 'utf8'));
export async function api(endpoint, options = {}) {
  if (!process.env.GH_TOKEN) throw new Error('GH_TOKEN is required');
  const response = await fetch(`https://api.github.com${endpoint}`, {
    ...options,
    headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${process.env.GH_TOKEN}`,
      'X-GitHub-Api-Version': '2022-11-28', 'Content-Type': 'application/json' },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    signal: AbortSignal.timeout(60000),
  });
  if (!response.ok) throw new Error(`GitHub ${options.method || 'GET'} ${endpoint}: HTTP ${response.status}`);
  return response.status === 204 ? undefined : response.json();
}
export function output(name, value) {
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `${name}=${value}\n`);
  console.log(`${name}: ${value}`);
}
export function sha(value) {
  if (!/^[a-f0-9]{40}$/.test(value || '')) throw new Error('Expected a full commit SHA');
  return value;
}
export async function assertFork(call, repository) {
  if (!/^[\w-]+\/[\w.-]+$/.test(repository || '')) throw new Error('Invalid repository');
  const repo = await call(`/repos/${repository}`);
  if (!repo.fork || repo.name !== config.forkName || repo.parent?.full_name !== config.upstream ||
      repo.default_branch !== config.controlBranch) {
    throw new Error('Only the configured fork with deployment as its default branch can run this automation');
  }
}
