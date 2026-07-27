import { describe, it, expect } from 'vitest';
import { CompareGame } from '../../js/games/compare.js';

function ctx(count, rng = Math.random) {
  return { rng, t: k => k, lang: 'fr', count, category: null };
}

const MAX = { easy: 10, normal: 20, hard: 100 };

function countMatches(html, pattern) {
  return (html.match(pattern) || []).length;
}

function values(ex) {
  return ex.choices.map(c => c.value);
}

describe('CompareGame', () => {
  it('is registered for the numbers domain with the standard round counts', () => {
    expect(CompareGame.id).toBe('compare');
    expect(CompareGame.domain).toBe('nombres');
    expect(CompareGame.rounds).toEqual({ easy: 5, normal: 10, hard: 20 });
    expect(CompareGame.layoutClass).toBe('compare-layout');
    expect(CompareGame.choiceClass).toBe('compare-choice-btn');
  });

  it('generates exactly ctx.count exercises, not game.rounds', () => {
    expect(CompareGame.generate('easy', ctx(7))).toHaveLength(7);
    expect(CompareGame.generate('hard', ctx(3))).toHaveLength(3);
  });

  for (const [difficulty, max] of Object.entries(MAX)) {
    it(`keeps both sides within 1..${max} on ${difficulty}`, () => {
      for (const ex of CompareGame.generate(difficulty, ctx(25))) {
        for (const side of [ex.left, ex.right]) {
          expect(side).toBeGreaterThanOrEqual(1);
          expect(side).toBeLessThanOrEqual(max);
        }
      }
    });
  }

  it('names the sign that actually holds between the two sides', () => {
    for (const difficulty of ['easy', 'normal', 'hard']) {
      for (const ex of CompareGame.generate(difficulty, ctx(30))) {
        const expected = ex.left < ex.right ? 'lt' : ex.left > ex.right ? 'gt' : 'eq';
        expect(ex.correctAnswer).toBe(expected);
      }
    }
  });

  it('produces all three answers over a long run, so "=" is a live option', () => {
    const answers = new Set();
    for (let i = 0; i < 20; i++) {
      for (const ex of CompareGame.generate('normal', ctx(20))) answers.add(ex.correctAnswer);
    }
    expect([...answers].sort()).toEqual(['eq', 'gt', 'lt']);
  });

  it('offers exactly the three signs, as entity-escaped html', () => {
    for (const ex of CompareGame.generate('hard', ctx(10))) {
      expect(values(ex).slice().sort()).toEqual(['eq', 'gt', 'lt']);
      expect(ex.choices.map(c => c.html).slice().sort()).toEqual(['&gt;', '&lt;', '=']);
      // A raw angle bracket here would be parsed as markup by the engine's
      // string-concatenated button rendering.
      for (const choice of ex.choices) {
        expect(choice.html).not.toBe('<');
        expect(choice.html).not.toBe('>');
      }
    }
  });

  it('moves the correct answer around instead of parking it at one index', () => {
    // Grouped by the *value* of the correct answer: correctAnswer itself
    // varies with left/right (lt vs eq vs gt), so tracking raw index across
    // all exercises varies even with zero shuffling. Isolating a single
    // answer value and checking its index still moves is what actually
    // proves the choices array is being shuffled.
    const positionsByAnswer = { lt: new Set(), eq: new Set(), gt: new Set() };
    for (let i = 0; i < 40; i++) {
      for (const ex of CompareGame.generate('normal', ctx(10))) {
        positionsByAnswer[ex.correctAnswer].add(values(ex).indexOf(ex.correctAnswer));
      }
    }
    for (const answer of ['lt', 'eq', 'gt']) {
      expect(positionsByAnswer[answer].size).toBeGreaterThan(1);
    }
  });

  it('draws collections on easy, one emoji per unit, the same emoji on both sides', () => {
    for (const ex of CompareGame.generate('easy', ctx(20))) {
      expect(ex.promptHtml).not.toContain('compare-number');
      expect(countMatches(ex.promptHtml, /class="compare-object"/g)).toBe(ex.left + ex.right);
      expect(countMatches(ex.promptHtml, new RegExp(ex.emoji, 'g'))).toBe(ex.left + ex.right);
    }
  });

  it('draws numerals on normal and hard', () => {
    for (const difficulty of ['normal', 'hard']) {
      for (const ex of CompareGame.generate(difficulty, ctx(20))) {
        expect(ex.promptHtml).not.toContain('class="compare-object"');
        expect(ex.promptHtml).toContain('<span class="compare-number">' + ex.left + '</span>');
        expect(ex.promptHtml).toContain('<span class="compare-number">' + ex.right + '</span>');
      }
    }
  });

  it('takes its hint from ctx.t rather than reaching for I18n', () => {
    const ex = CompareGame.generate('normal', ctx(1))[0];
    expect(ex.promptHtml).toContain('comparePrompt');
  });

  it('is deterministic for a fixed rng', () => {
    const seeded = () => 0.5;
    const a = CompareGame.generate('normal', ctx(5, seeded));
    const b = CompareGame.generate('normal', ctx(5, seeded));
    expect(a.map(e => e.correctAnswer)).toEqual(b.map(e => e.correctAnswer));
    expect(a.map(e => e.promptHtml)).toEqual(b.map(e => e.promptHtml));
  });
});
