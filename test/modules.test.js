import { describe, it, expect } from 'vitest';
import { I18n } from '../js/i18n/i18n.js';
import { TRANSLATIONS, LANGUAGES } from '../js/i18n/translations.js';
import { DiceRenderer } from '../js/render/dice.js';
import { GAMES } from '../js/engine/registry.js';

describe('ES module conversion', () => {
  it('exports the translation table for all five languages', () => {
    expect(Object.keys(TRANSLATIONS).sort()).toEqual(['de', 'en', 'fr', 'ru', 'uk']);
    expect(LANGUAGES.map(l => l.code).sort()).toEqual(['de', 'en', 'fr', 'ru', 'uk']);
  });

  it('exports a working I18n lookup', () => {
    expect(I18n.t('appName')).toBe('SumHero');
  });

  it('exports DiceRenderer producing an svg', () => {
    expect(DiceRenderer.render(3)).toContain('<svg');
  });

  // The authoritative game inventory lives in test/engine/registry.test.js.
  // Here we only prove the whole import graph resolves — importing registry.js
  // pulls in every game module, so a broken import anywhere fails this.
  it('exports the game registry with a unique id per game', () => {
    const ids = GAMES.map(g => g.id);
    expect(ids.length).toBeGreaterThan(0);
    expect(ids.every(id => typeof id === 'string' && id.length > 0)).toBe(true);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
