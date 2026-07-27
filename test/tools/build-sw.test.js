import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, sep } from 'node:path';
import { buildAssetList, nextVersion } from '../../tools/build-sw.js';

const assets = buildAssetList(process.cwd());

// Parses the ASSETS array literally out of the committed sw.js, so we can
// compare "what got shipped" against "what the generator produces right
// now" without regenerating sw.js as a side effect of running tests.
function parseCommittedAssets(rootDir) {
  const content = readFileSync(join(rootDir, 'sw.js'), 'utf8');
  const match = /const ASSETS = (\[[\s\S]*?\n\]);/.exec(content);
  if (!match) {
    throw new Error('Could not find an ASSETS array in sw.js');
  }
  return JSON.parse(match[1]);
}

// An independent recursive walk of the same four asset directories, using a
// different mechanism (Node's own recursive readdirSync) than build-sw.js's
// hand-rolled walk(), so it can catch a bug in that recursion rather than
// agreeing with it by construction. Dotfiles/dot-directories are skipped to
// match buildAssetList's own filtering, so a stray .DS_Store can't cause a
// spurious failure.
function independentWalk(rootDir) {
  const dirs = ['js', 'css', 'images', 'flags'];
  const found = [];

  for (const dir of dirs) {
    const full = join(rootDir, dir);
    let entries;
    try {
      entries = readdirSync(full, { recursive: true });
    } catch (e) {
      continue;
    }

    for (const entry of entries) {
      const segments = entry.split(sep);
      if (segments.some(s => s.startsWith('.'))) continue;

      const absolute = join(full, entry);
      if (statSync(absolute).isDirectory()) continue;

      found.push('/' + dir + '/' + segments.join('/'));
    }
  }

  return found;
}

describe('buildAssetList', () => {
  it('includes the app shell', () => {
    expect(assets).toContain('/');
    expect(assets).toContain('/index.html');
    expect(assets).toContain('/manifest.json');
  });

  it('includes every js module', () => {
    expect(assets).toContain('/js/app.js');
    expect(assets).toContain('/js/engine/game-engine.js');
    expect(assets).toContain('/js/games/dice-addition.js');
  });

  it('includes stylesheets and icons', () => {
    expect(assets).toContain('/css/game.css');
    expect(assets).toContain('/images/icon-192.png');
  });

  it('includes every flag svg', () => {
    expect(assets.filter(a => a.startsWith('/flags/')).length).toBeGreaterThan(150);
  });

  it('excludes test and tooling files', () => {
    expect(assets.some(a => a.includes('node_modules'))).toBe(false);
    expect(assets.some(a => a.startsWith('/test/'))).toBe(false);
    expect(assets.some(a => a.startsWith('/tools/'))).toBe(false);
  });

  it('has no duplicates', () => {
    expect(new Set(assets).size).toBe(assets.length);
  });

  it('matches the ASSETS array committed in sw.js (catches a stale build)', () => {
    const committed = parseCommittedAssets(process.cwd());
    const committedSet = new Set(committed);
    const generatedSet = new Set(assets);

    const missingFromSw = assets.filter(a => !committedSet.has(a)).sort();
    const extraInSw = committed.filter(a => !generatedSet.has(a)).sort();

    expect(
      { missingFromSw, extraInSw },
      'sw.js is stale relative to the file tree — run `npm run build:sw` to regenerate it. ' +
        'missingFromSw = present on disk but not in the committed sw.js; ' +
        'extraInSw = present in the committed sw.js but no longer on disk.'
    ).toEqual({ missingFromSw: [], extraInSw: [] });
  });

  it('contains every file an independent directory walk finds (catches a walk() regression)', () => {
    const found = independentWalk(process.cwd());
    const missing = found.filter(p => !assets.includes(p)).sort();

    expect(
      missing,
      'buildAssetList is missing files that exist on disk under js/, css/, images/, or flags/ — ' +
        'walk() may have stopped recursing into a subdirectory.'
    ).toEqual([]);
  });
});

describe('nextVersion', () => {
  it('bumps the trailing counter when the date matches today', () => {
    expect(nextVersion('2026072716', '20260727')).toBe('20260727' + '17');
  });

  it('resets to 01 when the current version is from a previous day', () => {
    expect(nextVersion('2026072616', '20260727')).toBe('2026072701');
  });

  it('starts at 01 when there is no current version', () => {
    expect(nextVersion(null, '20260727')).toBe('2026072701');
    expect(nextVersion(undefined, '20260727')).toBe('2026072701');
  });

  it('starts at 01 when the current version is garbage/unparseable', () => {
    expect(nextVersion('not-a-version', '20260727')).toBe('2026072701');
    expect(nextVersion('', '20260727')).toBe('2026072701');
    expect(nextVersion('2026072', '20260727')).toBe('2026072701');
  });

  it('widens past two digits instead of wrapping at the 99 boundary', () => {
    expect(nextVersion('2026072799', '20260727')).toBe('20260727100');
  });

  it('keeps widening on subsequent same-day builds past the boundary', () => {
    expect(nextVersion('20260727100', '20260727')).toBe('20260727101');
  });
});
