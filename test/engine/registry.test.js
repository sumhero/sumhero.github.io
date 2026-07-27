import { describe, it, expect } from 'vitest';
import { DOMAINS, GAMES, gamesByDomain } from '../../js/engine/registry.js';

describe('registry', () => {
  it('declares the five domains in display order', () => {
    expect(DOMAINS.map(d => d.key))
      .toEqual(['nombres', 'mesures', 'geometrie', 'logique', 'monde']);
  });

  it('registers every game', () => {
    expect(GAMES.map(g => g.id).sort()).toEqual([
      'capitals', 'chess', 'compare', 'complements', 'count_objects',
      'countries', 'dice_addition', 'dice_recognition', 'double_crash',
      'doubles', 'guess_time', 'memory', 'missing_number', 'money',
      'number_words', 'shapes', 'subtraction', 'tens_units', 'uno',
      'word_problems',
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
      .toEqual(['nombres', 'mesures', 'geometrie', 'logique', 'monde']);
    expect(grouped[0].games.map(g => g.id))
      .toEqual([
        'dice_addition', 'count_objects', 'dice_recognition', 'complements',
        'subtraction', 'doubles', 'compare', 'missing_number', 'tens_units',
        'number_words', 'word_problems',
      ]);
    expect(grouped[1].games.map(g => g.id)).toEqual(['guess_time', 'money']);
    expect(grouped[2].games.map(g => g.id)).toEqual(['shapes']);
    expect(grouped[3].games.map(g => g.id))
      .toEqual(['uno', 'memory', 'chess', 'double_crash']);
    expect(grouped[4].games.map(g => g.id))
      .toEqual(['countries', 'capitals']);
  });

  it('surfaces geometrie now that Tier 3 has filled it, and still filters empty domains', () => {
    // Before this checkpoint geometrie was declared in DOMAINS but had no
    // games, and gamesByDomain() dropped it. shapes is the first and only
    // geometry game, so the group must now appear — while the filter itself
    // stays proven by a domain key that no game claims.
    const grouped = gamesByDomain();
    expect(grouped.map(g => g.domain.key)).toContain('geometrie');
    expect(grouped.find(g => g.domain.key === 'geometrie').games.map(g => g.id))
      .toEqual(['shapes']);
    expect(gamesByDomain().every(group => group.games.length > 0)).toBe(true);
    const claimed = new Set(GAMES.map(g => g.domain));
    for (const group of grouped) expect(claimed.has(group.domain.key)).toBe(true);
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
