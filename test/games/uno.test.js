import { describe, it, expect, vi } from 'vitest';
import { UnoGame } from '../../js/games/uno.js';

function ctx(count, rng = Math.random) {
  return { rng, t: k => k, lang: 'fr', count, category: null };
}

describe('UnoGame', () => {
  it('sits in the logic domain', () => {
    expect(UnoGame.id).toBe('uno');
    expect(UnoGame.domain).toBe('logique');
    expect(UnoGame.layoutClass).toBe('uno-game-body');
    expect(UnoGame.rounds).toEqual({ easy: 5, normal: 10, hard: 20 });
  });

  it('generates the requested count', () => {
    expect(UnoGame.generate('easy', ctx(5))).toHaveLength(5);
  });

  it('offers five cards per exercise', () => {
    for (const ex of UnoGame.generate('normal', ctx(10))) {
      expect(ex.choices).toHaveLength(5);
    }
  });

  it('includes exactly one card matching the main card', () => {
    for (const ex of UnoGame.generate('normal', ctx(10))) {
      const matches = ex.choices.filter(c =>
        c.value.color === ex.mainCard.color || c.value.number === ex.mainCard.number
      );
      expect(matches).toHaveLength(1);
    }
  });

  it('never offers the main card itself', () => {
    for (const ex of UnoGame.generate('hard', ctx(10))) {
      const same = ex.choices.filter(c =>
        c.value.color === ex.mainCard.color && c.value.number === ex.mainCard.number
      );
      expect(same).toHaveLength(0);
    }
  });

  it('renders choices as uno cards and wires the submit callback', () => {
    document.body.innerHTML = '<div id="choices"></div>';
    const el = document.getElementById('choices');
    const ex = UnoGame.generate('easy', ctx(1))[0];
    const submit = vi.fn();

    UnoGame.renderChoices(el, ex, submit);

    const buttons = el.querySelectorAll('.uno-choice-btn');
    expect(buttons).toHaveLength(5);
    buttons[0].click();
    expect(submit).toHaveBeenCalledOnce();
  });

  it('submits the correct answer when the matching card is clicked', () => {
    document.body.innerHTML = '<div id="choices"></div>';
    const el = document.getElementById('choices');
    const ex = UnoGame.generate('easy', ctx(1))[0];
    const submit = vi.fn();

    UnoGame.renderChoices(el, ex, submit);
    const index = ex.choices.findIndex(c => c.value === ex.correctAnswer);
    el.querySelectorAll('.uno-choice-btn')[index].click();

    expect(submit.mock.calls[0][0]).toBe(ex.correctAnswer);
  });

  it('renders the prompt as the main card, not another deck card', () => {
    // Cycle fixed rng values so the outcome is deterministic: this pins
    // promptHtml to ex.mainCard's own number/colour and to the "main" size
    // class, so a bug that rendered a different card (e.g. deck[0]) as the
    // prompt is caught on every run, not just sometimes.
    const values = [0.37, 0.6, 0.12, 0.81, 0.05, 0.93, 0.24];
    let i = 0;
    const rng = () => values[i++ % values.length];
    const ex = UnoGame.generate('easy', ctx(1, rng))[0];

    expect(ex.promptHtml).toContain('uno-card-main');
    expect(ex.promptHtml).not.toContain('uno-card-small');
    expect(ex.promptHtml).toContain('>' + ex.mainCard.number + '<');
    expect(ex.promptHtml).toContain(ex.mainCard.animal);

    const cv = {
      red: '#E53935', blue: '#1E88E5', green: '#43A047', yellow: '#FDD835',
    }[ex.mainCard.color];
    expect(ex.promptHtml).toContain(cv);
  });

  it('is deterministic for a fixed rng', () => {
    const seeded = () => 0.5;
    const a = UnoGame.generate('normal', ctx(5, seeded));
    const b = UnoGame.generate('normal', ctx(5, seeded));

    expect(a.map(e => ({ color: e.mainCard.color, number: e.mainCard.number })))
      .toEqual(b.map(e => ({ color: e.mainCard.color, number: e.mainCard.number })));
    expect(a.map(e => e.choices.map(c => ({ color: c.value.color, number: c.value.number }))))
      .toEqual(b.map(e => e.choices.map(c => ({ color: c.value.color, number: c.value.number }))));
  });
});
