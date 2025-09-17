#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packagePath = path.join(__dirname, '..', 'package.json');

// Read current package.json
const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

// Function to get the latest stable version of a package
function getLatestVersion(packageName) {
  try {
    // For Electron, use the stable channel (36.x series)
    if (packageName === 'electron') {
      const versions = JSON.parse(execSync(`npm view ${packageName} versions --json`, { encoding: 'utf8' }));
      // Filter for 36.x versions (latest stable series)
      const stableVersions = versions.filter(v => v.startsWith('36.'));
      return stableVersions[stableVersions.length - 1] || '36.9.1';
    }
    
    // For other packages, get the latest version
    const version = execSync(`npm view ${packageName}@latest version`, { encoding: 'utf8' }).trim();
    return version;
  } catch (error) {
    console.warn(`Could not fetch latest version for ${packageName}, keeping current`);
    return null;
  }
}

console.log('Updating all packages to latest stable versions...\n');

// Update dependencies
if (packageJson.dependencies) {
  console.log('Updating dependencies:');
  for (const [pkg, currentVersion] of Object.entries(packageJson.dependencies)) {
    const latestVersion = getLatestVersion(pkg);
    if (latestVersion) {
      packageJson.dependencies[pkg] = `^${latestVersion}`;
      console.log(`  ${pkg}: ${currentVersion} → ^${latestVersion}`);
    }
  }
}

// Update devDependencies
if (packageJson.devDependencies) {
  console.log('\nUpdating devDependencies:');
  for (const [pkg, currentVersion] of Object.entries(packageJson.devDependencies)) {
    const latestVersion = getLatestVersion(pkg);
    if (latestVersion) {
      packageJson.devDependencies[pkg] = `^${latestVersion}`;
      console.log(`  ${pkg}: ${currentVersion} → ^${latestVersion}`);
    }
  }
}

// Ensure engines are set to require modern versions
packageJson.engines = {
  "node": ">=20.0.0",
  "npm": ">=10.0.0",
  "electron": ">=36.0.0"
};

// Add a script to update packages
if (!packageJson.scripts) {
  packageJson.scripts = {};
}
packageJson.scripts['update-latest'] = 'node scripts/update-to-latest.js && npm install';

// Write updated package.json
fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + '\n');

console.log('\npackage.json updated successfully!');
console.log('Run "npm install" to install the updated packages.');