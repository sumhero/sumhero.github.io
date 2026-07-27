import { describe, it, expect } from 'vitest';

describe('toolchain', () => {
  it('runs in a jsdom environment with a real document', () => {
    document.body.innerHTML = '<div id="probe">ok</div>';
    expect(document.getElementById('probe').textContent).toBe('ok');
  });

  it('supports localStorage', () => {
    localStorage.setItem('probe', '1');
    expect(localStorage.getItem('probe')).toBe('1');
  });
});
