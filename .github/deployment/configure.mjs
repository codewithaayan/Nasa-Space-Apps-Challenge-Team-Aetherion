import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { config } from './github.mjs';
for (const key of ['VERCEL_TOKEN', 'CLOUDFLARE_API_TOKEN']) {
  if (!process.env[key]) throw new Error(`Add the repository Actions secret ${key} before deploying`);
}
mkdirSync('work/deployment/vercel-api/.vercel', { recursive: true });
writeFileSync('work/deployment/vercel-api/.vercel/project.json', JSON.stringify({
  orgId: config.vercelOrg, projectId: config.vercelProject,
}));
for (const [key, value] of Object.entries({
  VERCEL_ORG_ID: config.vercelOrg, VERCEL_PROJECT_ID: config.vercelProject,
  CLOUDFLARE_ACCOUNT_ID: config.cloudflareAccount,
  CF_PROJECT: config.cloudflareProject, CF_PRODUCTION_BRANCH: config.cloudflareProductionBranch,
  FRONTEND_URL: config.frontend, API_URL: config.api,
})) appendFileSync(process.env.GITHUB_ENV, `${key}=${value}\n`);
console.log('Hosting credentials are present; public project settings loaded.');
