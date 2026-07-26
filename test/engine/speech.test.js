import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Speech } from '../../js/engine/speech.js';

describe('Speech', () => {
  let spoken;

  beforeEach(() => {
    spoken = [];
    vi.stubGlobal('SpeechSynthesisUtterance', class {
      constructor(text) { this.text = text; }
    });
    vi.stubGlobal('speechSynthesis', {
      speak: u => spoken.push(u),
      cancel: () => spoken.push('cancel'),
    });
  });

  it('reports availability', () => {
    expect(Speech.isAvailable()).toBe(true);
  });

  it('speaks the given text', () => {
    Speech.speak('Sept plus trois ?', 'fr');
    expect(spoken[0].text).toBe('Sept plus trois ?');
  });

  it('maps the app language code to a BCP-47 tag', () => {
    Speech.speak('test', 'fr');
    expect(spoken[0].lang).toBe('fr-FR');
  });

  it('cancels any in-flight utterance before speaking', () => {
    Speech.speak('one', 'en');
    Speech.speak('two', 'en');
    expect(spoken.filter(s => s === 'cancel')).toHaveLength(2);
  });

  it('is a no-op when the API is missing', () => {
    vi.stubGlobal('speechSynthesis', undefined);
    expect(Speech.isAvailable()).toBe(false);
    expect(() => Speech.speak('x', 'en')).not.toThrow();
  });
});
