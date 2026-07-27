import { describe, it, expect } from 'vitest';
import { ParityGame } from '../../js/games/parity.js';

function ctx(count, rng = Math.random) {
  return { rng, t: k => k, lang: 'fr', count, category: null };
}

// Deliberately duplicated literals rather than imported from the game: a guard
// that reads its expectation out of the module under test cannot fail when the
// module is wrong.
const MAX = { easy: 10, normal: 20, hard: 100 };

function countMatches(html, pattern) {
  return (html.match(pattern) || []).length;
}

function objects(html) {
  return countMatches(html, /class="parity-object"/g);
}

function pairs(html) {
  // Lookahead rather than a bare closing quote: a lonely container carries
  // BOTH `parity-pair` and `parity-lonely` (class="parity-pair parity-lonely"),
  // so it must still count as one pair-slot here, while the wrapping
  // `parity-pairs` container (note the trailing "s") must not. A literal
  // `class="parity-pair"` match would silently undercount every odd number by
  // one, since the lonely div's class attribute never ends right after
  // "parity-pair".
  return countMatches(html, /class="parity-pair(?=["\s])/g);
}

function lonely(html) {
  return countMatches(html, /class="parity-pair parity-lonely"/g);
}

function values(ex) {
  return ex.choices.map(c => c.value);
}

describe('ParityGame', () => {
  it('is registered for the numbers domain with the standard round counts', () => {
    expect(ParityGame.id).toBe('parity');
    expect(ParityGame.nameKey).toBe('parity');
    expect(ParityGame.emoji).toBe('🧦');
    expect(ParityGame.domain).toBe('nombres');
    expect(ParityGame.rounds).toEqual({ easy: 5, normal: 10, hard: 20 });
    expect(ParityGame.layoutClass).toBe('parity-layout');
    expect(ParityGame.choiceClass).toBe('parity-choice-btn');
  });

  it('adds no new engine seam', () => {
    expect(ParityGame.renderPrompt).toBeUndefined();
    expect(ParityGame.renderChoices).toBeUndefined();
    expect(ParityGame.isCorrect).toBeUndefined();
    expect(ParityGame.legacy).toBeUndefined();
    expect(ParityGame.setup).toBeUndefined();
  });

  it('generates exactly ctx.count exercises, not game.rounds', () => {
    expect(ParityGame.generate('easy', ctx(7))).toHaveLength(7);
    expect(ParityGame.generate('hard', ctx(3))).toHaveLength(3);
  });

  for (const [difficulty, max] of Object.entries(MAX)) {
    it(`keeps the number within 1..${max} on ${difficulty}`, () => {
      for (const ex of ParityGame.generate(difficulty, ctx(40))) {
        expect(ex.number).toBeGreaterThanOrEqual(1);
        expect(ex.number).toBeLessThanOrEqual(max);
        expect(Number.isInteger(ex.number)).toBe(true);
      }
    });
  }

  it('states the parity the number actually has', () => {
    // The whole game in one assertion. The expected value is recomputed here
    // from the number rather than read from the game.
    for (const difficulty of ['easy', 'normal', 'hard']) {
      for (const ex of ParityGame.generate(difficulty, ctx(40))) {
        expect(ex.correctAnswer).toBe(ex.number % 2 === 0 ? 'even' : 'odd');
      }
    }
  });

  it('produces both parities at every difficulty, so neither button is dead', () => {
    for (const difficulty of ['easy', 'normal', 'hard']) {
      const answers = new Set();
      for (let i = 0; i < 20; i++) {
        for (const ex of ParityGame.generate(difficulty, ctx(20))) answers.add(ex.correctAnswer);
      }
      expect([...answers].sort()).toEqual(['even', 'odd']);
    }
  });

  it('offers exactly two choices, pair and impair, labelled through ctx.t', () => {
    for (const difficulty of ['easy', 'normal', 'hard']) {
      for (const ex of ParityGame.generate(difficulty, ctx(15))) {
        expect(ex.choices).toHaveLength(2);
        expect(values(ex).slice().sort()).toEqual(['even', 'odd']);
        expect(values(ex)).toContain(ex.correctAnswer);
        expect(ex.choices.map(c => c.html).slice().sort())
          .toEqual(['parityEven', 'parityOdd']);
      }
    }
  });

  it('draws exactly as many objects as the number, arranged in pairs, on easy', () => {
    // Three traps in one: fewer objects than the number (the child counts a
    // different number than the one being judged), pairs that do not hold two
    // objects, and an odd leftover that is not visibly alone.
    for (const ex of ParityGame.generate('easy', ctx(40))) {
      expect(objects(ex.promptHtml)).toBe(ex.number);
      expect(pairs(ex.promptHtml)).toBe(Math.ceil(ex.number / 2));
      expect(countMatches(ex.promptHtml, new RegExp(ex.emoji, 'g'))).toBe(ex.number);
      expect(ex.promptHtml).toContain('parityPrompt');
      expect(ex.promptHtml).not.toContain('op-question');

      if (ex.number % 2 === 0) {
        expect(lonely(ex.promptHtml)).toBe(0);
      } else {
        expect(lonely(ex.promptHtml)).toBe(1);
      }
    }
  });

  it('leaves exactly one object unpaired when the number is odd', () => {
    // The lonely container must hold ONE object. Two would pair it up again and
    // the picture would say "even" while the answer says "odd".
    let checked = 0;
    for (let i = 0; i < 30; i++) {
      for (const ex of ParityGame.generate('easy', ctx(10))) {
        if (ex.number % 2 === 0) continue;
        const block = /<div class="parity-pair parity-lonely">([\s\S]*?)<\/div>/
          .exec(ex.promptHtml);
        expect(block).not.toBeNull();
        expect(countMatches(block[1], /class="parity-object"/g)).toBe(1);
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(0);
  });

  it('shows a bare numeral on normal and hard, with no objects at all', () => {
    for (const difficulty of ['normal', 'hard']) {
      for (const ex of ParityGame.generate(difficulty, ctx(25))) {
        expect(ex.emoji).toBeNull();
        expect(objects(ex.promptHtml)).toBe(0);
        expect(ex.promptHtml)
          .toContain('<div class="op-question">' + ex.number + '</div>');
        expect(ex.promptHtml).toContain('parityPrompt');
      }
    }
  });

  it('picks its objects from the shared category sets', () => {
    const seen = new Set();
    for (let i = 0; i < 40; i++) {
      for (const ex of ParityGame.generate('easy', ctx(10))) seen.add(ex.emoji);
    }
    // Ten categories of fifteen emoji: a game that hardcoded one object would
    // show a single value here.
    expect(seen.size).toBeGreaterThan(10);
  });

  it('moves the correct answer around instead of parking it at one index', () => {
    // Shape B, and mandatory here. There are only TWO choices, built from a
    // constant [even, odd] array while correctAnswer varies. Ungrouped, the
    // position set is {0, 1} even with the shuffle deleted, so the naive test
    // passes on unshuffled code — see this task's Step 10, which demonstrates
    // it. Grouping by the answer's own value pins each group to a single index
    // without the shuffle and is the only version that can fail.
    for (const difficulty of ['easy', 'normal', 'hard']) {
      const positionsByAnswer = { even: new Set(), odd: new Set() };
      for (let i = 0; i < 40; i++) {
        for (const ex of ParityGame.generate(difficulty, ctx(10))) {
          positionsByAnswer[ex.correctAnswer].add(values(ex).indexOf(ex.correctAnswer));
        }
      }
      for (const answer of ['even', 'odd']) {
        expect(positionsByAnswer[answer].size).toBeGreaterThan(1);
      }
    }
  });

  it('is deterministic for a fixed rng', () => {
    const seeded = () => 0.5;
    for (const difficulty of ['easy', 'normal', 'hard']) {
      const a = ParityGame.generate(difficulty, ctx(5, seeded));
      const b = ParityGame.generate(difficulty, ctx(5, seeded));
      expect(a.map(e => e.number)).toEqual(b.map(e => e.number));
      expect(a.map(e => e.promptHtml)).toEqual(b.map(e => e.promptHtml));
      expect(a.map(e => JSON.stringify(e.choices))).toEqual(b.map(e => JSON.stringify(e.choices)));
    }
  });
});
