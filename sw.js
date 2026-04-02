// sw.js - 离线邮递员 (终极拉取版)

self.addEventListener('push', function(event) {
    // 核心逻辑：收到云端的唤醒信号后，强制保持后台运行，去拉取真实消息
    event.waitUntil(
        fetch('https://honey-offline-brain.xingyan067.workers.dev/get-latest-push')
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
            // 拿到真实内容后，呼叫手机系统弹出横幅！
            return self.registration.showNotification(data.title || "小元机", options);
        })
        .catch(err => {
            // 兜底保护：如果网络卡了拉不到消息，也要强行弹个横幅，防止苹果系统判定我们不干活而杀掉进程
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
