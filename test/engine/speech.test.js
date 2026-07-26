import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Speech } from '../../js/engine/speech.js';

describe('Speech', () => {
  let spoken;
  let cancels;
  let order;

  beforeEach(() => {
    spoken = [];
    cancels = 0;
    order = [];
    vi.stubGlobal('SpeechSynthesisUtterance', class {
      constructor(text) { this.text = text; }
    });
    vi.stubGlobal('speechSynthesis', {
      speak: (u) => { spoken.push(u); order.push('speak'); },
      cancel: () => { cancels++; order.push('cancel'); },
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
    expect(cancels).toBe(2);
  });

  it('cancels BEFORE it speaks, never after', () => {
    Speech.speak('one', 'en');
    expect(order).toEqual(['cancel', 'speak']);
  });

  it('is a no-op when the API is missing', () => {
    vi.stubGlobal('speechSynthesis', undefined);
    expect(Speech.isAvailable()).toBe(false);
    expect(() => Speech.speak('x', 'en')).not.toThrow();
  });
});
