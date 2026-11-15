import { api, assertFork, config, output, sha } from './github.mjs';
const repository = process.env.GITHUB_REPOSITORY;
await assertFork(api, repository);
const log = `https://github.com/${repository}/actions/runs/${process.env.GITHUB_RUN_ID}`;
const action = process.argv[2];
if (action === 'start') {
  const source = sha(process.env.SOURCE_SHA);
  const deployment = await api(`/repos/${repository}/deployments`, {
    method: 'POST', body: { ref: source, environment: 'production', auto_merge: false,
      required_contexts: [], production_environment: true,
      description: 'Validated app release to Cloudflare Pages and Vercel',
      payload: { source_sha: source, control_sha: sha(process.env.GITHUB_SHA) } },
  });
  output('deployment_id', deployment.id);
  await status(deployment.id, 'in_progress');
} else {
  if (!/^\d+$/.test(process.env.DEPLOYMENT_ID || '')) throw new Error('Missing deployment ID');
  if (!['success', 'failure'].includes(action)) throw new Error('Invalid deployment state');
  await status(process.env.DEPLOYMENT_ID, action);
}
async function status(id, state) {
  await api(`/repos/${repository}/deployments/${id}/statuses`, { method: 'POST', body: {
    state, log_url: log, environment_url: config.frontend, auto_inactive: state === 'success',
  } });
}
