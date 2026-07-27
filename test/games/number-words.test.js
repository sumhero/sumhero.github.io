import { describe, it, expect } from 'vitest';
import { NumberWordsGame } from '../../js/games/number-words.js';
import { numberToWords } from '../../js/data/number-words.js';

function ctx(count, rng = Math.random, lang = 'fr') {
  return { rng, t: k => k, lang, count, category: null };
}

const RANGE = { easy: [1, 10], normal: [1, 20], hard: [1, 100] };

// Literal French spellings, written out here rather than derived from the data
// module, so "the game shows the right word" is not proven by calling the same
// function the game calls.
const FRENCH = {
  1: 'un', 2: 'deux', 3: 'trois', 4: 'quatre', 5: 'cinq', 6: 'six', 7: 'sept',
  8: 'huit', 9: 'neuf', 10: 'dix', 11: 'onze', 12: 'douze', 13: 'treize',
  14: 'quatorze', 15: 'quinze', 16: 'seize', 17: 'dix-sept', 18: 'dix-huit',
  19: 'dix-neuf', 20: 'vingt', 21: 'vingt et un', 70: 'soixante-dix',
  71: 'soixante et onze', 80: 'quatre-vingts', 81: 'quatre-vingt-un',
  91: 'quatre-vingt-onze', 99: 'quatre-vingt-dix-neuf',
};

function countMatches(html, pattern) {
  return (html.match(pattern) || []).length;
}

describe('NumberWordsGame', () => {
  it('is registered for the numbers domain with the standard round counts', () => {
    expect(NumberWordsGame.id).toBe('number_words');
    expect(NumberWordsGame.nameKey).toBe('numberWords');
    expect(NumberWordsGame.domain).toBe('nombres');
    expect(NumberWordsGame.rounds).toEqual({ easy: 5, normal: 10, hard: 20 });
    expect(NumberWordsGame.layoutClass).toBe('num-game-layout');
    expect(NumberWordsGame.choiceClass).toBe('number-words-choice-btn');
  });

  it('generates exactly ctx.count exercises, not game.rounds', () => {
    expect(NumberWordsGame.generate('easy', ctx(7))).toHaveLength(7);
    expect(NumberWordsGame.generate('hard', ctx(3))).toHaveLength(3);
  });

  it('never speaks the prompt, which would read the answer aloud', () => {
    for (const difficulty of ['easy', 'normal', 'hard']) {
      for (const ex of NumberWordsGame.generate(difficulty, ctx(20))) {
        expect(ex.speak).toBeUndefined();
      }
    }
  });

  for (const [difficulty, [min, max]] of Object.entries(RANGE)) {
    it(`keeps the number within ${min}..${max} on ${difficulty}`, () => {
      for (const ex of NumberWordsGame.generate(difficulty, ctx(30))) {
        expect(ex.number).toBeGreaterThanOrEqual(min);
        expect(ex.number).toBeLessThanOrEqual(max);
        expect(ex.correctAnswer).toBe(ex.number);
      }
    });
  }

  it('spells the prompt word correctly for its numeral in French', () => {
    // The trap: a prompt word that is not the spelling of the number the
    // choices are graded against. Every easy number is in the literal table.
    for (const ex of NumberWordsGame.generate('easy', ctx(30))) {
      expect(FRENCH[ex.number], 'missing literal for ' + ex.number).toBeDefined();
      expect(ex.word).toBe(FRENCH[ex.number]);
      expect(ex.promptHtml).toContain('<div class="number-word">' + FRENCH[ex.number] + '</div>');
    }
    // And on hard, spot-check whichever of the irregular numbers turn up.
    for (const ex of NumberWordsGame.generate('hard', ctx(60))) {
      if (FRENCH[ex.number] === undefined) continue;
      expect(ex.word, String(ex.number)).toBe(FRENCH[ex.number]);
    }
  });

  it('shows exactly one word, and it is the answer, never a distractor', () => {
    for (const difficulty of ['easy', 'normal', 'hard']) {
      for (const ex of NumberWordsGame.generate(difficulty, ctx(25))) {
        expect(countMatches(ex.promptHtml, /class="number-word"/g)).toBe(1);
        expect(ex.word).toBe(numberToWords(ex.correctAnswer, 'fr'));
        expect(ex.promptHtml).toContain('numberWordsPrompt');
      }
    }
  });

  it('spells the word in the active language rather than hardcoding one', () => {
    const seeded = () => 0.5;
    const fr = NumberWordsGame.generate('normal', ctx(5, seeded, 'fr'));
    const de = NumberWordsGame.generate('normal', ctx(5, seeded, 'de'));
    const uk = NumberWordsGame.generate('normal', ctx(5, seeded, 'uk'));

    expect(de.map(e => e.number)).toEqual(fr.map(e => e.number));
    expect(uk.map(e => e.number)).toEqual(fr.map(e => e.number));
    expect(de.map(e => e.word)).not.toEqual(fr.map(e => e.word));
    expect(uk.map(e => e.word)).not.toEqual(fr.map(e => e.word));
    for (const ex of de) expect(ex.word).toBe(numberToWords(ex.number, 'de'));
    for (const ex of uk) expect(ex.word).toBe(numberToWords(ex.number, 'uk'));
  });

  it('drills the irregular 70-99 band on every other hard exercise', () => {
    const exercises = NumberWordsGame.generate('hard', ctx(20));
    exercises.forEach((ex, index) => {
      expect(ex.irregular).toBe(index % 2 === 0);
      if (!ex.irregular) return;
      expect(ex.number).toBeGreaterThanOrEqual(70);
      expect(ex.number).toBeLessThanOrEqual(99);
    });
  });

  it('never marks easy or normal exercises as irregular-band drills', () => {
    for (const difficulty of ['easy', 'normal']) {
      for (const ex of NumberWordsGame.generate(difficulty, ctx(20))) {
        expect(ex.irregular).toBe(false);
      }
    }
  });

  it('offers five distinct whole-number choices in range, including the answer', () => {
    for (const [difficulty, [min, max]] of Object.entries(RANGE)) {
      for (const ex of NumberWordsGame.generate(difficulty, ctx(25))) {
        expect(ex.choices).toHaveLength(5);
        expect(new Set(ex.choices).size).toBe(5);
        expect(ex.choices).toContain(ex.correctAnswer);
        for (const choice of ex.choices) {
          expect(Number.isInteger(choice)).toBe(true);
          expect(choice).toBeGreaterThanOrEqual(min);
          expect(choice).toBeLessThanOrEqual(max);
        }
      }
    }
  });

  it('moves the correct answer around instead of parking it at one index', () => {
    // Shape A: buildChoices starts from [correct] and shuffles at the end, so
    // the pre-shuffle index is a fixed 0 and deleting the shuffle collapses
    // every observed position to 0.
    const positions = new Set();
    for (let i = 0; i < 30; i++) {
      for (const ex of NumberWordsGame.generate('normal', ctx(10))) {
        positions.add(ex.choices.indexOf(ex.correctAnswer));
      }
    }
    expect(positions.size).toBeGreaterThan(1);
  });

  it('is deterministic for a fixed rng', () => {
    const seeded = () => 0.5;
    const a = NumberWordsGame.generate('hard', ctx(5, seeded));
    const b = NumberWordsGame.generate('hard', ctx(5, seeded));
    expect(a.map(e => e.number)).toEqual(b.map(e => e.number));
    expect(a.map(e => e.promptHtml)).toEqual(b.map(e => e.promptHtml));
    expect(a.map(e => e.choices.join(','))).toEqual(b.map(e => e.choices.join(',')));
  });

  it('never spells the same number twice in a session', () => {
    // easy 1-10 over 5 rounds, normal 1-20 over 10, hard alternates the
    // irregular 70-99 band on even rounds with 1-100 on odd ones over 20.
    // Full distinctness held in 500 000 of 500 000 simulated sessions.
    for (const [difficulty, rounds] of [['easy', 5], ['normal', 10], ['hard', 20]]) {
      for (let session = 0; session < 30; session++) {
        const numbers = NumberWordsGame.generate(difficulty, ctx(rounds)).map(ex => ex.number);

        expect(new Set(numbers).size, difficulty).toBe(rounds);
      }
    }
  });

  it('never spells the same number in two consecutive rounds', () => {
    // Direct check of the no-adjacent-repeats guarantee drawDistinct provides,
    // independent of the full-distinctness test above.
    for (const [difficulty, rounds] of [['easy', 5], ['normal', 10], ['hard', 20]]) {
      for (let session = 0; session < 30; session++) {
        const numbers = NumberWordsGame.generate(difficulty, ctx(rounds)).map(ex => ex.number);

        for (let i = 1; i < numbers.length; i++) {
          expect(numbers[i], difficulty + ' round ' + i).not.toBe(numbers[i - 1]);
        }
      }
    }
  });

  it('keeps the irregular band on even rounds after deduplication', () => {
    // The guarantee the sampler had to be built around: hard draws the
    // irregular French 70-99 band on even indices and the full 1-100 range on
    // odd ones. drawDistinct passes the round index into the draw, so the
    // alternation is index-driven and survives rejection. The rejected
    // engine-side "over-generate and filter" design would have destroyed this.
    for (let session = 0; session < 30; session++) {
      const exercises = NumberWordsGame.generate('hard', ctx(20));

      exercises.forEach((ex, i) => {
        if (i % 2 === 0) {
          expect(ex.irregular, 'round ' + i).toBe(true);
          // 70..99 stated as independent literals, not read from IRREGULAR.
          expect(ex.number).toBeGreaterThanOrEqual(70);
          expect(ex.number).toBeLessThanOrEqual(99);
        } else {
          expect(ex.irregular, 'round ' + i).toBe(false);
        }
      });
    }
  });
});
