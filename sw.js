const CACHE_NAME = 'cpp-dz-v2';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './laws.json',
  './penal.json',
  './version.json'
];

// تثبيت الملفات في ذاكرة الهاتف للعمل بدون إنترنت
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// تفعيل النسخة الجديدة وحذف القديمة
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// استراتيجية: جلب التحديث من الإنترنت إذا توفر، وإلا التشغيل من ذاكرة الهاتف (Offline)
self.addEventListener('fetch', (e) => {
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const resClone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(e.request, resClone));
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
