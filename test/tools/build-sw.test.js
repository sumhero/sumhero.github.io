import { describe, it, expect } from 'vitest';
import { buildAssetList, nextVersion } from '../../tools/build-sw.js';

const assets = buildAssetList(process.cwd());

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
