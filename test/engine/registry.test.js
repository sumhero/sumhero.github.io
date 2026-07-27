import { describe, it, expect } from 'vitest';
import { DOMAINS, GAMES, gamesByDomain } from '../../js/engine/registry.js';

describe('registry', () => {
  it('declares the five domains in display order', () => {
    expect(DOMAINS.map(d => d.key))
      .toEqual(['nombres', 'mesures', 'geometrie', 'logique', 'monde']);
  });

  it('registers every game', () => {
    expect(GAMES.map(g => g.id).sort()).toEqual([
      'capitals', 'chess', 'complements', 'count_objects', 'countries',
      'dice_addition', 'dice_recognition', 'double_crash', 'guess_time',
      'memory', 'subtraction', 'uno',
    ]);
  });

  it('gives every game a domain that exists', () => {
    const keys = DOMAINS.map(d => d.key);
    for (const game of GAMES) {
      expect(keys).toContain(game.domain);
    }
  });

  it('gives every engine-driven game the fields the engine requires', () => {
    for (const game of GAMES.filter(g => !g.legacy)) {
      expect(typeof game.generate).toBe('function');
      expect(game.nameKey).toBeTruthy();
      expect(game.emoji).toBeTruthy();
    }
  });

  it('marks the legacy games, and each supplies its own start()', () => {
    const legacy = GAMES.filter(g => g.legacy);
    expect(legacy.map(g => g.id)).toEqual(['memory', 'double_crash']);
    for (const game of legacy) {
      expect(typeof game.start).toBe('function');
    }
  });

  it('groups games under their domain, skipping empty domains', () => {
    const grouped = gamesByDomain();
    expect(grouped.map(g => g.domain.key))
      .toEqual(['nombres', 'mesures', 'logique', 'monde']);
    expect(grouped[0].games.map(g => g.id))
      .toEqual(['dice_addition', 'count_objects', 'dice_recognition', 'complements', 'subtraction']);
    expect(grouped[1].games.map(g => g.id)).toEqual(['guess_time']);
    expect(grouped[2].games.map(g => g.id))
      .toEqual(['uno', 'memory', 'chess', 'double_crash']);
    expect(grouped[3].games.map(g => g.id))
      .toEqual(['countries', 'capitals']);
  });

  it('leaves geometrie empty until Tier 3 adds shapes', () => {
    expect(gamesByDomain().map(g => g.domain.key)).not.toContain('geometrie');
  });

  it('gives every game at most one dispatch-selecting field, since the chooser checks them in a fixed order', () => {
    // GameList.load() branches on legacy / setup === 'category' / rounds === 'ask' in that
    // order. The order is only safe because no game today sets more than one of these — if
    // a future game combined two, the chooser's fixed branch order would silently decide
    // which one wins. This test exists to fail loudly at that point instead.
    for (const game of GAMES) {
      const dispatchFields = [
        game.legacy === true,
        game.setup === 'category',
        game.rounds === 'ask',
      ].filter(Boolean).length;
      expect(dispatchFields).toBeLessThanOrEqual(1);
    }
  });
});
