import { describe, it, expect } from 'vitest';
import { I18n } from '../js/i18n/i18n.js';
import { TRANSLATIONS, LANGUAGES } from '../js/i18n/translations.js';
import { DiceRenderer } from '../js/render/dice.js';
import { GAMES } from '../js/game-list.js';

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

  it('exports all ten existing games', () => {
    expect(GAMES.map(g => g.type)).toEqual([
      'dice_addition', 'count_objects', 'uno', 'dice_recognition',
      'countries', 'capitals', 'guess_time', 'double_crash', 'memory', 'chess',
    ]);
  });
});
