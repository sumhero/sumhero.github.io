import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Animation } from '../js/animation.js';

// A stand-in for the real DotLottie class. It records how it was constructed and
// lets a test fire the events the real player would fire over the network.
function fakeDotLottieFactory(calls) {
  return class FakeDotLottie {
    constructor(options) {
      this.options = options;
      this.listeners = {};
      this.destroyed = false;
      calls.push(this);
    }

    addEventListener(event, handler) {
      this.listeners[event] = handler;
    }

    emit(event, payload) {
      if (this.listeners[event]) this.listeners[event](payload);
    }

    destroy() {
      this.destroyed = true;
    }
  };
}

function setOnLine(value) {
  Object.defineProperty(navigator, 'onLine', { value, configurable: true });
}

describe('Animation.showCelebration', () => {
  let container;
  let calls;

  beforeEach(() => {
    document.body.innerHTML = '<div id="dancing-animals"></div>';
    container = document.getElementById('dancing-animals');
    calls = [];
    Animation.DotLottie = fakeDotLottieFactory(calls);
    Animation.lottieInstance = null;
    setOnLine(true);
  });

  afterEach(() => {
    Animation.DotLottie = null;
    Animation.lottieInstance = null;
    setOnLine(true);
  });

  it('renders a lottie canvas when the player is available and online', () => {
    Animation.showCelebration(container);

    expect(container.querySelector('canvas.lottie-canvas')).not.toBeNull();
    expect(container.querySelectorAll('.dancing-animal')).toHaveLength(0);
    expect(calls).toHaveLength(1);
  });

  it('falls back to dancing animals when the player module never loaded', () => {
    Animation.DotLottie = null;

    Animation.showCelebration(container);

    expect(container.querySelectorAll('.dancing-animal')).toHaveLength(3);
    expect(container.querySelector('canvas')).toBeNull();
  });

  it('skips the network entirely when offline', () => {
    setOnLine(false);

    Animation.showCelebration(container);

    // Constructing the player would fetch animation JSON from a CDN that is not
    // in the service worker cache — offline that can only ever fail.
    expect(calls).toHaveLength(0);
    expect(container.querySelectorAll('.dancing-animal')).toHaveLength(3);
    expect(container.querySelector('canvas')).toBeNull();
  });

  it('falls back to dancing animals when the animation data fails to load', () => {
    Animation.showCelebration(container);
    expect(container.querySelector('canvas.lottie-canvas')).not.toBeNull();

    calls[0].emit('loadError', new Error('network'));

    expect(container.querySelectorAll('.dancing-animal')).toHaveLength(3);
    expect(container.querySelector('canvas')).toBeNull();
    expect(calls[0].destroyed).toBe(true);
    expect(Animation.lottieInstance).toBeNull();
  });

  it('ignores a load error from a celebration that has been superseded', () => {
    Animation.showCelebration(container);
    const stale = calls[0];

    Animation.showCelebration(container);
    expect(calls).toHaveLength(2);

    stale.emit('loadError', new Error('network'));

    // The second celebration is still on screen and untouched.
    expect(container.querySelector('canvas.lottie-canvas')).not.toBeNull();
    expect(container.querySelectorAll('.dancing-animal')).toHaveLength(0);
    expect(Animation.lottieInstance).toBe(calls[1]);
  });

  it('falls back to dancing animals when the player throws on construction', () => {
    Animation.DotLottie = class {
      constructor() {
        throw new Error('wasm unavailable');
      }
    };

    Animation.showCelebration(container);

    expect(container.querySelectorAll('.dancing-animal')).toHaveLength(3);
    expect(container.querySelector('canvas')).toBeNull();
  });

  it('picks three distinct animals for the fallback', () => {
    Animation.DotLottie = null;
    // Pin the rng so the mutation this guards against — drawing without
    // removing from the pool — always produces the same animal three times
    // rather than only sometimes colliding.
    const rng = vi.spyOn(Math, 'random').mockReturnValue(0);

    Animation.showCelebration(container);

    const shown = [...container.querySelectorAll('.dancing-animal')].map(el => el.textContent);
    expect(new Set(shown).size).toBe(3);
    rng.mockRestore();
  });
});

describe('Animation.loadDotLottie', () => {
  afterEach(() => {
    Animation.DotLottie = null;
  });

  it('leaves DotLottie null when the module import fails', async () => {
    Animation.DotLottie = null;
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // jsdom cannot resolve the remote esm.sh specifier, so the dynamic import
    // rejects — exactly the offline case this guard exists for.
    await Animation.loadDotLottie();

    expect(Animation.DotLottie).toBeNull();
    spy.mockRestore();
  });
});
