import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = resolve(fileURLToPath(new URL('..', import.meta.url)));
const distDir = resolve(rootDir, 'dist');

// Read configured installer info
const installerInfoPath = resolve(rootDir, 'src/generated/installer.json');
if (!existsSync(installerInfoPath)) {
  console.error('[check:download] ERROR: src/generated/installer.json does not exist. Run build first.');
  process.exit(1);
}

const installerInfo = JSON.parse(readFileSync(installerInfoPath, 'utf8'));
const configuredPath = installerInfo.path; // e.g. "./Deadlock-Setup-0.1.0.exe"
const expectedHash = installerInfo.sha256;

// Resolve path in dist/ (strip leading ./)
const relDist = configuredPath.replace(/^\.\//, '');
const distInstallerPath = resolve(distDir, relDist);

if (!existsSync(distInstallerPath)) {
  console.error(`[check:download] ERROR: Installer missing in dist/ at configured path: ${distInstallerPath}`);
  process.exit(1);
}

// Compute sha256 of the installer in dist/
const distBuffer = readFileSync(distInstallerPath);
const distHash = createHash('sha256').update(distBuffer).digest('hex');

if (distHash !== expectedHash) {
  console.error(`[check:download] ERROR: Installer SHA-256 in dist/ does not match generated metadata!`);
  console.error(`  dist:     ${distHash}`);
  console.error(`  expected: ${expectedHash}`);
  process.exit(1);
}

// Check built HTML in dist/index.html
const htmlPath = resolve(distDir, 'index.html');
if (!existsSync(htmlPath)) {
  console.error(`[check:download] ERROR: Built HTML missing at: ${htmlPath}`);
  process.exit(1);
}

const html = readFileSync(htmlPath, 'utf8');

if (!html.includes(distHash)) {
  console.error(`[check:download] ERROR: Built HTML does not contain the installer SHA-256!`);
  console.error(`  Expected SHA-256 in HTML: ${distHash}`);
  process.exit(1);
}

// Confirm download links in built HTML point to configured path
const escapedPath = configuredPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const hrefMatches = html.match(new RegExp(`href=["']${escapedPath}["']`, 'g'));
if (!hrefMatches) {
  console.error(`[check:download] ERROR: Built HTML does not contain download links pointing to ${configuredPath}`);
  process.exit(1);
}

console.log(`[check:download] OK: Installer exists in dist/ at "${relDist}"`);
console.log(`[check:download] OK: Installer size: ${(distBuffer.length / (1024 * 1024)).toFixed(1)} MB (${distBuffer.length} bytes)`);
console.log(`[check:download] OK: Installer SHA-256 (${distHash}) matches built HTML.`);
console.log(`[check:download] OK: Verified ${hrefMatches.length} download links pointing to "${configuredPath}".`);
