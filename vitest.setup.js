import { beforeAll } from 'vitest';

beforeAll(() => {
  // Ensure localStorage is available in jsdom
  const store = {};

  if (typeof global.localStorage === 'undefined') {
    global.localStorage = {
      getItem: (key) => store[key] || null,
      setItem: (key, value) => {
        store[key] = value.toString();
      },
      removeItem: (key) => {
        delete store[key];
      },
      clear: () => {
        Object.keys(store).forEach(key => delete store[key]);
      },
    };
  }
});
