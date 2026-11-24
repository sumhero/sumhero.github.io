import { APP_VERSION } from './version.js';
import { I18n } from './i18n/i18n.js';

// Periodically asks the server which version is deployed (version.json, never
// cached by the service worker) and, when it is newer than the code running in
// this page (APP_VERSION, cached with the other assets), offers to update.
// "Later" silences the offer for SNOOZE_MS, remembered across reloads.

export const CHECK_INTERVAL_MS = 10 * 60 * 1000;
export const SNOOZE_MS = 60 * 60 * 1000;
export const FIRST_CHECK_MS = 30 * 1000;
export const SNOOZE_KEY = 'update_snooze_until';

// Versions are YYYYMMDD + counter (see tools/build-sw.js), so numeric order is
// deploy order. Only a strictly newer server version counts: a CDN edge still
// serving an older version.json must never prompt a "downgrade".
export function isNewer(remote, local) {
    const r = Number(remote), l = Number(local);
    return Number.isFinite(r) && Number.isFinite(l) && r > l;
}

export function shouldPrompt({ local, remote, now, snoozeUntil }) {
    return isNewer(remote, local) && !(snoozeUntil > now);
}

// All side effects are injected, so tests can drive it with a fake clock,
// server and storage.
export function createUpdateChecker({ local = APP_VERSION, fetchImpl, storage, now = () => Date.now(), onPrompt }) {
    let prompting = false;
    let lastCheck = 0;

    const readSnooze = () => {
        try { return Number(storage.getItem(SNOOZE_KEY)) || 0; } catch (e) { return 0; }
    };

    return {
        get lastCheck() { return lastCheck; },

        async check() {
            lastCheck = now();
            if (prompting || readSnooze() > now()) return false;
            let remote;
            try {
                // The query string also skips any CDN copy cached under the plain URL.
                const res = await fetchImpl('/version.json?t=' + now(), { cache: 'no-store' });
                if (!res.ok) return false;
                remote = (await res.json()).version;
            } catch (e) {
                return false;   // offline or server hiccup: try again next time
            }
            if (!shouldPrompt({ local, remote, now: now(), snoozeUntil: readSnooze() })) return false;
            prompting = true;
            onPrompt(remote);
            return true;
        },

        snooze() {
            prompting = false;
            try { storage.setItem(SNOOZE_KEY, String(now() + SNOOZE_MS)); } catch (e) { /* storage blocked: ask again next check */ }
        },
    };
}

// Installs the new service worker and reloads into it. The registration in
// index.html already reloads once the new worker activates; the timeout is a
// fallback for when the browser does not see a new sw.js yet (CDN lag): clear
// the caches and reload from the network, like Settings > Reload App.
export async function applyUpdate() {
    const reload = () => window.location.reload();
    const hardReload = async () => {
        if ('caches' in window) {
            const keys = await caches.keys();
            await Promise.all(keys.map(k => caches.delete(k)));
        }
        reload();
    };
    try {
        const reg = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration() : null;
        if (!reg) return reload();
        navigator.serviceWorker.addEventListener('controllerchange', reload, { once: true });
        await reg.update();
        setTimeout(() => {
            if (!reg.installing && !reg.waiting) hardReload();
        }, 10000);
    } catch (e) {
        hardReload();
    }
}

function showPrompt(checker) {
    if (document.getElementById('update-toast')) return;
    const toast = document.createElement('div');
    toast.id = 'update-toast';
    toast.className = 'update-toast';
    toast.setAttribute('role', 'alert');
    toast.innerHTML =
        '<span class="update-toast-text"></span>' +
        '<button class="btn btn-small update-toast-later"></button>' +
        '<button class="btn btn-small btn-primary update-toast-now"></button>';
    toast.querySelector('.update-toast-text').textContent = I18n.t('updateAvailable');
    const later = toast.querySelector('.update-toast-later');
    const now = toast.querySelector('.update-toast-now');
    later.textContent = I18n.t('updateLater');
    now.textContent = I18n.t('updateNow');
    later.addEventListener('click', () => { checker.snooze(); toast.remove(); });
    now.addEventListener('click', () => {
        now.disabled = true; later.disabled = true;
        applyUpdate();
    });
    document.body.appendChild(toast);
}

export function startUpdateChecks() {
    if (!('fetch' in window)) return;
    const checker = createUpdateChecker({
        fetchImpl: (url, opts) => fetch(url, opts),
        storage: window.localStorage,
        onPrompt: () => showPrompt(checker),
    });
    setTimeout(() => checker.check(), FIRST_CHECK_MS);
    setInterval(() => checker.check(), CHECK_INTERVAL_MS);
    // Timers are throttled or frozen while the app is in the background (an
    // installed PWA can sit there for days), so also check on return.
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && Date.now() - checker.lastCheck >= CHECK_INTERVAL_MS) checker.check();
    });
}
