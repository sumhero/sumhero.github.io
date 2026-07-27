// Draw-without-replacement for one game session, as a bounded rejection
// sampler.
//
// `draw(i)` builds a whole candidate exercise for round `i`. It stays a
// closure over the game's own `ctx.rng`, which is what lets index-dependent
// generators keep working (number_words alternates its irregular French
// 70-99 band on even `i`) and lets each game's validity rules stay in the one
// place they already live (shapes' 45-degree square exclusion, chess's
// zero-target knight, word_problems' two-step floors). This module never
// enumerates the question space and never learns anything about it.
//
// `keyOf(exercise)` names the exercise's identity and must return a string.
// It is usually not `correctAnswer`: parity has two possible answers, compare
// three, and chess's answer is a set of squares. `dice_recognition` and
// `guess_time` are the reviewed exceptions where the identity and the answer
// genuinely coincide — a die face and a formatted `HH:MM` time each have
// exactly one exercise per value, so keying on `correctAnswer` there is
// correct, not an oversight. Each game names its own key.
//
// Exhaustion is normal, not exceptional: dice_recognition hard has five faces
// over twenty rounds. When a round burns its budget, the used-set is cleared
// and re-seeded with the exercise just emitted, so the fresh pass can never
// place a repeat immediately after its previous showing. Behaviour degrades
// to "cycle the whole space evenly, never twice in a row", which is also the
// pedagogically right answer at that size. Both passes are bounded, so this
// cannot hang even when only one candidate exists.
export const DRAW_TRIES = 40;

export function drawDistinct(count, draw, keyOf, tries = DRAW_TRIES) {
  const items = [];
  const used = new Set();
  let lastKey = null;

  for (let i = 0; i < count; i++) {
    let item = draw(i);
    let key = keyOf(item);
    let attempts = 1;

    while (used.has(key) && attempts < tries) {
      item = draw(i);
      key = keyOf(item);
      attempts++;
    }

    if (used.has(key)) {
      used.clear();
      if (lastKey !== null) used.add(lastKey);

      attempts = 0;
      while (used.has(key) && attempts < tries) {
        item = draw(i);
        key = keyOf(item);
        attempts++;
      }
    }

    used.add(key);
    lastKey = key;
    items.push(item);
  }

  return items;
}
