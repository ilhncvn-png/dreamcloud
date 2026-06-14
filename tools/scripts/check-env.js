#!/usr/bin/env node
/**
 * Verifies that .env files are present before dev/build.
 * Runs as npm `prepare` hook.
 */

const fs = require('fs');
const path = require('path');

const REQUIRED_ENVS = ['apps/api/.env', 'apps/mobile/.env', 'apps/nlp/.env'];

const ROOT = path.resolve(__dirname, '../..');
let missing = false;

for (const envFile of REQUIRED_ENVS) {
  const filePath = path.join(ROOT, envFile);
  const examplePath = filePath + '.example';
  if (!fs.existsSync(filePath)) {
    if (fs.existsSync(examplePath)) {
      console.warn(`⚠  Missing ${envFile} — run: cp ${envFile}.example ${envFile}`);
    } else {
      console.warn(`⚠  Missing ${envFile}`);
    }
    missing = true;
  }
}

if (missing) {
  console.warn('');
  console.warn('Run: bash infrastructure/scripts/setup-dev.sh');
  console.warn('');
}
