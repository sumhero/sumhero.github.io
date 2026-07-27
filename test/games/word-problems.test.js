import { describe, it, expect } from 'vitest';
import { WordProblemsGame } from '../../js/games/word-problems.js';
import { OBJECT_CATEGORIES } from '../../js/games/object-categories.js';

// The t stub echoes the key and every interpolated parameter, so a sentence
// built by string concatenation instead of ctx.t interpolation fails here.
function ctx(count, rng = Math.random) {
  return {
    rng,
    t: (key, params) => key + '(' + Object.keys(params || {}).sort()
      .map(name => name + '=' + params[name]).join(',') + ')',
    lang: 'fr',
    count,
    category: null,
  };
}

const CEILING = { easy: 10, normal: 20, hard: 20 };
const ALL_EMOJIS = new Set(OBJECT_CATEGORIES.flatMap(c => c.emojis));

function expected(ex) {
  if (ex.kind === 'add') return ex.a + ex.b;
  if (ex.kind === 'sub') return ex.a - ex.b;
  if (ex.kind === 'addAdd') return ex.a + ex.b + ex.c;

  return ex.a + ex.b - ex.c;
}

function stubSentence(ex) {
  const key = { add: 'wpAdd', sub: 'wpSub', addAdd: 'wpAddAdd', addSub: 'wpAddSub' }[ex.kind];
  const params = ex.c === null ? 'a=' + ex.a + ',b=' + ex.b
    : 'a=' + ex.a + ',b=' + ex.b + ',c=' + ex.c;

  return key + '(' + params + ')';
}

describe('WordProblemsGame', () => {
  it('is registered for the numbers domain with the standard round counts', () => {
    expect(WordProblemsGame.id).toBe('word_problems');
    expect(WordProblemsGame.nameKey).toBe('wordProblems');
    expect(WordProblemsGame.domain).toBe('nombres');
    expect(WordProblemsGame.rounds).toEqual({ easy: 5, normal: 10, hard: 20 });
    expect(WordProblemsGame.layoutClass).toBe('num-game-layout');
    expect(WordProblemsGame.choiceClass).toBe('wp-choice-btn');
  });

  it('generates exactly ctx.count exercises, not game.rounds', () => {
    expect(WordProblemsGame.generate('easy', ctx(7))).toHaveLength(7);
    expect(WordProblemsGame.generate('hard', ctx(3))).toHaveLength(3);
  });

  it('speaks every prompt, using the same sentence it renders', () => {
    for (const difficulty of ['easy', 'normal', 'hard']) {
      for (const ex of WordProblemsGame.generate(difficulty, ctx(20))) {
        expect(typeof ex.speak).toBe('string');
        expect(ex.speak.length).toBeGreaterThan(0);
        expect(ex.promptHtml).toContain('<div class="wp-sentence">' + ex.speak + '</div>');
      }
    }
  });

  it('builds the sentence through ctx.t interpolation, not concatenation', () => {
    for (const difficulty of ['easy', 'normal', 'hard']) {
      for (const ex of WordProblemsGame.generate(difficulty, ctx(20))) {
        expect(ex.speak).toBe(stubSentence(ex));
      }
    }
  });

  it('narrates arithmetic that matches the answer', () => {
    // The trap: a story that says one thing and grades another.
    for (const difficulty of ['easy', 'normal', 'hard']) {
      for (const ex of WordProblemsGame.generate(difficulty, ctx(30))) {
        expect(ex.correctAnswer).toBe(expected(ex));
      }
    }
  });

  it('never lets an intermediate or final quantity go negative', () => {
    for (const difficulty of ['easy', 'normal', 'hard']) {
      for (const ex of WordProblemsGame.generate(difficulty, ctx(30))) {
        expect(ex.a).toBeGreaterThanOrEqual(1);
        expect(ex.b).toBeGreaterThanOrEqual(1);
        expect(ex.correctAnswer).toBeGreaterThanOrEqual(1);
        expect(ex.correctAnswer).toBeLessThanOrEqual(CEILING[difficulty]);

        if (ex.kind === 'sub') expect(ex.a - ex.b).toBeGreaterThanOrEqual(1);
        if (ex.kind === 'addAdd' || ex.kind === 'addSub') {
          expect(ex.c).toBeGreaterThanOrEqual(1);
          // The quantity after step one, before step two.
          expect(ex.a + ex.b).toBeGreaterThanOrEqual(1);
          expect(ex.a + ex.b).toBeLessThanOrEqual(20);
        }
      }
    }
  });

  it('asks one-step addition only on easy', () => {
    for (const ex of WordProblemsGame.generate('easy', ctx(25))) {
      expect(ex.kind).toBe('add');
      expect(ex.c).toBeNull();
      expect(ex.a + ex.b).toBeLessThanOrEqual(10);
    }
  });

  it('mixes one-step addition and subtraction on normal, and never two steps', () => {
    const kinds = new Set();
    for (let i = 0; i < 20; i++) {
      for (const ex of WordProblemsGame.generate('normal', ctx(20))) {
        expect(ex.c).toBeNull();
        kinds.add(ex.kind);
      }
    }
    expect([...kinds].sort()).toEqual(['add', 'sub']);
  });

  it('is genuinely two-step on hard, with both steps present in every exercise', () => {
    const kinds = new Set();
    for (let i = 0; i < 20; i++) {
      for (const ex of WordProblemsGame.generate('hard', ctx(20))) {
        expect(['addAdd', 'addSub']).toContain(ex.kind);
        expect(Number.isInteger(ex.c)).toBe(true);
        expect(ex.c).toBeGreaterThanOrEqual(1);
        // All three quantities reach the narrated sentence.
        expect(ex.speak).toContain('a=' + ex.a);
        expect(ex.speak).toContain('b=' + ex.b);
        expect(ex.speak).toContain('c=' + ex.c);
        kinds.add(ex.kind);
      }
    }
    expect([...kinds].sort()).toEqual(['addAdd', 'addSub']);
  });

  it('illustrates the story with one emoji from OBJECT_CATEGORIES', () => {
    for (const ex of WordProblemsGame.generate('normal', ctx(25))) {
      expect(ALL_EMOJIS.has(ex.emoji)).toBe(true);
      expect(ex.promptHtml).toContain('<div class="wp-icon">' + ex.emoji + '</div>');
    }
  });

  it('offers five distinct whole-number choices in range, including the answer', () => {
    for (const difficulty of ['easy', 'normal', 'hard']) {
      for (const ex of WordProblemsGame.generate(difficulty, ctx(25))) {
        expect(ex.choices).toHaveLength(5);
        expect(new Set(ex.choices).size).toBe(5);
        expect(ex.choices).toContain(ex.correctAnswer);
        for (const choice of ex.choices) {
          expect(Number.isInteger(choice)).toBe(true);
          expect(choice).toBeGreaterThanOrEqual(1);
          expect(choice).toBeLessThanOrEqual(CEILING[difficulty]);
        }
      }
    }
  });

  it('moves the correct answer around instead of parking it at one index', () => {
    // Shape A: buildChoices starts from [answer] and shuffles at the end, so
    // the pre-shuffle index is a fixed 0 and deleting the shuffle collapses
    // every observed position to 0.
    const positions = new Set();
    for (let i = 0; i < 30; i++) {
      for (const ex of WordProblemsGame.generate('hard', ctx(10))) {
        positions.add(ex.choices.indexOf(ex.correctAnswer));
      }
    }
    expect(positions.size).toBeGreaterThan(1);
  });

  it('is deterministic for a fixed rng', () => {
    const seeded = () => 0.5;
    const a = WordProblemsGame.generate('hard', ctx(5, seeded));
    const b = WordProblemsGame.generate('hard', ctx(5, seeded));
    expect(a.map(e => e.speak)).toEqual(b.map(e => e.speak));
    expect(a.map(e => e.correctAnswer)).toEqual(b.map(e => e.correctAnswer));
    expect(a.map(e => e.promptHtml)).toEqual(b.map(e => e.promptHtml));
  });
});
