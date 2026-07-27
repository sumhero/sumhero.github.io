import { describe, it, expect } from 'vitest';
import { CountriesGame } from '../../js/games/countries.js';
import { getCountryPool } from '../../js/data/countries.js';

function ctx(count, rng = Math.random, lang = 'fr') {
  return { rng, t: k => k, lang, count, category: null };
}

describe('CountriesGame', () => {
  it('sits in the world domain with the geo layout', () => {
    expect(CountriesGame.id).toBe('countries');
    expect(CountriesGame.domain).toBe('monde');
    expect(CountriesGame.layoutClass).toBe('geo-game-layout');
    expect(CountriesGame.rounds).toEqual({ easy: 5, normal: 10, hard: 20 });
  });

  it('generates the requested count', () => {
    expect(CountriesGame.generate('easy', ctx(5))).toHaveLength(5);
  });

  it('shows the exercise\'s own flag in the prompt, not a fixed one', () => {
    // Asserting only that promptHtml contains '/flags/' would pass even if
    // every exercise rendered pool[0].flag — always the same wrong flag.
    // Anchor to this exercise's own country.
    for (const ex of CountriesGame.generate('normal', ctx(10))) {
      expect(ex.promptHtml).toContain('/flags/' + ex.country.flag + '.svg');
    }
  });

  it('always includes the correct country name', () => {
    for (const ex of CountriesGame.generate('normal', ctx(10))) {
      expect(ex.choices).toContain(ex.correctAnswer);
    }
  });

  it('offers unique choices', () => {
    for (const ex of CountriesGame.generate('normal', ctx(10))) {
      expect(new Set(ex.choices).size).toBe(ex.choices.length);
    }
  });

  it('does not repeat a country within a session', () => {
    const names = CountriesGame.generate('hard', ctx(15)).map(e => e.correctAnswer);
    expect(new Set(names).size).toBe(names.length);
  });

  it('widens the country pool as difficulty rises', () => {
    // Comparing generated-set sizes at 20/20 would be vacuously true even if
    // difficulty were ignored entirely. Check the data layer directly, and
    // that the game actually draws from the difficulty-scoped pool.
    expect(getCountryPool('easy').length).toBeLessThan(getCountryPool('normal').length);
    expect(getCountryPool('normal').length).toBeLessThan(getCountryPool('hard').length);

    const easyPoolNames = new Set(getCountryPool('easy').map(c => c.name));
    const exercises = CountriesGame.generate('easy', ctx(20));
    for (const ex of exercises) {
      expect(easyPoolNames.has(ex.country.name)).toBe(true);
    }
  });

  it('resolves names from ctx.lang, not from storage', () => {
    // Cyrillic never coincides with Latin, so comparing 'fr' vs 'ru' output
    // for the identical seed is a deterministic way to prove the language
    // comes from ctx rather than from a module-scope I18n read.
    const values = [0.1, 0.6, 0.32, 0.81, 0.05, 0.93, 0.24, 0.4, 0.7, 0.15];

    const fr = CountriesGame.generate('easy', ctx(5, cyclingRngFactory(values)));
    const ru = CountriesGame.generate('easy', ctx(5, cyclingRngFactory(values), 'ru'));

    expect(fr.map(e => e.country.name)).toEqual(ru.map(e => e.country.name));
    expect(fr.map(e => e.correctAnswer)).not.toEqual(ru.map(e => e.correctAnswer));
  });

  it('is deterministic for a fixed rng', () => {
    const a = CountriesGame.generate('normal', ctx(5, cyclingRngFactory([0.2, 0.5, 0.8, 0.1, 0.35])));
    const b = CountriesGame.generate('normal', ctx(5, cyclingRngFactory([0.2, 0.5, 0.8, 0.1, 0.35])));

    expect(a.map(e => e.correctAnswer)).toEqual(b.map(e => e.correctAnswer));
    expect(a.map(e => e.choices)).toEqual(b.map(e => e.choices));
  });
});

function cyclingRngFactory(values) {
  let i = 0;
  return () => values[i++ % values.length];
}
