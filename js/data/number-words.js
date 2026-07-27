// numberToWords(n, lang) for 1..100 in the app's five languages.
//
// Everything that can be a table is a table: a 0..19 `ones` array and a
// tens-keyed `tens` map per language. Only the composition of a two-digit
// number needs code, and each language supplies its own `compose`.

const DEFAULT_LANG = 'en';

const SPECS = {
  en: {
    ones: ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight',
      'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen',
      'sixteen', 'seventeen', 'eighteen', 'nineteen'],
    tens: {
      20: 'twenty', 30: 'thirty', 40: 'forty', 50: 'fifty',
      60: 'sixty', 70: 'seventy', 80: 'eighty', 90: 'ninety',
    },
    hundred: 'one hundred',
    compose: joinWith('-'),
  },
  fr: {
    ones: ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit',
      'neuf', 'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize',
      'dix-sept', 'dix-huit', 'dix-neuf'],
    // 70 and 90 are deliberately absent: French counts them as soixante + a
    // teen and quatre-vingt + a teen, which composeFrench handles.
    tens: {
      20: 'vingt', 30: 'trente', 40: 'quarante', 50: 'cinquante',
      60: 'soixante', 80: 'quatre-vingt',
    },
    hundred: 'cent',
    compose: composeFrench,
  },
  de: {
    ones: ['', 'eins', 'zwei', 'drei', 'vier', 'fünf', 'sechs', 'sieben', 'acht',
      'neun', 'zehn', 'elf', 'zwölf', 'dreizehn', 'vierzehn', 'fünfzehn',
      'sechzehn', 'siebzehn', 'achtzehn', 'neunzehn'],
    tens: {
      20: 'zwanzig', 30: 'dreißig', 40: 'vierzig', 50: 'fünfzig',
      60: 'sechzig', 70: 'siebzig', 80: 'achtzig', 90: 'neunzig',
    },
    hundred: 'hundert',
    compose: composeGerman,
  },
  uk: {
    ones: ['', 'один', 'два', 'три', 'чотири', 'п\'ять', 'шість', 'сім', 'вісім',
      'дев\'ять', 'десять', 'одинадцять', 'дванадцять', 'тринадцять',
      'чотирнадцять', 'п\'ятнадцять', 'шістнадцять', 'сімнадцять',
      'вісімнадцять', 'дев\'ятнадцять'],
    tens: {
      20: 'двадцять', 30: 'тридцять', 40: 'сорок', 50: 'п\'ятдесят',
      60: 'шістдесят', 70: 'сімдесят', 80: 'вісімдесят', 90: 'дев\'яносто',
    },
    hundred: 'сто',
    compose: joinWith(' '),
  },
  ru: {
    ones: ['', 'один', 'два', 'три', 'четыре', 'пять', 'шесть', 'семь', 'восемь',
      'девять', 'десять', 'одиннадцать', 'двенадцать', 'тринадцать',
      'четырнадцать', 'пятнадцать', 'шестнадцать', 'семнадцать',
      'восемнадцать', 'девятнадцать'],
    tens: {
      20: 'двадцать', 30: 'тридцать', 40: 'сорок', 50: 'пятьдесят',
      60: 'шестьдесят', 70: 'семьдесят', 80: 'восемьдесят', 90: 'девяносто',
    },
    hundred: 'сто',
    compose: joinWith(' '),
  },
};

export function numberToWords(n, lang) {
  const spec = SPECS[lang] || SPECS[DEFAULT_LANG];

  if (!Number.isInteger(n) || n < 1 || n > 100) return '';
  if (n === 100) return spec.hundred;
  if (n < 20) return spec.ones[n];

  return spec.compose(n, spec);
}

// English, Ukrainian and Russian share one shape: the tens word, then the unit
// word, joined by a hyphen or a space.
function joinWith(separator) {
  return (n, spec) => {
    const tens = Math.floor(n / 10) * 10;
    const unit = n % 10;

    return unit === 0 ? spec.tens[tens] : spec.tens[tens] + separator + spec.ones[unit];
  };
}

// German reverses the order and glues with "und", and uses "ein" rather than
// "eins" inside a compound: einundzwanzig, never einsundzwanzig.
function composeGerman(n, spec) {
  const tens = Math.floor(n / 10) * 10;
  const unit = n % 10;

  if (unit === 0) return spec.tens[tens];

  return (unit === 1 ? 'ein' : spec.ones[unit]) + 'und' + spec.tens[tens];
}

// French counts 70..79 as soixante + 10..19 and 80..99 as quatre-vingt + 0..19.
// Three irregularities on top of that base split:
//   - quatre-vingts takes an s only when it stands alone (80, not 81 or 90)
//   - 21/31/41/51/61 insert "et"; 81 does not
//   - 71 is "soixante et onze"; 91 is "quatre-vingt-onze", with no "et"
function composeFrench(n, spec) {
  let base;
  let rest;

  if (n < 70) {
    base = Math.floor(n / 10) * 10;
    rest = n % 10;
  } else if (n < 80) {
    base = 60;
    rest = n - 60;
  } else {
    base = 80;
    rest = n - 80;
  }

  const baseWord = spec.tens[base];

  if (rest === 0) return base === 80 ? baseWord + 's' : baseWord;
  if (rest === 1 && base !== 80) return baseWord + ' et un';
  if (rest === 11 && base === 60) return baseWord + ' et onze';

  return baseWord + '-' + spec.ones[rest];
}
