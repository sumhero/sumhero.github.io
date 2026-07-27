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

  it('never poses the same pair back-to-back', () => {
    // A weaker, independent property than full-session distinctness below:
    // even if two identical pairs ever did land in one session, they must
    // never be adjacent — the specific guarantee drawDistinct's exhaustion
    // path protects, since it re-seeds with only the last emitted key.
    //
    // 200 sessions, not 30: this property only fires on an *adjacent*
    // collision, far rarer than any-pair-in-the-session colliding. Measured
    // against an undeduplicated generator: adjacent collisions land in only
    // ~4.1%/3.4%/1.0% of easy/normal/hard sessions, so 30 sessions per
    // difficulty caught the mutation only ~93% of the time overall — below
    // this repo's "red on all ten" bar. 200 sessions pushes the miss
    // probability to effectively zero.
    for (const [difficulty, rounds] of [['easy', 5], ['normal', 10], ['hard', 20]]) {
      for (let session = 0; session < 200; session++) {
        const keys = CompareGame.generate(difficulty, ctx(rounds))
          .map(ex => ex.left + ':' + ex.right);

        for (let i = 1; i < keys.length; i++) {
          expect(keys[i], difficulty).not.toBe(keys[i - 1]);
        }
      }
    }
  });

  it('never poses the same pair twice in a session', () => {
    // Keyed on the ordered pair, never on the answer — there are only three
    // possible answers (lt, eq, gt), so answer-keying is meaningless here.
    // Spaces are 100, 400 and 10 000 pairs against 5, 10 and 20 rounds.
    for (const [difficulty, rounds] of [['easy', 5], ['normal', 10], ['hard', 20]]) {
      for (let session = 0; session < 30; session++) {
        const keys = CompareGame.generate(difficulty, ctx(rounds))
          .map(ex => ex.left + ':' + ex.right);

        expect(new Set(keys).size, difficulty).toBe(rounds);
      }
    }
  });

  it('still produces equal pairs after deduplication', () => {
    // Deduplicating on left:right slightly reduces the observed '=' rate,
    // because eq cases are only `max` of the `max²` ordered pairs. That is
    // accepted, but it must not become zero. Over 30 easy sessions of 5 rounds
    // with a 20% equal chance, seeing no eq at all has probability about
    // 0.8^150 — vanishingly small, so this is not flaky.
    const answers = Array.from({ length: 30 }, () =>
      CompareGame.generate('easy', ctx(5)).map(ex => ex.correctAnswer)
    ).flat();

    expect(answers).toContain('eq');
  });
});
