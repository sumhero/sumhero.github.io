import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';

const doc = readFileSync('CLAUDE.md', 'utf8');

describe('CLAUDE.md', () => {
  it('no longer claims there are no tests', () => {
    expect(doc).not.toContain('no tests to run');
  });

  it('no longer describes implicit globals and script load order', () => {
    expect(doc).not.toContain('All globals are attached implicitly');
    expect(doc).not.toContain('load order in `index.html` matters');
  });

  it('no longer tells the reader to hand-edit sw.js or hand-bump CACHE_VERSION', () => {
    expect(doc).not.toContain('Add the same path to the `ASSETS` array');
    expect(doc).not.toContain('bumped so clients pick up the update');
    expect(doc).not.toContain('and bump `CACHE_VERSION`');
    expect(doc).toContain('hand-bump');
    expect(doc).toContain('hand-edit it');
  });

  it('documents the test command', () => {
    expect(doc).toContain('npm test');
  });

  it('documents the engine and the registry', () => {
    expect(doc).toContain('js/engine/game-engine.js');
    expect(doc).toContain('js/engine/registry.js');
  });

  it('documents the generated service worker', () => {
    expect(doc).toContain('npm run build:sw');
  });

  it('documents the legacy escape hatch and names both legacy games', () => {
    expect(doc).toContain('legacy');
    expect(doc).toContain('memory');
    expect(doc).toContain('double_crash');
  });

  it('documents the ctx contract fields a pure generate() receives', () => {
    expect(doc).toContain('ctx.rng');
    expect(doc).toContain('ctx.t');
    expect(doc).toContain('ctx.lang');
    expect(doc).toContain('ctx.count');
  });

  it('documents the testing discipline learned during this migration', () => {
    expect(doc).toContain('10 times');
  });

  it('references files that actually exist', () => {
    const paths = [...doc.matchAll(/`(js\/[\w./-]+)`/g)].map(m => m[1]);
    expect(paths.length).toBeGreaterThan(3);
    for (const path of paths) {
      expect(existsSync(path), path + ' referenced but missing').toBe(true);
    }
  });
});
