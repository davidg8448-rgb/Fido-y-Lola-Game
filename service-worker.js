
const CACHE_NAME = 'fidoylola-cache-v1';
const FILES = ['/', '/index.html', '/style.css', '/main.js', '/manifest.json', '/icons/icon-192.svg', '/icons/icon-512.svg', '/sounds/music_loop.wav', '/sounds/pick.wav', '/sounds/hit.wav', '/sounds/powerup.wav', '/sounds/dj_voice.wav'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(FILES))); self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(self.clients.claim()); });
self.addEventListener('fetch', e => { e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request))); });
