const RUN_LENGTH = 4;
const CHOICE_COUNT = 5;
const CONFIG = {
  easy: { max: 20, steps: [1] },
  normal: { max: 100, steps: [1] },
  hard: { max: 100, steps: [2, 5, 10] },
};

export const MissingNumberGame = {
  id: 'missing_number',
  nameKey: 'missingNumber',
  emoji: '❓',
  domain: 'nombres',
  rounds: { easy: 5, normal: 10, hard: 20 },
  layoutClass: 'num-game-layout',
  choiceClass: 'missing-number-choice-btn',

  generate(difficulty, ctx) {
    const { rng, t, count } = ctx;
    const { max, steps } = CONFIG[difficulty];
    const exercises = [];

    for (let i = 0; i < count; i++) {
      const step = steps[Math.floor(rng() * steps.length)];
      // Keep the last term inside the ceiling: start at most max - step * 3.
      const highestStart = max - step * (RUN_LENGTH - 1);
      const start = Math.floor(rng() * highestStart) + 1;

      const terms = [];
      for (let k = 0; k < RUN_LENGTH; k++) terms.push(start + k * step);

      const blankIndex = Math.floor(rng() * RUN_LENGTH);
      const correctAnswer = terms[blankIndex];

      exercises.push({
        terms,
        step,
        blankIndex,
        correctAnswer,
        promptHtml:
          '<div class="sequence-run">' +
            terms.map((term, index) => index === blankIndex
              ? '<span class="sequence-term blank">?</span>'
              : '<span class="sequence-term">' + term + '</span>').join('') +
          '</div>' +
          '<div class="op-hint">' + t('missingNumberPrompt') + '</div>',
        choices: buildChoices(correctAnswer, step, max, rng),
      });
    }

    return exercises;
  },
};

function buildChoices(correct, step, max, rng) {
  const near = [
    correct - step, correct + step,
    correct - 1, correct + 1,
    correct - 2 * step, correct + 2 * step,
  ].filter(value => value >= 1 && value <= max && value !== correct);

  const choices = [correct];

  for (const candidate of shuffle([...new Set(near)], rng)) {
    if (choices.length >= CHOICE_COUNT) break;
    if (!choices.includes(candidate)) choices.push(candidate);
  }

  let guard = 0;
  while (choices.length < CHOICE_COUNT && guard < 200) {
    const wrong = Math.floor(rng() * max) + 1;
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
