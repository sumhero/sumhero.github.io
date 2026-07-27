let activeLayoutClass = null;
const listeners = [];

// PERMANENT: the two legacy games (memory, double_crash) add their layout class
// directly via `gameBody.classList.add(...)` inside their own showExercise, bypassing
// setLayoutClass's single-slot tracking below, and their internals are off limits to
// change. Because of that, activeLayoutClass can be null even though the DOM still
// carries one of these two classes, so setLayoutClass(null) alone cannot be trusted to
// clean it up. Every other (engine-driven) game routes its layout class through
// setLayoutClass, so this list only needs to cover the legacy pair.
const KNOWN_LAYOUT_CLASSES = [
  'crash-game-layout',
  'memory-game-layout',
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
  }

  listeners.forEach(fn => fn(name));
}
