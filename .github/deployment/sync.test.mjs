import test from 'node:test';
import assert from 'node:assert/strict';
import { synchronize } from './sync.mjs';
import { config } from './github.mjs';
const old = 'a'.repeat(40), next = 'b'.repeat(40), control = 'c'.repeat(40);
function fixture({ current = old, diverged = false, deployments = [], parent = config.upstream } = {}) {
  const writes = [];
  const call = async (url, options) => {
    if (options) { writes.push({ url, ...options }); return {}; }
    if (url === '/repos/rhido/Rozenweig-Index') return { fork: true, name: config.forkName, parent: { full_name: parent }, default_branch: 'deployment' };
    if (url.includes('/commits/')) return { sha: next };
    if (url.includes('/git/ref/')) return { object: { sha: current } };
    if (url.includes('/compare/')) return { status: diverged ? 'diverged' : 'ahead', behind_by: diverged ? 1 : 0, merge_base_commit: { sha: old } };
    if (url.includes('/statuses')) return [{ state: deployments.find(d => url.includes(`/${d.id}/`)).state }];
    if (url.includes('/deployments?')) return deployments;
    throw new Error(`Unexpected request ${url}`);
  };
  return { call, writes };
}
const repo = 'rhido/Rozenweig-Index';
test('fast-forwards only the fork main branch and requests a first release', async () => {
  const { call, writes } = fixture();
  assert.deepEqual(await synchronize(call, repo, control), { source_sha: next, release: true });
  assert.deepEqual(writes, [{ url: `/repos/${repo}/git/refs/heads/main`, method: 'PATCH', body: { sha: next, force: false } }]);
});
test('refuses a diverged mirror without writing a ref', async () => {
  const { call, writes } = fixture({ diverged: true });
  await assert.rejects(synchronize(call, repo, control), /diverged/);
  assert.equal(writes.length, 0);
});
test('refuses the wrong upstream parent', async () => {
  const { call, writes } = fixture({ parent: 'other/project' });
  await assert.rejects(synchronize(call, repo, control), /configured fork/);
  assert.equal(writes.length, 0);
});
test('does not republish a successfully deployed source and control revision', async () => {
  const { call, writes } = fixture({ current: next, deployments: [{ id: 1, state: 'success', payload: { source_sha: next, control_sha: control } }] });
  assert.equal((await synchronize(call, repo, control)).release, false);
  assert.equal(writes.length, 0);
});
test('retries a failed deployment even when main is already synchronized', async () => {
  const { call } = fixture({ current: next, deployments: [{ id: 2, state: 'failure', payload: { source_sha: next, control_sha: control } }, { id: 1, state: 'success', payload: { source_sha: old, control_sha: control } }] });
  assert.equal((await synchronize(call, repo, control)).release, true);
});
test('changing automation or requesting force causes a release', async () => {
  const { call } = fixture({ current: next, deployments: [{ id: 1, state: 'success', payload: { source_sha: next, control_sha: control } }] });
  assert.equal((await synchronize(call, repo, old)).release, true);
  assert.equal((await synchronize(call, repo, control, true)).release, true);
});
