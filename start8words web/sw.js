// sw.js - 安全模式 (Safe Mode)
// 只負責滿足 PWA 安裝條件，不進行任何快取 (No Cache)
// 確保用戶每次打開都是讀取伺服器上最新的版本

self.addEventListener('install', (event) => {
    // 強制立即接管控制權，跳過等待
    self.skipWaiting();
    console.log('[SW] Service Worker Installed');
});

self.addEventListener('activate', (event) => {
    // 立即讓 Service Worker 控制所有頁面
    event.waitUntil(self.clients.claim());
    console.log('[SW] Service Worker Activated');
});

self.addEventListener('fetch', (event) => {
    // 什麼都不做，直接透傳請求給網絡
    // 這樣確保永遠讀取最新版，不會有舊版緩存問題
    event.respondWith(fetch(event.request));
});
