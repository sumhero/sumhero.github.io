import { describe, it, expect } from 'vitest';
import { numberToWords } from '../../js/data/number-words.js';

// Literal expectations, written out rather than derived, so the test cannot
// agree with the implementation by construction.
const FRENCH = {
  1: 'un', 2: 'deux', 3: 'trois', 4: 'quatre', 5: 'cinq', 6: 'six', 7: 'sept',
  8: 'huit', 9: 'neuf', 10: 'dix', 11: 'onze', 12: 'douze', 13: 'treize',
  14: 'quatorze', 15: 'quinze', 16: 'seize', 17: 'dix-sept', 18: 'dix-huit',
  19: 'dix-neuf', 20: 'vingt', 22: 'vingt-deux', 30: 'trente', 40: 'quarante',
  50: 'cinquante', 60: 'soixante', 62: 'soixante-deux', 72: 'soixante-douze',
  77: 'soixante-dix-sept', 82: 'quatre-vingt-deux', 95: 'quatre-vingt-quinze',
  100: 'cent',
};

const ENGLISH = {
  1: 'one', 11: 'eleven', 13: 'thirteen', 20: 'twenty', 21: 'twenty-one',
  40: 'forty', 42: 'forty-two', 70: 'seventy', 99: 'ninety-nine',
  100: 'one hundred',
};

const GERMAN = {
  1: 'eins', 7: 'sieben', 16: 'sechzehn', 17: 'siebzehn', 20: 'zwanzig',
  21: 'einundzwanzig', 30: 'dreißig', 32: 'zweiunddreißig', 60: 'sechzig',
  70: 'siebzig', 71: 'einundsiebzig', 99: 'neunundneunzig', 100: 'hundert',
};

const UKRAINIAN = {
  1: 'один', 5: "п'ять", 9: "дев'ять", 11: 'одинадцять', 15: "п'ятнадцять",
  20: 'двадцять', 21: 'двадцять один', 40: 'сорок', 50: "п'ятдесят",
  60: 'шістдесят', 90: "дев'яносто", 99: "дев'яносто дев'ять", 100: 'сто',
};

const RUSSIAN = {
  1: 'один', 5: 'пять', 11: 'одиннадцать', 20: 'двадцать', 21: 'двадцать один',
  40: 'сорок', 50: 'пятьдесят', 60: 'шестьдесят', 90: 'девяносто',
  99: 'девяносто девять', 100: 'сто',
};

const LANGS = ['en', 'fr', 'de', 'uk', 'ru'];

function expectTable(lang, table) {
  for (const [n, word] of Object.entries(table)) {
    expect(numberToWords(Number(n), lang), lang + ' ' + n).toBe(word);
  }
}

describe('numberToWords', () => {
  it('spells the regular French numbers', () => {
    expectTable('fr', FRENCH);
  });

  it('inserts "et" at 21, 31, 41, 51 and 61 but not elsewhere', () => {
    expect(numberToWords(21, 'fr')).toBe('vingt et un');
    expect(numberToWords(31, 'fr')).toBe('trente et un');
    expect(numberToWords(41, 'fr')).toBe('quarante et un');
    expect(numberToWords(51, 'fr')).toBe('cinquante et un');
    expect(numberToWords(61, 'fr')).toBe('soixante et un');
    // 81 breaks the pattern — no "et".
    expect(numberToWords(81, 'fr')).toBe('quatre-vingt-un');
  });

  it('counts the French seventies as soixante plus a teen', () => {
    expect(numberToWords(70, 'fr')).toBe('soixante-dix');
    expect(numberToWords(71, 'fr')).toBe('soixante et onze');
    expect(numberToWords(72, 'fr')).toBe('soixante-douze');
    expect(numberToWords(76, 'fr')).toBe('soixante-seize');
    expect(numberToWords(79, 'fr')).toBe('soixante-dix-neuf');
  });

  it('counts the French eighties and nineties as quatre-vingt plus 0..19', () => {
    expect(numberToWords(80, 'fr')).toBe('quatre-vingts');
    expect(numberToWords(81, 'fr')).toBe('quatre-vingt-un');
    expect(numberToWords(89, 'fr')).toBe('quatre-vingt-neuf');
    expect(numberToWords(90, 'fr')).toBe('quatre-vingt-dix');
    expect(numberToWords(91, 'fr')).toBe('quatre-vingt-onze');
    expect(numberToWords(99, 'fr')).toBe('quatre-vingt-dix-neuf');
  });

  it('takes the plural s on quatre-vingts only when it stands alone', () => {
    expect(numberToWords(80, 'fr')).toBe('quatre-vingts');
    for (const n of [81, 85, 90, 91, 99]) {
      expect(numberToWords(n, 'fr')).not.toContain('quatre-vingts');
    }
  });

  it('spells English, German, Ukrainian and Russian', () => {
    expectTable('en', ENGLISH);
    expectTable('de', GERMAN);
    expectTable('uk', UKRAINIAN);
    expectTable('ru', RUSSIAN);
  });

  it('uses "ein", not "eins", inside a German compound', () => {
    expect(numberToWords(1, 'de')).toBe('eins');
    expect(numberToWords(21, 'de')).toBe('einundzwanzig');
    expect(numberToWords(41, 'de')).toBe('einundvierzig');
    expect(numberToWords(21, 'de')).not.toContain('einsund');
  });

  it('gives every number from 1 to 100 a word in every language', () => {
    for (const lang of LANGS) {
      for (let n = 1; n <= 100; n++) {
        const word = numberToWords(n, lang);
        expect(typeof word, lang + ' ' + n).toBe('string');
        expect(word.length, lang + ' ' + n).toBeGreaterThan(0);
        expect(word, lang + ' ' + n).not.toContain('undefined');
      }
    }
  });

  it('never gives two different numbers the same word', () => {
    // Catches a tens table with a hole in it, which would otherwise silently
    // collapse two numbers onto the same spelling.
    for (const lang of LANGS) {
      const words = [];
      for (let n = 1; n <= 100; n++) words.push(numberToWords(n, lang));
      expect(new Set(words).size, lang).toBe(100);
    }
  });

  it('returns an empty string outside 1..100 and for non-integers', () => {
    for (const bad of [0, -1, 101, 1000, 1.5, NaN, null, undefined, '7']) {
      expect(numberToWords(bad, 'fr')).toBe('');
    }
  });

  it('falls back to English for an unknown language', () => {
    expect(numberToWords(21, 'es')).toBe('twenty-one');
    expect(numberToWords(21, undefined)).toBe('twenty-one');
  });

  it('is a pure function of its arguments', () => {
    expect(numberToWords(71, 'fr')).toBe(numberToWords(71, 'fr'));
    expect(numberToWords(71, 'fr')).not.toBe(numberToWords(71, 'en'));
  });
});
