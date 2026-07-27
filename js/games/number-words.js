import { numberToWords } from '../data/number-words.js';
import { drawDistinct } from '../engine/unique.js';

const RANGE = {
  easy: { min: 1, max: 10 },
  normal: { min: 1, max: 20 },
  hard: { min: 1, max: 100 },
};
// soixante-dix .. quatre-vingt-dix-neuf: the irregular French band CP pupils
// actually stumble on.
const IRREGULAR = { min: 70, max: 99 };
const CHOICE_COUNT = 5;

export const NumberWordsGame = {
  id: 'number_words',
  nameKey: 'numberWords',
  emoji: '🔤',
  domain: 'nombres',
  rounds: { easy: 5, normal: 10, hard: 20 },
  layoutClass: 'num-game-layout',
  choiceClass: 'number-words-choice-btn',

  // Word to numeral, never the other way round: the prompt is the spelling and
  // the choices are digits. No `speak` here — reading the word aloud would
  // hand the child the answer.
  //
  // The draw takes the round index, so hard keeps alternating its irregular
  // French band on even rounds. One shared used-set covers both bands: they
  // overlap only on 70-99, and ten even-index draws from a thirty-value band
  // is comfortably inside the try budget.
  generate(difficulty, ctx) {
    const { rng, t, lang, count } = ctx;
    const range = RANGE[difficulty];

    return drawDistinct(count, i => {
      // Alternate rather than roll: an index-based guarantee is testable
      // without a flaky "often enough" assertion.
      const irregular = difficulty === 'hard' && i % 2 === 0;
      const from = irregular ? IRREGULAR : range;
      const number = from.min + Math.floor(rng() * (from.max - from.min + 1));
      const word = numberToWords(number, lang);

      return {
        number,
        irregular,
        word,
        correctAnswer: number,
        promptHtml:
          '<div class="number-word">' + word + '</div>' +
          '<div class="op-hint">' + t('numberWordsPrompt') + '</div>',
        choices: buildChoices(number, range, rng),
      };
    }, exercise => String(exercise.number));
  },
};

function buildChoices(correct, range, rng) {
  const near = [correct - 1, correct + 1, correct - 2, correct + 2, correct - 10, correct + 10]
    .filter(value => value >= range.min && value <= range.max && value !== correct);

  const choices = [correct];

  for (const candidate of shuffle([...new Set(near)], rng)) {
    if (choices.length >= CHOICE_COUNT) break;
    if (!choices.includes(candidate)) choices.push(candidate);
  }

  let guard = 0;
  while (choices.length < CHOICE_COUNT && guard < 200) {
    const wrong = range.min + Math.floor(rng() * (range.max - range.min + 1));
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
