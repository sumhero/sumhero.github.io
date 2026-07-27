import { describe, it, expect } from 'vitest';
import { ShapeRenderer, SHAPE_KEYS, SHAPE_SIDES, SHAPE_CORNERS } from '../../js/render/shapes.js';

// Every rotation the game could ever ask for, and the full scale range, so the
// frame-containment and rigidity properties are proven over the whole space the
// renderer supports rather than a sample of it.
const ALL_ROTATIONS = [];
for (let deg = 0; deg < 360; deg += 15) ALL_ROTATIONS.push(deg);
const ALL_SCALES = [0.6, 0.75, 1, 1.3, 1.5];

// Deliberately duplicated literals, NOT derived from SHAPE_SIDES/SHAPE_CORNERS.
// A test that reads its expectation out of the module under test cannot fail
// when that module's table is wrong.
const EXPECTED_KEYS = ['square', 'rectangle', 'triangle', 'circle', 'rhombus'];
const EXPECTED_SIDES = { square: 4, rectangle: 4, triangle: 3, circle: 0, rhombus: 4 };
const EXPECTED_CORNERS = { square: 4, rectangle: 4, triangle: 3, circle: 0, rhombus: 4 };

function points(html) {
  const match = /points="([^"]+)"/.exec(html);
  if (!match) return [];

  return match[1].split(' ').map(pair => pair.split(',').map(Number));
}

function circleGeometry(html) {
  const match = /class="shape-circle" cx="(\d+)" cy="(\d+)" r="([\d.]+)"/.exec(html);

  return match ? { cx: Number(match[1]), cy: Number(match[2]), r: Number(match[3]) } : null;
}

function maxRadius(html) {
  const circle = circleGeometry(html);
  if (circle) return circle.r;

  return Math.max(...points(html).map(([x, y]) => Math.hypot(x - 100, y - 100)));
}

function extremes(html) {
  const circle = circleGeometry(html);
  if (circle) return { min: circle.cx - circle.r, max: circle.cx + circle.r };

  const all = points(html).flat();

  return { min: Math.min(...all), max: Math.max(...all) };
}

function diagonals(html) {
  const p = points(html);

  return [
    Math.hypot(p[0][0] - p[2][0], p[0][1] - p[2][1]),
    Math.hypot(p[1][0] - p[3][0], p[1][1] - p[3][1]),
  ];
}

describe('shape vocabulary tables', () => {
  it('covers exactly the five CP shapes, in display order', () => {
    expect(SHAPE_KEYS).toEqual(EXPECTED_KEYS);
  });

  it('states the side and corner count of every shape', () => {
    expect(SHAPE_SIDES).toEqual(EXPECTED_SIDES);
    expect(SHAPE_CORNERS).toEqual(EXPECTED_CORNERS);
  });
});

describe('ShapeRenderer', () => {
  it('returns an svg string carrying the figure class for every shape', () => {
    for (const shape of EXPECTED_KEYS) {
      const html = ShapeRenderer.render(shape);
      expect(html).toMatch(/^<svg /);
      expect(html).toContain('class="shape-figure dice-enter"');
      expect(html).toContain('data-shape="' + shape + '"');
      expect(html).toContain('viewBox="0 0 200 200"');
    }
  });

  it('reports the rotation and scale it was asked for', () => {
    const html = ShapeRenderer.render('triangle', { rotate: 75, scale: 1.3 });
    expect(html).toContain('data-rotate="75"');
    expect(html).toContain('data-scale="1.3"');
    expect(ShapeRenderer.render('triangle')).toContain('data-rotate="0"');
    expect(ShapeRenderer.render('triangle')).toContain('data-scale="1"');
  });

  it('pins the exact untransformed geometry of the whole vocabulary', () => {
    // The full enumerable set, not a sample: five shapes, all of them pinned.
    expect(ShapeRenderer.render('square')).toContain(
      'points="57.57,57.57 142.43,57.57 142.43,142.43 57.57,142.43"');
    expect(ShapeRenderer.render('rectangle')).toContain(
      'points="47.91,70.23 152.09,70.23 152.09,129.77 47.91,129.77"');
    expect(ShapeRenderer.render('triangle')).toContain(
      'points="100,40 151.96,130 48.04,130"');
    expect(ShapeRenderer.render('rhombus')).toContain(
      'points="100,40 136,100 100,160 64,100"');
    expect(ShapeRenderer.render('circle')).toContain(
      '<circle class="shape-circle" cx="100" cy="100" r="60"');
  });

  it('draws a figure with exactly as many corners as the shape has', () => {
    // The trap: a "triangle" drawn with four points, or a "square" with three.
    for (const shape of ['square', 'rectangle', 'triangle', 'rhombus']) {
      expect(points(ShapeRenderer.render(shape))).toHaveLength(EXPECTED_CORNERS[shape]);
      expect(ShapeRenderer.render(shape)).toContain('class="shape-poly"');
      expect(ShapeRenderer.render(shape)).not.toContain('class="shape-circle"');
    }
    const circle = ShapeRenderer.render('circle');
    expect(circle).toContain('class="shape-circle"');
    expect(circle).not.toContain('<polygon');
    expect(points(circle)).toHaveLength(EXPECTED_CORNERS.circle);
  });

  it('keeps the corner count under every rotation and scale', () => {
    for (const shape of ['square', 'rectangle', 'triangle', 'rhombus']) {
      for (const rotate of ALL_ROTATIONS) {
        for (const scale of ALL_SCALES) {
          expect(points(ShapeRenderer.render(shape, { rotate, scale })))
            .toHaveLength(EXPECTED_CORNERS[shape]);
        }
      }
    }
  });

  it('renders an unrecognised shape as an empty frame, not a plausible circle', () => {
    const html = ShapeRenderer.render('hexagon');
    expect(html).toContain('data-shape="unknown"');
    expect(html).not.toContain('<polygon');
    expect(html).not.toContain('<circle');
  });

  it('never lets any shape leave the frame, at any rotation and any scale', () => {
    // Full enumeration: 5 shapes x 24 rotations x 5 scales. A shape clipped by
    // the viewBox reads as a different shape to a six-year-old.
    for (const shape of EXPECTED_KEYS) {
      for (const rotate of ALL_ROTATIONS) {
        for (const scale of ALL_SCALES) {
          const { min, max } = extremes(ShapeRenderer.render(shape, { rotate, scale }));
          expect(min).toBeGreaterThanOrEqual(10);
          expect(max).toBeLessThanOrEqual(190);
        }
      }
    }
  });

  it('rotates rigidly: the circumradius is 60 x scale whatever the rotation', () => {
    for (const shape of EXPECTED_KEYS) {
      for (const rotate of ALL_ROTATIONS) {
        for (const scale of ALL_SCALES) {
          const radius = maxRadius(ShapeRenderer.render(shape, { rotate, scale }));
          expect(Math.abs(radius - 60 * scale)).toBeLessThan(0.05);
        }
      }
    }
  });

  it('rescales linearly', () => {
    for (const shape of EXPECTED_KEYS) {
      const small = maxRadius(ShapeRenderer.render(shape, { scale: 1 }));
      const large = maxRadius(ShapeRenderer.render(shape, { scale: 1.5 }));
      expect(large / small).toBeCloseTo(1.5, 3);
    }
  });

  it('actually turns the figure rather than only labelling it rotated', () => {
    // An unrotated square is flat-bottomed: two corners share the lowest y. At
    // 30 degrees no two corners share a y at all. That difference is the whole
    // pedagogical point of the hard band, so it gets its own assertion.
    const flat = points(ShapeRenderer.render('square'));
    const flatYs = flat.map(([, y]) => y);
    expect(new Set(flatYs).size).toBe(2);
    expect(flatYs.filter(y => y === Math.max(...flatYs))).toHaveLength(2);

    const turned = points(ShapeRenderer.render('square', { rotate: 30 }));
    expect(new Set(turned.map(([, y]) => y)).size).toBe(4);
    expect(ShapeRenderer.render('square', { rotate: 30 }))
      .not.toBe(ShapeRenderer.render('square'));
  });

  it('never lets a losange look like a square, at any rotation or scale', () => {
    // A rhombus with equal diagonals IS a square, and a CP pupil cannot tell
    // them apart. The losange therefore has a 5:3 diagonal ratio, and that
    // ratio must survive every transform.
    for (const rotate of ALL_ROTATIONS) {
      for (const scale of ALL_SCALES) {
        const [long, short] = diagonals(ShapeRenderer.render('rhombus', { rotate, scale }));
        expect(long / short).toBeCloseTo(5 / 3, 2);
      }
    }
  });

  it('gives the square and the rectangle equal diagonals, as they must have', () => {
    for (const shape of ['square', 'rectangle']) {
      for (const rotate of ALL_ROTATIONS) {
        const [a, b] = diagonals(ShapeRenderer.render(shape, { rotate }));
        expect(a / b).toBeCloseTo(1, 2);
      }
    }
  });

  it('leaves a circle unchanged by rotation, because a circle has no orientation', () => {
    const base = circleGeometry(ShapeRenderer.render('circle', { scale: 1.3 }));
    for (const rotate of ALL_ROTATIONS) {
      expect(circleGeometry(ShapeRenderer.render('circle', { rotate, scale: 1.3 })))
        .toEqual(base);
    }
  });

  it('falls back to sane defaults for junk options', () => {
    expect(ShapeRenderer.render('square', {})).toBe(ShapeRenderer.render('square'));
    expect(ShapeRenderer.render('square', { rotate: NaN, scale: 0 }))
      .toBe(ShapeRenderer.render('square'));
    expect(ShapeRenderer.render('square', { scale: -2 }))
      .toBe(ShapeRenderer.render('square'));
  });

  it('is a pure function of its arguments', () => {
    expect(ShapeRenderer.render('rhombus', { rotate: 60, scale: 1.3 }))
      .toBe(ShapeRenderer.render('rhombus', { rotate: 60, scale: 1.3 }));
    expect(ShapeRenderer.render('rhombus', { rotate: 60 }))
      .not.toBe(ShapeRenderer.render('rhombus', { rotate: 75 }));
  });
});
