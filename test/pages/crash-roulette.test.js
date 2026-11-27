import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

/* Crash Roulette's engine lives inside the page (pages/crash-roulette.html has no external scripts), so the
   test lifts the `const Engine = (function () { ... })();` block out of the HTML and evaluates it. */
const html = readFileSync('pages/crash-roulette.html', 'utf8');
const src = html.match(/const Engine = \(function \(\) \{[\s\S]*?\n\}\)\(\);/);
const Engine = new Function(src[0] + '\nreturn Engine;')();

const nodeSha = s => createHash('sha256').update(s, 'latin1').digest('hex');
const seedOf = i => nodeSha('crash-roulette-test-' + i).slice(0, 32);

/* Plays one seeded round to the end. `swaps` target swaps before the bet; `favOnWheel` puts the craps number on
   wheel 1's hidden result, so that every lost, non-doubles round rolls the dice. */
function playRound(seed, { swaps = 0, favOnWheel = false } = {}) {
  const g = Engine.createGame({ newSeed: () => seed });
  for (let i = 0; i < swaps; i++) Engine.newTarget(g);
  if (favOnWheel) Engine.setFav(g, g.finals[0]);
  const st = Engine.stats(g);
  const side = ['H', 'L', 'C'].find(k => st[k].odds !== null && st[k].odds >= Engine.MIN_ODDS);
  if (!side) return null;
  const hashBeforeBet = g.fair.hash;
  expect(Engine.placeBet(g, side, 1).ok).toBe(true);
  while (!Engine.reveal(g).final) { /* hold to the end */ }
  return { g, hashBeforeBet };
}

describe('Crash Roulette engine: sha256', () => {
  it('matches the reference implementation, including the padding boundaries', () => {
    for (const s of ['', 'abc', 'a'.repeat(55), 'a'.repeat(56), 'a'.repeat(63), 'a'.repeat(64), 'a'.repeat(65), 'a'.repeat(119), 'a'.repeat(120), seedOf(1)]) {
      expect(Engine.sha256(s)).toBe(nodeSha(s));
    }
  });

  it('refuses text it would hash differently from a UTF-8 tool', () => {
    expect(() => Engine.sha256('é')).toThrow();
  });
});

describe('Crash Roulette engine: seeded rounds', () => {
  it('draws the same stream from the same seed and a different one from another seed', () => {
    const a = Engine.seedRng(seedOf(1)), b = Engine.seedRng(seedOf(1)), c = Engine.seedRng(seedOf(2));
    const xs = Array.from({ length: 50 }, () => a()), ys = Array.from({ length: 50 }, () => b()), zs = Array.from({ length: 50 }, () => c());
    expect(xs).toEqual(ys);
    expect(xs).not.toEqual(zs);
    expect(xs.every(v => v >= 0 && v < 1)).toBe(true);
  });

  it('rejects a malformed seed', () => {
    expect(() => Engine.seedRng('123')).toThrow();
    expect(() => Engine.seedRng('G'.repeat(32))).toThrow();
  });

  it('builds an identical round from the same seed', () => {
    const a = Engine.createGame({ newSeed: () => seedOf(7) }), b = Engine.createGame({ newSeed: () => seedOf(7) });
    expect([a.threshold, a.lucky, a.plans, a.finals]).toEqual([b.threshold, b.lucky, b.plans, b.finals]);
  });

  it('commits to the seed before the bet: the hash is the SHA-256 of the seed', () => {
    const g = Engine.createGame({ newSeed: () => seedOf(3) });
    expect(g.phase).toBe('idle');
    expect(g.fair.hash).toBe(nodeSha(seedOf(3)));
    expect(Engine.verifyRound(g)).toBeNull();   /* nothing to verify until the round is finished */
  });

  it('takes a fresh seed for every round', () => {
    let n = 0;
    const g = Engine.createGame({ newSeed: () => seedOf(100 + n++) });
    const first = g.fair.hash;
    Engine.placeBet(g, 'H', 1) ; while (g.phase !== 'finished') Engine.reveal(g);
    Engine.prepareRound(g);
    expect(g.fair.hash).not.toBe(first);
    expect(g.fair.swaps).toBe(0);
  });

  it('leaves an unseeded game on the injected rng, with no commitment', () => {
    const mk = () => { const r = Engine.seedRng(seedOf(9)); return Engine.createGame({ rng: r }); };
    const a = mk(), b = mk();
    expect(a.fair).toBeNull();
    expect([a.threshold, a.lucky, a.plans, a.finals]).toEqual([b.threshold, b.lucky, b.plans, b.finals]);
    Engine.placeBet(a, 'H', 1); while (a.phase !== 'finished') Engine.reveal(a);
    expect(Engine.verifyRound(a)).toBeNull();
  });
});

describe('Crash Roulette engine: verifyRound', () => {
  /* 400 seeded rounds: with 0-2 target swaps, half of them with the craps number on a wheel */
  const rounds = [];
  for (let i = 0; i < 400; i++) { const r = playRound(seedOf(1000 + i), { swaps: i % 3, favOnWheel: i % 2 === 0 }); if (r) rounds.push(r); }
  const withDice = rounds.filter(r => r.g.result.craps), withSwaps = rounds.filter(r => r.g.fair.swaps > 0);

  it('covers the cases it claims to (dice rolled, targets swapped)', () => {
    expect(rounds.length).toBeGreaterThan(300);
    expect(withDice.length).toBeGreaterThan(30);
    expect(withSwaps.length).toBeGreaterThan(100);
    expect(withDice.filter(r => r.g.fair.swaps > 0).length).toBeGreaterThan(10);
  });

  it('confirms every honestly played round, and the hash never changed after the bet', () => {
    for (const { g, hashBeforeBet } of rounds) {
      expect(g.fair.hash).toBe(hashBeforeBet);
      expect(Engine.verifyRound(g)).toEqual({ ok: true, checks: { hash: true, target: true, lucky: true, wheels: true, dice: true } });
    }
  });

  const failing = (g, name) => { const v = Engine.verifyRound(g); expect(v.ok).toBe(false); expect(v.checks[name]).toBe(false); };

  it('catches a wheel result changed after the commitment', () => {
    const { g } = playRound(seedOf(1));
    g.finals[0] = (g.finals[0] + 1) % 37;
    failing(g, 'wheels');
  });

  it('catches a changed reveal plan', () => {
    const { g } = playRound(seedOf(2));
    g.plans[1][0].reverse();
    failing(g, 'wheels');
  });

  it('catches a seed that does not belong to the committed hash', () => {
    const { g } = playRound(seedOf(3));
    g.fair.seed = seedOf(4);
    failing(g, 'hash');
  });

  it('catches a changed target and a hidden target swap', () => {
    const a = playRound(seedOf(5)).g;
    a.threshold += 1;
    failing(a, 'target');
    const b = withSwaps[0].g;
    b.fair.swaps -= 1;
    failing(b, 'target');
  });

  it('catches changed lucky pockets', () => {
    const { g } = playRound(seedOf(6));
    g.lucky = g.lucky.map(l => ({ ...l, m: l.m + 1 }));
    failing(g, 'lucky');
  });

  it('catches changed craps dice', () => {
    const g = withDice[0].g;
    g.result.craps.rolls[0] = [g.result.craps.rolls[0][0] % 6 + 1, g.result.craps.rolls[0][1]];
    failing(g, 'dice');
  });
});
