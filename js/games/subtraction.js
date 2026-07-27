import { OBJECT_CATEGORIES } from './object-categories.js';

const MAX = { easy: 5, normal: 10, hard: 20 };
const CHOICE_COUNT = 5;

export const SubtractionGame = {
  id: 'subtraction',
  nameKey: 'subtraction',
  emoji: '➖',
  domain: 'nombres',
  rounds: { easy: 5, normal: 10, hard: 20 },
  layoutClass: 'num-game-layout',

  generate(difficulty, ctx) {
    const { rng, t, count } = ctx;
    const max = MAX[difficulty];
    const exercises = [];

    for (let i = 0; i < count; i++) {
      // 2..max, so there is always at least one object left to count.
      const minuend = Math.floor(rng() * (max - 1)) + 2;
      // 1..minuend-1, so the answer is never zero and never the whole set.
      const subtrahend = Math.floor(rng() * (minuend - 1)) + 1;
      const correctAnswer = minuend - subtrahend;

      const category = OBJECT_CATEGORIES[Math.floor(rng() * OBJECT_CATEGORIES.length)];
      const emoji = category.emojis[Math.floor(rng() * category.emojis.length)];

      exercises.push({
        minuend,
        subtrahend,
        emoji,
        correctAnswer,
        promptHtml:
          renderObjects(minuend, subtrahend, emoji) +
          '<div class="op-question">' + minuend + ' − ' + subtrahend + ' = ?</div>' +
          '<div class="op-hint">' + t('subtractionPrompt') + '</div>',
        choices: buildChoices(correctAnswer, max, rng),
      });
    }

    return exercises;
  },
};

function renderObjects(minuend, subtrahend, emoji) {
  let out = '<div class="sub-objects">';

  for (let i = 0; i < minuend; i++) {
    const removed = i < subtrahend ? ' removed' : '';
    out += '<span class="sub-object' + removed + '">' + emoji + '</span>';
  }

  return out + '</div>';
}

function buildChoices(correct, max, rng) {
  const choices = [correct];
  let guard = 0;

  while (choices.length < CHOICE_COUNT && guard < 200) {
    const wrong = Math.floor(rng() * (max + 1));
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
