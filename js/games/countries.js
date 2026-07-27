import { getCountryPool, getCountryName } from '../data/countries.js';

const CHOICE_COUNT = 5;

export const CountriesGame = {
  id: 'countries',
  nameKey: 'countries',
  emoji: '🌍',
  domain: 'monde',
  rounds: { easy: 5, normal: 10, hard: 20 },
  layoutClass: 'geo-game-layout',
  choiceClass: 'geo-choice-btn',

  generate(difficulty, ctx) {
    const { rng, count, lang } = ctx;
    const pool = getCountryPool(difficulty);

    return pickCountries(pool, count, rng).map(country => ({
      country,
      promptHtml: '<img src="/flags/' + country.flag + '.svg" class="geo-flag" alt="">',
      correctAnswer: getCountryName(country, lang),
      choices: buildChoices(country, pool, rng, c => getCountryName(c, lang)),
    }));
  },
};

export function pickCountries(pool, count, rng) {
  const chosen = [];
  const used = new Set();
  let guard = 0;

  while (chosen.length < count && guard < pool.length * 20) {
    guard++;
    const idx = Math.floor(rng() * pool.length);
    if (used.has(idx) && used.size < pool.length) continue;
    used.add(idx);
    chosen.push(pool[idx]);
  }

  return chosen;
}

export function buildChoices(correctCountry, pool, rng, nameOf) {
  const choices = [nameOf(correctCountry)];
  const others = pool.filter(c => c.name !== correctCountry.name);

  while (choices.length < CHOICE_COUNT && others.length > 0) {
    const idx = Math.floor(rng() * others.length);
    const name = nameOf(others[idx]);
    if (!choices.includes(name)) choices.push(name);
    others.splice(idx, 1);
  }

  for (let i = choices.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [choices[i], choices[j]] = [choices[j], choices[i]];
  }

  return choices;
}
