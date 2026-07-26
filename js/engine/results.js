export const RESULTS_KEY = 'game_results';
export const MAX_RESULTS = 200;

export function loadResults() {
  try {
    const parsed = JSON.parse(localStorage.getItem(RESULTS_KEY));

    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

export function saveResult(result) {
  const results = loadResults();
  results.push(result);

  try {
    localStorage.setItem(RESULTS_KEY, JSON.stringify(results.slice(-MAX_RESULTS)));
  } catch (e) {
    // Storage full or unavailable — a lost result must never break a game.
  }
}
