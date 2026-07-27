import { OBJECT_CATEGORIES } from './object-categories.js';
import { drawDistinct } from '../engine/unique.js';

const MAX = { easy: 10, normal: 20, hard: 100 };

// Two choices only. The English keys travel as the values so the answer never
// depends on the active language; the translated words are what the child reads.
const ANSWERS = [
  { value: 'even', labelKey: 'parityEven' },
  { value: 'odd', labelKey: 'parityOdd' },
];

export const ParityGame = {
  id: 'parity',
  nameKey: 'parity',
  emoji: '🧦',
  domain: 'nombres',
  rounds: { easy: 5, normal: 10, hard: 20 },
  layoutClass: 'parity-layout',
  choiceClass: 'parity-choice-btn',

  // Keyed on the number, never on correctAnswer: there are exactly two
  // possible answers, so an answer-keyed sampler would exhaust after two
  // rounds and alternate even/odd for the rest of the session. The question is
  // the number; the emoji is decoration, and two exercises showing "7" with
  // different objects are the same maths question.
  generate(difficulty, ctx) {
    const { rng, t, count } = ctx;
    const max = MAX[difficulty];

    return drawDistinct(count, () => {
      const number = 1 + Math.floor(rng() * max);
      // The object set is drawn here rather than asked for on a pre-screen: a
      // six-year-old should reach the first question in one tap.
      const category = OBJECT_CATEGORIES[Math.floor(rng() * OBJECT_CATEGORIES.length)];
      const emoji = category.emojis[Math.floor(rng() * category.emojis.length)];
      const showObjects = difficulty === 'easy';

      return {
        number,
        emoji: showObjects ? emoji : null,
        correctAnswer: number % 2 === 0 ? 'even' : 'odd',
        promptHtml:
          (showObjects
            ? renderPairs(number, emoji)
            : '<div class="op-question">' + number + '</div>') +
          '<div class="op-hint">' + t('parityPrompt') + '</div>',
        choices: shuffle(
          ANSWERS.map(answer => ({ value: answer.value, html: t(answer.labelKey) })),
          rng
        ),
      };
    }, exercise => String(exercise.number));
  },
};

// Even and odd is not a rule to memorise at CP, it is "does everyone have a
// partner?". So the objects are laid out as complete pairs, and an odd number
// leaves exactly one object visibly alone in its own container rather than
// tucked into the last pair.
function renderPairs(number, emoji) {
  let out = '<div class="parity-pairs">';

  for (let i = 0; i + 1 < number; i += 2) {
    out += '<div class="parity-pair">' +
      '<span class="parity-object">' + emoji + '</span>' +
      '<span class="parity-object">' + emoji + '</span>' +
    '</div>';
  }

  if (number % 2 === 1) {
    out += '<div class="parity-pair parity-lonely">' +
      '<span class="parity-object">' + emoji + '</span>' +
    '</div>';
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
