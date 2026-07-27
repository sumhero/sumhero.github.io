const CELL = 44;
const GAP = 20;
const DOT_R = CELL * 0.32;

export const TenFrameRenderer = {
  // filled: how many cells carry a dot. capacity: 5 (one row of five),
  // 10 (two rows of five) or 20 (two separate ten-frames side by side).
  render(filled, capacity = 10) {
    const frames = capacity === 20 ? [10, 10] : [capacity];
    const rows = capacity === 5 ? 1 : 2;
    const frameWidth = 5 * CELL;
    const width = frames.length * frameWidth + (frames.length - 1) * GAP;
    const height = rows * CELL;

    let remaining = Math.max(0, Math.min(filled, capacity));
    let cells = '';

    frames.forEach((size, index) => {
      const take = Math.min(remaining, size);
      remaining -= take;
      cells += renderFrame(take, size, index * (frameWidth + GAP));
    });

    return '<svg width="' + width + '" height="' + height +
      '" viewBox="0 0 ' + width + ' ' + height +
      '" class="ten-frame dice-enter">' + cells + '</svg>';
  },
};

function renderFrame(filled, size, offsetX) {
  let out = '';

  for (let i = 0; i < size; i++) {
    const x = offsetX + (i % 5) * CELL;
    const y = Math.floor(i / 5) * CELL;

    out += '<rect x="' + (x + 1) + '" y="' + (y + 1) + '" width="' + (CELL - 2) +
      '" height="' + (CELL - 2) + '" rx="4" fill="#fff" stroke="#333" stroke-width="2"/>';

    if (i < filled) {
      out += '<circle cx="' + (x + CELL / 2) + '" cy="' + (y + CELL / 2) +
        '" r="' + DOT_R + '" fill="#4a90d9"/>';
    }
  }

  return out;
}
