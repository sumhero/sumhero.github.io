import { describe, it, expect } from 'vitest';
import { GuessTimeGame } from '../../js/games/guess-time.js';
import { ClockRenderer } from '../../js/render/clock.js';

function ctx(count, rng = Math.random) {
  return { rng, t: k => k, lang: 'fr', count, category: null };
}

function pad2(n) {
  return n < 10 ? '0' + n : '' + n;
}

describe('ClockRenderer', () => {
  it('renders an svg clock face', () => {
    const svg = ClockRenderer.render(3, 30);
    expect(svg).toContain('<svg');
    expect(svg).toContain('<text');
  });

  it('renders all twelve hour numerals', () => {
    const svg = ClockRenderer.render(3, 30);
    for (let n = 1; n <= 12; n++) {
      expect(svg).toContain('>' + n + '<');
    }
  });

  it('moves the hour hand when the hour changes', () => {
    // Only checking for '<svg'/'<text' would pass even if the renderer
    // ignored both arguments entirely. Anchor to the actual hand geometry.
    expect(ClockRenderer.render(3, 0)).not.toBe(ClockRenderer.render(9, 0));
  });

  it('moves the minute hand when the minute changes', () => {
    expect(ClockRenderer.render(3, 0)).not.toBe(ClockRenderer.render(3, 30));
  });
});

describe('GuessTimeGame', () => {
  it('sits in the measures domain', () => {
    expect(GuessTimeGame.id).toBe('guess_time');
    expect(GuessTimeGame.domain).toBe('mesures');
    expect(GuessTimeGame.layoutClass).toBe('time-game-layout');
    expect(GuessTimeGame.choiceClass).toBe('time-choice-btn');
  });

  it('has the standard round counts', () => {
    expect(GuessTimeGame.rounds).toEqual({ easy: 5, normal: 10, hard: 20 });
  });

  it('uses whole hours only on easy', () => {
    for (const ex of GuessTimeGame.generate('easy', ctx(15))) {
      expect(ex.time.minute).toBe(0);
      expect(ex.time.hour).toBeGreaterThanOrEqual(1);
      expect(ex.time.hour).toBeLessThanOrEqual(12);
    }
  });

  it('uses half hours on normal', () => {
    for (const ex of GuessTimeGame.generate('normal', ctx(20))) {
      expect([0, 30]).toContain(ex.time.minute);
    }
  });

  it('uses quarter hours on hard', () => {
    for (const ex of GuessTimeGame.generate('hard', ctx(20))) {
      expect([0, 15, 30, 45]).toContain(ex.time.minute);
    }
  });

  it('actually produces all four quarter-hour granularities on hard', () => {
    // The membership check above ([0,15,30,45].toContain(minute)) would
    // still pass if hard silently lost the quarter-hours and only ever
    // produced 0/30 (a subset of the allowed set). Assert real coverage
    // over a large sample instead. With a true 1-in-4 draw the chance of
    // missing any one value across 200 rounds is (3/4)^200, effectively
    // zero, so this is not a source of flakiness.
    const minutes = new Set(GuessTimeGame.generate('hard', ctx(200)).map(e => e.time.minute));
    expect(minutes).toEqual(new Set([0, 15, 30, 45]));
  });

  it('formats the answer as zero-padded HH:MM matching the exercise time', () => {
    // Only checking the regex shape would pass even if correctAnswer were
    // unrelated to ex.time (and buildChoices, seeded from that same string,
    // would silently follow the wrong value into choices too). Tie the
    // formatted answer to the exercise's own hour/minute.
    const values = [0.11, 0.83, 0.42, 0.07, 0.95, 0.28, 0.64, 0.5, 0.19, 0.76];
    for (const ex of GuessTimeGame.generate('hard', ctx(10, cyclingRngFactory(values)))) {
      expect(ex.correctAnswer).toMatch(/^\d{2}:\d{2}$/);
      expect(ex.correctAnswer).toBe(pad2(ex.time.hour) + ':' + pad2(ex.time.minute));
    }
  });

  it('offers four unique choices including the answer', () => {
    for (const ex of GuessTimeGame.generate('normal', ctx(10))) {
      expect(ex.choices).toHaveLength(4);
      expect(new Set(ex.choices).size).toBe(4);
      expect(ex.choices).toContain(ex.correctAnswer);
    }
  });

  it('never repeats a time consecutively', () => {
    const times = GuessTimeGame.generate('hard', ctx(20)).map(e => e.correctAnswer);
    for (let i = 1; i < times.length; i++) {
      expect(times[i]).not.toBe(times[i - 1]);
    }
  });

  it('sets a day or night bodyClass above easy', () => {
    for (const ex of GuessTimeGame.generate('normal', ctx(10))) {
      expect(['time-theme-day', 'time-theme-night']).toContain(ex.bodyClass);
      const expected = ex.time.hour >= 6 && ex.time.hour < 18 ? 'day' : 'night';
      expect(ex.bodyClass).toBe('time-theme-' + expected);
    }
  });

  it('sets no bodyClass on easy', () => {
    for (const ex of GuessTimeGame.generate('easy', ctx(10))) {
      expect(ex.bodyClass).toBeNull();
    }
  });

  it('shows a sun or moon above easy but not on easy', () => {
    expect(GuessTimeGame.generate('normal', ctx(1))[0].promptHtml).toContain('time-daynight');
    expect(GuessTimeGame.generate('easy', ctx(1))[0].promptHtml).not.toContain('time-daynight');
  });

  it('renders the prompt from the exercise\'s own time, not a fixed clock', () => {
    // Replacing ClockRenderer.render(time.hour, time.minute) with a fixed
    // ClockRenderer.render(3, 0) would make every clock show three o'clock —
    // unanswerable — while still passing every other test above. Anchor the
    // prompt to the exact render output for this exercise's own time.
    const values = [0.11, 0.83, 0.42, 0.07, 0.95, 0.28, 0.64, 0.5, 0.19, 0.76];
    for (const ex of GuessTimeGame.generate('hard', ctx(10, cyclingRngFactory(values)))) {
      expect(ex.promptHtml).toContain(ClockRenderer.render(ex.time.hour, ex.time.minute));
    }
  });

  it('is deterministic for a fixed rng', () => {
    const a = GuessTimeGame.generate('normal', ctx(8, cyclingRngFactory([0.2, 0.5, 0.8, 0.1, 0.35])));
    const b = GuessTimeGame.generate('normal', ctx(8, cyclingRngFactory([0.2, 0.5, 0.8, 0.1, 0.35])));

    expect(a.map(e => e.correctAnswer)).toEqual(b.map(e => e.correctAnswer));
    expect(a.map(e => e.choices)).toEqual(b.map(e => e.choices));
  });

  it('does not always place the correct answer at the same position', () => {
    // buildChoices seeds choices with the correct answer at index 0 and
    // relies solely on the Fisher-Yates loop to move it. If that loop were
    // ever removed, the correct answer would sit at index 0 for every
    // exercise, and a child could win by always tapping the leftmost button
    // without learning any clock-reading. Assert the property (the position
    // varies), not one specific permutation or per-exercise index.
    const values = [0.11, 0.83, 0.42, 0.07, 0.95, 0.28, 0.64, 0.5, 0.19, 0.76];
    const exercises = GuessTimeGame.generate('hard', ctx(20, cyclingRngFactory(values)));

    const positions = exercises.map(ex => ex.choices.indexOf(ex.correctAnswer));
    const distinctPositions = new Set(positions);

    expect(distinctPositions.size).toBeGreaterThan(1);
  });

  it('never shows the same clock time twice in a session', () => {
    // easy is 12 whole hours over 5 rounds; normal is 24 hours x {00, 30} = 48
    // over 10; hard is 24 x {00, 15, 30, 45} = 96 over 20. Full distinctness
    // held in 500 000 of 500 000 simulated sessions. The one-slot `previous`
    // guard this replaces still let 7.9% of hard sessions show the same time
    // three or more times, because it only blocked A A and never A B A B A.
    for (const [difficulty, rounds] of [['easy', 5], ['normal', 10], ['hard', 20]]) {
      for (let session = 0; session < 30; session++) {
        const times = GuessTimeGame.generate(difficulty, ctx(rounds))
          .map(ex => ex.correctAnswer);

        expect(new Set(times).size, difficulty).toBe(rounds);
      }
    }
  });
});

function cyclingRngFactory(values) {
  let i = 0;
  return () => values[i++ % values.length];
}
