/**
 * HanziLab - Service Worker for PWA Offline Support
 * Cung cấp khả năng lưu cache và chạy ngoại tuyến không cần kết nối mạng
 */

const CACHE_NAME = 'hanzilab-cache-v2.1';

const STATIC_ASSETS = [
    './',
    './index.html',
    './manifest.json',
    './icon.png',
    './icon.svg',
    './css/style.css',
    './js/storage.js',
    './js/dictionary.js',
    './js/audio.js',
    './js/writer.js',
    './js/app.js'
];

const CDN_ASSETS = [
    'https://cdn.tailwindcss.com',
    'https://cdn.jsdelivr.net/npm/hanzi-writer@3.5/dist/hanzi-writer.min.js',
    'https://cdn.jsdelivr.net/npm/pinyin-pro@3.16.0/dist/index.js'
];

// Cài đặt Service Worker và nạp trước tài nguyên tĩnh
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(async (cache) => {
            // Nạp các tài nguyên tĩnh nội bộ
            try {
                await cache.addAll(STATIC_ASSETS);
            } catch (err) {
                console.warn('Lỗi cache tài nguyên tĩnh nội bộ:', err);
            }

            // Nạp thêm các CDN cần thiết
            for (const url of CDN_ASSETS) {
                try {
                    const response = await fetch(url, { mode: 'cors' });
                    if (response.ok) {
                        await cache.put(url, response);
                    }
                } catch (e) {
                    console.warn('Không thể nạp CDN trước vào cache:', url, e);
                }
            }
        }).then(() => self.skipWaiting())
    );
});

// Kích hoạt và dọn dẹp các cache cũ
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cache) => {
                    if (cache !== CACHE_NAME) {
                        return caches.delete(cache);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Chiến lược Fetch: Cache First, Network Fallback
self.addEventListener('fetch', (event) => {
    const request = event.request;

    // Bỏ qua các yêu cầu không phải GET hoặc chrome-extension
    if (request.method !== 'GET' || !request.url.startsWith('http')) {
        return;
    }

    // Đối với API Google Input Tools IME: luôn dùng Network, không cache để dữ liệu tra cứu luôn mới
    if (request.url.includes('inputtools.google.com')) {
        return;
    }

    event.respondWith(
        caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
                return cachedResponse;
            }

            return fetch(request).then((networkResponse) => {
                // Chỉ lưu vào cache các phản hồi hợp lệ (status 200)
                if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
                    const responseToCache = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(request, responseToCache);
                    });
                }
                return networkResponse;
            }).catch(() => {
                // Fallback nếu mất mạng và request là điều hướng HTML
                if (request.mode === 'navigate') {
                    return caches.match('./index.html');
                }
            });
        })
    );
});
