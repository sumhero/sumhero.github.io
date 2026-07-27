import { describe, it, expect } from 'vitest';
import { ShapesGame } from '../../js/games/shapes.js';
import { ShapeRenderer } from '../../js/render/shapes.js';

function ctx(count, rng = Math.random) {
  return { rng, t: k => k, lang: 'fr', count, category: null };
}

// Deliberately duplicated literals, NOT imported from js/render/shapes.js. The
// game reads its counts out of that module, so a test that did the same could
// not fail when the module's table was wrong.
const ALL_SHAPES = ['square', 'rectangle', 'triangle', 'circle', 'rhombus'];
const SIDES = { square: 4, rectangle: 4, triangle: 3, circle: 0, rhombus: 4 };
const CORNERS = { square: 4, rectangle: 4, triangle: 3, circle: 0, rhombus: 4 };
// The hard band's own policy, restated independently.
const HARD_ONLY = ['square', 'rectangle', 'triangle', 'rhombus'];
const COUNT_OPTIONS = [0, 2, 3, 4, 5];

function points(html) {
  const match = /points="([^"]+)"/.exec(html);
  if (!match) return [];

  return match[1].split(' ').map(pair => pair.split(',').map(Number));
}

function values(ex) {
  return ex.choices.map(c => (typeof c === 'object' ? c.value : c));
}

describe('ShapesGame', () => {
  it('is the geometry game, with the standard round counts', () => {
    expect(ShapesGame.id).toBe('shapes');
    expect(ShapesGame.nameKey).toBe('shapes');
    expect(ShapesGame.emoji).toBe('📐');
    expect(ShapesGame.domain).toBe('geometrie');
    expect(ShapesGame.rounds).toEqual({ easy: 5, normal: 10, hard: 20 });
    expect(ShapesGame.layoutClass).toBe('shape-game-layout');
    expect(ShapesGame.choiceClass).toBe('shape-choice-btn');
  });

  it('adds no new engine seam', () => {
    expect(ShapesGame.renderPrompt).toBeUndefined();
    expect(ShapesGame.renderChoices).toBeUndefined();
    expect(ShapesGame.isCorrect).toBeUndefined();
    expect(ShapesGame.legacy).toBeUndefined();
    expect(ShapesGame.setup).toBeUndefined();
  });

  it('generates exactly ctx.count exercises, not game.rounds', () => {
    expect(ShapesGame.generate('easy', ctx(7))).toHaveLength(7);
    expect(ShapesGame.generate('hard', ctx(3))).toHaveLength(3);
  });

  it('only ever uses shapes from the CP vocabulary', () => {
    for (const difficulty of ['easy', 'normal', 'hard']) {
      for (const ex of ShapesGame.generate(difficulty, ctx(30))) {
        expect(ALL_SHAPES).toContain(ex.shape);
      }
    }
  });

  it('draws the figure it names, with the right number of corners', () => {
    // The core trap: a prompt labelled "triangle" that draws four corners.
    for (const difficulty of ['easy', 'normal', 'hard']) {
      for (const ex of ShapesGame.generate(difficulty, ctx(30))) {
        expect(ex.promptHtml).toContain('data-shape="' + ex.shape + '"');
        if (ex.shape === 'circle') {
          expect(ex.promptHtml).toContain('class="shape-circle"');
          expect(ex.promptHtml).not.toContain('<polygon');
        } else {
          expect(points(ex.promptHtml)).toHaveLength(CORNERS[ex.shape]);
        }
      }
    }
  });

  it('names the shape on easy, untransformed, with the shape key as the answer', () => {
    for (const ex of ShapesGame.generate('easy', ctx(30))) {
      expect(ex.mode).toBe('name');
      expect(ex.rotate).toBe(0);
      expect(ex.scale).toBe(1);
      expect(ex.correctAnswer).toBe(ex.shape);
      expect(ex.bodyClass).toBe('shape-name-mode');
      expect(ex.promptHtml).toContain(ShapeRenderer.render(ex.shape, { rotate: 0, scale: 1 }));
      expect(ex.promptHtml).toContain('shapesNamePrompt');
    }
  });

  it('names every shape on easy over a long run', () => {
    // Normal and hard each have their own all-shapes-over-a-long-run
    // coverage test; easy previously had only a membership check, which
    // would not catch a pool that silently dropped a shape.
    const seen = new Set();
    for (let i = 0; i < 40; i++) {
      for (const ex of ShapesGame.generate('easy', ctx(10))) seen.add(ex.shape);
    }
    expect([...seen].sort()).toEqual(ALL_SHAPES.slice().sort());
  });

  it('offers all five shape names, keyed in English and labelled through ctx.t', () => {
    for (const difficulty of ['easy', 'hard']) {
      for (const ex of ShapesGame.generate(difficulty, ctx(20))) {
        expect(ex.choices).toHaveLength(5);
        expect(values(ex).slice().sort()).toEqual(ALL_SHAPES.slice().sort());
        expect(values(ex)).toContain(ex.correctAnswer);
        for (const choice of ex.choices) {
          expect(typeof choice.value).toBe('string');
          expect(choice.html).toBe('shape' +
            choice.value.charAt(0).toUpperCase() + choice.value.slice(1));
        }
      }
    }
  });

  it('counts sides or corners on normal, and states the true count', () => {
    const modes = new Set();
    for (let i = 0; i < 20; i++) {
      for (const ex of ShapesGame.generate('normal', ctx(10))) {
        modes.add(ex.mode);
        expect(ex.rotate).toBe(0);
        expect(ex.scale).toBe(1);
        expect(ex.bodyClass).toBe('shape-count-mode');
        if (ex.mode === 'sides') {
          expect(ex.correctAnswer).toBe(SIDES[ex.shape]);
          expect(ex.promptHtml).toContain('shapesSidesPrompt');
        } else {
          expect(ex.correctAnswer).toBe(CORNERS[ex.shape]);
          expect(ex.promptHtml).toContain('shapesCornersPrompt');
        }
      }
    }
    expect([...modes].sort()).toEqual(['corners', 'sides']);
  });

  it('offers the same five numbers on normal, always including the true count', () => {
    for (const ex of ShapesGame.generate('normal', ctx(30))) {
      expect(ex.choices).toHaveLength(5);
      expect(values(ex).slice().sort((a, b) => a - b)).toEqual(COUNT_OPTIONS);
      expect(values(ex)).toContain(ex.correctAnswer);
      for (const choice of ex.choices) expect(typeof choice).toBe('number');
    }
  });

  it('asks the counting question about every shape over a long run', () => {
    // A band that never showed the circle would never teach "no sides".
    const seen = new Set();
    for (let i = 0; i < 40; i++) {
      for (const ex of ShapesGame.generate('normal', ctx(10))) seen.add(ex.shape);
    }
    expect([...seen].sort()).toEqual(ALL_SHAPES.slice().sort());
  });

  it('rotates and rescales on hard without changing the answer', () => {
    for (const ex of ShapesGame.generate('hard', ctx(40))) {
      expect(ex.mode).toBe('name');
      expect(ex.correctAnswer).toBe(ex.shape);
      expect(ex.bodyClass).toBe('shape-name-mode');
      // Genuinely transformed: the figure is not the one easy would have shown.
      expect(ex.rotate).not.toBe(0);
      expect(ex.scale).not.toBe(1);
      expect(ex.promptHtml).toContain(ShapeRenderer.render(ex.shape, {
        rotate: ex.rotate,
        scale: ex.scale,
      }));
      expect(ex.promptHtml)
        .not.toContain(ShapeRenderer.render(ex.shape, { rotate: 0, scale: 1 }));
    }
  });

  it('never stands a square on its corner, where carré and losange are the same picture', () => {
    // Every hard rotation is a multiple of 15. Only the square additionally
    // never lands on a multiple of 45: a square at 45/135/225/315 literally
    // *is* a rhombus (a square is a special case of a rhombus), and with
    // `losange` in the choice list the question would have two defensible
    // correct answers. No other shape shares that ambiguity, so this test
    // also requires at least one non-square shape to actually use the wider
    // range over a long run — otherwise the exclusion could silently still
    // apply to everyone and this test would not catch it.
    let nonSquareHitFortyFive = false;
    for (let i = 0; i < 20; i++) {
      for (const ex of ShapesGame.generate('hard', ctx(20))) {
        expect(ex.rotate % 15).toBe(0);
        expect(ex.rotate).toBeGreaterThan(0);
        expect(ex.rotate).toBeLessThan(360);
        expect(ex.scale).toBeGreaterThanOrEqual(0.6);
        expect(ex.scale).toBeLessThanOrEqual(1.5);
        if (ex.shape === 'square') {
          expect(ex.rotate % 45).not.toBe(0);
        } else if (ex.rotate % 45 === 0) {
          nonSquareHitFortyFive = true;
        }
      }
    }
    expect(nonSquareHitFortyFive).toBe(true);
  });

  it('leaves the circle out of the hard band, since rotating it proves nothing', () => {
    const seen = new Set();
    for (let i = 0; i < 40; i++) {
      for (const ex of ShapesGame.generate('hard', ctx(10))) seen.add(ex.shape);
    }
    expect(seen.has('circle')).toBe(false);
    expect([...seen].sort()).toEqual(HARD_ONLY.slice().sort());
  });

  it('moves the correct answer around instead of parking it at one index', () => {
    // Shape B, grouped by the value of the correct answer. Choices are a
    // shuffle of a FIXED list (the five shape keys, or the five count options)
    // while correctAnswer varies, so an ungrouped indexOf collects several
    // positions even with the shuffle deleted — vacuous, exactly like
    // compare's first attempt. Isolating one answer value and requiring its
    // index to still move is what actually proves the shuffle happens.
    for (const difficulty of ['easy', 'normal', 'hard']) {
      const positions = {};
      for (let i = 0; i < 40; i++) {
        for (const ex of ShapesGame.generate(difficulty, ctx(10))) {
          const key = String(ex.correctAnswer);
          positions[key] = positions[key] || new Set();
          positions[key].add(values(ex).indexOf(ex.correctAnswer));
        }
      }
      const groups = Object.values(positions);
      expect(groups.length).toBeGreaterThan(1);
      for (const group of groups) expect(group.size).toBeGreaterThan(1);
    }
  });

  it('takes every string through ctx.t rather than reaching for I18n', () => {
    const ex = ShapesGame.generate('easy', ctx(1))[0];
    expect(ex.promptHtml).toContain('shapesNamePrompt');
    expect(ex.choices.map(c => c.html)).toContain('shapeSquare');
  });

  it('is deterministic for a fixed rng', () => {
    const seeded = () => 0.5;
    for (const difficulty of ['easy', 'normal', 'hard']) {
      const a = ShapesGame.generate(difficulty, ctx(5, seeded));
      const b = ShapesGame.generate(difficulty, ctx(5, seeded));
      expect(a.map(e => e.promptHtml)).toEqual(b.map(e => e.promptHtml));
      expect(a.map(e => JSON.stringify(e.choices))).toEqual(b.map(e => JSON.stringify(e.choices)));
    }
  });
});
