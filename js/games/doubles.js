import { drawDistinct } from '../engine/unique.js';

const MAX_N = { easy: 5, normal: 10, hard: 10 };
const MAX_HALF_ANSWER = 10;
const HALF_CHOICE_CEILING = 12;
const CHOICE_COUNT = 5;

export const DoublesGame = {
  id: 'doubles',
  nameKey: 'doubles',
  emoji: '👯',
  domain: 'nombres',
  rounds: { easy: 5, normal: 10, hard: 20 },
  layoutClass: 'num-game-layout',

  // The space equals the round count on every band, and on hard the asHalf
  // coin flip is independent per round, so the ten doubles and ten halves are
  // never drawn in balance. drawDistinct gets a session as close to a
  // permutation as forty tries allow and guarantees no back-to-back repeat
  // when it has to refill. The key is kind:operand — "double of 4" and
  // "half of 8" are different questions, and keying on the answer would halve
  // an already zero-slack space.
  generate(difficulty, ctx) {
    const { rng, t, count } = ctx;

    return drawDistinct(count, () => {
      const asHalf = difficulty === 'hard' && rng() < 0.5;

      return asHalf ? buildHalf(rng, t) : buildDouble(MAX_N[difficulty], rng, t);
    }, exercise => exercise.kind + ':' + exercise.operand);
  },
};

function buildDouble(maxN, rng, t) {
  const operand = Math.floor(rng() * maxN) + 1;
  const correctAnswer = operand * 2;

  return {
    kind: 'double',
    operand,
    correctAnswer,
    promptHtml: '<div class="op-question">' + t('doubleOf', { n: operand }) + '</div>',
    choices: buildChoices(correctAnswer, maxN * 2, rng),
  };
}

function buildHalf(rng, t) {
  const correctAnswer = Math.floor(rng() * MAX_HALF_ANSWER) + 1;
  const operand = correctAnswer * 2;

  return {
    kind: 'half',
    operand,
    correctAnswer,
    promptHtml: '<div class="op-question">' + t('halfOf', { n: operand }) + '</div>',
    choices: buildChoices(correctAnswer, HALF_CHOICE_CEILING, rng),
  };
}

function buildChoices(correct, ceiling, rng) {
  const choices = [correct];
  let guard = 0;

  while (choices.length < CHOICE_COUNT && guard < 200) {
    const wrong = Math.floor(rng() * ceiling) + 1;
    if (!choices.includes(wrong)) choices.push(wrong);
    guard++;
  }

  return shuffle(choices, rng);
}

function shuffle(items, rng) {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }

  return items;
}
