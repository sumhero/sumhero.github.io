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

  generate(difficulty, ctx) {
    const { rng, t, count } = ctx;
    const exercises = [];

    for (let i = 0; i < count; i++) {
      const asHalf = difficulty === 'hard' && rng() < 0.5;
      exercises.push(asHalf ? buildHalf(rng, t) : buildDouble(MAX_N[difficulty], rng, t));
    }

    return exercises;
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
