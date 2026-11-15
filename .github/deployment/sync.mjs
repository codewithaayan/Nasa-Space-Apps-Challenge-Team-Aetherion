import { pathToFileURL } from 'node:url';
import { api, assertFork, config, output, sha } from './github.mjs';

export async function synchronize(call, repository, controlSha, force = false) {
  await assertFork(call, repository);
  const target = sha((await call(`/repos/${config.upstream}/commits/${config.sourceBranch}`)).sha);
  const current = sha((await call(`/repos/${repository}/git/ref/heads/${config.sourceBranch}`)).object.sha);
  if (current !== target) {
    const comparison = await call(`/repos/${repository}/compare/${current}...${target}`);
    if (comparison.status !== 'ahead' || comparison.behind_by !== 0 || comparison.merge_base_commit?.sha !== current) {
      throw new Error('Fork main diverged from upstream. Resolve it manually; automatic sync never force-pushes.');
    }
    await call(`/repos/${repository}/git/refs/heads/${config.sourceBranch}`, {
      method: 'PATCH', body: { sha: target, force: false },
    });
  }
  // Consult release status, not the mirror branch: a failed release must retry.
  const deployments = await call(`/repos/${repository}/deployments?environment=production&per_page=30`);
  let lastSuccess;
  for (const deployment of deployments) {
    if (!/^[a-f0-9]{40}$/.test(deployment.payload?.source_sha || '')) continue;
    const statuses = await call(`/repos/${repository}/deployments/${deployment.id}/statuses?per_page=1`);
    if (['success', 'inactive'].includes(statuses[0]?.state)) {
      lastSuccess = deployment.payload;
      break;
    }
  }
  return { source_sha: target,
    release: force || lastSuccess?.source_sha !== target || lastSuccess?.control_sha !== controlSha };
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const plan = await synchronize(api, process.env.GITHUB_REPOSITORY, sha(process.env.GITHUB_SHA), process.env.FORCE_DEPLOY === 'true');
  for (const [key, value] of Object.entries(plan)) output(key, value);
}
