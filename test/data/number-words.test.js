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

// Exhaustive literal tables, one entry per number 1..100, for every
// language. These are hand-derived from each language's own number-naming
// rules (decade name + unit, "et"/"und" insertion, the French vigesimal
// split, etc.) — not printed from js/data/number-words.js and pasted back,
// which would make the test tautological. Every unpinned tens/ones entry is
// otherwise an unguarded regression surface: a partial table can pass with
// dozens of wrong words as long as none of the wrong ones happen to be
// pinned, which a mutation review demonstrated by misspelling en 30, de 50,
// uk 70 and ru 80 simultaneously (44 wrong words) with every test above
// still green.
const FULL_EN = {
  1: 'one', 2: 'two', 3: 'three', 4: 'four', 5: 'five', 6: 'six', 7: 'seven',
  8: 'eight', 9: 'nine', 10: 'ten', 11: 'eleven', 12: 'twelve', 13: 'thirteen',
  14: 'fourteen', 15: 'fifteen', 16: 'sixteen', 17: 'seventeen', 18: 'eighteen',
  19: 'nineteen', 20: 'twenty', 21: 'twenty-one', 22: 'twenty-two',
  23: 'twenty-three', 24: 'twenty-four', 25: 'twenty-five', 26: 'twenty-six',
  27: 'twenty-seven', 28: 'twenty-eight', 29: 'twenty-nine', 30: 'thirty',
  31: 'thirty-one', 32: 'thirty-two', 33: 'thirty-three', 34: 'thirty-four',
  35: 'thirty-five', 36: 'thirty-six', 37: 'thirty-seven', 38: 'thirty-eight',
  39: 'thirty-nine', 40: 'forty', 41: 'forty-one', 42: 'forty-two',
  43: 'forty-three', 44: 'forty-four', 45: 'forty-five', 46: 'forty-six',
  47: 'forty-seven', 48: 'forty-eight', 49: 'forty-nine', 50: 'fifty',
  51: 'fifty-one', 52: 'fifty-two', 53: 'fifty-three', 54: 'fifty-four',
  55: 'fifty-five', 56: 'fifty-six', 57: 'fifty-seven', 58: 'fifty-eight',
  59: 'fifty-nine', 60: 'sixty', 61: 'sixty-one', 62: 'sixty-two',
  63: 'sixty-three', 64: 'sixty-four', 65: 'sixty-five', 66: 'sixty-six',
  67: 'sixty-seven', 68: 'sixty-eight', 69: 'sixty-nine', 70: 'seventy',
  71: 'seventy-one', 72: 'seventy-two', 73: 'seventy-three', 74: 'seventy-four',
  75: 'seventy-five', 76: 'seventy-six', 77: 'seventy-seven', 78: 'seventy-eight',
  79: 'seventy-nine', 80: 'eighty', 81: 'eighty-one', 82: 'eighty-two',
  83: 'eighty-three', 84: 'eighty-four', 85: 'eighty-five', 86: 'eighty-six',
  87: 'eighty-seven', 88: 'eighty-eight', 89: 'eighty-nine', 90: 'ninety',
  91: 'ninety-one', 92: 'ninety-two', 93: 'ninety-three', 94: 'ninety-four',
  95: 'ninety-five', 96: 'ninety-six', 97: 'ninety-seven', 98: 'ninety-eight',
  99: 'ninety-nine', 100: 'one hundred',
};

const FULL_FR = {
  1: 'un', 2: 'deux', 3: 'trois', 4: 'quatre', 5: 'cinq', 6: 'six', 7: 'sept',
  8: 'huit', 9: 'neuf', 10: 'dix', 11: 'onze', 12: 'douze', 13: 'treize',
  14: 'quatorze', 15: 'quinze', 16: 'seize', 17: 'dix-sept', 18: 'dix-huit',
  19: 'dix-neuf', 20: 'vingt', 21: 'vingt et un', 22: 'vingt-deux',
  23: 'vingt-trois', 24: 'vingt-quatre', 25: 'vingt-cinq', 26: 'vingt-six',
  27: 'vingt-sept', 28: 'vingt-huit', 29: 'vingt-neuf', 30: 'trente',
  31: 'trente et un', 32: 'trente-deux', 33: 'trente-trois', 34: 'trente-quatre',
  35: 'trente-cinq', 36: 'trente-six', 37: 'trente-sept', 38: 'trente-huit',
  39: 'trente-neuf', 40: 'quarante', 41: 'quarante et un', 42: 'quarante-deux',
  43: 'quarante-trois', 44: 'quarante-quatre', 45: 'quarante-cinq',
  46: 'quarante-six', 47: 'quarante-sept', 48: 'quarante-huit',
  49: 'quarante-neuf', 50: 'cinquante', 51: 'cinquante et un',
  52: 'cinquante-deux', 53: 'cinquante-trois', 54: 'cinquante-quatre',
  55: 'cinquante-cinq', 56: 'cinquante-six', 57: 'cinquante-sept',
  58: 'cinquante-huit', 59: 'cinquante-neuf', 60: 'soixante',
  61: 'soixante et un', 62: 'soixante-deux', 63: 'soixante-trois',
  64: 'soixante-quatre', 65: 'soixante-cinq', 66: 'soixante-six',
  67: 'soixante-sept', 68: 'soixante-huit', 69: 'soixante-neuf',
  70: 'soixante-dix', 71: 'soixante et onze', 72: 'soixante-douze',
  73: 'soixante-treize', 74: 'soixante-quatorze', 75: 'soixante-quinze',
  76: 'soixante-seize', 77: 'soixante-dix-sept', 78: 'soixante-dix-huit',
  79: 'soixante-dix-neuf', 80: 'quatre-vingts', 81: 'quatre-vingt-un',
  82: 'quatre-vingt-deux', 83: 'quatre-vingt-trois', 84: 'quatre-vingt-quatre',
  85: 'quatre-vingt-cinq', 86: 'quatre-vingt-six', 87: 'quatre-vingt-sept',
  88: 'quatre-vingt-huit', 89: 'quatre-vingt-neuf', 90: 'quatre-vingt-dix',
  91: 'quatre-vingt-onze', 92: 'quatre-vingt-douze', 93: 'quatre-vingt-treize',
  94: 'quatre-vingt-quatorze', 95: 'quatre-vingt-quinze', 96: 'quatre-vingt-seize',
  97: 'quatre-vingt-dix-sept', 98: 'quatre-vingt-dix-huit',
  99: 'quatre-vingt-dix-neuf', 100: 'cent',
};

const FULL_DE = {
  1: 'eins', 2: 'zwei', 3: 'drei', 4: 'vier', 5: 'fünf', 6: 'sechs',
  7: 'sieben', 8: 'acht', 9: 'neun', 10: 'zehn', 11: 'elf', 12: 'zwölf',
  13: 'dreizehn', 14: 'vierzehn', 15: 'fünfzehn', 16: 'sechzehn',
  17: 'siebzehn', 18: 'achtzehn', 19: 'neunzehn', 20: 'zwanzig',
  21: 'einundzwanzig', 22: 'zweiundzwanzig', 23: 'dreiundzwanzig',
  24: 'vierundzwanzig', 25: 'fünfundzwanzig', 26: 'sechsundzwanzig',
  27: 'siebenundzwanzig', 28: 'achtundzwanzig', 29: 'neunundzwanzig',
  30: 'dreißig', 31: 'einunddreißig', 32: 'zweiunddreißig',
  33: 'dreiunddreißig', 34: 'vierunddreißig', 35: 'fünfunddreißig',
  36: 'sechsunddreißig', 37: 'siebenunddreißig', 38: 'achtunddreißig',
  39: 'neununddreißig', 40: 'vierzig', 41: 'einundvierzig',
  42: 'zweiundvierzig', 43: 'dreiundvierzig', 44: 'vierundvierzig',
  45: 'fünfundvierzig', 46: 'sechsundvierzig', 47: 'siebenundvierzig',
  48: 'achtundvierzig', 49: 'neunundvierzig', 50: 'fünfzig',
  51: 'einundfünfzig', 52: 'zweiundfünfzig', 53: 'dreiundfünfzig',
  54: 'vierundfünfzig', 55: 'fünfundfünfzig', 56: 'sechsundfünfzig',
  57: 'siebenundfünfzig', 58: 'achtundfünfzig', 59: 'neunundfünfzig',
  60: 'sechzig', 61: 'einundsechzig', 62: 'zweiundsechzig',
  63: 'dreiundsechzig', 64: 'vierundsechzig', 65: 'fünfundsechzig',
  66: 'sechsundsechzig', 67: 'siebenundsechzig', 68: 'achtundsechzig',
  69: 'neunundsechzig', 70: 'siebzig', 71: 'einundsiebzig',
  72: 'zweiundsiebzig', 73: 'dreiundsiebzig', 74: 'vierundsiebzig',
  75: 'fünfundsiebzig', 76: 'sechsundsiebzig', 77: 'siebenundsiebzig',
  78: 'achtundsiebzig', 79: 'neunundsiebzig', 80: 'achtzig',
  81: 'einundachtzig', 82: 'zweiundachtzig', 83: 'dreiundachtzig',
  84: 'vierundachtzig', 85: 'fünfundachtzig', 86: 'sechsundachtzig',
  87: 'siebenundachtzig', 88: 'achtundachtzig', 89: 'neunundachtzig',
  90: 'neunzig', 91: 'einundneunzig', 92: 'zweiundneunzig',
  93: 'dreiundneunzig', 94: 'vierundneunzig', 95: 'fünfundneunzig',
  96: 'sechsundneunzig', 97: 'siebenundneunzig', 98: 'achtundneunzig',
  99: 'neunundneunzig', 100: 'hundert',
};

const FULL_UK = {
  1: 'один', 2: 'два', 3: 'три', 4: 'чотири', 5: "п'ять", 6: 'шість',
  7: 'сім', 8: 'вісім', 9: "дев'ять", 10: 'десять', 11: 'одинадцять',
  12: 'дванадцять', 13: 'тринадцять', 14: 'чотирнадцять', 15: "п'ятнадцять",
  16: 'шістнадцять', 17: 'сімнадцять', 18: 'вісімнадцять',
  19: "дев'ятнадцять", 20: 'двадцять', 21: 'двадцять один',
  22: 'двадцять два', 23: 'двадцять три', 24: 'двадцять чотири',
  25: "двадцять п'ять", 26: 'двадцять шість', 27: 'двадцять сім',
  28: 'двадцять вісім', 29: "двадцять дев'ять", 30: 'тридцять',
  31: 'тридцять один', 32: 'тридцять два', 33: 'тридцять три',
  34: 'тридцять чотири', 35: "тридцять п'ять", 36: 'тридцять шість',
  37: 'тридцять сім', 38: 'тридцять вісім', 39: "тридцять дев'ять",
  40: 'сорок', 41: 'сорок один', 42: 'сорок два', 43: 'сорок три',
  44: 'сорок чотири', 45: "сорок п'ять", 46: 'сорок шість', 47: 'сорок сім',
  48: 'сорок вісім', 49: "сорок дев'ять", 50: "п'ятдесят",
  51: "п'ятдесят один", 52: "п'ятдесят два", 53: "п'ятдесят три",
  54: "п'ятдесят чотири", 55: "п'ятдесят п'ять", 56: "п'ятдесят шість",
  57: "п'ятдесят сім", 58: "п'ятдесят вісім", 59: "п'ятдесят дев'ять",
  60: 'шістдесят', 61: 'шістдесят один', 62: 'шістдесят два',
  63: 'шістдесят три', 64: 'шістдесят чотири', 65: "шістдесят п'ять",
  66: 'шістдесят шість', 67: 'шістдесят сім', 68: 'шістдесят вісім',
  69: "шістдесят дев'ять", 70: 'сімдесят', 71: 'сімдесят один',
  72: 'сімдесят два', 73: 'сімдесят три', 74: 'сімдесят чотири',
  75: "сімдесят п'ять", 76: 'сімдесят шість', 77: 'сімдесят сім',
  78: 'сімдесят вісім', 79: "сімдесят дев'ять", 80: 'вісімдесят',
  81: 'вісімдесят один', 82: 'вісімдесят два', 83: 'вісімдесят три',
  84: 'вісімдесят чотири', 85: "вісімдесят п'ять", 86: 'вісімдесят шість',
  87: 'вісімдесят сім', 88: 'вісімдесят вісім', 89: "вісімдесят дев'ять",
  90: "дев'яносто", 91: "дев'яносто один", 92: "дев'яносто два",
  93: "дев'яносто три", 94: "дев'яносто чотири", 95: "дев'яносто п'ять",
  96: "дев'яносто шість", 97: "дев'яносто сім", 98: "дев'яносто вісім",
  99: "дев'яносто дев'ять", 100: 'сто',
};

const FULL_RU = {
  1: 'один', 2: 'два', 3: 'три', 4: 'четыре', 5: 'пять', 6: 'шесть',
  7: 'семь', 8: 'восемь', 9: 'девять', 10: 'десять', 11: 'одиннадцать',
  12: 'двенадцать', 13: 'тринадцать', 14: 'четырнадцать', 15: 'пятнадцать',
  16: 'шестнадцать', 17: 'семнадцать', 18: 'восемнадцать', 19: 'девятнадцать',
  20: 'двадцать', 21: 'двадцать один', 22: 'двадцать два', 23: 'двадцать три',
  24: 'двадцать четыре', 25: 'двадцать пять', 26: 'двадцать шесть',
  27: 'двадцать семь', 28: 'двадцать восемь', 29: 'двадцать девять',
  30: 'тридцать', 31: 'тридцать один', 32: 'тридцать два',
  33: 'тридцать три', 34: 'тридцать четыре', 35: 'тридцать пять',
  36: 'тридцать шесть', 37: 'тридцать семь', 38: 'тридцать восемь',
  39: 'тридцать девять', 40: 'сорок', 41: 'сорок один', 42: 'сорок два',
  43: 'сорок три', 44: 'сорок четыре', 45: 'сорок пять', 46: 'сорок шесть',
  47: 'сорок семь', 48: 'сорок восемь', 49: 'сорок девять', 50: 'пятьдесят',
  51: 'пятьдесят один', 52: 'пятьдесят два', 53: 'пятьдесят три',
  54: 'пятьдесят четыре', 55: 'пятьдесят пять', 56: 'пятьдесят шесть',
  57: 'пятьдесят семь', 58: 'пятьдесят восемь', 59: 'пятьдесят девять',
  60: 'шестьдесят', 61: 'шестьдесят один', 62: 'шестьдесят два',
  63: 'шестьдесят три', 64: 'шестьдесят четыре', 65: 'шестьдесят пять',
  66: 'шестьдесят шесть', 67: 'шестьдесят семь', 68: 'шестьдесят восемь',
  69: 'шестьдесят девять', 70: 'семьдесят', 71: 'семьдесят один',
  72: 'семьдесят два', 73: 'семьдесят три', 74: 'семьдесят четыре',
  75: 'семьдесят пять', 76: 'семьдесят шесть', 77: 'семьдесят семь',
  78: 'семьдесят восемь', 79: 'семьдесят девять', 80: 'восемьдесят',
  81: 'восемьдесят один', 82: 'восемьдесят два', 83: 'восемьдесят три',
  84: 'восемьдесят четыре', 85: 'восемьдесят пять', 86: 'восемьдесят шесть',
  87: 'восемьдесят семь', 88: 'восемьдесят восемь', 89: 'восемьдесят девять',
  90: 'девяносто', 91: 'девяносто один', 92: 'девяносто два',
  93: 'девяносто три', 94: 'девяносто четыре', 95: 'девяносто пять',
  96: 'девяносто шесть', 97: 'девяносто семь', 98: 'девяносто восемь',
  99: 'девяносто девять', 100: 'сто',
};

const FULL_TABLES = { en: FULL_EN, fr: FULL_FR, de: FULL_DE, uk: FULL_UK, ru: FULL_RU };

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

  it('pins the exact literal spelling of every number 1-100 in every language', () => {
    // This is the exhaustive guard: every one of the 500 forms the module
    // can produce is checked against an independently-derived literal, so a
    // wrong word anywhere in an unpinned tens/ones slot cannot hide behind
    // the smaller targeted tables above.
    //
    // Mismatches are collected rather than asserted one at a time, so that
    // several simultaneous wrong words (e.g. a mutation hitting en 30, de
    // 50, uk 70 and ru 80 at once) are all reported together instead of the
    // run stopping at the first one found.
    const mismatches = [];
    for (const lang of LANGS) {
      const table = FULL_TABLES[lang];
      for (let n = 1; n <= 100; n++) {
        const actual = numberToWords(n, lang);
        const expected = table[n];
        if (actual !== expected) {
          mismatches.push(`${lang} ${n}: expected "${expected}", got "${actual}"`);
        }
      }
    }
    expect(mismatches).toEqual([]);
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
