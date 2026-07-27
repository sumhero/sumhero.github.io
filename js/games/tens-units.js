import { BaseTenRenderer } from '../render/base-ten.js';

const CONFIG = {
  easy: { min: 10, max: 39, reverse: false },
  normal: { min: 10, max: 99, reverse: false },
  hard: { min: 10, max: 99, reverse: true },
};
const CHOICE_COUNT = 5;

export const TensUnitsGame = {
  id: 'tens_units',
  nameKey: 'tensUnits',
  emoji: '🧱',
  domain: 'nombres',
  rounds: { easy: 5, normal: 10, hard: 20 },
  layoutClass: 'num-game-layout',
  choiceClass: 'tens-units-choice-btn',

  generate(difficulty, ctx) {
    const { rng, t, count } = ctx;
    const config = CONFIG[difficulty];
    const exercises = [];

    for (let i = 0; i < count; i++) {
      const number = config.min + Math.floor(rng() * (config.max - config.min + 1));
      const tens = Math.floor(number / 10);
      const units = number % 10;

      // One shuffle site for both directions: the correct answer is always at
      // index 0 before shuffling, which is what makes the shuffle test's
      // ungrouped indexOf assertion meaningful.
      const values = shuffle([number, ...pickDistractors(number, config, rng)], rng);

      exercises.push({
        number,
        tens,
        units,
        reverse: config.reverse,
        correctAnswer: number,
        promptHtml: config.reverse
          ? '<div class="op-question">' + number + '</div>' +
            '<div class="op-hint">' + t('tensUnitsReversePrompt') + '</div>'
          : BaseTenRenderer.render(tens, units) +
            '<div class="op-hint">' + t('tensUnitsPrompt') + '</div>',
        choices: config.reverse
          ? values.map(value => ({
              value,
              html: BaseTenRenderer.render(Math.floor(value / 10), value % 10),
            }))
          : values,
      });
    }

    return exercises;
  },
};

function pickDistractors(number, config, rng) {
  const tens = Math.floor(number / 10);
  const units = number % 10;

  // The swapped digits first: reading 23 as 32 is the exact confusion this
  // game trains, so that distractor is preferred over an arbitrary number.
  const near = [
    units * 10 + tens,
    number + 1, number - 1,
    number + 10, number - 10,
    number + 9, number - 9,
  ].filter(value => value >= config.min && value <= config.max && value !== number);

  const chosen = [];

  if (near.length > 0 && near[0] === units * 10 + tens) {
    chosen.push(near[0]);
  }

  for (const candidate of shuffle([...new Set(near)], rng)) {
    if (chosen.length >= CHOICE_COUNT - 1) break;
    if (!chosen.includes(candidate)) chosen.push(candidate);
  }

  let guard = 0;
  while (chosen.length < CHOICE_COUNT - 1 && guard < 200) {
    const wrong = config.min + Math.floor(rng() * (config.max - config.min + 1));
    if (wrong !== number && !chosen.includes(wrong)) chosen.push(wrong);
    guard++;
  }

  return chosen;
}

function shuffle(items, rng) {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }

  return items;
}
