import { describe, it, expect } from 'vitest';
import { TRANSLATIONS, LANGUAGES } from '../../js/i18n/translations.js';

const REMOVED = [
  'username', 'password', 'login', 'register', 'logout',
  'enterCredentials', 'offlineLogin', 'offlineRegister',
  'pendingResults', 'resultsSynced',
];

describe('translations', () => {
  it('no longer carries auth keys', () => {
    for (const lang of Object.keys(TRANSLATIONS)) {
      for (const key of REMOVED) {
        expect(TRANSLATIONS[lang]).not.toHaveProperty(key);
      }
    }
  });

  it('keeps every language at an identical key set', () => {
    const reference = Object.keys(TRANSLATIONS.en).sort();
    for (const lang of Object.keys(TRANSLATIONS)) {
      expect(Object.keys(TRANSLATIONS[lang]).sort()).toEqual(reference);
    }
  });
});

describe('LANGUAGES', () => {
  it('labels French with the correct diacritic', () => {
    const fr = LANGUAGES.find((entry) => entry.code === 'fr');
    expect(fr.label).toBe('Français');
  });
});
