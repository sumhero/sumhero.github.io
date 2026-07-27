import { OBJECT_CATEGORIES } from './object-categories.js';

const MAX = { easy: 10, normal: 20, hard: 100 };
const EQUAL_CHANCE = 0.2;

// html is entity-escaped: GameEngine.renderDefaultChoices concatenates it
// straight into a <button>, so a raw '<' would open a bogus tag.
const SIGNS = [
  { value: 'lt', html: '&lt;' },
  { value: 'eq', html: '=' },
  { value: 'gt', html: '&gt;' },
];

export const CompareGame = {
  id: 'compare',
  nameKey: 'compare',
  emoji: '⚖️',
  domain: 'nombres',
  rounds: { easy: 5, normal: 10, hard: 20 },
  layoutClass: 'compare-layout',
  choiceClass: 'compare-choice-btn',

  generate(difficulty, ctx) {
    const { rng, t, count } = ctx;
    const max = MAX[difficulty];
    const exercises = [];

    for (let i = 0; i < count; i++) {
      const left = Math.floor(rng() * max) + 1;
      let right;

      if (rng() < EQUAL_CHANCE) {
        right = left;
      } else {
        let guard = 0;
        do {
          right = Math.floor(rng() * max) + 1;
          guard++;
        } while (right === left && guard < 200);
      }

      const category = OBJECT_CATEGORIES[Math.floor(rng() * OBJECT_CATEGORIES.length)];
      const emoji = category.emojis[Math.floor(rng() * category.emojis.length)];

      exercises.push({
        left,
        right,
        emoji,
        correctAnswer: left < right ? 'lt' : left > right ? 'gt' : 'eq',
        promptHtml:
          '<div class="compare-row">' +
            '<div class="compare-side">' + renderSide(left, difficulty, emoji) + '</div>' +
            '<div class="compare-gap">?</div>' +
            '<div class="compare-side">' + renderSide(right, difficulty, emoji) + '</div>' +
          '</div>' +
          '<div class="op-hint">' + t('comparePrompt') + '</div>',
        choices: shuffle(SIGNS.map(sign => ({ ...sign })), rng),
      });
    }

    return exercises;
  },
};

function renderSide(value, difficulty, emoji) {
  if (difficulty !== 'easy') {
    return '<span class="compare-number">' + value + '</span>';
  }

  let out = '<div class="compare-objects">';
  for (let i = 0; i < value; i++) {
    out += '<span class="compare-object">' + emoji + '</span>';
  }

  return out + '</div>';
}

function shuffle(items, rng) {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }

  return items;
}
