import { globSync, readFileSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = resolve(fileURLToPath(new URL('..', import.meta.url)));
const outDir = resolve(rootDir, 'src/generated');
const outFile = resolve(outDir, 'installer.json');

// Find installer using the glob public/**/Deadlock-Setup-*.exe
const matches = globSync('public/**/Deadlock-Setup-*.exe', { cwd: rootDir });

if (!matches || matches.length === 0) {
  // If installer binary is missing in public/ (e.g. in CI or cloud build environments):
  if (existsSync(outFile)) {
    console.log('[installer-info] No local installer binary in public/ (CI/remote build environment).');
    console.log('[installer-info] Using existing verified metadata from src/generated/installer.json.');
    const info = JSON.parse(readFileSync(outFile, 'utf8'));
    console.log(`[installer-info] File: ${info.filename} (${info.sizeMb} MB) · SHA-256: ${info.sha256}`);
    process.exit(0);
  }

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

// Read file buffer
const buffer = readFileSync(fullPath);

// Check if this is a Git LFS pointer file (e.g. during CI without LFS checkout)
let sizeBytes = buffer.length;
let sizeMb = (sizeBytes / (1024 * 1024)).toFixed(1);
let sha256 = '';

const isLfsPointer = buffer.length < 500 && buffer.toString('utf8').startsWith('version https://git-lfs.github.com');
if (isLfsPointer) {
  const pointerText = buffer.toString('utf8');
  const oidMatch = pointerText.match(/oid sha256:([a-f0-9]{64})/i);
  const sizeMatch = pointerText.match(/size ([0-9]+)/i);

  if (oidMatch && sizeMatch) {
    sha256 = oidMatch[1];
    sizeBytes = parseInt(sizeMatch[1], 10);
    sizeMb = (sizeBytes / (1024 * 1024)).toFixed(1);
    console.log('[installer-info] Matched installer is a Git LFS pointer. Extracted verified OID and size.');
  } else if (existsSync(outFile)) {
    console.log('[installer-info] Matched installer is a Git LFS pointer. Using existing verified installer.json.');
    process.exit(0);
  }
} else {
  // Real binary file: compute actual hash
  sha256 = createHash('sha256').update(buffer).digest('hex');
}

const info = {
  filename,
  path: downloadPath,
  relToPublic,
  version,
  sizeBytes,
  sizeMb,
  sha256,
};

mkdirSync(outDir, { recursive: true });
writeFileSync(outFile, JSON.stringify(info, null, 2) + '\n', 'utf8');

console.log(`[installer-info] Found installer: ${matchedRel}`);
console.log(`[installer-info] Size: ${sizeMb} MB (${sizeBytes} bytes)`);
console.log(`[installer-info] SHA-256: ${sha256}`);
console.log(`[installer-info] Wrote info to src/generated/installer.json`);
