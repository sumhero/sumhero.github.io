import { TenFrameRenderer } from '../render/ten-frame.js';

const TARGET = { easy: 5, normal: 10, hard: 20 };
const CHOICE_COUNT = 5;

export const ComplementsGame = {
  id: 'complements',
  nameKey: 'complements',
  emoji: '🤝',
  domain: 'nombres',
  rounds: { easy: 5, normal: 10, hard: 20 },
  layoutClass: 'num-game-layout',

  generate(difficulty, ctx) {
    const { rng, t, count } = ctx;
    const target = TARGET[difficulty];
    const exercises = [];
    let previous = -1;

    for (let i = 0; i < count; i++) {
      let start;
      let guard = 0;
      do {
        start = Math.floor(rng() * (target - 1)) + 1;
        guard++;
      } while (start === previous && guard < 200);
      previous = start;

      const correctAnswer = target - start;

      exercises.push({
        start,
        target,
        correctAnswer,
        promptHtml:
          TenFrameRenderer.render(start, target) +
          '<div class="op-question">' + start + ' + ? = ' + target + '</div>' +
          '<div class="op-hint">' + t('complementsPrompt') + '</div>',
        choices: buildChoices(correctAnswer, target, rng),
      });
    }

    return exercises;
  },
};

function buildChoices(correct, target, rng) {
  const choices = [correct];
  let guard = 0;

  while (choices.length < CHOICE_COUNT && guard < 200) {
    const wrong = Math.floor(rng() * (target + 1));
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
