const CELL = 16;
const ROD_H = CELL * 10;
const GAP = 8;
const MAX_TENS = 9;
const MAX_UNITS = 9;

export const BaseTenRenderer = {
  // tens: how many ten-rods (0..9). units: how many unit-cubes (0..9).
  // A rod is one cell wide and ten cells tall, split by nine divider lines so
  // the ten it stands for stays countable. Unit cubes stack bottom-up in one
  // column to the right of the rods.
  render(tens, units) {
    const rodCount = clamp(tens, MAX_TENS);
    const unitCount = clamp(units, MAX_UNITS);
    const columns = Math.max(1, rodCount + (unitCount > 0 ? 1 : 0));
    const width = columns * CELL + (columns - 1) * GAP;

    let shapes = '';
    for (let i = 0; i < rodCount; i++) {
      shapes += renderRod(i * (CELL + GAP));
    }
    if (unitCount > 0) {
      shapes += renderUnits(unitCount, rodCount * (CELL + GAP));
    }

    return '<svg width="' + width + '" height="' + ROD_H +
      '" viewBox="0 0 ' + width + ' ' + ROD_H +
      '" class="base-ten dice-enter">' + shapes + '</svg>';
  },
};

function clamp(value, max) {
  if (!Number.isFinite(value)) return 0;

  return Math.max(0, Math.min(Math.floor(value), max));
}

function renderRod(x) {
  let dividers = '';

  for (let i = 1; i < 10; i++) {
    const y = i * CELL;
    dividers += '<line x1="' + x + '" y1="' + y + '" x2="' + (x + CELL) + '" y2="' + y +
      '" stroke="#2e5c8a" stroke-width="1"/>';
  }

  return '<g class="base-ten-rod">' +
    '<rect x="' + x + '" y="0" width="' + CELL + '" height="' + ROD_H +
      '" rx="2" fill="#4a90d9" stroke="#2e5c8a" stroke-width="2"/>' +
    dividers +
  '</g>';
}

function renderUnits(count, x) {
  let out = '';

  for (let i = 0; i < count; i++) {
    const y = ROD_H - (i + 1) * CELL;
    out += '<rect class="base-ten-unit" x="' + x + '" y="' + y +
      '" width="' + CELL + '" height="' + CELL +
      '" rx="2" fill="#ffd54f" stroke="#c8a415" stroke-width="2"/>';
  }

  return out;
}
