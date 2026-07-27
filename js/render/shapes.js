const SIZE = 200;
const CX = SIZE / 2;
const CY = SIZE / 2;
// Circumradius at scale 1. Chosen so that the largest scale the shapes game
// asks for (1.5) still leaves the figure inside the 200x200 frame: 60 * 1.5 =
// 90 < 100. Because every shape below is normalised to this circumradius,
// containment holds at every rotation without any per-shape special-casing.
const FIT = 60;

// Unit outlines, centred on the origin, y pointing down as in SVG. Each is
// normalised by its own largest vertex radius when rendered, so all four end up
// inscribed in the same circle.
//   square    — axis-aligned, flat-bottomed at rotation 0
//   rectangle — 1.75:1, unmistakably not a square
//   triangle  — equilateral, point up at rotation 0
//   rhombus   — a losange with a 5:3 diagonal ratio. Equal diagonals would make
//               it a square standing on its corner, which a CP pupil cannot
//               tell from `carré`, so the ratio is deliberately not 1.
const UNIT = {
  square: [[-1, -1], [1, -1], [1, 1], [-1, 1]],
  rectangle: [[-1.75, -1], [1.75, -1], [1.75, 1], [-1.75, 1]],
  triangle: [[0, -1], [0.866, 0.5], [-0.866, 0.5]],
  rhombus: [[0, -1], [0.6, 0], [0, 1], [-0.6, 0]],
};

export const SHAPE_KEYS = ['square', 'rectangle', 'triangle', 'circle', 'rhombus'];
export const SHAPE_SIDES = { square: 4, rectangle: 4, triangle: 3, circle: 0, rhombus: 4 };
export const SHAPE_CORNERS = { square: 4, rectangle: 4, triangle: 3, circle: 0, rhombus: 4 };

export const ShapeRenderer = {
  // shape: one of SHAPE_KEYS. options: { rotate (degrees), scale, fill, stroke }.
  // Rotation and scale are baked into the coordinates rather than applied as an
  // SVG transform, so the emitted markup is self-describing and a test can read
  // the real vertex positions straight out of it.
  render(shape, options = {}) {
    const rotate = Number.isFinite(options.rotate) ? options.rotate : 0;
    const scale = Number.isFinite(options.scale) && options.scale > 0 ? options.scale : 1;
    const fill = options.fill || '#ffd54f';
    const stroke = options.stroke || '#2e5c8a';

    let key = 'unknown';
    let body = '';

    if (UNIT[shape]) {
      key = shape;
      body = renderPolygon(UNIT[shape], rotate, scale, fill, stroke);
    } else if (shape === 'circle') {
      key = 'circle';
      body = renderCircle(scale, fill, stroke);
    }

    return '<svg width="' + SIZE + '" height="' + SIZE +
      '" viewBox="0 0 ' + SIZE + ' ' + SIZE +
      '" class="shape-figure dice-enter" data-shape="' + key +
      '" data-rotate="' + rotate + '" data-scale="' + scale + '">' + body + '</svg>';
  },
};

function renderPolygon(unit, rotate, scale, fill, stroke) {
  const norm = Math.max(...unit.map(([x, y]) => Math.hypot(x, y)));
  const r = FIT * scale / norm;
  const rad = rotate * Math.PI / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  const points = unit.map(([x, y]) =>
    round(CX + r * (x * cos - y * sin)) + ',' + round(CY + r * (x * sin + y * cos))
  ).join(' ');

  return '<polygon class="shape-poly" points="' + points +
    '" fill="' + fill + '" stroke="' + stroke +
    '" stroke-width="5" stroke-linejoin="round"/>';
}

function renderCircle(scale, fill, stroke) {
  return '<circle class="shape-circle" cx="' + CX + '" cy="' + CY +
    '" r="' + round(FIT * scale) + '" fill="' + fill +
    '" stroke="' + stroke + '" stroke-width="5"/>';
}

function round(value) {
  return Math.round(value * 100) / 100;
}
