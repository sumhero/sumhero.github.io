import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { GAMES } from '../../js/engine/registry.js';

// Games that legitimately do NOT call drawDistinct, each with the reason it is
// exempt. Anything else in GAMES must call it. Deliberately a duplicated
// literal list rather than anything derived from the games themselves: a guard
// that computed its own exemptions could not fail.
const EXEMPT = {
  memory: 'legacy: true — own session loop, fixed pair set, shuffled',
  double_crash: 'legacy: true — a continuous betting session with no exercises',
  dice_addition: 'already full-session deduped on op1:op2; dedups before the easy sort',
  countries: 'already full-session deduped in pickCountries, with a pool-exhaustion escape',
  capitals: 'shares pickCountries with countries',
  count_objects: 'whole-exercise repeats are already 0% — emojis[i % 15] makes every field distinct',
  ordering: 'pickDistinct is within-board and has a deterministic top-up that must not be disturbed',
};

const FILES = {
  dice_recognition: 'dice-recognition',
  dice_addition: 'dice-addition',
  count_objects: 'count-objects',
  missing_number: 'missing-number',
  word_problems: 'word-problems',
  number_words: 'number-words',
  tens_units: 'tens-units',
  guess_time: 'guess-time',
  double_crash: 'double-crash',
};

function sourceOf(id) {
  return readFileSync('js/games/' + (FILES[id] || id) + '.js', 'utf8');
}

describe('drawDistinct coverage', () => {
  it('is called by every game that is not explicitly exempt', () => {
    const missing = GAMES
      .filter(game => !EXEMPT[game.id])
      .filter(game => !sourceOf(game.id).includes('drawDistinct('))
      .map(game => game.id);

    expect(missing, 'these games can repeat an exercise within a session').toEqual([]);
  });

  it('covers exactly fifteen games', () => {
    // Independent literal. Twenty engine-driven games, minus the five already
    // correct, is fifteen; plus the two legacy games there are twenty-two
    // registry entries and seven exemptions.
    const using = GAMES.filter(game => sourceOf(game.id).includes('drawDistinct('));

    expect(using).toHaveLength(15);
    expect(GAMES).toHaveLength(22);
    expect(Object.keys(EXEMPT)).toHaveLength(7);
  });

  it('keeps the exempt games free of drawDistinct', () => {
    for (const id of Object.keys(EXEMPT)) {
      expect(sourceOf(id).includes('drawDistinct('), id + ' is listed exempt but calls it').toBe(false);
    }
  });

  it('leaves the engine out of it', () => {
    // js/engine/game-engine.js has been byte-identical since checkpoint 1 and
    // this work must not be the thing that changes that.
    expect(readFileSync('js/engine/game-engine.js', 'utf8')).not.toContain('drawDistinct');
  });
});
