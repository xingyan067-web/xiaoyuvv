// sw.js - Service Worker 用于处理后台通知
self.addEventListener('install', (event) => {
    self.skipWaiting(); // 强制立即激活
});

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim()); // 立即接管所有页面
});

// 监听通知点击事件
self.addEventListener('notificationclick', (event) => {
    event.notification.close(); // 点击后关闭通知

    // 点击通知后，尝试唤醒或打开我们的网页
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
            // 如果网页已经打开，就聚焦到那个网页
            for (let i = 0; i < windowClients.length; i++) {
                let client = windowClients[i];
                if (client.url && 'focus' in client) {
                    return client.focus();
                }
            }
            // 如果网页没打开，就新开一个窗口
            if (clients.openWindow) {
                return clients.openWindow('/');
            }
        })
    );
});
