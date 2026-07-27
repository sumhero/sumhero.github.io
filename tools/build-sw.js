import { readdirSync, statSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ASSET_DIRS = ['js', 'css', 'images', 'flags'];
const SHELL = ['/', '/index.html', '/manifest.json'];

function walk(dir, acc = []) {
  for (const entry of readdirSync(dir)) {
    if (entry.startsWith('.')) continue;

    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      walk(full, acc);
    } else {
      acc.push(full);
    }
  }

  return acc;
}

export function buildAssetList(rootDir) {
  const files = ASSET_DIRS.flatMap(dir => {
    try {
      return walk(join(rootDir, dir));
    } catch (e) {
      return [];
    }
  });

  const paths = files.map(f => '/' + relative(rootDir, f).split(sep).join('/'));

  return [...new Set([...SHELL, ...paths])];
}

export function buildServiceWorker(rootDir, version) {
  const template = readFileSync(join(rootDir, 'sw-template.js'), 'utf8');
  const assets = buildAssetList(rootDir);
  const assetsJson = JSON.stringify(assets, null, 2);

  return template
    .replace('__CACHE_VERSION__', () => version)
    .replace('__ASSETS__', () => assetsJson);
}

// Returns today's date as an 8-digit YYYYMMDD string.
export function todayStamp(date = new Date()) {
  return date.toISOString().slice(0, 10).replace(/-/g, '');
}

// Pure version-increment logic, kept filesystem- and clock-free so it can be
// unit-tested directly: given the CACHE_VERSION currently in sw.js (or null/
// garbage if there isn't one) and today's 8-digit date stamp, compute the
// next CACHE_VERSION.
//
// - Same day as the current version: bump the trailing counter by one.
// - Different day, missing version, or a version that doesn't parse as
//   <8-digit-date><2+-digit-counter>: start the day fresh at counter 01.
// - Counter is zero-padded to at least 2 digits. Past 99 it simply grows to
//   3+ digits (100, 101, ...) instead of wrapping back to 00 — wrapping would
//   let a version collide with one already issued earlier that day, which is
//   exactly the bug this function exists to prevent. Growing the counter is
//   unambiguous to parse back out: the date is always the first 8 digits and
//   the counter is everything after it, whatever its length.
export function nextVersion(currentVersion, today) {
  if (typeof currentVersion === 'string') {
    const match = /^(\d{8})(\d{2,})$/.exec(currentVersion.trim());
    if (match && match[1] === today) {
      const counter = parseInt(match[2], 10) + 1;
      return today + String(counter).padStart(2, '0');
    }
  }

  return today + '01';
}

function readCurrentVersion(rootDir) {
  try {
    const content = readFileSync(join(rootDir, 'sw.js'), 'utf8');
    const match = /CACHE_VERSION\s*=\s*'([^']*)'/.exec(content);
    return match ? match[1] : null;
  } catch (e) {
    return null;
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const root = process.cwd();
  const version = nextVersion(readCurrentVersion(root), todayStamp());
  writeFileSync(join(root, 'sw.js'), buildServiceWorker(root, version));
  console.log(`sw.js written with ${buildAssetList(root).length} assets at v${version}`);
}
