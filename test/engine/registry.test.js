import { describe, it, expect } from 'vitest';
import { DOMAINS, GAMES, gamesByDomain } from '../../js/engine/registry.js';

describe('registry', () => {
  it('declares the five domains in display order', () => {
    expect(DOMAINS.map(d => d.key))
      .toEqual(['nombres', 'mesures', 'geometrie', 'logique', 'monde']);
  });

  it('registers all ten existing games', () => {
    expect(GAMES.map(g => g.id).sort()).toEqual([
      'capitals', 'chess', 'count_objects', 'countries', 'dice_addition',
      'dice_recognition', 'double_crash', 'guess_time', 'memory', 'uno',
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
      .toEqual(['dice_addition', 'count_objects', 'dice_recognition']);
    expect(grouped[1].games.map(g => g.id)).toEqual(['guess_time']);
    expect(grouped[2].games.map(g => g.id))
      .toEqual(['uno', 'memory', 'chess', 'double_crash']);
  });

  it('leaves geometrie empty until Tier 3 adds shapes', () => {
    expect(gamesByDomain().map(g => g.domain.key)).not.toContain('geometrie');
  });
});
