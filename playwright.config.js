import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir:'./tests/e2e',
  fullyParallel:false,
  workers:1,
  timeout:60000,
  expect:{timeout:20000},
  outputDir:'work/e2e/results',
  reporter:'list',
  use:{
    baseURL:'http://127.0.0.1:8765',
    locale:'en-US',
    headless:true,
    ...(process.env.PLAYWRIGHT_CHANNEL ? {channel:process.env.PLAYWRIGHT_CHANNEL} : {}),
    screenshot:'only-on-failure',
    trace:'retain-on-failure',
  },
  webServer:[
    {command:'node scripts/serve.mjs',url:'http://127.0.0.1:8768/api/health',env:{BACKEND_PORT:'8768',DATA_ROOT:process.cwd() + '/Data/Sahel',BUNDLED_CITY_GRIDS:'true'},reuseExistingServer:false,timeout:60000},
    {command:'node scripts/serve.mjs --fixtures real',url:'http://127.0.0.1:8765/api/health',env:{BACKEND_PORT:'8765'},reuseExistingServer:false,timeout:60000},
    {command:'node scripts/serve.mjs --fixtures comparison',url:'http://127.0.0.1:8766/api/health',env:{BACKEND_PORT:'8766'},reuseExistingServer:false,timeout:60000},
    {command:'node scripts/serve.mjs',url:'http://127.0.0.1:8767/api/health',env:{BACKEND_PORT:'8767',DATA_ROOT:process.cwd() + '/Data/Sahel'},reuseExistingServer:false,timeout:60000},
  ],
});
