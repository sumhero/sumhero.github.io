import { describe, it, expect } from 'vitest';
import { CoinRenderer } from '../../js/render/coins.js';

function count(html, pattern) {
  return (html.match(pattern) || []).length;
}

function coins(html) {
  return count(html, /class="coin"/g);
}

function notes(html) {
  return count(html, /class="note"/g);
}

function svgSize(html) {
  const m = /^<svg width="(\d+)" height="(\d+)"/.exec(html);

  return { width: Number(m[1]), height: Number(m[2]) };
}

function coinCentres(html) {
  return [...html.matchAll(/class="coin" cx="(\d+)" cy="(\d+)"/g)]
    .map(m => [Number(m[1]), Number(m[2])]);
}

describe('CoinRenderer', () => {
  it('returns an svg string carrying the purse class', () => {
    expect(CoinRenderer.render([1, 2])).toMatch(/^<svg /);
    expect(CoinRenderer.render([1, 2])).toContain('class="coin-purse dice-enter"');
  });

  it('draws 1 and 2 as coins and 5, 10 and 20 as notes', () => {
    const html = CoinRenderer.render([1, 2, 5, 10, 20]);
    expect(coins(html)).toBe(2);
    expect(notes(html)).toBe(3);
  });

  it('draws exactly one shape per denomination in the array', () => {
    for (const purse of [[1], [1, 1, 1], [2, 2, 1], [10, 5, 2, 2, 1], [20, 20, 10, 5, 2, 1]]) {
      const html = CoinRenderer.render(purse);
      expect(coins(html) + notes(html)).toBe(purse.length);
    }
  });

  it('labels every piece with its value in euros', () => {
    const html = CoinRenderer.render([1, 2, 5, 10, 20]);
    for (const label of ['1 €', '2 €', '5 €', '10 €', '20 €']) {
      expect(html).toContain('>' + label + '</text>');
    }
  });

  it('skips values that are not real euro denominations', () => {
    // This app is whole euros only. A stray 0.5 or 3 must not render as a
    // plausible-looking coin the child would be asked to count.
    const html = CoinRenderer.render([1, 3, 0.5, 50, 2]);
    expect(coins(html) + notes(html)).toBe(2);
    expect(html).not.toContain('3 €');
    expect(html).not.toContain('0.5');
    expect(html).not.toContain('50 €');
  });

  it('handles an empty purse without collapsing to a zero-size svg', () => {
    const html = CoinRenderer.render([]);
    expect(coins(html) + notes(html)).toBe(0);
    expect(svgSize(html)).toEqual({ width: 72, height: 56 });
  });

  it('tolerates a missing argument', () => {
    expect(() => CoinRenderer.render()).not.toThrow();
    expect(coins(CoinRenderer.render()) + notes(CoinRenderer.render())).toBe(0);
  });

  it('lays out up to five pieces per row', () => {
    expect(svgSize(CoinRenderer.render([1, 1, 1]))).toEqual({ width: 216, height: 56 });
    expect(svgSize(CoinRenderer.render([1, 1, 1, 1, 1]))).toEqual({ width: 360, height: 56 });
    expect(svgSize(CoinRenderer.render([1, 1, 1, 1, 1, 1]))).toEqual({ width: 360, height: 112 });
  });

  it('wraps the sixth piece onto a second row rather than overflowing the first', () => {
    // Asserting by position rather than markup order proves the wrap actually
    // happens instead of six pieces piling up along one row.
    expect(coinCentres(CoinRenderer.render([1, 1, 1, 1, 1, 1]))).toEqual([
      [36, 28], [108, 28], [180, 28], [252, 28], [324, 28], [36, 84],
    ]);
  });

  it('is a pure function of its argument', () => {
    expect(CoinRenderer.render([5, 2, 1])).toBe(CoinRenderer.render([5, 2, 1]));
    expect(CoinRenderer.render([5, 2, 1])).not.toBe(CoinRenderer.render([1, 2, 5]));
  });
});
