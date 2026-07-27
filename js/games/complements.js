import { TenFrameRenderer } from '../render/ten-frame.js';
import { drawDistinct } from '../engine/unique.js';

const TARGET = { easy: 5, normal: 10, hard: 20 };
const CHOICE_COUNT = 5;

export const ComplementsGame = {
  id: 'complements',
  nameKey: 'complements',
  emoji: '🤝',
  domain: 'nombres',
  rounds: { easy: 5, normal: 10, hard: 20 },
  layoutClass: 'num-game-layout',

  // start runs 1..target-1, so the space is 4, 9 or 19 against 5, 10 or 20
  // rounds. Uniqueness is impossible at every difficulty; drawDistinct cycles
  // the whole band and guarantees only that no start is ever repeated
  // back-to-back.
  generate(difficulty, ctx) {
    const { rng, t, count } = ctx;
    const target = TARGET[difficulty];

    return drawDistinct(count, () => {
      const start = Math.floor(rng() * (target - 1)) + 1;
      const correctAnswer = target - start;

      return {
        start,
        target,
        correctAnswer,
        promptHtml:
          TenFrameRenderer.render(start, target) +
          '<div class="op-question">' + start + ' + ? = ' + target + '</div>' +
          '<div class="op-hint">' + t('complementsPrompt') + '</div>',
        choices: buildChoices(correctAnswer, target, rng),
      };
    }, exercise => String(exercise.start));
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
