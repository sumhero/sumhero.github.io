import { describe, it, expect, beforeEach } from 'vitest';
import { I18n } from '../../js/i18n/i18n.js';

describe('I18n.t', () => {
  beforeEach(() => {
    localStorage.clear();
    I18n.setLanguage('en');
  });

  it('looks up a plain key', () => {
    expect(I18n.t('appName')).toBe('SumHero');
  });

  it('returns the key itself when missing', () => {
    expect(I18n.t('noSuchKey')).toBe('noSuchKey');
  });

  it('falls back to English when the key is absent in the active language', () => {
    I18n.setLanguage('fr');
    expect(I18n.t('appName')).toBe('SumHero');
  });

  it('interpolates named parameters', () => {
    expect(I18n.format('Sept plus combien font {n} ?', { n: 10 }))
      .toBe('Sept plus combien font 10 ?');
  });

  it('interpolates every occurrence of a parameter', () => {
    expect(I18n.format('{a} et {a}', { a: 'x' })).toBe('x et x');
  });

  it('leaves unknown placeholders untouched', () => {
    expect(I18n.format('{a} {b}', { a: '1' })).toBe('1 {b}');
  });
});
