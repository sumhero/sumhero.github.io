import { describe, it, expect } from 'vitest';
import { TRANSLATIONS } from '../../js/i18n/translations.js';

describe('French orthography', () => {
  it('uses correct accents', () => {
    expect(TRANSLATIONS.fr.settings).toBe('Paramètres');
    expect(TRANSLATIONS.fr.difficulty).toBe('Difficulté');
    expect(TRANSLATIONS.fr.wellDone).toBe('Bien joué !');
    expect(TRANSLATIONS.fr.diceAddition).toBe('Addition de dés');
    expect(TRANSLATIONS.fr.diceRecognition).toBe('Dé');
  });

  it('has no unaccented remnants of accented words', () => {
    const values = Object.values(TRANSLATIONS.fr).join(' ');
    for (const wrong of ['Parametres', 'Difficulte', 'Bien joue', 'de des', 'resultats']) {
      expect(values).not.toContain(wrong);
    }
  });
});

describe('German orthography', () => {
  it('uses correct umlauts', () => {
    expect(TRANSLATIONS.de.countObjects).toBe('Objekte zählen');
    expect(TRANSLATIONS.de.chooseGame).toBe('Spiel wählen');
    expect(TRANSLATIONS.de.back).toBe('Zurück');
    expect(TRANSLATIONS.de.diceAddition).toBe('Würfel-Addition');
    expect(TRANSLATIONS.de.countries).toBe('Länder');
    expect(TRANSLATIONS.de.capitals).toBe('Hauptstädte');
  });

  it('does not say "pay for objects"', () => {
    expect(TRANSLATIONS.de.countObjects).not.toBe('Objekte zahlen');
  });
});
