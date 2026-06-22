const CACHE_NAME = "keuangan-v3";

// PERBAIKAN BUG #12: Hapus icon dari FILES_TO_CACHE agar install tidak gagal
// jika file icon belum ada. Icon bisa di-cache saat pertama kali dimuat.
const FILES_TO_CACHE = [
  "./index.html",
  "./style.css",
  "./app.js",
  "./manifest.json"
];

// Saat install: cache semua file statis
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(FILES_TO_CACHE))
      .then(() => self.skipWaiting())
  );
});

// PERBAIKAN BUG #11: Tambah event activate untuk bersihkan cache lama
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList
          .filter((key) => key !== CACHE_NAME)
          .map((key) => {
            console.log("[SW] Menghapus cache lama:", key);
            return caches.delete(key);
          })
      );
    }).then(() => self.clients.claim())
  );
});

// Saat ada request: cek cache dulu, kalau tidak ada baru ambil dari internet
self.addEventListener("fetch", (event) => {
  // Request ke Apps Script: selalu ambil dari internet (jangan di-cache)
  if (event.request.url.includes("script.google.com")) {
    return;
  }

  // Untuk request lain: cache-first strategy
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;

      // Tidak ada di cache: ambil dari internet dan simpan
      return fetch(event.request).then((networkResponse) => {
        // Hanya cache response yang valid
        if (
          networkResponse &&
          networkResponse.status === 200 &&
          networkResponse.type !== "opaque"
        ) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Jika offline dan tidak ada cache, kembalikan halaman utama
        if (event.request.destination === "document") {
          return caches.match("./index.html");
        }
      });
    })
  );
});
