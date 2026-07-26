let activeLayoutClass = null;
const listeners = [];

// TEMPORARY: games still add their layout class directly via
// `gameBody.classList.add(...)` inside showExercise (one call per exercise), bypassing
// setLayoutClass's single-slot tracking below. Because of that, activeLayoutClass can be
// null even though the DOM still carries a game's layout class, so setLayoutClass(null)
// alone cannot be trusted to clean it up. Keep removing every known layout class
// explicitly until a later task migrates those call sites to setLayoutClass itself.
const KNOWN_LAYOUT_CLASSES = [
  'uno-game-body',
  'dice-recognition-layout',
  'geo-game-layout',
  'time-game-layout',
  'crash-game-layout',
  'memory-game-layout',
  'chess-game-layout',
];

export function onScreenChange(fn) {
  listeners.push(fn);
}

export function setLayoutClass(className) {
  const body = document.querySelector('.game-body');
  if (!body) return;

  if (activeLayoutClass) body.classList.remove(activeLayoutClass);
  if (className) body.classList.add(className);
  activeLayoutClass = className;
}

export function showScreen(name) {
  const current = document.querySelector('.screen.active');
  const next = document.getElementById('screen-' + name);
  if (!next) return;

  if (current && current !== next) {
    current.classList.add('screen-out');
    current.classList.remove('active');
    current.addEventListener('animationend', () => {
      current.classList.remove('screen-out');
    }, { once: true });
  }

  next.classList.add('active');

  if (name !== 'game') {
    document.body.classList.remove('time-theme-day', 'time-theme-night');
    setLayoutClass(null);
    const gameBody = document.querySelector('.game-body');
    if (gameBody) gameBody.classList.remove(...KNOWN_LAYOUT_CLASSES);
    const choices = document.getElementById('choices-container');
    if (choices) choices.style.gridTemplateColumns = '';
  }

  listeners.forEach(fn => fn(name));
}
