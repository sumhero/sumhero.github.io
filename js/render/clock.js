export const ClockRenderer = {
  render(hour, minute, size = 200) {
    const cx = size / 2;
    const cy = size / 2;
    const r = size / 2 - 6;

    let ticks = '';
    for (let i = 0; i < 12; i++) {
      const angle = (i * 30) * Math.PI / 180;
      const outer = r - 4;
      const inner = r - 16;
      const x1 = cx + outer * Math.sin(angle);
      const y1 = cy - outer * Math.cos(angle);
      const x2 = cx + inner * Math.sin(angle);
      const y2 = cy - inner * Math.cos(angle);
      ticks += '<line x1="' + x1.toFixed(1) + '" y1="' + y1.toFixed(1) +
        '" x2="' + x2.toFixed(1) + '" y2="' + y2.toFixed(1) +
        '" stroke="#333" stroke-width="3" stroke-linecap="round"/>';
    }

    let numbers = '';
    const numR = r - 30;
    for (let n = 1; n <= 12; n++) {
      const angle = (n * 30) * Math.PI / 180;
      const x = cx + numR * Math.sin(angle);
      const y = cy - numR * Math.cos(angle);
      numbers += '<text x="' + x.toFixed(1) + '" y="' + y.toFixed(1) +
        '" font-size="' + (size * 0.11) + '" font-weight="700" fill="#333"' +
        ' text-anchor="middle" dominant-baseline="central" font-family="sans-serif">' + n + '</text>';
    }

    const minuteAngle = (minute * 6) * Math.PI / 180;
    const hourAngle = ((hour % 12) * 30 + minute * 0.5) * Math.PI / 180;

    const hourLen = r * 0.5;
    const minLen = r * 0.78;

    const hx = cx + hourLen * Math.sin(hourAngle);
    const hy = cy - hourLen * Math.cos(hourAngle);
    const mx = cx + minLen * Math.sin(minuteAngle);
    const my = cy - minLen * Math.cos(minuteAngle);

    return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '" class="clock-svg dice-enter">' +
      '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="#fff" stroke="#333" stroke-width="5"/>' +
      ticks +
      numbers +
      '<line x1="' + cx + '" y1="' + cy + '" x2="' + hx.toFixed(1) + '" y2="' + hy.toFixed(1) +
        '" stroke="#333" stroke-width="7" stroke-linecap="round"/>' +
      '<line x1="' + cx + '" y1="' + cy + '" x2="' + mx.toFixed(1) + '" y2="' + my.toFixed(1) +
        '" stroke="#4a90d9" stroke-width="5" stroke-linecap="round"/>' +
      '<circle cx="' + cx + '" cy="' + cy + '" r="' + (size * 0.04) + '" fill="#333"/>' +
      '</svg>';
  },
};
