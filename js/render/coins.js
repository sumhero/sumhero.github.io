const SLOT_W = 72;
const SLOT_H = 56;
const PER_ROW = 5;
const COIN_R = 24;

// Whole euros only — no cents, no decimals. 1 and 2 are coins, 5, 10 and 20
// are notes, coloured after the real euro notes (grey, red, blue).
const SPECS = {
  1: { kind: 'coin', fill: '#e0c060', stroke: '#a8862c', label: '1 €' },
  2: { kind: 'coin', fill: '#d8d8d0', stroke: '#8f8f88', label: '2 €' },
  5: { kind: 'note', fill: '#c9c9c9', stroke: '#8a8a8a', label: '5 €' },
  10: { kind: 'note', fill: '#e79a9a', stroke: '#b45f5f', label: '10 €' },
  20: { kind: 'note', fill: '#8fbdea', stroke: '#4d7fae', label: '20 €' },
};

export const CoinRenderer = {
  // denominations: an array of euro values, each one of 1, 2, 5, 10 or 20.
  // Anything else is skipped rather than drawn, so a bug that invents a
  // denomination shows up as a missing piece instead of a plausible fake.
  render(denominations) {
    const items = (denominations || []).filter(value => SPECS[value]);
    const columns = Math.min(Math.max(items.length, 1), PER_ROW);
    const rows = Math.max(1, Math.ceil(items.length / PER_ROW));
    const width = columns * SLOT_W;
    const height = rows * SLOT_H;

    const shapes = items.map((value, index) => renderItem(
      value,
      (index % PER_ROW) * SLOT_W,
      Math.floor(index / PER_ROW) * SLOT_H
    )).join('');

    return '<svg width="' + width + '" height="' + height +
      '" viewBox="0 0 ' + width + ' ' + height +
      '" class="coin-purse dice-enter">' + shapes + '</svg>';
  },
};

function renderItem(value, x, y) {
  const spec = SPECS[value];
  const cx = x + SLOT_W / 2;
  const cy = y + SLOT_H / 2;

  const shape = spec.kind === 'coin'
    ? '<circle class="coin" cx="' + cx + '" cy="' + cy + '" r="' + COIN_R +
      '" fill="' + spec.fill + '" stroke="' + spec.stroke + '" stroke-width="3"/>'
    : '<rect class="note" x="' + (x + 4) + '" y="' + (y + 12) +
      '" width="' + (SLOT_W - 8) + '" height="' + (SLOT_H - 24) +
      '" rx="4" fill="' + spec.fill + '" stroke="' + spec.stroke + '" stroke-width="3"/>';

  return shape +
    '<text x="' + cx + '" y="' + cy + '" font-size="16" font-weight="700" fill="#333"' +
    ' text-anchor="middle" dominant-baseline="central" font-family="sans-serif">' +
    spec.label + '</text>';
}
