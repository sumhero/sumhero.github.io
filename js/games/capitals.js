import { getCountryPool, getCountryName, getCapitalName } from '../data/countries.js';
import { pickCountries, buildChoices } from './countries.js';

export const CapitalsGame = {
  id: 'capitals',
  nameKey: 'capitals',
  emoji: '🏛️',
  domain: 'monde',
  rounds: { easy: 5, normal: 10, hard: 20 },
  layoutClass: 'geo-game-layout',
  choiceClass: 'geo-choice-btn',

  generate(difficulty, ctx) {
    const { rng, count, lang } = ctx;
    const pool = getCountryPool(difficulty);

    return pickCountries(pool, count, rng).map(country => ({
      country,
      promptHtml:
        '<img src="/flags/' + country.flag + '.svg" class="geo-flag" alt="">' +
        '<div class="geo-country-name">' + getCountryName(country, lang) + '</div>',
      correctAnswer: getCapitalName(country, lang),
      choices: buildChoices(country, pool, rng, c => getCapitalName(c, lang)),
    }));
  },
};
