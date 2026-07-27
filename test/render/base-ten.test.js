import { describe, it, expect } from 'vitest';
import { BaseTenRenderer } from '../../js/render/base-ten.js';

function count(html, pattern) {
  return (html.match(pattern) || []).length;
}

function rods(html) {
  return count(html, /class="base-ten-rod"/g);
}

function units(html) {
  return count(html, /class="base-ten-unit"/g);
}

// The rods and cubes carry width attributes of their own, so read the svg's
// own width rather than searching the whole string for it.
function svgWidth(html) {
  return Number(/^<svg width="(\d+)"/.exec(html)[1]);
}

describe('BaseTenRenderer', () => {
  it('returns an svg string carrying the base-ten class', () => {
    expect(BaseTenRenderer.render(2, 3)).toMatch(/^<svg /);
    expect(BaseTenRenderer.render(2, 3)).toContain('class="base-ten dice-enter"');
  });

  it('draws exactly one rod per ten and one cube per unit', () => {
    for (const [tens, unitCount] of [[0, 0], [0, 7], [1, 0], [3, 9], [9, 9], [4, 5]]) {
      const html = BaseTenRenderer.render(tens, unitCount);
      expect(rods(html)).toBe(tens);
      expect(units(html)).toBe(unitCount);
    }
  });

  it('splits every rod into ten countable cells with nine dividers', () => {
    // A rod that is not divided into ten is indistinguishable from a single
    // tall block, which is the whole point of the manipulative.
    expect(count(BaseTenRenderer.render(1, 0), /<line /g)).toBe(9);
    expect(count(BaseTenRenderer.render(5, 0), /<line /g)).toBe(45);
  });

  it('clamps out-of-range arguments instead of drawing past the frame', () => {
    expect(rods(BaseTenRenderer.render(99, 0))).toBe(9);
    expect(rods(BaseTenRenderer.render(-3, 0))).toBe(0);
    expect(units(BaseTenRenderer.render(0, 99))).toBe(9);
    expect(units(BaseTenRenderer.render(0, -3))).toBe(0);
  });

  it('never produces a zero-width svg, even for nothing at all', () => {
    const html = BaseTenRenderer.render(0, 0);
    expect(svgWidth(html)).toBe(16);
    expect(rods(html)).toBe(0);
    expect(units(html)).toBe(0);
  });

  it('puts the unit column to the right of every rod', () => {
    // Rods occupy columns 0..tens-1 at x = i * 24; the unit column follows at
    // x = tens * 24. Asserting by x position proves the cubes do not overlap
    // the rods rather than merely appearing later in the markup.
    const html = BaseTenRenderer.render(3, 4);
    const unitXs = [...html.matchAll(/class="base-ten-unit" x="(\d+)"/g)].map(m => Number(m[1]));
    expect(unitXs).toHaveLength(4);
    expect(new Set(unitXs).size).toBe(1);
    expect(unitXs[0]).toBe(3 * 24);
  });

  it('stacks the unit cubes upward from the bottom of the rods', () => {
    const html = BaseTenRenderer.render(1, 3);
    const ys = [...html.matchAll(/class="base-ten-unit" x="\d+" y="(\d+)"/g)].map(m => Number(m[1]));
    expect(ys).toEqual([144, 128, 112]);
  });

  it('widens by one column per rod plus one for the units', () => {
    // columns * 16 + (columns - 1) * 8, where columns = rods + (units ? 1 : 0).
    expect(svgWidth(BaseTenRenderer.render(1, 0))).toBe(16);
    expect(svgWidth(BaseTenRenderer.render(2, 0))).toBe(40);
    expect(svgWidth(BaseTenRenderer.render(2, 1))).toBe(64);
    expect(svgWidth(BaseTenRenderer.render(9, 9))).toBe(232);
  });

  it('is a pure function of its arguments', () => {
    expect(BaseTenRenderer.render(4, 7)).toBe(BaseTenRenderer.render(4, 7));
    expect(BaseTenRenderer.render(4, 7)).not.toBe(BaseTenRenderer.render(7, 4));
  });
});
