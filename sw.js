// sw.js - 离线邮递员 (防串号安全版)

self.addEventListener('push', function(event) {
    event.waitUntil(
        // 1. 从 Cache 中读取前端存入的 deviceId
        caches.open('app-config-cache')
        .then(cache => cache.match('/current-device-id'))
        .then(response => {
            if (response) return response.text();
            return null;
        })
        .then(deviceId => {
            // 2. 带着 deviceId 去云端拉取专属的推送内容
            let fetchUrl = 'https://honey-offline-brain.xingyan067.workers.dev/get-latest-push';
            if (deviceId) {
                fetchUrl += `?deviceId=${deviceId}`;
            }
            
            return fetch(fetchUrl)
            .then(res => res.json())
            .then(data => {
                const options = {
                    body: data.body || "你有一条新消息",
                    icon: data.icon || "https://i.postimg.cc/yYrDHvG5/mmexport1766982633245.jpg",
                    badge: data.icon || "https://i.postimg.cc/yYrDHvG5/mmexport1766982633245.jpg",
                    vibrate: [200, 100, 200],
                    tag: 'offline-msg-' + Date.now(), // 确保每次通知独立显示
                    data: { url: '/' }
                };
                return self.registration.showNotification(data.title || "小元机", options);
            });
        })
        .catch(err => {
            // 兜底保护：如果网络卡了拉不到消息，也要强行弹个横幅
            return self.registration.showNotification("小元机", { 
                body: "收到一条新消息",
                icon: "https://i.postimg.cc/yYrDHvG5/mmexport1766982633245.jpg",
                tag: 'offline-msg-fallback',
                data: { url: '/' }
            });
        })
    );
});

// 监听用户点击通知的动作，点击后打开网页
self.addEventListener('notificationclick', function(event) {
    event.notification.close(); 
    
    event.waitUntil(
        clients.matchAll({ type: 'window' }).then(windowClients => {
            for (let i = 0; i < windowClients.length; i++) {
                const client = windowClients[i];
                if (client.url === '/' && 'focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow('/');
            }
        })
    );
});
