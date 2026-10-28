import { globSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = resolve(fileURLToPath(new URL('..', import.meta.url)));

// Find installer using the glob public/**/Deadlock-Setup-*.exe
const matches = globSync('public/**/Deadlock-Setup-*.exe', { cwd: rootDir });

if (!matches || matches.length === 0) {
  console.error('\n[installer-info] ERROR: No installer found matching public/**/Deadlock-Setup-*.exe.');
  console.error('Please ensure the installer executable is placed in the public/ directory.\n');
  process.exit(1);
}

// Use actual path of the installer without moving, renaming or modifying it
const matchedRel = matches[0].replace(/\\/g, '/');
const fullPath = resolve(rootDir, matchedRel);

// Compute relative path from public/
const publicDir = resolve(rootDir, 'public').replace(/\\/g, '/');
const normalizedFullPath = fullPath.replace(/\\/g, '/');
const relToPublic = normalizedFullPath.startsWith(publicDir + '/')
  ? normalizedFullPath.slice(publicDir.length + 1)
  : relative(publicDir, normalizedFullPath).replace(/\\/g, '/');

// Derive download path relative to site root (works under any base path)
const downloadPath = `./${relToPublic}`;
const filename = relToPublic.split('/').pop();

// Extract version from filename (e.g. Deadlock-Setup-0.1.0.exe -> 0.1.0)
const versionMatch = filename.match(/Deadlock-Setup-([0-9]+\.[0-9]+\.[0-9]+)\.exe/i);
const version = versionMatch ? versionMatch[1] : '0.1.0';

// Read file, compute size and sha256
const buffer = readFileSync(fullPath);
const sizeBytes = buffer.length;
const sizeMb = (sizeBytes / (1024 * 1024)).toFixed(1);
const sha256 = createHash('sha256').update(buffer).digest('hex');

const info = {
  filename,
  path: downloadPath,
  relToPublic,
  version,
  sizeBytes,
  sizeMb,
  sha256,
};

const outDir = resolve(rootDir, 'src/generated');
mkdirSync(outDir, { recursive: true });
const outFile = resolve(outDir, 'installer.json');
writeFileSync(outFile, JSON.stringify(info, null, 2) + '\n', 'utf8');

console.log(`[installer-info] Found installer: ${matchedRel}`);
console.log(`[installer-info] Size: ${sizeMb} MB (${sizeBytes} bytes)`);
console.log(`[installer-info] SHA-256: ${sha256}`);
console.log(`[installer-info] Wrote info to src/generated/installer.json`);
