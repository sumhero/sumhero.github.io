const CACHE_VERSION = '2026072711';
const CACHE_NAME = `sumhero-v${CACHE_VERSION}`;

const FLAG_CODES = 'ad ae af ag al am ao ar at au az ba bb bd be bf bg bh bi bj bn bo br bs bt bw by bz ca cd cf cg ch ci cl cm cn co cr cu cv cy cz de dj dk dm do dz ec ee eg er es et fi fj fm fr ga gb gd ge gh gm gn gq gr gt gw gy hn hr ht hu id ie il in iq ir is it jm jo jp ke kg kh ki km kn kp kr kw kz la lb lc li lk lr ls lt lu lv ly ma mc md me mg mh mk ml mm mn mr mt mu mv mw mx my mz na ne ng ni nl no np nr nz om pa pe pg ph pk pl ps pt pw py qa ro rs ru rw sa sb sc sd se sg si sk sl sm sn so sr ss st sv sy sz td tg th tj tl tm tn to tr tt tv tz ua ug us uy uz va vc ve vn vu ws xk ye za zm zw';

const ASSETS = [
    '/',
    '/index.html',
    '/css/game.css',
    '/js/i18n/translations.js',
    '/js/i18n/i18n.js',
    '/js/sound.js',
    '/js/render/dice.js',
    '/js/animation.js',
    '/js/engine/screens.js',
    '/js/engine/results.js',
    '/js/engine/speech.js',
    '/js/engine/game-engine.js',
    '/js/engine/registry.js',
    '/js/games/dice-addition.js',
    '/js/games/object-categories.js',
    '/js/games/count-objects.js',
    '/js/games/dice-recognition.js',
    '/js/games/uno.js',
    '/js/games/countries.js',
    '/js/games/capitals.js',
    '/js/data/countries.js',
    '/js/game-list.js',
    '/js/guess-time-game.js',
    '/js/double-crash-game.js',
    '/js/memory-game.js',
    '/js/chess-game.js',
    '/js/app.js',
    '/manifest.json',
    '/images/icon-192.png',
    '/images/icon-512.png',
    ...FLAG_CODES.split(' ').map(c => '/flags/' + c + '.svg'),
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
        )
    );
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((cached) => cached || fetch(event.request))
    );
});
