import {defineConfig} from '@playwright/test';

// This suite uses native WebRTC and the ephemeral local database only.
// Do not add fake media, ICE, proxy, sandbox or browser-security flags.
export default defineConfig({
 testDir:'./tests/e2e',
 testMatch:'**/*.spec.mjs',
 fullyParallel:false,
 workers:1,
 retries:0,
 timeout:90000,
 expect:{timeout:12000},
 reporter:'line',
 use:{
  browserName:'chromium',
  headless:true,
  baseURL:'http://localhost:3000',
  trace:'off',
  video:'off',
  screenshot:'off'
 },
 webServer:{
  command:'npm run preview:online',
  url:'http://localhost:3000/api/online?action=status',
  reuseExistingServer:!process.env.CI,
  timeout:120000,
  env:{PORT:'3000'}
 }
});
