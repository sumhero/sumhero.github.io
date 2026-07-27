import { describe, it, expect } from 'vitest';
import { TenFrameRenderer } from '../../js/render/ten-frame.js';

function count(html, pattern) {
  return (html.match(pattern) || []).length;
}

function cxValues(html) {
  return [...html.matchAll(/<circle cx="([\d.]+)"/g)].map(m => Number(m[1]));
}

describe('TenFrameRenderer', () => {
  it('returns an svg string', () => {
    expect(TenFrameRenderer.render(3, 10)).toMatch(/^<svg /);
    expect(TenFrameRenderer.render(3, 10)).toContain('class="ten-frame');
  });

  it('draws one cell per unit of capacity', () => {
    expect(count(TenFrameRenderer.render(0, 5), /<rect /g)).toBe(5);
    expect(count(TenFrameRenderer.render(0, 10), /<rect /g)).toBe(10);
    expect(count(TenFrameRenderer.render(0, 20), /<rect /g)).toBe(20);
  });

  it('fills exactly the requested number of cells', () => {
    for (const [filled, capacity] of [[0, 5], [3, 5], [5, 5], [1, 10], [7, 10], [10, 10], [4, 20], [13, 20], [20, 20]]) {
      expect(count(TenFrameRenderer.render(filled, capacity), /<circle /g)).toBe(filled);
    }
  });

  it('clamps out-of-range fills instead of drawing past the frame', () => {
    expect(count(TenFrameRenderer.render(99, 10), /<circle /g)).toBe(10);
    expect(count(TenFrameRenderer.render(-4, 10), /<circle /g)).toBe(0);
  });

  it('lays capacity 5 out as a single row', () => {
    const html = TenFrameRenderer.render(5, 5);
    const cy = [...html.matchAll(/cy="([\d.]+)"/g)].map(m => Number(m[1]));
    expect(new Set(cy).size).toBe(1);
    expect(html).toContain('height="44"');
  });

  it('lays capacity 10 out as two rows of five', () => {
    const html = TenFrameRenderer.render(10, 10);
    const cy = [...html.matchAll(/cy="([\d.]+)"/g)].map(m => Number(m[1]));
    expect(new Set(cy).size).toBe(2);
    const cx = cxValues(html);
    expect(new Set(cx).size).toBe(5);
  });

  it('spills capacity 20 into a visibly separate second ten-frame', () => {
    const html = TenFrameRenderer.render(13, 20);
    const cx = cxValues(html);
    // The first frame is 5 * 44 = 220 wide, then a 20px gap, so the second
    // frame's cells all start at x >= 240. Asserting the split by position
    // rather than by markup order proves the dots actually land in the
    // second frame instead of overflowing the first.
    expect(cx.filter(x => x < 240)).toHaveLength(10);
    expect(cx.filter(x => x >= 240)).toHaveLength(3);
  });

  it('is a pure function of its arguments', () => {
    expect(TenFrameRenderer.render(6, 10)).toBe(TenFrameRenderer.render(6, 10));
  });
});
