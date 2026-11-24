import { describe, it, expect } from 'vitest';
import { isNewer, shouldPrompt, createUpdateChecker, SNOOZE_MS, SNOOZE_KEY } from '../js/update-check.js';

function memoryStorage() {
    const data = {};
    return { getItem: k => (k in data ? data[k] : null), setItem: (k, v) => { data[k] = String(v); }, data };
}

// A fake server whose deployed version the test can change, and a clock it can move.
function setup({ local = '2026112401', remote = '2026112402' } = {}) {
    const server = { version: remote, fail: false, calls: [] };
    const clock = { t: 1_000_000 };
    const prompts = [];
    const storage = memoryStorage();
    const checker = createUpdateChecker({
        local,
        storage,
        now: () => clock.t,
        onPrompt: v => prompts.push(v),
        fetchImpl: async (url, opts) => {
            server.calls.push({ url, opts });
            if (server.fail) throw new Error('offline');
            return { ok: true, json: async () => ({ version: server.version }) };
        },
    });
    return { checker, server, clock, prompts, storage };
}

describe('isNewer', () => {
    it('is true only for a strictly newer deploy', () => {
        expect(isNewer('2026112402', '2026112401')).toBe(true);
        expect(isNewer('2026112501', '2026112499')).toBe(true);
        expect(isNewer('2026112401', '2026112401')).toBe(false);
        expect(isNewer('2026112309', '2026112401')).toBe(false);
    });

    it('treats a three-digit counter as later than a two-digit one the same day', () => {
        expect(isNewer('20261124100', '2026112499')).toBe(true);
    });

    it('ignores missing or garbage versions', () => {
        expect(isNewer(undefined, '2026112401')).toBe(false);
        expect(isNewer('abc', '2026112401')).toBe(false);
        expect(isNewer('2026112402', '__CACHE_VERSION__')).toBe(false);
    });
});

describe('shouldPrompt', () => {
    it('respects the snooze until it runs out', () => {
        const base = { local: '2026112401', remote: '2026112402' };
        expect(shouldPrompt({ ...base, now: 100, snoozeUntil: 0 })).toBe(true);
        expect(shouldPrompt({ ...base, now: 100, snoozeUntil: 101 })).toBe(false);
        expect(shouldPrompt({ ...base, now: 101, snoozeUntil: 101 })).toBe(true);
    });
});

describe('createUpdateChecker', () => {
    it('prompts when the server has a newer version, bypassing caches', async () => {
        const { checker, server, prompts } = setup();
        expect(await checker.check()).toBe(true);
        expect(prompts).toEqual(['2026112402']);
        expect(server.calls[0].opts).toEqual({ cache: 'no-store' });
        expect(server.calls[0].url).toMatch(/^\/version\.json\?t=\d+$/);
    });

    it('stays quiet when the running version is the latest', async () => {
        const { checker, prompts } = setup({ remote: '2026112401' });
        expect(await checker.check()).toBe(false);
        expect(prompts).toEqual([]);
    });

    it('stays quiet when the server cannot be reached', async () => {
        const { checker, server, prompts } = setup();
        server.fail = true;
        expect(await checker.check()).toBe(false);
        expect(prompts).toEqual([]);
    });

    it('does not prompt twice while the first prompt is still open', async () => {
        const { checker, prompts } = setup();
        await checker.check();
        await checker.check();
        expect(prompts).toHaveLength(1);
    });

    it('after "Later", stays silent for an hour, then asks again', async () => {
        const { checker, clock, prompts, storage } = setup();
        await checker.check();
        checker.snooze();
        expect(Number(storage.data[SNOOZE_KEY])).toBe(clock.t + SNOOZE_MS);

        clock.t += SNOOZE_MS - 1;
        expect(await checker.check()).toBe(false);
        expect(prompts).toHaveLength(1);

        clock.t += 1;
        expect(await checker.check()).toBe(true);
        expect(prompts).toHaveLength(2);
    });

    it('remembers "Later" across reloads through storage', async () => {
        const first = setup();
        await first.checker.check();
        first.checker.snooze();
        const reloaded = createUpdateChecker({
            local: '2026112401', storage: first.storage, now: () => first.clock.t,
            onPrompt: v => first.prompts.push(v),
            fetchImpl: async () => ({ ok: true, json: async () => ({ version: '2026112402' }) }),
        });
        expect(await reloaded.check()).toBe(false);
    });
});
