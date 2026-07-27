import { describe, it, expect } from 'vitest';
import { CapitalsGame } from '../../js/games/capitals.js';
import { getCountryPool, getCapitalName, getCountryName } from '../../js/data/countries.js';

function ctx(count, rng = Math.random, lang = 'fr') {
  return { rng, t: k => k, lang, count, category: null };
}

describe('CapitalsGame', () => {
  it('sits in the world domain with the geo layout', () => {
    expect(CapitalsGame.id).toBe('capitals');
    expect(CapitalsGame.domain).toBe('monde');
    expect(CapitalsGame.layoutClass).toBe('geo-game-layout');
    expect(CapitalsGame.rounds).toEqual({ easy: 5, normal: 10, hard: 20 });
  });

  it('generates the requested count', () => {
    expect(CapitalsGame.generate('easy', ctx(5))).toHaveLength(5);
  });

  it('shows the flag and the resolved country name in the prompt', () => {
    // Merely checking that promptHtml contains the class name
    // 'geo-country-name' would pass even if the wrong country's name (or the
    // wrong language) were rendered inside it. Anchor to the actual resolved
    // name for this exercise's own country and language.
    for (const ex of CapitalsGame.generate('normal', ctx(10))) {
      expect(ex.promptHtml).toContain('/flags/' + ex.country.flag + '.svg');
      expect(ex.promptHtml).toContain(
        '<div class="geo-country-name">' + getCountryName(ex.country, 'fr') + '</div>'
      );
    }
  });

  it('offers capital cities, not country names, as choices', () => {
    const capitals = getCountryPool('easy').map(c => getCapitalName(c, 'fr'));
    for (const ex of CapitalsGame.generate('easy', ctx(10))) {
      for (const choice of ex.choices) {
        expect(capitals).toContain(choice);
      }
    }
  });

  it('always includes the correct capital', () => {
    for (const ex of CapitalsGame.generate('normal', ctx(10))) {
      expect(ex.choices).toContain(ex.correctAnswer);
    }
  });

  it('offers unique choices', () => {
    for (const ex of CapitalsGame.generate('normal', ctx(10))) {
      expect(new Set(ex.choices).size).toBe(ex.choices.length);
    }
  });

  it('does not repeat a country within a session', () => {
    const names = CapitalsGame.generate('hard', ctx(15)).map(e => e.correctAnswer);
    expect(new Set(names).size).toBe(names.length);
  });

  it('resolves the correct answer from ctx.lang, not from storage', () => {
    // Cyrillic never coincides with Latin, so comparing 'fr' vs 'ru' output
    // for the identical seed deterministically proves the language comes
    // from ctx.lang rather than from localStorage or a module-scope I18n read.
    const values = [0.1, 0.6, 0.32, 0.81, 0.05, 0.93, 0.24, 0.4, 0.7, 0.15];

    const fr = CapitalsGame.generate('easy', ctx(5, cyclingRngFactory(values)));
    const ru = CapitalsGame.generate('easy', ctx(5, cyclingRngFactory(values), 'ru'));

    expect(fr.map(e => e.country.name)).toEqual(ru.map(e => e.country.name));
    expect(fr.map(e => e.correctAnswer)).not.toEqual(ru.map(e => e.correctAnswer));
  });

  it('is deterministic for a fixed rng', () => {
    const a = CapitalsGame.generate('normal', ctx(5, cyclingRngFactory([0.2, 0.5, 0.8, 0.1, 0.35])));
    const b = CapitalsGame.generate('normal', ctx(5, cyclingRngFactory([0.2, 0.5, 0.8, 0.1, 0.35])));

    expect(a.map(e => e.correctAnswer)).toEqual(b.map(e => e.correctAnswer));
    expect(a.map(e => e.choices)).toEqual(b.map(e => e.choices));
  });
});

function cyclingRngFactory(values) {
  let i = 0;
  return () => values[i++ % values.length];
}
