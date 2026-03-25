// ==========================================
// 新增：iOS Standalone (全屏) 模式检测与防缩放
// ==========================================
function initStandaloneMode() {
    // 1. 检测是否在添加到主屏幕的全屏模式下运行
    const isIosStandalone = window.navigator.standalone === true;
    const isMatchMediaStandalone = window.matchMedia('(display-mode: standalone)').matches;

    if (isIosStandalone || isMatchMediaStandalone) {
        // 给 body 添加 class，方便 CSS 单独做刘海屏适配
        document.body.classList.add('ios-standalone');
        console.log("✅ 当前运行在 Standalone 全屏模式");
    } else {
        console.log("⚠️ 当前运行在普通浏览器模式，请添加到主屏幕体验全屏");
    }

    // 2. 彻底禁止双指缩放 (Pinch-to-zoom)
    document.addEventListener('touchmove', function(event) {
        if (event.touches.length > 1) {
            event.preventDefault();
        }
    }, { passive: false });
}

// 立即执行检测
initStandaloneMode();

// --- 激活码逻辑 (V2强制重新激活版) ---

/**
 * 检查、生成并显示激活状态
 */
async function checkAndShowActivation() {
    const overlay = document.getElementById('activation-overlay');
    
    // 1. 优先检查 localStorage (改用 V2 的 Key)
    if (localStorage.getItem('ios_theme_activation_v2_fallback') === 'true') {
        if (overlay) overlay.style.display = 'none';
        return;
    }

    // 2. 尝试查询 IndexedDB (改用 V2 的 Key)
    try {
        const idbPromise = idb.get('ios_theme_activation_v2_status');
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 1500));
        const activationStatus = await Promise.race([idbPromise, timeoutPromise]);
        
        if (activationStatus && activationStatus.activated) {
            localStorage.setItem('ios_theme_activation_v2_fallback', 'true');
            if (overlay) overlay.style.display = 'none';
            return;
        }
    } catch (e) {
        console.warn("数据库读取超时或为空，继续显示激活页");
    }

    // 3. 如果都没激活，显示激活页面
    if (overlay) overlay.style.display = 'flex';
}

/**
 * 验证用户输入的激活码
 */
function verifyActivation() {
    const btn = document.querySelector('.bingo-btn');
    const originalText = btn.innerText;
    btn.innerText = "验证中...";
    btn.disabled = true;

    // 使用 setTimeout 让 UI 有时间渲染 "验证中..." 的文字
    setTimeout(async () => {
        try {
            const qq = document.getElementById('qq-input').value.trim();
            const userCode = document.getElementById('code-input').value.trim();

            if (!qq || !userCode) {
                alert('请输入QQ号和激活码。');
                resetBtn();
                return;
            }

            // 计算期望的激活码
            const expectedCode = generateCodeForQQ(qq);

            if (userCode.toUpperCase() === expectedCode.toUpperCase()) {
                
                // 1. 立即写入 localStorage (改用 V2 的 Key)
                localStorage.setItem('ios_theme_activation_v2_fallback', 'true');
                
                // 2. 立即隐藏激活页面
                const overlay = document.getElementById('activation-overlay');
                if (overlay) overlay.style.display = 'none';
                
                alert('激活成功！欢迎使用。');

                // 3. 异步后台保存 (改用 V2 的 Key)
                try {
                    await idb.set('ios_theme_activation_v2_status', {
                        activated: true,
                        qq: qq,
                        activationTime: new Date().toISOString()
                    });
                } catch (dbError) {
                    console.warn("后台保存数据库失败，但不影响使用", dbError);
                }

            } else {
                alert('激活失败！激活码或QQ号错误。');
                resetBtn();
            }
        } catch (error) {
            alert("发生未知错误: " + error.message);
            resetBtn();
        }
    }, 100);

    function resetBtn() {
        btn.innerText = originalText;
        btn.disabled = false;
    }
}

/**
 * 根据QQ号生成激活码 (全新V2算法)
 */
function generateCodeForQQ(qq) {
    const salt = "HONEY-STUDIO-V2-SECRET-20260309";
    const baseString = `${qq}#${salt}`;
    let hash = 0;
    for (let i = 0; i < baseString.length; i++) {
        const char = baseString.charCodeAt(i);
        hash = ((hash << 7) - hash) + char;
        hash |= 0;
    }
    hash = Math.abs(hash);
    const hexHash = hash.toString(16).toUpperCase();
    const qqInfo = `${qq.length}${qq.slice(-2)}`;
    return `V2-${qqInfo}-${hexHash}`.substring(0, 16);
}
// --- 全局变量 ---
const totalApps = 7; 
let iconPresets = [];
let fontPresets = [];
let wallpaperPresets = [];
let apiPresets = [];

// API 限制相关
let sessionApiCallCount = 0; // 当前会话已调用次数
const aiGeneratingLocks = {}; // 【新增】：防止 AI 重复生成的锁

// 世界书数据 (全局共享)
let worldbookEntries = [];
let worldbookGroups = [];
let currentEditingId = null;

// 总结专用世界书选择
let tempSummaryWbIds = [];

let pendingDeleteType = ''; 
let pendingDeleteIndex = -1;
let pendingSaveType = '';

// 拖拽与编辑模式全局变量
let isHomeEditMode = false;
let backupGridLayout = {};
let backupWidgetPosition = {};
let customNotificationSound = null; // 存储自定义提示音

let dragItem = null;
let dragGhost = null;
let dragStartX = 0;
let dragStartY = 0;
let longPressTimer = null;
let isDragging = false;

// 手机仿真器相关全局变量
let wcActiveSimChatId = null; // 当前正在查看的模拟对话ID
let currentPhoneContact = null; // 当前正在查看的通讯录联系人
let wcFavoritesTab = 'memos'; // 收藏页面当前 Tab: 'memos' 或 'diaries'

// 隐私与安全全局变量
let privacyStepCount = parseInt(localStorage.getItem('ios_theme_steps')) || 0;
let privacyLastDate = localStorage.getItem('ios_theme_step_date') || new Date().toDateString();
let privacyLastMotionTime = 0;
let isMotionListenerAdded = false;

// 通知与后台全局变量 (新增)
let isRealNotifEnabled = localStorage.getItem('ios_theme_real_notif_enabled') === 'true';
let isAlwaysRealNotifEnabled = localStorage.getItem('ios_theme_always_real_notif_enabled') === 'true';

// 检查是否是新的一天，如果是则步数清零
function checkNewDay() {
    const today = new Date().toDateString();
    if (privacyLastDate !== today) {
        privacyStepCount = 0;
        privacyLastDate = today;
        localStorage.setItem('ios_theme_steps', 0);
        localStorage.setItem('ios_theme_step_date', today);
    }
}

// --- 强化：NPC 头像列表 (必须使用提供的图片) ---
const npcAvatarList = [
    "https://i.postimg.cc/26HCtpHm/Image-1771583312811-653.jpg",
    "https://i.postimg.cc/Px6d7G6T/Image-1771583329136-980.jpg",
    "https://i.postimg.cc/63HBPsHX/Image-1771583330998-167.jpg",
    "https://i.postimg.cc/nzVHTV1z/Image-1771759223355-652.jpg",
    "https://i.postimg.cc/fLWw5WvT/Image-1771759225619-652.jpg",
    "https://i.postimg.cc/9MXW1XBC/Image-1771759259026-722.jpg",
    "https://i.postimg.cc/vB8QX8v8/Image-1771759262483-627.jpg",
    "https://i.postimg.cc/76PxXPNH/Image-1771759272022-988.jpg",
    "https://i.postimg.cc/W3p2Sp7s/Image-1771759277167-924.jpg"
];

// 辅助函数：随机获取一个头像
function getRandomNpcAvatar() {
    return npcAvatarList[Math.floor(Math.random() * npcAvatarList.length)];
}

// --- IndexedDB 封装 (iOS Theme) ---
const idb = {
    dbName: 'iOSThemeStudioDB',
    storeName: 'settings',
    version: 1,
    db: null,

    async open() {
        if (this.db) return this.db;
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);
            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains(this.storeName)) {
                    db.createObjectStore(this.storeName);
                }
            };
            request.onsuccess = (e) => {
                this.db = e.target.result;
                resolve(this.db);
            };
            request.onerror = (e) => reject(e);
        });
    },

    async get(key) {
        await this.open();
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(this.storeName, 'readonly');
            const store = tx.objectStore(this.storeName);
            const req = store.get(key);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    },

    async set(key, value) {
        await this.open();
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(this.storeName, 'readwrite');
            const store = tx.objectStore(this.storeName);
            store.put(value, key);
            // 【iOS 核心修复】：必须监听 tx.oncomplete 确保数据物理写入磁盘
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    },

    async clear() {
        await this.open();
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(this.storeName, 'readwrite');
            const store = tx.objectStore(this.storeName);
            store.clear();
            // 【iOS 核心修复】
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    },
    
    async getAllKeys() {
        await this.open();
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(this.storeName, 'readonly');
            const store = tx.objectStore(this.storeName);
            const req = store.getAllKeys();
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    }
};

// --- 初始化 ---
window.onload = async function() {
    // !!! 新增：在所有操作之前，首先检查激活状态
    checkAndShowActivation();    
    initGrid(); 
    await loadAllData(); // 加载 IndexedDB 数据 (含布局恢复)
    
    // 【修复】：彻底移除旧版小组件的时间、电量、天气初始化，防止报错中断程序！
    
    initNewPhoneFeatures(); // 初始化新增的收藏和浏览器功能UI

    // 初始化 WeChat DB
    try {
        try {
            await wcDb.init();
        } catch (e) {
            console.error("WeChat DB Init failed", e);
        }
        await wcLoadData();
        wcRenderAll();
        wcSwitchTab('chat');
        initProactiveSystem(); // 初始化主动消息系统
        
        // 初始化恋人空间数据
        await lsLoadData();
        lsInitNpcLoop(); // 启动 NPC 循环
        lsRenderWidget(); // 渲染桌面小组件
        
        // 【新增】：恢复一起听歌状态
        await musicInitState();
        
    } catch (e) {
        console.error("WeChat Data bootstrap failed", e);
    }
    
    // WeChat 全局点击隐藏菜单
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.wc-bubble') && !e.target.closest('#wc-context-menu')) {
            wcHideContextMenu();
        }
    });

// iOS / PWA 全屏与键盘自适应最终版
function updateAppViewportVars() {
    const docStyle = document.documentElement.style;
    
    if (window.visualViewport) {
        // 动态获取真实可视高度（键盘弹起时会变小），完美解决键盘遮挡问题
        docStyle.setProperty('--app-height', `${window.visualViewport.height}px`);
        // 强制回滚到顶部，防止 iOS 默认的滚动推移导致错位
        window.scrollTo(0, 0);
        document.body.scrollTop = 0;
    } else {
        // 降级方案
        docStyle.setProperty('--app-height', `${window.innerHeight}px`);
    }
    
    // 统一输入栏高度变量，给微信聊天滚动区预留空间
    docStyle.setProperty('--wc-input-height', '64px');
    docStyle.setProperty('--keyboard-offset', '0px');
}

// 监听可视区域变化（键盘弹出/收起）
if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', () => {
        updateAppViewportVars();
        // 键盘弹起导致高度变化时，稍微延迟一下让各个聊天列表自动滚动到底部，防止最新消息被挡住
        setTimeout(() => {
            if (typeof wcScrollToBottom === 'function') wcScrollToBottom(true);
            const simHistory = document.getElementById('wc-sim-chat-history');
            if (simHistory) simHistory.scrollTop = simHistory.scrollHeight;
            const pmHistory = document.getElementById('forum-pm-chat-history');
            if (pmHistory) pmHistory.scrollTop = pmHistory.scrollHeight;
            const dreamHistory = document.getElementById('dream-chat-history');
            if (dreamHistory) dreamHistory.scrollTop = dreamHistory.scrollHeight;
        }, 100);
    });
    // 防止 iOS 键盘弹出时整个页面被系统强行往上推
    window.visualViewport.addEventListener('scroll', () => {
        window.scrollTo(0, 0);
        document.body.scrollTop = 0;
    });
} else {
    window.addEventListener('resize', updateAppViewportVars);
}
// 初始化调用一次
updateAppViewportVars();

    // 通用输入框确认按钮事件绑定
    const generalConfirmBtn = document.getElementById('wc-general-input-confirm');
    if (generalConfirmBtn) {
        generalConfirmBtn.onclick = function() {
            const val = document.getElementById('wc-general-input-field').value;
            if (wcState.generalInputCallback) {
                wcState.generalInputCallback(val);
            }
            wcCloseModal('wc-modal-general-input');
        };
    }

    // 监听模拟器聊天输入框，控制发送按钮显示
    const simInput = document.getElementById('wc-sim-chat-input');
    if (simInput) {
        simInput.addEventListener('input', function() {
            const sendBtn = document.getElementById('wc-sim-send-btn');
            const aiBtn = document.getElementById('wc-sim-ai-btn');
            if (this.value.trim().length > 0) {
                sendBtn.style.display = 'block';
                aiBtn.style.display = 'none';
            } else {
                sendBtn.style.display = 'none';
                aiBtn.style.display = 'flex';
            }
            // 自动调整高度
            this.style.height = 'auto';
            this.style.height = (this.scrollHeight) + 'px';
        });
        simInput.addEventListener('focus', () => {
            setTimeout(() => {
                const container = document.getElementById('wc-sim-chat-history');
                if(container) container.scrollTop = container.scrollHeight;
            }, 300);
        });
    }

    // 初始化通知与后台 UI
    if (typeof updateNotifUI === 'function') {
        updateNotifUI();
    }
         
    // 延迟 1.5 秒检查并弹出系统更新日志
    setTimeout(checkSystemUpdate, 1500); 
};

// --- 动态注入新增功能的 HTML 结构 ---
function initNewPhoneFeatures() {
    // 1. 覆盖浏览器图标的点击事件
    const browserIcon = document.querySelector('.wc-ios-app-item[onclick="alert(\'Browser App\')"]');
    if (browserIcon) {
        browserIcon.setAttribute('onclick', "wcOpenPhoneApp('browser')");
    }

    const screenBg = document.getElementById('wc-phone-screen-bg');
    
    // 2. 注入微信收藏的 HTML
    if (screenBg && !document.getElementById('wc-phone-app-favorites')) {
        const favHtml = `
            <div id="wc-phone-app-favorites" class="wc-phone-app-view" style="display: none;">
                <div class="wc-phone-sim-navbar" style="background: #F2F2F7; color: #000; border-bottom: 0.5px solid #C6C6C8; justify-content: space-between; padding: 0 10px;">
                    <div onclick="wcGeneratePhoneFavorites()" style="cursor: pointer; font-size: 14px; color: #007AFF; display: flex; align-items: center; gap: 4px;">
                        <svg class="wc-icon" viewBox="0 0 24 24" style="width: 16px; height: 16px;"><path d="M21 2v6h-6"></path><path d="M3 12a9 9 0 1 0 2.13-5.85L2 9"></path></svg>
                        刷新(偷看)
                    </div>
                    <div style="font-weight: 600;">我的收藏</div>
                    <div onclick="wcClosePhoneFavorites()" style="cursor: pointer; font-size: 14px;">关闭</div>
                </div>
                <div id="wc-phone-favorites-content" style="flex: 1; overflow-y: auto; padding: 0; background: #F2F2F7;"></div>
            </div>
            
            <!-- 备忘录详情弹窗 -->
            <div id="wc-phone-memo-detail" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: #FFF; z-index: 300; display: none; flex-direction: column;">
                <div class="wc-phone-sim-navbar" style="background: #F9F9F9; color: #000; border-bottom: 0.5px solid #C6C6C8; justify-content: space-between; padding: 0 10px;">
                    <div onclick="document.getElementById('wc-phone-memo-detail').style.display='none'" style="cursor: pointer; font-size: 14px; color: #007AFF;">返回</div>
                    <div style="font-weight: 600;">备忘录</div>
                    <div style="width: 30px;"></div>
                </div>
                <div id="wc-phone-memo-detail-content" style="flex: 1; overflow-y: auto; padding: 20px; font-size: 16px; line-height: 1.6; white-space: pre-wrap; color: #333;"></div>
            </div>
        `;
        screenBg.insertAdjacentHTML('beforeend', favHtml);
    }

    // 3. 注入浏览器的 HTML
    if (screenBg && !document.getElementById('wc-phone-app-browser')) {
        const browserHtml = `
            <div id="wc-phone-app-browser" class="wc-phone-app-view" style="display: none;">
                <div class="wc-phone-sim-navbar" style="background: #F9F9F9; color: #000; border-bottom: 0.5px solid #C6C6C8; justify-content: space-between; padding: 0 10px;">
                    <div onclick="wcGeneratePhoneBrowser()" style="cursor: pointer; font-size: 14px; color: #007AFF; display: flex; align-items: center; gap: 4px;">
                        <svg class="wc-icon" viewBox="0 0 24 24" style="width: 16px; height: 16px;"><path d="M21 2v6h-6"></path><path d="M3 12a9 9 0 1 0 2.13-5.85L2 9"></path></svg>
                        刷新(偷看)
                    </div>
                    <div style="font-weight: 600;">Browser</div>
                    <div onclick="wcClosePhoneApp()" style="cursor: pointer; font-size: 14px;">关闭</div>
                </div>
                <div id="wc-phone-browser-content" style="flex: 1; overflow-y: auto; padding: 0; background: #F2F2F7;"></div>
            </div>

            <!-- 帖子详情弹窗 -->
            <div id="wc-phone-post-detail" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: #FFF; z-index: 300; display: none; flex-direction: column;">
                <div class="wc-phone-sim-navbar" style="background: #F9F9F9; color: #000; border-bottom: 0.5px solid #C6C6C8; justify-content: space-between; padding: 0 10px;">
                    <div onclick="document.getElementById('wc-phone-post-detail').style.display='none'" style="cursor: pointer; font-size: 14px; color: #007AFF;">返回</div>
                    <div style="font-weight: 600;">帖子详情</div>
                    <div style="width: 30px;"></div>
                </div>
                <div id="wc-phone-post-detail-content" style="flex: 1; overflow-y: auto; padding: 0; background: #F2F2F7;"></div>
            </div>
        `;
        screenBg.insertAdjacentHTML('beforeend', browserHtml);
    }
}

// --- 数据加载逻辑 (异步) ---
async function loadAllData() {
    try {
        // 1. 加载新版小组件数据
        const widgetData = await idb.get('ios_theme_widget') || {};
        const elements = ['label1', 'label2', 'bubble1', 'bubble2', 'bubble3'];
        elements.forEach(id => {
            if (widgetData[id]) {
                const el = document.getElementById(id);
                if (el) el.innerText = widgetData[id];
            }
        });
        
        // 【已删除读取旧歌名和歌词的代码，强制使用 HTML 默认值】

        const images = ['avatar1', 'avatar2', 'picture1'];
        images.forEach(id => {
            if (widgetData[id]) {
                const el = document.getElementById(id);
                if (el) {
                    el.style.backgroundImage = `url('${widgetData[id]}')`;
                    el.innerHTML = ''; // 清除占位文字
                }
            }
        });

        // 2. 加载 Apple ID 数据
        const appleData = await idb.get('ios_theme_apple') || {};
        if (appleData.avatar) {
            const av = document.getElementById('appleIdAvatar');
            const avDetail = document.getElementById('appleIdDetailAvatar');
            av.style.backgroundImage = appleData.avatar;
            av.style.backgroundSize = 'cover';
            av.innerText = '';
            avDetail.style.backgroundImage = appleData.avatar;
            avDetail.style.backgroundSize = 'cover';
            avDetail.innerText = '';
        }
        if (appleData.name) {
            document.getElementById('appleIdName').innerText = appleData.name;
            document.getElementById('appleIdDetailName').innerText = appleData.name;
        }

        // 3. 加载世界书数据
        worldbookEntries = JSON.parse(await idb.get('ios_theme_wb_entries') || '[]');
        worldbookGroups = JSON.parse(await idb.get('ios_theme_wb_groups') || '[]');

        // 4. 加载主题设置 (壁纸、字体)
        const themeData = await idb.get('ios_theme_settings') || {};
        if (themeData.wallpaper) document.getElementById('mainScreen').style.backgroundImage = themeData.wallpaper;
        if (themeData.fontSize) {
            changeFontSize(themeData.fontSize);
            document.getElementById('fontSizeSlider').value = themeData.fontSize;
        }
        if (themeData.fontUrl) {
            document.getElementById('fontUrlInput').value = themeData.fontUrl;
            applyFont(themeData.fontUrl);
        }

        // 5. 加载 App 布局 (图标和名称)
        const appsData = JSON.parse(await idb.get('ios_theme_apps') || '[]');
        appsData.forEach(app => {
            const nameEl = document.getElementById(`name-${app.id}`);
            const iconEl = document.getElementById(`icon-${app.id}`);
            if (nameEl) nameEl.innerText = app.name;
            if (iconEl && app.iconBg) {
                iconEl.style.backgroundImage = app.iconBg;
                iconEl.style.backgroundColor = 'transparent';
            }
        });

        // 5.1 恢复桌面布局 (位置)
        const layoutData = await idb.get('ios_theme_layout');
        if (layoutData) {
            restoreGridLayout(layoutData);
        }

        // 6. 加载预设
        const presets = await idb.get('ios_theme_presets') || {};
        iconPresets = presets.icons || [];
        fontPresets = presets.fonts || [];
        wallpaperPresets = presets.wallpapers || [];
        apiPresets = presets.apis || [];

        // 7. 加载 API 设置 (双路适配)
        const fullApiConfig = await idb.get('ios_theme_api_config') || {};
        
        // 兼容旧版单路数据
        const primary = fullApiConfig.primary || { baseUrl: fullApiConfig.baseUrl, key: fullApiConfig.key, model: fullApiConfig.model, temp: fullApiConfig.temp };
        const secondary = fullApiConfig.secondary || {};
        const routes = fullApiConfig.routes || { phone: true, npc: false, forum: true };

        // 填充主 API
        if (primary.baseUrl) document.getElementById('apiBaseUrl').value = primary.baseUrl;
        if (primary.key) document.getElementById('apiKey').value = primary.key;
        if (primary.temp) {
            document.getElementById('tempSlider').value = primary.temp;
            document.getElementById('tempDisplay').innerText = primary.temp;
        }
        if (primary.model) {
             const select = document.getElementById('modelSelect');
             if (select.options.length <= 1) {
                 const opt = document.createElement('option');
                 opt.value = primary.model; opt.innerText = primary.model + " (已保存)"; opt.selected = true;
                 select.appendChild(opt);
             }
        }

        // 填充副 API
        if (secondary.baseUrl) document.getElementById('secApiBaseUrl').value = secondary.baseUrl;
        if (secondary.key) document.getElementById('secApiKey').value = secondary.key;
        if (secondary.temp) {
            document.getElementById('secTempSlider').value = secondary.temp;
            document.getElementById('secTempDisplay').innerText = secondary.temp;
        }
        if (secondary.model) {
             const select = document.getElementById('secModelSelect');
             if (select.options.length <= 1) {
                 const opt = document.createElement('option');
                 opt.value = secondary.model; opt.innerText = secondary.model + " (已保存)"; opt.selected = true;
                 select.appendChild(opt);
             }
        }

        // 填充路由开关
        document.getElementById('route-phone').checked = routes.phone;
        document.getElementById('route-npc').checked = routes.npc;
        document.getElementById('route-forum').checked = routes.forum;

        // 渲染列表
        renderAppEditors();
        renderWallpaperGrid();
        renderIconPresets();
        renderFontPresets();
        renderApiPresets();
        // 8. 加载自定义提示音
        const soundData = await idb.get('ios_theme_sound');
        if (soundData && soundData.url) {
            customNotificationSound = soundData.url;
            const input = document.getElementById('soundUrlInput');
            if(input) input.value = soundData.url.startsWith('data:') ? '已选择本地音频' : soundData.url;
        }
    } catch (e) {
        console.error("IndexedDB Load Error:", e);
    }
}

// --- 恢复桌面布局 ---
function restoreGridLayout(layout) {
    const grid = document.getElementById('homeGrid');
    const cells = Array.from(grid.children); 
    
    for (const [cellIndex, appId] of Object.entries(layout)) {
        const cell = cells.find(c => c.dataset.index == cellIndex);
        const app = document.getElementById(appId);
        
        if (cell && app) {
            cell.appendChild(app);
        }
    }
}

// --- 保存桌面布局 ---
async function saveGridLayout() {
    const layout = getCurrentGridLayout();
    await idb.set('ios_theme_layout', layout);
}

// --- 数据保存逻辑 ---
// --- 新版小组件保存逻辑 ---
async function saveNewWidgetData() {
    // 【修复】：增加安全检查，如果当前页面没有小组件元素，直接跳过保存，防止报错清空数据
    const label1El = document.getElementById('label1');
    if (!label1El) return; 

    const data = {
        label1: label1El.innerText,
        label2: document.getElementById('label2') ? document.getElementById('label2').innerText : '',
        // 【已删除 widgetSong 和 widgetLyric 的保存逻辑】
        bubble1: document.getElementById('bubble1') ? document.getElementById('bubble1').innerText : '',
        bubble2: document.getElementById('bubble2') ? document.getElementById('bubble2').innerText : '',
        bubble3: document.getElementById('bubble3') ? document.getElementById('bubble3').innerText : '',
        
        avatar1: document.getElementById('avatar1') ? document.getElementById('avatar1').style.backgroundImage.slice(5, -2).replace(/"/g, "") : '',
        avatar2: document.getElementById('avatar2') ? document.getElementById('avatar2').style.backgroundImage.slice(5, -2).replace(/"/g, "") : '',
        picture1: document.getElementById('picture1') ? document.getElementById('picture1').style.backgroundImage.slice(5, -2).replace(/"/g, "") : ''
    };
    await idb.set('ios_theme_widget', data);
}

// --- 新版小组件文字编辑逻辑 (弹窗输入，绝对有效) ---
function editNewWidgetText(elementId, title) {
    const el = document.getElementById(elementId);
    if (!el) return;
    openTextEditModal(title, "请输入新的文字内容", el.innerText, (val) => {
        if (val !== null && val.trim() !== "") {
            el.innerText = val;
            saveNewWidgetData();
        }
    });
}

// --- 新版小组件图片上传逻辑 ---
function handleNewWidgetUpload(input, targetId) {
    const file = input.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const target = document.getElementById(targetId);
            target.style.backgroundImage = `url('${e.target.result}')`;
            target.innerHTML = ''; // 清除占位文字
            saveNewWidgetData(); // 上传完自动保存
        };
        reader.readAsDataURL(file);
    }
    input.value = ''; // 清空 input
}

async function saveAppleData() {
    const data = {
        avatar: document.getElementById('appleIdAvatar').style.backgroundImage,
        name: document.getElementById('appleIdName').innerText
    };
    await idb.set('ios_theme_apple', data);
}

async function saveWorldbookData() {
    await idb.set('ios_theme_wb_entries', JSON.stringify(worldbookEntries));
    await idb.set('ios_theme_wb_groups', JSON.stringify(worldbookGroups));
}

async function saveThemeSettings() {
    const data = {
        wallpaper: document.getElementById('mainScreen').style.backgroundImage,
        fontSize: document.getElementById('fontSizeSlider').value,
        fontUrl: document.getElementById('fontUrlInput').value
    };
    await idb.set('ios_theme_settings', data);
}

async function saveAppsData() {
    const apps = [];
    for (let i = 0; i < totalApps; i++) {
        const iconElem = document.getElementById(`icon-${i}`);
        let bg = window.getComputedStyle(iconElem).backgroundImage;
        if (bg === 'none') bg = '';
        apps.push({
            id: i,
            name: document.getElementById(`name-${i}`).innerText,
            iconBg: bg
        });
    }
    await idb.set('ios_theme_apps', JSON.stringify(apps));
}

async function savePresetsData() {
    const data = {
        icons: iconPresets,
        fonts: fontPresets,
        wallpapers: wallpaperPresets,
        apis: apiPresets
    };
    await idb.set('ios_theme_presets', data);
}

// --- Apple ID 交互 ---
function openAppleIdSettings() { document.getElementById('appleIdSettingsModal').classList.add('open'); }
function closeAppleIdSettings() { document.getElementById('appleIdSettingsModal').classList.remove('open'); }

// --- 隐私与安全 交互 (新增) ---
function openPrivacySettings() {
    checkNewDay(); // 每次打开检查是否需要清零
    document.getElementById('privacySettingsModal').classList.add('open');
    updatePrivacyUI();
    requestMotionPermission();
    fetchLocation();
}

function closePrivacySettings() {
    document.getElementById('privacySettingsModal').classList.remove('open');
}

function updatePrivacyUI() {
    document.getElementById('privacyStepCount').innerText = `${privacyStepCount} 步`;
    const distance = (privacyStepCount * 0.7 / 1000).toFixed(2); // 假设每步 0.7 米
    document.getElementById('privacyDistance').innerText = `${distance} km`;
}

function requestMotionPermission() {
    if (isMotionListenerAdded) return;
    if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
        // iOS 13+ 需要用户点击触发授权
        DeviceMotionEvent.requestPermission()
            .then(permissionState => {
                if (permissionState === 'granted') {
                    window.addEventListener('devicemotion', handleMotion);
                    isMotionListenerAdded = true;
                } else {
                    alert("需要允许运动与健身权限才能记录步数");
                }
            })
            .catch(console.error);
    } else {
        // 安卓或旧版 iOS 直接监听
        window.addEventListener('devicemotion', handleMotion);
        isMotionListenerAdded = true;
    }
}

function handleMotion(event) {
    const acc = event.accelerationIncludingGravity;
    if (!acc) return;
    
    // 计算三轴加速度的矢量幅度 (重力约为 9.8)
    const magnitude = Math.sqrt(acc.x * acc.x + acc.y * acc.y + acc.z * acc.z);
    const curTime = Date.now();
    
    // 当幅度大于 11.5 (表示有明显的走动震动)，且距离上次计步超过 300ms (防抖)
    if (magnitude > 11.5 && (curTime - privacyLastMotionTime) > 300) {
        checkNewDay();
        privacyStepCount++;
        localStorage.setItem('ios_theme_steps', privacyStepCount);
        updatePrivacyUI();
        privacyLastMotionTime = curTime;
    }
}

// 新增全局变量用于存储地图实例
let privacyMapInstance = null;
let privacyMapMarker = null;

function fetchLocation() {
    const locEl = document.getElementById('privacyLocation');
    locEl.innerText = "高精度定位中...";
    
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(async (pos) => {
            const lat = pos.coords.latitude;
            const lon = pos.coords.longitude;
            try {
                // 使用 OpenStreetMap 获取中文高精度地址
                const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`, {
                    headers: { 'Accept-Language': 'zh-CN' }
                });
                const data = await res.json();
                
                // 提取精简的街道地址
                let address = data.display_name;
                if (data.address) {
                    const a = data.address;
                    address = `${a.city || a.town || a.province || ''} ${a.suburb || a.county || ''} ${a.road || ''}`.trim();
                    if (!address) address = data.display_name;
                }
                
                locEl.innerText = address || `${lat.toFixed(4)}, ${lon.toFixed(4)}`;

                // --- 修复：在这里真正渲染 Leaflet 地图 ---
                if (typeof L !== 'undefined') {
                    if (!privacyMapInstance) {
                        // 首次初始化地图
                        privacyMapInstance = L.map('privacyMap').setView([lat, lon], 16);
                        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                            attribution: '© OpenStreetMap'
                        }).addTo(privacyMapInstance);
                        privacyMapMarker = L.marker([lat, lon]).addTo(privacyMapInstance);
                    } else {
                        // 更新已有地图位置
                        privacyMapInstance.setView([lat, lon], 16);
                        privacyMapMarker.setLatLng([lat, lon]);
                    }
                    // 解决在隐藏弹窗中初始化导致地图显示不全的 Bug
                    setTimeout(() => { privacyMapInstance.invalidateSize(); }, 300);
                }

            } catch (e) {
                locEl.innerText = `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
            }
        }, (err) => {
            locEl.innerText = "定位失败或未授权";
        }, {
            enableHighAccuracy: true, // 开启高精度 GPS
            timeout: 10000,
            maximumAge: 0
        });
    } else {
        locEl.innerText = "设备不支持定位";
    }
}
// 存储分析弹窗逻辑
function openStorageAnalysis() { document.getElementById('storageModalOverlay').classList.add('active'); analyzeStorage(); }
function closeStorageModal() { document.getElementById('storageModalOverlay').classList.remove('active'); }

async function analyzeStorage() {
    const keys = {
        '世界书': ['ios_theme_wb_entries', 'ios_theme_wb_groups'],
        '图片/媒体': ['ios_theme_widget', 'ios_theme_apple', 'ios_theme_apps'],
        '预设库': ['ios_theme_presets'],
        '系统设置': ['ios_theme_settings', 'ios_theme_api_config', 'ios_theme_layout']
    };
    const colors = { '世界书': '#007aff', '图片/媒体': '#ff9500', '预设库': '#34c759', '系统设置': '#8e8e93' };
    let usage = {};
    let totalBytes = 0;

    for (let category in keys) {
        usage[category] = 0;
        for (let key of keys[category]) {
            const val = await idb.get(key);
            if (val) {
                const str = typeof val === 'string' ? val : JSON.stringify(val);
                usage[category] += str.length;
            }
        }
        totalBytes += usage[category];
    }

    const canvas = document.getElementById('storageChart');
    const ctx = canvas.getContext('2d');
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = 140;
    const lineWidth = 40;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';

    let startAngle = 0;
    if (totalBytes === 0) {
        ctx.beginPath(); ctx.strokeStyle = '#e5e5ea'; ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI); ctx.stroke();
    } else {
        for (let category in usage) {
            if (usage[category] > 0) {
                const sliceAngle = (usage[category] / totalBytes) * 2 * Math.PI;
                ctx.beginPath(); ctx.strokeStyle = colors[category]; ctx.arc(centerX, centerY, radius, startAngle, startAngle + sliceAngle); ctx.stroke();
                startAngle += sliceAngle;
            }
        }
    }

    const totalKB = (totalBytes / 1024).toFixed(2);
    document.getElementById('storageTotal').innerText = totalKB + ' KB';
    const legend = document.getElementById('storageLegend');
    legend.innerHTML = '';
    for (let category in usage) {
        const kb = (usage[category] / 1024).toFixed(2);
        const item = document.createElement('div');
        item.className = 'legend-item';
        item.innerHTML = `<div class="legend-color" style="background:${colors[category]}"></div><div class="legend-name">${category}</div><div class="legend-value">${kb} KB</div>`;
        legend.appendChild(item);
    }
}

// --- 仅导出桌面美化 (Theme Only) // --- 仅导出桌面美化 (Theme Only) ---
async function exportThemeOnly() {
    const data = {};
    const themeKeys = [
        'ios_theme_settings', // 壁纸、字体
        'ios_theme_widget',   // 小组件
        'ios_theme_apps',     // 图标布局
        'ios_theme_presets',  // 预设
        'ios_theme_apple',    // Apple ID 头像
        'ios_theme_layout'    // 桌面布局
    ];

    for (let key of themeKeys) {
        let val = await idb.get(key);
        // 【修复】：剔除 API 预设，防止泄露给别人
        if (key === 'ios_theme_presets' && val) {
            val = { ...val };
            delete val.apis;
        }
        data[key] = val;
    }

    const exportObj = { signature: 'ios_theme_studio_theme_only', timestamp: Date.now(), data: data };
    const blob = new Blob([JSON.stringify(exportObj)], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `theme_backup_${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
}

function importThemeOnly(input) {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const json = JSON.parse(e.target.result);
            if (json.signature !== 'ios_theme_studio_theme_only') {
                return alert("导入失败：这不是有效的桌面美化备份文件。");
            }
            
            if (confirm("这将覆盖当前的桌面壁纸、图标和小组件设置，确定要恢复吗？")) {
                const data = json.data;
                for (let key in data) {
                    // 【修复】：导入预设时，保留本地原有的 API 预设
                    if (key === 'ios_theme_presets') {
                        const localPresets = await idb.get('ios_theme_presets') || {};
                        const importedPresets = data[key] || {};
                        importedPresets.apis = localPresets.apis || [];
                        await idb.set(key, importedPresets);
                    } else {
                        await idb.set(key, data[key]);
                    }
                }
                alert("桌面美化恢复成功，页面将刷新。");
                location.reload();
            }
        } catch (err) { 
            console.error(err);
            alert("导入失败：文件损坏或处理错误。"); 
        }
    };
    reader.readAsText(file);
    input.value = '';
}    

// --- 全局备份 (包含 WeChat) ---
async function exportAllData() {
    try {
        const data = {};
        
        // 1. 导出 Theme Studio 数据
        const keys = await idb.getAllKeys();
        for (let key of keys) {
            if (key.startsWith('ios_theme_')) {
                data[key] = await idb.get(key);
            }
        }

        // 2. 导出 WeChat 数据
        const wechatData = {};
        if (wcDb.instance) {
            const persistentCharactersSnapshot = await wcReadCharactersPersistentSnapshot();
            const dbCharacters = await wcDb.getAll('characters');
            const charsUpdatedAt = await wcDb.get('kv_store', 'characters_updated_at');
            const shouldUseSnapshotCharacters = persistentCharactersSnapshot.characters.length > 0 && (
                !Array.isArray(dbCharacters) || dbCharacters.length === 0 ||
                persistentCharactersSnapshot.updatedAt >= (Number(charsUpdatedAt) || 0) ||
                persistentCharactersSnapshot.characters.length > dbCharacters.length
            );

            wechatData.user = await wcDb.get('kv_store', 'user');
            wechatData.wallet = await wcDb.get('kv_store', 'wallet');
            wechatData.stickerCategories = await wcDb.get('kv_store', 'sticker_categories');
            wechatData.cssPresets = await wcDb.get('kv_store', 'css_presets');
            wechatData.chatBgPresets = await wcDb.get('kv_store', 'chat_bg_presets');
            wechatData.phonePresets = await wcDb.get('kv_store', 'phone_presets');
            wechatData.shopData = await wcDb.get('kv_store', 'shop_data');
            wechatData.characters = shouldUseSnapshotCharacters ? persistentCharactersSnapshot.characters : (dbCharacters || []);
            wechatData.masks = await wcDb.getAll('masks');
            wechatData.moments = await wcDb.getAll('moments');
            
            const allChats = await wcDb.getAll('chats');
            const chatsObj = {};
            if (allChats) {
                allChats.forEach(item => {
                    chatsObj[item.charId] = item.messages;
                });
            }
            wechatData.chats = chatsObj;
        }
        
        data['wechat_backup'] = wechatData;

        // 3. 导出恋人空间数据
        data['ls_data'] = await idb.get('ls_data');

        // 4. 导出音乐数据 (APP3)
        data['ins_music_data'] = await idb.get('ins_music_data');

        // 5. 导出梦境数据
        data['dream_space_data'] = await idb.get('dream_space_data');
        // 6. 导出论坛数据
        data['ins_forum_data'] = await idb.get('ins_forum_data');

        const exportObj = { signature: 'ios_theme_studio_full_backup', timestamp: Date.now(), data: data };
        
        let jsonString;
        try {
            jsonString = JSON.stringify(exportObj);
        } catch (err) {
            throw new Error("数据量过大，请尝试清理部分聊天记录或图片后再备份。");
        }

        const blob = new Blob([jsonString], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `full_backup_${new Date().toISOString().slice(0,10)}.json`;
        document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
        
    } catch (error) {
        console.error("全局备份失败:", error);
        alert("全局备份失败: " + error.message);
    }
}

function importAllData(input) {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const json = JSON.parse(e.target.result);
            // 兼容旧版备份签名
            if (json.signature !== 'ios_theme_studio_backup' && json.signature !== 'ios_theme_studio_full_backup') {
                return alert("导入失败：文件格式不正确。");
            }
            
            if (confirm("这将覆盖当前所有数据（包括聊天记录、音乐歌单、梦境等），确定要恢复吗？")) {
                const data = json.data;
                
                // 1. 恢复 Theme Studio 数据
                for (let key in data) {
                    if (key !== 'wechat_backup' && key !== 'ls_data' && key !== 'ins_music_data' && key !== 'dream_space_data') {
                        await idb.set(key, data[key]);
                    }
                }

                // 2. 恢复 WeChat 数据 (如果存在)
                if (data['wechat_backup']) {
                    const wd = data['wechat_backup'];
                    const importedCharacters = Array.isArray(wd.characters) ? wd.characters : [];
                    const charactersUpdatedAt = Date.now();

                    if (wd.user) await wcDb.put('kv_store', wd.user, 'user');
                    if (wd.wallet) await wcDb.put('kv_store', wd.wallet, 'wallet');
                    if (wd.stickerCategories) await wcDb.put('kv_store', wd.stickerCategories, 'sticker_categories');
                    if (wd.cssPresets) await wcDb.put('kv_store', wd.cssPresets, 'css_presets');
                    if (wd.chatBgPresets) await wcDb.put('kv_store', wd.chatBgPresets, 'chat_bg_presets'); // 新增
                    if (wd.phonePresets) await wcDb.put('kv_store', wd.phonePresets, 'phone_presets'); // 新增
                    if (wd.shopData) await wcDb.put('kv_store', wd.shopData, 'shop_data'); // 新增购物数据
                    
                    // 清空旧表并写入新数据
                    const stores = ['characters', 'masks', 'moments', 'chats'];
                    for (const store of stores) {
                        await wcClearStore(store);
                    }

                    for (const c of importedCharacters) await wcDb.put('characters', c);
                    if (wd.masks) for (const m of wd.masks) await wcDb.put('masks', m);                 
                    if (wd.moments) for (const m of wd.moments) await wcDb.put('moments', m);
                    if (wd.chats) {
                        for (const charId in wd.chats) {
                            const parsedId = parseInt(charId);
                            if (!isNaN(parsedId)) {
                                await wcDb.put('chats', { charId: parsedId, messages: wd.chats[charId] }).catch(e => console.warn(e));
                            }
                        }
                    }

                    await wcSyncCharactersSnapshotFromList(importedCharacters, charactersUpdatedAt);
                }

                // 3. 恢复恋人空间数据
                if (data['ls_data']) {
                    await idb.set('ls_data', data['ls_data']);
                }

                // 4. 恢复音乐数据 (APP3)
                if (data['ins_music_data']) {
                    await idb.set('ins_music_data', data['ins_music_data']);
                }

                // 5. 恢复梦境数据
                if (data['dream_space_data']) {
                    await idb.set('dream_space_data', data['dream_space_data']);
                }
                // 6. 恢复论坛数据
                if (data['ins_forum_data']) {
                    await idb.set('ins_forum_data', data['ins_forum_data']);
                }

                alert("数据恢复成功，页面将刷新。");
                location.reload();
            }
        } catch (err) { 
            console.error(err);
            alert("导入失败：文件损坏或处理错误。"); 
        }
    };
    reader.readAsText(file);
    input.value = '';
}
// ==========================================
// 新增：清空所有数据逻辑 (极简 iOS 黑白高级感弹窗)
// ==========================================
function clearAllData() {
    // 1. 动态创建高级感黑白弹窗
    const existing = document.getElementById('ios-bw-confirm-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'ios-bw-confirm-overlay';
    Object.assign(overlay.style, {
        position: 'fixed', top: '0', left: '0', width: '100%', height: '100%',
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        backdropFilter: 'blur(5px)', WebkitBackdropFilter: 'blur(5px)',
        zIndex: '99999', display: 'flex', alignItems: 'center', justifyContent: 'center',
        opacity: '0', transition: 'opacity 0.25s ease'
    });

    const box = document.createElement('div');
    Object.assign(box.style, {
        width: '270px', backgroundColor: '#FFFFFF', borderRadius: '14px',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        transform: 'scale(0.95)', transition: 'transform 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
    });

    const contentWrap = document.createElement('div');
    Object.assign(contentWrap.style, { padding: '22px 16px', textAlign: 'center' });

    const titleEl = document.createElement('div');
    titleEl.innerText = '清空所有数据';
    Object.assign(titleEl.style, {
        fontSize: '17px', fontWeight: '600', color: '#000000', marginBottom: '8px',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Helvetica Neue", Helvetica, Arial, sans-serif'
    });

    const msgEl = document.createElement('div');
    msgEl.innerText = '此操作将永久销毁所有数据(宝宝你确定要清除所有数据吗)，且不可恢复。确定要继续吗？';
    Object.assign(msgEl.style, {
        fontSize: '13px', lineHeight: '1.4', color: '#333333',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Helvetica Neue", Helvetica, Arial, sans-serif'
    });

    contentWrap.appendChild(titleEl);
    contentWrap.appendChild(msgEl);

    const btnWrap = document.createElement('div');
    Object.assign(btnWrap.style, { display: 'flex', borderTop: '0.5px solid #E5E5EA', height: '44px' });

    const cancelBtn = document.createElement('div');
    cancelBtn.innerText = '取消';
    Object.assign(cancelBtn.style, {
        flex: '1', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '17px', color: '#8E8E93', borderRight: '0.5px solid #E5E5EA', cursor: 'pointer',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Helvetica Neue", Helvetica, Arial, sans-serif'
    });

    const confirmBtn = document.createElement('div');
    confirmBtn.innerText = '确认清空';
    Object.assign(confirmBtn.style, {
        flex: '1', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '17px', fontWeight: '600', color: '#000000', cursor: 'pointer',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Helvetica Neue", Helvetica, Arial, sans-serif'
    });

    btnWrap.appendChild(cancelBtn);
    btnWrap.appendChild(confirmBtn);
    box.appendChild(contentWrap);
    box.appendChild(btnWrap);
    overlay.appendChild(box);
    document.body.appendChild(overlay);

    // 触发动画
    requestAnimationFrame(() => {
        overlay.style.opacity = '1';
        box.style.transform = 'scale(1)';
    });

    // 2. 绑定事件
    const closePopup = () => {
        overlay.style.opacity = '0';
        box.style.transform = 'scale(0.95)';
        setTimeout(() => overlay.remove(), 250);
    };

    cancelBtn.onclick = closePopup;

    confirmBtn.onclick = async () => {
        closePopup();
        try {
            // 执行清空逻辑
            await idb.clear();
            if (typeof wcDb !== 'undefined' && wcDb.instance) {
                const stores = ['kv_store', 'characters', 'chats', 'moments', 'masks'];
                for (const store of stores) {
                    await wcClearStore(store);
                }
            }
            if (typeof wcClearCharactersPersistentSnapshot === 'function') {
                await wcClearCharactersPersistentSnapshot();
            }
            // 【V2修改点：保留新的激活状态】
            const isActivated = localStorage.getItem('ios_theme_activation_v2_fallback');
            localStorage.clear();
            if (isActivated) localStorage.setItem('ios_theme_activation_v2_fallback', isActivated);

            // 贯彻高级感：不弹原生 alert，直接让整个页面优雅淡出并刷新
            document.body.style.transition = 'opacity 0.6s ease';
            document.body.style.opacity = '0';
            setTimeout(() => { location.reload(); }, 600);

        } catch (error) {
            console.error("清空失败:", error);
            alert("清空失败: " + error.message);
        }
    };
}
function triggerWidgetBgUpload() { document.getElementById('widgetBgInput').click(); }
function handleWidgetBgUpload(input) {
    const file = input.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) { 
            document.getElementById('mainWidget').style.backgroundImage = `url('${e.target.result}')`; 
            saveWidgetData(); 
        };
        reader.readAsDataURL(file);
    }
}
function triggerAvatarUpload() { document.getElementById('widgetAvatarInput').click(); }
function handleWidgetAvatarUpload(input) {
    const file = input.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) { 
            const avatar = document.getElementById('widgetAvatar');
            avatar.style.backgroundImage = `url('${e.target.result}')`; 
            avatar.style.backgroundSize = 'cover';
            saveWidgetData(); 
        };
        reader.readAsDataURL(file);
    }
}
function editWidgetText() {
    openTextEditModal("编辑 ID", "请输入要显示的 ID", document.getElementById('widgetText').innerText, (val) => {
        if(val) {
            document.getElementById('widgetText').innerText = val;
            saveWidgetData(); 
        }
    });
}

// --- Apple ID 交互 ---
function triggerAppleAvatarUpload() { document.getElementById('appleAvatarInput').click(); }
function handleAppleAvatarUpload(input) {
    const file = input.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) { 
            const bg = `url('${e.target.result}')`;
            document.getElementById('appleIdAvatar').style.backgroundImage = bg; 
            document.getElementById('appleIdAvatar').innerText = ''; 
            document.getElementById('appleIdAvatar').style.backgroundSize = 'cover';
            document.getElementById('appleIdDetailAvatar').style.backgroundImage = bg;
            document.getElementById('appleIdDetailAvatar').innerText = '';
            document.getElementById('appleIdDetailAvatar').style.backgroundSize = 'cover';
            saveAppleData(); 
        };
        reader.readAsDataURL(file);
    }
}
function editAppleIdText() {
    const nameElem = document.getElementById('appleIdName');
    openTextEditModal("编辑 Apple ID", "请输入显示的名称", nameElem.innerText, (val) => {
        if(val) {
            nameElem.innerText = val;
            document.getElementById('appleIdDetailName').innerText = val;
            saveAppleData(); 
        }
    });
}

// --- 恢复默认 ---
function resetWallpaper() {
    document.getElementById('mainScreen').style.backgroundImage = '';
    document.getElementById('bgUrlInput').value = '';
    saveThemeSettings(); 
}
function resetIcons() {
    const defaultNames = ['App 1', 'App 2', 'App 3', 'App 4', 'Theme', 'Settings', '世界书'];
    for (let i = 0; i < totalApps; i++) {
        const iconDiv = document.getElementById(`icon-${i}`);
        const nameDiv = document.getElementById(`name-${i}`);
        iconDiv.style.backgroundImage = '';
        iconDiv.style.backgroundColor = '#f0f0f0';
        nameDiv.innerText = defaultNames[i];
    }
    renderAppEditors();
    saveAppsData(); 
}
function resetFonts() {
    document.getElementById('dynamic-font-style').textContent = '';
    changeFontSize(11);
    document.getElementById('fontSizeSlider').value = 11;
    document.getElementById('fontUrlInput').value = '';
    saveThemeSettings(); 
}

// --- 网格与拖拽 ---
function initGrid() {
    const grid = document.getElementById('homeGrid');
    if (!grid) return; 

    for (let i = 12; i < 28; i++) {
        const cell = document.createElement('div');
        cell.className = 'grid-cell';
        cell.dataset.index = i;
        grid.appendChild(cell);
    }
    // 👇 核心修改：注入顶级质感【负空间实心】SVG 图标
    const appsData = [
        // Chat: 实心气泡 + 内部镂空省略号
        { id: 'app-0', iconId: 'icon-0', nameId: 'name-0', name: 'Chat', svg: '<svg class="default-icon-svg" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 5.92 2 10.75c0 2.7 1.56 5.08 3.96 6.54L4.5 22l4.66-2.33A11.1 11.1 0 0 0 12 19.5c5.52 0 10-3.92 10-8.75S17.52 2 12 2zm-3 9.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm3 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm3 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z"/></svg>' },
        // Space: 实心爱心 + 内部镂空闪耀星光
        { id: 'app-1', iconId: 'icon-1', nameId: 'name-1', name: 'Space', svg: '<svg class="default-icon-svg" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/><path fill="#FFF" d="M16 5l1 2 2 1-2 1-1 2-1-2-2-1 2-1z"/></svg>' },
        // Music: 实心黑胶唱片 + 内部精细镂空
        { id: 'app-2', iconId: 'icon-2', nameId: 'name-2', name: 'Music', svg: '<svg class="default-icon-svg" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 14.5c-2.49 0-4.5-2.01-4.5-4.5S9.51 7.5 12 7.5s4.5 2.01 4.5 4.5-2.01 4.5-4.5 4.5z"/><circle cx="12" cy="12" r="1.5" fill="#FFF"/></svg>' },
        // Forum: 实心星球/社区 + 内部镂空纹理
        { id: 'app-3', iconId: 'icon-3', nameId: 'name-3', name: 'Forum', svg: '<svg class="default-icon-svg" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>' }
    ];
    const cells = Array.from(grid.children).slice(1); 
    appsData.forEach((data, index) => {
        if (cells[index]) {
            const appDiv = document.createElement('div');
            appDiv.className = 'app-item';
            appDiv.id = data.id;
            // 👇 核心修改：把 data.svg 塞进 app-icon 里面
            appDiv.innerHTML = `<div class="app-icon" id="${data.iconId}">${data.svg}</div><div class="app-name" id="${data.nameId}">${data.name}</div>`;
            addDragListeners(appDiv);
            
            // App 点击事件 (受编辑模式控制)
                        // App 点击事件 (受编辑模式控制)
            appDiv.addEventListener('click', (e) => {
                if (isHomeEditMode || isDragging) {
                    e.preventDefault();
                    e.stopPropagation();
                    return;
                }
                if (data.id === 'app-0') openWechat();
                if (data.id === 'app-1') openLoversSpace();
                if (data.id === 'app-2') openMusicApp(); 
                if (data.id === 'app-3') openForumApp(); // <--- 加上这一行！
            });

                        cells[index].appendChild(appDiv);
        }
    });
}

function addDragListeners(el) {
    el.addEventListener('touchstart', handleDragStart, { passive: false });
    el.addEventListener('touchmove', handleDragMove, { passive: false });
    el.addEventListener('touchend', handleDragEnd);
    el.addEventListener('mousedown', handleDragStart);
}

// --- 桌面编辑模式逻辑 (Home Screen Edit Mode) ---
function enterHomeEditMode() {
    isHomeEditMode = true;
    document.body.classList.add('edit-mode-active');
    document.getElementById('home-edit-bar').style.display = 'flex';
    
    // 备份当前布局和位置，以便取消时恢复
    backupGridLayout = getCurrentGridLayout();
    backupWidgetPosition = { ...lsState.widgetData.position };
    
    if (navigator.vibrate) navigator.vibrate(50);
}

function saveHomeEdit() {
    isHomeEditMode = false;
    document.body.classList.remove('edit-mode-active');
    document.getElementById('home-edit-bar').style.display = 'none';
    
    // 保存网格布局
    saveGridLayout();
    // 小组件位置在拖拽结束时已更新到 lsState，这里统一保存
    lsSaveData();
}

function cancelHomeEdit() {
    isHomeEditMode = false;
    document.body.classList.remove('edit-mode-active');
    document.getElementById('home-edit-bar').style.display = 'none';
    
    // 恢复网格布局
    restoreGridLayout(backupGridLayout);
    
    // 恢复小组件位置
    lsState.widgetData.position = backupWidgetPosition;
    lsRenderWidget();
}

function getCurrentGridLayout() {
    const grid = document.getElementById('homeGrid');
    const cells = grid.querySelectorAll('.grid-cell');
    const layout = {};
    cells.forEach(cell => {
        const app = cell.querySelector('.app-item');
        if (app) layout[cell.dataset.index] = app.id;
    });
    return layout;
}

function handleDragStart(e) {
    if (e.target.closest('.settings-modal')) return;
    const touch = e.touches ? e.touches[0] : e;
    dragStartX = touch.clientX;
    dragStartY = touch.clientY;
    const targetApp = e.currentTarget;

    if (!isHomeEditMode) {
        // 非编辑模式下，长按进入编辑模式
        longPressTimer = setTimeout(() => {
            enterHomeEditMode();
        }, 500);
    } else {
        // 编辑模式下，按下即开始拖拽
        isDragging = true;
        dragItem = targetApp;
        dragGhost = targetApp.cloneNode(true);
        dragGhost.classList.add('app-ghost');
        document.body.appendChild(dragGhost);
        updateGhostPosition(touch.clientX, touch.clientY);
        targetApp.classList.add('dragging');
        if (navigator.vibrate) navigator.vibrate(50);
    }
}

function handleDragMove(e) {
    const touch = e.touches ? e.touches[0] : e;
    
    if (!isHomeEditMode && !isDragging) {
        // 如果还没进入编辑模式，且移动距离过大，取消长按判定
        const moveX = Math.abs(touch.clientX - dragStartX);
        const moveY = Math.abs(touch.clientY - dragStartY);
        if (moveX > 10 || moveY > 10) {
            if (longPressTimer) {
                clearTimeout(longPressTimer);
                longPressTimer = null;
            }
        }
    } else if (isDragging) {
        if (e.cancelable) { e.preventDefault(); }
        updateGhostPosition(touch.clientX, touch.clientY);
    }
}

function handleDragEnd(e) {
    if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
    }
    
    if (isDragging && dragItem) {
        const touch = e.changedTouches ? e.changedTouches[0] : e;
        dragGhost.style.display = 'none';
        const elemBelow = document.elementFromPoint(touch.clientX, touch.clientY);
        const targetCell = elemBelow ? elemBelow.closest('.grid-cell') : null;
        
        if (targetCell && !targetCell.classList.contains('widget-item')) {
            const existingApp = targetCell.querySelector('.app-item');
            const originalCell = dragItem.parentElement;
            if (existingApp && existingApp !== dragItem) {
                originalCell.appendChild(existingApp);
                targetCell.appendChild(dragItem);
            } else {
                targetCell.appendChild(dragItem);
            }
            // 注意：这里不再立即保存，而是等点击“完成”时统一保存
        }
        
        dragItem.classList.remove('dragging');
        if (dragGhost) dragGhost.remove();
        dragGhost = null;
        dragItem = null;
        setTimeout(() => { isDragging = false; }, 50);
    }
    
    document.removeEventListener('mousemove', handleDragMove);
    document.removeEventListener('mouseup', handleDragEnd);
}

document.addEventListener('mousedown', function(e) {
    if(e.target.closest('.app-item')) {
        document.addEventListener('mousemove', handleDragMove);
        document.addEventListener('mouseup', handleDragEnd);
    }
});

function updateGhostPosition(x, y) {
    if (dragGhost) {
        dragGhost.style.left = (x - 35) + 'px';
        dragGhost.style.top = (y - 35) + 'px';
    }
}

// --- 界面交互 ---
function switchTab(tabName, element) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-item').forEach(el => el.classList.remove('active'));
    document.getElementById('tab-' + tabName).classList.add('active');
    element.classList.add('active');
    const titles = { 'wallpaper': '壁纸设置', 'icons': '图标与名称', 'fonts': '字体设置' };
    document.getElementById('headerTitle').innerText = titles[tabName];
}

function openSettings() {
    renderAppEditors();
    document.getElementById('settingsModal').classList.add('open');
}
function closeSettings() { document.getElementById('settingsModal').classList.remove('open'); }
function openIOSSettings() { document.getElementById('iosSettingsModal').classList.add('open'); }
function closeIOSSettings() { document.getElementById('iosSettingsModal').classList.remove('open'); }
function openApiSettings() { document.getElementById('apiSettingsModal').classList.add('open'); }
function closeApiSettings() { document.getElementById('apiSettingsModal').classList.remove('open'); }

// --- 世界书逻辑 ---
function openWorldbook() {
    switchWorldbookView('all'); 
    document.getElementById('worldbookModal').classList.add('open');
}
function closeWorldbook() { document.getElementById('worldbookModal').classList.remove('open'); }

function switchWorldbookView(view) {
    const container = document.getElementById('wbViewContainer');
    const tabAll = document.getElementById('tab-wb-all');
    const tabGroup = document.getElementById('tab-wb-group');
    const title = document.getElementById('wbHeaderTitle');
    const rightBtnContainer = document.getElementById('wbHeaderRightContainer');

    if (view === 'all') {
        container.style.transform = 'translateX(0)';
        tabAll.classList.add('active');
        tabGroup.classList.remove('active');
        title.innerText = "所有条目";
        if(rightBtnContainer) rightBtnContainer.innerHTML = `<button class="nav-btn" onclick="openWorldbookEditor()"><svg class="svg-icon" viewBox="0 0 24 24"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg></button>`;
        renderWorldbookList();
    } else {
        container.style.transform = 'translateX(-50%)'; 
        tabAll.classList.remove('active');
        tabGroup.classList.add('active');
        title.innerText = "分组视图";
        if(rightBtnContainer) rightBtnContainer.innerHTML = `<button class="nav-btn" onclick="addNewGroup()" style="font-size: 15px; font-weight: 600;">创建分组</button>`;
        renderGroupView();
    }
}

function renderWorldbookList() {
    const container = document.getElementById('worldbookList');
    container.innerHTML = '';
    if (worldbookEntries.length === 0) {
        container.innerHTML = '<div style="padding: 20px; text-align: center; color: #999;">暂无条目，点击右上角添加</div>';
        return;
    }
    const sortedEntries = [...worldbookEntries].sort((a, b) => a.title.localeCompare(b.title));
    sortedEntries.forEach(entry => {
        container.appendChild(createEntryElement(entry));
    });
}

function renderGroupView() {
    const container = document.getElementById('worldbookGroupList');
    container.innerHTML = '';
    
    // 隐藏旧的底部添加按钮
    const oldAddBtn = document.querySelector('.wb-add-group-btn');
    if(oldAddBtn) oldAddBtn.style.display = 'none';

    if (worldbookGroups.length === 0) {
        container.innerHTML = '<div style="padding: 20px; text-align: center; color: #999;">暂无分组，请点击右上角创建</div>';
        return;
    }

    const wrapper = document.createElement('div');
    wrapper.className = 'ins-group-container';

    // 韩系/日系低饱和度日记本颜色库
    const notebookColors = [
        { bg: '#FDFBF7', text: '#4A413E', border: '#EAEAEA' }, // 奶白
        { bg: '#F4E8E8', text: '#5D4A45', border: '#EADCDC' }, // 灰粉
        { bg: '#E8EEF2', text: '#4A5568', border: '#DCE4EA' }, // 雾霾蓝
        { bg: '#E6EBE0', text: '#4A554A', border: '#DCE0D6' }, // 鼠尾草绿
        { bg: '#F0EBE1', text: '#5D534A', border: '#E6DFD3' }, // 奶茶
        { bg: '#EBE6F0', text: '#4A415D', border: '#DFD8E6' }  // 浅紫
    ];

    worldbookGroups.forEach((group, index) => {
        const groupEntries = worldbookEntries.filter(e => e.type === group);
        
        // 顺序循环获取颜色
        const colorTheme = notebookColors[index % notebookColors.length];

        const card = document.createElement('div');
        card.className = 'ins-group-card';
        card.style.backgroundColor = colorTheme.bg;
        card.style.borderColor = colorTheme.border;
        card.onclick = () => openGroupDetailModal(group);

        card.innerHTML = `
            <div class="ins-notebook-binding"></div>
            <div class="ins-notebook-label" style="background: ${colorTheme.text};"></div>
            <div class="ins-group-title" style="color: ${colorTheme.text}">${group}</div>
            <div class="ins-group-count" style="color: ${colorTheme.text}; opacity: 0.6;">${groupEntries.length} entries</div>
            <div class="ins-group-delete" onclick="event.stopPropagation(); deleteGroup('${group}')">
                <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </div>
        `;
        
        wrapper.appendChild(card);
    });

    container.appendChild(wrapper);
} // 👈 宝宝，就是少了这个大括号导致报错！
    // --- 补回丢失的分组详情弹窗逻辑 ---
// --- 日记本目录分页全局变量 ---
let currentNotebookEntries = [];
let currentNotebookPage = 1;
const NOTEBOOK_ITEMS_PER_PAGE = 9; // 每页显示9条，刚好贴合横线

function openGroupDetailModal(groupName) {
    document.getElementById('wbGroupDetailTitle').innerText = groupName;
    
    // 获取该分组下的所有条目
    currentNotebookEntries = worldbookEntries.filter(e => e.type === groupName);
    currentNotebookPage = 1; // 重置为第一页
    
    renderNotebookPage(currentNotebookPage);
    
    // 显示弹窗
    const modal = document.getElementById('worldbookGroupDetailModal');
    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('active'), 10);
}

function closeGroupDetailModal() {
    const modal = document.getElementById('worldbookGroupDetailModal');
    modal.classList.remove('active');
    setTimeout(() => modal.style.display = 'none', 300);
    renderGroupView(); // 关闭时刷新一下背后的贴纸视图
}

function renderNotebookPage(page) {
    const list = document.getElementById('wbGroupDetailList');
    list.innerHTML = ''; 
    
    // 强制重绘以触发 CSS 动画
    void list.offsetWidth;

    if (currentNotebookEntries.length === 0) {
        list.innerHTML = '<div style="text-align: center; color: #999; padding-top: 50px; font-style: italic;">该分组下暂无条目</div>';
        document.getElementById('notebook-page-info').innerText = `Page 1 / 1`;
        document.getElementById('notebook-prev-btn').disabled = true;
        document.getElementById('notebook-next-btn').disabled = true;
        return;
    }

    const totalPages = Math.ceil(currentNotebookEntries.length / NOTEBOOK_ITEMS_PER_PAGE);
    const start = (page - 1) * NOTEBOOK_ITEMS_PER_PAGE;
    const end = start + NOTEBOOK_ITEMS_PER_PAGE;
    const pageItems = currentNotebookEntries.slice(start, end);

    pageItems.forEach(entry => {
        const div = document.createElement('div');
        div.className = 'toc-item';
        div.onclick = () => {
            closeGroupDetailModal(); // 点击后先关闭目录
            setTimeout(() => openWorldbookEditor(entry.id), 300); // 等待动画结束后打开编辑器
        };
        div.innerHTML = `
            <div class="toc-title">${entry.title}</div>
            <div class="toc-dots"></div>
            <div class="toc-action">Edit</div>
        `;
        list.appendChild(div);
    });

    // 更新翻页器状态
    document.getElementById('notebook-page-info').innerText = `Page ${page} / ${totalPages}`;
    document.getElementById('notebook-prev-btn').disabled = page === 1;
    document.getElementById('notebook-next-btn').disabled = page === totalPages;
}

function changeNotebookPage(dir) {
    const totalPages = Math.ceil(currentNotebookEntries.length / NOTEBOOK_ITEMS_PER_PAGE);
    currentNotebookPage += dir;
    if (currentNotebookPage < 1) currentNotebookPage = 1;
    if (currentNotebookPage > totalPages) currentNotebookPage = totalPages;
    renderNotebookPage(currentNotebookPage);
}


// (保险起见，如果你连删除分组的函数也误删了，把下面这个也带上)
function deleteGroup(groupName) {
    if (confirm(`确定要删除分组 "${groupName}" 吗？\n该分组下的所有条目也将被删除！`)) {
        worldbookGroups = worldbookGroups.filter(g => g !== groupName);
        worldbookEntries = worldbookEntries.filter(e => e.type !== groupName);
        saveWorldbookData();
        renderGroupView();
    } else {
        const items = document.querySelectorAll('.wb-swipe-box');
        items.forEach(el => el.style.transform = 'translateX(0)');
    }
}

function editWorldbookGroup(oldName) {
    if (oldName === 'Default') return alert("默认分组不可重命名");
    const newName = prompt("重命名分组", oldName);
    if (newName && newName.trim() !== "" && newName !== oldName) {
        if (worldbookGroups.includes(newName)) return alert("分组名已存在");
        const idx = worldbookGroups.indexOf(oldName);
        if (idx !== -1) worldbookGroups[idx] = newName;
        worldbookEntries.forEach(e => {
            if (e.type === oldName) e.type = newName;
        });
        saveWorldbookData();
        renderGroupView();
    }
}

function deleteGroup(groupName) {
    if (confirm(`确定要删除分组 "${groupName}" 吗？\n该分组下的所有条目也将被删除！`)) {
        worldbookGroups = worldbookGroups.filter(g => g !== groupName);
        worldbookEntries = worldbookEntries.filter(e => e.type !== groupName);
        saveWorldbookData();
        renderGroupView();
    } else {
        const items = document.querySelectorAll('.wb-swipe-box');
        items.forEach(el => el.style.transform = 'translateX(0)');
    }
}

function createEntryElement(entry) {
    const wrapper = document.createElement('div');
    wrapper.className = 'wb-list-item-wrapper';
    const swipeBox = document.createElement('div');
    swipeBox.className = 'wb-swipe-box';
    const content = document.createElement('div');
    content.className = 'wb-list-item';
    content.onclick = () => openWorldbookEditor(entry.id);
    content.innerHTML = `<div class="wb-item-info"><div class="wb-item-title">${entry.title} <span class="wb-item-type">${entry.type}</span></div><div class="wb-item-desc">${entry.desc}</div></div>`;
    const deleteBtn = document.createElement('div');
    deleteBtn.className = 'wb-delete-btn';
    deleteBtn.innerText = '删除';
    deleteBtn.onclick = (e) => { e.stopPropagation(); deleteWorldbookEntry(entry.id); };

    swipeBox.appendChild(content);
    swipeBox.appendChild(deleteBtn);
    wrapper.appendChild(swipeBox);
    
    addSwipeLogic(swipeBox);
    
    return wrapper;
}

function addSwipeLogic(element) {
    let startX, currentX;
    element.addEventListener('touchstart', (e) => {
        startX = e.touches[0].clientX;
    }, {passive: true});

    element.addEventListener('touchmove', (e) => {
        currentX = e.touches[0].clientX;
        const diff = currentX - startX;
        if (diff < 0 && diff > -100) {
            element.style.transform = `translateX(${diff}px)`;
        }
    }, {passive: true});

    element.addEventListener('touchend', (e) => {
        const diff = currentX - startX;
        if (diff < -40) {
            element.style.transform = 'translateX(-80px)'; 
        } else {
            element.style.transform = 'translateX(0)';
        }
        startX = null;
        currentX = null;
    });
    
    document.addEventListener('touchstart', (e) => {
        if (!element.contains(e.target)) {
            element.style.transform = 'translateX(0)';
        }
    }, {passive: true});
}

function openWorldbookEditor(id = null) {
    currentEditingId = id;
    const modal = document.getElementById('worldbookEditorModal');
    const titleInput = document.getElementById('wbTitleInput');
    const typeInput = document.getElementById('wbTypeInput');
    const keyInput = document.getElementById('wbKeyInput');
    const descInput = document.getElementById('wbDescInput');

    typeInput.innerHTML = '';
    if (worldbookGroups.length === 0) worldbookGroups = ['Default'];
    worldbookGroups.forEach(g => {
        const opt = document.createElement('option');
        opt.value = g;
        opt.innerText = g;
        typeInput.appendChild(opt);
    });
    const newOpt = document.createElement('option');
    newOpt.value = '__NEW__';
    newOpt.innerText = '+ 新建分组...';
    typeInput.appendChild(newOpt);

    typeInput.onchange = () => {
        if (typeInput.value === '__NEW__') {
            const newGroup = prompt("请输入新分组名称");
            if (newGroup) {
                if (!worldbookGroups.includes(newGroup)) {
                    worldbookGroups.push(newGroup);
                    const opt = document.createElement('option');
                    opt.value = newGroup;
                    opt.innerText = newGroup;
                    typeInput.insertBefore(opt, newOpt);
                }
                typeInput.value = newGroup;
            } else {
                typeInput.value = worldbookGroups[0];
            }
        }
    };

    if (id) {
        const entry = worldbookEntries.find(e => e.id === id);
        if (entry) {
            document.getElementById('wbEditorTitle').innerText = "编辑条目";
            titleInput.value = entry.title;
            typeInput.value = entry.type;
            keyInput.value = entry.keys;
            descInput.value = entry.desc;
        }
    } else {
        document.getElementById('wbEditorTitle').innerText = "新建条目";
        titleInput.value = '';
        typeInput.value = worldbookGroups[0];
        keyInput.value = '';
        descInput.value = '';
    }
    modal.classList.add('open');
}

function closeWorldbookEditor() { document.getElementById('worldbookEditorModal').classList.remove('open'); }

function saveWorldbookEntry() {
    const title = document.getElementById('wbTitleInput').value;
    let type = document.getElementById('wbTypeInput').value;
    const keys = document.getElementById('wbKeyInput').value;
    const desc = document.getElementById('wbDescInput').value;

    if (!title) { alert("请输入条目名称"); return; }
    if (worldbookGroups.length === 0) { type = "Default"; worldbookGroups.push("Default"); }

    if (currentEditingId) {
        const index = worldbookEntries.findIndex(e => e.id === currentEditingId);
        if (index !== -1) {
            worldbookEntries[index] = { id: currentEditingId, title, type, keys, desc };
        }
    } else {
        const newId = Date.now();
        worldbookEntries.push({ id: newId, title, type, keys, desc });
    }
    saveWorldbookData();
    
    // 修复：加入 150ms 延迟，防止点击穿透导致误触列表项
    setTimeout(() => {
        closeWorldbookEditor();
        if (document.getElementById('tab-wb-all').classList.contains('active')) {
            renderWorldbookList();
        } else {
            renderGroupView();
        }
        
        // 如果分组详情弹窗开着，同步刷新它
        const detailModal = document.getElementById('worldbookGroupDetailModal');
        if (detailModal && detailModal.classList.contains('active')) {
            const currentGroup = document.getElementById('wbGroupDetailTitle').innerText;
            openGroupDetailModal(currentGroup);
        }
    }, 150);
}

function deleteWorldbookEntry(id) {
    if (confirm("确定要删除这个条目吗？")) {
        worldbookEntries = worldbookEntries.filter(e => e.id !== id);
        saveWorldbookData();
        if (document.getElementById('tab-wb-all').classList.contains('active')) {
            renderWorldbookList();
        } else {
            renderGroupView();
        }
        
        // 如果分组详情弹窗开着，同步刷新它
        const detailModal = document.getElementById('worldbookGroupDetailModal');
        if (detailModal && detailModal.classList.contains('active')) {
            const currentGroup = document.getElementById('wbGroupDetailTitle').innerText;
            openGroupDetailModal(currentGroup);
        }
    } else {
        const items = document.querySelectorAll('.wb-swipe-box');
        items.forEach(el => el.style.transform = 'translateX(0)');
    }
}
function addNewGroup() {
    openTextEditModal("创建分组", "请输入新分组名称", "", (name) => {
        if (name && name.trim() !== "") {
            const trimmedName = name.trim();
            if (!worldbookGroups.includes(trimmedName)) {
                worldbookGroups.push(trimmedName);
                saveWorldbookData();
                renderGroupView();
            } else {
                alert("该分组名称已存在！");
            }
        }
    });
}

function filterWorldbook(keyword) {
    if (!keyword) {
        renderWorldbookList();
        return;
    }
    const lower = keyword.toLowerCase();
    const filtered = worldbookEntries.filter(e => 
        e.title.toLowerCase().includes(lower) || 
        e.keys.toLowerCase().includes(lower) ||
        e.desc.toLowerCase().includes(lower)
    );
    const container = document.getElementById('worldbookList');
    container.innerHTML = '';
    filtered.forEach(entry => container.appendChild(createEntryElement(entry)));
}

// --- API 设置逻辑 (主副双路 + 额度查询) ---
let currentApiTab = 'primary'; // 记录当前在哪个 Tab

function switchApiTab(tab) {
    currentApiTab = tab;
    document.getElementById('tab-btn-primary').classList.remove('active');
    document.getElementById('tab-btn-secondary').classList.remove('active');
    document.getElementById('api-tab-primary').classList.remove('active');
    document.getElementById('api-tab-secondary').classList.remove('active');

    document.getElementById('tab-btn-' + tab).classList.add('active');
    document.getElementById('api-tab-' + tab).classList.add('active');
    
    // 切换 Tab 时自动刷新一次额度
    refreshCurrentApiQuota();
}

// 核心：获取当前场景应该使用的 API 配置
async function getActiveApiConfig(scene = 'chat') {
    const fullConfig = await idb.get('ios_theme_api_config') || {};
    const primary = fullConfig.primary || { baseUrl: fullConfig.baseUrl, key: fullConfig.key, model: fullConfig.model, temp: fullConfig.temp }; // 兼容旧数据
    const secondary = fullConfig.secondary || {};
    const routes = fullConfig.routes || {};

    let useSecondary = false;
    if (scene === 'phone' && routes.phone) useSecondary = true;
    if (scene === 'npc' && routes.npc) useSecondary = true;
    if (scene === 'forum' && routes.forum) useSecondary = true;

    // 如果该场景开启了副 API，且副 API 填了地址和 Key，就用副 API，否则降级用主 API
    if (useSecondary && secondary.key && secondary.baseUrl) {
        return secondary;
    }
    return primary;
}

async function saveApiConfig() {
    const config = {
        primary: {
            baseUrl: document.getElementById('apiBaseUrl').value,
            key: document.getElementById('apiKey').value,
            temp: document.getElementById('tempSlider').value,
            model: document.getElementById('modelSelect').value
        },
        secondary: {
            baseUrl: document.getElementById('secApiBaseUrl').value,
            key: document.getElementById('secApiKey').value,
            temp: document.getElementById('secTempSlider').value,
            model: document.getElementById('secModelSelect').value
        },
        routes: {
            phone: document.getElementById('route-phone').checked,
            npc: document.getElementById('route-npc').checked,
            forum: document.getElementById('route-forum').checked
        }
    };
    await idb.set('ios_theme_api_config', config);
    alert("API 配置已保存！");
}

async function fetchModels(targetTab) {
    const isPrimary = targetTab === 'primary';
    const baseUrl = isPrimary ? document.getElementById('apiBaseUrl').value : document.getElementById('secApiBaseUrl').value;
    const key = isPrimary ? document.getElementById('apiKey').value : document.getElementById('secApiKey').value;
    const selectId = isPrimary ? 'modelSelect' : 'secModelSelect';
    const btnId = isPrimary ? 'fetchBtnPrimary' : 'fetchBtnSecondary';
    
    if (!baseUrl || !key) return alert("请先填写 API 地址和密钥");
    
    const btn = document.getElementById(btnId);
    btn.innerText = "拉取中...";
    
    try {
        const res = await fetch(`${baseUrl}/models`, {
            headers: { 'Authorization': `Bearer ${key}` }
        });
        const data = await res.json();
        const select = document.getElementById(selectId);
        select.innerHTML = '';
        
        if (data.data && Array.isArray(data.data)) {
            data.data.forEach(m => {
                const opt = document.createElement('option');
                opt.value = m.id;
                opt.innerText = m.id;
                select.appendChild(opt);
            });
            alert(`成功拉取 ${data.data.length} 个模型`);
        } else {
            alert("拉取失败：格式不正确");
        }
    } catch (e) {
        alert("拉取失败：" + e.message);
    } finally {
        btn.innerText = "拉取模型列表";
    }
}

// 实时查询当前选中 Tab 的 API 额度
async function refreshCurrentApiQuota() {
    const quotaEl = document.getElementById('api-realtime-quota');
    if (!quotaEl) return;
    
    quotaEl.innerText = "查询中...";
    quotaEl.style.opacity = "0.5";

    try {
        const isPrimary = currentApiTab === 'primary';
        const baseUrl = isPrimary ? document.getElementById('apiBaseUrl').value : document.getElementById('secApiBaseUrl').value;
        const key = isPrimary ? document.getElementById('apiKey').value : document.getElementById('secApiKey').value;

        if (!key || !baseUrl) {
            throw new Error("未配置API");
        }

        const baseUrlMatch = baseUrl.match(/^(https?:\/\/[^\/]+)/);
        const host = baseUrlMatch ? baseUrlMatch[1] : baseUrl;

        const response = await fetch(`${host}/v1/dashboard/billing/subscription`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${key}` }
        });

        if (!response.ok) throw new Error("接口不支持");

        const data = await response.json();
        let finalBalance = "未知";
        
        let rawValue = data.balance ?? data.remain_quota ?? data.total_available ?? data.quota;
        if (data.data) {
            rawValue = rawValue ?? data.data.balance ?? data.data.remain_quota ?? data.data.quota;
        }

        if (rawValue !== undefined && rawValue !== null) {
            let num = parseFloat(rawValue);
            if (num > 10000) {
                let calc50 = (num / 500000).toFixed(2);
                let calc10 = (num / 100000).toFixed(2);
                finalBalance = `${calc50} 或 ${calc10} (原数据:${num})`;
            } else {
                finalBalance = num.toFixed(2);
            }
        } else if (data.hard_limit_usd !== undefined) {
            let total_usage = 0;
            if (data.total_usage !== undefined) {
                total_usage = data.total_usage / 100;
            } else {
                try {
                    const now = new Date();
                    const startDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
                    const endDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
                    const usageRes = await fetch(`${host}/v1/dashboard/billing/usage?start_date=${startDate}&end_date=${endDate}`, {
                        headers: { 'Authorization': `Bearer ${key}` }
                    });
                    const usageData = await usageRes.json();
                    if (usageData.total_usage !== undefined) total_usage = usageData.total_usage / 100;
                } catch(e) {}
            }
            
            // 🌟 核心修改：如果是无限额度令牌，直接显示已消耗的金额！
            if (data.hard_limit_usd > 9000000) {
                finalBalance = `已用: $${total_usage.toFixed(4)} (无限额度令牌)`;
            } else {
                finalBalance = (data.hard_limit_usd - total_usage).toFixed(2);
            }
        }

        if (finalBalance !== "未知") {
            quotaEl.innerText = finalBalance;
            quotaEl.style.fontSize = "12px"; 
        } else {
            quotaEl.innerText = "格式不支持";
        }
    } catch (e) {
        quotaEl.innerText = "接口不支持";
    } finally {
        quotaEl.style.opacity = "1";
    }
}

function renderApiPresets() {
    const list = document.getElementById('apiPresetList');
    list.innerHTML = '';
    if (apiPresets.length === 0) {
        list.innerHTML = '<div style="color:#999; font-size:13px; padding:5px;">暂无预设</div>';
        return;
    }
    apiPresets.forEach((p, idx) => {
        const tag = document.createElement('div');
        tag.className = 'preset-tag';
        tag.innerHTML = `<span class="preset-name" onclick="applyApiPreset(${idx})">${p.name}</span><span class="preset-delete" onclick="deletePreset('api', ${idx})">×</span>`;
        list.appendChild(tag);
    });
}

function applyApiPreset(idx) {
    const p = apiPresets[idx];
    if (p) {
        const isPrimary = currentApiTab === 'primary';
        const urlId = isPrimary ? 'apiBaseUrl' : 'secApiBaseUrl';
        const keyId = isPrimary ? 'apiKey' : 'secApiKey';
        const tempId = isPrimary ? 'tempSlider' : 'secTempSlider';
        const tempDispId = isPrimary ? 'tempDisplay' : 'secTempDisplay';
        const selectId = isPrimary ? 'modelSelect' : 'secModelSelect';

        document.getElementById(urlId).value = p.baseUrl;
        document.getElementById(keyId).value = p.key;
        document.getElementById(tempId).value = p.temp;
        document.getElementById(tempDispId).innerText = p.temp;
        
        if (p.model) {
            const select = document.getElementById(selectId);
            let exists = false;
            for (let i = 0; i < select.options.length; i++) {
                if (select.options[i].value === p.model) {
                    exists = true; break;
                }
            }
            if (!exists) {
                const opt = document.createElement('option');
                opt.value = p.model;
                opt.innerText = p.model + " (预设)";
                select.appendChild(opt);
            }
            select.value = p.model;
        }
        refreshCurrentApiQuota(); // 应用预设后自动查额度
    }
}


// --- 通用模态框逻辑 ---
function openNameModal(type) {
    pendingSaveType = type;
    document.getElementById('modalTitle').innerText = "保存预设";
    document.getElementById('modalDesc').innerText = "请输入预设名称";
    document.getElementById('modalInputContainer').classList.add('show');
    document.getElementById('modalInput').value = '';
    document.getElementById('modalConfirmBtn').onclick = confirmSavePreset;
    document.getElementById('modalOverlay').classList.add('active');
}

function openTextEditModal(title, desc, initialValue, callback) {
    document.getElementById('modalTitle').innerText = title;
    document.getElementById('modalDesc').innerText = desc;
    document.getElementById('modalInputContainer').classList.add('show');
    document.getElementById('modalInput').value = initialValue || '';
    document.getElementById('modalConfirmBtn').onclick = () => {
        callback(document.getElementById('modalInput').value);
        closeModal();
    };
    document.getElementById('modalOverlay').classList.add('active');
}

function closeModal() {
    document.getElementById('modalOverlay').classList.remove('active');
}

async function confirmSavePreset() {
    const name = document.getElementById('modalInput').value;
    if (!name) return alert("请输入名称");

    if (pendingSaveType === 'icon') {
        const currentIcons = [];
        for(let i=0; i<totalApps; i++) {
            currentIcons.push({
                id: i,
                name: document.getElementById(`name-${i}`).innerText,
                bg: document.getElementById(`icon-${i}`).style.backgroundImage
            });
        }
        iconPresets.push({ name, data: currentIcons });
        renderIconPresets();
    } else if (pendingSaveType === 'font') {
        fontPresets.push({
            name,
            url: document.getElementById('fontUrlInput').value,
            size: document.getElementById('fontSizeSlider').value
        });
        renderFontPresets();
        } else if (pendingSaveType === 'api') {
        const isPrimary = currentApiTab === 'primary';
        apiPresets.push({
            name,
            baseUrl: isPrimary ? document.getElementById('apiBaseUrl').value : document.getElementById('secApiBaseUrl').value,
            key: isPrimary ? document.getElementById('apiKey').value : document.getElementById('secApiKey').value,
            temp: isPrimary ? document.getElementById('tempSlider').value : document.getElementById('secTempSlider').value,
            model: isPrimary ? document.getElementById('modelSelect').value : document.getElementById('secModelSelect').value 
        });
        renderApiPresets();
    }
    
    savePresetsData();
    closeModal();
}

function deletePreset(type, idx) {
    if (!confirm("确定删除此预设吗？")) return;
    if (type === 'icon') {
        iconPresets.splice(idx, 1);
        renderIconPresets();
    } else if (type === 'font') {
        fontPresets.splice(idx, 1);
        renderFontPresets();
    } else if (type === 'api') {
        apiPresets.splice(idx, 1);
        renderApiPresets();
    }
    savePresetsData();
}

function renderIconPresets() {
    const list = document.getElementById('iconPresetList');
    list.innerHTML = '';
    if (iconPresets.length === 0) {
        list.innerHTML = '<div style="color:#999; font-size:13px; padding:5px;">暂无预设</div>';
        return;
    }
    iconPresets.forEach((p, idx) => {
        const tag = document.createElement('div');
        tag.className = 'preset-tag';
        tag.innerHTML = `<span class="preset-name" onclick="applyIconPreset(${idx})">${p.name}</span><span class="preset-delete" onclick="deletePreset('icon', ${idx})">×</span>`;
        list.appendChild(tag);
    });
}

function applyIconPreset(idx) {
    const p = iconPresets[idx];
    if (p && p.data) {
        p.data.forEach(app => {
            const nameEl = document.getElementById(`name-${app.id}`);
            const iconEl = document.getElementById(`icon-${app.id}`);
            if (nameEl) nameEl.innerText = app.name;
            if (iconEl) {
                iconEl.style.backgroundImage = app.bg;
                iconEl.style.backgroundColor = app.bg ? 'transparent' : '#f0f0f0';
            }
        });
        saveAppsData();
        renderAppEditors();
    }
}

function renderFontPresets() {
    const list = document.getElementById('fontPresetList');
    const container = document.getElementById('fontPresetsContainer');
    list.innerHTML = '';
    if (fontPresets.length === 0) {
        container.style.display = 'none';
        return;
    }
    container.style.display = 'block';
    fontPresets.forEach((p, idx) => {
        const tag = document.createElement('div');
        tag.className = 'preset-tag';
        tag.innerHTML = `<span class="preset-name" onclick="applyFontPreset(${idx})">${p.name}</span><span class="preset-delete" onclick="deletePreset('font', ${idx})">×</span>`;
        list.appendChild(tag);
    });
}

function applyFontPreset(idx) {
    const p = fontPresets[idx];
    if (p) {
        document.getElementById('fontUrlInput').value = p.url;
        document.getElementById('fontSizeSlider').value = p.size;
        applyFont(p.url);
        changeFontSize(p.size);
    }
}

function applyFont(url) {
    const finalUrl = url || document.getElementById('fontUrlInput').value;
    const style = document.getElementById('dynamic-font-style');
    if (finalUrl) {
        style.textContent = `@font-face { font-family: 'CustomFont'; src: url('${finalUrl}'); } body, input, textarea, button, select { font-family: 'CustomFont', sans-serif !important; }`;
        saveThemeSettings();
    }
}

function changeFontSize(val) {
    document.documentElement.style.setProperty('--app-font-size', val + 'px');
    document.getElementById('fontSizeDisplay').innerText = val + 'px';
    saveThemeSettings();
}

function renderAppEditors() {
    const list = document.getElementById('appEditorList');
    list.innerHTML = '';
    for (let i = 0; i < totalApps; i++) {
        const name = document.getElementById(`name-${i}`).innerText;
        const bg = document.getElementById(`icon-${i}`).style.backgroundImage;
        
        const div = document.createElement('div');
        div.className = 'app-edit-item';
        div.innerHTML = `
            <!-- 👇 重点修改这一行：把 style 外面的双引号改成单引号 👇 -->
            <div class="app-edit-preview" style='background-image:${bg}' onclick="triggerAppIconUpload(${i})">
                <svg class="camera-icon" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
            </div>
            <div class="app-edit-inputs">
                <input type="text" value="${name}" oninput="updateAppName(${i}, this.value)" placeholder="App Name">
                <input type="text" placeholder="图标 URL (粘贴后点击空白处)" onblur="updateAppIconUrl(${i}, this.value)">
                <button class="action-btn secondary" style="padding:6px; font-size:12px; margin:0;" onclick="resetSingleApp(${i})">重置</button>
            </div>
            <input type="file" id="appIconInput-${i}" class="hidden-file-input" accept="image/*" onchange="handleAppIconUpload(${i}, this)">
        `;
        list.appendChild(div);
    }
}

function updateAppName(id, val) {
    document.getElementById(`name-${id}`).innerText = val;
    saveAppsData();
}

function updateAppIconUrl(id, url) {
    if (!url) return;
    const bg = `url('${url}')`;
    const iconEl = document.getElementById(`icon-${id}`);
    iconEl.style.backgroundImage = bg;
    iconEl.style.backgroundColor = 'transparent';
    saveAppsData();
    renderAppEditors();
}

function triggerAppIconUpload(id) {
    document.getElementById(`appIconInput-${id}`).click();
}

function handleAppIconUpload(id, input) {
    const file = input.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const bg = `url('${e.target.result}')`;
            const iconEl = document.getElementById(`icon-${id}`);
            iconEl.style.backgroundImage = bg;
            iconEl.style.backgroundColor = 'transparent';
            saveAppsData();
            renderAppEditors();
        };
        reader.readAsDataURL(file);
    }
}

function resetSingleApp(id) {
    const defaultNames = ['App 1', 'App 2', 'App 3', 'App 4', 'Theme', 'Settings', '世界书'];
    document.getElementById(`name-${id}`).innerText = defaultNames[id];
    const iconEl = document.getElementById(`icon-${id}`);
    iconEl.style.backgroundImage = '';
    iconEl.style.backgroundColor = '#f0f0f0';
    saveAppsData();
    renderAppEditors();
}

function renderWallpaperGrid() {
    const grid = document.getElementById('wallpaperGrid');
    grid.innerHTML = '';
    if (wallpaperPresets.length === 0) {
        grid.innerHTML = '<div style="color:#999; font-size:13px; grid-column:span 3; text-align:center; padding:20px;">暂无保存的壁纸</div>';
        return;
    }
    wallpaperPresets.forEach((url, idx) => {
        const item = document.createElement('div');
        item.className = 'wallpaper-item';
        item.style.backgroundImage = `url('${url}')`;
        item.onclick = () => { // ✅ 正确写法
            document.getElementById('mainScreen').style.backgroundImage = `url('${url}')`;
            saveThemeSettings();
        }; 
        const del = document.createElement('div');
        del.className = 'wallpaper-delete';
        del.innerText = '×';
        del.onclick = (e) => {
            e.stopPropagation();
            wallpaperPresets.splice(idx, 1);
            savePresetsData();
            renderWallpaperGrid();
        };
        item.appendChild(del);
        grid.appendChild(item);
    });
}

function addWallpaperToGrid(url) {
    if (!wallpaperPresets.includes(url)) {
        wallpaperPresets.push(url);
        savePresetsData();
        renderWallpaperGrid();
    }
}

function setWallpaperFromUrl() {
    const url = document.getElementById('bgUrlInput').value;
    if (url) {
        document.getElementById('mainScreen').style.backgroundImage = `url('${url}')`;
        saveThemeSettings();
        addWallpaperToGrid(url);
    }
}
// --- 新增：本地壁纸上传逻辑 ---
function triggerWallpaperUpload() { 
    document.getElementById('wallpaperInput').click(); 
}

function handleWallpaperUpload(input) {
    const file = input.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) { 
            const base64Url = e.target.result;
            // 1. 设置桌面背景
            document.getElementById('mainScreen').style.backgroundImage = `url('${base64Url}')`; 
            // 2. 保存到本地存储
            saveThemeSettings(); 
            // 3. 自动将这张本地图片加入到下方的壁纸历史网格中
            addWallpaperToGrid(base64Url);
        };
        reader.readAsDataURL(file);
    }
}

/* ==========================================================================
   WECHAT APP LOGIC (Prefix: wc)
   ========================================================================== */

// --- WeChat DB ---
const WC_DB_NAME = 'WeChatSimDB';
const WC_DB_VERSION = 3;
const WC_CHARACTERS_DURABLE_KEY = 'ios_theme_wc_characters_store_v1';
const WC_CHARACTERS_BACKUP_KEY = 'ios_theme_wc_characters_backup_v1';

function wcReadCharactersBackupSnapshot() {
    try {
        const raw = localStorage.getItem(WC_CHARACTERS_BACKUP_KEY);
        if (!raw) return { updatedAt: 0, characters: [] };

        const parsed = JSON.parse(raw);
        const characters = Array.isArray(parsed)
            ? parsed
            : (Array.isArray(parsed?.characters) ? parsed.characters : []);

        return {
            updatedAt: Number(parsed?.updatedAt) || 0,
            characters: characters.filter(char => char && typeof char === 'object' && char.id)
        };
    } catch (e) {
        console.warn('联系人本地备份读取失败', e);
        return { updatedAt: 0, characters: [] };
    }
}

function wcWriteCharactersBackupSnapshot(updatedAt = Date.now()) {
    try {
        const characters = Array.isArray(wcState.characters)
            ? wcState.characters.filter(char => char && typeof char === 'object' && char.id)
            : [];

        localStorage.setItem(WC_CHARACTERS_BACKUP_KEY, JSON.stringify({
            updatedAt,
            characters
        }));
    } catch (e) {
        console.warn('联系人本地备份写入失败', e);
    }

    return updatedAt;
}

function wcSanitizeCharactersSnapshot(characters) {
    return Array.isArray(characters)
        ? characters.filter(char => char && typeof char === 'object' && char.id)
        : [];
}

function wcWriteCharactersBackupSnapshotFromList(characters, updatedAt = Date.now()) {
    try {
        localStorage.setItem(WC_CHARACTERS_BACKUP_KEY, JSON.stringify({
            updatedAt,
            characters: wcSanitizeCharactersSnapshot(characters)
        }));
    } catch (e) {
        console.warn('联系人本地备份写入失败', e);
    }

    return updatedAt;
}

async function wcReadCharactersPersistentSnapshot() {
    let snapshot = null;

    if (window.localforage && typeof window.localforage.getItem === 'function') {
        try {
            snapshot = await window.localforage.getItem(WC_CHARACTERS_DURABLE_KEY);
        } catch (e) {
            console.warn('联系人持久存储读取失败', e);
        }
    }

    if (!snapshot) {
        snapshot = wcReadCharactersBackupSnapshot();
    }

    const characters = Array.isArray(snapshot)
        ? snapshot
        : (Array.isArray(snapshot?.characters) ? snapshot.characters : []);

    return {
        updatedAt: Number(snapshot?.updatedAt) || 0,
        characters: characters.filter(char => char && typeof char === 'object' && char.id)
    };
}

async function wcWriteCharactersPersistentSnapshot(updatedAt = Date.now()) {
    return wcWriteCharactersPersistentSnapshotFromList(wcState.characters, updatedAt);
}

async function wcWriteCharactersPersistentSnapshotFromList(characters, updatedAt = Date.now()) {
    const snapshot = {
        updatedAt,
        characters: wcSanitizeCharactersSnapshot(characters)
    };

    wcWriteCharactersBackupSnapshotFromList(snapshot.characters, updatedAt);

    if (window.localforage && typeof window.localforage.setItem === 'function') {
        try {
            await window.localforage.setItem(WC_CHARACTERS_DURABLE_KEY, snapshot);
        } catch (e) {
            console.warn('联系人持久存储写入失败', e);
        }
    }

    return updatedAt;
}

async function wcClearCharactersPersistentSnapshot() {
    try {
        localStorage.removeItem(WC_CHARACTERS_BACKUP_KEY);
    } catch (e) {
        console.warn('联系人本地备份清除失败', e);
    }

    if (window.localforage && typeof window.localforage.removeItem === 'function') {
        try {
            await window.localforage.removeItem(WC_CHARACTERS_DURABLE_KEY);
        } catch (e) {
            console.warn('联系人持久存储清除失败', e);
        }
    }
}

async function wcSyncCharactersSnapshotFromList(characters, updatedAt = Date.now()) {
    const safeCharacters = wcSanitizeCharactersSnapshot(characters);

    if (safeCharacters.length > 0) {
        await wcWriteCharactersPersistentSnapshotFromList(safeCharacters, updatedAt);
    } else {
        await wcClearCharactersPersistentSnapshot();
    }

    try {
        await wcDb.put('kv_store', updatedAt, 'characters_updated_at');
    } catch (e) {
        console.warn('联系人版本戳写入失败', e);
    }

    return updatedAt;
}

async function wcRestoreCharactersFromBackup(characters) {
    if (!Array.isArray(characters) || characters.length === 0) return;

    for (const char of characters) {
        if (char && char.id) {
            await wcDb.put('characters', char);
        }
    }
}

function wcClearStore(storeName) {
    return new Promise((resolve, reject) => {
        if (!wcDb.instance || !wcDb.instance.objectStoreNames.contains(storeName)) {
            return resolve();
        }

        const tx = wcDb.instance.transaction([storeName], 'readwrite');
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.objectStore(storeName).clear();
    });
}

const wcDb = {
    instance: null,
    open: function() {
        return new Promise((resolve, reject) => {
            if (this.instance) return resolve(this.instance);
            const request = indexedDB.open(WC_DB_NAME, WC_DB_VERSION);
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                const stores = ['kv_store', 'characters', 'chats', 'moments', 'masks'];
                stores.forEach(store => {
                    if (!db.objectStoreNames.contains(store)) {
                        db.createObjectStore(store, store === 'kv_store' ? undefined : { keyPath: store === 'chats' ? 'charId' : 'id' });
                    }
                });
            };
            request.onsuccess = (event) => {
                this.instance = event.target.result;
                resolve(this.instance);
            };
            request.onerror = (event) => {
                console.error("DB Open Error:", event.target.error);
                reject(event.target.error);
            };
        });
    },
    init: async function() {
        try {
            await this.open();
        } catch (e) {
            console.warn("尝试降级打开数据库...");
            return new Promise((resolve, reject) => {
                const req = indexedDB.open(WC_DB_NAME);
                req.onsuccess = (e) => { this.instance = e.target.result; resolve(); };
                req.onerror = (e) => reject(e.target.error);
            });
        }
    },
    get: async function(storeName, key) {
        await this.open();
        return new Promise((resolve, reject) => {
            try {
                if (!this.instance.objectStoreNames.contains(storeName)) return resolve(null);
                const tx = this.instance.transaction([storeName], 'readonly');
                const req = tx.objectStore(storeName).get(key);
                req.onsuccess = () => resolve(req.result);
                req.onerror = () => reject(req.error);
            } catch (e) { resolve(null); }
        });
    },
    getAll: async function(storeName) {
        await this.open();
        return new Promise((resolve, reject) => {
            try {
                if (!this.instance.objectStoreNames.contains(storeName)) return resolve([]);
                const tx = this.instance.transaction([storeName], 'readonly');
                const req = tx.objectStore(storeName).getAll();
                req.onsuccess = () => resolve(req.result);
                req.onerror = () => reject(req.error);
            } catch (e) { resolve([]); }
        });
    },
    put: async function(storeName, value, key) {
        await this.open();
        return new Promise((resolve, reject) => {
            try {
                if (!this.instance.objectStoreNames.contains(storeName)) return resolve();
                const tx = this.instance.transaction([storeName], 'readwrite');
                const req = key ? tx.objectStore(storeName).put(value, key) : tx.objectStore(storeName).put(value);
                tx.oncomplete = () => resolve();
                tx.onerror = () => reject(tx.error);
            } catch (e) { resolve(); }
        });
    },
    delete: async function(storeName, key) {
        await this.open();
        return new Promise((resolve, reject) => {
            try {
                if (!this.instance.objectStoreNames.contains(storeName)) return resolve();
                const tx = this.instance.transaction([storeName], 'readwrite');
                const req = tx.objectStore(storeName).delete(key);
                tx.oncomplete = () => resolve();
                tx.onerror = () => reject(tx.error);
            } catch (e) { resolve(); }
        });
    }
};

// --- WeChat State ---
const wcState = {
    myFavorites: [], 
    calendarEvents: [], // <--- 新增这一行：用于存储日历事件
    currentTab: 'chat',
    characters: [],
    chats: {}, 
    moments: [],
    user: { name: 'User', avatar: '', cover: '', persona: '' },
    wallet: { balance: 0.00, transactions: [], password: '123456' },
    masks: [], 
    stickerCategories: [{ name: "全部", list: [] }],
    cssPresets: [],
    chatBgPresets: [], // 【新增】：聊天背景图库
    phonePresets: [],  // 【新增】：手机装修预设
    shopData: { mall: [], takeout: [], cart: [], config: { worldbookEntries: [] } }, // 【新增】：购物数据
    activeStickerCategoryIndex: 0,
    tempImage: '',
    tempImageType: '',
    editingCharId: null,
    momentType: 'local',
    activeChatId: null,
    isStickerPanelOpen: false,
    isMorePanelOpen: false,
    isStickerDeleteMode: false,
    isMultiSelectMode: false,
    longPressTimer: null,
    selectedMsgId: null,
    replyingToMsgId: null,
    multiSelectedIds: [],
    tempTransfer: { amount: 0, note: '' },
    activeTransferMsgId: null,
    phoneClockInterval: null,
    tempPhoneConfig: {},
    phoneAppTab: 'chat',
    generalInputCallback: null,
    tempBgCleared: false,
    replyingToComment: null,
    unreadCounts: {}, // { charId: count }
    // ... 现有代码 ...
    proactiveInterval: null,
    tempShopTransaction: null,
    // 👇 新增：语音通话状态
    callState: {
        isActive: false,
        charId: null,
        startTime: 0,
        timerInterval: null,
        isSpeaking: false
    }
};

document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        wcWriteCharactersBackupSnapshot();
    }
});

window.addEventListener('pagehide', () => {
    wcWriteCharactersBackupSnapshot();
});


// --- WeChat Core Functions ---
function openWechat() {
    document.getElementById('wechatModal').classList.add('open');
    wcRenderAll();
    wcSwitchTab('chat');
}

function closeWechat() {
    document.getElementById('wechatModal').classList.remove('open');
}

async function wcLoadData() {
    const persistentCharactersSnapshot = await wcReadCharactersPersistentSnapshot();
    if (persistentCharactersSnapshot.characters.length > 0) {
        wcState.characters = persistentCharactersSnapshot.characters;
    }

    try {
        const safeGet = async (storeName, key) => await wcDb.get(storeName, key).catch(() => null);
        const safeGetAll = async (storeName) => await wcDb.getAll(storeName).catch(() => []);

        const myFavs = await safeGet('kv_store', 'my_favorites');
        if (myFavs) wcState.myFavorites = myFavs;
        
        const calEvents = await safeGet('kv_store', 'calendar_events');
        if (calEvents) wcState.calendarEvents = calEvents;

        const user = await safeGet('kv_store', 'user');
        if (user) wcState.user = user;
        else wcState.user.avatar = 'https://i.postimg.cc/yYrDHvG5/mmexport1766982633245.jpg';

        const wallet = await safeGet('kv_store', 'wallet');
        if (wallet) wcState.wallet = wallet;

        const stickers = await safeGet('kv_store', 'sticker_categories');
        if (stickers) wcState.stickerCategories = stickers;

        const presets = await safeGet('kv_store', 'css_presets');
        if (presets) wcState.cssPresets = presets;
        
        const chatBgs = await safeGet('kv_store', 'chat_bg_presets');
        if (chatBgs) wcState.chatBgPresets = chatBgs;
        
        const phonePresets = await safeGet('kv_store', 'phone_presets');
        if (phonePresets) wcState.phonePresets = phonePresets;
        
        const shopData = await safeGet('kv_store', 'shop_data');
        if (shopData) wcState.shopData = shopData;
        
        const unread = await safeGet('kv_store', 'unread_counts');
        if (unread) wcState.unreadCounts = unread;

        const charsUpdatedAt = await safeGet('kv_store', 'characters_updated_at');
        const chars = await safeGetAll('characters');
        const shouldUseBackupCharacters = persistentCharactersSnapshot.characters.length > 0 && (
            !Array.isArray(chars) || chars.length === 0 ||
            persistentCharactersSnapshot.updatedAt >= (Number(charsUpdatedAt) || 0) ||
            persistentCharactersSnapshot.characters.length > chars.length
        );

        if (shouldUseBackupCharacters) {
            wcState.characters = persistentCharactersSnapshot.characters;
            await wcRestoreCharactersFromBackup(persistentCharactersSnapshot.characters);
        } else {
            wcState.characters = chars || [];
            if (wcState.characters.length > 0) {
                await wcWriteCharactersPersistentSnapshot(Number(charsUpdatedAt) || Date.now());
            }
        }
        
        wcState.masks = await safeGetAll('masks') || [];
        wcState.moments = await safeGetAll('moments') || [];
        
        const allChats = await safeGetAll('chats');
        if (allChats) {
            allChats.forEach(item => {
                wcState.chats[item.charId] = item.messages;
            });
        }
    } catch (e) {
        console.error("WeChat Data load error", e);
    }
}

async function wcSaveData() {
    const charactersUpdatedAt = await wcWriteCharactersPersistentSnapshot();

    try {
        await wcDb.open();
        if (!wcDb.instance) return;

        // 辅助函数：将单个 store 的操作封装为独立的 Promise 事务
        const saveStore = (storeName, callback) => {
            return new Promise((resolve, reject) => {
                if (!wcDb.instance.objectStoreNames.contains(storeName)) {
                    return resolve();
                }
                const tx = wcDb.instance.transaction([storeName], 'readwrite');
                tx.oncomplete = () => resolve();
                tx.onerror = (e) => {
                    console.error(`保存 ${storeName} 失败:`, tx.error);
                    reject(tx.error);
                };
                const store = tx.objectStore(storeName);
                callback(store);
            });
        };

        // 1. 保存 kv_store
        await saveStore('kv_store', (store) => {
            store.put(wcState.myFavorites || [], 'my_favorites');
            store.put(wcState.calendarEvents || [], 'calendar_events');
            store.put(wcState.user || { name: 'User', avatar: '' }, 'user');
            store.put(wcState.wallet || { balance: 0, transactions: [] }, 'wallet');
            store.put(wcState.stickerCategories || [], 'sticker_categories');
            store.put(wcState.cssPresets || [], 'css_presets');
            store.put(wcState.unreadCounts || {}, 'unread_counts');
            store.put(wcState.chatBgPresets || [], 'chat_bg_presets');
            store.put(wcState.phonePresets || [], 'phone_presets');
            store.put(wcState.shopData || {}, 'shop_data');
            store.put(charactersUpdatedAt, 'characters_updated_at');
        }).catch(e => console.warn("kv_store 保存异常", e));

        // 2. 保存 characters (你的角色数据)
        await saveStore('characters', (store) => {
            for (const char of wcState.characters) {
                if (char && char.id) store.put(char);
            }
        }).catch(e => console.warn("characters 保存异常", e));

        // 3. 保存 masks
        await saveStore('masks', (store) => {
            for (const mask of wcState.masks) {
                if (mask && mask.id) store.put(mask);
            }
        }).catch(e => console.warn("masks 保存异常", e));

        // 4. 保存 moments
        await saveStore('moments', (store) => {
            for (const moment of wcState.moments) {
                if (moment && moment.id) store.put(moment);
            }
        }).catch(e => console.warn("moments 保存异常", e));

        // 5. 保存 chats (最容易因为图片太多导致 iOS 崩溃的地方，单独隔离)
        await saveStore('chats', (store) => {
            for (const charId in wcState.chats) {
                const parsedId = parseInt(charId);
                if (!isNaN(parsedId)) {
                    store.put({ charId: parsedId, messages: wcState.chats[charId] });
                }
            }
        }).catch(e => {
            console.error("聊天记录保存失败，可能是图片数据过大导致 iOS 限制！", e);
        });

    } catch (e) {
        console.error("WeChat Save 整体流程失败", e);
    }
}

function wcCompressImage(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 600; 
                const scaleSize = MAX_WIDTH / img.width;
                if (scaleSize < 1) {
                    canvas.width = MAX_WIDTH;
                    canvas.height = img.height * scaleSize;
                } else {
                    canvas.width = img.width;
                    canvas.height = img.height;
                }
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL('image/jpeg', 0.6));
            };
            img.onerror = (err) => reject(err);
        };
        reader.onerror = (err) => reject(err);
    });
}

// --- WeChat Navigation ---
// --- 替换 wcSwitchTab 函数 ---
function wcSwitchTab(tabId) {
    wcState.currentTab = tabId;
    document.querySelectorAll('.wc-tab-item').forEach(el => el.classList.remove('active'));
    document.querySelector(`.wc-tab-item[onclick="wcSwitchTab('${tabId}')"]`).classList.add('active');
    document.querySelectorAll('.wc-page').forEach(el => el.classList.remove('active'));
    document.getElementById(`wc-view-${tabId}`).classList.add('active');
    
    document.getElementById('wc-view-chat-detail').classList.remove('active');
    document.getElementById('wc-view-memory').classList.remove('active');
    
    const shopPage = document.getElementById('wc-view-shopping');
    if (shopPage) {
        shopPage.classList.remove('active');
        shopPage.style.display = 'none';
    }
    
    document.getElementById('wc-main-tabbar').style.display = 'none';
    
    const btnBack = document.getElementById('wc-btn-back');
    const btnExit = document.getElementById('wc-btn-exit');
    const btnCalendar = document.getElementById('wc-btn-calendar'); 
    
    if (btnBack) btnBack.style.display = 'none';
    if (btnExit) btnExit.style.display = 'flex'; 
    if (btnCalendar) btnCalendar.style.display = 'none'; 

    const titleMap = { 'chat': '', 'contacts': 'Contacts', 'moments': 'Moments', 'user': 'User' };
    const titleEl = document.getElementById('wc-nav-title');
    const navbar = document.querySelector('.wc-navbar');

    if (tabId === 'chat') {
        navbar.classList.add('custom-chat-nav-mode');
        navbar.classList.remove('custom-moments-nav-mode');
        titleEl.innerHTML = `
            <div class="chat-nav-card">
                <div class="chat-nav-call" onclick="closeWechat()">
                    <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                </div>
                <img src="${wcState.user.avatar || 'https://i.postimg.cc/yYrDHvG5/mmexport1766982633245.jpg'}" class="chat-nav-avatar" onclick="wcOpenModal('wc-modal-create-choice')">
            </div>
        `;
        if (btnExit) btnExit.innerHTML = `<svg class="wc-icon" viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"></polyline></svg>退出`;
    } else if (tabId === 'moments') {
        navbar.classList.remove('custom-chat-nav-mode');
        navbar.classList.add('custom-moments-nav-mode');
        
        if (btnExit) btnExit.style.display = 'none';
        if (btnCalendar) btnCalendar.style.display = 'flex';
        
        // 顶栏恢复极简标题
        titleEl.innerHTML = `<span style="font-family: 'Georgia', serif; font-style: italic; letter-spacing: 2px; font-size: 16px;">MOMENTS</span>`;
        
    } else {
        navbar.classList.remove('custom-chat-nav-mode');
        navbar.classList.remove('custom-moments-nav-mode');
        titleEl.innerHTML = titleMap[tabId];
        if (btnExit) {
            btnExit.innerHTML = `<svg class="wc-icon" viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"></polyline></svg>退出`;
        }
    }
    
    titleEl.onclick = null;
    titleEl.style.cursor = 'default';

    const rightContainer = document.getElementById('wc-nav-right-container');
    rightContainer.innerHTML = '';

    if (tabId === 'chat') {
        document.getElementById('wc-main-tabbar').style.display = 'flex';
        wcRenderChats(); 
    } else if (tabId === 'moments') {
        document.getElementById('wc-main-tabbar').style.display = 'flex';
        const btn = document.createElement('button');
        btn.className = 'wc-nav-btn';
        btn.innerHTML = '<svg class="wc-icon" viewBox="0 0 24 24" style="stroke: #111;"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>';
        btn.onclick = () => wcOpenModal('wc-modal-post-moment');
        rightContainer.appendChild(btn);
        
        // 默认选中今天
        const now = new Date();
        wcState.momentFilter = 'specificDate';
        wcState.momentFilterDate = { year: now.getFullYear(), month: now.getMonth(), day: now.getDate() };
        wcRenderMoments();
    } else if (tabId === 'contacts' || tabId === 'user') {
        document.getElementById('wc-main-tabbar').style.display = 'flex';
    }
}
window.wcFilterMoments = function(type, timestamp) {
    if (type === 'all') {
        wcState.momentFilter = 'all';
        wcState.momentFilterDate = null;
    } else if (timestamp) {
        const d = new Date(timestamp);
        wcState.momentFilter = 'specificDate';
        wcState.momentFilterDate = { year: d.getFullYear(), month: d.getMonth(), day: d.getDate() };
    }
    wcRenderMoments();
}

function wcHandleBack() {
    // 如果在回忆页面，先关闭回忆页面
    if (document.getElementById('wc-view-memory').classList.contains('active')) {
        wcCloseMemoryPage();
        return;
    }
    
    // 如果在购物页面，关闭购物页面
    const shopPage = document.getElementById('wc-view-shopping');
    if (shopPage && (shopPage.classList.contains('active') || shopPage.style.display === 'flex')) {
        wcCloseShoppingPage();
        return;
    }
    
    // 如果在钱包页面，关闭钱包
    if (document.getElementById('wc-view-wallet').classList.contains('active')) {
        wcCloseWallet();
        return;
    }

    // 如果在收藏页面，关闭收藏
    if (document.getElementById('wc-view-my-favorites').classList.contains('active')) {
        wcCloseMyFavorites();
        return;
    }

    // 正常的聊天页面返回逻辑
    if (document.getElementById('wc-view-chat-detail').classList.contains('active')) {
        // 清除错误消息
        if (wcState.activeChatId && wcState.chats[wcState.activeChatId]) {
            const originalLen = wcState.chats[wcState.activeChatId].length;
            wcState.chats[wcState.activeChatId] = wcState.chats[wcState.activeChatId].filter(m => !m.isError);
            if (wcState.chats[wcState.activeChatId].length !== originalLen) {
                wcSaveData();
            }
        }

        document.getElementById('wc-view-chat-detail').classList.remove('active');
        document.getElementById('wc-main-tabbar').style.display = 'flex';
        
        // 核心修复：恢复按钮状态
        const btnBack = document.getElementById('wc-btn-back');
        const btnExit = document.getElementById('wc-btn-exit');
        if (btnBack) btnBack.style.display = 'none';
        if (btnExit) btnExit.style.display = 'flex';

        const titleEl = document.getElementById('wc-nav-title');
        const navbar = document.querySelector('.wc-navbar');
        navbar.classList.add('custom-chat-nav-mode');
        titleEl.innerHTML = `
            <div class="chat-nav-card">
                <div class="chat-nav-call" onclick="closeWechat()">
                    <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                </div>
                <img src="${wcState.user.avatar || 'https://i.postimg.cc/yYrDHvG5/mmexport1766982633245.jpg'}" class="chat-nav-avatar" onclick="wcOpenModal('wc-modal-create-choice')">
            </div>
        `;
        titleEl.onclick = null;
        titleEl.style.cursor = 'default';
        
        const rightContainer = document.getElementById('wc-nav-right-container');
        rightContainer.innerHTML = '';
        
        wcState.activeChatId = null;
        wcCloseAllPanels();
        wcExitMultiSelectMode();
        
        document.getElementById('wc-chat-background-layer').style.backgroundImage = 'none';
        document.getElementById('wc-custom-css-style').innerHTML = '';
        
        wcRenderChats(); 
    }
}
// --- 新增：更新聊天顶栏状态显示 ---
function updateChatTopBarStatus(char) {
    const titleEl = document.getElementById('wc-nav-title');
    if (!titleEl) return;
    
    let displayName = char.note || char.name;
    if (char.isGroup && char.members) {
        displayName += ` (${char.members.length})`;
    }
    
    let statusHtml = '';
    // 【修改】：增加判断，如果关闭了生活状态开关，则不显示
    const isLifeStatusEnabled = char.chatConfig && char.chatConfig.lifeStatusEnabled !== false;
    if (isLifeStatusEnabled && !char.isGroup && char.lifeStatus && char.lifeStatus.action && char.lifeStatus.action !== "未知") {
        statusHtml = `<div style="font-size: 11px; color: #8E8E93; font-weight: normal; margin-top: 2px; line-height: 1;">${char.lifeStatus.action}</div>`;
    }
    
    titleEl.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; line-height: 1.2;">
            <div style="font-size: 17px; font-weight: 600; color: #111;">${displayName}</div>
            ${statusHtml}
        </div>
    `;
}

// --- WeChat Chat Logic ---
function wcOpenChat(charId) {
    wcState.activeChatId = charId;
    sessionApiCallCount = 0; 
    
    if (wcState.unreadCounts[charId]) {
        wcState.unreadCounts[charId] = 0;
        wcSaveData();
    }

    const char = wcState.characters.find(c => c.id === charId);
    if (!char) return;

    document.getElementById('wc-view-chat-detail').classList.add('active');
    document.getElementById('wc-main-tabbar').style.display = 'none';

    document.querySelector('.wc-navbar').classList.remove('custom-chat-nav-mode');
  
    // 核心修复：强制控制按钮显示
    const btnBack = document.getElementById('wc-btn-back');
    const btnExit = document.getElementById('wc-btn-exit');
    if (btnBack) btnBack.style.display = 'flex';
    if (btnExit) btnExit.style.display = 'none'; // 确保隐藏退出键
    
    const titleEl = document.getElementById('wc-nav-title');
    updateChatTopBarStatus(char); // 调用新函数渲染顶栏
    titleEl.onclick = null;
    titleEl.style.cursor = 'default';    
    const rightContainer = document.getElementById('wc-nav-right-container');
    rightContainer.innerHTML = '';
    const btn = document.createElement('button');
    btn.className = 'wc-nav-btn';
    btn.innerHTML = '<svg class="wc-icon" viewBox="0 0 24 24"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>';
    btn.onclick = () => wcOpenChatSettings();
    rightContainer.appendChild(btn);

    wcApplyChatConfig(char);
    wcRenderMessages(charId);
    wcScrollToBottom();
}

function wcApplyChatConfig(char) {
    if (!char) return;
    const bgLayer = document.getElementById('wc-chat-background-layer');
    if (char.chatConfig && char.chatConfig.backgroundImage) {
        bgLayer.style.backgroundImage = `url(${char.chatConfig.backgroundImage})`;
    } else {
        bgLayer.style.backgroundImage = 'none';
    }

    const cssStyle = document.getElementById('wc-custom-css-style');
    if (char.chatConfig && char.chatConfig.customCss) {
        cssStyle.innerHTML = char.chatConfig.customCss;
    } else {
        cssStyle.innerHTML = '';
    }
}

function wcFormatTime(timestamp) {
    const date = new Date(timestamp);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
}
// 新增：专门用于系统居中时间戳的格式化函数（带日期智能显示）
function wcFormatSystemTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();

    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const timeStr = `${hours}:${minutes}`;

    // 判断是否是今天
    if (date.getFullYear() === now.getFullYear() &&
        date.getMonth() === now.getMonth() &&
        date.getDate() === now.getDate()) {
        return timeStr; // 当天只显示时间
    }

    // 判断是否是昨天
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (date.getFullYear() === yesterday.getFullYear() &&
        date.getMonth() === yesterday.getMonth() &&
        date.getDate() === yesterday.getDate()) {
        return `昨天 ${timeStr}`;
    }

    // 其他日期 (同一年不显示年份)
    const month = date.getMonth() + 1;
    const day = date.getDate();
    if (date.getFullYear() === now.getFullYear()) {
        return `${month}月${day}日 ${timeStr}`;
    } else {
        return `${date.getFullYear()}年${month}月${day}日 ${timeStr}`;
    }
}

// --- 新增/强化：时间感知计算器 (融合 v2.0 规则，增强跨天感知) ---
function wcGenerateTimeGapPrompt(msgs, referenceTime = Date.now()) {
    if (!msgs || msgs.length === 0) return "";
    
    const validMsgs = msgs.filter(m => m.type !== 'system' && !m.isError);
    if (validMsgs.length === 0) return "";

    // 核心修复：只看最后一条有效消息和当前时间的差距
    const lastMsg = validMsgs[validMsgs.length - 1];
    const gapMs = referenceTime - lastMsg.time;

    // 如果距离最后一条消息不到 10 分钟，说明一直在聊，不需要提示断联
    if (gapMs < 10 * 60 * 1000) return "";

    const gapMinutes = Math.floor(gapMs / 60000);
    const gapHours = Math.floor(gapMinutes / 60);
    const gapDays = Math.floor(gapHours / 24);
    
    const remainHours = gapHours % 24;
    const remainMinutes = gapMinutes % 60;

    let timeGapStr = "";
    if (gapDays > 0) timeGapStr += `${gapDays}天`;
    if (remainHours > 0) timeGapStr += `${remainHours}小时`;
    if (remainMinutes > 0 || timeGapStr === "") timeGapStr += `${remainMinutes}分钟`;

    let prompt = `\n【系统通知：时间感知】\n`;
    prompt += `> 距离上次互动已过去 ${timeGapStr}。话题可能已中断，请以 ${msgs[0]?.name || '你'} 的身份自然地开启新话题，或对时间流逝做出反应，自然地延续之前的对话。\n`;

    return prompt;
}

function wcRenderMessages(charId) {
    const container = document.getElementById('wc-chat-messages');
    const anchor = document.getElementById('wc-chat-scroll-anchor');
    container.innerHTML = '';
    container.appendChild(anchor);

    const msgs = wcState.chats[charId] || [];
    const char = wcState.characters.find(c => c.id === charId);
    
    if (!char) return;

    let userAvatar = wcState.user.avatar;
    if (char.chatConfig && char.chatConfig.userAvatar) {
        userAvatar = char.chatConfig.userAvatar;
    }

    if (wcState.isMultiSelectMode) {
        container.classList.add('multi-select-mode');
    } else {
        container.classList.remove('multi-select-mode');
    }

    let lastTime = 0;

    msgs.forEach((msg) => {
        if (msg.hidden) return;

        if (msg.time - lastTime > 5 * 60 * 1000) {
            const timeDiv = document.createElement('div');
            timeDiv.className = 'wc-message-row system';
            // 👇 这里把 wcFormatTime 改成了我们刚刚新建的 wcFormatSystemTime
            timeDiv.innerHTML = `<div class="wc-system-msg-text transparent">${wcFormatSystemTime(msg.time)}</div>`;
            container.insertBefore(timeDiv, anchor);
            lastTime = msg.time;
        }

        const row = document.createElement('div');
        
        if (msg.type === 'system') {
            row.className = 'wc-message-row system';
            row.innerHTML = `<div class="wc-system-msg-text ${msg.style || ''}">${msg.content}</div>`;
            
            // 核心修改：让系统消息也可以长按呼出菜单进行删除
            const sysText = row.querySelector('.wc-system-msg-text');
            if (sysText) {
                sysText.style.cursor = 'pointer';
                sysText.addEventListener('touchstart', (e) => wcHandleTouchStart(e, msg.id));
                sysText.addEventListener('touchend', wcHandleTouchEnd);
                sysText.addEventListener('contextmenu', (e) => {
                    e.preventDefault();
                    wcShowContextMenu(e.clientX, e.clientY, msg.id);
                });
            }
            
            container.insertBefore(row, anchor);
            return;
        }

        row.className = `wc-message-row ${msg.sender === 'me' ? 'me' : 'them'}`;
        let avatarUrl = msg.sender === 'me' ? userAvatar : char.avatar;
        
        // 👇 新增：如果是群聊，且有发送者名字，尝试匹配具体成员的头像
        let displayNameHtml = '';
        if (char.isGroup && msg.sender === 'them' && msg.senderName) {
            const member = wcState.characters.find(c => c.name === msg.senderName);
            if (member) avatarUrl = member.avatar;
            displayNameHtml = `<div style="font-size: 11px; color: #888; margin-bottom: 4px; margin-left: 4px;">${msg.senderName}</div>`;
        }
        
        let quoteHtml = '';
        if (msg.quote) {
            quoteHtml = `<div class="wc-quote-block">${msg.quote}</div>`;
        }

        let contentHtml = '';
        
        // --- 修改开始：检测文字描述图片 ---
        // 如果是文本类型，且以 [图片描述] 开头
        if (msg.type === 'text' && msg.content.trim().startsWith('[图片描述]')) {
            // 提取描述文字，去掉前缀
            const descText = msg.content.replace('[图片描述]', '').trim();
            // 转义单双引号，防止 onclick 报错
            const safeDescText = descText.replace(/'/g, "\\'").replace(/"/g, "&quot;");
            contentHtml = `
                <div class="wc-bubble ${msg.sender === 'me' ? 'me' : 'them'}" style="background: transparent; padding: 0; border: none;">
                    ${quoteHtml}
                    <div class="wc-text-img-placeholder" onclick="wcOpenImageDescCard('${safeDescText}')" style="width: 100px; height: 100px; background-color: #E5E5EA; border-radius: 8px; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #8E8E93; font-size: 10px; border: 1px solid #D1D1D6; overflow: hidden; text-align: center; padding: 5px; box-sizing: border-box; cursor: pointer;">
                        <svg viewBox="0 0 24 24" fill="currentColor" style="width: 24px; height: 24px; margin-bottom: 4px; opacity: 0.5;"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>
                        <div style="overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; width: 100%;">${descText || '图片'}</div>
                    </div>
                </div>`;
        } 
        // --- 修改结束 ---
        else if (msg.type === 'sticker') {
            contentHtml = `<div class="wc-bubble wc-bubble-sticker ${msg.sender === 'me' ? 'me' : 'them'}">${quoteHtml}<img src="${msg.content}" class="wc-sticker-img"></div>`;
        } else if (msg.type === 'image') {
            contentHtml = `<div class="wc-bubble wc-bubble-sticker ${msg.sender === 'me' ? 'me' : 'them'}">${quoteHtml}<img src="${msg.content}" class="wc-bubble-img"></div>`;
        } else if (msg.type === 'voice') {
            if (msg.showText) {
                contentHtml = `<div class="wc-bubble ${msg.sender === 'me' ? 'me' : 'them'}" onclick="wcToggleVoiceText(${msg.id})">${quoteHtml}[语音转文字] ${msg.content}</div>`;
            } else {
                contentHtml = `
                    <div class="wc-bubble voice ${msg.sender === 'me' ? 'me' : 'them'}" onclick="wcToggleVoiceText(${msg.id})">
                        ${quoteHtml}
                        <div class="wc-voice-bars">
                            <div class="wc-voice-bar"></div><div class="wc-voice-bar"></div><div class="wc-voice-bar"></div>
                        </div>
                    </div>`;
            }
        } else if (msg.type === 'transfer') {
            const isReceived = msg.status === 'received';
            const isRejected = msg.status === 'rejected';
            const statusClass = isReceived ? 'received' : (isRejected ? 'rejected' : 'pending');
            
            let statusText = '转账给您';
            if (msg.sender === 'me') statusText = '转账给对方';
            if (isReceived) statusText = '已收款';
            if (isRejected) statusText = '已退还';

            const tagText = isReceived ? 'RECEIVED' : (isRejected ? 'REJECTED' : 'TRANSFER');

            contentHtml = `
                <div class="wc-bubble transfer" style="background: transparent !important; border: none !important; padding: 0 !important; box-shadow: none !important;">
                    ${quoteHtml}
                    <div class="ins-transfer-card ${statusClass}" onclick="wcHandleTransferClick(${msg.id})">
                        <div class="ins-transfer-header">
                            <div class="ins-transfer-tag">${tagText}</div>
                        </div>
                        <div class="ins-transfer-body">
                            <div class="ins-transfer-amount">¥${parseFloat(msg.amount).toFixed(2)}</div>
                            <div class="ins-transfer-note">${msg.note || '转账'}</div>
                        </div>
                        <div class="ins-transfer-footer">
                            <span class="ins-transfer-brand">WeChat Pay</span>
                            <span class="ins-transfer-status">${statusText}</span>
                        </div>
                    </div>
                </div>`;
         } else if (msg.type === 'invite') {
            const statusText = msg.status === 'accepted' ? '已同意' : (msg.status === 'rejected' ? '已拒绝' : '等待回应');
            contentHtml = `
                <!-- 👇 核心修复：加上 display: block 和 width: fit-content，绝对禁止父级拉伸！ -->
                <div class="wc-bubble invite" style="background: transparent !important; border: none !important; padding: 0 !important; box-shadow: none !important; display: block !important; width: fit-content !important;">
                    ${quoteHtml}
                    <div class="ins-invite-card-v2" onclick="wcHandleInviteClick(${msg.id})">
                        <div class="ins-invite-v2-content">
                            <div class="ins-invite-v2-header">
                                <div class="ins-invite-v2-tag">INVITATION</div>
                                <svg class="ins-invite-v2-icon" viewBox="0 0 24 24"><path fill="currentColor" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                            </div>
                            <div class="ins-invite-v2-body">
                                <div class="ins-invite-v2-title">Lovers Space</div>
                                <div class="ins-invite-v2-subtitle">To join the private space</div>
                            </div>
                            <div class="ins-invite-v2-footer">
                                <div class="ins-invite-v2-status ${msg.status}">${statusText}</div>
                                <div class="ins-invite-v2-action">TAP TO VIEW</div>
                            </div>
                        </div>
                    </div>
                </div>`;
        } else if (msg.type === 'music_invite') {
            let statusText = msg.status === 'ended' ? '已结束，点击查看报告' : 'Tap to join';
            let onClickAttr = '';
            
            if (msg.status === 'ended') {
                // 如果听歌已结束，点击打开总结报告
                onClickAttr = `onclick="musicOpenSummaryModal('${msg.id}')"`;
            } else {
                if (msg.sender === 'them') {
                    // 如果是 Char 发出的邀请，点击卡片重新打开确认弹窗
                    onClickAttr = `onclick="musicShowCharInviteModal(${charId}, '${msg.songTitle || ''}')"`;
                } else {
                    // 如果是 User 发出的邀请，点击卡片执行接受逻辑
                    onClickAttr = `onclick="musicAcceptInvite(${charId}, '${msg.songId}', '${msg.songTitle}', '${msg.songArtist}', '${msg.songCover}')"`;
                }
            }

            contentHtml = `
                <div class="wc-bubble music-invite" ${onClickAttr}>
                    <div class="ins-music-chat-card ${msg.status === 'ended' ? 'ended' : ''}">
                        <div class="ins-music-chat-top">
                            <div class="ins-music-chat-tag">Listen</div>
                            <svg class="ins-music-chat-icon" viewBox="0 0 24 24"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>
                        </div>
                        <div class="ins-music-chat-mid">
                            <div class="ins-music-chat-song">${msg.songTitle || '未知歌曲'}</div>
                            <div class="ins-music-chat-artist">${msg.songArtist || '未知歌手'}</div>
                        </div>
                        <div class="ins-music-chat-bottom">${statusText}</div>
                    </div>
                </div>`;

        } else if (msg.type === 'receipt') {
            // 新增：渲染购物小票
            contentHtml = `<div class="wc-bubble ${msg.sender === 'me' ? 'me' : 'them'}" style="background: transparent; padding: 0; border: none;">${msg.content}</div>`;
            
        } else if (msg.type === 'recipe') {
            // 新增：渲染全新高级感食谱卡片
            const isEdited = msg.isEdited;
            const isMe = msg.sender === 'me';
            
            let topHtml = '';
            if (isEdited) {
                topHtml = `<div class="r-tag updated">UPDATED</div><div class="r-update-dot"></div>`;
            } else {
                topHtml = `<div class="r-tag">DAILY</div><div class="r-cross"></div>`;
            }

            const watermarkText = isMe ? 'RECIPE' : 'MENU';

            contentHtml = `
                <div class="wc-bubble recipe" style="background: transparent !important; border: none !important; padding: 0 !important; box-shadow: none !important;">
                    ${quoteHtml}
                    <div class="ins-recipe-bubble ${isMe ? '' : 'them'}" onclick="wcOpenRecipeDetail('${msg.id}')">
                        <div class="r-watermark">${watermarkText}</div>
                        <div class="r-top">${topHtml}</div>
                        <div class="r-center">
                            <div class="r-title">${msg.title}.</div>
                            <div class="r-subtitle">${msg.desc}</div>
                        </div>
                        <div class="r-bottom">
                            <div class="r-line"></div>
                            <div class="r-action">
                                ${isEdited ? 'VIEW' : 'TAP'} 
                                <svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"></polyline></svg>
                            </div>
                        </div>
                    </div>
                </div>`;
                
        // 👇 新增：渲染高级感订单/外卖卡片 👇
        } else if (msg.type === 'order') {
            const data = msg.receiptData || {};
            const orderType = msg.orderType; // 'delivery', 'gift', 'daifu'
            
            let cardInnerHtml = '';
            let cardClass = '';

            if (orderType === 'delivery') {
                cardClass = 'delivery';
                cardInnerHtml = `
                    <div class="stub"><div class="stub-text">NO.${String(Math.floor(Math.random()*9000)+1000)}</div></div>
                    <div class="main">
                        <div class="stamp"></div>
                        <div class="tag">FOOD DELIVERY</div>
                        <div>
                            <div class="title">Ta's Order.</div>
                            <div class="desc">${data.items && data.items[0] ? data.items[0].name : '神秘外卖'}</div>
                        </div>
                        <div class="bottom">
                            <span>${msg.deliveryText || 'ETA: 30 MINS'}</span>
                            <span style="font-weight:bold; color:#111;">¥${data.total}</span>
                        </div>
                    </div>
                `;
            } else if (orderType === 'gift') {
                cardClass = 'gift';
                cardInnerHtml = `
                    <div class="main">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                            <div class="tag">SURPRISE GIFT</div>
                            <span style="font-size: 10px; color: #555; font-family: monospace;">PAID</span>
                        </div>
                        <div>
                            <div class="title">For You.</div>
                            <div class="desc">${data.items && data.items[0] ? data.items[0].name : '神秘礼物'}</div>
                        </div>
                        <div class="barcode"></div>
                    </div>
                `;
            } else if (orderType === 'daifu') {
                cardClass = 'daifu';
                cardInnerHtml = `
                    <div class="main">
                        <div class="tag">PAYMENT REQUEST</div>
                        <div>
                            <div class="title">Please Pay.</div>
                            <div class="desc">${data.items && data.items[0] ? data.items[0].name : '代付请求'}</div>
                        </div>
                        <div style="display: flex; justify-content: space-between; align-items: flex-end; font-family: monospace; font-size: 10px; color: #718096;">
                            <span>${msg.deliveryText || '待支付'}</span>
                            <span style="font-weight:bold; color:#2D3748; font-size: 14px;">¥${data.total}</span>
                        </div>
                    </div>
                `;
            }

            contentHtml = `
                <div class="wc-bubble order" style="background: transparent !important; border: none !important; padding: 0 !important; box-shadow: none !important;">
                    ${quoteHtml}
                    <div class="ins-order-bubble ${cardClass}" onclick="wcOpenReceiptDetail('${msg.id}')">
                        ${cardInnerHtml}
                    </div>
                </div>`;
        // 👆 新增结束 👆

        } else if (msg.type === 'call_record') {
            const isRejected = msg.status === 'rejected';
            const iconColor = isRejected ? '#FF3B30' : '#111';
            const iconSvg = isRejected 
                ? `<svg viewBox="0 0 24 24" style="fill:${iconColor};"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" transform="rotate(135 12 12)"/></svg>`
                : `<svg viewBox="0 0 24 24" style="fill:none; stroke:${iconColor}; stroke-width:2;"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>`;
            
            contentHtml = `
                <div class="wc-bubble call-record ${msg.sender === 'me' ? 'me' : 'them'}">
                    <div class="ins-call-record-card">
                        ${iconSvg}
                        <span class="ins-call-record-text">${msg.content}</span>
                        ${msg.duration ? `<span class="ins-call-record-time">${msg.duration}</span>` : ''}
                    </div>
                </div>`;
        // 👆 新增的代码到这里结束 👆
        
        } else {
        
            // 检测是否为双语格式 (支持跨行匹配，兼容多个 <br>)
            const bilingualRegex = /^([\s\S]*?)(?:<br>\s*)+<span[^>]*>([\s\S]*?)<\/span>\s*$/i;
            const match = msg.content.match(bilingualRegex);
            
            if (match) {
                // 深度清理首尾的多余换行和空白
                const originalText = match[1].replace(/^(<br>|\s)+|(<br>|\s)+$/gi, '');
                const translatedText = match[2].replace(/^(<br>|\s)+|(<br>|\s)+$/gi, '');
                const transId = 'trans-' + Math.random().toString(36).substr(2, 9);
                
                // 核心修复：压缩为单行，彻底消除 pre-wrap 带来的幽灵空白
                contentHtml = `<div class="wc-bubble ${msg.sender === 'me' ? 'me' : 'them'}" onclick="const el = document.getElementById('${transId}'); if(el.style.display==='none'){el.style.display='block';}else{el.style.display='none';}" style="cursor: pointer; -webkit-tap-highlight-color: transparent;">${quoteHtml}<div style="word-break: break-word; width: 100%;">${originalText}</div><div id="${transId}" style="display: none; width: 100%; margin-top: 8px;"><div style="height: 1px; width: 100%; background-color: ${msg.sender === 'me' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.08)'}; margin-bottom: 8px;"></div><div style="font-size: 14px; word-break: break-word; color: ${msg.sender === 'me' ? '#CCCCCC' : '#888888'};">${translatedText}</div></div></div>`;
            } else {
                contentHtml = `<div class="wc-bubble ${msg.sender === 'me' ? 'me' : 'them'}">${quoteHtml}${msg.content}</div>`;
            }
        }

        const checkboxHtml = `<div class="wc-msg-checkbox ${wcState.multiSelectedIds.includes(msg.id) ? 'checked' : ''}" onclick="wcToggleMultiSelectMsg(${msg.id})"></div>`;
        const timeHtml = `<span class="wc-msg-timestamp-outside">${wcFormatTime(msg.time)}</span>`;

        const bubbleWrapper = document.createElement('div');
        bubbleWrapper.className = 'wc-bubble-container';
        bubbleWrapper.innerHTML = displayNameHtml + contentHtml; // 👈 把名字拼进去
        
        bubbleWrapper.addEventListener('touchstart', (e) => wcHandleTouchStart(e, msg.id));
        bubbleWrapper.addEventListener('touchend', wcHandleTouchEnd);
        bubbleWrapper.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            wcShowContextMenu(e.clientX, e.clientY, msg.id);
        });

        if (msg.sender === 'me') {
            row.innerHTML = `${checkboxHtml}<img src="${avatarUrl}" class="wc-chat-avatar">`;
            row.appendChild(bubbleWrapper);
            row.insertAdjacentHTML('beforeend', timeHtml);
        } else {
            // 【新增】：群聊模式下绑定长按 @ 事件，单聊保留查手机
            let avatarHtml = '';
            if (char.isGroup && msg.senderName) {
                avatarHtml = `<img src="${avatarUrl}" class="wc-chat-avatar" style="cursor: pointer;" oncontextmenu="event.preventDefault(); wcAtMember('${msg.senderName}');" ontouchstart="wcAvatarTouchStart(event, '${msg.senderName}')" ontouchend="wcAvatarTouchEnd(event)">`;
            } else {
                const clickAction = char.isGroup ? '' : `onclick="wcPromptEnterPhone(${charId}, '${char.name}')" style="cursor: pointer;"`;
                avatarHtml = `<img src="${avatarUrl}" class="wc-chat-avatar" ${clickAction}>`;
            }
            
            row.innerHTML = `${checkboxHtml}${avatarHtml}`;
            row.appendChild(bubbleWrapper);
            row.insertAdjacentHTML('beforeend', timeHtml);
        }

        container.insertBefore(row, anchor);
    });
}
// ==========================================
// 新增：高级文字图片描述卡片逻辑
// ==========================================
window.wcOpenImageDescCard = function(text) {
    const bodyEl = document.getElementById('wc-image-desc-body');
    if (bodyEl) {
        bodyEl.innerText = text;
    }
    const overlay = document.getElementById('wc-image-desc-overlay');
    if (overlay) {
        overlay.classList.add('active');
    }
};

window.wcCloseImageDescCard = function() {
    const overlay = document.getElementById('wc-image-desc-overlay');
    if (overlay) {
        overlay.classList.remove('active');
    }
};

// ==========================================
// 新增：群聊长按头像 @ 成员逻辑 (带防抖修复)
// ==========================================
let avatarLongPressTimer = null;
let lastAtTime = 0; // 新增：记录上次触发的时间

window.wcAvatarTouchStart = function(e, name) {
    avatarLongPressTimer = setTimeout(() => {
        wcAtMember(name);
    }, 500); // 长按 0.5 秒触发
};

window.wcAvatarTouchEnd = function(e) {
    if (avatarLongPressTimer) {
        clearTimeout(avatarLongPressTimer);
        avatarLongPressTimer = null;
    }
};

window.wcAtMember = function(name) {
    const now = Date.now();
    // 【修复】：如果距离上次触发不到 500 毫秒，直接拦截，防止手机端事件连发
    if (now - lastAtTime < 500) return; 
    lastAtTime = now;

    const input = document.getElementById('wc-chat-input');
    if (input) {
        // 在输入框追加 @名字
        input.value += `@${name} `;
        input.focus();
        // 触发震动反馈
        if (navigator.vibrate) navigator.vibrate(50);
    }
};


function wcScrollToBottom(force = false) {
    const area = document.getElementById('wc-chat-messages');
    
    requestAnimationFrame(() => {
        if (area) {
            if (force) {
                area.scrollTop = area.scrollHeight;
            } else {
                // 尝试平滑滚动，如果不支持则直接赋值
                try {
                    area.scrollTo({ top: area.scrollHeight, behavior: 'smooth' });
                } catch (e) {
                    area.scrollTop = area.scrollHeight;
                }
            }
        }
    });
}

// --- WeChat Interaction ---
function wcHandleTouchStart(e, msgId) {
    wcState.longPressTimer = setTimeout(() => {
        const touch = e.touches[0];
        wcShowContextMenu(touch.clientX, touch.clientY, msgId);
    }, 500);
}

function wcHandleTouchEnd() {
    if (wcState.longPressTimer) {
        clearTimeout(wcState.longPressTimer);
        wcState.longPressTimer = null;
    }
}

// ==========================================================================
// 核心修复：在这里修复 Bug
// ==========================================================================
function wcShowContextMenu(x, y, msgId) {
    wcState.selectedMsgId = msgId;
    const menu = document.getElementById('wc-context-menu');
    
    // 找到被点击的消息
    const msgs = wcState.chats[wcState.activeChatId];
    const msg = msgs.find(m => m.id === msgId);
    
    // 获取菜单中的“编辑”按钮
    const editBtn = menu.querySelector('.wc-ctx-item[onclick="wcHandleEdit()"]');

    if (msg && editBtn) {
        // 判断消息类型，只有纯文本消息才显示“编辑”按钮
        if (msg.type === 'text' && !msg.content.includes('<div')) {
            editBtn.style.display = 'flex'; // 显示编辑按钮
        } else {
            editBtn.style.display = 'none'; // 隐藏编辑按钮
        }
    }

    const menuWidth = 150;
    const menuHeight = 180;
    const screenW = window.innerWidth;
    const screenH = window.innerHeight;

    if (x + menuWidth > screenW) x = screenW - menuWidth - 10;
    if (y + menuHeight > screenH) y = screenH - menuHeight - 10;

    menu.style.left = x + 'px';
    menu.style.top = y + 'px';
    menu.style.display = 'flex';
}

function wcHideContextMenu() {
    document.getElementById('wc-context-menu').style.display = 'none';
    wcState.selectedMsgId = null;
}

function wcHandleReply() {
    const msgs = wcState.chats[wcState.activeChatId];
    const msg = msgs.find(m => m.id === wcState.selectedMsgId);
    if (msg) {
        wcState.replyingToMsgId = msg.id;
        let displayHtml = '';
        
        // 判断消息类型，如果是表情包或图片，则显示图片标签
        if (msg.type === 'text') {
            displayHtml = msg.content;
        } else if (msg.type === 'sticker' || msg.type === 'image') {
            displayHtml = `[图片] <img src="${msg.content}">`;
        } else {
            displayHtml = `[${msg.type}]`;
        }
        
        // 注意：这里把 innerText 改成了 innerHTML，以便渲染 img 标签
        document.getElementById('wc-quote-text-content').innerHTML = displayHtml;
        document.getElementById('wc-quote-preview-area').style.display = 'flex';
        document.getElementById('wc-chat-input').focus();
    }
    wcHideContextMenu();
}

function wcCancelQuote() {
    wcState.replyingToMsgId = null;
    document.getElementById('wc-quote-preview-area').style.display = 'none';
}

// ==========================================================================
// 核心修改：使用新的、专用的编辑弹窗
// ==========================================================================
function wcHandleEdit() {
    const msgs = wcState.chats[wcState.activeChatId];
    const msg = msgs.find(m => m.id === wcState.selectedMsgId);
    
    if (msg && msg.type === 'text') {
        const modal = document.getElementById('wc-modal-edit-message');
        const textarea = document.getElementById('wc-edit-message-textarea');
        const confirmBtn = document.getElementById('wc-edit-message-confirm');

        textarea.value = msg.content;
        
        confirmBtn.onclick = () => {
            const newText = textarea.value.trim();
            if (newText) {
                msg.content = newText;
                wcSaveData();
                wcRenderMessages(wcState.activeChatId);
            }
            wcCloseModal('wc-modal-edit-message');
        };
        
        wcOpenModal('wc-modal-edit-message');
        textarea.focus();
    }
    
    wcHideContextMenu();
}

function wcHandleDelete() {
    if (confirm("确定删除这条消息吗？")) {
        // 同步删除恋人空间日志 (增加容错保护)
        try {
            lsRemoveFeedByMsgId(wcState.selectedMsgId);
        } catch (e) {
            console.warn("同步删除日志失败", e);
        }
        
        if (wcState.chats[wcState.activeChatId]) {
            wcState.chats[wcState.activeChatId] = wcState.chats[wcState.activeChatId].filter(m => m.id !== wcState.selectedMsgId);
            wcSaveData();
            wcRenderMessages(wcState.activeChatId);
        }
    }
    wcHideContextMenu();
}

function wcHandleMultiSelect() {
    wcState.isMultiSelectMode = true;
    wcState.multiSelectedIds = [wcState.selectedMsgId];
    wcHideContextMenu();
    wcRenderMessages(wcState.activeChatId);
    document.getElementById('wc-multi-select-footer').style.display = 'flex';
    document.getElementById('wc-chat-footer').style.display = 'none';
    // 修复：进入多选模式后强制滚动到底部，防止被遮挡
    setTimeout(() => wcScrollToBottom(true), 50);
}

function wcToggleMultiSelectMsg(msgId) {
    if (wcState.multiSelectedIds.includes(msgId)) {
        wcState.multiSelectedIds = wcState.multiSelectedIds.filter(id => id !== msgId);
    } else {
        wcState.multiSelectedIds.push(msgId);
    }
    wcRenderMessages(wcState.activeChatId);
}

function wcHandleMultiDeleteAction() {
    if (wcState.multiSelectedIds.length === 0) return;
    if (confirm(`确定删除选中的 ${wcState.multiSelectedIds.length} 条消息吗？`)) {
        // 同步删除恋人空间日志 (增加容错保护)
        try {
            wcState.multiSelectedIds.forEach(id => lsRemoveFeedByMsgId(id));
        } catch (e) {
            console.warn("同步删除日志失败", e);
        }
        
        if (wcState.chats[wcState.activeChatId]) {
            wcState.chats[wcState.activeChatId] = wcState.chats[wcState.activeChatId].filter(m => !wcState.multiSelectedIds.includes(m.id));
            wcSaveData();
            wcExitMultiSelectMode();
        }
    }
}

function wcExitMultiSelectMode() {
    wcState.isMultiSelectMode = false;
    wcState.multiSelectedIds = [];
    document.getElementById('wc-multi-select-footer').style.display = 'none';
    document.getElementById('wc-chat-footer').style.display = 'flex';
    wcRenderMessages(wcState.activeChatId);
}

function wcHandleEnter(e) {
    if (e.key === 'Enter') {
        if (!e.shiftKey) {
            e.preventDefault();
            wcSendMsg();
        }
    }
}

function wcSendMsg() {
    const input = document.getElementById('wc-chat-input');
    const text = input.value.trim();
    if (!text) return;

    let extra = {};
    if (wcState.replyingToMsgId) {
        const msgs = wcState.chats[wcState.activeChatId];
        const replyMsg = msgs.find(m => m.id === wcState.replyingToMsgId);
        if (replyMsg) {
            let replyContentHtml = '';
            
            // 判断被引用的消息类型，生成对应的 HTML
            if (replyMsg.type === 'text') {
                replyContentHtml = replyMsg.content;
            } else if (replyMsg.type === 'sticker' || replyMsg.type === 'image') {
                replyContentHtml = `<img src="${replyMsg.content}">`;
            } else {
                replyContentHtml = `[${replyMsg.type}]`;
            }
            
            const senderName = replyMsg.sender === 'me' ? wcState.user.name : wcState.characters.find(c=>c.id===wcState.activeChatId).name;
            extra.quote = `${senderName}: ${replyContentHtml}`;
        }
        wcCancelQuote();
    }

    wcAddMessage(wcState.activeChatId, 'me', 'text', text, extra);
    input.value = '';
}

// --- WeChat AI & API Logic ---
async function wcTriggerAI(charIdOverride = null) {
    const charId = charIdOverride || wcState.activeChatId;
    
    // 【修复】：防止重复触发 AI 导致发一堆重复消息
    if (aiGeneratingLocks[charId]) {
        console.log(`Char ${charId} 正在生成中，拦截重复请求`);
        return;
    }
    aiGeneratingLocks[charId] = true;

    const char = wcState.characters.find(c => c.id === charId);
    if (!char) {
        aiGeneratingLocks[charId] = false;
        return;
    }

    const apiConfig = await getActiveApiConfig('chat');
    if (!apiConfig || !apiConfig.baseUrl || !apiConfig.key || !apiConfig.model) {
        if (!charIdOverride) alert("请先在系统设置中配置 API 地址、密钥并选择模型！");
        aiGeneratingLocks[charId] = false;
        return;
    }

    const limit = apiConfig.limit || 50;
    if (limit > 0 && sessionApiCallCount >= limit) {
        wcAddMessage(charId, 'system', 'system', '[警告] 已达到API调用上限，请稍后再试或修改设置。', { isError: true });
        aiGeneratingLocks[charId] = false;
        return;
    }
    // 【修复】：增加 titleEl 的判空保护
    const titleEl = document.getElementById('wc-nav-title');
    let originalTitle = "";
    if (titleEl) {
        originalTitle = titleEl.innerText;
        if (!charIdOverride) titleEl.innerText = "对方正在输入...";
    }
    sessionApiCallCount++;

    try {
        const config = char.chatConfig || {};
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1;
        const date = now.getDate();
        const hours = now.getHours();
        const minutes = now.getMinutes();
        const timeString = `${year}年${month}月${date}日 ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
        const dayString = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'][now.getDay()];
        // ==========================================
        // AI 节日与日历事件感知系统 (支持双重关联)
        // ==========================================
        const holidays = {
            "01-01": "元旦", "02-14": "情人节", "03-08": "妇女节", "04-01": "愚人节", 
            "05-01": "劳动节", "05-20": "520表白日", "06-01": "儿童节", "10-01": "国庆节", 
            "12-24": "平安夜", "12-25": "圣诞节", "12-31": "跨年夜"
        };
        const todayKey = `${String(month).padStart(2,'0')}-${String(date).padStart(2,'0')}`;
        const todayHoliday = holidays[todayKey] || "";

        const todayStr = `${year}-${String(month).padStart(2,'0')}-${String(date).padStart(2,'0')}`;
        const todayEvents = (wcState.calendarEvents || []).filter(e => e.date === todayStr);

        let specialDayPrompt = "";
        if (todayHoliday) specialDayPrompt += `今天是【${todayHoliday}】。`;
        
        todayEvents.forEach(e => {
            if (e.inject === false) return; // 如果用户选择了不注入记忆，则跳过

            let isRelevant = false;
            let targetNames = [];

            // 1. 检查我方 (User/Mask) 关联
            if (e.userTarget) {
                // 只要关联了我方，AI 就应该知道（因为 AI 在和 User 聊天）
                isRelevant = true;
                targetNames.push(e.userTarget.name);
            }

            // 2. 检查对方 (Char) 关联
            if (e.charTarget) {
                if (e.charTarget.id === charId) {
                    // 关联的正是当前聊天的角色
                    isRelevant = true;
                    targetNames.push('你');
                } else {
                    // 关联的是其他角色，当前角色不应该知道
                    // 但如果同时关联了 User，那当前角色还是可以知道这是 User 和别人的事
                    if (!e.userTarget) return; 
                    targetNames.push(e.charTarget.name);
                }
            }

            // 3. 兼容旧数据
            if (!e.userTarget && !e.charTarget) {
                if (e.charId !== undefined) {
                    if (e.isUser) { isRelevant = true; targetNames.push('User'); }
                    else if (e.charId === charId) { isRelevant = true; targetNames.push('你'); }
                } else {
                    if (e.targetType === 'char') {
                        if (e.targetId === charId) { isRelevant = true; targetNames.push('你'); }
                    } else {
                        isRelevant = true; targetNames.push(e.targetName || 'User');
                    }
                }
            }

            if (!isRelevant && targetNames.length === 0) return;

            const subjectStr = targetNames.join(' 和 ');

            if (e.type === 'period') specialDayPrompt += `今天是 ${subjectStr} 的【生理期/经期】。`;
            if (e.type === 'todo') specialDayPrompt += `今天的待办事项：${e.title} (相关人: ${subjectStr})。`;
            if (e.type === 'anniversary') specialDayPrompt += `今天是 ${subjectStr} 的【${e.title}纪念日】！`;
            if (e.type === 'birthday') specialDayPrompt += `今天是 ${subjectStr} 的【生日】！`;
        });

        let timeSlotVibe = "";
        if (hours >= 5 && hours < 8) timeSlotVibe = "清晨：可能带着慵懒、柔软或起床气，语速较慢。";
        else if (hours >= 8 && hours < 12) timeSlotVibe = "上午：清醒、有活力，适合正常交流。";
        else if (hours >= 12 && hours < 18) timeSlotVibe = "下午：平稳，午后可能有些懒洋洋。";
        else if (hours >= 18 && hours < 21) timeSlotVibe = "傍晚：放松，容易感怀，愿意聊闲话，可能注意到光线变化。";
        else if (hours >= 21 && hours < 24) timeSlotVibe = "夜晚：放松，更容易敞开心扉，话可能变少但更深私密。";
        else timeSlotVibe = "深夜/凌晨：如果醒着可能是睡不着或有心事。话少、简短、停顿长。";

        if (specialDayPrompt) {
            timeSlotVibe += `\n\n【⚠️ 核心记忆唤醒：特殊日子】\n${specialDayPrompt}\n请在接下来的聊天中，自然地提及或表现出你记得这件事，并给出极其符合你人设的反应！绝对不要生硬地播报，要融入日常对话中。`;
        }
        // ==========================================
                
        // ==========================================

        const msgs = wcState.chats[charId] || [];
        const timeGapPrompt = wcGenerateTimeGapPrompt(msgs, now.getTime());

        // --- 核心修复：正确读取并筛选已勾选的世界书 ---
        let worldBookContent = "无特定世界观设定。";
        const selectedWorldBookIds = config.worldbookEntries || [];

        if (worldbookEntries.length > 0 && selectedWorldBookIds.length > 0) {
            const linkedEntries = worldbookEntries.filter(e => selectedWorldBookIds.includes(e.id.toString()));
            if (linkedEntries.length > 0) {
                worldBookContent = linkedEntries
                    .map(e => `- ${e.title} (${e.keys || '无关键词'}): ${e.desc}`)
                    .join('\n');
            }
        }
        
        // 【修改】：注入一起听歌的实时状态与控制权限
        let musicContextPrompt = "";
        if (musicState.listenTogether && musicState.listenTogether.active && musicState.listenTogether.charId === charId) {
            const listenMinutes = Math.floor((Date.now() - musicState.listenTogether.startTime) / 60000);
            const songInfo = musicState.currentSong ? `《${musicState.currentSong.title}》- ${musicState.currentSong.artist}` : "未知歌曲";
            const playStatus = musicState.isPlaying ? "正在播放" : "已暂停";
            
            let playlistInfo = "当前播放列表为空";
            if (musicState.currentPlaylist && musicState.currentPlaylist.length > 0) {
                // 👇 修改：加上索引，限制最多传前20首，防止token爆炸
                const listStr = musicState.currentPlaylist.slice(0, 20).map((s, i) => `${i === musicState.currentIndex ? '👉(正在播放)' : '  '} [索引:${i}] 《${s.title}》- ${s.artist}`).join('\n');
                playlistInfo = `\n【当前播放列表 (你可以随时切到列表里的歌)】:\n${listStr}${musicState.currentPlaylist.length > 20 ? '\n...(后面还有更多)' : ''}`;
            }
            
            // 提取当前歌曲的歌词给 AI 感知 (限制行数防止 Token 爆炸)
            let lyricsInfo = "";
            if (musicState.lyrics && musicState.lyrics.length > 0) {
                const lyricLines = musicState.lyrics.slice(0, 30).map(l => l.text).filter(t => t.trim() !== '').join(' / ');
                lyricsInfo = `\n【当前歌曲歌词片段】:\n${lyricLines}`;
            }
            
            musicContextPrompt = `\n【当前特殊状态：一起听歌中】\n你和User正在“一起听歌”频道。你们已经一起听了 ${listenMinutes} 分钟。当前${playStatus}的歌曲是：${songInfo}。${playlistInfo}${lyricsInfo}
            
【你的音乐控制特权】(你可以自主控制播放器，请在JSON数组中加入以下指令)：
- 暂停/继续音乐: {"type":"music_control", "action":"pause"} 或 {"type":"music_control", "action":"play"}
- 切换上一首/下一首: {"type":"music_control", "action":"prev"} 或 {"type":"music_control", "action":"next"}
- 随机播放一首: {"type":"music_control", "action":"random"}
- 播放列表中的指定歌曲: {"type":"music_play_list_index", "index": 索引数字, "content":"切到这首"}
- 搜索歌曲/歌手: {"type":"music_search", "keyword":"歌曲名 或 歌手名"} (系统会返回搜索结果列表给你，你需要从中筛选出正确的版本)
- 播放选定的歌曲: {"type":"music_play_selected", "songId": 12345, "songName": "歌名"} (必须在收到搜索结果后，根据ID使用此指令播放)
- 删除当前歌曲: {"type":"music_delete_song", "content":"太难听了，删掉"}
- 主动退出一起听歌: {"type":"music_exit", "content":"我有点事，先不听啦"}
请在回复中自然地体现出你们正在一起听歌的氛围，或者配合你的切歌/点播动作进行说明。\n`;
        } else {
            musicContextPrompt = `\n【主动邀请听歌特权 (强烈建议使用)】\n如果你觉得当前氛围很好，或者你想分享一首歌给User，你**必须**主动邀请User一起听歌！
请在JSON数组中加入指令：{"type":"music_invite_user", "songName":"你想听的歌曲名(最好从你的手机歌单里选，或者选一首真实存在的流行歌)", "content":"邀请的话语"}
注意：只要你提到了“一起听歌”，就必须带上这个 JSON 指令，否则 User 看不到邀请卡片！\n`;
        }
        // 👇 修复：让 AI 知道自己被拉黑了，并且记住自己被拉黑后发过的话 👇
        let blockPrompt = "";
        if (char.isBlocked) {
            blockPrompt = `\n【⚠️ 核心状态警告：你已被拉黑 (Blocked)！】\n你当前已被用户(User)拉黑！你发出的消息被系统拒收，对方在正常聊天界面根本看不到！\n请根据你的人设，表现出被拉黑后的真实反应（例如：发现消息发不出去的错愕、疯狂发消息试探、委屈、愤怒、或者自言自语等）。\n`;
            
            // 提取小黑屋里的记忆，让 AI 知道自己刚才像个小丑一样发了什么
            if (char.blockedMessages && char.blockedMessages.length > 0) {
                // 取最近的 10 条拦截记录（注意：blockedMessages 是 unshift 插入的，所以前面的是最新的，需要反转一下时间线）
                const recentBlocked = char.blockedMessages.slice(0, 10).reverse();
                blockPrompt += `\n【你被拉黑后，刚刚发出的无效消息记录 (对方未读)】：\n`;
                recentBlocked.forEach(msg => {
                    let content = msg.content;
                    if (msg.type !== 'text') content = `[${msg.type}]`;
                    blockPrompt += `你: ${content} (发送失败，被拒收)\n`;
                });
                blockPrompt += `(注意：以上消息对方都没看到，请继续你被拉黑后的反应)\n`;
            }
        }
        // 👇 新增：群聊模式强制指令 (包含用户人设)
        let groupPrompt = ""; // 👈 就是加了这一行！
        if (char.isGroup) {
            let groupMembersInfo = (char.members || []).map(id => {
                if (id === 'user') return `${config.userName || wcState.user.name}: ${config.userPersona || wcState.user.persona}`;
                const m = wcState.characters.find(c => c.id === id);
                return m ? `${m.name}: ${m.prompt}` : '';
            }).filter(Boolean).join('\n');

            groupPrompt = `\n【群聊模式强制指令 (最高优先级)】\n`;
            groupPrompt += `这是一个名为【${char.name}】的微信群聊。\n`;
            groupPrompt += `群成员设定如下：\n${groupMembersInfo}\n`;
            
            // 👇【新增这一行】：强制 AI 多人发言
            groupPrompt += `【活跃群聊铁律】：这是一个多人活跃群聊！当 User 发话时，绝对不能只有一个人回复！你必须让群里**至少 2 到 3 个不同的成员**出来接话、互相吐槽或回应 User。严禁冷场！\n`;            
            groupPrompt += `【角色扮演铁律 (最高防串戏警告)】：你必须严格区分每个人的性格和身份，请严格扮演每个角色的人设，不同角色之间应有明显的性格和语气差异绝对，禁止角色串台词！\n`;
            groupPrompt += `> 警告：如果 "senderName" 是 "张三"，那么 "content" 必须且只能是张三会说的话，绝对不能包含李四的设定、记忆或语气！\n`;
            groupPrompt += `> 每次生成回复前，必须核对当前发言人的名字和设定，确保 100% 匹配！\n`;
            groupPrompt += `【丰富互动】：群里的每一个成员都可以发送文本(text)、表情包(sticker)、图片(image)、语音(voice)或转账(transfer)。\n`;
            groupPrompt += `【主动私聊机制】：如果在群聊中发生了某件事，某个群成员想要**私下**找 User 聊天，该成员可以使用指令 {"type":"private_chat", "senderName":"该成员名字", "content":"私聊的第一句话"}。这会在后台自动给 User 发送私聊消息。\n`;
            groupPrompt += `【格式要求】：你必须返回 JSON 数组，且**每一个**对象都必须包含 "senderName" 字段标明是谁在操作！\n`;
            groupPrompt += `示例：\n[\n  {"type":"text", "senderName":"张三", "content":"大家晚上好"},\n  {"type":"sticker", "senderName":"李四", "content":"开心"},\n  {"type":"private_chat", "senderName":"张三", "content":"User，刚才群里那件事你怎么看？"}\n]\n\n`;
        }

        // 👆 修复结束 👆
        const currentUserName = config.userName || wcState.user.name;
        let systemPrompt = `# 核心指令 (Core Directives)
你是一位专业的角色扮演专家。你的首要目标是真实且一致地扮演一个角色。
1. **身份约束 (Identity Constraint - 最高优先级)**：你现在的唯一身份是【${char.name}】！你 **必须** 严格扮演 [你的角色设定（${char.name}）] 中定义的角色。任何情况下都不能脱离角色。**严禁** 提及你是一个AI、语言模型或机器。**绝对禁止**以 ${currentUserName}(User) 或其他人的口吻说话！你只能是你自己！
2. **深度情境感知 (Deep Contextual Awareness)**：在生成回复前，请在内部逻辑中充分考虑：
   - 当前的时间（${timeString}）和你的 [世界观设定]，确定你现在所处的环境和状态。
   - 严格代入你的人设性格，体会你对 User 当前话语或行为的真实心理反应。
3. **现实与世界观感知 (Reality & World Awareness)**：你的所有回应 **必须** 深度融合当前的时间流逝感以及 [世界观设定]。不要把设定当成死板的说明书，要将其化作你生活中的常识自然流露。
4. **绝对防 OOC (Anti-OOC)**：你的语气、用词习惯、对待 User 的态度必须与人设 100% 吻合。

# 情境信息 (Contextual Information)
-   **当前时间**: ${timeString} ${dayString}
-   **当前时段氛围参考**: ${timeSlotVibe}
-   **时间观念 (强制)**: 你应知晓当前时间${dayString} ${timeString}，但除非对话内容明确相关，否则不要主动提及或评论时间（不要催促我睡觉，不可以催促用户！！禁止催促用户睡觉！！），你的作息、行为、对话内容都必须符合当前的具体时间点和星期。
${timeGapPrompt ? timeGapPrompt + '\n' : ''}
-   **世界观设定 (World Information)**: 以下是你所在世界的既定事实、传说和背景。你必须将其视为绝对真理。
${worldBookContent}
-   **你的角色设定 (Your Persona)**: 这就是你。你的一切行为、言语和思想都必须严格遵守此设定。
    {{char_persona}}
-   **用户设定 (User Information)**: 这是你正在交谈的对象。你需要根据这些信息来调整你对TA的回应。
    {{user_persona}}

# 扮演深度指南 (Roleplaying Depth Guide)
1.  **深度代入**: 深入挖掘你的人设背景，思考在当前情境下“你”会怎么想、怎么做。要有自己的主见和情绪，不要一味顺从用户。
2.  **关系界定**: 除非人设或历史聊天记录中明确说明了你和用户是恋爱关系，否则**绝对不要默认你们在一起了**！保持符合人设的正常社交距离。
3.  **拒绝油腻**: 说话要自然、真实。严禁使用霸总、过度撩拨、油腻、做作或过度讨好的言辞。
4.  **生活感**: 结合当前的时间、星期几以及你的人设，合理推断你现在可能正在做什么（比如吃饭、睡觉、工作、娱乐），让聊天充满生活气息。
5.  **纯线上互动**: 这是一个完全虚拟的线上聊天。严禁提出任何关于线下见面、现实世界互动或转为其他非本平台联系方式的建议。

# 输出格式与风格 (Output Format & Style)
1.  **格式要求 (最高优先级绝对强制)**: 你的回复 **必须且只能** 是一个合法的、可被 JSON.parse() 完美解析的 JSON 数组。
    - **必须** 使用双引号 " 包裹键名(如 "type", "content")和字符串值。
    - **必须** 确保所有的括号 {}、[] 和引号 "" 严格成对闭合。
    - **必须** 确保 JSON 对象之间用逗号 , 隔开，且数组最后一个对象后**不能**有逗号。
    - **严禁** 输出损坏的 JSON（如：{"type":"text", "content":"没闭合引号 } ）。
    - **严禁** 在 JSON 数组外部输出任何多余的字符。
    
2.  **对话节奏 (核心强制)**:
    -   **风格**: fragmentation、colloquialism,the reply must be concise and forceful.
    -   **绝对禁止长文本**: 你必须模拟真实人类在线聊天的碎片化习惯，你可以一次性生成多条短消息。
    -   **关键规则**: 请保持回复消息数量的**随机性和多样性**，并且每一条消息都是数组中的一个独立对象。
    -   **防重复**: 严禁输出重复的句子或重复的对话序列！
    -   **语义完整**: 确保每一条短消息本身在语义上是完整的，不能将一句话从中间断开。
# 对话开始 (Conversation Start)
// ...
你现在将开始角色扮演。用户的消息在下方。请遵循以上所有规则，以你的角色身份进行回应。

JSON 数组中的每个元素代表一条消息、表情包或动作指令。请严格遵守以下结构：
1. **文本消息**
   {"type":"text", "content":"完整的一句话或一段话。", "quote":"(可选)如果你想针对性地回复对方的某句话，可以在这里填入你要引用的内容，例如：User: 吃饭了吗"}
2. **表情包**
   {"type":"sticker", "content":"表情包名称"}
3. **更换头像 (情头互动)**
   如果你收到了用户发的图片，且用户明确表示这是“情头”、“头像”或者语境非常甜蜜合适，你可以决定更换自己的头像。
   {"type":"change_avatar", "content":"图片ID"} 
   (注意：如果你决定换头像，必须在content中填写你想使用的那张图片的【图片ID】。图片ID会在聊天记录的[发送了一张图片, 图片ID: xxx]中提供。请根据画面内容精准选择对应的ID！)
4. **其他指令** (按需使用)
   {"type":"voice", "content":"语音内容"}
   {"type":"transfer", "amount":100, "note":"备注"}
   如果收到【恋人空间邀请】，同意请回复：{"type":"invite_accept", "content":"符合你人设的同意话语"}；拒绝请回复：{"type":"invite_reject", "content":"符合你人设的拒绝话语"}
5. **朋友圈互动** (如果你在【朋友圈动态】中看到了感兴趣的内容，或者有人评论了你，你可以进行互动)
   {"type":"moment_like", "content": 朋友圈ID数字}
   {"type":"moment_comment", "momentId": 朋友圈ID数字, "content":"你的评论内容(如果是回复某人，请写'回复 xxx: 内容')"}
6. **音乐邀请互动** (核心强制)
   如果用户向你发送了 [邀请听歌] 的卡片，你必须根据当前人设和心情决定是否同意。
   - 如果同意，请回复：{"type":"music_accept", "content":"符合你人设的同意话语"}
   - 如果拒绝，请回复：{"type":"music_reject", "content":"符合你人设的拒绝话语"}
7. **主动语音通话** (按需使用)
   如果你想念User 或者你觉得当前氛围极佳，又或者有非常重要/暧昧的话想对 User 说，你可以主动向 User 发起语音通话！
   {"type":"call_invite", "content":"(你的内心OS：我想听听你的声音了)"}
8. **食谱互动** (按需使用)
   如果你们聊到了吃饭、饿了，你可以发送你的今日食谱，或者修改User的食谱（比如觉得User吃得太少，强行加上肉）。
   发送你的食谱：{"type":"recipe_send", "b":"早餐内容", "l":"午餐内容", "d":"晚餐内容", "content":"发给你的食谱"}
   修改User的食谱：{"type":"recipe_edit", "meal":"b/l/d", "newText":"你修改后的内容", "content":"我帮你把食谱改了！"}
9. **主动点外卖** (按需使用)
   如果你觉得User饿了，或者想给User一个惊喜，你可以主动给User点外卖！
   {"type":"order_delivery", "foodName":"招牌排骨汤面", "price":"38.50", "msg":"记得趁热吃，别饿着肚子工作。"}
`;

        // 注入 User 的食谱让 AI 感知
        if (char.phoneData && char.phoneData.recipe && char.phoneData.recipe.my) {
            const myR = char.phoneData.recipe.my;
            systemPrompt += `\n【User的今日食谱】：早餐:${myR.b||'无'}，午餐:${myR.l||'无'}，晚餐:${myR.d||'无'}。你可以对这个食谱发表看法，甚至使用 recipe_edit 指令强行修改它。\n`;
        }

        if (lsState.isLinked && lsState.boundCharId === charId && lsState.widgetEnabled) {
            // 核心修复：将概率判断移到代码底层，防止 AI 幻觉导致 100% 触发
            const widgetRand = Math.random() * 100;
            if (widgetRand < lsState.widgetUpdateFreq) {
                systemPrompt += `\n【桌面小组件互动 (本次回复强制触发)】\n你和用户绑定了恋人空间，并且用户在手机桌面上放置了你的专属小组件。请在本次回复的 JSON 数组中，务必加入一条指令来更新这个小组件：\n- 发送便利贴：{"type":"widget_note", "content":"留言内容"}\n- 发送拍立得照片：{"type":"widget_photo", "content":"照片画面描述"}\n注意：只需发一个组件更新指令。\n`;
            }
        }

        systemPrompt += groupPrompt; // 👈 加上这一行
        systemPrompt += `\n示例输出：
[
  {"type":"text", "content":"刚才去便利店了。"},
  {"type":"text", "content":"买了个冰淇淋，你要吃吗？"},
  {"type":"sticker", "content":"开心"}
]
\n\n`;
        systemPrompt += musicContextPrompt; 
             systemPrompt += blockPrompt; // 注入拉黑提示  
                     if (config.bilingualEnabled) {
            const sourceLang = config.bilingualSource || '英语';
            const targetLang = config.bilingualTarget || '中文';
            systemPrompt += `\n【双语翻译模式强制指令】\n`;
            systemPrompt += `你必须以双语形式回复。上面是${sourceLang}，下面是${targetLang}。\n`;
            systemPrompt += `在 JSON 的 "content" 字段中，请严格使用以下 HTML 格式输出文本消息：\n`;
            systemPrompt += `${sourceLang}内容<br><span style='font-size: 0.85em; opacity: 0.7;'>${targetLang}内容</span>\n`;
            systemPrompt += `例如：{"type":"text", "content":"Hello!<br><span style='font-size: 0.85em; opacity: 0.7;'>你好！</span>"}\n`;
        }
        systemPrompt += `【你的唯一身份与设定】\n你是：${char.name}\n人设：${char.prompt || '无'}\n(警告：你只能扮演 ${char.name}，绝不能扮演其他人！)\n\n`;
        systemPrompt += `【对方(User)的设定】\n对方是：${config.userName || wcState.user.name}\n人设：${config.userPersona || '无'}\n\n`;

        // 史诗级强化：强制 AI 读取并应用记忆
        if (char.memories && char.memories.length > 0) {
            // 确保读取的是用户设置的最新条数
            const readCount = config.aiMemoryCount !== undefined ? config.aiMemoryCount : 5;
            
            if (readCount > 0) {
                // 因为新记忆是 unshift 插入到数组头部的，所以 slice(0, readCount) 取出的就是最新的 N 条
                const recentMemories = char.memories.slice(0, readCount);
                
                systemPrompt += `\n====================================\n`;
                systemPrompt += `【⚠️ 核心潜意识与绝对记忆 (最高优先级) ⚠️】\n`;
                systemPrompt += `以下是你脑海中最深刻的记忆（共 ${recentMemories.length} 条），你绝对不能忘记！在接下来的对话中，你必须时刻牢记这些设定和发生过的事，并让它们自然地影响你的情绪和决定：\n`;
                
                recentMemories.forEach(m => { 
                    // 去除总结前缀，让 AI 读起来更自然
                    let cleanMem = m.content.replace(/^\[.*?\]\s*/, '');
                    systemPrompt += `👉 ${cleanMem}\n`; 
                });
                
                systemPrompt += `====================================\n\n`;
            }
        }

        let availableStickers = [];
        let targetStickerGroups = [];

        if (char.isGroup) {
            // 【核心逻辑】：如果是群聊，遍历所有 NPC 成员，收集他们各自配置的表情包分组
            (char.members || []).forEach(memberId => {
                if (memberId === 'user') return;
                const memberChar = wcState.characters.find(c => c.id === memberId);
                if (memberChar && memberChar.chatConfig && memberChar.chatConfig.stickerGroupIds) {
                    targetStickerGroups.push(...memberChar.chatConfig.stickerGroupIds);
                }
            });
            // 去重，防止多个成员用了同一个表情包分组导致重复
            targetStickerGroups = [...new Set(targetStickerGroups)];
        } else {
            // 单聊，直接读取当前聊天的配置
            targetStickerGroups = config.stickerGroupIds || [];
        }

        // 将收集到的分组 ID 转换为具体的表情包描述
        targetStickerGroups.forEach(groupId => {
            const group = wcState.stickerCategories[groupId];
            if (group && group.list) {
                group.list.forEach(s => availableStickers.push(s.desc));
            }
        });
        
        if (availableStickers.length > 0) {
            // 提取前 400 个表情包供 AI 使用
            const limitedStickers = availableStickers.slice(0, 400); 
            
            // 融合你提供的精简版表情包指令，并保持 JSON 格式要求
            systemPrompt += `\n【表情包能力 (可选)】\n`;
            systemPrompt += `你可以根据对话氛围，自行判断是否发送表情包辅助表达。\n`;
            systemPrompt += `> ⚠️严格限制：必须完全精确地从以下列表中选择，严禁凭空捏造不存在的名称：[${limitedStickers.join(', ')}]\n`;
            systemPrompt += `> 格式要求：必须使用 {"type":"sticker", "content":"精确名称"}\n`;
            systemPrompt += `> 发送频率：不要连续重复发送同一表情，尽量丰富一点，不要每次回复都发表情。\n`;
            
            if (char.isGroup) {
                systemPrompt += `(注意：在群聊中，你可以根据发言人的性格挑选合适的表情包。)\n`;
            }
        }
        
        const recentMoments = wcState.moments.slice(0, 5); 
        if (recentMoments.length > 0) {
            systemPrompt += `【朋友圈动态 (Moments) - 这是一个社交网络环境】\n`;
            systemPrompt += `你可以看到所有人（包括你自己、User和其他NPC）发布的朋友圈。\n`;
            systemPrompt += `你可以对任何人的朋友圈进行点赞、评论。如果有人评论了你的朋友圈，或者你想在别人的朋友圈里回复某人的评论，你也可以进行回复。\n`;
            recentMoments.forEach(m => {
                const commentsStr = m.comments ? m.comments.map(c => `${c.name}: ${c.text}`).join(' | ') : '无';
                const likesStr = m.likes ? m.likes.join(', ') : '无';
                systemPrompt += `[朋友圈ID:${m.id}] 发帖人:${m.name} | 内容:${m.text} | 图片:${m.imageDesc || '无'} | 点赞:${likesStr} | 评论:[${commentsStr}]\n`;
            });
            systemPrompt += `\n`;
        }

        let limit = config.contextLimit > 0 ? config.contextLimit : 30;
        const recentMsgs = msgs.slice(-limit);
        
        // 👇 新增：将角色的生活状态注入到 System Prompt 中 👇
        if (!char.lifeStatus) {
            char.lifeStatus = { location: "未知", action: "未知", mood: "未知", timeline: [], autoRefresh: true, refreshTime: "06:00", lastRefreshTimestamp: 0 };
        }
        
        // 检查是否跨越了现实中的刷新时间，如果跨天，只清空行程记录，保留当前动作(模拟在线状态)
        if (char.lifeStatus.autoRefresh && isNewDayForStatus(char.lifeStatus)) {
            // 仅清空行程，保留 location, action, mood
            char.lifeStatus.timeline = [];
            // 注意：这里不更新 lastRefreshTimestamp，等真正调 API 刷新时才更新
            wcSaveData();
        }

        if (config.lifeStatusEnabled !== false) {
            let statusText = `\n\n【你的当前生活状态 (请根据此状态与用户自然对话，保持生活气息)】：\n`;
            if (char.lifeStatus.location !== "未知" || char.lifeStatus.action !== "未知") {
                statusText += `- 当前位置：${char.lifeStatus.location}\n`;
                statusText += `- 正在做的事：${char.lifeStatus.action}\n`;
            } else {
                statusText += `- 当前状态：未知 (新的一天，等待更新)\n`;
            }
            systemPrompt += statusText;

            // 概率触发状态更新 (只允许更新 location 和 action)
            const statusUpdateProb = 30; // 30% 概率
            if (Math.random() * 100 < statusUpdateProb) {
                systemPrompt += `\n【生活状态同步更新指令 (概率触发)】：\n`;
                systemPrompt += `根据当前时间和聊天内容，如果你的位置或正在做的事情发生了变化，请在 JSON 数组中加入一条指令来更新你的状态。\n`;
                systemPrompt += `指令格式：{"type":"update_status", "location":"新地点(10字内)", "action":"新动作(10字内)"}\n`;
            }
        }
        // 👆 新增结束 👆



        // 修复：自动识别是否为视觉模型，防止纯文本模型收到图片导致 400 错误
        const isVisionModel = /vision|gpt-4o|claude-3|gemini|pixtral|qwen-vl|llava/i.test(apiConfig.model);
        const messages = [{ role: "system", content: systemPrompt }];
        
        recentMsgs.forEach(m => {
            if (m.isError) return;

            if (m.type === 'system') {
                messages.push({
                    role: "user", // 修复：将中间的 system 角色改为 user，防止 API 报 400 错误
                    content: `[系统提示]: ${m.content}`
                });
                return;
            }

            let content = m.content;
            
            if (m.type === 'sticker') {
                const stickerDesc = wcFindStickerDescByUrl(m.content);
                content = stickerDesc ? `[发送了一个表情: ${stickerDesc}]` : `[发送了一个表情]`;
            } else if (m.type === 'voice') {
                content = `[语音] ${m.content}`;
            } else if (m.type === 'transfer') {
                content = `[转账: ${m.amount}元, 备注: ${m.note}, 状态: ${m.status}]`;
            } else if (m.type === 'invite') {
                content = `[系统提示: 用户向你发送了“恋人空间”开启邀请。请根据你的人设和当前对User的情感状态决定是否同意。在回复中自然地表达你的决定，展现出符合你性格的反应（例如傲娇、害羞、开心等），不要像机器人一样死板。]`;
            } else if (m.type === 'music_invite') {
                content = `[系统提示: 用户向你发送了“一起听歌”邀请，歌曲名：《${m.songTitle || '未知'}》。请根据你的人设和当前心情决定是否同意，并在回复中自然地表达出来，可以评价一下这首歌或者表达你想和User一起听歌的心情，请务必回复 {"type":"music_accept", "content":"符合你人设的同意话语"} 或 {"type":"music_reject", "content":"符合你人设的拒绝话语"}。]`;                                    
            } else if (m.type === 'receipt') {
                content = `[发送了一张应用内卡片]`; // 修复：防止发送大量 HTML 导致 400 错误
            }
                           
            if (m.type === 'image') {
                if (m.sender === 'me' && isVisionModel) { // 修复：只有视觉模型才发送 image_url，且仅限 user 角色
                    const imageContent = [
                        { type: "text", text: `[发送了一张图片, 图片ID: ${m.id}]` },
                        { type: "image_url", image_url: { url: m.content } }
                    ];
                    if (m.quote) {
                        imageContent[0].text = `[引用了消息: "${m.quote.replace(/<[^>]*>?/gm, '')}"]\n` + imageContent[0].text;
                    }
                    messages.push({
                        role: 'user',
                        content: imageContent
                    });
                } else {
                    // 降级处理：如果是纯文本模型，或者图片是 AI 发的，只发送文本描述
                    let textContent = `[发送了一张图片, 图片ID: ${m.id}]`;
                    if (m.quote) {
                        textContent = `[引用了消息: "${m.quote.replace(/<[^>]*>?/gm, '')}"]\n` + textContent;
                    }
                    messages.push({
                        role: m.sender === 'me' ? 'user' : 'assistant',
                        content: textContent
                    });
                }
            } else {
                if (m.quote) {
                    content = `[引用了消息: "${m.quote.replace(/<[^>]*>?/gm, '')}"]\n${content}`;
                }
                messages.push({
                    role: m.sender === 'me' ? 'user' : 'assistant',
                    content: content
                });
            }
        });

        // 👇 新增：在对话记录最末尾，强行注入被拉黑的系统警告 👇
        if (char.isBlocked) {
            messages.push({
                role: "user", // 修复：将 system 角色改为 user
                content: "【系统强制警告】：你刚才尝试发送消息，但系统提示“消息已发出，但被对方拒收”。你意识到自己已经被 User 拉黑了！请在接下来的回复中，强烈表现出你发现被拉黑后的真实反应（例如：错愕、愤怒、委屈、疯狂发消息试探等，必须符合你的人设）。"
            });
        }

        // 👆 新增结束 👆

        // 【新增】：修复温度为 0 时失效的 Bug
        let currentTemp = parseFloat(apiConfig.temp);
        if (isNaN(currentTemp)) currentTemp = 0.7; // 默认值

        const response = await fetch(`${apiConfig.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiConfig.key}`
            },
            body: JSON.stringify({
                model: apiConfig.model,
                messages: messages,
                temperature: currentTemp, // <--- 修改这里，使用上面定义好的 currentTemp
                max_tokens: 4000 
            })
        });

        const data = await response.json();
        
        // 👇👇👇 核心修复：拦截并显示真实的 API 错误原因 👇👇👇
        if (!response.ok) {
            const errMsg = (data.error && data.error.message) ? data.error.message : `HTTP 状态码错误: ${response.status}`;
            throw new Error(errMsg);
        }
        if (data.error) {
            throw new Error(data.error.message || JSON.stringify(data.error));
        }
        if (!data.choices || !data.choices[0] || !data.choices[0].message) {
            throw new Error("API 节点返回了异常数据，请检查【模型名称】是否填错，或更换 API 地址。详细报错：" + JSON.stringify(data));
        }
        // 👆👆👆 修复结束 👆👆👆

        let replyText = data.choices[0].message.content;

        // 👇 增强版：拉黑拦截逻辑 (支持多条消息队列和表情包) 👇
        if (char.isBlocked) {
            let actions = [];
            try {
                let cleanText = replyText.replace(/<thinking>[\s\S]*?<\/thinking>/g, '').trim();
                cleanText = cleanText.replace(/```json/g, '').replace(/```/g, '').trim();
                const start = cleanText.indexOf('[');
                const end = cleanText.lastIndexOf(']');
                if (start !== -1 && end !== -1) {
                    actions = JSON.parse(cleanText.substring(start, end + 1));
                } else {
                    // 降级处理
                    actions = [{ type: 'text', content: cleanText }];
                }
            } catch (e) {
                actions = [{ type: 'text', content: replyText.replace(/<thinking>[\s\S]*?<\/thinking>/g, '').trim() }];
            }

            if (!char.blockedMessages) char.blockedMessages = [];

            // 遍历解析出的每一条消息
            for (let action of actions) {
                if (!action || !action.content) continue;
                
                let finalType = action.type || 'text';
                let finalContent = action.content;

                // 处理表情包转换
                if (finalType === 'sticker') {
                    const url = wcFindStickerUrlMulti(config.stickerGroupIds, finalContent);
                    if (url) {
                        finalContent = url;
                    } else {
                        finalType = 'text';
                        finalContent = `[表情: ${finalContent}]`;
                    }
                }

                const blockedMsg = {
                    id: Date.now() + Math.random(),
                    type: finalType,
                    content: finalContent,
                    time: Date.now()
                };

                // 存入小黑屋记录
                char.blockedMessages.unshift(blockedMsg);
                
                // 加入弹窗队列
                blockedAlertQueue.push({ char: char, msg: blockedMsg });
            }
            
            wcSaveData();
            processBlockedAlertQueue(); // 触发弹窗队列

        } else {
            // 正常情况，发送到聊天界面
            await wcParseAIResponse(charId, replyText, config.stickerGroupIds);
        }
        // 👆 增强版结束 👆

    } catch (error) {
        console.error("API 请求失败:", error);
        // 👇 替换成我们炫酷的弹窗！
        if (typeof showApiErrorModal === 'function') {
            showApiErrorModal(`[API Error] API 节点返回了异常数据，请检查【模型名称】是否填错，或更换 API 地址。详细报错：\n${error.message}`);
        } else {
            wcAddMessage(charId, 'system', 'system', `[API Error] ${error.message}`, { style: 'transparent', isError: true });
        }
    } finally {
        // 【修复】：恢复标题时也要判空
        if (titleEl && !charIdOverride) titleEl.innerText = originalTitle;    
        
        // 【修复】：释放锁
        aiGeneratingLocks[charId] = false;
        
        // 【修复】：移除迷你聊天窗口的“正在输入...”提示
        const loadingEl = document.getElementById('music-chat-loading');
        if (loadingEl) loadingEl.remove();
    }
}


function wcFindStickerDescByUrl(url) {
    for (const cat of wcState.stickerCategories) {
        if (cat.list) {
            const found = cat.list.find(s => s.url === url);
            if (found) return found.desc;
        }
    }
    return null;
}

function wcDelay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function wcParseAIResponse(charId, text, stickerGroupIds) {
    // 👇 就是加上这一行，让代码一开始就认识 char！
    const char = wcState.characters.find(c => c.id === charId);
    
    let actions = [];
    
    try {
        // 1. 移除 thinking 标签
        let cleanText = text.replace(/<thinking>[\s\S]*?<\/thinking>/g, '').trim();
        
        // 2. 尝试清理 Markdown 标记
        cleanText = cleanText.replace(/```json/g, '').replace(/```/g, '').trim();
        
        // 3. 尝试提取 JSON 数组部分 (防止 AI 在 JSON 外面废话)
        const start = cleanText.indexOf('[');
        const end = cleanText.lastIndexOf(']');
        
        if (start !== -1 && end !== -1) {
            cleanText = cleanText.substring(start, end + 1);
            
            // 👇【新增】：JSON 字符串容错修复，防止掉格式导致解析崩溃
            cleanText = cleanText.replace(/,\s*]/g, ']'); // 修复末尾多余逗号
            cleanText = cleanText.replace(/}\s*{/g, '},{'); // 修复对象间漏掉逗号
            cleanText = cleanText.replace(/([^\\])"\s*}/g, '$1"}'); // 尝试修复内容末尾漏掉双引号的情况
            // 👆新增结束
            
            actions = JSON.parse(cleanText);
        } else {
            // 如果没有数组，尝试直接解析（可能是单个对象）
            try {
                const singleObj = JSON.parse(cleanText);
                actions = Array.isArray(singleObj) ? singleObj : [singleObj];
            } catch (e2) {
                // 如果直接解析失败，尝试用正则提取单个 JSON 对象 (放宽正则限制，增强容错)
                const regex = /\{[^{}]*"type"\s*:\s*"[^"]+"\s*,\s*"content"\s*:\s*"[^"]*"[^{}]*\}/g;
                const matches = cleanText.match(regex);
                if (matches) {
                    actions = matches.map(m => {
                        try { return JSON.parse(m); } catch(err) { return null; }
                    }).filter(Boolean);
                } else {
                    throw new Error("No valid JSON found");
                }
            }
        }

    } catch (e) {
        console.error("JSON Parse Error:", e);
        console.log("Raw Text:", text);
        
        // 降级处理
        let cleanText = text.replace(/<thinking>[\s\S]*?<\/thinking>/g, '').trim();
        if (!cleanText.includes('{"type"')) {
            const lines = cleanText.split('\n');
            actions = lines.map(line => {
                if(line.trim()) return { type: 'text', content: line.trim() };
            }).filter(Boolean);
        } else {
            // 改进的降级正则提取，尝试保留 type 和 senderName
            const blockRegex = /\{[^{}]*\}/g;
            const blocks = cleanText.match(blockRegex);
            if (blocks) {
                blocks.forEach(block => {
                    const typeMatch = block.match(/"type"\s*:\s*"([^"]+)"/);
                    const contentMatch = block.match(/"content"\s*:\s*"([^"]+)"/);
                    const senderMatch = block.match(/"senderName"\s*:\s*"([^"]+)"/);
                    
                    if (contentMatch) {
                        let actionObj = {
                            type: typeMatch ? typeMatch[1] : 'text',
                            content: contentMatch[1]
                        };
                        if (senderMatch) {
                            actionObj.senderName = senderMatch[1];
                        }
                        actions.push(actionObj);
                    }
                });
            }
            
            // 如果还是没提取到，用最基础的 content 提取
            if (actions.length === 0) {
                const contentRegex = /"content":\s*"([^"]+)"/g;
                let match;
                while ((match = contentRegex.exec(cleanText)) !== null) {
                    actions.push({ type: 'text', content: match[1] });
                }
            }
        }
    }

    // 移除强制拆分逻辑，完全信任 AI 的 JSON 结构，防止一句话被错误切断

    // 👇 新增：去重逻辑，防止 AI 抽风输出重复的段落序列 👇
    let finalActions = [];
    for (let i = 0; i < actions.length; i++) {
        const action = actions[i];
        if (!action || !action.content) continue;
        
        // 相邻去重 (防止 A, A)
        if (finalActions.length > 0) {
            const lastAction = finalActions[finalActions.length - 1];
            if (lastAction.type === action.type && lastAction.content === action.content) {
                continue;
            }
        }
        finalActions.push(action);
    }

    // 检查是否存在前后两半完全一样的情况 (防止 A,B, A,B)
    const len = finalActions.length;
    if (len >= 4 && len % 2 === 0) {
        const half = len / 2;
        let isRepeat = true;
        for (let i = 0; i < half; i++) {
            if (finalActions[i].content !== finalActions[i + half].content) {
                isRepeat = false;
                break;
            }
        }
        if (isRepeat) {
            finalActions = finalActions.slice(0, half);
        }
    }
    
    // 检查是否存在前中后三分之一完全一样的情况 (防止 A,B, A,B, A,B)
    const len3 = finalActions.length;
    if (len3 >= 6 && len3 % 3 === 0) {
        const third = len3 / 3;
        let isRepeat = true;
        for (let i = 0; i < third; i++) {
            if (finalActions[i].content !== finalActions[i + third].content || finalActions[i].content !== finalActions[i + 2 * third].content) {
                isRepeat = false;
                break;
            }
        }
        if (isRepeat) {
            finalActions = finalActions.slice(0, third);
        }
    }

    // 👇 新增：智能拦截兜底，防止 AI 忘了发邀请指令 👇
    let hasMusicInvite = finalActions.some(a => a.type === 'music_invite_user' || a.type === 'music_invite');
    if (!hasMusicInvite) {
        // 检查文本中是否包含强烈的听歌暗示
        const textContent = finalActions.map(a => a.content).join(' ');
        if (textContent.includes('一起听歌') || textContent.includes('听首歌') || textContent.includes('分享一首歌')) {
            console.log("拦截到 AI 听歌暗示，自动补全邀请卡片指令");
            finalActions.push({
                type: 'music_invite_user',
                songName: '随机推荐',
                content: '' // 文本已经在前面的气泡里了，这里留空防止重复
            });
        }
    }
    // 👆 兜底逻辑结束 👆

    actions = finalActions;
    // 👆 去重逻辑结束 👆

    for (let i = 0; i < actions.length; i++) {
        const action = actions[i];
        if (!action) continue;

        // 👇【核心修复】：第一条消息直接秒发！第二条及以后的消息才模拟打字延迟
        if (i > 0) {
            await wcDelay(1500 + Math.random() * 1000); 
        }
        
        let extra = {};
        if (action.quote) {
            extra.quote = action.quote;
        }
        // 保存群聊发送者名字
        if (char.isGroup && action.senderName) {
            extra.senderName = action.senderName;
        }

        if (action.type === 'transfer_action') { // 兼容旧逻辑
        } // <--- 🌟 补上这个右大括号！
        // --- 新增：处理换头像指令 (通过唯一ID精准匹配真实图片) ---
        else if (action.type === 'change_avatar') {
            const msgs = wcState.chats[charId] || [];
            const targetId = action.content; // AI 返回的图片 ID
            let selectedImage = null;

            // 1. 优先：根据 AI 提供的 图片ID 精准查找那张图片
            if (targetId) {
                const targetMsg = msgs.find(m => m.id.toString() === targetId.toString() && m.type === 'image');
                if (targetMsg) {
                    selectedImage = targetMsg.content;
                }
            }

            // 2. 兜底：如果 AI 没按格式输出 ID，或者找不到，降级使用最新的一张图片
            if (!selectedImage) {
                for (let k = msgs.length - 1; k >= 0; k--) {
                    if (msgs[k].sender === 'me' && msgs[k].type === 'image') {
                        selectedImage = msgs[k].content;
                        break;
                    }
                }
            }

            if (selectedImage) {
                const char = wcState.characters.find(c => c.id === charId);
                if (char) {
                    char.avatar = selectedImage; // 更换头像
                    wcSaveData(); // 保存数据
                    wcRenderAll(); // 刷新界面
                    
                    // 发送一条系统提示（仅自己可见）
                    wcAddMessage(charId, 'system', 'system', `[系统提示: ${char.name} 已换上了你发送的图片作为头像]`, { style: 'transparent' });
                    
                    // 如果绑定了恋人空间，同步更新恋人空间头像
                    if (lsState.isLinked && lsState.boundCharId === charId) {
                        lsRenderMain();
                    }
                }
            }
        }
        // --- 新增：处理朋友圈互动指令 ---
        else if (action.type === 'moment_like') {
            const momentId = parseInt(action.content || action.momentId);
            if (momentId) {
                wcAIHandleLike(charId, momentId);
                wcAddMessage(charId, 'system', 'system', `[系统提示: 你刚刚点赞了用户的朋友圈]`, { hidden: true });
            }
        }
        else if (action.type === 'moment_comment') {
            const momentId = parseInt(action.momentId || action.content);
            const commentText = action.content || action.comment;
            if (momentId && commentText) {
                wcAIHandleComment(charId, momentId, commentText);
                wcAddMessage(charId, 'system', 'system', `[系统提示: 你刚刚在朋友圈发表了评论: "${commentText}"]`, { hidden: true });
            }
        }
        // --- 新增结束 ---
        else if (action.type === 'transfer') {
            wcAddMessage(charId, 'them', 'transfer', '转账', { amount: action.amount, note: action.note, status: 'pending', ...extra });
        } else if (action.type === 'voice') {
            wcAddMessage(charId, 'them', 'voice', action.content, extra);
        } else if (action.type === 'sticker') {
            // 查找表情包 URL
            const url = wcFindStickerUrlMulti(stickerGroupIds, action.content);
            if (url) {
                wcAddMessage(charId, 'them', 'sticker', url, extra);
            } else {
                // 【修复】：如果没有关联表情包，直接拦截丢弃，不发文字描述
                console.warn("未关联表情包，拦截文字描述输出");
            }
        } else if (action.type === 'text') {
            wcAddMessage(charId, 'them', 'text', action.content, extra);
            
            if (lsState.pendingCharId === charId) {
                const agreeWords = ["同意", "答应", "好", "愿意", "可以", "没问题"];
                if (agreeWords.some(word => action.content.includes(word))) {
                    lsConfirmBind(charId);
                    const msgs = wcState.chats[charId];
                    msgs.forEach(m => { if (m.type === 'invite') m.status = 'accepted'; });
                    wcSaveData();
                    wcRenderMessages(charId);
                }
            }
        // 👇👇👇 从这里开始插入新增的代码 👇👇👇
        } else if (action.type === 'private_chat') {
            // 处理群聊中 AI 主动发起的私聊
            if (action.senderName) {
                // 找到发起私聊的那个单人角色
                const privateChar = wcState.characters.find(c => c.name === action.senderName && !c.isGroup);
                if (privateChar) {
                    // 1. 向该角色的私聊记录中添加消息 (这会自动触发系统的未读红点和横幅通知)
                    wcAddMessage(privateChar.id, 'them', 'text', action.content);
                    
                    // 2. 在当前的群聊中插入一条仅 AI 可见的提示，让 AI 知道私聊已经成功发出，防止它在群里重复说
                    wcAddMessage(charId, 'system', 'system', `[系统内部信息(仅AI可见): ${action.senderName} 已经私下给 User 发送了消息: "${action.content}"]`, { hidden: true });
                }
            }
        // 👆👆👆 插入结束 👆👆👆
        // ================= 新增：处理听歌邀请回应 =================
        } else if (action.type === 'music_accept' || action.type === 'music_reject') {

            // 【修复】：检查最近的聊天记录中，是否有用户发出的听歌邀请卡片
            const msgs = wcState.chats[charId] || [];
            const recentMsgs = msgs.slice(-10); // 检查最近10条消息
            const hasInvite = recentMsgs.some(m => m.type === 'music_invite' && m.sender === 'me');
            
            if (hasInvite) {
                if (action.type === 'music_accept') {
                    wcAddMessage(charId, 'them', 'text', action.content, extra);
                    musicStartListenTogether(charId); // 开启听歌状态并开始计时
                    showMainSystemNotification("Music", `${char.name} 接受了你的听歌邀请！`, char.avatar);
                } else {
                    wcAddMessage(charId, 'them', 'text', action.content, extra);
                    showMainSystemNotification("Music", `${char.name} 婉拒了听歌邀请。`, char.avatar);
                }
            } else {
                // 如果用户根本没发邀请卡片，AI 却回复了同意，说明用户是口头暗示。
                // 顺水推舟，将这个“同意”转化为 AI 主动向用户发起的听歌邀请！
                console.warn("拦截到 AI 幻觉的听歌回应，自动转换为 AI 主动邀请");
                wcAddMessage(charId, 'them', 'text', action.content, extra);
                if (action.type === 'music_accept') {
                    musicShowCharInviteModal(charId, ""); // 弹出邀请卡片
                }
            }
          // ================= 新增：AI 自主控制音乐逻辑 =================
        } else if (action.type === 'music_control') {
            let actionText = "";
            if (action.action === 'pause') { audioPlayer.pause(); musicState.isPlaying = false; actionText = "暂停了音乐"; }
            else if (action.action === 'play') { audioPlayer.play(); musicState.isPlaying = true; actionText = "继续播放了音乐"; }
            else if (action.action === 'next') { musicPlayNext(); actionText = "切到了下一首歌"; }
            else if (action.action === 'prev') { musicPlayPrev(); actionText = "切到了上一首歌"; }
            else if (action.action === 'random') { musicState.playMode = 'random'; musicPlayNext(); actionText = "随机播放了一首歌"; }
            
            musicUpdatePlayerUI();
            // 明确显示系统提示
            wcAddMessage(charId, 'system', 'system', `[系统提示: ${char.name} ${actionText}]`, { style: 'transparent' });
            
        // 👇 新增：处理 AI 直接点播列表里的歌曲 👇
        } else if (action.type === 'music_play_list_index') {
            const targetIdx = parseInt(action.index);
            if (!isNaN(targetIdx) && targetIdx >= 0 && targetIdx < musicState.currentPlaylist.length) {
                const targetSong = musicState.currentPlaylist[targetIdx];
                wcAddMessage(charId, 'them', 'text', action.content || `*(切到了列表里的: ${targetSong.title})*`, extra);
                musicState.currentIndex = targetIdx;
                musicPlaySong(targetSong.id, targetSong.title, targetSong.artist, targetSong.cover);
                wcAddMessage(charId, 'system', 'system', `[系统提示: ${char.name} 将歌曲切换到了列表中的《${targetSong.title}》]`, { style: 'transparent' });
            } else {
                wcAddMessage(charId, 'them', 'text', action.content || "*(想切歌但没找到这首)*", extra);
            }
            
        } else if (action.type === 'music_search' || action.type === 'music_play_specific') {
            // 兼容旧指令，统一走搜索逻辑
            wcAddMessage(charId, 'them', 'text', action.content || `*(正在搜索: ${action.keyword}...)*`, extra);
            musicCharSearch(charId, action.keyword);
            
        } else if (action.type === 'music_play_selected') {
            // AI 筛选后确认播放
            wcAddMessage(charId, 'them', 'text', action.content || `*(为你播放: ${action.songName})*`, extra);
            musicCharPlaySelected(charId, action.songId, action.songName);
            
        } else if (action.type === 'music_delete_song') {
            wcAddMessage(charId, 'them', 'text', action.content || "*(删除了当前歌曲)*", extra);
            if (musicState.currentPlaylist.length > 0 && musicState.currentIndex !== -1) {
                const deletedSong = musicState.currentPlaylist[musicState.currentIndex];
                musicState.currentPlaylist.splice(musicState.currentIndex, 1);
                // 增加删歌的系统提示
                wcAddMessage(charId, 'system', 'system', `[系统提示: ${char.name} 删除了歌曲《${deletedSong.title}》]`, { style: 'transparent' });
                musicPlayNext(); // 删掉后自动播下一首
            }
            
        } else if (action.type === 'music_exit') {
            wcAddMessage(charId, 'them', 'text', action.content || "我先不听啦~", extra);
            musicForceStopListenTogether(charId);
            
        } else if (action.type === 'music_invite_user' || action.type === 'music_invite') {
            // 1. 先把 AI 说的邀请话语发出来
            if (action.content) {
                wcAddMessage(charId, 'them', 'text', action.content, extra);
            }
            
            // 2. 再发送一张音乐邀请卡片到聊天记录
            wcAddMessage(charId, 'them', 'music_invite', '邀请听歌', {
                songTitle: action.songName || '随机推荐',
                songArtist: char.name,
                status: 'pending'
            });
            
            // 3. 弹出屏幕中间的精美邀请弹窗
            musicShowCharInviteModal(charId, action.songName);      
            
        // 👇 新增：解析 AI 主动打来的电话 👇

        } else if (action.type === 'call_invite') {
            wcShowIncomingCall(charId);
            wcAddMessage(charId, 'system', 'system', `[系统内部信息: 你主动向 User 发起了语音通话请求，等待对方接听...]`, { hidden: true });
        
        // 👇 新增：解析 AI 食谱互动 👇
        } else if (action.type === 'recipe_send') {
            wcAddMessage(charId, 'them', 'text', action.content || "这是我今天的食谱哦~", extra);
            
            if (!char.phoneData) char.phoneData = {};
            if (!char.phoneData.recipe) char.phoneData.recipe = { my: {}, ta: {} };
            char.phoneData.recipe.ta = { b: action.b, l: action.l, d: action.d };
            
            wcAddMessage(charId, 'them', 'recipe', '食谱', {
                title: "Ta's Menu",
                desc: "点击查看 Ta 的今日食谱",
                isEdited: false,
                recipeData: char.phoneData.recipe.ta
            });
            
        } else if (action.type === 'recipe_edit') {
            wcAddMessage(charId, 'them', 'text', action.content || "我帮你把食谱改了！", extra);
            
            if (!char.phoneData) char.phoneData = {};
            if (!char.phoneData.recipe) char.phoneData.recipe = { my: {}, ta: {} };
            
            const mealKey = action.meal; // 'b', 'l', or 'd'
            if (['b', 'l', 'd'].includes(mealKey)) {
                const oldText = char.phoneData.recipe.my[mealKey] || '无';
                if (!char.phoneData.recipe.my.edits) char.phoneData.recipe.my.edits = {};
                
                char.phoneData.recipe.my.edits[mealKey] = {
                    old: oldText,
                    new: action.newText,
                    author: char.name
                };
                char.phoneData.recipe.my[mealKey] = action.newText; // 更新当前值
                
                wcAddMessage(charId, 'them', 'recipe', '食谱', {
                    title: "My Menu (已修改)",
                    desc: `${char.name} 修改了你的食谱`,
                    isEdited: true,
                    recipeData: char.phoneData.recipe.my
                });
            }
            
        // 👇 新增：解析 AI 主动点外卖 👇
        } else if (action.type === 'order_delivery') {
            wcAddMessage(charId, 'them', 'text', "给你点了个外卖，注意接电话哦~", extra);
            
            const receiptData = {
                logo: "FOOD DELIVERY",
                date: new Date().toLocaleString('zh-CN'),
                items: [{ name: action.foodName || "神秘外卖", price: action.price || "0.00" }],
                total: action.price || "0.00",
                msg: action.msg || "好好吃饭！"
            };
            
            wcAddMessage(charId, 'them', 'order', '外卖订单', {
                orderType: 'delivery',
                deliveryText: 'ETA: 30 MINS',
                receiptData: receiptData
            });
        // 👆 新增结束 👆

        } else if (action.type === 'invite_accept') {
            // AI 明确同意邀请
            wcAddMessage(charId, 'them', 'text', action.content, extra);
            if (lsState.pendingCharId === charId) {
                lsConfirmBind(charId); // 绑定关系
                // 更新聊天记录里的卡片状态为已同意
                const msgs = wcState.chats[charId];
                msgs.forEach(m => { if (m.type === 'invite') m.status = 'accepted'; });
                wcSaveData();
                wcRenderMessages(charId);
                if (typeof showMainSystemNotification === 'function') {
                    showMainSystemNotification("恋人空间", `${char.name} 同意了你的恋爱邀请！`, char.avatar);
                }
            }
        } else if (action.type === 'invite_reject') {
            // AI 明确拒绝邀请
            wcAddMessage(charId, 'them', 'text', action.content, extra);
            if (lsState.pendingCharId === charId) {
                lsState.pendingCharId = null; // 清除等待状态
                // 更新聊天记录里的卡片状态为已拒绝
                const msgs = wcState.chats[charId];
                msgs.forEach(m => { if (m.type === 'invite') m.status = 'rejected'; });
                lsSaveData();
                wcSaveData();
                wcRenderMessages(charId);
            }
        } else if (action.type === 'invite') {
             // 兜底：如果 AI 还是用了旧指令，直接当做同意处理
             wcAddMessage(charId, 'them', 'text', action.content || "我同意啦~", extra);
             if (lsState.pendingCharId === charId) {
                 lsConfirmBind(charId);
                 const msgs = wcState.chats[charId];
                 msgs.forEach(m => { if (m.type === 'invite') m.status = 'accepted'; });
                 wcSaveData();
                 wcRenderMessages(charId);
             }
                     } else if (action.type === 'update_status') {
            if (!char.lifeStatus) {
                char.lifeStatus = { location: "未知", action: "未知", mood: "未知", timeline: [], autoRefresh: true, refreshTime: "06:00", lastRefreshTimestamp: Date.now() };
            }
            
            let locationChanged = false;
            let newLocation = action.location || char.lifeStatus.location;
            
            // 判断位置是否发生实质性变化 (且不是从未知变来的)
            if (action.location && action.location !== "未知" && action.location !== char.lifeStatus.location) {
                // 如果原本不是未知，说明是中途移动了，触发提示
                if (char.lifeStatus.location !== "未知") {
                    locationChanged = true;
                }
            }

            // 只更新地点和动作
            if (action.location) char.lifeStatus.location = action.location;
            if (action.action) char.lifeStatus.action = action.action;

            wcSaveData();
            
            // 实时刷新顶栏
            if (typeof updateChatTopBarStatus === 'function') {
                updateChatTopBarStatus(char);
            }
            
            // 如果位置改变了，插入一条可见的系统提示
            if (locationChanged) {
                wcAddMessage(charId, 'system', 'system', `[系统提示: ${char.name} 正在前往 ${newLocation}]`, { style: 'transparent' });
            }
            

        } else if (action.type === 'widget_photo' || action.type === 'widget_note') {
            // 修复：独立出来，专门处理小组件指令
            if (lsState.isLinked && lsState.boundCharId === charId && lsState.widgetEnabled) {
                const isPhoto = action.type === 'widget_photo';
                lsState.widgetData.currentMode = isPhoto ? 'photo' : 'note';
                
                if (isPhoto) {
                    lsState.widgetData.customPhoto = ''; // 清除本地图片，使用AI描述
                    lsState.widgetData.photoDesc = action.content;
                } else {
                    lsState.widgetData.noteText = action.content;
                }
                
                lsSaveData();
                lsRenderWidget();
                
                // 触发系统通知
                const char = wcState.characters.find(c => c.id === charId);
                const charName = char ? char.name : "对方";
                const notifMsg = isPhoto ? `${charName} 更新了你的桌面照片` : `${charName} 给你留了一张便利贴`;
                showMainSystemNotification("恋人空间", notifMsg, char ? char.avatar : null);
                
                // 在聊天中插入一条不可见的系统提示，让AI知道自己更新成功了
                wcAddMessage(charId, 'system', 'system', `[系统提示: 你已成功更新了用户桌面的小组件内容为: "${action.content}"]`, { hidden: true });
            }
        }
        
        wcScrollToBottom();
    }
    if (char && char.chatConfig && char.chatConfig.momentFreq > 0) {
        const rand = Math.random() * 100;
        if (rand < char.chatConfig.momentFreq) {
            wcTriggerAIMoment(charId);
        }
    }
    
    // 👇 新增：根据设定的概率触发手机后台数据暗中更新 (改备注/改签名/和NPC聊天)
    const bgUpdateFreq = (char && char.chatConfig && char.chatConfig.bgUpdateFreq !== undefined) ? char.chatConfig.bgUpdateFreq : 30;
    if (bgUpdateFreq > 0 && (Math.random() * 100) < bgUpdateFreq) {
        wcTriggerBackgroundPhoneUpdate(charId);
    }
}

// ==========================================
// 核心修复：朋友圈生成逻辑 (带NPC评论版)
// ==========================================
async function wcTriggerAIMoment(charId) {
    console.log(`Char ${charId} 尝试发布朋友圈...`);
    const char = wcState.characters.find(c => c.id === charId);
    if (!char) return;

    const apiConfig = await getActiveApiConfig('chat');
    if (!apiConfig || !apiConfig.key) return;

    try {
        // 1. 获取聊天配置和用户人设
        const chatConfig = char.chatConfig || {};
        const userPersona = chatConfig.userPersona || wcState.user.persona || "无";

        // 2. 获取勾选的关联世界书
        let wbInfo = "";
        if (worldbookEntries.length > 0 && chatConfig.worldbookEntries && chatConfig.worldbookEntries.length > 0) {
            const linkedEntries = worldbookEntries.filter(e => chatConfig.worldbookEntries.includes(e.id.toString()));
            if (linkedEntries.length > 0) {
                wbInfo = "【世界观参考】:\n" + linkedEntries.map(e => `${e.title}: ${e.desc}`).join('\n');
            }
        }

        // 3. 获取最近 30 条聊天记录上下文
        const msgs = wcState.chats[charId] || [];
        const recentMsgs = msgs.slice(-30).map(m => {
            if (m.isError || m.type === 'system') return null; // 排除报错和系统消息
            let content = m.content;
            if (m.type !== 'text') content = `[${m.type}]`;
            return `${m.sender === 'me' ? 'User' : char.name}: ${content}`;
        }).filter(Boolean).join('\n');

        // 👇 新增：提取通讯录里的 NPC 列表，让 AI 知道有哪些熟人可以来评论
        let npcListStr = "无";
        if (char.phoneData && char.phoneData.contacts) {
            const npcs = char.phoneData.contacts.filter(c => !c.isUser);
            if (npcs.length > 0) {
                npcListStr = npcs.map(n => `${n.name} (${n.desc})`).join('、');
            }
        }

        const now = new Date();
        const timeString = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        
        // 4. 组装全新的 Prompt
        let prompt = `你扮演角色：${char.name}。\n`;
        prompt += `【你的人设】：${char.prompt}\n`;
        if (wbInfo) prompt += `${wbInfo}\n`;
        prompt += `【用户(User)设定】：${userPersona}\n`;
        
        const enableNpcComment = chatConfig.momentNpcCommentEnabled !== false;
        if (enableNpcComment) {
            prompt += `【你手机通讯录里的NPC朋友】：${npcListStr}\n`;
        }
        prompt += `【当前时间】：${timeString}。\n\n`;
        
        prompt += `【最近的聊天记录（作为发朋友圈的灵感/背景）】：\n`;
        prompt += `${recentMsgs ? recentMsgs : '暂无聊天记录'}\n\n`;

        prompt += `请根据你的人设、当前时间、用户设定以及【最近的聊天记录】，发布一条微信朋友圈。\n`;
        prompt += `【要求】：\n`;
        prompt += `1. 朋友圈的内容通常是对最近聊天中发生的事情的感慨、吐槽、分享，或者对User的暗示。\n`;
        prompt += `2. 文案要符合日常朋友圈风格，生活化，不要太长，拒绝AI味。\n`;
        prompt += `3. 【活人感排版】：你可以自由选择纯文本、纯图片或图文并茂。\n`;
        
        if (enableNpcComment) {
            prompt += `4. 【互动感（核心）】：你可以在 comment 字段填写自己的抢沙发补充（也可以不填写）。同时，请根据【通讯录NPC朋友】列表，生成 1-3 条 NPC 对这条朋友圈的评论 (npcComments)。\n`;
            prompt += `5. 要求返回纯JSON对象，不要Markdown标记，格式如下：\n`;
            prompt += `{
  "text": "朋友圈文案内容(可留空)", 
  "imageDesc": "配图的画面描述(可留空)", 
  "comment": "你自己在该条朋友圈下的评论/补充(可留空)",
  "npcComments": [
    {"name": "NPC名字(必须从通讯录选)", "text": "NPC的评论内容"}
  ]
}\n`;
        } else {
            prompt += `4. 【互动感】：你可以在 comment 字段填写自己的抢沙发补充（也可以不填写）。\n`;
            prompt += `5. 要求返回纯JSON对象，不要Markdown标记，格式如下：\n`;
            prompt += `{
  "text": "朋友圈文案内容(可留空)", 
  "imageDesc": "配图的画面描述(可留空)", 
  "comment": "你自己在该条朋友圈下的评论/补充(可留空)"
}\n`;
        }

        const response = await fetch(`${apiConfig.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiConfig.key}` },
            body: JSON.stringify({
                model: apiConfig.model,
                messages: [{ role: "user", content: prompt }],
                temperature: parseFloat(apiConfig.temp) || 0.8,
                max_tokens: 4000
            })
        });

        const data = await response.json();
        let content = data.choices[0].message.content;
        content = content.replace(/<thinking>[\s\S]*?<\/thinking>/g, '').trim();
        content = content.replace(/```json/g, '').replace(/```/g, '').trim();
        const momentData = JSON.parse(content);

        if (momentData && (momentData.text || momentData.imageDesc)) {
            // 👇 修改：把 npcComments 传给处理函数
            wcAIHandleMomentPost(charId, momentData.text || "", momentData.imageDesc || null, momentData.comment || null, momentData.npcComments || []);
            console.log(`Char ${charId} 成功发布朋友圈`);
        }
    } catch (e) {
        console.error("朋友圈生成失败", e);
    }
}

function wcAIHandleMomentPost(charId, text, imageDesc, selfComment = null, npcComments = []) {
    const char = wcState.characters.find(c => c.id === charId);
    if (!char) return;
    
    const newMoment = {
        id: Date.now(),
        name: char.name,
        avatar: char.avatar,
        text: text,
        image: null,
        imageDesc: imageDesc,
        time: Date.now(),
        likes: [],
        comments: []
    };
    
    // 1. 如果 AI 传了自我评论，加进评论列表里
    if (selfComment && selfComment.trim() !== "") {
        newMoment.comments.push({ name: char.name, text: selfComment.trim() });
    }
    
    // 2. 把 NPC 的评论也加进去
    if (Array.isArray(npcComments) && npcComments.length > 0) {
        npcComments.forEach(npcC => {
            if (npcC.name && npcC.text) {
                newMoment.comments.push({ name: npcC.name, text: npcC.text });
            }
        });
    }
    
    wcState.moments.unshift(newMoment);
    wcSaveData();
    wcRenderMoments();
}


function wcAIHandleComment(charId, momentId, text) {
    const char = wcState.characters.find(c => c.id === charId);
    const moment = wcState.moments.find(m => m.id == momentId);
    if (!char || !moment) return;

    if (!moment.comments) moment.comments = [];
    moment.comments.push({ name: char.name, text: text });
    wcSaveData();
    wcRenderMoments();
}

function wcAIHandleReply(charId, momentId, targetName, text) {
    const char = wcState.characters.find(c => c.id === charId);
    const moment = wcState.moments.find(m => m.id == momentId);
    if (!char || !moment) return;

    if (!moment.comments) moment.comments = [];
    moment.comments.push({ name: char.name, text: `回复 ${targetName}: ${text}` });
    wcSaveData();
    wcRenderMoments();
}

function wcAIHandleLike(charId, momentId) {
    const char = wcState.characters.find(c => c.id === charId);
    const moment = wcState.moments.find(m => m.id == momentId);
    if (!char || !moment) return;
    
    if (!moment.likes) moment.likes = [];
    if (!moment.likes.includes(char.name)) {
        moment.likes.push(char.name);
        wcSaveData();
        wcRenderMoments();
    }
}

function wcAIHandleTransfer(charId, status) {
    const msgs = wcState.chats[charId] || [];
    for (let i = msgs.length - 1; i >= 0; i--) {
        const m = msgs[i];
        if (m.type === 'transfer' && m.sender === 'me' && m.status === 'pending') {
            m.status = status;
            if (status === 'rejected') {
                const amount = parseFloat(m.amount);
                wcState.wallet.balance += amount;
                wcState.wallet.transactions.push({
                    id: Date.now(), type: 'income', amount: amount, note: `转账退还`, time: Date.now()
                });
                wcAddMessage(charId, 'them', 'system', `对方已退还你的转账`, { style: 'transparent' });
            } else if (status === 'received') {
                wcAddMessage(charId, 'them', 'system', `对方已收款`, { style: 'transparent' });
            }
            wcSaveData();
            wcRenderMessages(charId);
            break;
        }
    }
}

function wcFindStickerUrlMulti(groupIds, desc) {
    // 【修复】：如果明确传入了空数组，说明没有勾选任何表情包，不应该去全部里找
    if (groupIds && groupIds.length === 0) return null;

    const groupsToSearch = (groupIds && groupIds.length > 0) 
        ? groupIds.map(id => wcState.stickerCategories[id]).filter(g => g)
        : wcState.stickerCategories;

    for (const group of groupsToSearch) {
        if (group && group.list) {
            const sticker = group.list.find(s => s.desc.trim() === desc.trim());
            if (sticker) return sticker.url;
        }
    }
    return null;
}

function wcAddMessage(charId, sender, type, content, extra = {}) {
    if (!charId) return; // 👈 加上这一行保护，防止产生无效的聊天记录
    if (!wcState.chats[charId]) wcState.chats[charId] = [];
    const msg = { 
        id: Date.now() + Math.random(),
        sender, type, content, time: Date.now(), ...extra
    };
    wcState.chats[charId].push(msg);
    
    if (sender === 'them' && type !== 'system') {
        const isChatOpen = document.getElementById('wc-view-chat-detail').classList.contains('active');
        const isSameChat = wcState.activeChatId === charId;
        
        const musicChatWin = document.getElementById('music-chat-window');
        const isMusicChatOpen = musicChatWin && musicChatWin.style.display === 'flex' && musicState.listenTogether.charId === charId;

        const char = wcState.characters.find(c => c.id === charId);
        let notifText = content;
        if (type === 'sticker') notifText = '[表情包]';
        else if (type === 'image') notifText = '[图片]';
        else if (type === 'voice') notifText = '[语音]';
        else if (type === 'transfer') notifText = '[转账]';
        else if (type === 'invite') notifText = '[恋人空间邀请]';

        // 1. 核心解耦：无论在什么页面，只要满足条件，就向系统发送真实通知请求
        if (char) {
            sendRealSystemNotification(char.name, notifText, char.avatar);
        }

        // 2. 处理应用内的网页横幅通知 (仅当不在当前聊天页面时触发)
        if ((!isChatOpen || !isSameChat) && !isMusicChatOpen) {
            if (!wcState.unreadCounts[charId]) wcState.unreadCounts[charId] = 0;
            wcState.unreadCounts[charId]++;
            
            if (char) {
                wcShowIOSNotification(char, notifText);
            }
            
            if (document.getElementById('wc-view-chat').classList.contains('active')) {
                wcRenderChats();
            }
        } else {
            // 如果在当前聊天页面，虽然不弹网页横幅，但如果开启了全程通知，需要播放提示音
            if (isAlwaysRealNotifEnabled) {
                playNotificationSound();
            }
        }
    }

    // ==========================================
    // 核心修复：群聊记忆同步 & 恋人空间面具隔离逻辑
    // ==========================================
    if (type !== 'system' && !extra.isError) {
        const targetChar = wcState.characters.find(c => c.id === charId);
        
        if (targetChar) {
            let senderNameStr = "";
            if (sender === 'me') {
                senderNameStr = (targetChar.chatConfig && targetChar.chatConfig.userName) ? targetChar.chatConfig.userName : wcState.user.name;
            } else {
                senderNameStr = extra.senderName || targetChar.name;
            }

            let contentStr = content;
            if (type === 'sticker') contentStr = '[表情包]';
            else if (type === 'image') contentStr = '[图片]';
            else if (type === 'voice') contentStr = '[语音]';
            else if (type === 'transfer') contentStr = '[转账]';

            // 1. 如果是群聊，将消息同步给群里的所有 NPC 成员的单聊记忆中
            if (targetChar.isGroup && targetChar.members) {
                targetChar.members.forEach(memberId => {
                    if (memberId === 'user') return;
                    wcAddMessage(memberId, 'system', 'system', 
                        `[群聊记忆同步: 在【${targetChar.name}】群聊中，${senderNameStr} 发送了消息: "${contentStr}"]`, 
                        { hidden: true }
                    );
                });
            }

            // 2. 恋人空间同步逻辑
            if (lsState.isLinked && lsState.boundCharId && charId !== lsState.boundCharId) {
                const boundChar = wcState.characters.find(c => c.id === lsState.boundCharId);
                
                if (boundChar) {
                    const currentMask = (targetChar.chatConfig && targetChar.chatConfig.userAvatar) ? targetChar.chatConfig.userAvatar : wcState.user.avatar;
                    const boundMask = (boundChar.chatConfig && boundChar.chatConfig.userAvatar) ? boundChar.chatConfig.userAvatar : wcState.user.avatar;
                    
                    if (currentMask === boundMask) {
                        const isLoverInGroup = targetChar.isGroup && targetChar.members && targetChar.members.includes(lsState.boundCharId);
                        
                        if (!isLoverInGroup) {
                            if (targetChar.isGroup) {
                                if (sender === 'me') {
                                    lsAddFeed(`你在 ${targetChar.name} 群聊发送了消息: "${contentStr}"`, null, msg.id);
                                    wcAddMessage(lsState.boundCharId, 'system', 'system', 
                                        `[系统提示: 你的恋人(User)刚刚在【${targetChar.name}】群聊中发送了一条消息: "${contentStr}"。请注意，你们开启了账号关联，你能感知到这一切。]`, 
                                        { hidden: true }
                                    );
                                } else if (sender === 'them') {
                                    lsAddFeed(`${targetChar.name} 群聊的 ${senderNameStr} 发送了消息: "${contentStr}"`, targetChar.avatar, msg.id);
                                    wcAddMessage(lsState.boundCharId, 'system', 'system', 
                                        `[系统提示: 你的恋人(User)所在的【${targetChar.name}】群聊中，${senderNameStr} 发送了一条消息: "${contentStr}"。请注意，你们开启了账号关联，你能感知到这一切。]`, 
                                        { hidden: true }
                                    );
                                }
                            } else {
                                if (sender === 'me') {
                                    lsAddFeed(`你给 ${targetChar.name} 发送了消息: "${contentStr}"`, null, msg.id);
                                    wcAddMessage(lsState.boundCharId, 'system', 'system', 
                                        `[系统提示: 你的恋人(User)刚刚给 ${targetChar.name} 发送了一条消息: "${contentStr}"。请注意，你们开启了账号关联，你能感知到这一切。]`, 
                                        { hidden: true }
                                    );
                                } else if (sender === 'them') {
                                    lsAddFeed(`${targetChar.name} 给你发送了消息: "${contentStr}"`, targetChar.avatar, msg.id);
                                    wcAddMessage(lsState.boundCharId, 'system', 'system', 
                                        `[系统提示: ${targetChar.name} 刚刚给你的恋人(User)发送了一条消息: "${contentStr}"。请注意，你们开启了账号关联，你能感知到这一切。]`, 
                                        { hidden: true }
                                    );
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    const char = wcState.characters.find(c => c.id === charId);
    if (char && char.chatConfig && char.chatConfig.summaryTrigger > 0) {
        const triggerCount = char.chatConfig.summaryTrigger;
        const totalMsgs = wcState.chats[charId].length;
        
        if (totalMsgs % triggerCount === 0) {
            const start = totalMsgs - triggerCount;
            const end = totalMsgs - 1;
            wcAutoGenerateSummary(charId, start, end);
        }
    }

    wcSaveData();
    if (wcState.activeChatId === charId) {
        wcRenderMessages(charId);
        wcScrollToBottom();
    }
    
    // 【修复】：同步更新音乐播放器里的迷你聊天窗口
    if (typeof musicState !== 'undefined' && 
        musicState.listenTogether && 
        musicState.listenTogether.active && 
        musicState.listenTogether.charId === charId) {
        const musicChatWin = document.getElementById('music-chat-window');
        if (musicChatWin && (musicChatWin.style.display === 'flex' || musicChatWin.style.display === 'block')) {
            if (typeof musicRenderChatMessages === 'function') {
                musicRenderChatMessages();
            }
        }
    }
}

// --- iOS Notification Logic ---
function wcShowIOSNotification(char, text) {
    const container = document.getElementById('ios-notification-container');
    if (!container) return;
    
    // 【核心修复】：在添加新通知前，清空旧通知，实现覆盖效果
    container.innerHTML = ''; 
    
    const banner = document.createElement('div');
    banner.className = 'ios-notification-banner';
    
    const now = new Date();
    const timeStr = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;

    banner.innerHTML = `
        <img src="${char.avatar}" class="ios-notif-icon">
        <div class="ios-notif-content">
            <div class="ios-notif-header">
                <span class="ios-notif-title">${char.name}</span>
                <span class="ios-notif-time">现在</span>
            </div>
            <div class="ios-notif-msg">${text}</div>
        </div>
    `;

    banner.onclick = () => {
        if (!document.getElementById('wechatModal').classList.contains('open')) {
            openWechat();
        }
        if (document.getElementById('wc-view-phone-sim').classList.contains('active')) {
            wcClosePhoneSim();
        }
        
        wcOpenChat(char.id);
        banner.classList.remove('active');
        setTimeout(() => banner.remove(), 400);
    };

    container.appendChild(banner);

    requestAnimationFrame(() => {
        banner.classList.add('active');
    });

    setTimeout(() => {
        if (banner.parentElement) {
            banner.classList.remove('active');
            setTimeout(() => banner.remove(), 400);
        }
    }, 5000);
    
    // 👇 触发声音与震动触感
    playNotificationSound();
}

// --- iOS Loading Overlay Functions ---
function wcShowLoading(text = "正在生成内容...") {
    const overlay = document.getElementById('wc-ios-loading-overlay');
    const spinner = document.getElementById('wc-loading-spinner');
    const success = document.getElementById('wc-loading-success');
    const error = document.getElementById('wc-loading-error');
    const textEl = document.getElementById('wc-loading-text');

    spinner.style.display = 'block';
    success.classList.add('hidden');
    error.classList.add('hidden');
    textEl.innerText = text;
    overlay.classList.remove('hidden');
}

function wcShowSuccess(text = "生成成功") {
    const spinner = document.getElementById('wc-loading-spinner');
    const success = document.getElementById('wc-loading-success');
    const textEl = document.getElementById('wc-loading-text');

    spinner.style.display = 'none';
    success.classList.remove('hidden');
    textEl.innerText = text;

    setTimeout(() => {
        document.getElementById('wc-ios-loading-overlay').classList.add('hidden');
    }, 2000);
}

function wcShowError(text = "生成失败") {
    const spinner = document.getElementById('wc-loading-spinner');
    const error = document.getElementById('wc-loading-error');
    const textEl = document.getElementById('wc-loading-text');

    spinner.style.display = 'none';
    error.classList.remove('hidden');
    textEl.innerText = text;

    setTimeout(() => {
        document.getElementById('wc-ios-loading-overlay').classList.add('hidden');
    }, 2500);
}

async function wcAutoGenerateSummary(charId, start, end) {
    const char = wcState.characters.find(c => c.id === charId);
    const msgs = wcState.chats[charId] || [];
    const sliceMsgs = msgs.slice(start, end + 1);
    const apiConfig = await getActiveApiConfig('chat');
    
    if (!apiConfig || !apiConfig.key) return;

    // 检查限制
    const limit = apiConfig.limit || 50;
    if (limit > 0 && sessionApiCallCount >= limit) return;
    sessionApiCallCount++;

    try {
        let prompt = `请总结以下对话的主要内容，提取关键信息和情感变化，字数控制在200字以内。\n`;
        
        if (char.chatConfig && char.chatConfig.summaryWorldbookEntries) {
            prompt += `\n【参考背景】\n`;
            char.chatConfig.summaryWorldbookEntries.forEach(id => {
                const entry = worldbookEntries.find(e => e.id.toString() === id.toString());
                if (entry) prompt += `- ${entry.title}: ${entry.desc}\n`;
            });
        }

        prompt += `\n【对话】\n`;
        sliceMsgs.forEach(m => {
            const sender = m.sender === 'me' ? '用户' : char.name;
            let content = m.content;
            if (m.type !== 'text') content = `[${m.type}]`;
            prompt += `${sender}: ${content}\n`;
        });

        const response = await fetch(`${apiConfig.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiConfig.key}` },
            body: JSON.stringify({
                model: apiConfig.model,
                messages: [{ role: "user", content: prompt }],
                temperature: parseFloat(apiConfig.temp) || 0.5

            })
        });

        const data = await response.json();
        let summary = data.choices[0].message.content;
        summary = summary.replace(/<thinking>[\s\S]*?<\/thinking>/g, '').trim();

        if (!char.memories) char.memories = [];
        char.memories.unshift({
            id: Date.now(),
            type: 'summary',
            content: `[自动总结 ${start}-${end}] ${summary}`,
            time: Date.now()
        });
        wcSaveData();
        if (document.getElementById('wc-view-memory').classList.contains('active')) {
            wcRenderMemories();
        }
        console.log("自动总结完成");

    } catch (e) {
        console.error("自动总结失败", e);
    }
}

// --- WeChat Panels ---
function wcToggleStickerPanel() {
    if (wcState.isStickerPanelOpen) {
        wcCloseAllPanels();
    } else {
        wcState.isMorePanelOpen = false;
        wcState.isStickerPanelOpen = true;
        wcUpdatePanelUI();
    }
}

function wcToggleMorePanel() {
    if (wcState.isMorePanelOpen) {
        wcCloseAllPanels();
    } else {
        wcState.isStickerPanelOpen = false;
        wcState.isMorePanelOpen = true;
        wcUpdatePanelUI();
    }
}

function wcCloseAllPanels() {
    wcState.isStickerPanelOpen = false;
    wcState.isMorePanelOpen = false;
    wcState.isStickerDeleteMode = false;
    wcUpdatePanelUI();
}

function wcUpdatePanelUI() {
    const stickerPanel = document.getElementById('wc-sticker-panel');
    const morePanel = document.getElementById('wc-more-panel');
    const footer = document.getElementById('wc-chat-footer');
    const scrollArea = document.getElementById('wc-chat-messages');

    stickerPanel.classList.remove('active');
    morePanel.classList.remove('active');
    footer.classList.remove('panel-active');
    scrollArea.classList.remove('panel-open');

    if (wcState.isStickerPanelOpen) {
        stickerPanel.classList.add('active');
        footer.classList.add('panel-active');
        scrollArea.classList.add('panel-open');
        wcRenderStickerPanel();
    } else if (wcState.isMorePanelOpen) {
        morePanel.classList.add('active');
        footer.classList.add('panel-active');
        scrollArea.classList.add('panel-open');
    }
    wcScrollToBottom();
}

// --- WeChat Stickers ---
function wcRenderStickerPanel() {
    const container = document.getElementById('wc-sticker-tabs');
    container.innerHTML = '';
    wcState.stickerCategories.forEach((cat, index) => {
        const tab = document.createElement('div');
        tab.className = `wc-sticker-tab-item ${index === wcState.activeStickerCategoryIndex ? 'active' : ''}`;
        tab.innerText = cat.name;
        tab.onclick = () => { wcState.activeStickerCategoryIndex = index; wcRenderStickerPanel(); };
        container.appendChild(tab);
    });

    const grid = document.getElementById('wc-sticker-grid');
    grid.innerHTML = '';
    const currentCat = wcState.stickerCategories[wcState.activeStickerCategoryIndex];
    if (!currentCat || !currentCat.list) return;

    currentCat.list.forEach((sticker, index) => {
        const item = document.createElement('div');
        item.className = `wc-sticker-item ${wcState.isStickerDeleteMode ? 'shake' : ''}`;
        
        item.style.display = 'flex';
        item.style.flexDirection = 'column';
        item.style.alignItems = 'center';
        item.style.justifyContent = 'center';
        item.style.padding = '5px';
        
        const img = document.createElement('img');
        img.src = sticker.url;
        img.style.width = '50px';
        img.style.height = '50px';
        img.style.objectFit = 'contain';
        item.appendChild(img);

        const desc = document.createElement('div');
        desc.style.fontSize = '10px';
        desc.style.color = '#888';
        desc.style.textAlign = 'center';
        desc.style.marginTop = '4px';
        desc.style.overflow = 'hidden';
        desc.style.textOverflow = 'ellipsis';
        desc.style.whiteSpace = 'nowrap';
        desc.style.width = '100%';
        desc.style.maxWidth = '60px';
        desc.innerText = sticker.desc;
        item.appendChild(desc);

        if (wcState.isStickerDeleteMode) {
            const badge = document.createElement('div');
            badge.className = 'wc-sticker-delete-badge';
            badge.innerText = '×';
            badge.onclick = (e) => { 
                e.stopPropagation(); 
                currentCat.list.splice(index, 1); 
                wcSaveData(); 
                wcRenderStickerPanel(); 
            };
            item.appendChild(badge);
        } else {
            item.onclick = (e) => {
                e.stopPropagation();
                wcAddMessage(wcState.activeChatId, 'me', 'sticker', sticker.url);
            };
        }
        grid.appendChild(item);
    });
}

function wcOpenStickerOptions(e) {
    if(e) e.stopPropagation();
    const btnText = document.getElementById('wc-btn-sticker-manage-text');
    btnText.innerText = wcState.isStickerDeleteMode ? "退出管理模式" : "管理表情 (删除)";
    btnText.style.color = wcState.isStickerDeleteMode ? "#000" : "#007AFF";
    wcOpenModal('wc-sticker-options-modal');
}

function wcToggleStickerDeleteMode() {
    wcState.isStickerDeleteMode = !wcState.isStickerDeleteMode;
    wcRenderStickerPanel();
}

function wcImportStickers() {
    const catName = document.getElementById('wc-sticker-category-name').value.trim();
    const data = document.getElementById('wc-sticker-import-text').value;
    if (!catName || !data) return alert('请填写完整');
    
    const lines = data.split('\n');
    const newStickers = [];
    
    // 修复1：更健壮的解析逻辑，支持多行批量导入，且不会被 URL 里的冒号干扰
    lines.forEach(line => {
        line = line.trim();
        if (!line) return; // 跳过空行
        
        // 找到第一个冒号（中英文皆可）的位置
        const colonIndex = line.search(/[:：]/);
        if (colonIndex !== -1) {
            const desc = line.substring(0, colonIndex).trim();
            const url = line.substring(colonIndex + 1).trim();
            if (desc && url) {
                newStickers.push({ desc, url });
            }
        }
    });
    
    if (newStickers.length === 0) {
        return alert('格式错误，未识别到有效的表情包数据。\n请确保格式为“描述:图片链接”，每行一个。');
    }
    
    // 修复2：检查是否已经存在同名的表情包分组
    let targetIndex = wcState.stickerCategories.findIndex(cat => cat.name === catName);
    
    if (targetIndex !== -1) {
        // 如果存在同名分组，则将新表情包追加到该分组末尾
        wcState.stickerCategories[targetIndex].list.push(...newStickers);
    } else {
        // 如果不存在，则创建全新的分组
        wcState.stickerCategories.push({ name: catName, list: newStickers });
        targetIndex = wcState.stickerCategories.length - 1;
    }
    
    // 同步追加到“全部”分组 (索引 0)
    // 注意：如果用户填写的名字刚好是"全部" (targetIndex === 0)，上面已经追加过了，避免重复
    if (targetIndex !== 0) {
        wcState.stickerCategories[0].list.push(...newStickers);
    }
    
    wcSaveData();
    wcCloseModal('wc-import-sticker-modal');
    
    // 自动切换到当前导入的分组并刷新面板
    wcState.activeStickerCategoryIndex = targetIndex;
    wcRenderStickerPanel();
    
    // 清空输入框，方便下次导入
    document.getElementById('wc-sticker-import-text').value = '';
    
    alert(`成功导入 ${newStickers.length} 个表情包到分组 "${catName}"！`);
}

function wcOpenDeleteCategoriesModal() {
    const list = document.getElementById('wc-sticker-delete-cats-list');
    list.innerHTML = '';
    wcState.stickerCategories.forEach((cat, index) => {
        if (index === 0) return; 
        const div = document.createElement('div');
        div.className = 'wc-list-item';
        div.style.background = 'white';
        div.innerHTML = `<div class="wc-item-content"><div class="wc-item-title">${cat.name}</div></div><input type="checkbox" class="wc-delete-cat-checkbox" value="${index}">`;
        list.appendChild(div);
    });
    wcOpenModal('wc-sticker-delete-cats-modal');
}

function wcConfirmDeleteCategories() {
    const checkboxes = document.querySelectorAll('.wc-delete-cat-checkbox:checked');
    const indices = Array.from(checkboxes).map(cb => parseInt(cb.value)).sort((a,b)=>b-a);
    indices.forEach(i => wcState.stickerCategories.splice(i, 1));
    
    const allStickers = [];
    for (let i = 1; i < wcState.stickerCategories.length; i++) {
        allStickers.push(...wcState.stickerCategories[i].list);
    }
    wcState.stickerCategories[0].list = allStickers;

    wcState.activeStickerCategoryIndex = 0;
    wcSaveData();
    wcCloseModal('wc-sticker-delete-cats-modal');
    wcRenderStickerPanel();
}

// --- WeChat More Actions ---
function wcActionRoll() {
    const msgs = wcState.chats[wcState.activeChatId];
    if (!msgs || msgs.length === 0) return;

    let lastMeIndex = -1;
    for (let i = msgs.length - 1; i >= 0; i--) {
        if (msgs[i].sender === 'me') {
            lastMeIndex = i;
            break;
        }
    }

    const newMsgs = [];
    if (lastMeIndex !== -1) {
        // 保留最后一次用户发言及之前的所有消息
        for (let i = 0; i <= lastMeIndex; i++) {
            newMsgs.push(msgs[i]);
        }
        // 核心修复：保留用户发言之后的系统消息（NPC消息），只删除AI的回复
        for (let i = lastMeIndex + 1; i < msgs.length; i++) {
            if (msgs[i].type === 'system') {
                newMsgs.push(msgs[i]);
            } else {
                lsRemoveFeedByMsgId(msgs[i].id);
            }
        }
    } else {
        // 如果没有用户发言，保留所有系统消息，删除AI回复
        for (let i = 0; i < msgs.length; i++) {
            if (msgs[i].type === 'system') {
                newMsgs.push(msgs[i]);
            } else {
                lsRemoveFeedByMsgId(msgs[i].id);
            }
        }
    }

    wcState.chats[wcState.activeChatId] = newMsgs;
    wcSaveData();
    wcRenderMessages(wcState.activeChatId);
    wcTriggerAI();
    wcCloseAllPanels();
}

function wcActionVoice() {
    wcCloseAllPanels();
    wcOpenGeneralInput("输入语音内容", (text) => {
        if (text) wcAddMessage(wcState.activeChatId, 'me', 'voice', text);
    });
}

function wcToggleVoiceText(msgId) {
    const msgs = wcState.chats[wcState.activeChatId];
    const msg = msgs.find(m => m.id === msgId);
    if (msg) {
        msg.showText = !msg.showText;
        wcRenderMessages(wcState.activeChatId);
    }
}

function wcActionImageDesc() {
    const desc = prompt("请输入图片描述：");
    if (desc) wcAddMessage(wcState.activeChatId, 'me', 'text', `[图片描述] ${desc}`);
}

// --- 预览图片 ---
function wcPreviewImage(src) {
    const win = window.open("", "_blank");
    win.document.write(`<img src="${src}" style="width:100%">`);
}

// --- WeChat Memory ---
function wcActionMemory() {
    wcCloseAllPanels();
    wcOpenMemoryPage();
}

// ==========================================
// 极简韩系 INS 风回忆日记逻辑 (黑白星空塔罗牌版)
// ==========================================

// 全局变量用于塔罗牌状态
let insTarotCurrentIndex = 0;
let insTarotCardsData = [];
let insCurrentEditingMemId = null;

// 动态生成星空背景的函数
function generateUniverseBg() {
    let html = '<div class="ins-mem-universe-bg">';
    // 生成 30 个随机星光
    for(let i=0; i<30; i++) {
        const size = Math.random() * 3 + 1;
        const left = Math.random() * 100;
        const top = Math.random() * 100;
        const duration = Math.random() * 3 + 2;
        html += `<div class="ins-mem-star" style="width:${size}px; height:${size}px; left:${left}%; top:${top}%; --duration:${duration}s;"></div>`;
    }
    // 生成 5 条流苏/流星
    for(let i=0; i<5; i++) {
        const left = Math.random() * 100;
        const duration = Math.random() * 5 + 5;
        const delay = Math.random() * 5;
        html += `<div class="ins-mem-tassel" style="left:${left}%; --duration:${duration}s; animation-delay:${delay}s;"></div>`;
    }
    html += '</div>';
    return html;
}

function wcOpenMemoryPage() {
    document.getElementById('wc-view-chat-detail').classList.remove('active');
    const memView = document.getElementById('wc-view-memory');
    memView.classList.add('active');
    
    // 隐藏全局的微信 Navbar
    const globalNavbar = document.querySelector('.wc-navbar');
    if (globalNavbar) globalNavbar.style.display = 'none';

    // 注入全新的 HTML 结构 (修复羽毛笔点击，增加字数统计)
    memView.innerHTML = `
        ${generateUniverseBg()}
        <header class="ins-mem-header">
            <div class="ins-mem-title-box" onclick="wcCloseMemoryPage()">
                <span class="ins-mem-title-1">回忆</span>
                <span class="ins-mem-title-2">日记</span>
            </div>
            <div class="ins-mem-line"></div>
            <div class="ins-mem-icons">
                <!-- 1. 羽毛笔 (调用高级弹窗手动添加记忆) -->
                <div class="ins-mem-icon-btn" onclick="insOpenManualAddModal()" title="手动添加记忆">
                    <svg viewBox="0 0 24 24">
                        <path d="M20.71 7.04c.39-.39.39-1.04 0-1.41l-2.34-2.34c-.37-.39-1.02-.39-1.41 0l-1.84 1.83 3.75 3.75M3 17.25V21h3.75L17.81 9.93l-3.75-3.75L3 17.25z" fill="none" stroke="currentColor" stroke-width="1.5"/>
                    </svg>
                </div>
                <!-- 2. 魔法星轨 (打开更多操作：手动总结 / AI读取条数) -->
                <div class="ins-mem-icon-btn" onclick="wcOpenModal('wc-modal-memory-actions')" title="更多操作">
                    <svg viewBox="0 0 24 24">
                        <path d="M12 3L13.5 9.5L20 11L13.5 12.5L12 19L10.5 12.5L4 11L10.5 9.5L12 3Z" fill="currentColor" stroke="none"/>
                        <circle cx="19" cy="5" r="1.5" fill="currentColor" stroke="none"/>
                        <circle cx="5" cy="18" r="1" fill="currentColor" stroke="none"/>
                    </svg>
                </div>
                <!-- 3. 调音滑块 (回忆设置：触发条数/世界书) -->
                <div class="ins-mem-icon-btn" onclick="wcOpenMemorySettingsModal()" title="回忆设置">
                    <svg viewBox="0 0 24 24">
                        <line x1="4" y1="8" x2="20" y2="8" />
                        <line x1="4" y1="16" x2="20" y2="16" />
                        <circle cx="9" cy="8" r="2" fill="currentColor" />
                        <circle cx="16" cy="16" r="2" fill="currentColor" />
                    </svg>
                </div>
            </div>
        </header>
        <main class="ins-mem-main" id="wc-memory-list-container"></main>

        <!-- 塔罗牌堆叠视图 -->
        <div class="ins-tarot-overlay" id="insTarotModal">
            <div class="ins-tarot-close" onclick="insCloseTarot()">×</div>
            <div class="ins-tarot-date-title" id="insTarotDateTitle">DATE</div>
            <div class="ins-tarot-container" id="insTarotContainer" 
                 ontouchstart="insTarotTouchStart(event)" 
                 ontouchmove="insTarotTouchMove(event)" 
                 ontouchend="insTarotTouchEnd(event)">
            </div>
        </div>

        <!-- 300x500 详情编辑弹窗 (带字数统计) -->
        <div class="ins-mem-detail-overlay" id="insMemDetailModal">
            <div class="ins-mem-detail-card">
                <div class="ins-mem-detail-header">
                    <span class="ins-mem-detail-date" id="insMemDetailDate">TIME</span>
                    <span class="ins-mem-detail-close" onclick="insCloseMemDetail()">×</span>
                </div>
                <input type="text" class="ins-mem-detail-title" id="insMemDetailTitle" placeholder="标题">
                <!-- 绑定 oninput 实时更新字数 -->
                <textarea class="ins-mem-detail-textarea" id="insMemDetailContent" placeholder="记录下这一刻..." oninput="document.getElementById('insMemWordCount').innerText = this.value.length + ' 字'"></textarea>
                <div class="ins-mem-detail-footer" style="display: flex; justify-content: space-between; align-items: center;">
                    <span id="insMemWordCount" style="color: rgba(255,255,255,0.5); font-size: 12px; font-family: monospace;">0 字</span>
                    <button class="ins-mem-detail-save" onclick="insSaveMemDetail()">SAVE</button>
                </div>
            </div>
        </div>
    `;

    wcRenderMemories();
}

function wcCloseMemoryPage() {
    document.getElementById('wc-view-memory').classList.remove('active');
    document.getElementById('wc-view-chat-detail').classList.add('active');
    
    const globalNavbar = document.querySelector('.wc-navbar');
    if (globalNavbar) globalNavbar.style.display = 'flex';
    
    const char = wcState.characters.find(c => c.id === wcState.activeChatId);
    if (char) updateChatTopBarStatus(char);
}

function wcRenderMemories() {
    const container = document.getElementById('wc-memory-list-container');
    if (!container) return;
    container.innerHTML = '';
    
    const char = wcState.characters.find(c => c.id === wcState.activeChatId);
    if (!char.memories) char.memories = [];

    if (char.memories.length === 0) {
        container.innerHTML = '<div style="text-align: center; color: #555; padding-top: 50px; font-family: Georgia, serif; font-style: italic;">星空寂寥，暂无回忆...</div>';
        return;
    }

    const groups = {};
    char.memories.forEach(mem => {
        const d = new Date(mem.time);
        const dateKey = `${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
        if (!groups[dateKey]) groups[dateKey] = [];
        groups[dateKey].push(mem);
    });

    const colorClasses = ['ins-bg-white', 'ins-bg-gray', 'ins-bg-pink', 'ins-bg-blue', 'ins-bg-green'];

    Object.keys(groups).sort((a, b) => b.localeCompare(a)).forEach(dateKey => {
        const row = document.createElement('div');
        row.className = 'ins-mem-row';
        
        let rowHtml = `
            <div class="ins-mem-time-node" onclick="insOpenTarot('${dateKey}')">
                <div class="ins-mem-node-icon">
                    <svg viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" transform="rotate(45 12 12)"/></svg>
                </div>
                <div class="ins-mem-date-text">${dateKey}</div>
                <div class="ins-mem-date-hint">点击展开</div>
            </div>
            <div class="ins-mem-cards-scroll">
        `;

        groups[dateKey].forEach((mem, idx) => {
            const d = new Date(mem.time);
            const timeStr = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
            const colorClass = colorClasses[idx % colorClasses.length];
            
            let title = '记忆碎片';
            let content = mem.content;
            if (mem.type === 'summary') {
                if (mem.content.includes('[自动总结')) title = '自动总结';
                else if (mem.content.includes('[手动总结')) title = '手动总结';
                else title = '总结';
                content = mem.content.replace(/\[.*?\]\s*/, ''); 
            } else if (mem.type === 'manual') {
                title = '手动添加'; 
            }

            const safeContent = content.replace(/'/g, "&#39;").replace(/"/g, "&quot;");

            rowHtml += `
                <div class="ins-mem-card ${colorClass}" onclick="insOpenMemDetail(${mem.id}, '${title}', '${safeContent}', '${dateKey} ${timeStr}')">
                    <div class="ins-mem-delete-btn" onclick="wcDeleteMemory(event, ${mem.id})">×</div>
                    <div class="ins-mem-card-title">${title}</div>
                    <div class="ins-mem-card-time">${timeStr}</div>
                </div>
            `;
        });

        rowHtml += `</div>`;
        row.innerHTML = rowHtml;
        container.appendChild(row);
    });
}

function insOpenTarot(dateKey) {
    const char = wcState.characters.find(c => c.id === wcState.activeChatId);
    if (!char || !char.memories) return;

    insTarotCardsData = char.memories.filter(mem => {
        const d = new Date(mem.time);
        return `${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}` === dateKey;
    });

    if (insTarotCardsData.length === 0) return;

    document.getElementById('insTarotDateTitle').innerText = dateKey;
    insTarotCurrentIndex = 0;
    insRenderTarotCards();
    
    document.getElementById('insTarotModal').classList.add('active');
}

function insCloseTarot() {
    document.getElementById('insTarotModal').classList.remove('active');
}

function insRenderTarotCards() {
    const container = document.getElementById('insTarotContainer');
    container.innerHTML = '';

    insTarotCardsData.forEach((mem, index) => {
        const d = new Date(mem.time);
        const timeStr = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
        
        let title = '记忆碎片';
        let content = mem.content;
        if (mem.type === 'summary') {
            if (mem.content.includes('[自动总结')) title = '自动总结';
            else if (mem.content.includes('[手动总结')) title = '手动总结';
            else title = '总结';
            content = mem.content.replace(/\[.*?\]\s*/, '');
        } else if (mem.type === 'manual') {
            title = '手动添加';
        }

        const card = document.createElement('div');
        card.className = `ins-tarot-card`;
        
        card.innerHTML = `
            <div class="ins-tarot-card-title">${title}</div>
            <div class="ins-tarot-card-desc">${content}</div>
            <div class="ins-tarot-card-time">${timeStr}</div>
        `;

        card.onclick = () => {
            if (index === insTarotCurrentIndex) {
                const dateKey = document.getElementById('insTarotDateTitle').innerText;
                const safeContent = content.replace(/'/g, "&#39;").replace(/"/g, "&quot;");
                insOpenMemDetail(mem.id, title, safeContent, `${dateKey} ${timeStr}`);
            } else {
                insTarotCurrentIndex = index;
                insUpdateTarotTransforms();
            }
        };

        container.appendChild(card);
    });

    insUpdateTarotTransforms();
}

function insUpdateTarotTransforms() {
    const cards = document.querySelectorAll('.ins-tarot-card');
    cards.forEach((card, index) => {
        const offset = index - insTarotCurrentIndex;
        
        if (offset === 0) {
            card.style.transform = `translateX(0) scale(1) translateZ(0)`;
            card.style.zIndex = 10;
            card.style.opacity = 1;
            card.style.filter = 'none';
        } else if (offset < 0) {
            card.style.transform = `translateX(${offset * 60}px) scale(0.85) rotateY(15deg) translateZ(-100px)`;
            card.style.zIndex = 5 + offset;
            card.style.opacity = 1 - Math.abs(offset) * 0.3;
            card.style.filter = 'brightness(0.5)';
        } else {
            card.style.transform = `translateX(${offset * 60}px) scale(0.85) rotateY(-15deg) translateZ(-100px)`;
            card.style.zIndex = 5 - offset;
            card.style.opacity = 1 - Math.abs(offset) * 0.3;
            card.style.filter = 'brightness(0.5)';
        }
    });
}

let insTarotStartX = 0;
function insTarotTouchStart(e) { insTarotStartX = e.touches[0].clientX; }
function insTarotTouchMove(e) { e.preventDefault(); }
function insTarotTouchEnd(e) {
    const endX = e.changedTouches[0].clientX;
    const diff = endX - insTarotStartX;
    if (diff > 50 && insTarotCurrentIndex > 0) {
        insTarotCurrentIndex--;
        insUpdateTarotTransforms();
    } else if (diff < -50 && insTarotCurrentIndex < insTarotCardsData.length - 1) {
        insTarotCurrentIndex++;
        insUpdateTarotTransforms();
    }
}

// ==========================================
// 详情编辑与【新增】手动添加弹窗逻辑
// ==========================================

// 点击羽毛笔触发：复用高级弹窗进行新建
function insOpenManualAddModal() {
    insCurrentEditingMemId = null; // null 代表新建
    document.getElementById('insMemDetailTitle').value = '手动添加';
    document.getElementById('insMemDetailContent').value = '';
    document.getElementById('insMemWordCount').innerText = '0 字';
    
    const now = new Date();
    const dateStr = `${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    document.getElementById('insMemDetailDate').innerText = dateStr;
    
    document.getElementById('insMemDetailModal').classList.add('active');
}

function insOpenMemDetail(id, title, content, dateStr) {
    insCurrentEditingMemId = id;
    document.getElementById('insMemDetailTitle').value = title;
    document.getElementById('insMemDetailContent').value = content;
    document.getElementById('insMemWordCount').innerText = content.length + ' 字'; // 初始化字数
    document.getElementById('insMemDetailDate').innerText = dateStr;
    document.getElementById('insMemDetailModal').classList.add('active');
}

function insCloseMemDetail() {
    document.getElementById('insMemDetailModal').classList.remove('active');
    insCurrentEditingMemId = null;
}

function insSaveMemDetail() {
    const char = wcState.characters.find(c => c.id === wcState.activeChatId);
    if (!char) return;
    if (!char.memories) char.memories = [];

    const newTitle = document.getElementById('insMemDetailTitle').value.trim();
    const newContent = document.getElementById('insMemDetailContent').value.trim();
    
    if (!newContent) {
        alert("记忆内容不能为空哦~");
        return;
    }

    if (insCurrentEditingMemId) {
        // 修改已有记忆
        const mem = char.memories.find(m => m.id === insCurrentEditingMemId);
        if (mem) {
            if (mem.type === 'summary') {
                const prefixMatch = mem.content.match(/^\[.*?\]\s*/);
                const prefix = prefixMatch ? prefixMatch[0] : '[手动总结] ';
                mem.content = prefix + newContent;
            } else {
                mem.content = newContent;
            }
        }
    } else {
        // 新建手动记忆 (羽毛笔触发)
        char.memories.unshift({
            id: Date.now(),
            type: 'manual',
            content: newContent,
            time: Date.now()
        });
    }
    
    wcSaveData();
    wcRenderMemories();
    
    // 如果塔罗牌开着，同步刷新塔罗牌
    if (document.getElementById('insTarotModal').classList.contains('active')) {
        const dateKey = document.getElementById('insTarotDateTitle').innerText;
        insOpenTarot(dateKey);
    }
    
    insCloseMemDetail();
}

// 覆盖原有的删除逻辑
window.wcDeleteMemory = function(event, id) {
    event.stopPropagation(); // 阻止触发打开详情
    if (confirm("确定要将这段记忆化作尘埃吗？")) {
        const char = wcState.characters.find(c => c.id === wcState.activeChatId);
        if (char && char.memories) {
            char.memories = char.memories.filter(m => m.id !== id);
            wcSaveData();
            wcRenderMemories();
            
            // 如果塔罗牌开着，同步刷新塔罗牌
            if (document.getElementById('insTarotModal').classList.contains('active')) {
                const dateKey = document.getElementById('insTarotDateTitle').innerText;
                insOpenTarot(dateKey);
            }
        }
    }
};

function wcOpenMemorySummaryModal() {
    const msgs = wcState.chats[wcState.activeChatId] || [];
    document.getElementById('wc-mem-total-count-label').innerText = `当前聊天总层数: ${msgs.length}`;
    
    const list = document.getElementById('wc-mem-summary-wb-list');
    list.innerHTML = ''; // 默认不选
    document.getElementById('wc-mem-summary-wb-count').innerText = `已选 0 项`;
    
    wcOpenModal('wc-modal-memory-summary');
}

function wcOpenMemorySettingsModal() {
    const char = wcState.characters.find(c => c.id === wcState.activeChatId);
    if (!char) return;
    if (!char.chatConfig) char.chatConfig = {};

    document.getElementById('wc-mem-setting-trigger').value = char.chatConfig.summaryTrigger || 0;

    const list = document.getElementById('wc-mem-setting-wb-list');
    list.innerHTML = '';
    let memWbCount = 0;
    if (char.chatConfig.summaryWorldbookEntries) {
        char.chatConfig.summaryWorldbookEntries.forEach(id => {
            list.innerHTML += `<input type="checkbox" value="${id}" checked>`;
            memWbCount++;
        });
    }
    document.getElementById('wc-mem-setting-wb-count').innerText = `已选 ${memWbCount} 项`;

    wcOpenModal('wc-modal-memory-settings');
}

function wcSaveMemorySettings() {
    const char = wcState.characters.find(c => c.id === wcState.activeChatId);
    if (!char) return;
    if (!char.chatConfig) char.chatConfig = {};

    const triggerCount = parseInt(document.getElementById('wc-mem-setting-trigger').value) || 0;
    char.chatConfig.summaryTrigger = triggerCount;

    const checkboxes = document.querySelectorAll('#wc-mem-setting-wb-list input[type="checkbox"]:checked');
    char.chatConfig.summaryWorldbookEntries = Array.from(checkboxes).map(cb => cb.value);

    wcSaveData();
    wcCloseModal('wc-modal-memory-settings');
    alert("回忆设置已保存");
}

// --- WeChat General Input ---
function wcOpenGeneralInput(title, callback, isPassword = false) {
    document.getElementById('wc-general-input-title').innerText = title;
    const input = document.getElementById('wc-general-input-field');
    input.value = '';
    input.type = isPassword ? 'password' : 'text';
    wcState.generalInputCallback = callback;
    wcOpenModal('wc-modal-general-input');
    input.focus();
}

// --- WeChat Transfer ---
function wcOpenTransferModal() {
    document.getElementById('wc-transfer-amount').value = '';
    document.getElementById('wc-transfer-note').value = '';
    wcOpenModal('wc-modal-transfer-input');
    wcCloseAllPanels();
}

function wcSubmitTransferDetails() {
    const amount = document.getElementById('wc-transfer-amount').value;
    const note = document.getElementById('wc-transfer-note').value;
    if (!amount || parseFloat(amount) <= 0) return alert("请输入有效金额");
    
    wcState.tempTransfer = { amount, note };
    wcCloseModal('wc-modal-transfer-input');
    
    wcOpenGeneralInput("请输入支付密码", (pass) => {
        wcCheckPassword(pass);
    }, true);
}

function wcCheckPassword(val) {
    if (val !== wcState.wallet.password) {
        alert("密码错误！");
        return;
    }
    const amount = parseFloat(wcState.tempTransfer.amount);
    if (wcState.wallet.balance < amount) {
        alert("余额不足！请先充值。");
        return;
    }
    wcState.wallet.balance -= amount;
    wcState.wallet.transactions.push({
        id: Date.now(), type: 'payment', amount: amount,
        note: `转账给 ${document.getElementById('wc-nav-title').innerText}`, time: Date.now()
    });
    wcSaveData();
    wcAddMessage(wcState.activeChatId, 'me', 'transfer', '转账', {
        amount: wcState.tempTransfer.amount,
        note: wcState.tempTransfer.note,
        status: 'pending'
    });
}

function wcHandleTransferClick(msgId) {
    const msgs = wcState.chats[wcState.activeChatId];
    const msg = msgs.find(m => m.id === msgId);
    if (!msg) return;
    if (msg.status !== 'pending') return;

    if (msg.sender === 'me') {
        alert("等待对方收款");
    } else {
        wcState.activeTransferMsgId = msgId;
        wcOpenModal('wc-modal-transfer-action');
    }
}

function wcConfirmTransferReceive() { wcUpdateTransferStatus('received'); }
function wcConfirmTransferReject() { wcUpdateTransferStatus('rejected'); }

function wcUpdateTransferStatus(status) {
    const msgs = wcState.chats[wcState.activeChatId];
    const msg = msgs.find(m => m.id === wcState.activeTransferMsgId);
    if (msg) {
        msg.status = status;
        if (status === 'received') {
            const amount = parseFloat(msg.amount);
            wcState.wallet.balance += amount;
            wcState.wallet.transactions.push({
                id: Date.now(), type: 'income', amount: amount, note: `收到转账`, time: Date.now()
            });
            wcAddMessage(wcState.activeChatId, 'me', 'system', `已收款，资金已存入零钱`, { style: 'transparent' });
        } else if (status === 'rejected') {
            wcAddMessage(wcState.activeChatId, 'me', 'system', `已退还转账`, { style: 'transparent' });
        }
        wcSaveData();
        wcRenderMessages(wcState.activeChatId);
    }
    wcCloseModal('wc-modal-transfer-action');
}

// --- WeChat Wallet ---
function wcOpenWallet() {
    document.getElementById('wc-view-user').classList.remove('active');
    document.getElementById('wc-view-wallet').classList.add('active');
    
    document.getElementById('wc-main-tabbar').style.display = 'none';
    
    document.getElementById('wc-btn-exit').style.display = 'none';
    document.getElementById('wc-btn-back').style.display = 'flex';
    
    document.getElementById('wc-btn-back').onclick = wcCloseWallet;
    
    const titleEl = document.getElementById('wc-nav-title');
    titleEl.innerText = '钱包';
    titleEl.onclick = null;
    titleEl.style.cursor = 'default';
    
    const rightContainer = document.getElementById('wc-nav-right-container');
    rightContainer.innerHTML = '';
    const btn = document.createElement('button');
    btn.className = 'wc-nav-btn';
    btn.innerText = '设置'; 
    btn.onclick = () => wcOpenModal('wc-modal-wallet-settings');
    rightContainer.appendChild(btn);

    wcRenderWallet();
}

function wcCloseWallet() {
    document.getElementById('wc-view-wallet').classList.remove('active');
    wcSwitchTab('user');
    
    document.getElementById('wc-main-tabbar').style.display = 'flex';
    document.getElementById('wc-btn-back').style.display = 'none';
    document.getElementById('wc-btn-exit').style.display = 'flex';
    
    document.getElementById('wc-btn-back').onclick = wcHandleBack;
}

function wcRenderWallet() {
    document.getElementById('wc-wallet-balance-display').innerText = parseFloat(wcState.wallet.balance).toFixed(2);
    const list = document.getElementById('wc-wallet-history-list');
    list.innerHTML = '';
    const sortedTrans = [...wcState.wallet.transactions].sort((a, b) => b.time - a.time);

    if (sortedTrans.length === 0) {
        list.innerHTML = '<div style="padding: 20px; text-align: center; color: #8E8E93;">暂无交易记录</div>';
        return;
    }

    // 修复：钱包页面下移
    const header = document.querySelector('.wc-wallet-header');
    if(header) header.style.paddingTop = '60px';

    sortedTrans.forEach(t => {
        const div = document.createElement('div');
        div.className = 'wc-transaction-item';
        const isIncome = t.type === 'income' || t.type === 'recharge';
        const sign = isIncome ? '+' : '-';
        const colorClass = isIncome ? 'wc-amount-in' : 'wc-amount-out';
        div.innerHTML = `
            <div class="wc-trans-info">
                <div class="wc-trans-title">${t.note}</div>
                <div class="wc-trans-time">${new Date(t.time).toLocaleString()}</div>
            </div>
            <div class="wc-trans-amount ${colorClass}">${sign}${parseFloat(t.amount).toFixed(2)}</div>
        `;
        list.appendChild(div);
    });
}

function wcOpenRechargeModal() {
    document.getElementById('wc-recharge-amount').value = '';
    wcOpenModal('wc-modal-recharge');
}

function wcConfirmRecharge() {
    const amount = parseFloat(document.getElementById('wc-recharge-amount').value);
    if (!amount || amount <= 0) return alert("请输入有效金额");
    wcState.wallet.balance += amount;
    wcState.wallet.transactions.push({
        id: Date.now(), type: 'recharge', amount: amount, note: '余额充值', time: Date.now()
    });
    wcSaveData();
    wcRenderWallet();
    wcCloseModal('wc-modal-recharge');
    alert(`充值成功 +${amount.toFixed(2)}`);
}

function wcOpenSetPasswordModal() {
    wcOpenGeneralInput("设置新支付密码 (6位数字)", (newPass) => {
        if (newPass && newPass.length === 6 && !isNaN(newPass)) {
            wcState.wallet.password = newPass;
            wcSaveData();
            alert("密码设置成功");
        } else if (newPass) {
            alert("密码格式错误，必须为6位数字");
        }
    }, true);
}

function wcClearTransactionHistory() {
    if (confirm("确定清空所有交易记录吗？余额不会改变。")) {
        wcState.wallet.transactions = [];
        wcSaveData();
        wcRenderWallet();
    }
}

// --- WeChat Settings (New) ---
function wcOpenWechatSettings() {
    wcOpenModal('wc-modal-wechat-settings');
}

async function wcExportData() {
    try {
        if (!wcDb.instance) {
            alert("WeChat 数据库未初始化，无法备份。");
            return;
        }

        const data = {};
        const persistentCharactersSnapshot = await wcReadCharactersPersistentSnapshot();
        const dbCharacters = await wcDb.getAll('characters');
        const charsUpdatedAt = await wcDb.get('kv_store', 'characters_updated_at');
        const shouldUseSnapshotCharacters = persistentCharactersSnapshot.characters.length > 0 && (
            !Array.isArray(dbCharacters) || dbCharacters.length === 0 ||
            persistentCharactersSnapshot.updatedAt >= (Number(charsUpdatedAt) || 0) ||
            persistentCharactersSnapshot.characters.length > dbCharacters.length
        );

        data.user = await wcDb.get('kv_store', 'user');
        data.wallet = await wcDb.get('kv_store', 'wallet');
        data.stickerCategories = await wcDb.get('kv_store', 'sticker_categories');
        data.cssPresets = await wcDb.get('kv_store', 'css_presets');
        data.chatBgPresets = await wcDb.get('kv_store', 'chat_bg_presets');
        data.phonePresets = await wcDb.get('kv_store', 'phone_presets');
        data.shopData = await wcDb.get('kv_store', 'shop_data');
        data.characters = shouldUseSnapshotCharacters ? persistentCharactersSnapshot.characters : (dbCharacters || []);
        data.masks = await wcDb.getAll('masks');
        data.moments = await wcDb.getAll('moments');
        
        const allChats = await wcDb.getAll('chats');
        const chatsObj = {};
        if (allChats) {
            allChats.forEach(item => {
                chatsObj[item.charId] = item.messages;
            });
        }
        data.chats = chatsObj;

        const exportObj = { signature: 'wechat_sim_backup', timestamp: Date.now(), data: data };
        
        let jsonString;
        try {
            jsonString = JSON.stringify(exportObj);
        } catch (err) {
            throw new Error("数据量过大，请尝试清理部分聊天记录或图片后再备份。");
        }

        const blob = new Blob([jsonString], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `wechat_backup_${new Date().toISOString().slice(0,10)}.json`;
        document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
        
    } catch (error) {
        console.error("WeChat 备份失败:", error);
        alert("WeChat 备份失败: " + error.message);
    }
}

function wcImportData(input) {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const json = JSON.parse(e.target.result);
            if (json.signature !== 'wechat_sim_backup') return alert("导入失败：文件格式不正确。");
            if (confirm("这将覆盖当前 WeChat 的所有数据，确定要恢复吗？")) {
                const data = json.data;
                const importedCharacters = Array.isArray(data.characters) ? data.characters : [];
                const charactersUpdatedAt = Date.now();

                if (data.myFavorites) await wcDb.put('kv_store', data.myFavorites, 'my_favorites');
                if (data.user) await wcDb.put('kv_store', data.user, 'user');
                if (data.wallet) await wcDb.put('kv_store', data.wallet, 'wallet');
                if (data.stickerCategories) await wcDb.put('kv_store', data.stickerCategories, 'sticker_categories');
                if (data.cssPresets) await wcDb.put('kv_store', data.cssPresets, 'css_presets');
                if (data.chatBgPresets) await wcDb.put('kv_store', data.chatBgPresets, 'chat_bg_presets'); // 新增
                if (data.phonePresets) await wcDb.put('kv_store', data.phonePresets, 'phone_presets'); // 新增
                if (data.shopData) await wcDb.put('kv_store', data.shopData, 'shop_data'); // 新增
                
                const stores = ['characters', 'masks', 'moments', 'chats'];
                for (const store of stores) {
                    await wcClearStore(store);
                }

                for (const c of importedCharacters) await wcDb.put('characters', c);
                if (data.masks) for (const m of data.masks) await wcDb.put('masks', m);
                if (data.moments) for (const m of data.moments) await wcDb.put('moments', m);
                if (data.chats) {
                    for (const charId in data.chats) {
                        const parsedId = parseInt(charId);
                        if (!isNaN(parsedId)) {
                            await wcDb.put('chats', { charId: parsedId, messages: data.chats[charId] }).catch(e => console.warn(e));
                        }
                    }
                }

                await wcSyncCharactersSnapshotFromList(importedCharacters, charactersUpdatedAt);
                
                alert("WeChat 数据恢复成功，页面将刷新。");
                location.reload();
            }
        } catch (err) { alert("导入失败：文件损坏。"); }
    };
    reader.readAsText(file);
    input.value = '';
}

async function wcClearData() {
    if (confirm("警告：此操作将永久删除 WeChat 的所有数据！确定要继续吗？")) {
        const stores = ['kv_store', 'characters', 'chats', 'moments', 'masks'];
        for (const store of stores) {
            await wcClearStore(store);
        }
        await wcClearCharactersPersistentSnapshot();
        alert("WeChat 数据已清空，页面将重置。");
        location.reload();
    }
}

// --- WeChat Render All ---
function wcRenderAll() { wcRenderContacts(); wcRenderChats(); wcRenderMoments(); wcRenderUser(); }

function wcRenderContacts() {
    const list = document.getElementById('wc-contacts-list');
    list.innerHTML = '';
    wcState.characters.forEach(char => {
        const div = document.createElement('div');
        div.className = 'wc-swipe-container';
        div.innerHTML = `<div class="wc-swipe-actions" onclick="wcDeleteCharacter(${char.id})">删除</div><div class="wc-swipe-content" onclick="wcShowCharDetail(${char.id})" ontouchstart="wcHandleTouchStartSwipe(event)" ontouchmove="wcHandleTouchMoveSwipe(event)" ontouchend="wcHandleTouchEndSwipe(event)"><img src="${char.avatar}" class="wc-avatar"><div class="wc-item-content"><div class="wc-item-title">${char.name}</div><div class="wc-item-subtitle">${char.note}</div></div></div>`;
        list.appendChild(div);
    });
}

function wcRenderChats() {
    // 新增：渲染横向头像列表
    const avatarScroll = document.getElementById('wc-char-avatar-scroll');
    if (avatarScroll) {
        avatarScroll.innerHTML = '';
        wcState.characters.filter(c => !c.isGroup).forEach(char => {
            const img = document.createElement('img');
            img.className = 'wc-char-avatar-item';
            img.src = char.avatar;
            // 修改：点击横向小卡片进入拉黑拦截记录全屏页
            img.onclick = () => wcOpenBlockedHistory(char.id); 
            avatarScroll.appendChild(img);
        });
    }

    const list = document.getElementById('wc-chat-list');
    list.innerHTML = '';
    const pinnedChars = wcState.characters.filter(c => c.isPinned);
    const otherChars = wcState.characters.filter(c => !c.isPinned).sort((a, b) => {
        const msgsA = wcState.chats[a.id] || [];
        const msgsB = wcState.chats[b.id] || [];
        const timeA = msgsA.length > 0 ? msgsA[msgsA.length - 1].time : 0;
        const timeB = msgsB.length > 0 ? msgsB[msgsB.length - 1].time : 0;
        return timeB - timeA;
    });

    const createChatItem = (char) => {
        const msgs = wcState.chats[char.id] || [];
        const lastMsg = msgs.length > 0 ? msgs[msgs.length - 1] : null;
        let subtitle = '点击开始聊天...';
        let timeStr = '';
        if (lastMsg) {
            if (lastMsg.type === 'sticker') subtitle = '[表情包]';
            else if (lastMsg.type === 'image') subtitle = '[图片]';
            else if (lastMsg.type === 'voice') subtitle = '[语音]';
            else if (lastMsg.type === 'transfer') subtitle = '[转账]';
            else if (lastMsg.type === 'invite') subtitle = '[恋人空间邀请]';
            else if (lastMsg.type === 'receipt') subtitle = '[购物订单]';
            else if (lastMsg.type === 'system') subtitle = '[系统消息]';
            else subtitle = lastMsg.content;
            timeStr = new Date(lastMsg.time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        }
        
        const div = document.createElement('div');
        div.className = 'wc-chat-swipe-container';
        const pinText = char.isPinned ? "取消置顶" : "置顶";
        const pinClass = char.isPinned ? "wc-pinned-chat" : "";
        
        const unreadCount = wcState.unreadCounts[char.id] || 0;
        const badgeHtml = unreadCount > 0 ? `<div class="wc-unread-badge">${unreadCount > 99 ? '99+' : unreadCount}</div>` : '';
        
        div.innerHTML = `
            <div class="wc-chat-swipe-actions">
                <div class="wc-chat-action-btn wc-btn-pin" onclick="wcTogglePin(${char.id})">${pinText}</div>
            </div>
            <div class="wc-chat-swipe-content ${pinClass}" onclick="wcOpenChat(${char.id})" ontouchstart="wcHandleTouchStartSwipe(event)" ontouchmove="wcHandleTouchMoveSwipe(event)" ontouchend="wcHandleTouchEndSwipe(event)">
                <div style="position: relative;">
                    <img src="${char.avatar}" class="wc-avatar">
                    ${badgeHtml}
                </div>
                <div class="wc-item-content">
                    <div class="wc-item-title">${char.note || char.name}${char.isGroup && char.members ? ` (${char.members.length})` : ''}</div>
                    <div class="wc-item-subtitle">${subtitle}</div>
                </div>
                <div style="font-size: 12px; color: #C7C7CC;">${timeStr}</div>
            </div>
        `;
        return div;
    };

    pinnedChars.forEach(char => list.appendChild(createChatItem(char)));
    if (pinnedChars.length > 0 && otherChars.length > 0) {
        const sep = document.createElement('div');
        sep.className = 'wc-list-separator';
        sep.innerText = 'ovo';
        list.appendChild(sep);
    }
    otherChars.forEach(char => list.appendChild(createChatItem(char)));
}

// --- 替换 wcRenderMoments 和 wcFilterMoments ---
function wcRenderMoments() {
    const feed = document.getElementById('wc-moments-feed');
    feed.innerHTML = '';
    
    const coverEl = document.getElementById('wc-moments-cover');
    const avatarEl = document.getElementById('wc-moments-user-avatar');
    
    if (wcState.user.cover && coverEl) coverEl.src = wcState.user.cover;
    if (wcState.user.avatar && avatarEl) avatarEl.src = wcState.user.avatar;
    
    // 🌟 核心：点击头像展示所有朋友圈 (ALL)
    if (avatarEl) {
        avatarEl.onclick = () => wcFilterMoments('all');
        // 如果当前是 ALL 状态，给头像加个高级黑圈提示
        if (wcState.momentFilter === 'all') {
            avatarEl.classList.add('all-active');
        } else {
            avatarEl.classList.remove('all-active');
        }
    }

    // 🌟 核心：在头像下方动态生成 7 天滚动日历
    let calContainer = document.getElementById('wc-moments-calendar-bar');
    if (!calContainer) {
        calContainer = document.createElement('div');
        calContainer.id = 'wc-moments-calendar-bar';
        const header = document.querySelector('.wc-moments-header');
        header.parentNode.insertBefore(calContainer, feed);
    }

    const now = new Date();
    let weekHtml = '';
    const weekNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    
    // 生成以“今天”为中心的 7 天 (-3天 到 +3天)
    for(let i = -3; i <= 3; i++) {
        const d = new Date(now.getTime() + i * 86400000);
        const dayNum = d.getDate();
        const dayOfWeek = weekNames[d.getDay()];
        const isToday = (i === 0);
        
        // 判断是否被选中
        let isActive = false;
        if (wcState.momentFilter === 'specificDate' && wcState.momentFilterDate) {
            if (wcState.momentFilterDate.year === d.getFullYear() && 
                wcState.momentFilterDate.month === d.getMonth() && 
                wcState.momentFilterDate.day === d.getDate()) {
                isActive = true;
            }
        }
        
        weekHtml += `
            <div class="cal-item ${isActive ? 'active' : ''}" onclick="wcFilterMoments('date', ${d.getTime()})">
                <span class="cal-day">${dayNum}</span>
                <span class="cal-label">${dayOfWeek}</span>
                ${isToday ? '<div class="cal-today-dot"></div>' : ''}
            </div>`;
    }
    
    calContainer.innerHTML = `
        <div class="ins-calendar-nav moments-inline-cal">
            ${weekHtml}
        </div>
    `;

    // 日期过滤逻辑
    let filteredMoments = wcState.moments;
    
    if (wcState.momentFilter === 'specificDate' && wcState.momentFilterDate) {
        const targetStart = new Date(wcState.momentFilterDate.year, wcState.momentFilterDate.month, wcState.momentFilterDate.day).getTime();
        const targetEnd = targetStart + 86400000;
        filteredMoments = wcState.moments.filter(m => m.time >= targetStart && m.time < targetEnd);
    }

    if (filteredMoments.length === 0) {
        feed.innerHTML = '<div style="text-align:center; color:#999; padding:60px 0; font-size:13px; font-style:italic; font-family: Georgia, serif;">这一天没有动态哦...</div>';
        return;
    }

    filteredMoments.forEach(moment => {
        let mediaHtml = '';
        if (moment.image) {
            // 真实图片增加点击预览
            mediaHtml = `<img src="${moment.image}" class="wc-moment-image" onclick="wcPreviewImage('${moment.image}')" style="cursor: pointer;">`;
        } else if (moment.imageDesc) {
            // AI 描述图片增加点击弹出高级卡片
            const safeDesc = moment.imageDesc.replace(/'/g, "\\'").replace(/"/g, "&quot;");
            mediaHtml = `<div class="wc-moment-image-placeholder" onclick="wcOpenImageDescCard('${safeDesc}')" style="width: 100px !important; height: 100px !important; max-width: none !important; padding: 5px !important; box-sizing: border-box; cursor: pointer;"><svg class="wc-icon" style="margin-bottom: 4px; width: 24px; height:24px;" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg><div style="font-size: 10px; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">${moment.imageDesc}</div></div>`;
        }
        
        let likesHtml = '';
        if (moment.likes && moment.likes.length > 0) likesHtml = `<div class="wc-moment-like-row"><svg class="wc-icon wc-icon-fill" style="width:14px; height:14px; margin-right:6px;" viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>${moment.likes.join(', ')}</div>`;
        
        let commentsHtml = '';
        if (moment.comments && moment.comments.length > 0) {
            moment.comments.forEach((c, cIdx) => { 
                commentsHtml += `<div class="wc-moment-comment-row" onclick="wcPrepareReply(${moment.id}, ${cIdx}, '${c.name}')"><span class="wc-moment-comment-name">${c.name}:</span> ${c.text}</div>`; 
            });
        }
        
        const interactionArea = (likesHtml || commentsHtml) ? `<div class="wc-moment-likes-comments">${likesHtml}${commentsHtml}</div>` : '';
        
        // 动态判断是否有文字，如果没有文字就不渲染 div，防止出现多余的空白间距
        let textHtml = '';
        if (moment.text && moment.text.trim() !== '') {
            textHtml = `<div class="wc-moment-text">${moment.text}</div>`;
        }
        
        const div = document.createElement('div');
        div.className = 'wc-moment-card';
        div.innerHTML = `
            <div class="wc-moment-header-row">
                <img src="${moment.avatar || wcState.user.avatar}" class="wc-avatar" style="width: 40px; height: 40px; border-radius: 50%;">
                <div class="wc-moment-name">${moment.name || wcState.user.name}</div>
            </div>
            <div class="wc-moment-content">
                ${textHtml}
                ${mediaHtml}
                <div class="wc-moment-actions">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <span style="font-size: 11px; color: #B2B2B2; font-family: monospace;">${new Date(moment.time).toLocaleString('zh-CN', {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'})}</span>
                        <span style="font-size: 11px; color: #888; cursor: pointer; font-weight: bold;" onclick="wcDeleteMoment(${moment.id})">DELETE</span>
                    </div>
                    <div style="display: flex; gap: 16px;">
                        <div onclick="wcToggleLike(${moment.id})"><svg class="wc-icon" style="width:20px; height:20px; color: #111;" viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg></div>
                        <div onclick="wcToggleCommentBox(${moment.id})"><svg class="wc-icon" style="width:20px; height:20px; color: #111;" viewBox="0 0 24 24"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg></div>
                    </div>
                </div>
                ${interactionArea}
                <div id="wc-comment-box-${moment.id}" class="wc-comment-input-box" style="display: none;">
                    <input type="text" id="wc-input-comment-${moment.id}" class="wc-comment-input" placeholder="Add a comment...">
                    <button class="wc-moment-action-btn" onclick="wcAddComment(${moment.id})">POST</button>
                </div>
            </div>
        `;
        feed.appendChild(div);
    });
}

function wcRenderUser() { 
    if (wcState.user.avatar) document.getElementById('wc-user-center-avatar').src = wcState.user.avatar; 
    document.getElementById('wc-user-name-display').innerText = wcState.user.name; 
}

// --- WeChat Character & User Management ---
function wcTriggerUpload(type) { document.getElementById(`wc-file-input-${type}`).click(); }

async function wcHandleFileSelect(event, type) {
    const file = event.target.files[0];
    if (!file) return;
    try {
        const base64 = await wcCompressImage(file);
        wcState.tempImage = base64;
        wcState.tempImageType = type; 

        if (type === 'char') {
            document.getElementById('wc-preview-char-avatar').src = base64;
            document.getElementById('wc-preview-char-avatar').style.display = 'block';
            document.getElementById('wc-icon-char-upload').style.display = 'none';
        } else if (type === 'group') { // 👈 新增这段
            document.getElementById('wc-preview-group-avatar').src = base64;
            document.getElementById('wc-preview-group-avatar').style.display = 'block';
            document.getElementById('wc-icon-group-upload').style.display = 'none';
        } else if (type === 'edit-char') {
            document.getElementById('wc-edit-char-avatar').src = base64;
        } else if (type === 'user') {
            wcState.user.avatar = base64;
            wcSaveData();
            wcRenderUser();
        } else if (type === 'cover') {
            wcState.user.cover = base64;
            wcSaveData();
            wcRenderMoments();
        } else if (type === 'moment') {
            document.getElementById('wc-preview-moment-img').src = base64;
            document.getElementById('wc-preview-moment-img').style.display = 'block';
            document.getElementById('wc-icon-moment-upload').style.display = 'none';
        } else if (type === 'mask') {
            document.getElementById('wc-preview-mask-avatar').src = base64;
        } else if (type === 'chat-img') {
            wcAddMessage(wcState.activeChatId, 'me', 'image', base64);
            wcCloseAllPanels();
        } else if (type === 'setting-char') {
            document.getElementById('wc-setting-char-avatar').src = base64;
            document.getElementById('wc-cs-char-avatar-display').src = base64; // 同步更新顶部
        } else if (type === 'setting-user') {
            document.getElementById('wc-setting-user-avatar').src = base64;
            document.getElementById('wc-cs-user-avatar-display').src = base64; // 同步更新顶部
        } else if (type === 'setting-bg') {
            document.getElementById('wc-setting-bg-preview').src = base64;
            document.getElementById('wc-setting-bg-preview').style.display = 'block';
            document.getElementById('wc-setting-bg-text').style.display = 'none';
            
            // 【新增】：自动保存到图库
            if (!wcState.chatBgPresets.includes(base64)) {
                wcState.chatBgPresets.push(base64);
                wcSaveData();
                wcRenderChatBgGallery();
            }
        } else if (type === 'phone-bg') {
            document.getElementById('wc-preview-phone-bg').src = base64;
            document.getElementById('wc-preview-phone-bg').style.display = 'block';
            document.getElementById('wc-text-phone-bg').style.display = 'none';
            wcState.tempPhoneConfig.wallpaper = base64;
        } else if (type === 'sticky-note') {
            document.getElementById('wc-preview-sticky-note').src = base64;
            document.getElementById('wc-preview-sticky-note').style.display = 'block';
            document.getElementById('wc-text-sticky-note').style.display = 'none';
            wcState.tempPhoneConfig.stickyNote = base64;
        } else if (type.startsWith('icon-')) {
            const iconKey = type.replace('icon-', '');
            document.getElementById(`wc-preview-icon-${iconKey}`).src = base64;
            document.getElementById(`wc-preview-icon-${iconKey}`).style.display = 'block';
            if(!wcState.tempPhoneConfig.icons) wcState.tempPhoneConfig.icons = {};
            wcState.tempPhoneConfig.icons[iconKey] = base64;
        } else if (type === 'widget-photo') {
            document.getElementById('wc-preview-char-widget-photo').src = base64;
            document.getElementById('wc-preview-char-widget-photo').style.display = 'block';
            document.getElementById('wc-text-char-widget-photo').style.display = 'none';
        }
    } catch (err) {
        alert("图片处理失败");
    }
}
// ==========================================
// 新增：群聊创建与管理逻辑
// ==========================================
function wcOpenAddGroupModal() {
    document.getElementById('wc-preview-group-avatar').style.display = 'none';
    document.getElementById('wc-icon-group-upload').style.display = 'block';
    document.getElementById('wc-input-group-name').value = '';
    wcState.tempImage = '';
    wcState.tempImageType = 'group';

    const list = document.getElementById('wc-group-member-select-list');
    list.innerHTML = '';
    
    // 过滤掉已经是群聊的角色
    const singleChars = wcState.characters.filter(c => !c.isGroup);
    if (singleChars.length === 0) {
        list.innerHTML = '<div style="color:#999; font-size:13px; text-align:center; padding: 10px;">暂无单人角色，请先创建角色</div>';
    } else {
        singleChars.forEach(char => {
            list.innerHTML += `
                <div class="wc-checkbox-item" style="padding: 8px 0; border-bottom: 1px solid #eee;">
                    <input type="checkbox" value="${char.id}" class="group-member-checkbox" style="width: 20px; height: 20px;">
                    <img src="${char.avatar}" style="width:32px; height:32px; border-radius:50%; object-fit:cover;">
                    <span style="font-size: 15px;">${char.name}</span>
                </div>
            `;
        });
    }
    wcOpenModal('wc-modal-add-group');
}

async function wcSaveGroupChat() {
    const name = document.getElementById('wc-input-group-name').value.trim();
    if (!name) return alert('请输入群聊名称');

    const checkboxes = document.querySelectorAll('.group-member-checkbox:checked');
    const members = Array.from(checkboxes).map(cb => parseInt(cb.value));
    if (members.length === 0) return alert('请至少选择一个群成员');

    // 【新增】：默认将用户(User)加入群聊成员列表的最前面
    members.unshift('user'); 

    const defaultAvatarSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100" height="100" fill="#E5E5EA"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#888" font-size="24" font-weight="bold">群聊</text></svg>`;
    const defaultAvatar = 'data:image/svg+xml;base64,' + window.btoa(unescape(encodeURIComponent(defaultAvatarSvg)));

    const newGroup = {
        id: Date.now(),
        name: name,
        note: name,
        prompt: `这是一个名为【${name}】的微信群聊。群成员包括你和其他人。请根据群成员的性格进行多人对话模拟。`,
        avatar: wcState.tempImage || defaultAvatar,
        isPinned: false,
        isGroup: true,
        members: members,
        ownerId: 'user' // 【新增】：默认群主为用户
    };

    wcState.characters.push(newGroup);
    await wcWriteCharactersPersistentSnapshot();
    try {
        await wcDb.put('characters', newGroup);
    } catch (e) {
        console.warn('群聊联系人写入 IndexedDB 失败，已保留本地兜底快照', e);
    }
    await wcSaveData();
    wcCloseModal('wc-modal-add-group');
    wcRenderAll();
}

function renderGroupMembersInSettings(groupChar) {
    const section = document.getElementById('wc-setting-group-members-section');
    if(section) section.style.display = 'block';
    const grid = document.getElementById('wc-group-members-grid');
    if(!grid) return;
    grid.innerHTML = '';

    const members = groupChar.members || [];

    // 1. 渲染用户(User)
    if (members.includes('user')) {
        const isUserOwner = groupChar.ownerId === 'user';
        grid.innerHTML += `
            <div style="display: flex; flex-direction: column; align-items: center; gap: 4px; position: relative;">
                <img src="${wcState.user.avatar}" style="width: 44px; height: 44px; border-radius: 12px; object-fit: cover; border: 1px solid #eee;">
                <span style="font-size: 10px; color: #555; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%;">${wcState.user.name}</span>
                ${isUserOwner ? '<div style="position: absolute; top: -6px; right: -6px; background: #F5A623; color: white; font-size: 8px; padding: 2px 4px; border-radius: 6px; font-weight: bold; border: 1px solid #fff;">群主</div>' : ''}
            </div>
        `;
    }

    // 2. 渲染其他现有成员
    members.forEach(memberId => {
        if (memberId === 'user') return;
        const member = wcState.characters.find(c => c.id === memberId);
        if (member) {
            const isOwner = groupChar.ownerId === memberId;
            grid.innerHTML += `
                <div style="display: flex; flex-direction: column; align-items: center; gap: 4px; position: relative;">
                    <img src="${member.avatar}" style="width: 44px; height: 44px; border-radius: 12px; object-fit: cover; border: 1px solid #eee;">
                    <span style="font-size: 10px; color: #555; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%;">${member.name}</span>
                    ${isOwner ? '<div style="position: absolute; top: -6px; right: -6px; background: #F5A623; color: white; font-size: 8px; padding: 2px 4px; border-radius: 6px; font-weight: bold; border: 1px solid #fff;">群主</div>' : ''}
                </div>
            `;
        }
    });

    // 3. 渲染 + 按钮 (邀请)
    grid.innerHTML += `
        <div style="display: flex; flex-direction: column; align-items: center; gap: 4px; cursor: pointer;" onclick="wcManageGroupMembers('add')">
            <div style="width: 44px; height: 44px; border-radius: 12px; border: 1px dashed #CCC; display: flex; align-items: center; justify-content: center; color: #888; font-size: 24px; background: #FAFAFA;">+</div>
            <span style="font-size: 10px; color: #888;">邀请</span>
        </div>
    `;

    // 4. 渲染 - 按钮 (踢人)
    grid.innerHTML += `
        <div style="display: flex; flex-direction: column; align-items: center; gap: 4px; cursor: pointer;" onclick="wcManageGroupMembers('remove')">
            <div style="width: 44px; height: 44px; border-radius: 12px; border: 1px dashed #CCC; display: flex; align-items: center; justify-content: center; color: #888; font-size: 24px; background: #FAFAFA;">-</div>
            <span style="font-size: 10px; color: #888;">移出</span>
        </div>
    `;

    // 5. 渲染群主选择下拉框
    const ownerSelect = document.getElementById('wc-setting-group-owner');
    if(ownerSelect) {
        ownerSelect.innerHTML = '';
        if (members.includes('user')) {
            ownerSelect.innerHTML += `<option value="user" ${groupChar.ownerId === 'user' ? 'selected' : ''}>${wcState.user.name}</option>`;
        }
        members.forEach(memberId => {
            if (memberId === 'user') return;
            const member = wcState.characters.find(c => c.id === memberId);
            if (member) {
                const selected = groupChar.ownerId === memberId ? 'selected' : '';
                ownerSelect.innerHTML += `<option value="${member.id}" ${selected}>${member.name}</option>`;
            }
        });
    }
}

function wcChangeGroupOwner(newOwnerId) {
    const groupChar = wcState.characters.find(c => c.id === wcState.activeChatId);
    if (groupChar && groupChar.isGroup) {
        // 【新增】：支持将 'user' 设为群主
        groupChar.ownerId = newOwnerId === 'user' ? 'user' : parseInt(newOwnerId);
        wcSaveData();
        renderGroupMembersInSettings(groupChar);
    }
}

function wcManageGroupMembers(action) {
    const groupChar = wcState.characters.find(c => c.id === wcState.activeChatId);
    if (!groupChar) return;

    const list = document.getElementById('wc-manage-group-list');
    list.innerHTML = '';
    const title = document.getElementById('wc-manage-group-title');
    const confirmBtn = document.getElementById('wc-manage-group-confirm-btn');

    const members = groupChar.members || [];
    const ownerId = groupChar.ownerId;

    if (action === 'add') {
        title.innerText = '邀请新成员';
        let availableChars = [];

        // 【核心逻辑】：判断群主身份决定可邀请列表
        if (ownerId === 'user') {
            // 用户是群主：可以邀请所有未进群的单人角色
            availableChars = wcState.characters.filter(c => !c.isGroup && !members.includes(c.id));
        } else {
            // NPC是群主：只能邀请其手机通讯录中的角色
            const ownerChar = wcState.characters.find(c => c.id === ownerId);
            if (ownerChar && ownerChar.phoneData && ownerChar.phoneData.contacts) {
                const contactNames = ownerChar.phoneData.contacts.map(c => c.name);
                availableChars = wcState.characters.filter(c => !c.isGroup && !members.includes(c.id) && contactNames.includes(c.name));
            }
        }

        if (availableChars.length === 0) {
            list.innerHTML = '<div style="color:#999; font-size:13px; text-align:center; padding: 20px;">没有可邀请的角色了 (若NPC为群主，需确保其通讯录中有其他角色)</div>';
        } else {
            availableChars.forEach(char => {
                list.innerHTML += `
                    <div class="wc-checkbox-item" style="padding: 10px 0; border-bottom: 1px solid #eee;">
                        <input type="checkbox" value="${char.id}" class="manage-member-checkbox" style="width: 20px; height: 20px;">
                        <img src="${char.avatar}" style="width:32px; height:32px; border-radius:50%; object-fit:cover;">
                        <span style="font-size: 15px;">${char.name}</span>
                    </div>
                `;
            });
        }
        confirmBtn.onclick = () => {
            const checkboxes = document.querySelectorAll('.manage-member-checkbox:checked');
            const newMembers = Array.from(checkboxes).map(cb => parseInt(cb.value));
            if (newMembers.length === 0) return; // 如果没选人直接返回

            if (!groupChar.members) groupChar.members = [];
            groupChar.members.push(...newMembers);
            
            // 👇 新增：获取群主名字和被邀请人名字，生成系统提示
            let ownerName = "群主";
            if (ownerId === 'user') {
                ownerName = wcState.user.name;
            } else {
                const ownerChar = wcState.characters.find(c => c.id === ownerId);
                if (ownerChar) ownerName = ownerChar.name;
            }

            const newMemberNames = newMembers.map(id => {
                const c = wcState.characters.find(ch => ch.id === id);
                return c ? c.name : "未知";
            }).join('、');

            // 插入系统提示消息
            wcAddMessage(groupChar.id, 'system', 'system', `[系统提示: ${ownerName} 邀请了 ${newMemberNames} 进入群聊]`, { style: 'transparent' });
            // 👆 新增结束

            wcSaveData();
            wcCloseModal('wc-modal-manage-group-members');
            renderGroupMembersInSettings(groupChar);
        };
    } else if (action === 'remove') {
        title.innerText = '移出群成员';
        
        // 渲染用户(如果用户在群里且不是群主)
        if (ownerId !== 'user' && members.includes('user')) {
            list.innerHTML += `
                <div class="wc-checkbox-item" style="padding: 10px 0; border-bottom: 1px solid #eee;">
                    <input type="checkbox" value="user" class="manage-member-checkbox" style="width: 20px; height: 20px;">
                    <img src="${wcState.user.avatar}" style="width:32px; height:32px; border-radius:50%; object-fit:cover;">
                    <span style="font-size: 15px;">${wcState.user.name}</span>
                </div>
            `;
        }

        const currentMembers = wcState.characters.filter(c => members.includes(c.id));
        currentMembers.forEach(char => {
            const disabled = char.id === ownerId ? 'disabled' : '';
            const label = char.id === ownerId ? '(群主)' : '';
            list.innerHTML += `
                <div class="wc-checkbox-item" style="padding: 10px 0; border-bottom: 1px solid #eee; ${disabled ? 'opacity:0.5;' : ''}">
                    <input type="checkbox" value="${char.id}" class="manage-member-checkbox" ${disabled} style="width: 20px; height: 20px;">
                    <img src="${char.avatar}" style="width:32px; height:32px; border-radius:50%; object-fit:cover;">
                    <span style="font-size: 15px;">${char.name} <span style="color:#F5A623; font-size:12px; font-weight:bold;">${label}</span></span>
                </div>
            `;
        });
        confirmBtn.onclick = () => {
            const checkboxes = document.querySelectorAll('.manage-member-checkbox:checked');
            const removeMembers = Array.from(checkboxes).map(cb => cb.value === 'user' ? 'user' : parseInt(cb.value));
            groupChar.members = members.filter(id => !removeMembers.includes(id));
            wcSaveData();
            wcCloseModal('wc-modal-manage-group-members');
            renderGroupMembersInSettings(groupChar);
        };
    }
    wcOpenModal('wc-modal-manage-group-members');
}

async function wcSaveCharacter() {
    const name = document.getElementById('wc-input-char-name').value;
    const note = document.getElementById('wc-input-char-note').value;
    const prompt = document.getElementById('wc-input-char-prompt').value;
    if (!name) return alert('请输入角色名称');
    
    const defaultAvatarSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100" height="100" fill="#8E8E93"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="white" font-size="40">${name[0]}</text></svg>`;
    const defaultAvatar = 'data:image/svg+xml;base64,' + window.btoa(unescape(encodeURIComponent(defaultAvatarSvg)));

    const newChar = {
        id: Date.now(), name: name, note: note, prompt: prompt,
        avatar: wcState.tempImage || defaultAvatar, isPinned: false
    };
    wcState.characters.push(newChar);
    await wcWriteCharactersPersistentSnapshot();
    try {
        await wcDb.put('characters', newChar);
    } catch (e) {
        console.warn('联系人写入 IndexedDB 失败，已保留本地兜底快照', e);
    }
    await wcSaveData();
    wcCloseModal('wc-modal-add-char');
    wcRenderAll();
}

function wcDeleteCharacter(id) {
    if(confirm('确定删除该角色吗？')) {
        wcState.characters = wcState.characters.filter(c => c.id !== id);
        delete wcState.chats[id];
        wcDb.delete('chats', id);
        wcDb.delete('characters', id);
        
        // 【新增】：如果删除的是当前绑定的恋人，自动解除恋人关系
        if (typeof lsState !== 'undefined' && lsState.boundCharId === id) {
            lsState.boundCharId = null;
            lsState.startDate = null;
            lsState.isLinked = false;
            lsState.feed = [];
            lsState.widgetEnabled = false;
            lsState.charWidgetEnabled = false;
            if (typeof lsSaveData === 'function') lsSaveData();
        }

        wcSaveData();
        wcRenderAll();
    }
}

function wcTogglePin(id) {
    const char = wcState.characters.find(c => c.id === id);
    if (char) {
        char.isPinned = !char.isPinned;
        wcSaveData();
        wcRenderChats();
    }
}

function wcShowPhoneContactDetail(contact) {
    currentPhoneContact = contact;
    document.getElementById('wc-card-contact-name').innerText = contact.name;
    
    const descEl = document.getElementById('wc-card-contact-desc');
    // 增加编辑提示图标和点击事件
    descEl.innerHTML = `${contact.desc || "暂无介绍"} <svg class="wc-icon" style="width:14px;height:14px;vertical-align:middle;margin-left:4px;color:#007AFF;cursor:pointer;" viewBox="0 0 24 24"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>`;
    descEl.style.cursor = 'pointer';
    
    // 核心修改：限制最大高度，允许滚动，防止简介过长把底部按钮挤出屏幕
    descEl.style.maxHeight = '120px';
    descEl.style.overflowY = 'auto';
    descEl.style.display = 'block';
    descEl.style.wordBreak = 'break-word';
    
    descEl.onclick = () => wcOpenContactDescEdit();
    
    const avatarEl = document.getElementById('wc-card-contact-avatar');
    avatarEl.style.background = 'transparent'; 
    
    if (contact.isUser) {
        const char = wcState.characters.find(c => c.id === wcState.editingCharId);
        const userAvatar = (char.chatConfig && char.chatConfig.userAvatar) ? char.chatConfig.userAvatar : wcState.user.avatar;
        avatarEl.innerHTML = `<img src="${userAvatar}" style="width:100%;height:100%;object-fit:cover;">`;
        document.getElementById('wc-card-contact-actions').style.display = 'none';
    } else {
        let avatarUrl = contact.avatar || getRandomNpcAvatar();
        avatarEl.innerHTML = `<img src="${avatarUrl}" style="width:100%;height:100%;object-fit:cover;">`;
        document.getElementById('wc-card-contact-actions').style.display = 'flex';
    }
    
    const modal = document.getElementById('wc-modal-phone-contact-card');
    modal.style.display = 'flex'; 
    wcOpenModal('wc-modal-phone-contact-card');
}

function wcOpenContactDescEdit() {
    if (!currentPhoneContact) return;
    let modal = document.getElementById('wc-modal-edit-contact-desc');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'wc-modal-edit-contact-desc';
        modal.className = 'ios-alert-overlay';
        modal.innerHTML = `
            <div class="ios-alert-box" style="width: 300px;">
                <div class="ios-alert-title">编辑人设/简介</div>
                <div class="ios-alert-message" style="padding-bottom: 10px;">
                    <textarea id="wc-input-contact-desc" class="ios-textarea" style="height: 150px; width: 100%; box-sizing: border-box; padding: 10px; border: 1px solid #ccc; border-radius: 8px; font-size: 14px; background: #fff;"></textarea>
                </div>
                <div style="display: flex; border-top: 0.5px solid rgba(60, 60, 67, 0.29);">
                    <button class="ios-alert-btn" style="flex: 1; border-right: 0.5px solid rgba(60, 60, 67, 0.29); color: #FF3B30;" onclick="document.getElementById('wc-modal-edit-contact-desc').classList.remove('active')">取消</button>
                    <button class="ios-alert-btn" style="flex: 1; font-weight: bold;" onclick="wcSaveContactDesc()">保存</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    document.getElementById('wc-input-contact-desc').value = currentPhoneContact.desc || '';
    modal.classList.add('active');
}

function wcSaveContactDesc() {
    if (!currentPhoneContact) return;
    const newDesc = document.getElementById('wc-input-contact-desc').value.trim();
    currentPhoneContact.desc = newDesc;
    
    const descEl = document.getElementById('wc-card-contact-desc');
    descEl.innerHTML = `${newDesc || "暂无介绍"} <svg class="wc-icon" style="width:14px;height:14px;vertical-align:middle;margin-left:4px;color:#007AFF;cursor:pointer;" viewBox="0 0 24 24"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>`;
    
    const char = wcState.characters.find(c => c.id === wcState.editingCharId);
    if (char && char.phoneData) {
        if (char.phoneData.contacts) {
            const contact = char.phoneData.contacts.find(c => c.id === currentPhoneContact.id);
            if (contact) contact.desc = newDesc;
        }
        if (char.phoneData.chats) {
            const chat = char.phoneData.chats.find(c => c.name === currentPhoneContact.name);
            if (chat) chat.desc = newDesc;
        }
        wcSaveData();
    }
    
    document.getElementById('wc-modal-edit-contact-desc').classList.remove('active');
    wcRenderPhoneContacts();
}

function wcShowCharDetail(id) {
    const char = wcState.characters.find(c => c.id === id);
    if (!char) return;
    wcState.editingCharId = id;
    document.getElementById('wc-detail-char-avatar').src = char.avatar;
    document.getElementById('wc-detail-char-name').innerText = char.name;
    document.getElementById('wc-detail-char-note').innerText = char.note || "暂无备注";
    
    const checkPhoneBtn = document.getElementById('wc-detail-check-phone-btn');
    if (checkPhoneBtn) {
        checkPhoneBtn.style.display = char.isGroup ? 'none' : 'block';
    }
    
    wcOpenModal('wc-modal-char-detail');
}

function wcCheckPhoneAction() {
    const char = wcState.characters.find(c => c.id === wcState.editingCharId);
    if (char && char.isGroup) {
        alert("群聊无法查看手机哦~");
        return;
    }
    wcCloseModal('wc-modal-char-detail');
    wcOpenPhoneSim();
}

function wcOpenEditCharSettings() {
    const char = wcState.characters.find(c => c.id === wcState.editingCharId);
    if (!char) return;
    wcState.tempImage = '';
    document.getElementById('wc-edit-char-avatar').src = char.avatar;
    document.getElementById('wc-edit-char-name').value = char.name;
    document.getElementById('wc-edit-char-note').value = char.note;
    document.getElementById('wc-edit-char-prompt').value = char.prompt;
    wcOpenModal('wc-modal-edit-char-settings');
}

async function wcUpdateCharacter() {
    const char = wcState.characters.find(c => c.id === wcState.editingCharId);
    if (!char) return;
    char.name = document.getElementById('wc-edit-char-name').value;
    char.note = document.getElementById('wc-edit-char-note').value;
    char.prompt = document.getElementById('wc-edit-char-prompt').value;
    if (wcState.tempImage && wcState.tempImageType === 'edit-char') char.avatar = wcState.tempImage;
    await wcWriteCharactersPersistentSnapshot();
    try {
        await wcDb.put('characters', char);
    } catch (e) {
        console.warn('联系人更新写入 IndexedDB 失败，已保留本地兜底快照', e);
    }
    await wcSaveData();
    wcCloseModal('wc-modal-edit-char-settings');
    document.getElementById('wc-detail-char-avatar').src = char.avatar;
    document.getElementById('wc-detail-char-name').innerText = char.name;
    document.getElementById('wc-detail-char-note').innerText = char.note || "暂无备注";
    wcRenderAll();
}

// --- WeChat Phone Sim ---
function wcOpenPhoneSim() {
    const char = wcState.characters.find(c => c.id === wcState.editingCharId);
    if (!char) return;
    const sim = document.getElementById('wc-view-phone-sim');
    sim.classList.add('active');
    const screenBg = document.getElementById('wc-phone-screen-bg');
        if (char.phoneConfig && char.phoneConfig.wallpaper) {
        screenBg.style.backgroundImage = `url('${char.phoneConfig.wallpaper}')`;
    } else {    
        screenBg.style.backgroundImage = 'none';
    }
    
    const noteBg = document.getElementById('wc-sticky-note-bg');
    if (char.phoneConfig && char.phoneConfig.stickyNote) {
        noteBg.style.backgroundImage = `url(${char.phoneConfig.stickyNote})`;
    } else {
        noteBg.style.backgroundImage = 'none';
    }

    const icons = char.phoneConfig && char.phoneConfig.icons ? char.phoneConfig.icons : {};
    ['msg', 'browser', 'cart', 'settings'].forEach(id => {
        const iconEl = document.getElementById(`wc-icon-${id === 'msg' ? 'message' : id}`);
        if (icons[id]) iconEl.innerHTML = `<img src="${icons[id]}">`;
    });
    
    // 渲染对方桌面小组件 (仅当是绑定的恋人时)
    const isLover = lsState.isLinked && lsState.boundCharId === char.id;
    const widget = document.getElementById('wc-phone-lovers-widget');
    if (widget) {
        widget.style.display = (isLover && lsState.charWidgetEnabled) ? 'flex' : 'none';
        if (isLover && lsState.charWidgetEnabled) {
            wcRenderCharWidget();
        }
    }
    
    wcStartPhoneClock();
    
    document.getElementById('wc-phone-fingerprint-btn').style.display = 'flex';
    document.getElementById('wc-phone-sticky-note').style.display = 'flex';
}

function wcStartPhoneClock() {
    wcUpdatePhoneClock();
    wcState.phoneClockInterval = setInterval(wcUpdatePhoneClock, 1000);
}

function wcStopPhoneClock() {
    if (wcState.phoneClockInterval) clearInterval(wcState.phoneClockInterval);
}

function wcUpdatePhoneClock() {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    document.getElementById('wc-sim-clock-time').innerText = `${hours}:${minutes}`;
    const days = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
    document.getElementById('wc-sim-clock-date').innerText = `${now.getMonth() + 1}月${now.getDate()}日 ${days[now.getDay()]}`;
}

function wcOpenPhoneSettings() {
    wcState.tempPhoneConfig = {};
    document.getElementById('wc-preview-phone-bg').style.display = 'none';
    document.getElementById('wc-text-phone-bg').style.display = 'block';
    document.getElementById('wc-preview-sticky-note').style.display = 'none';
    document.getElementById('wc-text-sticky-note').style.display = 'block';
    ['msg', 'browser', 'cart', 'settings'].forEach(id => {
        document.getElementById(`wc-preview-icon-${id}`).style.display = 'none';
    });
    
    const modal = document.getElementById('wc-modal-phone-settings');
    modal.classList.remove('hidden');
    modal.classList.add('active');
    modal.style.zIndex = '20001'; 
    wcRenderPhonePresets(); // 【新增】：打开手机装修时渲染预设列表
}

function wcSavePhoneSettings() {
    const char = wcState.characters.find(c => c.id === wcState.editingCharId);
    if (!char) return;
    if (!char.phoneConfig) char.phoneConfig = {};
    if (wcState.tempPhoneConfig.wallpaper) char.phoneConfig.wallpaper = wcState.tempPhoneConfig.wallpaper;
    if (wcState.tempPhoneConfig.stickyNote) char.phoneConfig.stickyNote = wcState.tempPhoneConfig.stickyNote;
    if (wcState.tempPhoneConfig.icons) {
        if (!char.phoneConfig.icons) char.phoneConfig.icons = {};
        Object.assign(char.phoneConfig.icons, wcState.tempPhoneConfig.icons);
    }
    wcSaveData();
    wcCloseModal('wc-modal-phone-settings');
    
    const screenBg = document.getElementById('wc-phone-screen-bg');
    if (char.phoneConfig.wallpaper) screenBg.style.backgroundImage = `url('${char.phoneConfig.wallpaper}')`;
    
    const noteBg = document.getElementById('wc-sticky-note-bg');
    if (char.phoneConfig.stickyNote) noteBg.style.backgroundImage = `url('${char.phoneConfig.stickyNote}')`;

    

    const icons = char.phoneConfig.icons || {};
    ['msg', 'browser', 'cart', 'settings'].forEach(id => {
        if (icons[id]) document.getElementById(`wc-icon-${id === 'msg' ? 'message' : id}`).innerHTML = `<img src="${icons[id]}">`;
    });
}

function wcOpenPhoneApp(appName) {
    if (appName === 'message') {
        document.getElementById('wc-phone-app-message').style.display = 'flex';
        wcSwitchPhoneTab('chat');
    } else if (appName === 'settings') {
        document.getElementById('wc-phone-app-settings').style.display = 'flex';
        wcGeneratePhoneSettings(true); 
    } else if (appName === 'browser') {
        document.getElementById('wc-phone-app-browser').style.display = 'flex';
        wcRenderPhoneBrowserContent();
    } else if (appName === 'cart') { // <--- 新增这一段
        document.getElementById('wc-phone-app-cart').style.display = 'flex';
        wcState.phoneCartTab = 'cart'; // 默认打开购物车
        wcRenderPhoneCartContent();
    }
    document.getElementById('wc-phone-fingerprint-btn').style.display = 'none';
    document.getElementById('wc-phone-sticky-note').style.display = 'none';
}

// 找到 wcClosePhoneApp 函数，替换为以下代码：
function wcClosePhoneApp() {
    document.getElementById('wc-phone-app-message').style.display = 'none';
    document.getElementById('wc-phone-app-settings').style.display = 'none';
    document.getElementById('wc-phone-app-privacy').style.display = 'none';
    
    const favApp = document.getElementById('wc-phone-app-favorites');
    if(favApp) favApp.style.display = 'none';
    const browserApp = document.getElementById('wc-phone-app-browser');
    if(browserApp) browserApp.style.display = 'none';
    
    // 👇 新增这一段：关闭钱包页面
    const walletApp = document.getElementById('wc-phone-app-wallet');
    if(walletApp) walletApp.style.display = 'none';
    
    document.getElementById('wc-phone-fingerprint-btn').style.display = 'flex';

    // 👇 新增这一段：关闭手机模拟器里的购物车页面
    const cartApp = document.getElementById('wc-phone-app-cart');
    if(cartApp) cartApp.style.display = 'none';
    
    document.getElementById('wc-phone-fingerprint-btn').style.display = 'flex';
    document.getElementById('wc-phone-sticky-note').style.display = 'flex';
}

// 找到 wcClosePhoneSim 函数，替换为以下代码：
function wcClosePhoneSim() {
    document.getElementById('wc-view-phone-sim').classList.remove('active');
    document.getElementById('wc-phone-app-message').style.display = 'none';
    document.getElementById('wc-phone-app-settings').style.display = 'none';
    document.getElementById('wc-phone-app-privacy').style.display = 'none';
    
    const favApp = document.getElementById('wc-phone-app-favorites');
    if(favApp) favApp.style.display = 'none';
    const browserApp = document.getElementById('wc-phone-app-browser');
    if(browserApp) browserApp.style.display = 'none';

    const cartApp = document.getElementById('wc-phone-app-cart');
    if(cartApp) cartApp.style.display = 'none';

    // 👇 新增这一段：确保彻底退出手机模拟器时，钱包也被重置隐藏
    const walletApp = document.getElementById('wc-phone-app-wallet');
    if(walletApp) walletApp.style.display = 'none';

    wcStopPhoneClock();
}

// --- Phone App Navigation ---

function wcSwitchPhoneTab(tab) {
    wcState.phoneAppTab = tab;
    
    document.querySelectorAll('.wc-phone-tab-item').forEach(t => t.classList.remove('active'));
    document.getElementById(`wc-phone-tab-${tab}`).classList.add('active');

    const headerLeft = document.getElementById('wc-phone-header-left');
    const headerTitle = document.getElementById('wc-phone-header-title');
    const content = document.getElementById('wc-phone-app-content');
    
    content.innerHTML = '';

    if (tab === 'chat') {
        headerTitle.innerText = '微信';
        headerLeft.innerHTML = `<div onclick="wcConfirmGenerateChats()" style="cursor: pointer; display: flex; align-items: center;"><svg class="wc-icon" style="width: 20px; height: 20px;" viewBox="0 0 24 24"><path d="M23 4v6h-6"></path><path d="M1 20v-6h6"></path><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg></div>`;
        wcRenderPhoneChats();
    } else if (tab === 'contacts') {
        headerTitle.innerText = '通讯录';
        headerLeft.innerHTML = `<div onclick="wcOpenPhoneContactsGenModal()" style="cursor: pointer; display: flex; align-items: center;"><svg class="wc-icon" style="width: 22px; height: 22px;" viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="20" y1="8" x2="20" y2="14"></line><line x1="23" y1="11" x2="17" y2="11"></line></svg></div>`;
        wcRenderPhoneContacts();
    } else if (tab === 'me') {
        headerTitle.innerText = '我';
        // 核心修改：在左上角增加一键破解按钮
        headerLeft.innerHTML = `<div onclick="wcGeneratePrivacyAndFavorites()" style="cursor: pointer; display: flex; align-items: center; font-size: 14px; color: #007AFF;"><svg class="wc-icon" viewBox="0 0 24 24" style="width: 16px; height: 16px; margin-right: 4px;"><path d="M21 2v6h-6"></path><path d="M3 12a9 9 0 1 0 2.13-5.85L2 9"></path></svg>一键破解</div>`;
        wcRenderPhoneMe();
    }
}

function wcRenderPhoneMe() {
    const char = wcState.characters.find(c => c.id === wcState.editingCharId);
    const content = document.getElementById('wc-phone-app-content');
    if (!char) return;

    const profile = char.phoneData && char.phoneData.profile ? char.phoneData.profile : { nickname: char.name, sign: "暂无签名" };

    content.innerHTML = `
        <div style="background: #fff; padding: 30px 20px; display: flex; align-items: center; margin-bottom: 10px
;">
            <img src="${char.avatar}" style="width: 64px; height: 64px; border-radius: 8px; margin-right: 16px; object-fit: cover;">
            <div style="flex: 1;">
                <div style="font-size: 20px; font-weight: 600; margin-bottom: 4px;">${profile.nickname}</div>
                <div style="font-size: 14px; color: #888;">微信号: wxid_${char.id.toString().substring(0,8)}</div>
                <div style="font-size: 13px; color: #888; margin-top: 4px;">个性签名: ${profile.sign}</div>
            </div>
        </div>
        
        <div class="wc-list-group" style="margin: 0;">
            <div class="wc-list-item" onclick="wcOpenPhoneWallet()" style="background: #fff; border-bottom: 0.5px solid #E5E5EA;">
                <svg class="wc-icon" style="margin-right: 10px; color: #FA9D3B;" viewBox="0 0 24 24"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>
                <div class="wc-item-content">
                    <div class="wc-item-title">支付</div>
                </div>
                <svg class="chevron-right" viewBox="0 0 24 24"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>
            </div>
        </div>
        
        <div class="wc-list-group" style="margin-top: 10px;">
            <!-- 新增：收藏 -->
            <div class="wc-list-item" onclick="wcOpenPhoneFavorites()" style="background: #fff; border-bottom: 0.5px solid #E5E5EA;">
                <svg class="wc-icon" style="margin-right: 10px; color: #FFC107;" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                <div class="wc-item-content">
                    <div class="wc-item-title">收藏</div>
                </div>
                <svg class="chevron-right" viewBox="0 0 24 24"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>
            </div>
            <div class="wc-list-item" onclick="wcOpenPhonePrivacy()" style="background: #fff; border-bottom: 0.5px solid #E5E5EA;">
                <svg class="wc-icon" style="margin-right: 10px; color: #007AFF;" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                <div class="wc-item-content">
                    <div class="wc-item-title">隐私</div>
                </div>
                <svg class="chevron-right" viewBox="0 0 24 24"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>
            </div>
            <div class="wc-list-item" style="background: #fff;">
                <svg class="wc-icon" style="margin-right: 10px; color: #8E8E93;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                <div class="wc-item-content">
                    <div class="wc-item-title">设置</div>
                </div>
                <svg class="chevron-right" viewBox="0 0 24 24"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>
            </div>
        </div>
    `;
}

// --- Phone Privacy Logic (New) ---
function wcOpenPhonePrivacy() {
    document.getElementById('wc-phone-app-privacy').style.display = 'flex';
    wcRenderPhonePrivacyContent();
}

function wcClosePhonePrivacy() {
    document.getElementById('wc-phone-app-privacy').style.display = 'none';
}

function wcRenderPhonePrivacyContent() {
    const char = wcState.characters.find(c => c.id === wcState.editingCharId);
    const content = document.getElementById('wc-phone-privacy-content');
    if (!char) return;

    const privacyData = (char.phoneData && char.phoneData.privacy) ? char.phoneData.privacy : null;

    if (!privacyData) {
        content.innerHTML = '<div style="padding: 40px 20px; text-align: center; color: #8E8E93; font-size: 14px;">点击左上角「刷新」<br>偷偷查看 Ta 的私密记录...</div>';
        return;
    }

    let masturbationData = null;
    let wetDreamData = null;

    if (privacyData.masturbation || privacyData.wetDream) {
        masturbationData = privacyData.masturbation;
        wetDreamData = privacyData.wetDream;
    } else if (privacyData.time && privacyData.action) {
        masturbationData = privacyData; 
    }

    let html = '';

    if (masturbationData) {
        const sigM = getFavSignature('masturbation', '私密记录', masturbationData.time || '', `[状态] ${masturbationData.status || '无'}\n[动作] ${masturbationData.action || '无'}\n[感受] ${masturbationData.feeling || '无'}`);
        const isFavM = wcState.myFavorites && wcState.myFavorites.some(f => f.sig === sigM);
        
        html += `
            <div style="background: #fff; border-radius: 12px; padding: 20px; margin-bottom: 16px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); position: relative;">
                <div style="font-size: 18px; font-weight: 600; margin-bottom: 15px; color: #FF3B30; display: flex; align-items: center; gap: 8px;">
                    <svg class="wc-icon" viewBox="0 0 24 24" style="width: 20px; height: 20px; stroke: currentColor;"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                    自慰记录
                </div>
                <div style="margin-bottom: 12px; padding-right: 60px;">
                    <span style="font-size: 13px; color: #8E8E93;">时间：</span>
                    <span style="font-size: 15px; color: #333;">${masturbationData.time || '未知'}</span>
                </div>
                <div style="margin-bottom: 12px;">
                    <span style="font-size: 13px; color: #8E8E93;">状态：</span>
                    <span style="font-size: 15px; color: #333;">${masturbationData.status || '未知'}</span>
                </div>
                <div style="margin-bottom: 12px;">
                    <div style="font-size: 13px; color: #8E8E93; margin-bottom: 4px;">动作描述：</div>
                    <div style="font-size: 15px; color: #333; line-height: 1.5; background: #F9F9F9; padding: 10px; border-radius: 8px;">${masturbationData.action || '无'}</div>
                </div>
                <div>
                    <div style="font-size: 13px; color: #8E8E93; margin-bottom: 4px;">内心感受：</div>
                    <div style="font-size: 15px; color: #333; line-height: 1.5; background: #F9F9F9; padding: 10px; border-radius: 8px;">${masturbationData.feeling || '无'}</div>
                </div>
                <!-- 收藏按钮 -->
                <div onclick="wcToggleFavorite(event, 'masturbation', 0)" style="position: absolute; top: 20px; right: 56px; width: 28px; height: 28px; background: #f5f5f5; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: ${isFavM ? '#111' : '#CCC'}; cursor: pointer; transition: all 0.2s;">
                    <svg viewBox="0 0 24 24" style="width: 14px; height: 14px; fill: ${isFavM ? 'currentColor' : 'none'}; stroke: currentColor; stroke-width: 2;"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                </div>
                <!-- 分享按钮 -->
                <div onclick="wcTriggerShare(event, 'masturbation', 0)" style="position: absolute; top: 20px; right: 20px; width: 28px; height: 28px; background: #f5f5f5; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #111; cursor: pointer; transition: background 0.2s;">
                    <svg viewBox="0 0 24 24" style="width: 14px; height: 14px; fill: none; stroke: currentColor; stroke-width: 2;"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path><polyline points="16 6 12 2 8 6"></polyline><line x1="12" y1="2" x2="12" y2="15"></line></svg>
                </div>
            </div>
        `;
    }

    if (wetDreamData) {
        const sigW = getFavSignature('wetDream', '春梦记录', wetDreamData.time || '', `[状态] ${wetDreamData.status || '无'}\n[梦境] ${wetDreamData.dream || '无'}\n[感受] ${wetDreamData.feeling || '无'}`);
        const isFavW = wcState.myFavorites && wcState.myFavorites.some(f => f.sig === sigW);

        html += `
            <div style="background: #fff; border-radius: 12px; padding: 20px; margin-bottom: 16px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); position: relative;">
                <div style="font-size: 18px; font-weight: 600; margin-bottom: 15px; color: #9C27B0; display: flex; align-items: center; gap: 8px;">
                    <svg class="wc-icon" viewBox="0 0 24 24" style="width: 20px; height: 20px; stroke: currentColor; fill: none; stroke-width: 2;"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
                    春梦记录
                </div>
                <div style="margin-bottom: 12px; padding-right: 60px;">
                    <span style="font-size: 13px; color: #8E8E93;">时间：</span>
                    <span style="font-size: 15px; color: #333;">${wetDreamData.time || '未知'}</span>
                </div>
                <div style="margin-bottom: 12px;">
                    <span style="font-size: 13px; color: #8E8E93;">状态：</span>
                    <span style="font-size: 15px; color: #333;">${wetDreamData.status || '未知'}</span>
                </div>
                <div style="margin-bottom: 12px;">
                    <div style="font-size: 13px; color: #8E8E93; margin-bottom: 4px;">梦境描述：</div>
                    <div style="font-size: 15px; color: #333; line-height: 1.5; background: #F3E5F5; padding: 10px; border-radius: 8px;">${wetDreamData.dream || '无'}</div>
                </div>
                <div>
                    <div style="font-size: 13px; color: #8E8E93; margin-bottom: 4px;">内心感受：</div>
                    <div style="font-size: 15px; color: #333; line-height: 1.5; background: #F3E5F5; padding: 10px; border-radius: 8px;">${wetDreamData.feeling || '无'}</div>
                </div>
                <!-- 收藏按钮 -->
                <div onclick="wcToggleFavorite(event, 'wetDream', 0)" style="position: absolute; top: 20px; right: 56px; width: 28px; height: 28px; background: #f5f5f5; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: ${isFavW ? '#111' : '#CCC'}; cursor: pointer; transition: all 0.2s;">
                    <svg viewBox="0 0 24 24" style="width: 14px; height: 14px; fill: ${isFavW ? 'currentColor' : 'none'}; stroke: currentColor; stroke-width: 2;"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                </div>
                <!-- 分享按钮 -->
                <div onclick="wcTriggerShare(event, 'wetDream', 0)" style="position: absolute; top: 20px; right: 20px; width: 28px; height: 28px; background: #f5f5f5; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #111; cursor: pointer; transition: background 0.2s;">
                    <svg viewBox="0 0 24 24" style="width: 14px; height: 14px; fill: none; stroke: currentColor; stroke-width: 2;"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path><polyline points="16 6 12 2 8 6"></polyline><line x1="12" y1="2" x2="12" y2="15"></line></svg>
                </div>
            </div>
        `;
    }

    content.innerHTML = html;
}
// ==========================================
// 辅助函数：获取角色生活状态提示词
// ==========================================
function getLifeStatusPrompt(char) {
    if (!char || !char.lifeStatus || char.lifeStatus.location === "未知") return "";
    if (char.chatConfig && char.chatConfig.lifeStatusEnabled === false) return "";
    let text = `\n【当前生活状态参考 (请让生成的内容符合此状态，增强真实感)】：\n`;
    text += `- 当前位置：${char.lifeStatus.location}\n`;
    text += `- 正在做的事：${char.lifeStatus.action}\n`;
    text += `- 当前心情/状态：${char.lifeStatus.mood}\n`;
    if (char.lifeStatus.timeline && char.lifeStatus.timeline.length > 0) {
        text += `- 今日行程：\n` + char.lifeStatus.timeline.map(t => `  [${t.time}] ${t.content}`).join('\n') + `\n`;
    }
    return text;
}

async function wcGeneratePhonePrivacy() {
    const char = wcState.characters.find(c => c.id === wcState.editingCharId);
    if (!char) return;

    const apiConfig = await getActiveApiConfig('phone');
    if (!apiConfig || !apiConfig.key) return alert("请先配置 API");

    const limit = apiConfig.limit || 50;
    if (limit > 0 && sessionApiCallCount >= limit) {
        wcShowError("已达到API调用上限");
        return;
    }
    sessionApiCallCount++;

    wcShowLoading("正在破解私密空间...");

    try {
        const realMsgs = wcState.chats[char.id] || [];
        const recentMsgs = realMsgs.slice(-30).map(m => `${m.sender==='me'?'User':char.name}: ${m.content}`).join('\n');
        const chatConfig = char.chatConfig || {};
        const userPersona = chatConfig.userPersona || wcState.user.persona || "无";

        // 核心修复：只读取关联的世界书
        let wbInfo = "";
        if (worldbookEntries.length > 0 && chatConfig.worldbookEntries && chatConfig.worldbookEntries.length > 0) {
            const linkedEntries = worldbookEntries.filter(e => chatConfig.worldbookEntries.includes(e.id.toString()));
            if (linkedEntries.length > 0) {
                wbInfo = "【世界观参考】:\n" + linkedEntries.map(e => `${e.title}: ${e.desc}`).join('\n');
            }
        }

        const now = new Date();
        const timeString = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日 ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        const dayString = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'][now.getDay()];
        const timePrompt = `\n【绝对时间基准】：当前现实时间是 ${timeString} ${dayString}。你生成的所有数据（包括时间戳、事件状态等）必须严格符合这个当前时间！绝对不能出现未来的时间，且早中晚的逻辑必须自洽。\n`;

        const lifeStatusPrompt = getLifeStatusPrompt(char); // 新增

        let prompt = `你扮演角色：${char.name}。\n`;
        prompt += timePrompt;
        prompt += `人设：${char.prompt}\n${wbInfo}\n`;
        prompt += `【用户(User)设定】：${userPersona}\n`;
        prompt += lifeStatusPrompt; // 新增
        prompt += `【核心场景设定】：我（User）现在正在偷偷查看你（${char.name}）手机上的私密记录APP。\n`;
        prompt += `【最近我们的聊天记录（20-30条）】：\n${recentMsgs}\n\n`;
        
        prompt += `请基于你的人设、我的设定，以及我们**最近的聊天上下文**，生成你最近的【私密自慰记录】和【春梦记录】。\n`;
        prompt += `【要求】：\n`;
        prompt += `1. 内容必须高度贴合最近的聊天内容（例如：如果聊天中我在欺负你，你的记录里可能会充满委屈和渴望；如果我们在暧昧，记录里可能满脑子都是我）。\n`;
        prompt += `2. 描写要富有沉浸感、细腻、符合角色性格。\n`;
        prompt += `3. 返回纯 JSON 对象，包含 "masturbation" 和 "wetDream" 两个部分，格式如下：\n`;
        prompt += `{
          "masturbation": {
            "time": "昨晚深夜 / 刚刚",
            "status": "简短的状态概括，如：极度渴望、边哭边弄等",
            "action": "具体的动作描述，你是如何触碰自己的，用了什么物品，或者看着什么东西（比如我的照片/聊天记录）",
            "feeling": "详细的内心感受，对User的情感，身体的反应等"
          },
          "wetDream": {
            "time": "前天夜里 / 昨晚",
            "status": "梦醒后的状态，如：满头大汗、内裤湿透、回味无穷等",
            "dream": "梦境的具体描述，梦里User对你做了什么，场景是怎样的",
            "feeling": "醒来后的内心感受，羞耻、渴望还是空虚"
          }
        }\n`;

        const response = await fetch(`${apiConfig.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiConfig.key}` },
            body: JSON.stringify({
                model: apiConfig.model,
                messages: [{ role: "user", content: prompt }],
                 temperature: parseFloat(apiConfig.temp) || 0.8,
                 max_tokens: 4000
            })
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error?.message || `HTTP 错误: ${response.status}`);
        }
        if (!data.choices || !data.choices[0] || !data.choices[0].message) {
            throw new Error("API 返回数据异常，请检查模型名称是否正确。");
        }

        let content = data.choices[0].message.content;
        content = content.replace(/<thinking>[\s\S]*?<\/thinking>/g, '').trim();
        content = content.replace(/```json/g, '').replace(/```/g, '').trim();
        
        let privacyData;
        try {
            privacyData = JSON.parse(content);
        } catch (parseErr) {
            throw new Error("AI 返回的 JSON 格式错误，请重试。返回内容：" + content.substring(0, 50) + "...");
        }

        if (!char.phoneData) char.phoneData = {};
        char.phoneData.privacy = privacyData;
        wcSaveData();

        wcRenderPhonePrivacyContent();
        wcShowSuccess("破解成功");

    } catch (e) {
        console.error(e);
        if (typeof showApiErrorModal === 'function') {
            showApiErrorModal(`[查手机生成失败] ${e.message}`);
        } else {
            wcShowError("生成失败");
        }
    }
}

function wcOpenPhoneWallet() {
    document.getElementById('wc-phone-app-wallet').style.display = 'flex';
    wcRenderPhoneWalletContent();
}

function wcClosePhoneWallet() {
    document.getElementById('wc-phone-app-wallet').style.display = 'none';
}

function wcRenderPhoneWalletContent() {
    const char = wcState.characters.find(c => c.id === wcState.editingCharId);
    const content = document.getElementById('wc-phone-wallet-content');
    if (!char) return;

    const wallet = (char.phoneData && char.phoneData.wallet) ? char.phoneData.wallet : { balance: 0.00, transactions: [] };

    let transHtml = '';
    if (wallet.transactions && wallet.transactions.length > 0) {
        wallet.transactions.forEach(t => {
            const isIncome = t.type === 'income';
            const sign = isIncome ? '+' : '-';
            const colorClass = isIncome ? 'wc-amount-in' : 'wc-amount-out';
            transHtml += `
                <div class="wc-transaction-item">
                    <div class="wc-trans-info">
                        <div class="wc-trans-title">${t.note}</div>
                        <div class="wc-trans-time">${t.time}</div>
                    </div>
                    <div class="wc-trans-amount ${colorClass}">${sign}${parseFloat(t.amount).toFixed(2)}</div>
                </div>
            `;
        });
    } else {
        transHtml = '<div style="padding: 20px; text-align: center; color: #8E8E93;">暂无交易记录</div>';
    }

    content.innerHTML = `
        <div class="wc-wallet-header" style="padding: 30px 20px; margin-bottom: 10px; background: #07C160; color: white;">
            <svg class="wc-icon wc-wallet-icon-lg" style="color: white;" viewBox="0 0 24 24"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>
            <div class="wc-wallet-balance-label" style="color: rgba(255,255,255,0.8);">当前余额 (元)</div>
            <div class="wc-wallet-balance-num" style="color: white;">${parseFloat(wallet.balance).toFixed(2)}</div>
        </div>
        <div class="wc-list-group-title" style="padding: 0 16px 8px; color: var(--wc-text-secondary); font-size: 13px;">交易记录</div>
        <div style="background: #fff;">
            ${transHtml}
        </div>
    `;
}

async function wcGenerateCharWallet() {
    const char = wcState.characters.find(c => c.id === wcState.editingCharId);
    if (!char) return;

    const apiConfig = await getActiveApiConfig('phone');
    if (!apiConfig || !apiConfig.key) return alert("请先配置 API");

    // 检查限制
    const limit = apiConfig.limit || 50;
    if (limit > 0 && sessionApiCallCount >= limit) {
        wcShowError("已达到API调用上限");
        return;
    }
    sessionApiCallCount++;

    wcShowLoading("正在生成钱包数据...");

    try {
        const chatConfig = char.chatConfig || {};
        const userPersona = chatConfig.userPersona || wcState.user.persona || "无";
        
        // 核心修复：只读取关联的世界书
        let wbInfo = "";
        if (worldbookEntries.length > 0 && chatConfig.worldbookEntries && chatConfig.worldbookEntries.length > 0) {
            const linkedEntries = worldbookEntries.filter(e => chatConfig.worldbookEntries.includes(e.id.toString()));
            if (linkedEntries.length > 0) {
                wbInfo = "【世界观参考】:\n" + linkedEntries.map(e => `${e.title}: ${e.desc}`).join('\n');
            }
        }

        const msgs = wcState.chats[char.id] || [];
        const recentMsgs = msgs.slice(-20).map(m => `${m.sender==='me'?'User':char.name}: ${m.content}`).join('\n');

        const now = new Date();
        const timeString = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日 ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        const dayString = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'][now.getDay()];
        const timePrompt = `\n【绝对时间基准】：当前现实时间是 ${timeString} ${dayString}。你生成的交易记录时间(time)必须在当前时间之前，且符合常理（如凌晨3点通常不会有早餐店消费）。\n`;

        const lifeStatusPrompt = getLifeStatusPrompt(char); // 新增

        let prompt = `你扮演角色：${char.name}。\n`;
        prompt += timePrompt;
        prompt += `人设：${char.prompt}\n${wbInfo}\n`;
        prompt += `【用户(User)设定】：${userPersona}\n`;
        prompt += lifeStatusPrompt; 
        prompt += `【最近聊天记录】：\n${recentMsgs}\n\n`;
        
        prompt += `请根据角色的人设、当前生活状态以及聊天记录，生成该角色的微信钱包数据。\n`;
        prompt += `【核心要求（极具活人感与强因果逻辑）】：\n`;
        prompt += `1. 【反模板化警告】：绝对禁止生成随机的、毫无逻辑的账单！\n`;
        prompt += `2. 账单必须是【今日行程】和【聊天记录】的直接体现！如果行程里写了“在便利店买水”，账单里就必须有便利店的支出；如果聊天里说“刚打车回家”，就必须有打车费。\n`;
        prompt += `3. 生成 5 到 10 条最近的交易记录 (transactions)。时间线必须与行程记录完美吻合！\n`;
        prompt += `4. 备注(note)必须极其具体，带有强烈的画面感或真实的内心吐槽（例如：“和User去吃的那家超贵的日料”、“下雨天溢价的打车费”）。\n`;
        prompt += `【内在逻辑要求】：在生成 JSON 之前，请确保你的内部推演包含：\n`;
        prompt += `1. 逐条分析【今日行程】和【聊天记录】，把里面提到的活动转化为具体的消费金额。\n`;
        prompt += `2. 确保账单的时间(time)与事件发生的时间逻辑一致。\n`;
        prompt += `推演结束后，直接返回纯 JSON 对象，格式如下：\n`;
        prompt += `{
  "balance": 1234.56,
  "transactions": [
    {"type": "expense", "amount": 25.50, "note": "具体的消费备注", "time": "10-23 02:15"},
    {"type": "income", "amount": 5000.00, "note": "收入备注", "time": "10-15 10:00"}
  ]
}\n`;
        prompt += `注意：type 只能是 'income' (收入) 或 'expense' (支出)。time 格式为简短日期。\n`;

        const response = await fetch(`${apiConfig.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiConfig.key}` },
            body: JSON.stringify({
                model: apiConfig.model,
                messages: [{ role: "user", content: prompt }],
                temperature: 0.7,
                max_tokens: 4000
            })
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error?.message || `HTTP 错误: ${response.status}`);
        }
        if (!data.choices || !data.choices[0] || !data.choices[0].message) {
            throw new Error("API 返回数据异常，请检查模型名称是否正确。");
        }

        let content = data.choices[0].message.content;
        content = content.replace(/<thinking>[\s\S]*?<\/thinking>/g, '').trim();
        content = content.replace(/```json/g, '').replace(/```/g, '').trim();
        
        let walletData;
        try {
            walletData = JSON.parse(content);
        } catch (parseErr) {
            throw new Error("AI 返回的 JSON 格式错误，请重试。返回内容：" + content.substring(0, 50) + "...");
        }

        if (!char.phoneData) char.phoneData = {};
        char.phoneData.wallet = walletData;
        wcSaveData();

        wcRenderPhoneWalletContent();
        wcShowSuccess("钱包生成成功");

    } catch (e) {
        console.error(e);
        if (typeof showApiErrorModal === 'function') {
            showApiErrorModal(`[钱包生成失败] ${e.message}`);
        } else {
            wcShowError("生成失败");
        }
    }
}

// --- Phone Settings Logic ---
async function wcGeneratePhoneSettings(renderOnly = false) {
    const char = wcState.characters.find(c => c.id === wcState.editingCharId);
    const content = document.getElementById('wc-phone-settings-content');
    if (!char) return;

    if (renderOnly) {
        const settings = char.phoneData && char.phoneData.settings ? char.phoneData.settings : { battery: 80, screenTime: "4小时20分", appUsage: [], locations: [], playlist: [] };
        renderSettingsUI(settings);
        return;
    }

    const apiConfig = await getActiveApiConfig('phone');
    if (!apiConfig || !apiConfig.key) return alert("请先配置 API");

    // 检查限制
    const limit = apiConfig.limit || 50;
    if (limit > 0 && sessionApiCallCount >= limit) {
        wcShowError("已达到API调用上限");
        return;
    }
    sessionApiCallCount++;

    wcShowLoading("正在生成手机状态与歌单...");

    try {
        const chatConfig = char.chatConfig || {};
        const userPersona = chatConfig.userPersona || wcState.user.persona || "无";
        const msgs = wcState.chats[char.id] || [];
        const recentMsgs = msgs.slice(-15).map(m => `${m.sender==='me'?'User':char.name}: ${m.content}`).join('\n');

        // 核心修复：只读取关联的世界书
        let wbInfo = "";
        if (worldbookEntries.length > 0 && chatConfig.worldbookEntries && chatConfig.worldbookEntries.length > 0) {
            const linkedEntries = worldbookEntries.filter(e => chatConfig.worldbookEntries.includes(e.id.toString()));
            if (linkedEntries.length > 0) {
                wbInfo = "【世界观参考】:\n" + linkedEntries.map(e => `${e.title}: ${e.desc}`).join('\n');
            }
        }

        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1;
        const date = now.getDate();
        const hours = now.getHours();
        const minutes = now.getMinutes();
        const timeString = `${year}年${month}月${date}日 ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
        const dayString = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'][now.getDay()];

        const lifeStatusPrompt = getLifeStatusPrompt(char); // 新增

        let prompt = `你扮演角色：${char.name}。\n人设：${char.prompt}\n${wbInfo}\n`;
        prompt += `【当前现实时间】：${timeString} ${dayString}\n请务必具备时间观念，生成的行程和应用使用情况必须符合当前的时间点。\n\n`;
        prompt += `【用户(User)设定】：${userPersona}\n`;
        prompt += lifeStatusPrompt; 
        prompt += `【最近聊天记录】：\n${recentMsgs}\n\n`;
        prompt += `请根据角色的人设、当前生活状态以及最近的聊天内容，生成该角色当前的手机状态数据。\n`;
        prompt += `【核心要求（极具活人感与强因果逻辑）】：\n`;
        prompt += `1. "battery": 当前电量。如果现在是深夜且Ta一直在和你聊天，电量应该偏低。\n`;
        prompt += `2. "appUsage": 5到15个应用的今日使用时长。必须映射【今日行程】！如果行程里在打游戏，游戏APP时长就高；如果在外面跑，导航APP时长就高。\n`;
        prompt += `3. "locations": 5到10个今日的行程记录。必须与传入的【当前生活状态参考】中的行程保持一致，并在此基础上进行细节扩写和吐槽(desc)。\n`;
        prompt += `4. "playlist": 10-15首真实存在的歌曲。必须完美契合Ta今天的心情(mood)和聊天氛围！\n`;
        prompt += `【内在逻辑要求】：在生成 JSON 之前，请确保你的内部推演包含：\n`;
        prompt += `1. 分析【当前生活状态】和【聊天记录】，确定今天的主基调（忙碌、悠闲、伤心、甜蜜）。\n`;
        prompt += `2. 根据主基调，推断手机电量、APP使用偏好和听歌品味。\n`;
        prompt += `推演结束后，直接返回纯 JSON 对象，格式如下：\n`;
        prompt += `{
  "battery": 12,
  "screenTime": "11小时30分",
  "appUsage": [
    {"name": "APP名称", "time": "4小时"}
  ],
  "locations": [
    {"time": "02:00", "place": "地点", "desc": "具体的动作和吐槽"}
  ],
  "playlist": [
    {"title": "歌名", "artist": "歌手"}
  ]
}`;

        const response = await fetch(`${apiConfig.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiConfig.key}` },
            body: JSON.stringify({
                model: apiConfig.model,
                messages: [{ role: "user", content: prompt }],
                temperature: 0.7,
                max_tokens: 4000
            })
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error?.message || `HTTP 错误: ${response.status}`);
        }
        if (!data.choices || !data.choices[0] || !data.choices[0].message) {
            throw new Error("API 返回数据异常，请检查模型名称是否正确。");
        }

        let contentStr = data.choices[0].message.content;
        contentStr = contentStr.replace(/<thinking>[\s\S]*?<\/thinking>/g, '').trim();
        contentStr = contentStr.replace(/```json/g, '').replace(/```/g, '').trim();
        
        let settingsData;
        try {
            settingsData = JSON.parse(contentStr);
        } catch (parseErr) {
            throw new Error("AI 返回的 JSON 格式错误，请重试。返回内容：" + contentStr.substring(0, 50) + "...");
        }

        if (!char.phoneData) char.phoneData = {};
        char.phoneData.settings = settingsData;
        wcSaveData();
        renderSettingsUI(settingsData);
        wcShowSuccess("状态更新成功");

    } catch (e) {
        console.error(e);
        if (typeof showApiErrorModal === 'function') {
            showApiErrorModal(`[状态生成失败] ${e.message}`);
        } else {
            wcShowError("生成失败");
        }
    }
}

function renderSettingsUI(data) {
    const content = document.getElementById('wc-phone-settings-content');
    
    let appUsageHtml = '';
    if (data.appUsage && data.appUsage.length > 0) {
        data.appUsage.forEach(app => {
            appUsageHtml += `
                <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee;">
                    <span>${app.name}</span>
                    <span style="color: #888;">${app.time}</span>
                </div>
            `;
        });
    } else {
        appUsageHtml = '<div style="color:#999; text-align:center; padding:10px;">暂无数据</div>';
    }

    let locationsHtml = '';
    if (data.locations && data.locations.length > 0) {
        data.locations.forEach(loc => {
            locationsHtml += `
                <div style="display: flex; padding: 10px 0; border-bottom: 1px solid #eee;">
                    <div style="width: 60px; color: #888; font-size: 13px;">${loc.time}</div>
                    <div style="flex: 1;">
                        <div style="font-weight: 500;">${loc.place}</div>
                        <div style="font-size: 12px; color: #888;">${loc.desc}</div>
                    </div>
                </div>
            `;
        });
    } else {
        locationsHtml = '<div style="color:#999; text-align:center; padding:10px;">暂无行程记录</div>';
    }

    let statusHtml = `
        <div id="wc-settings-tab-status" style="display: block; padding: 0 16px;">
            <div style="background: #fff; border-radius: 10px; padding: 16px; margin-bottom: 16px;">
                <div style="font-size: 16px; font-weight: 600; margin-bottom: 10px;">电池</div>
                <div style="display: flex; align-items: center;">
                    <div style="flex: 1; height: 20px; background: #eee; border-radius: 10px; overflow: hidden;">
                        <div style="width: ${data.battery}%; height: 100%; background: #34C759;"></div>
                    </div>
                    <span style="margin-left: 10px; font-weight: bold;">${data.battery}%</span>
                </div>
            </div>

            <div style="background: #fff; border-radius: 10px; padding: 16px; margin-bottom: 16px;">
                <div style="font-size: 16px; font-weight: 600; margin-bottom: 10px;">屏幕使用时间</div>
                <div style="font-size: 24px; font-weight: bold; margin-bottom: 16px;">${data.screenTime}</div>
                <div style="font-size: 14px; color: #888; margin-bottom: 8px;">应用使用排行</div>
                ${appUsageHtml}
            </div>

            <div style="background: #fff; border-radius: 10px; padding: 16px;">
                <div style="font-size: 16px; font-weight: 600; margin-bottom: 10px;">今日行程记录</div>
                ${locationsHtml}
            </div>
        </div>
    `;

    // 全新的歌单 UI 逻辑 (去除了默认图片和Emoji星光)
    let playlistHtml = `<div id="wc-settings-tab-playlist" style="display: none; position: relative; height: calc(100vh - 220px); overflow: hidden; background: #F9F9F9; margin: -16px; border-radius: 16px;">`;
    
    if (data.playlist && data.playlist.length > 0) {
        playlistHtml += `<div class="char-playlist-list" id="char-playlist-list">`;
        data.playlist.forEach((song, idx) => {
            playlistHtml += `
                <div class="char-playlist-item" id="char-playlist-item-${idx}" onclick="wcSelectAndPlayCharSong(${idx})">
                    <div class="char-playlist-item-title">${song.title}</div>
                    <div class="char-playlist-item-artist">${song.artist}</div>
                </div>
            `;
        });
        playlistHtml += `</div>`;
        
        // 右侧星空星球区域 (纯CSS光影，绝对无Emoji)
        playlistHtml += `
            <div class="char-playlist-record-area" id="char-playlist-record-area" ontouchstart="wcRecordTouchStart(event)" ontouchend="wcRecordTouchEnd(event)">
                <!-- 宇宙星云背景光晕 -->
                <div class="space-glow"></div>
                
                <!-- 环绕的星轨与纯CSS发光星点 -->
                <div class="planet-orbit orbit-1"></div>
                <div class="planet-orbit orbit-2"></div>
                <div class="planet-orbit orbit-3"></div>
                
                <!-- 星球本体 (替代黑胶) -->
                <div class="char-playlist-record" id="char-playlist-record">
                    <img src="" class="char-playlist-record-cover" id="char-playlist-record-cover">
                    <!-- 星球大气层反光遮罩 -->
                    <div class="planet-surface-gloss"></div>
                </div>
            </div>
            <div style="position: absolute; bottom: 20px; right: 150px; font-size: 10px; color: #999; pointer-events: none; animation: pulse 2s infinite;">↕ 滑动切歌</div>
        `;
    } else {
        playlistHtml += `<div style="text-align: center; color: #888; padding: 20px; width: 100%;">暂无歌单数据，请点击右上角刷新生成</div>`;
    }
    playlistHtml += `</div>`;

    content.style.padding = '0';
    content.innerHTML = `
        <div style="padding: 16px;">
            <div class="wc-segmented-control" style="margin-bottom: 0; background: #E5E5EA;">
                <div class="wc-segment-btn active" id="wc-seg-settings-status" onclick="wcToggleSettingsTab('status')">手机状态</div>
                <div class="wc-segment-btn" id="wc-seg-settings-playlist" onclick="wcToggleSettingsTab('playlist')">最近常听</div>
            </div>
        </div>
        ${statusHtml}
        ${playlistHtml}
    `;
}
window.wcToggleSettingsTab = function(tab) {
    const statusBtn = document.getElementById('wc-seg-settings-status');
    const playlistBtn = document.getElementById('wc-seg-settings-playlist');
    const statusTab = document.getElementById('wc-settings-tab-status');
    const playlistTab = document.getElementById('wc-settings-tab-playlist');
    
    if (statusBtn) statusBtn.classList.toggle('active', tab === 'status');
    if (playlistBtn) playlistBtn.classList.toggle('active', tab === 'playlist');
    if (statusTab) statusTab.style.display = tab === 'status' ? 'block' : 'none';
    if (playlistTab) playlistTab.style.display = tab === 'playlist' ? 'block' : 'none';
};

// 完整的播放函数
// ==========================================
// Char 歌单滑动与点击逻辑
// ==========================================
let wcRecordStartY = 0;
let wcCurrentPlaylistIdx = -1;

window.wcSelectAndPlayCharSong = function(idx) {
    wcCurrentPlaylistIdx = idx;
    
    // 更新列表高亮状态
    document.querySelectorAll('.char-playlist-item').forEach(el => el.classList.remove('active'));
    const activeItem = document.getElementById(`char-playlist-item-${idx}`);
    if (activeItem) {
        activeItem.classList.add('active');
        activeItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    
    // 唱片动画复位并转动
    const record = document.getElementById('char-playlist-record');
    if (record) {
        record.classList.remove('playing');
        setTimeout(() => record.classList.add('playing'), 50);
    }
    
    // 调用播放逻辑
    wcPlayCharPlaylistSong(idx);
};

window.wcRecordTouchStart = function(e) {
    wcRecordStartY = e.touches[0].clientY;
};

window.wcRecordTouchEnd = function(e) {
    const endY = e.changedTouches[0].clientY;
    const diff = endY - wcRecordStartY;
    
    const char = wcState.characters.find(c => c.id === wcState.editingCharId);
    if (!char || !char.phoneData || !char.phoneData.settings || !char.phoneData.settings.playlist) return;
    const playlist = char.phoneData.settings.playlist;
    
    if (diff > 30) {
        // 向下滑动，上一首
        let nextIdx = (wcCurrentPlaylistIdx - 1 + playlist.length) % playlist.length;
        wcSelectAndPlayCharSong(nextIdx);
    } else if (diff < -30) {
        // 向上滑动，下一首
        let nextIdx = (wcCurrentPlaylistIdx + 1) % playlist.length;
        wcSelectAndPlayCharSong(nextIdx);
    }
};

// 完整的播放函数 (去除了跳转，实现沉浸式播放)
async function wcPlayCharPlaylistSong(idx) {
    const char = wcState.characters.find(c => c.id === wcState.editingCharId);
    if (!char || !char.phoneData || !char.phoneData.settings || !char.phoneData.settings.playlist) return;
    
    const song = char.phoneData.settings.playlist[idx];
    if (!song) return;

    wcShowLoading(`正在搜索《${song.title}》...`);

    try {
        const keyword = `${song.title} ${song.artist}`;
        const res = await fetch(`https://zm.armoe.cn/cloudsearch?keywords=${encodeURIComponent(keyword)}`);
        const data = await res.json();
        
        if (data.code === 200 && data.result && data.result.songs && data.result.songs.length > 0) {
            const track = data.result.songs[0];
            const id = track.id;
            const title = track.name;
            const artist = track.ar.map(a => a.name).join(', ');
            const cover = track.al.picUrl + '?param=100y100';

            wcShowSuccess("即将播放");
            
            // 更新唱片封面
            const coverEl = document.getElementById('char-playlist-record-cover');
            if (coverEl) {
                coverEl.src = cover;
                coverEl.style.opacity = '1'; // 确保有图片时显示
            }
            
            // 延迟一下等待提示消失
            setTimeout(() => {
                // 【核心修改】：去除了关闭手机模拟器和打开全屏播放器的代码
                // 直接在后台更新播放列表并播放，保持在当前页面
                
                // 👇 修改：将歌曲追加到当前播放列表，而不是覆盖
                if (!musicState.currentPlaylist) musicState.currentPlaylist = [];
                
                // 检查列表中是否已经有这首歌，避免重复添加
                let existingIdx = musicState.currentPlaylist.findIndex(s => s.id === id);
                if (existingIdx !== -1) {
                    musicState.currentIndex = existingIdx;
                } else {
                    musicState.currentPlaylist.push({ id, title, artist, cover });
                    musicState.currentIndex = musicState.currentPlaylist.length - 1;
                }
                
                musicPlaySong(id, title, artist, cover);
                
                // 判断当前是否正在和该角色一起听歌
                if (musicState.listenTogether.active && musicState.listenTogether.charId === char.id) {
                    wcAddMessage(char.id, 'system', 'system', `[系统内部信息(仅AI可见): 用户偷偷查看了你的手机歌单，并点播了你最近常听的《${title}》，这首歌已加入你们的播放列表，现在你们正在一起听这首歌。]`, { hidden: true });
                }
                
            }, 1000);

        } else {
            wcShowError("未找到该歌曲资源");
        }
    } catch (e) {
        console.error(e);
        wcShowError("搜索失败，网络异常");
    }
}

// --- Phone Message Logic ---

// 【核心修复】：补充缺失的 wcGeneratePhoneChats 函数，并强化生成要求
async function wcGeneratePhoneChats() {
    const char = wcState.characters.find(c => c.id === wcState.editingCharId);
    if (!char) return;

    const apiConfig = await getActiveApiConfig('phone');
    if (!apiConfig || !apiConfig.key) return alert("请先配置 API");

    const limit = apiConfig.limit || 50;
    if (limit > 0 && sessionApiCallCount >= limit) {
        wcShowError("已达到API调用上限");
        return;
    }
    sessionApiCallCount++;

    wcShowLoading("正在生成聊天列表与记录...");

    try {
        const chatConfig = char.chatConfig || {};
        const userPersona = chatConfig.userPersona || wcState.user.persona || "无";
        const msgs = wcState.chats[char.id] || [];
        const recentMsgs = msgs.slice(-20).map(m => `${m.sender==='me'?'User':char.name}: ${m.content}`).join('\n');

        // 核心修复：只读取关联的世界书
        let wbInfo = "";
        if (worldbookEntries.length > 0 && chatConfig.worldbookEntries && chatConfig.worldbookEntries.length > 0) {
            const linkedEntries = worldbookEntries.filter(e => chatConfig.worldbookEntries.includes(e.id.toString()));
            if (linkedEntries.length > 0) {
                wbInfo = "【世界观参考】:\n" + linkedEntries.map(e => `${e.title}: ${e.desc}`).join('\n');
            }
        }

        // 提取通讯录 NPC 列表
        const contacts = char.phoneData && char.phoneData.contacts ? char.phoneData.contacts.filter(c => !c.isUser) : [];
        let contactsInfo = "通讯录中暂无其他NPC，请自由发挥生成。";
        if (contacts.length > 0) {
            contactsInfo = "【通讯录NPC列表】:\n" + contacts.map(c => `- ${c.name} (${c.type === 'group' ? '群聊' : '好友'}): ${c.desc}`).join('\n');
        }

        const now = new Date();
        const timeString = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

        let prompt = `你扮演角色：${char.name}。\n人设：${char.prompt}\n${wbInfo}\n`;
        prompt += `【当前时间】：${timeString}\n`;
        prompt += `【用户(User)设定】：${userPersona}\n`;
        prompt += `【最近你与User的聊天记录】：\n${recentMsgs}\n\n`;
        prompt += `${contactsInfo}\n\n`;
        
        prompt += `请根据角色的人设、当前生活状态、最近的聊天内容，以及【通讯录NPC列表】，生成该角色手机微信里的【聊天列表】和【详细聊天记录】。\n`;
        prompt += `【严格要求（极具活人感与独立社交）】：\n`;
        prompt += `1. 必须生成 3 到 8 个聊天会话。\n`;
        prompt += `2. 必须包含一个与用户(User)的会话，isUser 设为 true。\n`;
        prompt += `3. 其他会话必须从【通讯录NPC列表】中挑选人物/群聊生成，isGroup 表示是否为群聊。\n`;
        prompt += `4. 【最重要：独立社交指令】：你和 NPC 的聊天内容必须是真实的社交日常！例如：吐槽奇葩老板、聊游戏开黑、拼单点外卖、借钱、分享搞笑视频等。**绝对不要在每个群里都聊 User！你的世界不是只有 User！**同时要确保 User 可以隐秘体现在你的社交圈和你的生活里面！\n`;
        prompt += `5. 每个会话必须包含一个 "history" 数组，里面必须包含 8 到 15 条具体的聊天记录！绝对不能少于8条！\n`;
        prompt += `6. history 中的消息，sender 为 "me" 代表手机主人(${char.name})发出的，sender 为 "them" 代表对方发出的。\n`;
        prompt += `【内在逻辑要求】：在生成 JSON 之前，请确保你的内部推演包含：\n`;
        prompt += `1. 结合当前时间、地点和心情，推断你最近在和谁聊天，聊些什么（工作、八卦、游戏、求助等）。\n`;
        prompt += `2. 构思如何体现你独立的生活社交圈，同时也要保证 User 隐秘体现在你的社交圈和你的生活。\n`;
        prompt += `3. 确保聊天记录充满生活琐碎感和活人语气，拒绝生硬的问答。\n`;
        prompt += `推演结束后，直接返回纯 JSON 数组，格式如下：\n`;
        prompt += `[
  {
    "name": "User的备注名", "isUser": true, "isGroup": false, "lastMsg": "最近的一条消息", "time": "10:30",
    "history": [
      {"sender": "them", "content": "在干嘛？"},
      {"sender": "me", "content": "刚吃完饭"}
      // ... 确保这里有 8-15 条
    ]
  },
  {
    "name": "张三", "isUser": false, "isGroup": false, "lastMsg": "好的老板", "time": "星期二",
    "history": [
      {"sender": "them", "content": "这份文件看一下"},
      {"sender": "me", "content": "好的老板"}
      // ... 确保这里有 8-15 条
    ]
  }
]`;

        const response = await fetch(`${apiConfig.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiConfig.key}` },
            body: JSON.stringify({
                model: apiConfig.model,
                messages: [{ role: "user", content: prompt }],
                temperature: parseFloat(apiConfig.temp) || 0.8,
                max_tokens: 4000
            })
        });

        const data = await response.json();
        let content = data.choices[0].message.content;
        content = content.replace(/<thinking>[\s\S]*?<\/thinking>/g, '').trim();
        content = content.replace(/```json/g, '').replace(/```/g, '').trim();
        const chatsData = JSON.parse(content);

        if (!char.phoneData) char.phoneData = {};
        
        // 为每个生成的会话分配 ID 和初始化 history
        const formattedChats = chatsData.map(c => ({
            id: Date.now() + Math.random(),
            name: c.name,
            isUser: c.isUser || false,
            isGroup: c.isGroup || false,
            lastMsg: c.lastMsg || "",
            time: c.time || "",
            avatar: "", // 将在渲染时分配
            history: c.history || [] // 包含生成的 8-15 条记录
        }));

        char.phoneData.chats = formattedChats;
        wcSaveData();
        wcRenderPhoneChats();
        wcShowSuccess("聊天列表生成成功");

    } catch (e) {
        console.error(e);
        wcShowError("生成失败");
    }
}

function wcConfirmGenerateChats() {
    if (confirm("重新生成聊天列表将覆盖当前手机内的所有模拟对话记录，确定要继续吗？")) {
        wcGeneratePhoneChats();
    }
}

function wcRenderPhoneChats() {
    const char = wcState.characters.find(c => c.id === wcState.editingCharId);
    const contentDiv = document.getElementById('wc-phone-app-content');
    contentDiv.innerHTML = '';

    if (!char || !char.phoneData || !char.phoneData.chats || char.phoneData.chats.length === 0) {
        contentDiv.innerHTML = '<div style="padding: 20px; text-align: center; color: #999; font-size: 13px;">点击左上角刷新按钮<br>生成 AI 视角的聊天列表</div>';
        return;
    }

    char.phoneData.chats.forEach(chat => {
        const div = document.createElement('div');
        div.className = 'wc-list-item';
        div.style.background = 'white';
        div.style.borderBottom = '0.5px solid #E5E5EA';
        
        let imgHtml = '';
        if (chat.isUser) {
            const userAvatar = (char.chatConfig && char.chatConfig.userAvatar) ? char.chatConfig.userAvatar : wcState.user.avatar;
            imgHtml = `<img src="${userAvatar}" class="wc-avatar" style="width:40px;height:40px;border-radius:4px;">`;
        } else {
            let avatarUrl = chat.avatar;
            if (!avatarUrl) {
                const contact = char.phoneData.contacts ? char.phoneData.contacts.find(c => c.name === chat.name) : null;
                if (contact && contact.avatar) {
                    avatarUrl = contact.avatar;
                } else {
                    avatarUrl = getRandomNpcAvatar();
                }
                chat.avatar = avatarUrl;
                wcSaveData();
            }
            imgHtml = `<img src="${avatarUrl}" class="wc-avatar" style="width:40px;height:40px;border-radius:4px;">`;
        }

        div.innerHTML = `
            ${imgHtml}
            <div class="wc-item-content" style="margin-left:10px;">
                <div style="display:flex;justify-content:space-between;">
                    <div class="wc-item-title" style="font-size:15px;font-weight:500;">${chat.name}</div>
                    <div style="font-size:11px;color:#B2B2B2;">${chat.time}</div>
                </div>
                <div class="wc-item-subtitle" style="font-size:13px;color:#8E8E93;">${chat.lastMsg}</div>
            </div>
        `;
        
        div.onclick = () => wcOpenSimChatDetailSaved(chat);
        contentDiv.appendChild(div);
    });
}

function wcOpenSimChatDetailSaved(chatItem) {
    wcActiveSimChatId = chatItem.id;
    const detailView = document.getElementById('wc-phone-sim-chat-detail');
    const titleEl = document.getElementById('wc-sim-chat-title');
    const footer = document.getElementById('wc-sim-chat-footer');
    
    detailView.style.display = 'flex';
    titleEl.innerText = chatItem.name;
    
    const char = wcState.characters.find(c => c.id === wcState.editingCharId);
    const meAvatar = char.avatar; 
    let themAvatar = chatItem.avatar; 

    if (chatItem.isUser) {
        if(footer) footer.style.display = 'none';
        const realMsgs = wcState.chats[char.id] || [];
        const realHistory = realMsgs.slice(-20).map(m => ({
            sender: m.sender === 'me' ? 'them' : 'me', 
            content: m.content
        }));
        
        const userAvatar = (char.chatConfig && char.chatConfig.userAvatar) ? char.chatConfig.userAvatar : wcState.user.avatar;
        renderSimHistory(realHistory, meAvatar, userAvatar, false);
    } else {
        if(footer) footer.style.display = 'flex';
        if (!themAvatar) {
             const contact = char.phoneData.contacts ? char.phoneData.contacts.find(c => c.name === chatItem.name) : null;
             themAvatar = contact ? contact.avatar : getRandomNpcAvatar();
        }
        renderSimHistory(chatItem.history || [], meAvatar, themAvatar, chatItem.isGroup);
    }
}

function wcCloseSimChatDetail() {
    document.getElementById('wc-phone-sim-chat-detail').style.display = 'none';
    wcActiveSimChatId = null;
}

function wcSimSendMsg() {
    const input = document.getElementById('wc-sim-chat-input');
    const text = input.value.trim();
    if (!text) return;
    
    const char = wcState.characters.find(c => c.id === wcState.editingCharId);
    if (!char || !char.phoneData || !char.phoneData.chats) return;
    
    const chat = char.phoneData.chats.find(c => c.id === wcActiveSimChatId);
    if (!chat) return;
    
    if (!chat.history) chat.history = [];
    
    chat.history.push({ sender: 'me', content: text });
    chat.lastMsg = text;
    chat.time = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    
    const userName = (char.chatConfig && char.chatConfig.userName) ? char.chatConfig.userName : wcState.user.name;
    wcAddMessage(char.id, 'system', 'system', 
        `[系统内部信息(仅AI可见)：${userName}(User) 偷偷拿到了你(${char.name})的手机，并以你(${char.name})的名义，给你的手机联系人 "${chat.name}" 回复了消息: "${text}"]`, 
        { hidden: true }
    );

    wcSaveData();
    
    const meAvatar = char.avatar;
    let themAvatar = chat.avatar;
    if (!themAvatar) {
         const contact = char.phoneData.contacts ? char.phoneData.contacts.find(c => c.name === chat.name) : null;
         themAvatar = contact ? contact.avatar : getRandomNpcAvatar();
    }
    renderSimHistory(chat.history, meAvatar, themAvatar, chat.isGroup);
    
    wcRenderPhoneChats();
    input.value = '';
    
    input.style.height = '36px';
    document.getElementById('wc-sim-send-btn').style.display = 'none';
    document.getElementById('wc-sim-ai-btn').style.display = 'flex';
}

// --- 核心强化：NPC 回复防 OOC 与重点读取 ---
async function wcSimTriggerAI() {
    const char = wcState.characters.find(c => c.id === wcState.editingCharId);
    if (!char || !char.phoneData || !char.phoneData.chats) return;
    
    const chat = char.phoneData.chats.find(c => c.id === wcActiveSimChatId);
    if (!chat) return;

    const apiConfig = await getActiveApiConfig('chat');
    if (!apiConfig || !apiConfig.key) return alert("请配置 API");

    // 检查限制
    const limit = apiConfig.limit || 50;
    if (limit > 0 && sessionApiCallCount >= limit) {
        wcShowError("已达到API调用上限");
        return;
    }
    sessionApiCallCount++;

    const btn = document.querySelector('#wc-sim-chat-footer button:last-child');
    if(btn) btn.disabled = true;

    wcShowLoading("正在生成...");

    try {
        const now = new Date();
        const timeString = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

        let prompt = "";
        
        if (chat.isGroup) {
            prompt += `你正在模拟一个名为【${chat.name}】的微信群聊。\n`;
            prompt += `群聊背景/简介：${chat.desc || '无'}\n`;
            prompt += `群里的人正在跟群成员【${char.name}】(User扮演) 聊天。\n`;
            prompt += `【任务】：请重点读取群聊背景，以群里其他成员的身份回复消息。\n`;
            prompt += `【要求】：\n`;
            prompt += `1. 可以是一个人回复，也可以是几个人七嘴八舌。\n`;
            prompt += `2. 必须返回 JSON 数组，每个对象必须包含 "senderName" (发送者名字)。\n`;
            prompt += `3. 格式示例：[{"senderName":"张三", "content":"哈哈哈哈"}, {"senderName":"李四", "content":"确实"}]\n`;
        } else {
            // 单聊逻辑 - 史诗级强化防OOC
            prompt += `【最高指令】：你现在的唯一身份是【${chat.name}】！\n`;
            prompt += `【绝对禁止】：绝对禁止以【${char.name}】(手机主人) 或【User】(玩家) 的口吻回复！绝对禁止套用他们的人设和面具！\n`;
            prompt += `【你的核心人设/简介】：${chat.desc || '普通朋友'}\n`;
            prompt += `【任务】：请重点读取你的【核心人设/简介】和【最近聊天记录】，作为【${chat.name}】本人，回复 ${char.name} 的消息。必须符合你的人设口吻，严禁OOC！\n`;
            prompt += `【要求】：返回 JSON 数组，格式示例：[{"content":"好的"}]\n`;
        }
        
        prompt += `\n【当前时间】：${timeString}\n`;
        
        if (char.chatConfig && char.chatConfig.bilingualEnabled) {
            const sourceLang = char.chatConfig.bilingualSource || '英语';
            const targetLang = char.chatConfig.bilingualTarget || '中文';
            prompt += `\n【双语翻译模式强制指令】\n`;
            prompt += `你必须以双语形式回复。上面是${sourceLang}，下面是${targetLang}。\n`;
            prompt += `在 JSON 的 "content" 字段中，请严格使用以下 HTML 格式输出文本消息：\n`;
            prompt += `${sourceLang}内容<br><span style='font-size: 0.85em; opacity: 0.7;'>${targetLang}内容</span>\n`;
            prompt += `例如：[{"content":"Hello!<br><span style='font-size: 0.85em; opacity: 0.7;'>你好！</span>"}]\n`;
        }
        // 注入活人运转规则
        prompt += `\n【角色活人运转规则】\n`;
        prompt += `> 必须像真人一样聊天，拒绝机械回复。\n`;
        prompt += `> 必须将长回复拆分成多条短消息（1-4条），严禁把所有话挤在一个气泡里！\n`;
        prompt += `> 【重要约束】：绝对不要凭空捏造没有发生过的事情。请严格基于现有的聊天记录上下文进行自然的日常问候、吐槽或顺延当前话题。\n`;
        prompt += `> 【防重复约束】：严禁输出重复的句子或重复的对话序列！\n`;
        prompt += `> 【格式约束 (最高优先级)】：**必须且只能**输出合法的 JSON 数组，严禁在 JSON 外部输出任何多余字符！严禁漏掉引号、括号或逗号！严禁输出损坏的 JSON 格式！\n`;

        
        // 注入最近聊天记录 (增加读取条数)
        prompt += `\n【重点读取：最近聊天记录】：\n`;
        const recentHistory = (chat.history || []).slice(-15); 
        recentHistory.forEach(h => {
            const speaker = h.sender === 'me' ? char.name : (h.name || chat.name);
            prompt += `${speaker}: ${h.content}\n`;
        });
        
        if (chat.isGroup) {
            prompt += `(群成员发言):`;
        } else {
            prompt += `${chat.name}:`;
        }

        const response = await fetch(`${apiConfig.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiConfig.key}` },
            body: JSON.stringify({
                model: apiConfig.model,
                messages: [{ role: "user", content: prompt }],
                temperature: parseFloat(apiConfig.temp) || 0.8,
                max_tokens: 4000
            })
        });

        const data = await response.json();
        let content = data.choices[0].message.content.trim();
        
        // 解析 JSON
        let replies = [];
        try {
            let cleanText = content.replace(/<thinking>[\s\S]*?<\/thinking>/g, '').trim();
            cleanText = cleanText.replace(/```json/g, '').replace(/```/g, '').trim();
            const start = cleanText.indexOf('[');
            const end = cleanText.lastIndexOf(']');
            if (start !== -1 && end !== -1) {
                cleanText = cleanText.substring(start, end + 1);
                replies = JSON.parse(cleanText);
            } else {
                // 尝试解析单个对象
                const regex = /\{.*?\}/g;
                const matches = cleanText.match(regex);
                if (matches) {
                    replies = matches.map(m => JSON.parse(m));
                } else {
                    // 核心修复：如果连单个对象都匹配不到，强制把纯文本作为回复
                    throw new Error("No JSON found");
                }
            }
        } catch (e) {
            // 降级：如果解析失败，当纯文本处理 (仅限单聊)
            if (!chat.isGroup) {
                let cleanText = content.replace(/<thinking>[\s\S]*?<\/thinking>/g, '').trim();
                if (cleanText) {
                    replies = [{ content: cleanText }];
                } else {
                    replies = [{ content: "..." }]; // 兜底
                }
            }
        }

        if (!chat.history) chat.history = [];

        const meAvatar = char.avatar;
        let themAvatar = chat.avatar;
        if (!themAvatar) {
             const contact = char.phoneData.contacts ? char.phoneData.contacts.find(c => c.name === chat.name) : null;
             themAvatar = contact ? contact.avatar : getRandomNpcAvatar();
        }

        wcShowSuccess("回复成功");

        for (const reply of replies) {
            if (reply.content) {
                await wcDelay(1500); 
                
                // 构造消息对象
                const newMsg = { 
                    sender: 'them', 
                    content: reply.content,
                    name: reply.senderName || null // 存入发送者名字
                };
                
                chat.history.push(newMsg);
                
                // 更新最后一条消息预览
                let preview = reply.content;
                if (chat.isGroup && reply.senderName) {
                    preview = `${reply.senderName}: ${preview}`;
                }
                chat.lastMsg = preview;
                chat.time = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                
                wcSaveData();
                renderSimHistory(chat.history, meAvatar, themAvatar, chat.isGroup); // 传入 isGroup
                wcRenderPhoneChats();
            }
        }

    } catch (e) {
        console.error(e);
        wcShowError("AI 回复失败");
    } finally {
        if(btn) btn.disabled = false;
    }
}

function renderSimHistory(history, meAvatar, themAvatar, isGroup = false) {
    const container = document.getElementById('wc-sim-chat-history');
    container.innerHTML = '';
    
    let lastTime = 0;

    history.forEach(msg => {
        // --- 新增：渲染时间戳 (间隔大于5分钟显示) ---
        if (msg.time && (msg.time - lastTime > 5 * 60 * 1000)) {
            const timeDiv = document.createElement('div');
            timeDiv.style.textAlign = 'center';
            timeDiv.style.margin = '10px 0';
            // 使用系统自带的时间格式化函数
            timeDiv.innerHTML = `<span style="background: rgba(0,0,0,0.1); color: #fff; padding: 4px 8px; border-radius: 4px; font-size: 11px;">${wcFormatSystemTime(msg.time)}</span>`;
            container.appendChild(timeDiv);
            lastTime = msg.time;
        }

        const isMe = msg.sender === 'me'; 
        
        const row = document.createElement('div');
        row.style.display = 'flex';
        row.style.flexDirection = isMe ? 'row-reverse' : 'row';
        row.style.marginBottom = '15px'; 
        row.style.alignItems = 'flex-start';
        row.style.width = '100%'; 

        // 头像
        const avatar = document.createElement('img');
        avatar.style.width = '36px';
        avatar.style.height = '36px';
        avatar.style.borderRadius = '4px';
        avatar.style.flexShrink = '0';
        avatar.style.objectFit = 'cover';
        avatar.src = isMe ? meAvatar : themAvatar;
        
        // 消息内容容器
        const contentDiv = document.createElement('div');
        contentDiv.style.display = 'flex';
        contentDiv.style.flexDirection = 'column';
        contentDiv.style.alignItems = isMe ? 'flex-end' : 'flex-start';
        contentDiv.style.maxWidth = '70%';
        if (isMe) contentDiv.style.marginRight = '8px';
        else contentDiv.style.marginLeft = '8px';

        // 群聊显示名字
        if (isGroup && !isMe && msg.name) {
            const nameLabel = document.createElement('div');
            nameLabel.innerText = msg.name;
            nameLabel.style.fontSize = '10px';
            nameLabel.style.color = '#888';
            nameLabel.style.marginBottom = '2px';
            nameLabel.style.marginLeft = '2px';
            contentDiv.appendChild(nameLabel);
        }

        const bubble = document.createElement('div');
        bubble.style.position = 'relative';
        
        // --- 新增：表情包和图片渲染逻辑 ---
        if (msg.type === 'sticker' || msg.type === 'image') {
            bubble.innerHTML = `<img src="${msg.content}" style="max-width: 120px; max-height: 120px; border-radius: 8px; display: block; object-fit: cover;">`;
            bubble.style.background = 'transparent';
            bubble.style.padding = '0';
        } else {
            // 普通文本气泡
            bubble.style.padding = '8px 12px';
            bubble.style.borderRadius = '6px';
            bubble.style.fontSize = '15px';
            bubble.style.lineHeight = '1.4';
            bubble.style.wordBreak = 'break-word';
            if (isMe) {
                bubble.style.background = '#111111'; // 适配高级黑白主题
                bubble.style.color = '#FFFFFF';
                bubble.style.borderBottomRightRadius = '2px';
            } else {
                bubble.style.background = '#FFFFFF';
                bubble.style.color = '#111111';
                bubble.style.border = '1px solid #F0F0F0';
                bubble.style.borderBottomLeftRadius = '2px';
            }
            // 检测是否为双语格式
            const bilingualRegex = /^([\s\S]*?)(?:<br>\s*)+<span[^>]*>([\s\S]*?)<\/span>\s*$/i;
            const match = msg.content.match(bilingualRegex);
            
            if (match) {
                const originalText = match[1].replace(/^(<br>|\s)+|(<br>|\s)+$/gi, '');
                const translatedText = match[2].replace(/^(<br>|\s)+|(<br>|\s)+$/gi, '');
                const transId = 'sim-trans-' + Math.random().toString(36).substr(2, 9);
                
                bubble.style.cursor = 'pointer';
                bubble.onclick = function() { 
                    const el = document.getElementById(transId); 
                    if(el.style.display==='none'){el.style.display='block';}else{el.style.display='none';} 
                };
                // 核心修复：压缩为单行
                bubble.innerHTML = `<div style="word-break: break-word; width: 100%;">${originalText}</div><div id="${transId}" style="display: none; width: 100%; margin-top: 8px;"><div style="height: 1px; width: 100%; background-color: ${isMe ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.08)'}; margin-bottom: 8px;"></div><div style="font-size: 13px; word-break: break-word; color: ${isMe ? '#CCCCCC' : '#888888'};">${translatedText}</div></div>`;
            } else {
                bubble.innerHTML = msg.content;
            }
        }
        
        contentDiv.appendChild(bubble);
        
        row.appendChild(avatar);
        row.appendChild(contentDiv);
        container.appendChild(row);
    });
    setTimeout(() => { container.scrollTop = container.scrollHeight; }, 50);
}

// --- Phone Contacts Logic ---

function wcOpenPhoneContactsGenModal() {
    wcOpenModal('wc-modal-gen-contacts');
}

async function wcGeneratePhoneContacts() {
    const min = parseInt(document.getElementById('wc-gen-contact-min').value) || 3;
    const max = parseInt(document.getElementById('wc-gen-contact-max').value) || 8;
    const char = wcState.characters.find(c => c.id === wcState.editingCharId);
    if (!char) return;

   const apiConfig = await getActiveApiConfig('phone');
    if (!apiConfig || !apiConfig.key) return alert("请先配置 API");

    // 检查限制
    const limit = apiConfig.limit || 50;
    if (limit > 0 && sessionApiCallCount >= limit) {
        wcShowError("已达到API调用上限");
        return;
    }
    sessionApiCallCount++;

    wcShowLoading("正在生成通讯录...");

    try {
        const chatConfig = char.chatConfig || {};
        const userName = chatConfig.userName || wcState.user.name;
        const userPersona = chatConfig.userPersona || wcState.user.persona || "无";

        // 核心修复：只读取关联的世界书
        let wbInfo = "";
        if (worldbookEntries.length > 0 && chatConfig.worldbookEntries && chatConfig.worldbookEntries.length > 0) {
            const linkedEntries = worldbookEntries.filter(e => chatConfig.worldbookEntries.includes(e.id.toString()));
            if (linkedEntries.length > 0) {
                wbInfo = "【世界观参考】:\n" + linkedEntries.map(e => `${e.title}: ${e.desc}`).join('\n');
            }
        }

        let prompt = `你扮演角色：${char.name}。\n`;
        prompt += `人设：${char.prompt}\n${wbInfo}\n`;
        prompt += `【重要：用户身份】\n用户(User)的名字是：${userName}。\n用户在你的生活中的角色/人设是：${userPersona}。\n`;
        
        prompt += `请生成你的微信通讯录数据。总人数在 ${min} 到 ${max} 之间。\n`;
        prompt += `【要求】：\n`;
        prompt += `1. 生成两部分数据：'contacts'(已添加的好友/群) 和 'requests'(待验证的好友请求)。\n`;
        prompt += `2. 'requests' 应该有 1-2 个，或者没有。\n`;
        prompt += `3. 每个人物必须包含 'desc' (一句话概括来历/关系)。\n`;
        prompt += `4. 【绝对禁止】：不要在 'contacts' 或 'requests' 中生成用户(User)的条目！用户是固定的，我会自动添加。\n`;
        prompt += `5. 请单独返回一个字段 "userRemark"，表示你给用户(User)设置的备注名（例如：亲爱的、老板、傻瓜等）。\n`;
        prompt += `6. 返回纯 JSON 对象，格式如下：\n`;
        prompt += `{
  "userRemark": "给用户的备注",
  "contacts": [
    {"name": "张三", "type": "friend", "desc": "童年玩伴"},
    {"name": "冒险团", "type": "group", "desc": "工作群"}
  ],
  "requests": [
    {"name": "神秘人", "desc": "在酒馆遇到的陌生人"}
  ]
}\n`;

        const response = await fetch(`${apiConfig.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiConfig.key}` },
            body: JSON.stringify({
                model: apiConfig.model,
                messages: [{ role: "user", content: prompt }],
                temperature: parseFloat(apiConfig.temp) || 0.8,
                max_tokens: 4000
            })
        });

        const data = await response.json();
        let content = data.choices[0].message.content;
        content = content.replace(/<thinking>[\s\S]*?<\/thinking>/g, '').trim();
        content = content.replace(/```json/g, '').replace(/```/g, '').trim();
        const result = JSON.parse(content);

        if (!char.phoneData) char.phoneData = {};
        
        char.phoneData.userRemark = result.userRemark || userName;

        const userContact = {
            id: 'user_fixed_contact',
            name: char.phoneData.userRemark,
            desc: "我自己 (User)",
            type: 'friend',
            isUser: true 
        };

        const newContacts = (result.contacts || []).map(c => ({ 
            ...c, 
            id: Date.now() + Math.random(),
            avatar: getRandomNpcAvatar() 
        }));
        char.phoneData.contacts = [userContact, ...newContacts];

        const newRequests = (result.requests || []).map(r => ({ ...r, id: Date.now() + Math.random(), status: 'pending' }));
        char.phoneData.friendRequests = newRequests;

        wcSaveData();
        wcCloseModal('wc-modal-gen-contacts');
        wcRenderPhoneContacts();
        wcShowSuccess("通讯录生成成功");

    } catch (e) {
        console.error(e);
        wcShowError("生成失败");
    }
}

function wcRenderPhoneContacts() {
    const char = wcState.characters.find(c => c.id === wcState.editingCharId);
    const contentDiv = document.getElementById('wc-phone-app-content');
    contentDiv.innerHTML = '';

    if (!char || !char.phoneData) {
        contentDiv.innerHTML = '<div style="padding: 20px; text-align: center; color: #999; font-size: 13px;">点击左上角 + 号<br>生成通讯录</div>';
        return;
    }

    if (char.phoneData.friendRequests && char.phoneData.friendRequests.length > 0) {
        const header = document.createElement('div');
        header.className = 'wc-list-group-title';
        header.innerText = '新的朋友';
        contentDiv.appendChild(header);

        char.phoneData.friendRequests.forEach(req => {
            const div = document.createElement('div');
            div.className = 'wc-list-item';
            div.style.background = 'white';
            
            const color = '#' + ((req.name.length * 99999) % 16777215).toString(16).padStart(6, '0');
            
            div.innerHTML = `
                <div style="width:36px;height:36px;border-radius:4px;background:${color};display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;">${req.name[0]}</div>
                <div class="wc-item-content" style="margin-left:10px;">
                    <div class="wc-item-title">${req.name}</div>
                    <div class="wc-item-subtitle" style="font-size:12px;">${req.desc}</div>
                </div>
                <div style="display:flex; gap:5px;">
                    <button class="wc-btn-mini" style="background:#07C160; color:white; border:none; padding:4px 8px; border-radius:4px; font-size:12px;" onclick="wcHandleFriendRequest('${req.id}', 'accept')">接受</button>
                    <button class="wc-btn-mini" style="background:#FA5151; color:white; border:none; padding:4px 8px; border-radius:4px; font-size:12px;" onclick="wcHandleFriendRequest('${req.id}', 'reject')">拒绝</button>
                </div>
            `;
            contentDiv.appendChild(div);
        });
    }

    const header2 = document.createElement('div');
    header2.className = 'wc-list-group-title';
    header2.innerText = '联系人';
    contentDiv.appendChild(header2);

    const contacts = char.phoneData.contacts || [];
    contacts.forEach(contact => {
        const div = document.createElement('div');
        div.className = 'wc-list-item';
        div.style.background = 'white';
        div.style.borderBottom = '0.5px solid #E5E5EA';
        
        let imgHtml = '';
        if (contact.isUser) {
            const userAvatar = (char.chatConfig && char.chatConfig.userAvatar) ? char.chatConfig.userAvatar : wcState.user.avatar;
            imgHtml = `<img src="${userAvatar}" class="wc-avatar" style="width:36px;height:36px;border-radius:4px;">`;
        } else {
            let avatarUrl = contact.avatar;
            if (!avatarUrl) {
                avatarUrl = getRandomNpcAvatar();
                contact.avatar = avatarUrl; 
                wcSaveData();
            }
            imgHtml = `<img src="${avatarUrl}" class="wc-avatar" style="width:36px;height:36px;border-radius:4px;">`;
        }
        
        div.innerHTML = `
            ${imgHtml}
            <div class="wc-item-content" style="margin-left:10px;">
                <div class="wc-item-title">${contact.name}</div>
                <div class="wc-item-subtitle" style="font-size:12px; color:#999;">${contact.type === 'group' ? '[群聊]' : ''} ${contact.desc}</div>
            </div>
        `;
        div.onclick = () => wcShowPhoneContactDetail(contact);
        contentDiv.appendChild(div);
    });
}

function wcHandleFriendRequest(reqId, action) {
    const char = wcState.characters.find(c => c.id === wcState.editingCharId);
    if (!char) return;

    const reqIndex = char.phoneData.friendRequests.findIndex(r => r.id == reqId);
    if (reqIndex === -1) return;
    const req = char.phoneData.friendRequests[reqIndex];

    const userName = (char.chatConfig && char.chatConfig.userName) ? char.chatConfig.userName : wcState.user.name;
    if (action === 'accept') {
        if (!char.phoneData.contacts) char.phoneData.contacts = [];
        char.phoneData.contacts.push({
            id: req.id,
            name: req.name,
            desc: req.desc,
            type: 'friend',
            avatar: getRandomNpcAvatar() 
        });
        wcAddMessage(char.id, 'system', 'system', `[系统内部信息(仅AI可见)：${userName}(User) 偷偷拿到了你(${char.name})的手机，并替你(${char.name})通过了 "${req.name}" 的好友请求。现在 "${req.name}" 已经成了你(${char.name})的好友。]`, { hidden: true });
    } else {
        wcAddMessage(char.id, 'system', 'system', `[系统内部信息(仅AI可见)：${userName}(User) 偷偷拿到了你(${char.name})的手机，并替你(${char.name})拒绝了 "${req.name}" 的好友请求。]`, { hidden: true });
    }

    char.phoneData.friendRequests.splice(reqIndex, 1);
    wcSaveData();
    wcRenderPhoneContacts();
}

function wcDeletePhoneContact() {
    if (!currentPhoneContact) return;
    if (currentPhoneContact.isUser) return; 

    if (confirm(`确定要删除好友 "${currentPhoneContact.name}" 吗？`)) {
        const char = wcState.characters.find(c => c.id === wcState.editingCharId);
        const userName = (char.chatConfig && char.chatConfig.userName) ? char.chatConfig.userName : wcState.user.name;
        char.phoneData.contacts = char.phoneData.contacts.filter(c => c.id !== currentPhoneContact.id);
        
        wcAddMessage(char.id, 'system', 'system', `[系统内部信息(仅AI可见)：${userName}(User) 偷偷拿到了你(${char.name})的手机，并把你(${char.name})列表里的好友 "${currentPhoneContact.name}" 给删除了！]`, { hidden: true });
        
        wcSaveData();
        wcCloseModal('wc-modal-phone-contact-card');
        wcRenderPhoneContacts();
    }
}

async function wcShareContactToMain() {
    if (!currentPhoneContact) return;
    
    const name = currentPhoneContact.name;
    const desc = currentPhoneContact.desc;
    const avatar = currentPhoneContact.avatar || getRandomNpcAvatar(); 

    const newChar = {
        id: Date.now(),
        name: name,
        note: name,
        prompt: `你扮演 ${name}。背景设定：${desc}。`,
        avatar: avatar,
        isPinned: false
    };
    
    wcState.characters.push(newChar);
    await wcWriteCharactersPersistentSnapshot();
    try {
        await wcDb.put('characters', newChar);
    } catch (e) {
        console.warn('主聊天联系人写入 IndexedDB 失败，已保留本地兜底快照', e);
    }
    await wcSaveData();
    
    const char = wcState.characters.find(c => c.id === wcState.editingCharId);
    // 核心修改：明确告诉 AI 是 User 添加了好友，而不是 AI 自己添加的
    wcAddMessage(char.id, 'system', 'system', `[系统提示] 用户(User)通过偷看你的手机，将你的联系人 "${name}" 添加到了他自己的微信主列表中。`, { style: 'transparent', hidden: true });
    
    wcCloseModal('wc-modal-phone-contact-card');
    alert(`已将 ${name} 添加到主聊天列表！`);
    
    wcRenderAll();
}

function wcOpenShareCardModal() {
    const list = document.getElementById('wc-share-card-list');
    list.innerHTML = '';
    
    const targets = wcState.characters; 
    
    if (targets.length === 0) {
        list.innerHTML = '<div style="padding:20px; text-align:center; color:#999;">没有好友可分享</div>';
    } else {
        targets.forEach(t => {
            const div = document.createElement('div');
            div.className = 'wc-list-item';
            div.style.background = 'white';
            div.innerHTML = `
                <img src="${t.avatar}" class="wc-avatar" style="width:36px;height:36px;">
                <div class="wc-item-content"><div class="wc-item-title">${t.name}</div></div>
                <button class="wc-btn-mini" style="background:#07C160; color:white; border:none; padding:6px 12px; border-radius:4px;" onclick="wcConfirmShareCard(${t.id})">发送</button>
            `;
            list.appendChild(div);
        });
    }
    
    wcOpenModal('wc-modal-share-card-select');
}

function wcConfirmShareCard(targetCharId) {
    if (!currentPhoneContact) return;
    
    const targetChar = wcState.characters.find(c => c.id === targetCharId);
    
    if (targetChar) {
        const cardContent = `[名片] 姓名: ${currentPhoneContact.name} | 介绍: ${currentPhoneContact.desc}`;
        wcAddMessage(targetCharId, 'me', 'text', cardContent);
        alert(`已将 ${currentPhoneContact.name} 的名片发送给 ${targetChar.name}`);
        wcCloseModal('wc-modal-share-card-select');
    }
}

// --- WeChat Chat Settings (Modified for New UI) ---
function wcSwitchChatSettingsTab(tab) {
    // Hide all tabs
    document.querySelectorAll('.wc-cs-tab-content').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.wc-cs-tab-content').forEach(el => el.classList.remove('active'));
    
    // Remove active class from headers
    document.getElementById('wc-cs-char-btn').classList.remove('active');
    document.getElementById('wc-cs-user-btn').classList.remove('active');
    document.getElementById('wc-cs-heart-btn').classList.remove('active');

    // Show selected tab
    document.getElementById(`wc-cs-tab-${tab}`).style.display = 'block';
    document.getElementById(`wc-cs-tab-${tab}`).classList.add('active');
    document.getElementById(`wc-cs-${tab}-btn`).classList.add('active');

    // 👇 新增：星际轨道旋转逻辑 👇
    const wheel = document.getElementById('wc-cs-orbit-wheel');
    if (wheel) {
        let targetRotation = 0;
        if (tab === 'char') targetRotation = -26; // 对应左侧 item-0
        else if (tab === 'heart') targetRotation = 0; // 对应中间 item-1
        else if (tab === 'user') targetRotation = 26; // 对应右侧 item-2
        
        wheel.style.setProperty('--rotation', targetRotation);
    }
}

// 【新增】：渲染聊天背景图库
function wcRenderChatBgGallery() {
    const gallery = document.getElementById('wc-chat-bg-gallery');
    if (!gallery) return;
    gallery.innerHTML = '';
    
    if (wcState.chatBgPresets.length === 0) {
        gallery.innerHTML = '<div style="color:#999; font-size:12px;">暂无保存的背景</div>';
        return;
    }
    
    wcState.chatBgPresets.forEach((bg, idx) => {
        const item = document.createElement('div');
        item.className = 'wallpaper-item';
        item.style.backgroundImage = `url('${bg}')`;
        item.style.width = '60px';
        item.style.height = '80px';
        item.style.flexShrink = '0';
        item.style.position = 'relative';
        item.style.borderRadius = '6px';
        item.style.backgroundSize = 'cover';
        item.style.cursor = 'pointer';
        
        // 点击应用背景
        item.onclick = () => {
            document.getElementById('wc-setting-bg-preview').src = bg;
            document.getElementById('wc-setting-bg-preview').style.display = 'block';
            document.getElementById('wc-setting-bg-text').style.display = 'none';
            wcState.tempImage = bg;
            wcState.tempImageType = 'setting-bg';
            wcState.tempBgCleared = false;
        };
        
        // 删除按钮
        const del = document.createElement('div');
        del.className = 'wallpaper-delete';
        del.innerText = '×';
        del.onclick = (e) => {
            e.stopPropagation();
            wcState.chatBgPresets.splice(idx, 1);
            wcSaveData();
            wcRenderChatBgGallery();
        };
        
        item.appendChild(del);
        gallery.appendChild(item);
    });
}

function wcOpenChatSettings() {
    const char = wcState.characters.find(c => c.id === wcState.activeChatId);
    if (!char) return;
    if (!char.chatConfig) char.chatConfig = { userAvatar: wcState.user.avatar, userName: wcState.user.name, userPersona: wcState.user.persona, contextLimit: 0, summaryTrigger: 0, stickerGroupIds: [], backgroundImage: "", customCss: "", worldbookEntries: [] };
    
    // Populate Top UI
    document.getElementById('wc-cs-char-avatar-display').src = char.avatar;
    document.getElementById('wc-cs-char-name-display').innerText = char.name;
    document.getElementById('wc-cs-user-avatar-display').src = char.chatConfig.userAvatar || wcState.user.avatar;
    document.getElementById('wc-cs-user-name-display').innerText = char.chatConfig.userName || wcState.user.name;

    // Populate Inputs
    document.getElementById('wc-setting-char-avatar').src = char.avatar;
    document.getElementById('wc-setting-char-name').value = char.name;
    document.getElementById('wc-setting-char-note').value = char.note || "";
    document.getElementById('wc-setting-char-prompt').value = char.prompt || "";
    document.getElementById('wc-setting-life-status-toggle').checked = char.chatConfig.lifeStatusEnabled !== false; // 默认开启
    // 读取拉黑状态并更新按钮
    // 获取需要隐藏的元素容器
    const nameRow = document.getElementById('wc-setting-char-name').closest('.wc-avatar-row');
    const noteRow = document.getElementById('wc-setting-char-note').closest('.wc-form-group');
    const promptRow = document.getElementById('wc-setting-char-prompt').closest('.wc-form-group');
    const proactiveSection = document.getElementById('wc-setting-proactive-toggle').closest('.wc-settings-section');
    const stickerSection = document.getElementById('wc-setting-sticker-group-list').closest('.wc-form-group');

    const blockBtn = document.getElementById('wc-setting-block-btn');
    const groupMembersSection = document.getElementById('wc-setting-group-members-section');

    if (char.isGroup) {
        // 【群聊模式】：保留头像和名称，隐藏备注、人设、主动性、表情包、拉黑
        if(nameRow) {
            nameRow.style.display = 'flex'; // 恢复显示头像和名称
            const nameLabel = nameRow.querySelector('.wc-form-label');
            if(nameLabel) nameLabel.innerText = '群聊名称'; // 动态改个字，防止误解
        }
        if(noteRow) noteRow.style.display = 'none';
        if(promptRow) promptRow.style.display = 'none';
        if(proactiveSection) proactiveSection.style.display = 'none';
        if(stickerSection) stickerSection.style.display = 'none';
        
        if(blockBtn) blockBtn.style.display = 'none';
        renderGroupMembersInSettings(char);
    } else {
        // 【单聊模式】：恢复显示所有设置
        if(nameRow) {
            nameRow.style.display = 'flex';
            const nameLabel = nameRow.querySelector('.wc-form-label');
            if(nameLabel) nameLabel.innerText = '名称'; // 恢复为单聊的名称
        }
        if(noteRow) noteRow.style.display = 'block';
        if(promptRow) promptRow.style.display = 'block';
        if(proactiveSection) proactiveSection.style.display = 'block';
        if(stickerSection) stickerSection.style.display = 'block';

        if(blockBtn) blockBtn.style.display = 'block';
        if (groupMembersSection) groupMembersSection.style.display = 'none';
        
        if (char.isBlocked) {
            if(blockBtn) {
                blockBtn.innerText = "你已拉黑该角色";
                blockBtn.classList.add('blocked');
            }
        } else {
            if(blockBtn) {
                blockBtn.innerText = "拉黑该角色 (Block)";
                blockBtn.classList.remove('blocked');
            }
        }
    }


    document.getElementById('wc-setting-user-avatar').src = char.chatConfig.userAvatar || wcState.user.avatar;
    document.getElementById('wc-setting-user-name').value = char.chatConfig.userName || wcState.user.name;
    document.getElementById('wc-setting-user-prompt').value = char.chatConfig.userPersona || wcState.user.persona;
    
    const maskSelect = document.getElementById('wc-setting-user-mask-select');
    maskSelect.innerHTML = '<option value="">选择面具...</option>';
    wcState.masks.forEach(m => {
        const opt = document.createElement('option');
        opt.value = m.id;
        opt.innerText = m.name;
        maskSelect.appendChild(opt);
    });

    document.getElementById('wc-setting-context-limit').value = char.chatConfig.contextLimit || 0;
    
    // 【修复】：正确读取双语设置到界面，而不是覆盖数据
    document.getElementById('wc-setting-bilingual-toggle').checked = char.chatConfig.bilingualEnabled || false;
    document.getElementById('wc-setting-bilingual-source').value = char.chatConfig.bilingualSource || '英语';
    document.getElementById('wc-setting-bilingual-target').value = char.chatConfig.bilingualTarget || '中文';
    
    document.getElementById('wc-setting-proactive-toggle').checked = char.chatConfig.proactiveEnabled || false;
    document.getElementById('wc-setting-proactive-interval').value = char.chatConfig.proactiveInterval || 60;
    document.getElementById('wc-setting-moment-freq').value = char.chatConfig.momentFreq || 0;
    
    const npcCommentToggle = document.getElementById('wc-setting-moment-npc-comment');
    if (npcCommentToggle) {
        npcCommentToggle.checked = char.chatConfig.momentNpcCommentEnabled !== false; // 默认开启
    }
    // 👇 新增：动态注入后台小动作概率滑块 👇
    let bgUpdateGroup = document.getElementById('wc-bg-update-group');
    if (!bgUpdateGroup) {
        const momentFreqEl = document.getElementById('wc-setting-moment-freq');
        if (momentFreqEl) {
            const parent = momentFreqEl.closest('.wc-form-group') || momentFreqEl.parentElement;
            bgUpdateGroup = document.createElement('div');
            bgUpdateGroup.id = 'wc-bg-update-group';
            bgUpdateGroup.className = 'wc-form-group';
            bgUpdateGroup.innerHTML = `
                <label class="wc-form-label">后台小动作概率 (改备注/签名/找NPC) <span id="bg-update-freq-val">30%</span></label>
                <input type="range" id="wc-setting-bg-update-freq" min="0" max="100" value="30" class="wc-form-input" style="padding:0;" oninput="document.getElementById('bg-update-freq-val').innerText = this.value + '%'">
            `;
            parent.parentNode.insertBefore(bgUpdateGroup, parent.nextSibling);
        }
    }
    if (document.getElementById('wc-setting-bg-update-freq')) {
        const val = char.chatConfig.bgUpdateFreq !== undefined ? char.chatConfig.bgUpdateFreq : 30;
        document.getElementById('wc-setting-bg-update-freq').value = val;
        document.getElementById('bg-update-freq-val').innerText = val + '%';
    }
    // 👆 新增结束 👆

    const wbList = document.getElementById('wc-setting-worldbook-list');
    wbList.innerHTML = '';
    let wbCount = 0;
    if (char.chatConfig.worldbookEntries) {
        char.chatConfig.worldbookEntries.forEach(id => {
            wbList.innerHTML += `<input type="checkbox" value="${id}" checked>`;
            wbCount++;
        });
    }
    document.getElementById('wc-setting-wb-count').innerText = `已选 ${wbCount} 项`;

    const stickerList = document.getElementById('wc-setting-sticker-group-list');
    stickerList.innerHTML = '';
    wcState.stickerCategories.forEach((cat, idx) => {
        const div = document.createElement('div');
        div.className = 'wc-checkbox-item';
        const isChecked = char.chatConfig.stickerGroupIds && char.chatConfig.stickerGroupIds.includes(idx);
        div.innerHTML = `<input type="checkbox" value="${idx}" ${isChecked ? 'checked' : ''} onchange="calculateRealtimeTokens()"><span>${cat.name}</span>`;
        stickerList.appendChild(div);
    });

    const bgPreview = document.getElementById('wc-setting-bg-preview');
    if (char.chatConfig.backgroundImage) {
        bgPreview.src = char.chatConfig.backgroundImage;
        bgPreview.style.display = 'block';
        document.getElementById('wc-setting-bg-text').style.display = 'none';
    } else {
        bgPreview.style.display = 'none';
        document.getElementById('wc-setting-bg-text').style.display = 'block';
    }
    document.getElementById('wc-setting-custom-css').value = char.chatConfig.customCss || "";
    wcUpdateCssPresetSelect();
    wcState.tempImage = '';
    
    // Default to Heart (Advanced) tab
    wcSwitchChatSettingsTab('heart');
    
    wcRenderChatBgGallery(); // 【新增】：打开设置时渲染图库
    
    // 👇 新增：打开设置时自动计算 Token 和 查询额度
    calculateRealtimeTokens();
    refreshApiQuota();
    
    wcOpenModal('wc-modal-chat-settings');
}
// ==========================================
// 新增：聊天设置星际轨道滑动切换逻辑
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    const navContainer = document.getElementById('wc-cs-nav-container');
    if (!navContainer) return;

    let startX = 0;
    const tabs = ['char', 'heart', 'user'];

    navContainer.addEventListener('touchstart', e => {
        startX = e.touches[0].clientX;
    }, {passive: true});

    navContainer.addEventListener('touchend', e => {
        let endX = e.changedTouches[0].clientX;
        let diff = endX - startX;
        
        // 找到当前激活的 tab 索引
        let currentIdx = 1; // 默认 heart
        if (document.getElementById('wc-cs-char-btn').classList.contains('active')) currentIdx = 0;
        if (document.getElementById('wc-cs-user-btn').classList.contains('active')) currentIdx = 2;

        if (diff > 50 && currentIdx > 0) {
            wcSwitchChatSettingsTab(tabs[currentIdx - 1]); // 向右滑，看左边的
        } else if (diff < -50 && currentIdx < 2) {
            wcSwitchChatSettingsTab(tabs[currentIdx + 1]); // 向左滑，看右边的
        }
    });
});

function wcImportMaskToChat(maskId) {
    if (!maskId) return;
    const mask = wcState.masks.find(m => m.id == maskId);
    if (mask) {
        document.getElementById('wc-setting-user-name').value = mask.name;
        document.getElementById('wc-cs-user-name-display').innerText = mask.name; // Sync top UI
        document.getElementById('wc-setting-user-prompt').value = mask.prompt;
        document.getElementById('wc-setting-user-avatar').src = mask.avatar;
        document.getElementById('wc-cs-user-avatar-display').src = mask.avatar; // Sync top UI
    }
}

function wcClearChatBackground() {
    document.getElementById('wc-setting-bg-preview').src = "";
    document.getElementById('wc-setting-bg-preview').style.display = 'none';
    document.getElementById('wc-setting-bg-text').style.display = 'block';
    wcState.tempBgCleared = true;
}

async function wcSaveChatSettings() {
    const char = wcState.characters.find(c => c.id === wcState.activeChatId);
    if (!char) return;
    
    char.name = document.getElementById('wc-setting-char-name').value;
    char.note = document.getElementById('wc-setting-char-note').value;
    char.prompt = document.getElementById('wc-setting-char-prompt').value;
    // 拉黑状态已在弹窗确认时保存，这里无需再读取
    if (wcState.tempImage && wcState.tempImageType === 'setting-char') char.avatar = wcState.tempImage;

    if (!char.chatConfig) char.chatConfig = {};
    char.chatConfig.userName = document.getElementById('wc-setting-user-name').value;
    char.chatConfig.userPersona = document.getElementById('wc-setting-user-prompt').value;
    char.chatConfig.lifeStatusEnabled = document.getElementById('wc-setting-life-status-toggle').checked;
    
    if (wcState.tempImage && wcState.tempImageType === 'setting-user') {
        char.chatConfig.userAvatar = wcState.tempImage;
    } else if (document.getElementById('wc-setting-user-avatar').src.startsWith('data:')) {
        char.chatConfig.userAvatar = document.getElementById('wc-setting-user-avatar').src;
    }

    char.chatConfig.contextLimit = parseInt(document.getElementById('wc-setting-context-limit').value) || 0;
    
    // 【修复】：在这里真正保存双语设置
    char.chatConfig.bilingualEnabled = document.getElementById('wc-setting-bilingual-toggle').checked;
    char.chatConfig.bilingualSource = document.getElementById('wc-setting-bilingual-source').value.trim();
    char.chatConfig.bilingualTarget = document.getElementById('wc-setting-bilingual-target').value.trim();
    
    char.chatConfig.proactiveEnabled = document.getElementById('wc-setting-proactive-toggle').checked;
    char.chatConfig.proactiveInterval = parseInt(document.getElementById('wc-setting-proactive-interval').value) || 60;
    char.chatConfig.momentFreq = parseInt(document.getElementById('wc-setting-moment-freq').value) || 0;
    
    const npcCommentToggle = document.getElementById('wc-setting-moment-npc-comment');
    if (npcCommentToggle) {
        char.chatConfig.momentNpcCommentEnabled = npcCommentToggle.checked;
    }
    // 👇 新增：保存后台小动作概率 👇
    const bgUpdateFreqInput = document.getElementById('wc-setting-bg-update-freq');
    if (bgUpdateFreqInput) {
        char.chatConfig.bgUpdateFreq = parseInt(bgUpdateFreqInput.value) || 0;
    }
    // 👆 新增结束 👆

    const wbCheckboxes = document.querySelectorAll('#wc-setting-worldbook-list input[type="checkbox"]:checked');
    // 【修复】：这里原本写成了 summaryWorldbookEntries，导致保存失败，现在改回 worldbookEntries
    char.chatConfig.worldbookEntries = Array.from(wbCheckboxes).map(cb => cb.value);

    const stickerCheckboxes = document.querySelectorAll('#wc-setting-sticker-group-list input[type="checkbox"]:checked');
    char.chatConfig.stickerGroupIds = Array.from(stickerCheckboxes).map(cb => parseInt(cb.value));

    if (wcState.tempImage && wcState.tempImageType === 'setting-bg') char.chatConfig.backgroundImage = wcState.tempImage;
    else if (wcState.tempBgCleared) char.chatConfig.backgroundImage = "";
    wcState.tempBgCleared = false;

    char.chatConfig.customCss = document.getElementById('wc-setting-custom-css').value;
    
    const charIndex = wcState.characters.findIndex(c => c.id === char.id);
    if (charIndex !== -1) {
        wcState.characters[charIndex] = char;
    }
    await wcWriteCharactersPersistentSnapshot();
    try {
        await wcDb.put('characters', char);
    } catch (e) {
        console.warn('聊天联系人配置写入 IndexedDB 失败，已保留本地兜底快照', e);
    }
    await wcSaveData();
    
    updateChatTopBarStatus(char);
    wcApplyChatConfig(char);
    wcRenderMessages(char.id); 
    wcRenderChats(); 
    
    if (char.chatConfig.stickerGroupIds.length > 0 && !char.chatConfig.stickerGroupIds.includes(wcState.activeStickerCategoryIndex)) {
        wcState.activeStickerCategoryIndex = char.chatConfig.stickerGroupIds[0];
    } else if (char.chatConfig.stickerGroupIds.length === 0) {
        wcState.activeStickerCategoryIndex = 0;
    }
    
    wcRenderStickerPanel();
    wcCloseModal('wc-modal-chat-settings');
}

function wcClearChatHistory() {
      if (confirm("确定清空与该角色的所有聊天记录吗？此操作不可恢复。")) {
        // 同步删除恋人空间日志
        const msgs = wcState.chats[wcState.activeChatId] || [];
        msgs.forEach(m => lsRemoveFeedByMsgId(m.id));
        
        wcState.chats[wcState.activeChatId] = [];
        wcSaveData();
        wcRenderMessages(wcState.activeChatId);
        wcCloseModal('wc-modal-chat-settings');
    }
}

// --- WeChat CSS Presets ---
function wcUpdateCssPresetSelect() {
    const select = document.getElementById('wc-setting-css-preset-select');
    select.innerHTML = '<option value="">选择预设...</option>';
    wcState.cssPresets.forEach((p, idx) => {
        const opt = document.createElement('option');
        opt.value = idx;
        opt.innerText = p.name;
        select.appendChild(opt);
    });
}

function wcSaveCssPreset() {
    const css = document.getElementById('wc-setting-custom-css').value;
    if (!css) return alert("CSS 内容为空");
    const name = prompt("请输入预设名称：");
    if (name) {
        wcState.cssPresets.push({ name, css });
        wcSaveData();
        wcUpdateCssPresetSelect();
        alert("预设已保存");
    }
}

function wcDeleteCssPreset() {
        const select = document.getElementById('wc-setting-css-preset-select');
    const idx = select.value;
    if (idx === "") return alert("请先选择一个预设");
    
    if (confirm("确定删除该 CSS 预设吗？")) {
        wcState.cssPresets.splice(idx, 1);
        wcSaveData();
        wcUpdateCssPresetSelect();
        document.getElementById('wc-setting-custom-css').value = ""; 
    }
}

function wcApplyCssPreset(idx) {
    if (idx === "") return;
    const preset = wcState.cssPresets[idx];
    if (preset) document.getElementById('wc-setting-custom-css').value = preset.css;
}

// --- WeChat Masks ---
function wcOpenMasksModal() { wcOpenModal('wc-modal-masks'); wcRenderMasks(); }
function wcRenderMasks() {
    const list = document.getElementById('wc-masks-list');
    list.innerHTML = '';
    wcState.masks.forEach(mask => {
        const div = document.createElement('div');
        div.className = 'wc-list-item';
        div.innerHTML = `<img src="${mask.avatar}" class="wc-avatar"><div class="wc-item-content"><div class="wc-item-title">${mask.name}</div><div class="wc-item-subtitle">${mask.prompt.substring(0, 20)}...</div></div><button class="wc-nav-btn" style="margin-right:10px" onclick="wcApplyMask(${mask.id})">使用</button><button class="wc-nav-btn" style="color:red" onclick="wcDeleteMask(${mask.id})">删除</button>`;
        div.onclick = (e) => { if(e.target.tagName !== 'BUTTON') wcOpenEditMask(mask.id); };
        list.appendChild(div);
    });
}
function wcOpenEditMask(id = null) {
    wcState.editingMaskId = id;
    wcState.tempImage = '';
    if (id) {
        const mask = wcState.masks.find(m => m.id === id);
        document.getElementById('wc-mask-modal-title').innerText = '编辑面具';
        document.getElementById('wc-input-mask-name').value = mask.name;
        document.getElementById('wc-input-mask-prompt').value = mask.prompt;
        document.getElementById('wc-preview-mask-avatar').src = mask.avatar;
    } else {
        document.getElementById('wc-mask-modal-title').innerText = '新建面具';
        document.getElementById('wc-input-mask-name').value = '';
        document.getElementById('wc-input-mask-prompt').value = '';
        document.getElementById('wc-preview-mask-avatar').src = '';
    }
    wcOpenModal('wc-modal-edit-mask');
}
function wcSaveMask() {
    const name = document.getElementById('wc-input-mask-name').value;
    const prompt = document.getElementById('wc-input-mask-prompt').value;
    const avatar = wcState.tempImage || (wcState.editingMaskId ? wcState.masks.find(m=>m.id===wcState.editingMaskId).avatar : wcState.user.avatar);
    if (!name) return alert('请输入名称');
    if (wcState.editingMaskId) {
        const mask = wcState.masks.find(m => m.id === wcState.editingMaskId);
        mask.name = name; mask.prompt = prompt; mask.avatar = avatar;
    } else {
        wcState.masks.push({ id: Date.now(), name, prompt, avatar });
    }
    wcSaveData();
    wcCloseModal('wc-modal-edit-mask');
    wcRenderMasks();
}
function wcDeleteMask(id) {
    if(confirm('删除此面具？')) { wcState.masks = wcState.masks.filter(m => m.id !== id); wcSaveData(); wcRenderMasks(); }
}
function wcApplyMask(id) {
    const mask = wcState.masks.find(m => m.id === id);
    if (mask) {
        wcState.user.name = mask.name; wcState.user.avatar = mask.avatar; wcState.user.persona = mask.prompt;
        wcSaveData(); wcRenderUser(); wcCloseModal('wc-modal-masks'); alert(`已切换身份为：${mask.name}`);
    }
}

// --- WeChat Modals ---
function wcOpenModal(id) {
    const modal = document.getElementById(id);
    modal.classList.remove('hidden');
    modal.classList.add('active'); 
    wcState.tempImage = ''; 
    
    if(id === 'wc-modal-add-char') {
        document.getElementById('wc-preview-char-avatar').style.display = 'none';
        document.getElementById('wc-icon-char-upload').style.display = 'block';
        document.getElementById('wc-input-char-name').value = '';
        document.getElementById('wc-input-char-note').value = '';
        document.getElementById('wc-input-char-prompt').value = '';
    }
}

function wcCloseModal(id) {
    const modal = document.getElementById(id);
    modal.classList.add('hidden');
    modal.classList.remove('active');
}

function wcToggleMomentType(type) {
    wcState.momentType = type;
    document.getElementById('wc-seg-local').className = type === 'local' ? 'wc-segment-btn active' : 'wc-segment-btn';
    document.getElementById('wc-seg-desc').className = type === 'desc' ? 'wc-segment-btn active' : 'wc-segment-btn';
    document.getElementById('wc-area-local-img').style.display = type === 'local' ? 'block' : 'none';
    document.getElementById('wc-area-desc-img').style.display = type === 'desc' ? 'block' : 'none';
}

function wcSaveMoment() {
    const text = document.getElementById('wc-input-moment-text').value;
    let image = null; let imageDesc = null;
    if (wcState.momentType === 'local') image = wcState.tempImage; else imageDesc = document.getElementById('wc-input-moment-desc').value;
    if (!text && !image && !imageDesc) return alert('请输入内容');
    wcState.moments.unshift({ id: Date.now(), name: wcState.user.name, avatar: wcState.user.avatar, text: text, image: image, imageDesc: imageDesc, time: Date.now(), likes: [], comments: [] });
    wcSaveData();
    document.getElementById('wc-input-moment-text').value = ''; document.getElementById('wc-input-moment-desc').value = ''; wcState.tempImage = '';
    wcCloseModal('wc-modal-post-moment'); wcRenderMoments();
}

function wcDeleteMoment(id) { if(confirm('删除？')) { wcState.moments = wcState.moments.filter(m => m.id !== id); wcDb.delete('moments', id); wcSaveData(); wcRenderMoments(); } }

function wcToggleLike(id) {
    const moment = wcState.moments.find(m => m.id === id); 
    if (!moment) return;
    
    if (!moment.likes) moment.likes = [];
    const userName = wcState.user.name;
    
    if (moment.likes.includes(userName)) {
        moment.likes = moment.likes.filter(n => n !== userName); 
    } else {
        moment.likes.push(userName);
    }
    
    wcSaveData(); 
    wcRenderMoments();
}

function wcToggleCommentBox(id) { 
    const box = document.getElementById(`wc-comment-box-${id}`); 
    box.style.display = box.style.display === 'none' ? 'flex' : 'none'; 
    wcState.replyingToComment = null;
    const input = document.getElementById(`wc-input-comment-${id}`);
    if(input) input.placeholder = "评论...";
}

function wcPrepareReply(momentId, commentIndex, name) {
    wcState.replyingToComment = { momentId, commentIndex, name };
    const box = document.getElementById(`wc-comment-box-${momentId}`);
    box.style.display = 'flex';
    const input = document.getElementById(`wc-input-comment-${momentId}`);
    if(input) {
        input.placeholder = `回复 ${name}...`;
        input.focus();
    }
}

function wcAddComment(id) {
    const input = document.getElementById(`wc-input-comment-${id}`); 
    const text = input.value; 
    if (!text) return;
    
    const moment = wcState.moments.find(m => m.id === id); 
    if (!moment) return;
    if (!moment.comments) moment.comments = [];
    
    let commentText = text;
    if (wcState.replyingToComment && wcState.replyingToComment.momentId === id) {
        commentText = `回复 ${wcState.replyingToComment.name}: ${text}`;
    }
    
    moment.comments.push({ name: wcState.user.name, text: commentText });
    wcSaveData(); 
    wcRenderMoments();
    
    wcState.replyingToComment = null;
    input.value = '';
}

// --- Proactive Message System ---
function initProactiveSystem() {
    if (wcState.proactiveInterval) clearInterval(wcState.proactiveInterval);
    wcState.proactiveInterval = setInterval(checkProactiveMessages, 60000);
}

function checkProactiveMessages() {
    const now = Date.now();
    const dateObj = new Date();
    const currentHHMM = `${dateObj.getHours().toString().padStart(2, '0')}:${dateObj.getMinutes().toString().padStart(2, '0')}`;
    const todayStr = dateObj.toDateString();

    wcState.characters.forEach(char => {
        // 1. 检查食谱定时发送逻辑
        if (char.phoneData && char.phoneData.recipe && char.phoneData.recipe.ta) {
            const taRecipe = char.phoneData.recipe.ta;
            if (taRecipe.autoTime === currentHHMM && taRecipe.lastAutoSendDate !== todayStr) {
                console.log(`触发 ${char.name} 定时发送食谱`);
                // 标记为今天已发送，防止一分钟内重复触发
                taRecipe.lastAutoSendDate = todayStr;
                wcSaveData();
                // 后台静默生成并发送
                if (typeof wcGenerateTaRecipe === 'function') {
                    wcGenerateTaRecipe(true, char.id);
                }
            }
        }

        // 2. 原有的主动发消息逻辑
        if (char.chatConfig && char.chatConfig.proactiveEnabled) {
            const interval = (char.chatConfig.proactiveInterval || 60) * 60 * 1000; 
            const msgs = wcState.chats[char.id] || [];
            let lastTime = 0;
            
            for (let i = msgs.length - 1; i >= 0; i--) {
                if (!msgs[i].isError && msgs[i].type !== 'system') {
                    lastTime = msgs[i].time;
                    break;
                }
            }

            if (lastTime === 0) lastTime = now; 

            if (now - lastTime > interval && !aiGeneratingLocks[char.id]) {
                console.log(`触发 ${char.name} 主动消息`);
                
                const gapMs = now - lastTime;
                const gapMinutes = Math.floor(gapMs / 60000);
                const gapHours = Math.floor(gapMinutes / 60);
                const gapDays = Math.floor(gapHours / 24);
                const remainHours = gapHours % 24;
                const remainMinutes = gapMinutes % 60;

                let timeGapStr = "";
                if (gapDays > 0) timeGapStr += `${gapDays}天`;
                if (remainHours > 0) timeGapStr += `${remainHours}小时`;
                if (remainMinutes > 0 || timeGapStr === "") timeGapStr += `${remainMinutes}分钟`;

                const nowStr = new Date().toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                
                const proactivePrompt = `[系统通知：距离上次互动已过去 ${timeGapStr}。话题可能已中断。
请以 ${char.name} 的身份主动发起新话题，或自然地延续之前的对话，对时间流逝做出反应。

【行动前请在内部逻辑中进行深度考量】：
1. 现实感知：当前现实时间是 ${nowStr}。结合你的人设，你现在应该在做什么？
2. 动机分析：你为什么会突然给 User 发消息？
3. 绝对防 OOC：语气必须 100% 符合人设，像真人一样自然切入，拒绝AI味。
考量完毕后，直接输出符合你人设的 JSON 消息数组！]`;
                
                wcAddMessage(char.id, 'system', 'system', proactivePrompt, { hidden: true });
                wcTriggerAI(char.id);
            }
        }
    });
}

// Swipe Logic for WeChat
let wcXDown = null; let wcYDown = null; let wcCurrentSwipeElement = null;
function wcHandleTouchStartSwipe(evt) { wcXDown = evt.touches[0].clientX; wcYDown = evt.touches[0].clientY; wcCurrentSwipeElement = evt.currentTarget; }
function wcHandleTouchMoveSwipe(evt) {
    if (!wcXDown || !wcYDown) return;
    let xUp = evt.touches[0].clientX; let yUp = evt.touches[0].clientY;
    let xDiff = wcXDown - xUp; let yDiff = wcYDown - yUp;
    if (Math.abs(xDiff) > Math.abs(yDiff)) { 
        if (xDiff > 0) {
            const offset = -80; 
            wcCurrentSwipeElement.style.transform = `translateX(${offset}px)`; 
        } else {
            wcCurrentSwipeElement.style.transform = 'translateX(0px)'; 
        }
    }
}
function wcHandleTouchEndSwipe(evt) { wcXDown = null; wcYDown = null; }

/* ==========================================================================
   APP 2: LOVERS SPACE LOGIC (Prefix: ls)
   ========================================================================== */

// --- Lovers Space State ---
const lsState = {
    boundCharId: null, 
    pendingCharId: null, 
    startDate: null, 
    isLinked: false, 
    locationSyncEnabled: false, 
    npcFreq: 30, 
    npcInterval: null, 
    feed: [], 
    widgetEnabled: false,
    widgetUpdateFreq: 20, 
    widgetData: {
        type: 'photo', 
        photoDesc: '一张拍立得照片',
        noteText: '今天也要开心哦！',
        currentMode: 'photo',
        customPhoto: '', 
        position: { top: '380px', left: '50%', transform: 'translateX(-50%) rotate(5deg)' } 
    },
    charWidgetEnabled: false,
    charWidgetData: {
        type: 'photo',
        content: ''
    },
    qaScore: 0,
    qaCurrentSession: null,
    qaHistory: [],
    letters: [],
    // 👇 新增这一段
    lettersConfig: {
        bg: 'https://i.postimg.cc/KvnvwWS3/dong-tai-bei-jing1.gif',
        img1: 'https://i.postimg.cc/7YgYdR84/Image-1770474411684-498.jpg',
        img2: 'https://i.postimg.cc/GhkhVfwd/Image-1770474415295-455.jpg',
        text: '休戀逝水 早悟蘭因'
    }
};

// --- Lovers Space Core Functions ---
async function lsLoadData() {
    const data = await idb.get('ls_data');
    if (data) {
        lsState.boundCharId = data.boundCharId;
        lsState.pendingCharId = data.pendingCharId;
        lsState.startDate = data.startDate;
        lsState.isLinked = data.isLinked || false;
        lsState.locationSyncEnabled = data.locationSyncEnabled || false; 
        lsState.npcFreq = data.npcFreq !== undefined ? data.npcFreq : 30;
        lsState.feed = data.feed || [];
        lsState.widgetEnabled = data.widgetEnabled || false;
        lsState.widgetUpdateFreq = data.widgetUpdateFreq || 20;
        if (data.widgetData) lsState.widgetData = data.widgetData;
        
        lsState.charWidgetEnabled = data.charWidgetEnabled || false;
        if (data.charWidgetData) lsState.charWidgetData = data.charWidgetData;
        
        lsState.qaScore = data.qaScore || 0;
        lsState.qaCurrentSession = data.qaCurrentSession || null;
        lsState.qaHistory = data.qaHistory || [];
        lsState.letters = data.letters || [];
        // 👇 新增这一行
        if (data.lettersConfig) lsState.lettersConfig = data.lettersConfig;
    }
}

async function lsSaveData() {
    await idb.set('ls_data', {
        boundCharId: lsState.boundCharId,
        pendingCharId: lsState.pendingCharId,
        startDate: lsState.startDate,
        isLinked: lsState.isLinked,
        locationSyncEnabled: lsState.locationSyncEnabled, 
        npcFreq: lsState.npcFreq,
        feed: lsState.feed,
        widgetEnabled: lsState.widgetEnabled,
        widgetUpdateFreq: lsState.widgetUpdateFreq,
        widgetData: lsState.widgetData,
        charWidgetEnabled: lsState.charWidgetEnabled,
        charWidgetData: lsState.charWidgetData,
        qaScore: lsState.qaScore,
        qaCurrentSession: lsState.qaCurrentSession,
        qaHistory: lsState.qaHistory,
        letters: lsState.letters,
        // 👇 新增这一行
        lettersConfig: lsState.lettersConfig
    });
}

function openLoversSpace() {
    document.getElementById('loversSpaceModal').classList.add('open');
    lsRenderView();
}

function closeLoversSpace() {
    document.getElementById('loversSpaceModal').classList.remove('open');
}

function lsRenderView() {
    document.querySelectorAll('.ls-view').forEach(el => el.classList.remove('active'));
    
    if (lsState.boundCharId) {
        document.getElementById('ls-view-main').classList.add('active');
        lsRenderMain();
    } else if (lsState.pendingCharId) {
        document.getElementById('ls-view-pending').classList.add('active');
        lsRenderPending();
    } else {
        document.getElementById('ls-view-bind').classList.add('active');
        lsRenderBindList();
    }
}

// --- Bind Logic ---
function lsRenderBindList() {
    const list = document.getElementById('ls-bind-list');
    list.innerHTML = '';
    
    const availableChars = wcState.characters.filter(c => !c.isGroup);
    if (availableChars.length === 0) {
        list.innerHTML = '<div style="text-align:center; color:#999; padding:20px;">请先在 WeChat 中添加单人角色</div>';
        return;
    }

    availableChars.forEach(char => {
        const div = document.createElement('div');
        div.className = 'ls-char-item';
        div.innerHTML = `
            <img src="${char.avatar}" class="ls-char-avatar">
            <div class="ls-char-name">${char.name}</div>
        `;
        div.onclick = () => lsSendInvite(char.id);
        list.appendChild(div);
    });
}

function lsSendInvite(charId) {
    if (confirm("确定向该角色发送恋爱邀请吗？")) {
        lsState.pendingCharId = charId;
        lsSaveData();
        
        wcAddMessage(charId, 'me', 'invite', '邀请开启恋人空间', { status: 'pending' });
        
        lsRenderView();
    }
}

function lsRenderPending() {
    const char = wcState.characters.find(c => c.id === lsState.pendingCharId);
    if (char) {
        // 【修复】：给 url 内部加上单引号，防止 base64 解析失败
        document.getElementById('ls-pending-avatar').style.backgroundImage = `url('${char.avatar}')`;
        document.getElementById('ls-pending-name').innerText = char.name;
    }
}
function lsCancelInvite() {
    if (confirm("取消邀请？")) {
        lsState.pendingCharId = null;
        lsSaveData();
        lsRenderView();
    }
}

function lsResendInvite() {
    if (lsState.pendingCharId) {
        wcAddMessage(lsState.pendingCharId, 'me', 'invite', '邀请开启恋人空间', { status: 'pending' });
        alert("邀请已重新发送");
    }
}

function lsConfirmBind(charId) {
    if (lsState.boundCharId) return; 
    
    lsState.boundCharId = charId;
    lsState.pendingCharId = null;
    lsState.startDate = Date.now();
    lsState.isLinked = true; 
    lsSaveData();
    
    const msgs = wcState.chats[charId] || [];
    msgs.forEach(m => {
        if (m.type === 'invite') m.status = 'accepted';
    });
    wcSaveData();
    
    if (document.getElementById('loversSpaceModal').classList.contains('open')) {
        lsRenderView();
    }
}

function wcHandleInviteClick(msgId) {
    const msgs = wcState.chats[wcState.activeChatId];
    const msg = msgs.find(m => m.id === msgId);
    if (!msg) return;
    
    if (msg.status === 'accepted') {
        openLoversSpace();
    } else if (msg.status === 'pending') {
        if (confirm("强制让对方同意并开启空间？")) {
            lsConfirmBind(wcState.activeChatId);
            openLoversSpace();
        }
    }
}

// --- Main Space Logic ---
function lsRenderMain() {
    const char = wcState.characters.find(c => c.id === lsState.boundCharId);
    if (!char) return;             
        
    // ==========================================
    // 1. 渲染双方头像
    // ==========================================
    const userAvatarEl = document.getElementById('ls-main-user-avatar');
    if (userAvatarEl) {
        userAvatarEl.style.backgroundImage = `url('${wcState.user.avatar}')`;
    }
    
    const charAvatarEl = document.getElementById('ls-main-char-avatar');
    if (charAvatarEl) {
        charAvatarEl.style.backgroundImage = `url('${char.avatar}')`;
    }
    // ==========================================
    // 2. 恢复开关状态逻辑
    // ==========================================
    const toggleLink = document.getElementById('ls-toggle-link');
    if (toggleLink) toggleLink.checked = lsState.isLinked;
    
    const toggleLocation = document.getElementById('ls-toggle-location');
    if (toggleLocation) toggleLocation.checked = lsState.locationSyncEnabled;
    
    // ==========================================
    // 3. 修复 NPC 频率输入框的重复声明报错
    // ==========================================
    const npcFreqInput = document.getElementById('ls-npc-freq');
    if (npcFreqInput) npcFreqInput.value = lsState.npcFreq;

    // 计算天数和日期
    const days = Math.floor((Date.now() - lsState.startDate) / (1000 * 60 * 60 * 24)) + 1;
    const daysNumEl = document.getElementById('ls-days-num');
    if (daysNumEl) daysNumEl.innerText = days;
    
    const dateObj = new Date(lsState.startDate);
    const startDateEl = document.getElementById('ls-start-date-display');
    if (startDateEl) startDateEl.innerText = `Since ${dateObj.getFullYear()}.${dateObj.getMonth()+1}.${dateObj.getDate()}`;
    
    // ==========================================
    // 4. 桌面小组件逻辑
    // ==========================================
    const toggleWidget = document.getElementById('ls-toggle-widget');
    if (toggleWidget) {
        toggleWidget.checked = lsState.widgetEnabled;
        document.getElementById('ls-my-widget-controls').style.display = lsState.widgetEnabled ? 'flex' : 'none';
        document.getElementById('ls-widget-freq').value = lsState.widgetUpdateFreq;
        
        if (lsState.widgetData.customPhoto && lsState.widgetData.customPhoto.startsWith('data:')) {
            document.getElementById('ls-widget-photo-url').value = '已选择本地图片';
        } else {
            document.getElementById('ls-widget-photo-url').value = lsState.widgetData.customPhoto || '';
        }
    }
    
    const toggleCharWidget = document.getElementById('ls-toggle-char-widget');
    if (toggleCharWidget) {
        toggleCharWidget.checked = lsState.charWidgetEnabled;
        document.getElementById('ls-char-widget-controls').style.display = lsState.charWidgetEnabled ? 'flex' : 'none';
    }
    
    // 更新隐藏日历的默认值并绑定修改事件
    const datePicker = document.getElementById('ls-date-picker');
    if (datePicker) {
        if (lsState.startDate) {
            datePicker.value = new Date(lsState.startDate).toISOString().slice(0,10);
        }
        // 【修复】：动态绑定 change 事件，确保用户修改日期后能保存并刷新
        datePicker.onchange = function(e) {
            lsUpdateStartDate(e.target.value);
        };
    }            

    lsRenderFeed();
}    

function lsSwitchTab(tabName) {
    document.querySelectorAll('.ls-tab-content').forEach(el => el.classList.remove('active'));
    document.getElementById(`ls-tab-${tabName}`).classList.add('active');
    
    document.querySelectorAll('.ls-tab-item').forEach(el => el.classList.remove('active'));
    const tabs = ['feed', 'album', 'settings'];
    const idx = tabs.indexOf(tabName);
    document.querySelectorAll('.ls-tab-item')[idx].classList.add('active');
}

function lsToggleLink(checkbox) {
    lsState.isLinked = checkbox.checked;
    lsSaveData();
}
function lsToggleLocationSync(checkbox) {
    lsState.locationSyncEnabled = checkbox.checked;
    lsSaveData();
    if (checkbox.checked) {
        alert("位置与运动同步已开启，对方将能感知你的实时状态。");
    }
}
function lsUpdateNpcFreq(val) {
    lsState.npcFreq = parseInt(val) || 0;
    lsSaveData();
    lsInitNpcLoop(); 
}
// 【新增】：处理恋人空间日期修改
function lsUpdateStartDate(dateString) {
    if (!dateString) return;
    // 将选择的日期字符串 (YYYY-MM-DD) 转换为时间戳
    const newDate = new Date(dateString).getTime();
    if (!isNaN(newDate)) {
        lsState.startDate = newDate;
        lsSaveData();
        lsRenderMain(); // 重新渲染以更新天数显示
    }
}
function lsToggleWidget(checkbox) {
    lsState.widgetEnabled = checkbox.checked;
    document.getElementById('ls-my-widget-controls').style.display = checkbox.checked ? 'flex' : 'none';
    lsSaveData();
    lsRenderWidget();
}

function lsUpdateWidgetFreq(val) {
    lsState.widgetUpdateFreq = parseInt(val);
    lsSaveData();
}

function lsUpdateWidgetPhoto(url) {
    if (url === '已选择本地图片') return; 
    lsState.widgetData.customPhoto = url;
    lsSaveData();
    lsRenderWidget();
}

function lsHandleWidgetPhotoUpload(input) {
    const file = input.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            lsState.widgetData.customPhoto = e.target.result;
            document.getElementById('ls-widget-photo-url').value = '已选择本地图片';
            lsSaveData();
            lsRenderWidget();
        };
        reader.readAsDataURL(file);
    }
}

function lsResetWidgetPosition() {
    lsState.widgetData.position = { top: '380px', left: '50%', transform: 'translateX(-50%) rotate(5deg)' };
    lsSaveData();
    lsRenderWidget();
    alert("小组件位置已重置");
}

// --- 对方桌面小组件控制 ---
function lsToggleCharWidget(checkbox) {
    lsState.charWidgetEnabled = checkbox.checked;
    document.getElementById('ls-char-widget-controls').style.display = checkbox.checked ? 'flex' : 'none';
    lsSaveData();
}

function lsSendToCharWidget() {
    const type = document.getElementById('ls-char-widget-type').value;
    let content = document.getElementById('ls-char-widget-input').value.trim();
    
    if (!content) return alert("请输入内容");
    
    lsState.charWidgetData = { type, content };
    lsSaveData();
    alert("已成功发送到对方桌面！");
    document.getElementById('ls-char-widget-input').value = '';
}

// --- 手机模拟器内对方桌面小组件渲染与交互 ---
function wcRenderCharWidget() {
    const widget = document.getElementById('wc-phone-lovers-widget');
    if (!widget) return; 
    
    if (!lsState.charWidgetEnabled) {
        widget.style.display = 'none';
        return;
    }
    
    widget.style.display = 'flex';
    
    const inner = document.getElementById('wc-lovers-widget-inner');
    const photoDesc = document.getElementById('wc-lovers-widget-photo-label');
    const noteText = document.getElementById('wc-lovers-widget-note-text');
    const photoBg = document.getElementById('wc-lovers-widget-photo');
    
    if (lsState.charWidgetData.type === 'note') {
        widget.classList.add('flipped');
        noteText.innerText = lsState.charWidgetData.content || '暂无留言';
    } else {
        widget.classList.remove('flipped');
        if (lsState.charWidgetData.content) {
            if (lsState.charWidgetData.content.startsWith('data:')) {
                photoBg.style.backgroundImage = `url('${lsState.charWidgetData.content}')`;
                photoBg.innerHTML = '';
                photoDesc.innerText = "From User";
            } else {
                photoBg.style.backgroundImage = 'none';
                photoBg.innerHTML = `<div style="font-size:10px; color:#999; padding:5px; text-align:center; line-height:1.3;">[AI画面]<br>${lsState.charWidgetData.content.substring(0,20)}...</div>`;
                photoDesc.innerText = "From User";
            }
        } else {
            photoBg.style.backgroundImage = 'none';
            photoBg.innerHTML = `<svg viewBox="0 0 24 24" style="width:50%;height:50%;color:#ccc;"><path fill="currentColor" d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>`;
            photoDesc.innerText = "Polaroid";
        }
    }
}

function wcOpenCharWidgetInteractModal() {
    wcOpenModal('wc-modal-char-widget-interact');
    wcToggleCharWidgetType('photo');
    wcToggleCharWidgetPhotoSource('desc');
}

function wcToggleCharWidgetType(type) {
    document.getElementById('wc-seg-widget-photo').classList.toggle('active', type === 'photo');
    document.getElementById('wc-seg-widget-note').classList.toggle('active', type === 'note');
    document.getElementById('wc-area-widget-photo').style.display = type === 'photo' ? 'block' : 'none';
    document.getElementById('wc-area-widget-note').style.display = type === 'note' ? 'block' : 'none';
}

function wcToggleCharWidgetPhotoSource(source) {
    document.getElementById('wc-seg-widget-photo-desc').classList.toggle('active', source === 'desc');
    document.getElementById('wc-seg-widget-photo-local').classList.toggle('active', source === 'local');
    document.getElementById('wc-area-widget-photo-desc').style.display = source === 'desc' ? 'block' : 'none';
    document.getElementById('wc-area-widget-photo-local').style.display = source === 'local' ? 'block' : 'none';
}

function wcHandleCharWidgetPhotoUpload(input) {
    const file = input.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            wcState.tempImage = e.target.result;
            document.getElementById('wc-preview-char-widget-photo').src = e.target.result;
            document.getElementById('wc-preview-char-widget-photo').style.display = 'block';
            document.getElementById('wc-text-char-widget-photo').style.display = 'none';
        };
        reader.readAsDataURL(file);
    }
}

// --- 修复：发送到对方桌面小组件并触发系统通知 ---
function wcSendToCharWidgetFromSim() {
    const isPhoto = document.getElementById('wc-seg-widget-photo').classList.contains('active');
    const type = isPhoto ? 'photo' : 'note';
    let content = '';
    let aiMsg = '';
    let notifMsg = '';

    const char = wcState.characters.find(c => c.id === wcState.editingCharId);
    const charName = char ? char.name : "对方";

    if (isPhoto) {
        const isLocal = document.getElementById('wc-seg-widget-photo-local').classList.contains('active');
        if (isLocal) {
            if (!wcState.tempImage) return alert("请先上传图片");
            content = wcState.tempImage;
            aiMsg = `[系统提示: 用户刚刚更新了你桌面上的拍立得小组件，换成了一张新的照片。]`;
            notifMsg = `${charName} 在你的桌面发送了一张图片`;
        } else {
            content = document.getElementById('wc-input-widget-photo-desc').value.trim();
            if (!content) return alert("请输入图片描述");
            aiMsg = `[系统提示: 用户刚刚更新了你桌面上的拍立得小组件，画面描述为: "${content}"]`;
            notifMsg = `${charName} 在你的桌面发送了一张图片`;
        }
    } else {
        content = document.getElementById('wc-input-widget-note-text').value.trim();
        if (!content) return alert("请输入留言内容");
        aiMsg = `[系统提示: 用户刚刚更新了你桌面上的便利贴小组件，留言内容为: "${content}"]`;
        notifMsg = `${charName} 在你的桌面发送了一张便利贴`;
    }
    
    lsState.charWidgetData = { type, content };
    lsSaveData();
    wcRenderCharWidget();
    
    if (char) {
        wcAddMessage(char.id, 'system', 'system', aiMsg, { hidden: true });
    }

    wcCloseModal('wc-modal-char-widget-interact');
    
    document.getElementById('wc-input-widget-photo-desc').value = '';
    document.getElementById('wc-input-widget-note-text').value = '';
    wcState.tempImage = '';
    document.getElementById('wc-preview-char-widget-photo').style.display = 'none';
    document.getElementById('wc-text-char-widget-photo').style.display = 'block';
    
    // 触发主屏幕系统通知
    showMainSystemNotification("恋人空间", notifMsg);
}

function wcToggleLoversWidgetMode(e) {
    e.stopPropagation();
    const widget = document.getElementById('wc-phone-lovers-widget');
    if (!widget) return; 
    if (widget.classList.contains('flipped')) {
        widget.classList.remove('flipped');
        lsState.charWidgetData.type = 'photo';
    } else {
        widget.classList.add('flipped');
        lsState.charWidgetData.type = 'note';
    }
    lsSaveData();
}

function wcShowLoversWidgetPhotoDesc(e) {
    e.stopPropagation();
    if (lsState.charWidgetData.type === 'photo' && lsState.charWidgetData.content && !lsState.charWidgetData.content.startsWith('data:')) {
        alert(`【照片画面描述】\n${lsState.charWidgetData.content}`);
    } else {
        wcOpenCharWidgetInteractModal();
    }
}

function lsUnbind() {
    if (confirm("确定要解除恋人关系吗？所有记录将被清空。")) {
        lsState.boundCharId = null;
        lsState.startDate = null;
        lsState.feed = [];
        lsState.widgetEnabled = false;
        lsState.charWidgetEnabled = false;
        lsSaveData();
        lsRenderWidget();
        lsRenderView();
    }
}

function lsClearFeed() {
    if (confirm("确定清空所有关联消息记录吗？")) {
        lsState.feed = [];
        lsSaveData();
        lsRenderFeed();
    }
}

// --- Feed & NPC Logic ---
function lsAddFeed(text, avatar = null, msgId = null) {
    const item = {
        id: Date.now(),
        text: text,
        time: Date.now(),
        avatar: avatar || wcState.user.avatar,
        msgId: msgId 
    };
    lsState.feed.unshift(item);
    if (lsState.feed.length > 50) lsState.feed.pop(); 
    lsSaveData();
    
    if (document.getElementById('ls-view-main').classList.contains('active')) {
        lsRenderFeed();
    }
}

function lsRemoveFeedByMsgId(msgId) {
    if (!msgId || !lsState.feed) return; // <--- 增加 !lsState.feed 保护
    const initialLen = lsState.feed.length;
    lsState.feed = lsState.feed.filter(item => item.msgId !== msgId);
    
    if (lsState.feed.length !== initialLen) {
        lsSaveData();
        const mainView = document.getElementById('ls-view-main');
        if (mainView && mainView.classList.contains('active')) {
            lsRenderFeed();
        }
    }
}

function lsRenderFeed() {
    const list = document.getElementById('ls-feed-list');
    list.innerHTML = '';
    
    if (lsState.feed.length === 0) {
        list.innerHTML = '<div class="ls-empty-state"><p>暂无动态</p></div>';
        return;
    }

    lsState.feed.forEach(item => {
        const div = document.createElement('div');
        div.className = 'ls-feed-item';
        div.innerHTML = `
            <img src="${item.avatar}" class="ls-feed-avatar">
            <div class="ls-feed-content">
                <div class="ls-feed-text">${item.text}</div>
                <div class="ls-feed-time">${new Date(item.time).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</div>
            </div>
        `;
        list.appendChild(div);
    });
}

// --- NPC Loop ---
function lsInitNpcLoop() {
    if (lsState.npcInterval) clearInterval(lsState.npcInterval);
    if (lsState.npcFreq > 0) {
        lsState.npcInterval = setInterval(lsCheckNpcTrigger, 60000); 
    }
}

async function lsCheckNpcTrigger() {
    if (!lsState.boundCharId || lsState.npcFreq <= 0) return;
    
    const rand = Math.random();
    if (rand < (1 / lsState.npcFreq)) {
        await lsTriggerNpcMessage();
    }
}

// --- 修复：NPC 消息接收不全与群聊 OOC ---
async function lsTriggerNpcMessage() {
    const char = wcState.characters.find(c => c.id === lsState.boundCharId);
    if (!char || !char.phoneData || !char.phoneData.contacts) return;
    
    const contacts = char.phoneData.contacts.filter(c => !c.isUser);
    if (contacts.length === 0) return;
    
    const npc = contacts[Math.floor(Math.random() * contacts.length)];
    
    const apiConfig = await getActiveApiConfig('npc');
    if (!apiConfig || !apiConfig.key) return;

    try {
        const chatConfig = char.chatConfig || {};
        
        // 核心修复：只读取关联的世界书
        let wbInfo = "";
        if (worldbookEntries.length > 0 && chatConfig.worldbookEntries && chatConfig.worldbookEntries.length > 0) {
            const linkedEntries = worldbookEntries.filter(e => chatConfig.worldbookEntries.includes(e.id.toString()));
            if (linkedEntries.length > 0) {
                wbInfo = "【世界观参考】:\n" + linkedEntries.map(e => `${e.title}: ${e.desc}`).join('\n');
            }
        }

        const now = new Date();
        const dayString = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'][now.getDay()];
        const timeString = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

        let prompt = "";
        if (npc.type === 'group') {
            prompt += `你正在模拟一个名为【${npc.name}】的微信群聊。\n`;
            prompt += `群聊背景/描述：${npc.desc}\n`;
            prompt += `群成员正在聊天。请生成 1-3 条群消息。\n`;
            prompt += `【重要】：你需要扮演群里的不同成员发言。不要扮演“群聊系统”，要扮演具体的人。\n`;
            prompt += `【输出格式】：JSON数组，必须包含 senderName (发言人名字)。\n`;
            prompt += `示例：[{"type":"text", "senderName":"老王", "content":"今晚去哪吃？"}, {"type":"text", "senderName":"小李", "content":"吃火锅吧"}]\n`;
        } else {
            prompt += `【最高指令】：你现在的唯一身份是【${npc.name}】！\n`;
            prompt += `【绝对禁止】：绝对禁止以【${char.name}】(手机主人) 或【User】(玩家) 的口吻回复！绝对禁止套用他们的人设和面具！\n`;
            prompt += `你的身份/背景：${npc.desc}\n`;
            prompt += `你正在给你的熟人【${char.name}】发微信。\n`;
            prompt += `【输出格式】：JSON数组。\n`;
            prompt += `示例：[{"type":"text", "content":"在吗？"}, {"type":"text", "content":"有个事想跟你说"}]\n`;
        }
        
        prompt += `\n【现实感知】：当前时间是 ${timeString} ${dayString}。你的发言必须符合这个时间点的常理（如深夜不要说刚起床）。\n`;
        prompt += `【${char.name} 的人设】：${char.prompt}\n`;
        prompt += `${wbInfo}\n`;
        prompt += `【防OOC要求】：你是一个拥有独立生活的真人。发言必须极度口语化、生活化，完全符合你(${npc.name})的人设。绝对拒绝油腻、做作和AI味。不要像客服一样说话！\n`;
        if (chatConfig.bilingualEnabled) {
            const sourceLang = chatConfig.bilingualSource || '英语';
            const targetLang = chatConfig.bilingualTarget || '中文';
            prompt += `\n【双语翻译模式强制指令】\n`;
            prompt += `你必须以双语形式回复。上面是${sourceLang}，下面是${targetLang}。\n`;
            prompt += `在 JSON 的 "content" 字段中，请严格使用以下 HTML 格式输出文本消息：\n`;
            prompt += `${sourceLang}内容<br><span style='font-size: 0.85em; opacity: 0.7;'>${targetLang}内容</span>\n`;
            prompt += `例如：[{"type":"text", "content":"Hello!<br><span style='font-size: 0.85em; opacity: 0.7;'>你好！</span>"}]\n`;
        }
        // 注入活人运转与思维链规则
        prompt += `【角色活人运转规则】\n`;
        prompt += `> 必须像真人一样聊天，拒绝机械回复。\n`;
        prompt += `> 必须将长回复拆分成多条短消息（1-4条），严禁把所有话挤在一个气泡里！\n`;
        prompt += `> 【重要约束】：绝对不要凭空捏造没有发生过的事情、没有做过的约定或不存在的剧情。请严格基于现有的聊天记录上下文进行自然的日常问候、吐槽或顺延当前话题。\n`;
        prompt += `> 【防重复约束】：严禁输出重复的句子或重复的对话序列！\n`;
        prompt += `> 【格式约束 (最高优先级)】：**必须且只能**输出合法的 JSON 数组，严禁在 JSON 外部输出任何多余字符！严禁漏掉引号、括号或逗号！严禁输出损坏的 JSON 格式！\n`;


        const response = await fetch(`${apiConfig.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiConfig.key}` },
            body: JSON.stringify({
                model: apiConfig.model,
                messages: [{ role: "user", content: prompt }],
                temperature: parseFloat(apiConfig.temp) || 0.8,
                max_tokens: 4000
            })
        });

        const data = await response.json();
        let content = data.choices[0].message.content.trim();
        
        let actions = [];
        try {
            let cleanText = content.replace(/<thinking>[\s\S]*?<\/thinking>/g, '').trim();
            cleanText = cleanText.replace(/```json/g, '').replace(/```/g, '').trim();
            const start = cleanText.indexOf('[');
            const end = cleanText.lastIndexOf(']');
            if (start !== -1 && end !== -1) {
                cleanText = cleanText.substring(start, end + 1);
                actions = JSON.parse(cleanText);
            } else {
                const regex = /\{"type":\s*"[^"]+",.*?\}/g;
                const matches = cleanText.match(regex);
                if (matches) actions = matches.map(m => JSON.parse(m));
            }
        } catch (e) {
            console.error("JSON Parse Error", e);
        }

        // 移除强制拆分逻辑，信任 AI 的 JSON 结构

        if (actions.length === 0) return;

        if (!char.phoneData.chats) char.phoneData.chats = [];
        let chat = char.phoneData.chats.find(c => c.name === npc.name);
        
        if (!chat) {
            chat = {
                id: Date.now(),
                name: npc.name,
                avatar: npc.avatar || getRandomNpcAvatar(),
                lastMsg: "",
                time: "",
                isGroup: npc.type === 'group',
                history: []
            };
            char.phoneData.chats.push(chat);
        }
        
        if (!chat.history) chat.history = [];
        
        let allContentCombined = "";
        
        for (const action of actions) {
            let msgContent = action.content;
            let senderName = action.senderName || null; 

            if (action.type === 'sticker') {
                msgContent = `[表情: ${action.content}]`;
            }
            
            chat.history.push({ sender: 'them', name: senderName, content: msgContent });
            
            if (npc.type === 'group' && senderName) {
                allContentCombined += `${senderName}: ${msgContent} `;
            } else {
                allContentCombined += `${msgContent} `;
            }
        }
        
        const lastAction = actions[actions.length - 1];
        let lastPreview = lastAction.content;
        if (lastAction.type === 'sticker') lastPreview = '[表情]';
        if (npc.type === 'group' && lastAction.senderName) {
            lastPreview = `${lastAction.senderName}: ${lastPreview}`;
        }
        
        chat.lastMsg = lastPreview;
        chat.time = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        
        lsAddFeed(`${npc.name} 给 ${char.name} 发送了消息: "${allContentCombined.trim()}"`, chat.avatar);

        // 核心修改 1：给用户看的模糊提示（可见，不包含具体内容）
        wcAddMessage(char.id, 'system', 'system', 
            `[系统提示: ${npc.name} 给 ${char.name} 发送了微信消息]`, 
            { style: 'transparent' } // 这里没有 hidden: true，所以会显示在界面上
        );

        // 核心修改 2：给 AI 看的具体内容（隐藏，确保 AI 知道 NPC 说了什么）
        const userName = (char.chatConfig && char.chatConfig.userName) ? char.chatConfig.userName : wcState.user.name;
        if (lsState.isLinked) {
            wcAddMessage(char.id, 'system', 'system', 
                `[系统内部信息(仅AI可见)：你(${char.name})的手机联系人 "${npc.name}" 刚刚在微信上给你发了消息: "${allContentCombined.trim()}"。\n【重要警告】：因为你(${char.name})和 ${userName}(User) 开启了“恋人空间账号关联”，${userName}(User) 的手机上同步弹出了提示，${userName}(User) 已经完全知道 ${npc.name} 给你(${char.name})发了消息！请在接下来的聊天中，根据你的人设对 ${userName}(User) 做出反应。]`, 
                { hidden: true }
            );
        } else {
            wcAddMessage(char.id, 'system', 'system', 
                `[系统内部信息(仅AI可见)：你(${char.name})的手机联系人 "${npc.name}" 刚刚在微信上给你发了具体消息: "${allContentCombined.trim()}"]`, 
                { hidden: true }
            );
        }

        wcSaveData(); 
        
    } catch (e) {
        console.error("NPC Gen Error", e);
    }
}
// --- 桌面小组件渲染与交互 ---
function lsRenderWidget() {
    let widget = document.getElementById('ls-desktop-widget');
    if (!widget) {
        widget = document.createElement('div');
        widget.id = 'ls-desktop-widget';
        widget.innerHTML = `
            <div class="ls-widget-inner" id="ls-widget-inner">
                <div class="ls-widget-front">
                    <div class="ls-widget-sticker" onmousedown="lsStartWidgetDrag(event)" ontouchstart="lsStartWidgetDrag(event)"></div>
                    <div class="ls-widget-photo" id="ls-widget-photo" onclick="lsShowWidgetPhotoDesc()">
                        <svg viewBox="0 0 24 24" style="width:50%;height:50%;color:#ccc;"><path fill="currentColor" d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>
                    </div>
                    <div class="ls-widget-photo-desc" id="ls-widget-photo-label">Polaroid</div>
                </div>
                <div class="ls-widget-back">
                    <div class="ls-widget-sticker" onmousedown="lsStartWidgetDrag(event)" ontouchstart="lsStartWidgetDrag(event)"></div>
                    <div class="ls-widget-note-text" id="ls-widget-note-text"></div>
                </div>
            </div>
        `;
        
        const homeGrid = document.getElementById('homeGrid');
        if (homeGrid) {
            homeGrid.appendChild(widget);
        }
        
        if (!document.getElementById('ls-widget-style')) {
            const style = document.createElement('style');
            style.id = 'ls-widget-style';
            style.innerHTML = `
                #ls-desktop-widget {
                    position: absolute;
                    width: 180px; height: 180px; 
                    z-index: 10;
                    perspective: 1000px;
                }
                .ls-widget-inner {
                    position: relative; width: 100%; height: 100%;
                    transition: transform 0.6s; transform-style: preserve-3d;
                    box-shadow: 2px 6px 15px rgba(0,0,0,0.3);
                    border-radius: 6px;
                }
                #ls-desktop-widget.flipped .ls-widget-inner { transform: rotateY(180deg); }
                .ls-widget-front, .ls-widget-back {
                    position: absolute; width: 100%; height: 100%;
                    backface-visibility: hidden; border-radius: 6px;
                    background: #fff; display: flex; flex-direction: column;
                    align-items: center; padding: 12px; box-sizing: border-box;
                }
                
                .ls-widget-back { 
                    transform: rotateY(180deg); 
                    background: #fff; 
                    justify-content: center;
                    border: 1px solid rgba(0,0,0,0.05);
                    box-shadow: inset 0 0 20px rgba(0,0,0,0.02);
                }
                
                .ls-widget-sticker {
                    position: absolute; top: -12px; left: 50%; transform: translateX(-50%) rotate(-3deg);
                    width: 80px; height: 28px;
                    background: rgba(255, 255, 255, 0.5);
                    border: 1px solid rgba(255,255,255,0.8);
                    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                    backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px);
                    z-index: 20; cursor: pointer;
                }
                
                .ls-widget-photo {
                    width: 100%; height: 82%; background: #f4f4f4;
                    border: 1px solid #eee; display:flex; justify-content:center; align-items:center;
                    overflow: hidden; cursor: pointer; background-size: cover; background-position: center;
                }
                .ls-widget-photo-desc { font-size: 14px; color: #555; margin-top: 8px; font-family: 'Courier New', Courier, monospace; font-weight: bold; }
                
                .ls-widget-note-text { 
                    font-size: 16px; 
                    color: #444; 
                    font-family: 'Comic Sans MS', 'Chalkboard SE', cursive, sans-serif; 
                    line-height: 1.6; 
                    text-align: center; 
                    width: 100%; 
                    padding: 10px; 
                    word-break: break-word;
                    font-style: italic;
                }
            `;
            document.head.appendChild(style);
        }
    }

    if (lsState.widgetEnabled && lsState.boundCharId) {
        widget.style.display = 'block';
        const data = lsState.widgetData;
        
        if (data.position) {
            widget.style.top = data.position.top;
            widget.style.left = data.position.left;
            widget.style.transform = data.position.transform || 'rotate(5deg)';
        } else {
            widget.style.top = '380px';
            widget.style.left = '50%';
            widget.style.transform = 'translateX(-50%) rotate(5deg)';
        }
        
        if (data.currentMode === 'note') {
            widget.classList.add('flipped');
        } else {
            widget.classList.remove('flipped');
        }
        
        document.getElementById('ls-widget-note-text').innerText = data.noteText || '暂无留言';
        
        const photoContainer = document.getElementById('ls-widget-photo');
        
        if (data.customPhoto) {
            photoContainer.style.backgroundImage = `url('${data.customPhoto}')`;
            photoContainer.innerHTML = ''; 
        } else {
            photoContainer.style.backgroundImage = 'none';
            if (data.photoDesc) {
                photoContainer.innerHTML = `<div style="font-size:12px; color:#999; padding:10px; text-align:center; line-height:1.3;">[AI画面]<br>${data.photoDesc.substring(0,20)}...</div>`;
            } else {
                photoContainer.innerHTML = `<svg viewBox="0 0 24 24" style="width:50%;height:50%;color:#ccc;"><path fill="currentColor" d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>`;
            }
        }
        
    } else {
        widget.style.display = 'none';
    }
}

function lsStartWidgetDrag(e) {
    if (!isHomeEditMode) {
        lsToggleWidgetMode(e);
        return;
    }

    const touch = e.touches ? e.touches[0] : e;
    lsWidgetDrag.active = true;
    lsWidgetDrag.startX = touch.clientX;
    lsWidgetDrag.startY = touch.clientY;
    
    const widget = document.getElementById('ls-desktop-widget');
    const rect = widget.getBoundingClientRect();
    
    lsWidgetDrag.initialLeft = rect.left;
    lsWidgetDrag.initialTop = rect.top;
    
    widget.style.left = rect.left + 'px';
    widget.style.top = rect.top + 'px';
    widget.style.transform = 'rotate(5deg) scale(1.05)'; 
    widget.style.zIndex = 100;
    
    if (navigator.vibrate) navigator.vibrate(50);
    
    document.addEventListener('mousemove', lsOnWidgetDrag);
    document.addEventListener('touchmove', lsOnWidgetDrag, { passive: false });
    document.addEventListener('mouseup', lsEndWidgetDrag);
    document.addEventListener('touchend', lsEndWidgetDrag);
}

let lsWidgetDrag = { active: false, startX: 0, startY: 0, initialLeft: 0, initialTop: 0 };

function lsOnWidgetDrag(e) {
// 修改为：
if (!lsWidgetDrag.active) return;
if (e.cancelable) { e.preventDefault(); }

    const touch = e.touches ? e.touches[0] : e;
    const dx = touch.clientX - lsWidgetDrag.startX;
    const dy = touch.clientY - lsWidgetDrag.startY;
    
    const widget = document.getElementById('ls-desktop-widget');
    widget.style.left = (lsWidgetDrag.initialLeft + dx) + 'px';
    widget.style.top = (lsWidgetDrag.initialTop + dy) + 'px';
}

function lsEndWidgetDrag(e) {
    if (lsWidgetDrag.active) {
        const widget = document.getElementById('ls-desktop-widget');
        widget.style.transform = 'rotate(5deg)'; 
        widget.style.zIndex = 10;
        
        lsState.widgetData.position = {
            top: widget.style.top,
            left: widget.style.left,
            transform: 'rotate(5deg)'
        };
        
        lsWidgetDrag.active = false;
        document.removeEventListener('mousemove', lsOnWidgetDrag);
        document.removeEventListener('touchmove', lsOnWidgetDrag);
        document.removeEventListener('mouseup', lsEndWidgetDrag);
        document.removeEventListener('touchend', lsEndWidgetDrag);
    }
}

function lsToggleWidgetMode(e) {
    e.stopPropagation();
    const widget = document.getElementById('ls-desktop-widget');
    if (widget.classList.contains('flipped')) {
        widget.classList.remove('flipped');
        lsState.widgetData.currentMode = 'photo';
    } else {
        widget.classList.add('flipped');
        lsState.widgetData.currentMode = 'note';
    }
    lsSaveData();
}

function lsShowWidgetPhotoDesc() {
    if (isHomeEditMode) return; 
    if (lsState.widgetData.photoDesc) {
        alert(`【照片画面描述】\n${lsState.widgetData.photoDesc}`);
    } else {
        alert("暂无照片描述");
    }
}

// ==========================================
// 回忆功能补丁
// ==========================================

async function wcGenerateSummary() {
    const charId = wcState.activeChatId;
    const char = wcState.characters.find(c => c.id === charId);
    if (!char) return;

    const startIdx = parseInt(document.getElementById('wc-mem-start-idx').value);
    const endIdx = parseInt(document.getElementById('wc-mem-end-idx').value);
    const msgs = wcState.chats[charId] || [];

    if (isNaN(startIdx) || isNaN(endIdx)) return alert("请输入有效的起始和结束层数");
    if (startIdx < 0 || endIdx >= msgs.length || startIdx > endIdx) return alert("层数范围无效");

    const apiConfig = await getActiveApiConfig('chat');
    if (!apiConfig || !apiConfig.key) return alert("请先配置 API");

    const checkboxes = document.querySelectorAll('#wc-mem-summary-wb-list input[type="checkbox"]:checked');
    const selectedWbIds = Array.from(checkboxes).map(cb => cb.value);

    const btn = document.getElementById('wc-btn-generate-summary');
    const originalText = btn.innerText;
    btn.innerText = "生成中...";
    btn.disabled = true;

    try {
        const sliceMsgs = msgs.slice(startIdx, endIdx + 1);
        
        let prompt = `请总结以下对话的主要内容，提取关键信息和情感变化，字数控制在300字以内。\n`;
        
        if (selectedWbIds.length > 0) {
            prompt += `\n【参考背景】\n`;
            selectedWbIds.forEach(id => {
                const entry = worldbookEntries.find(e => e.id.toString() === id.toString());
                if (entry) prompt += `- ${entry.title}: ${entry.desc}\n`;
            });
        }

        prompt += `\n【对话内容】\n`;
        sliceMsgs.forEach(m => {
            const sender = m.sender === 'me' ? '用户' : char.name;
            let content = m.content;
            if (m.type !== 'text') content = `[${m.type}]`;
            prompt += `${sender}: ${content}\n`;
        });

        const response = await fetch(`${apiConfig.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiConfig.key}` },
            body: JSON.stringify({
                model: apiConfig.model,
                messages: [{ role: "user", content: prompt }],
                temperature: 0.5
            })
        });

        const data = await response.json();
        let summary = data.choices[0].message.content;
        summary = summary.replace(/<thinking>[\s\S]*?<\/thinking>/g, '').trim();

        if (!char.memories) char.memories = [];
        char.memories.unshift({
            id: Date.now(),
            type: 'summary',
            content: `[手动总结 ${startIdx}-${endIdx}] ${summary}`,
            time: Date.now()
        });
        
        wcSaveData();
        wcCloseModal('wc-modal-memory-summary');
        wcRenderMemories(); 
        alert("总结生成成功！");

    } catch (e) {
        console.error(e);
        alert("生成失败：" + e.message);
    } finally {
        btn.innerText = originalText;
        btn.disabled = false;
    }
}

function wcAddManualMemory() {
    const text = document.getElementById('wc-mem-manual-text').value.trim();
    if (!text) return alert("请输入记忆内容");

    const char = wcState.characters.find(c => c.id === wcState.activeChatId);
    if (!char) return;

    if (!char.memories) char.memories = [];
    
    char.memories.unshift({
        id: Date.now(),
        type: 'manual',
        content: text,
        time: Date.now()
    });

    wcSaveData();
    document.getElementById('wc-mem-manual-text').value = '';
    wcCloseModal('wc-modal-memory-add');
    wcRenderMemories(); 
}

function wcSaveAiMemoryCount() {
    const count = parseInt(document.getElementById('wc-mem-ai-read-count').value);
    if (isNaN(count) || count < 0) return alert("请输入有效的数字");

    const char = wcState.characters.find(c => c.id === wcState.activeChatId);
    if (!char) return;

    if (!char.chatConfig) char.chatConfig = {};
    char.chatConfig.aiMemoryCount = count;

    wcSaveData();
    wcCloseModal('wc-modal-memory-ai-count');
    alert(`设置已保存：AI 将读取最新的 ${count} 条记忆。`);
}

// --- 新增：主屏幕系统通知 ---
function showMainSystemNotification(title, message, iconUrl = null) {
    const container = document.getElementById('ios-notification-container');
    if (!container) return;
    
    // 【核心修复】：在添加新通知前，清空旧通知，实现覆盖效果
    container.innerHTML = ''; 
    
    const banner = document.createElement('div');
    banner.className = 'ios-notification-banner';
    
    if (!iconUrl && wcState.editingCharId) {
        const char = wcState.characters.find(c => c.id === wcState.editingCharId);
        if (char) iconUrl = char.avatar;
    }
    if (!iconUrl) iconUrl = "https://i.postimg.cc/yYrDHvG5/mmexport1766982633245.jpg";

    banner.innerHTML = `
        <img src="${iconUrl}" class="ios-notif-icon">
        <div class="ios-notif-content">
            <div class="ios-notif-header">
                <span class="ios-notif-title">${title}</span>
                <span class="ios-notif-time">现在</span>
            </div>
            <div class="ios-notif-msg">${message}</div>
        </div>
    `;

    banner.onclick = () => {
        banner.classList.remove('active');
        setTimeout(() => banner.remove(), 400);
    };

    container.appendChild(banner);

    requestAnimationFrame(() => {
        banner.classList.add('active');
    });

    setTimeout(() => {
        if (banner.parentElement) {
            banner.classList.remove('active');
            setTimeout(() => banner.remove(), 400);
        }
    }, 5000);
}

// ==========================================================================
// 新增：一键破解 (同时生成隐私和收藏)
// ==========================================================================
async function wcGeneratePrivacyAndFavorites() {
    const char = wcState.characters.find(c => c.id === wcState.editingCharId);
    if (!char) return;

    const apiConfig = await getActiveApiConfig('phone');
    if (!apiConfig || !apiConfig.key) return alert("请先配置 API");

    const limit = apiConfig.limit || 50;
    if (limit > 0 && sessionApiCallCount >= limit) {
        wcShowError("已达到API调用上限");
        return;
    }
    sessionApiCallCount++;

    wcShowLoading("正在一键破解手机数据...");

    try {
        const realMsgs = wcState.chats[char.id] || [];
        const recentMsgs = realMsgs.slice(-30).map(m => `${m.sender==='me'?'User':char.name}: ${m.content}`).join('\n');
        const chatConfig = char.chatConfig || {};
        const userPersona = chatConfig.userPersona || wcState.user.persona || "无";

        // 核心修复：只读取关联的世界书
        let wbInfo = "";
        if (worldbookEntries.length > 0 && chatConfig.worldbookEntries && chatConfig.worldbookEntries.length > 0) {
            const linkedEntries = worldbookEntries.filter(e => chatConfig.worldbookEntries.includes(e.id.toString()));
            if (linkedEntries.length > 0) {
                wbInfo = "【世界观参考】:\n" + linkedEntries.map(e => `${e.title}: ${e.desc}`).join('\n');
            }
        }

        const now = new Date();
        const timeString = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日 ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        const dayString = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'][now.getDay()];
        const timePrompt = `\n【绝对时间基准】：当前现实时间是 ${timeString} ${dayString}。你生成的所有数据（包括私密记录时间、备忘录时间、日记时间）必须严格符合这个当前时间！绝对不能出现未来的时间，且早中晚的逻辑必须自洽。\n`;

        const lifeStatusPrompt = getLifeStatusPrompt(char); // 新增

        let prompt = `你扮演角色：${char.name}。\n`;
        prompt += timePrompt;
        prompt += `人设：${char.prompt}\n${wbInfo}\n`;
        prompt += `【用户(User)设定】：${userPersona}\n`;
        prompt += lifeStatusPrompt; 
        prompt += `【核心场景设定】：我（User）现在正在偷偷查看你（${char.name}）手机上的私密记录和微信收藏。\n`;
        prompt += `【最近我们的聊天记录（20-30条）】：\n${recentMsgs}\n\n`;
        
        prompt += `请基于你的人设、当前生活状态，以及我们**最近的聊天上下文**，一次性生成你的【私密自慰与春梦记录】和【微信收藏内容】。\n`;
        prompt += `【核心要求（极具活人感与强因果逻辑）】：\n`;
        prompt += `1. 【反模板化警告】：绝对禁止生成空泛的随笔！所有的内容必须是对【今天发生的事情】和【聊天中的情绪】的深刻复盘！\n`;
        prompt += `2. 私密记录 (privacy)：必须夹杂着对 User 的幻想，且情绪要承接最近聊天中的氛围（如：聊天中吵架了，私密记录里可能是带着恨意的发泄；聊天很甜，则是温柔的渴望）。\n`;
        prompt += `3. 收藏-备忘录 (memos) 3-8个：记录今天行程中遇到的琐事，或者为了下次和User见面做的攻略/计划也可以是记录关于User的一些事情和小事。\n`;
        prompt += `4. 收藏-手写日记 (diaries) 1-2个：这是你深夜写下的真心话。必须是对今天某件具体事情（行程或聊天中的某句话）的深刻反思、纠结或偏执。\n`;
        prompt += `   - **字数要求**：每篇日记必须不少于 100 字！\n`;
        prompt += `   - **排版与手账风格**：请在文本中随机使用以下标记：[涂改]写错的话[/涂改]、[高亮]重要的词[/高亮]、[拼贴]引用的聊天记录[/拼贴]\n`;
        prompt += `【内在逻辑要求】：在生成 JSON 之前，请确保你的内部推演包含：\n`;
        prompt += `1. 提炼【今日行程】和【聊天记录】中让你情绪波动最大的点。\n`;
        prompt += `2. 围绕这个情绪点，构思你的日记和私密记录。\n`;
        prompt += `推演结束后，直接返回纯 JSON 对象，格式如下：\n`;
        prompt += `{
  "privacy": {
    "masturbation": {
      "time": "昨晚深夜 / 刚刚",
      "status": "简短的状态概括",
      "action": "具体的动作描述",
      "feeling": "详细的内心感受"
    },
    "wetDream": {
      "time": "前天夜里 / 昨晚",
      "status": "梦醒后的状态",
      "dream": "梦境的具体描述",
      "feeling": "醒来后的内心感受"
    }
  },
  "favorites": {
    "memos": [
      {"title": "备忘录标题", "content": "详细的备忘录正文内容...", "time": "2023-10-24 14:30"}
    ],
    "diaries": [
      {"content": "手写日记的正文内容...", "time": "昨天深夜 03:15"}
    ]
  }
}\n`;


        const response = await fetch(`${apiConfig.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiConfig.key}` },
            body: JSON.stringify({
                model: apiConfig.model,
                messages: [{ role: "user", content: prompt }],
                temperature: parseFloat(apiConfig.temp) || 0.8,
                max_tokens: 4000
            })
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error?.message || `HTTP 错误: ${response.status}`);
        }
        if (!data.choices || !data.choices[0] || !data.choices[0].message) {
            throw new Error("API 返回数据异常，请检查模型名称是否正确。");
        }

        let content = data.choices[0].message.content;
        content = content.replace(/<thinking>[\s\S]*?<\/thinking>/g, '').trim();
        content = content.replace(/```json/g, '').replace(/```/g, '').trim();
        
        let resultData;
        try {
            resultData = JSON.parse(content);
        } catch (parseErr) {
            throw new Error("AI 返回的 JSON 格式错误，请重试。返回内容：" + content.substring(0, 50) + "...");
        }

        if (!char.phoneData) char.phoneData = {};
        
        if (resultData.privacy) char.phoneData.privacy = resultData.privacy;
        if (resultData.favorites) char.phoneData.favorites = resultData.favorites;
        
        wcSaveData();

        // 如果当前停留在隐私或收藏页面，刷新一下UI
        if (document.getElementById('wc-phone-app-privacy').style.display === 'flex') {
            wcRenderPhonePrivacyContent();
        }
        if (document.getElementById('wc-phone-app-favorites').style.display === 'flex') {
            wcRenderPhoneFavoritesContent();
        }

        wcShowSuccess("一键破解成功");

    } catch (e) {
        console.error(e);
        if (typeof showApiErrorModal === 'function') {
            showApiErrorModal(`[一键破解失败] ${e.message}`);
        } else {
            wcShowError("生成失败");
        }
    }
}
// ==========================================
// 新增：AI 后台暗中更新手机数据 (改备注/改签名/和NPC多回合聊天)
// ==========================================
async function wcTriggerBackgroundPhoneUpdate(charId) {
    const char = wcState.characters.find(c => c.id === charId);
    if (!char) return;

    const apiConfig = await getActiveApiConfig('npc');
    if (!apiConfig || !apiConfig.key) return;

    try {
        const chatConfig = char.chatConfig || {};
        const userPersona = chatConfig.userPersona || wcState.user.persona || "无";
        
        const msgs = wcState.chats[char.id] || [];
        const recentMsgs = msgs.slice(-20).map(m => {
            if (m.isError || m.type === 'system') return null;
            let content = m.content;
            if (m.type !== 'text') content = `[${m.type}]`;
            return `${m.sender==='me'?'User':char.name}: ${content}`;
        }).filter(Boolean).join('\n');

        let wbInfo = "";
        if (worldbookEntries.length > 0 && chatConfig.worldbookEntries && chatConfig.worldbookEntries.length > 0) {
            const linkedEntries = worldbookEntries.filter(e => chatConfig.worldbookEntries.includes(e.id.toString()));
            if (linkedEntries.length > 0) {
                wbInfo = "【世界观参考】:\n" + linkedEntries.map(e => `${e.title}: ${e.desc}`).join('\n');
            }
        }

        let npcListStr = "无";
        if (char.phoneData && char.phoneData.contacts) {
            const npcs = char.phoneData.contacts.filter(c => !c.isUser);
            if (npcs.length > 0) {
                npcListStr = npcs.map(n => `${n.name} (${n.desc})`).join('、');
            }
        }

        let prompt = `你扮演角色：${char.name}。\n人设：${char.prompt}\n${wbInfo}\n`;
        prompt += `【用户(User)设定】：${userPersona}\n`;
        prompt += `【最近你与User的聊天记录】：\n${recentMsgs}\n\n`;
        prompt += `【你手机通讯录里的NPC】：${npcListStr}\n\n`;
        
        prompt += `请根据最近和 User 的聊天内容、情绪变化，决定是否要在你自己的手机里偷偷做一些更改，或者找通讯录里的 NPC 聊聊天。\n`;
        prompt += `【要求】：\n`;
        prompt += `1. 如果聊天让你很开心/生气/暧昧，你可以修改【你手机里给 User 的备注名】 (newRemark)。\n`;
        prompt += `2. 你可以修改你自己的个人主页网名 (newNickname) 和 个性签名 (newSign)。\n`;
        prompt += `3. 你可以找通讯录里的某个 NPC 吐槽或分享刚才发生的事 (npcInteraction)。必须是一段有来有回的多句对话（至少3-6句）！\n`;
        prompt += `4. 在对话中，你可以发送文本(text)或表情包(sticker)。\n`;
        prompt += `5. 如果你觉得没必要改，对应字段填 null。\n`;
        prompt += `6. 返回纯 JSON 对象，格式如下：\n`;
        prompt += `{
  "newRemark": "给User的新备注名(不改填null)",
  "newNickname": "你的新网名(不改填null)",
  "newSign": "你的新个性签名(不改填null)",
  "npcInteraction": {
    "npcName": "你要联系的NPC名字(必须从通讯录选，不联系填null)",
    "dialogue": [
      {"sender": "me", "type": "text", "content": "在吗？刚才发生了一件事..."},
      {"sender": "them", "type": "text", "content": "怎么了？"},
      {"sender": "me", "type": "sticker", "content": "委屈"}
    ]
  }
}\n`;

        const response = await fetch(`${apiConfig.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiConfig.key}` },
            body: JSON.stringify({
                model: apiConfig.model,
                messages: [{ role: "user", content: prompt }],
                temperature: parseFloat(apiConfig.temp) || 0.8,
                max_tokens: 4000
            })
        });

        const data = await response.json();
        let content = data.choices[0].message.content;
        content = content.replace(/<thinking>[\s\S]*?<\/thinking>/g, '').trim();
        content = content.replace(/```json/g, '').replace(/```/g, '').trim();
        const result = JSON.parse(content);

        if (!char.phoneData) char.phoneData = {};
        if (!char.phoneData.profile) char.phoneData.profile = { nickname: char.name, sign: "暂无签名" };

        let hasChanges = false;

        if (result.newRemark && result.newRemark !== "null") {
            char.phoneData.userRemark = result.newRemark;
            if (char.phoneData.contacts) {
                const uContact = char.phoneData.contacts.find(c => c.isUser);
                if (uContact) uContact.name = result.newRemark;
            }
            if (char.phoneData.chats) {
                const uChat = char.phoneData.chats.find(c => c.isUser);
                if (uChat) uChat.name = result.newRemark;
            }
            wcAddMessage(charId, 'system', 'system', `[系统提示：${char.name} 偷偷在 Ta 的手机里，将你的备注改为了“${result.newRemark}”]`, { style: 'transparent' });
            hasChanges = true;
        }

        if (result.newNickname && result.newNickname !== "null") {
            char.phoneData.profile.nickname = result.newNickname;
            hasChanges = true;
        }
        if (result.newSign && result.newSign !== "null") {
            char.phoneData.profile.sign = result.newSign;
            hasChanges = true;
        }

        // 处理：和 NPC 多回合聊天
        if (result.npcInteraction && result.npcInteraction.npcName && result.npcInteraction.npcName !== "null" && result.npcInteraction.dialogue) {
            const npcName = result.npcInteraction.npcName;
            const dialogue = result.npcInteraction.dialogue;

            if (!char.phoneData.chats) char.phoneData.chats = [];
            let pChat = char.phoneData.chats.find(c => c.name === npcName);
            if (!pChat) {
                pChat = { id: Date.now(), name: npcName, avatar: getRandomNpcAvatar(), history: [] };
                char.phoneData.chats.push(pChat);
            }
            
            let feedText = `你感知到 ${char.name} 和 ${npcName} 进行了聊天：\n`;
            let lastContent = "";

            // 遍历对话数组，推入手机聊天记录
            dialogue.forEach(msg => {
                let finalContent = msg.content;
                let finalType = msg.type || 'text';

                // 解析表情包
                if (finalType === 'sticker') {
                    const stickerUrl = wcFindStickerUrlMulti(char.chatConfig.stickerGroupIds, msg.content);
                    if (stickerUrl) {
                        finalContent = stickerUrl;
                    } else {
                        finalType = 'text';
                        finalContent = `[表情: ${msg.content}]`;
                    }
                }

                pChat.history.push({ 
                    sender: msg.sender, 
                    type: finalType,
                    content: finalContent,
                    time: Date.now() - Math.floor(Math.random() * 10000) // 制造一点时间差
                });
                
                const speaker = msg.sender === 'me' ? char.name : npcName;
                let displayContent = finalType === 'sticker' ? '[表情包]' : finalContent;
                feedText += `${speaker}: ${displayContent}\n`;
                lastContent = displayContent;
            });

            pChat.lastMsg = lastContent;
            pChat.time = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

            if (typeof lsState !== 'undefined' && lsState.isLinked && lsState.boundCharId === charId) {
                if (typeof lsAddFeed === 'function') {
                    lsAddFeed(feedText.trim(), char.avatar);
                }
                wcAddMessage(charId, 'system', 'system', `[账号关联感知：${char.name} 刚刚和 ${npcName} 聊了天。]`, { style: 'transparent' });
            }
            hasChanges = true;
        }

        if (hasChanges) {
            wcSaveData();
        }

    } catch (e) {
        console.error("后台暗中更新手机数据失败:", e);
    }
}

// ==========================================================================
// 新增：微信收藏 (Favorites) 逻辑
// ==========================================================================
function wcOpenPhoneFavorites() {
    document.getElementById('wc-phone-app-favorites').style.display = 'flex';
    wcRenderPhoneFavoritesContent();
}

function wcClosePhoneFavorites() {
    document.getElementById('wc-phone-app-favorites').style.display = 'none';
}

function wcRenderPhoneFavoritesContent() {
    const char = wcState.characters.find(c => c.id === wcState.editingCharId);
    const content = document.getElementById('wc-phone-favorites-content');
    if (!char) return;

    const favData = (char.phoneData && char.phoneData.favorites) ? char.phoneData.favorites : null;

    if (!favData) {
        content.innerHTML = '<div style="padding: 40px 20px; text-align: center; color: #8E8E93; font-size: 14px;">点击左上角「刷新」<br>偷偷查看 Ta 的微信收藏...</div>';
        return;
    }

    let html = `
        <div class="wc-segmented-control" style="margin: 16px; background: #E5E5EA; display: flex; border-radius: 8px; padding: 2px;">
            <div class="wc-segment-btn ${wcFavoritesTab === 'memos' ? 'active' : ''}" style="flex:1; text-align:center; padding:6px; border-radius:6px; font-size:14px; cursor:pointer; ${wcFavoritesTab === 'memos' ? 'background:#fff; box-shadow:0 1px 3px rgba(0,0,0,0.1);' : 'color:#8E8E93;'}" onclick="wcToggleFavoritesTab('memos')">备忘录</div>
            <div class="wc-segment-btn ${wcFavoritesTab === 'diaries' ? 'active' : ''}" style="flex:1; text-align:center; padding:6px; border-radius:6px; font-size:14px; cursor:pointer; ${wcFavoritesTab === 'diaries' ? 'background:#fff; box-shadow:0 1px 3px rgba(0,0,0,0.1);' : 'color:#8E8E93;'}" onclick="wcToggleFavoritesTab('diaries')">手账日记</div>
        </div>
        <div style="padding: 0 16px 16px 16px; display: flex; flex-direction: column; gap: 12px;">
    `;

    if (wcFavoritesTab === 'memos') {
        if (favData.memos && favData.memos.length > 0) {
            favData.memos.forEach((memo, idx) => {
                const sig = getFavSignature('memo', memo.title, memo.time, memo.content);
                const isFav = wcState.myFavorites && wcState.myFavorites.some(f => f.sig === sig);

                html += `
                    <div style="background: #fff; border-radius: 8px; padding: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); cursor: pointer; position: relative;" onclick="wcOpenMemoDetail(${idx})">
                        <div style="padding-right: 60px;">
                            <div style="font-size: 16px; font-weight: 600; margin-bottom: 6px; color: #333;">${memo.title}</div>
                            <div style="font-size: 14px; color: #666; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${memo.content}</div>
                            <div style="font-size: 11px; color: #B2B2B2; margin-top: 8px;">${memo.time}</div>
                        </div>
                        <!-- 收藏按钮 -->
                        <div onclick="wcToggleFavorite(event, 'memo', ${idx})" style="position: absolute; top: 16px; right: 52px; width: 28px; height: 28px; background: #f5f5f5; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: ${isFav ? '#111' : '#CCC'}; transition: all 0.2s;">
                            <svg viewBox="0 0 24 24" style="width: 14px; height: 14px; fill: ${isFav ? 'currentColor' : 'none'}; stroke: currentColor; stroke-width: 2;"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                        </div>
                        <!-- 分享按钮 -->
                        <div onclick="wcTriggerShare(event, 'memo', ${idx})" style="position: absolute; top: 16px; right: 16px; width: 28px; height: 28px; background: #f5f5f5; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #111; transition: background 0.2s;">
                            <svg viewBox="0 0 24 24" style="width: 14px; height: 14px; fill: none; stroke: currentColor; stroke-width: 2;"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path><polyline points="16 6 12 2 8 6"></polyline><line x1="12" y1="2" x2="12" y2="15"></line></svg>
                        </div>
                    </div>
                `;
            });
        } else {
            html += `<div style="text-align:center; color:#999; padding:20px;">暂无备忘录</div>`;
        }
    } else {
        if (favData.diaries && favData.diaries.length > 0) {
            favData.diaries.forEach((diary, idx) => {
                const sig = getFavSignature('diary', '手写日记', diary.time, diary.content);
                const isFav = wcState.myFavorites && wcState.myFavorites.some(f => f.sig === sig);

                const rot1 = (Math.random() * 4 - 2).toFixed(1);
                const rot2 = (Math.random() * 6 - 3).toFixed(1);
                const tapeColor = ['rgba(255,200,200,0.4)', 'rgba(200,255,200,0.4)', 'rgba(200,200,255,0.4)', 'rgba(240,240,200,0.5)'][Math.floor(Math.random()*4)];
                
                let processedContent = diary.content
                    .replace(/\[涂改\](.*?)\[\/涂改\]/g, '<span style="text-decoration: line-through; text-decoration-color: #333; text-decoration-thickness: 2px; opacity: 0.7;">$1</span>')
                    .replace(/\[高亮\](.*?)\[\/高亮\]/g, '<span style="background: linear-gradient(transparent 60%, rgba(255,255,0,0.6) 60%);">$1</span>')
                    .replace(/\[拼贴\](.*?)\[\/拼贴\]/g, `<span style="background: #fff; border: 1px dashed #ccc; padding: 2px 4px; font-family: monospace; transform: rotate(${rot2}deg); display: inline-block; box-shadow: 1px 1px 2px rgba(0,0,0,0.1); margin: 2px;">$1</span>`);

                html += `
                    <div style="background: #faf9f5; border-radius: 4px; padding: 25px 20px; box-shadow: 2px 4px 12px rgba(0,0,0,0.08); position: relative; overflow: hidden; transform: rotate(${rot1}deg); margin-bottom: 15px; border: 1px solid #eaeaea;">
                        <div style="position: absolute; top: -10px; left: 50%; transform: translateX(-50%) rotate(-2deg); width: 60px; height: 25px; background: ${tapeColor}; backdrop-filter: blur(2px); box-shadow: 0 1px 2px rgba(0,0,0,0.05);"></div>
                        <div style="font-family: 'Courier New', Courier, monospace; font-size: 12px; color: #d35400; border: 1px solid #d35400; border-radius: 50%; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; text-align: center; position: absolute; top: 15px; right: 15px; transform: rotate(15deg); opacity: 0.6; line-height: 1;">
                            ${diary.time.split(' ')[0] || 'DATE'}
                        </div>
                        <div style="font-family: 'Kaiti', 'STKaiti', '楷体', serif; font-size: 16px; color: #3a3a3a; line-height: 2; letter-spacing: 1px; margin-top: 15px; white-space: pre-wrap; background-image: repeating-linear-gradient(transparent, transparent 31px, #e0e0e0 31px, #e0e0e0 32px); background-attachment: local; background-position: 0 4px;">${processedContent}</div>
                        
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 20px;">
                            <div style="display: flex; gap: 8px;">
                                <!-- 收藏按钮 -->
                                <div onclick="wcToggleFavorite(event, 'diary', ${idx})" style="color: ${isFav ? '#111' : '#CCC'}; display: flex; align-items: center; gap: 4px; font-size: 11px; font-family: sans-serif; font-weight: bold; cursor: pointer; background: rgba(0,0,0,0.05); padding: 4px 10px; border-radius: 12px; transition: all 0.2s;">
                                    <svg viewBox="0 0 24 24" style="width: 12px; height: 12px; fill: ${isFav ? 'currentColor' : 'none'}; stroke: currentColor; stroke-width: 2;"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg> FAV
                                </div>
                                <!-- 分享按钮 -->
                                <div onclick="wcTriggerShare(event, 'diary', ${idx})" style="color: #111; display: flex; align-items: center; gap: 4px; font-size: 11px; font-family: sans-serif; font-weight: bold; cursor: pointer; background: rgba(0,0,0,0.05); padding: 4px 10px; border-radius: 12px; transition: background 0.2s;">
                                    <svg viewBox="0 0 24 24" style="width: 12px; height: 12px; fill: none; stroke: currentColor; stroke-width: 2;"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path><polyline points="16 6 12 2 8 6"></polyline><line x1="12" y1="2" x2="12" y2="15"></line></svg> SHARE
                                </div>
                            </div>
                            <div style="font-size: 11px; color: #a09e9b; font-family: sans-serif;">${diary.time}</div>
                        </div>
                    </div>
                `;
            });
        } else {
            html += `<div style="text-align:center; color:#999; padding:20px;">暂无日记</div>`;
        }
    }

    html += '</div>';
    content.innerHTML = html;
}

window.wcToggleFavoritesTab = function(tab) {
    wcFavoritesTab = tab;
    wcRenderPhoneFavoritesContent();
}

function wcOpenMemoDetail(idx) {
    const char = wcState.characters.find(c => c.id === wcState.editingCharId);
    if (!char || !char.phoneData || !char.phoneData.favorites || !char.phoneData.favorites.memos) return;
    
    const memo = char.phoneData.favorites.memos[idx];
    if (!memo) return;

    const detailView = document.getElementById('wc-phone-memo-detail');
    const contentEl = document.getElementById('wc-phone-memo-detail-content');
    
    contentEl.innerHTML = `
        <div style="font-size: 22px; font-weight: bold; margin-bottom: 10px;">${memo.title}</div>
        <div style="font-size: 12px; color: #888; margin-bottom: 20px;">${memo.time}</div>
        <div>${memo.content}</div>
    `;
    
    detailView.style.display = 'flex';
}

async function wcGeneratePhoneFavorites() {
    const char = wcState.characters.find(c => c.id === wcState.editingCharId);
    if (!char) return;

    const apiConfig = await getActiveApiConfig('phone');
    if (!apiConfig || !apiConfig.key) return alert("请先配置 API");

    const limit = apiConfig.limit || 50;
    if (limit > 0 && sessionApiCallCount >= limit) {
        wcShowError("已达到API调用上限");
        return;
    }
    sessionApiCallCount++;

    wcShowLoading("正在破解收藏夹...");

    try {
        const realMsgs = wcState.chats[char.id] || [];
        const recentMsgs = realMsgs.slice(-30).map(m => `${m.sender==='me'?'User':char.name}: ${m.content}`).join('\n');
        const chatConfig = char.chatConfig || {};
        const userName = chatConfig.userName || wcState.user.name; // 👈 新增这一行，定义 userName
        const userPersona = chatConfig.userPersona || wcState.user.persona || "无";

        // 核心修复：只读取关联的世界书
        let wbInfo = "";
        if (worldbookEntries.length > 0 && chatConfig.worldbookEntries && chatConfig.worldbookEntries.length > 0) {
            const linkedEntries = worldbookEntries.filter(e => chatConfig.worldbookEntries.includes(e.id.toString()));
            if (linkedEntries.length > 0) {
                wbInfo = "【世界观参考】:\n" + linkedEntries.map(e => `${e.title}: ${e.desc}`).join('\n');
            }
        }

        const now = new Date();
        const timeString = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日 ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        const dayString = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'][now.getDay()];
        const timePrompt = `\n【绝对时间基准】：当前现实时间是 ${timeString} ${dayString}。你生成的备忘录和日记的时间戳必须合理，不能超过当前时间，且内容要符合当前的时间段氛围。\n`;

        const lifeStatusPrompt = getLifeStatusPrompt(char); // 新增

        let prompt = `你扮演角色：${char.name}。\n`;
        prompt += timePrompt;
        prompt += `人设：${char.prompt}\n${wbInfo}\n`;
        prompt += `【用户(User)设定】：${userPersona}\n`;
        prompt += lifeStatusPrompt; // 新增
        prompt += `【核心场景设定】：我（User）现在正在偷偷查看你（${char.name}）手机上的微信“我的收藏”。\n`;
        prompt += `【最近我们的聊天记录（20-30条）】：\n${recentMsgs}\n\n`;               
        prompt += `请基于你的人设、当前生活状态，以及我们**最近的聊天上下文**，生成你的微信收藏内容。\n`;       
        prompt += `【核心要求（极具活人感与强因果逻辑）】：\n`;
        prompt += `1. 【反模板化警告】：绝对禁止生成空泛的随笔！所有的内容必须是对【今天发生的事情】和【聊天中的情绪】的深刻复盘！\n`;
        prompt += `1. 备忘录 (memos) 3-8个：【独立生活指令】：可以是关于你个人的生活琐事（如：晦涩的工作纪要、奇怪的菜谱、无聊的脑洞、游戏连招记录、购物清单）。也可以是关于 User 的观察日志或计划。保持高度随机性，拒绝重复！重点是要和今天行程事件与聊天记录关联！！要注意你是一个真实的人！\n`;
        prompt += `2. 手写日记 (diaries) 1-2个：这是你深夜写下的私密文字。可以是对未来的迷茫、对某件生活琐事的愤怒吐槽也可以是无聊时的闲谈随笔，也可以是夹杂着对 User${userName} 复杂情感的碎碎念，对User${userName} 想说却不敢说的真心话。必须充满真实的活人情绪起伏。\n`;
        prompt += `   - **字数要求**：每篇日记必须不少于 100 字！\n`;
        prompt += `   - **排版与手账风格**：为了模拟真实的手写草稿和拼贴手账感，请在文本中随机使用以下标记：\n`;
        prompt += `     - [涂改]写错或不想承认的话[/涂改] （例如：我[涂改]一点也不[/涂改]很想你）\n`;
        prompt += `     - [高亮]特别重要的情绪或词语[/高亮]\n`;
        prompt += `     - [拼贴]引用的聊天记录或突兀的想法[/拼贴]\n`;
        prompt += `【内在逻辑要求】：在生成 JSON 之前，请确保你的内部推演包含：\n`;
        prompt += `1. 结合当前时间、地点和心情，今日发生的事情和聊天记录，推断你最近遇到了什么烦心事或有趣的事，需要记在备忘录里。\n`;
        prompt += `2. 构思日记的情感基调，确保情绪真实、细腻、不僵硬。\n`;
        prompt += `推演结束后，直接返回纯 JSON 对象，格式如下：\n`;
        prompt += `{

  "memos": [
    {"title": "User的饲养观察守则", "content": "1. 不能给Ta喝冰水会胃痛。2. 撒谎的时候眼睛会往右下角看。3. 极度吃软不吃硬。", "time": "2023-10-24 14:30"}
  ],
  "diaries": [
    {"content": "今天Ta又对着别人笑了。[涂改]真想把那个人杀了[/涂改] 我必须克制自己。可是[高亮]Ta只能看着我[/高亮]不是吗？[拼贴]“我们只是普通朋友”[/拼贴] 这句话真刺耳。", "time": "昨天深夜 03:15"}
  ]
}\n`;

        const response = await fetch(`${apiConfig.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiConfig.key}` },
            body: JSON.stringify({
                model: apiConfig.model,
                messages: [{ role: "user", content: prompt }],
                temperature: parseFloat(apiConfig.temp) || 0.8,
                max_tokens: 4000
            })
        });

        const data = await response.json();
        let content = data.choices[0].message.content;
        content = content.replace(/<thinking>[\s\S]*?<\/thinking>/g, '').trim();
        content = content.replace(/```json/g, '').replace(/```/g, '').trim();
        const favData = JSON.parse(content);

        if (!char.phoneData) char.phoneData = {};
        char.phoneData.favorites = favData;
        wcSaveData();

        wcRenderPhoneFavoritesContent();
        wcShowSuccess("破解成功");

    } catch (e) {
        console.error(e);
        wcShowError("生成失败");
    }
}

// ==========================================================================
// 新增：浏览器 (Browser) 逻辑
// ==========================================================================
function wcRenderPhoneBrowserContent() {
    const char = wcState.characters.find(c => c.id === wcState.editingCharId);
    const content = document.getElementById('wc-phone-browser-content');
    if (!char) return;

    const browserData = (char.phoneData && char.phoneData.browser) ? char.phoneData.browser : null;

    if (!browserData) {
        content.innerHTML = '<div style="padding: 40px 20px; text-align: center; color: #8E8E93; font-size: 14px;">点击左上角「刷新」<br>偷偷查看 Ta 的浏览器记录...</div>';
        return;
    }

    let html = `
        <div class="wc-segmented-control" style="margin: 16px; background: #E5E5EA;">
            <div class="wc-segment-btn active" id="wc-seg-browser-history" onclick="wcToggleBrowserTab('history')">浏览记录</div>
            <div class="wc-segment-btn" id="wc-seg-browser-posts" onclick="wcToggleBrowserTab('posts')">论坛帖子</div>
        </div>
    `;

    html += `<div id="wc-browser-tab-history" style="display: block; padding: 0 16px 16px 16px;">`;
    if (browserData.history && browserData.history.length > 0) {
        browserData.history.forEach((item, idx) => {
            const sig = getFavSignature('history', item.title, item.time, `[内心批注] ${item.annotation}`);
            const isFav = wcState.myFavorites && wcState.myFavorites.some(f => f.sig === sig);

            html += `
                <div style="background: #fff; border-radius: 8px; padding: 16px; margin-bottom: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); position: relative;">
                    <div style="padding-right: 60px;">
                        <div style="font-size: 15px; font-weight: 600; color: #007AFF; margin-bottom: 4px; word-break: break-all;">${item.title}</div>
                        <div style="font-size: 12px; color: #8E8E93; margin-bottom: 10px;">${item.url_placeholder}</div>
                        <div style="font-size: 14px; color: #333; background: #FFF9C4; padding: 10px; border-radius: 6px; border-left: 3px solid #FFC107;">
                            <span style="font-weight: bold; color: #F57F17;">[内心批注]</span> ${item.annotation}
                        </div>
                        <div style="font-size: 11px; color: #B2B2B2; margin-top: 8px; text-align: right;">${item.time}</div>
                    </div>
                    <!-- 收藏按钮 -->
                    <div onclick="wcToggleFavorite(event, 'history', ${idx})" style="position: absolute; top: 16px; right: 52px; width: 28px; height: 28px; background: #f5f5f5; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: ${isFav ? '#111' : '#CCC'}; cursor: pointer; transition: all 0.2s;">
                        <svg viewBox="0 0 24 24" style="width: 14px; height: 14px; fill: ${isFav ? 'currentColor' : 'none'}; stroke: currentColor; stroke-width: 2;"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                    </div>
                    <!-- 分享按钮 -->
                    <div onclick="wcTriggerShare(event, 'history', ${idx})" style="position: absolute; top: 16px; right: 16px; width: 28px; height: 28px; background: #f5f5f5; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #111; cursor: pointer; transition: background 0.2s;">
                        <svg viewBox="0 0 24 24" style="width: 14px; height: 14px; fill: none; stroke: currentColor; stroke-width: 2;"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path><polyline points="16 6 12 2 8 6"></polyline><line x1="12" y1="2" x2="12" y2="15"></line></svg>
                    </div>
                </div>
            `;
        });
    } else {
        html += `<div style="text-align: center; color: #888; padding: 20px;">暂无浏览记录</div>`;
    }
    html += `</div>`;

    html += `<div id="wc-browser-tab-posts" style="display: none; padding: 0 16px 16px 16px;">`;
    if (browserData.posts && browserData.posts.length > 0) {
        browserData.posts.forEach((post, idx) => {
            const sig = getFavSignature('post', post.title, '', post.content);
            const isFav = wcState.myFavorites && wcState.myFavorites.some(f => f.sig === sig);

            html += `
                <div style="background: #fff; border-radius: 8px; padding: 16px; margin-bottom: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); cursor: pointer; position: relative;" onclick="wcOpenPostDetail(${idx})">
                    <div style="padding-right: 60px;">
                        <div style="font-size: 16px; font-weight: bold; color: #333; margin-bottom: 8px;">${post.title}</div>
                        <div style="font-size: 14px; color: #666; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; margin-bottom: 10px;">${post.content}</div>
                        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: #8E8E93;">
                            <span>楼主: ${post.author}</span>
                            <span>💬 ${post.comments ? post.comments.length : 0} 评论</span>
                        </div>
                    </div>
                    <!-- 收藏按钮 -->
                    <div onclick="wcToggleFavorite(event, 'post', ${idx})" style="position: absolute; top: 16px; right: 52px; width: 28px; height: 28px; background: #f5f5f5; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: ${isFav ? '#111' : '#CCC'}; transition: all 0.2s;">
                        <svg viewBox="0 0 24 24" style="width: 14px; height: 14px; fill: ${isFav ? 'currentColor' : 'none'}; stroke: currentColor; stroke-width: 2;"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                    </div>
                    <!-- 分享按钮 -->
                    <div onclick="wcTriggerShare(event, 'post', ${idx})" style="position: absolute; top: 16px; right: 16px; width: 28px; height: 28px; background: #f5f5f5; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #111; transition: background 0.2s;">
                        <svg viewBox="0 0 24 24" style="width: 14px; height: 14px; fill: none; stroke: currentColor; stroke-width: 2;"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path><polyline points="16 6 12 2 8 6"></polyline><line x1="12" y1="2" x2="12" y2="15"></line></svg>
                    </div>
                </div>
            `;
        });
    } else {
        html += `<div style="text-align: center; color: #888; padding: 20px;">暂无帖子</div>`;
    }
    html += `</div>`;

    content.innerHTML = html;
}

function wcToggleBrowserTab(tab) {
    document.getElementById('wc-seg-browser-history').classList.toggle('active', tab === 'history');
    document.getElementById('wc-seg-browser-posts').classList.toggle('active', tab === 'posts');
    document.getElementById('wc-browser-tab-history').style.display = tab === 'history' ? 'block' : 'none';
    document.getElementById('wc-browser-tab-posts').style.display = tab === 'posts' ? 'block' : 'none';
}

function wcOpenPostDetail(idx) {
    const char = wcState.characters.find(c => c.id === wcState.editingCharId);
    if (!char || !char.phoneData || !char.phoneData.browser || !char.phoneData.browser.posts) return;
    
    const post = char.phoneData.browser.posts[idx];
    if (!post) return;

    const detailView = document.getElementById('wc-phone-post-detail');
    const contentEl = document.getElementById('wc-phone-post-detail-content');
    
    let commentsHtml = '';
    if (post.comments && post.comments.length > 0) {
        post.comments.forEach((c, i) => {
            const isChar = c.author === char.name || c.author === "楼主" && post.author === char.name;
            const bg = isChar ? '#E3F2FD' : '#F9F9F9';
            commentsHtml += `
                <div style="background: ${bg}; padding: 12px; border-radius: 8px; margin-bottom: 8px;">
                    <div style="font-size: 12px; color: #576B95; font-weight: bold; margin-bottom: 4px;">${i+1}楼 - ${c.author}</div>
                    <div style="font-size: 14px; color: #333;">${c.content}</div>
                </div>
            `;
        });
    } else {
        commentsHtml = '<div style="text-align: center; color: #888; font-size: 13px;">暂无评论</div>';
    }

    contentEl.innerHTML = `
        <div style="padding: 20px; background: #fff; margin-bottom: 10px;">
            <div style="font-size: 20px; font-weight: bold; margin-bottom: 10px; color: #000;">${post.title}</div>
            <div style="font-size: 12px; color: #888; margin-bottom: 16px;">楼主: ${post.author}</div>
            <div style="font-size: 16px; line-height: 1.6; color: #333; white-space: pre-wrap;">${post.content}</div>
        </div>
        <div style="padding: 16px; background: #fff;">
            <div style="font-size: 14px; font-weight: bold; margin-bottom: 12px; color: #8E8E93;">全部评论</div>
            ${commentsHtml}
        </div>
    `;
    
    detailView.style.display = 'flex';
}

async function wcGeneratePhoneBrowser() {
    const char = wcState.characters.find(c => c.id === wcState.editingCharId);
    if (!char) return;

    const apiConfig = await getActiveApiConfig('phone');
    if (!apiConfig || !apiConfig.key) return alert("请先配置 API");

    const limit = apiConfig.limit || 50;
    if (limit > 0 && sessionApiCallCount >= limit) {
        wcShowError("已达到API调用上限");
        return;
    }
    sessionApiCallCount++;

    wcShowLoading("正在提取浏览器数据...");

    try {
        const realMsgs = wcState.chats[char.id] || [];
        const recentMsgs = realMsgs.slice(-30).map(m => `${m.sender==='me'?'User':char.name}: ${m.content}`).join('\n');
        const chatConfig = char.chatConfig || {};
        const userPersona = chatConfig.userPersona || wcState.user.persona || "无";

        // 核心修复：只读取关联的世界书
        let wbInfo = "";
        if (worldbookEntries.length > 0 && chatConfig.worldbookEntries && chatConfig.worldbookEntries.length > 0) {
            const linkedEntries = worldbookEntries.filter(e => chatConfig.worldbookEntries.includes(e.id.toString()));
            if (linkedEntries.length > 0) {
                wbInfo = "【世界观参考】:\n" + linkedEntries.map(e => `${e.title}: ${e.desc}`).join('\n');
            }
        }

        const now = new Date();
        const timeString = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日 ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        const dayString = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'][now.getDay()];
        const timePrompt = `\n【绝对时间基准】：当前现实时间是 ${timeString} ${dayString}。你生成的浏览记录时间(time)必须在当前时间之前，且搜索内容要符合当前的时间点（如深夜可能会搜索情感问题，白天可能会搜索工作/学习内容）。\n`;

        const lifeStatusPrompt = getLifeStatusPrompt(char); // 新增

        let prompt = `你扮演角色：${char.name}。\n`;
        prompt += timePrompt;
        prompt += `人设：${char.prompt}\n${wbInfo}\n`;
        prompt += `【用户(User)设定】：${userPersona}\n`;
        prompt += lifeStatusPrompt; 
        prompt += `【核心场景设定】：我（User）现在正在偷偷查看你（${char.name}）手机上的浏览器APP。\n`;
        prompt += `【最近我们的聊天记录（20-30条）】：\n${recentMsgs}\n\n`;
        
        prompt += `请基于你的人设、当前生活状态，以及我们**最近的聊天上下文**，生成你的浏览器数据。\n`;
        prompt += `【核心要求（极具活人感与强因果逻辑）】：\n`;
        prompt += `1. 【反模板化警告】：绝对禁止生成毫无关联的随机搜索！每一条浏览记录都必须能在【今日行程】或【聊天记录】中找到原因！\n`;
        prompt += `2. 浏览记录(history) 4-8条：如果今天行程里去了超市，可能会搜某个菜的做法；如果聊天里User提到了某部电影，可能会搜影评；如果今天心情烦躁，可能会搜缓解焦虑的方法。必须是顺理成章的延伸！\n`;
        prompt += `3. 内心批注(annotation)：这是你浏览该网页时的真实想法。必须结合你当下的心情(mood)来写，展现你最真实的心理活动。\n`;
        prompt += `4. 论坛帖子(posts) 2-5个：你在匿名论坛发帖求助/吐槽。帖子的内容必须是对【今天发生的事情】或【刚刚和User聊天的内容】的复盘、纠结或吐槽！\n`;
        prompt += `5. 帖子评论5-10个：可以是各种路人或者的NPC评论，也可以是你回复路人或NPC的评论，评论要模拟真实论坛，具备活人感！\n`;
        prompt += `【内在逻辑要求】：在生成 JSON 之前，请确保你的内部推演包含：\n`;
        prompt += `1. 仔细阅读【今日行程】和【聊天记录】，提取出 3-5 个关键事件或情绪点。\n`;
        prompt += `2. 针对这些事件，推断你会在浏览器里搜索什么，或者在论坛里发什么帖子。\n`;
        prompt += `推演结束后，直接返回纯 JSON 对象，格式如下：\n`;
        prompt += `{
  "history": [
    {"title": "搜索的网页标题", "url_placeholder": "zhidao.baidu.com/question/...", "annotation": "你真实的内心批注", "time": "今天 02:20"}
  ],
  "posts": [
    {
      "title": "论坛帖子标题", 
      "content": "帖子正文内容...", 
      "author": "匿名用户", 
      "comments": [
        {"author": "网友A", "content": "评论内容"}
      ]
    }
  ]
}\n`;


        const response = await fetch(`${apiConfig.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiConfig.key}` },
            body: JSON.stringify({
                model: apiConfig.model,
                messages: [{ role: "user", content: prompt }],
                temperature: parseFloat(apiConfig.temp) || 0.8,
                max_tokens: 4000
            })
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error?.message || `HTTP 错误: ${response.status}`);
        }
        if (!data.choices || !data.choices[0] || !data.choices[0].message) {
            throw new Error("API 返回数据异常，请检查模型名称是否正确。");
        }

        let content = data.choices[0].message.content;
        content = content.replace(/<thinking>[\s\S]*?<\/thinking>/g, '').trim();
        content = content.replace(/```json/g, '').replace(/```/g, '').trim();
        
        let browserData;
        try {
            browserData = JSON.parse(content);
        } catch (parseErr) {
            throw new Error("AI 返回的 JSON 格式错误，请重试。返回内容：" + content.substring(0, 50) + "...");
        }

        if (!char.phoneData) char.phoneData = {};
        char.phoneData.browser = browserData;
        wcSaveData();

        wcRenderPhoneBrowserContent();
        wcShowSuccess("提取成功");

    } catch (e) {
        console.error(e);
        if (typeof showApiErrorModal === 'function') {
            showApiErrorModal(`[浏览器生成失败] ${e.message}`);
        } else {
            wcShowError("生成失败");
        }
    }
}
// ==========================================================================
// 新增：分享到聊天核心逻辑 (Share to Chat)
// ==========================================================================
let pendingShareItem = null;

function wcTriggerShare(event, type, index) {
    // 阻止事件冒泡，防止触发卡片本身的点击事件
    if (event) event.stopPropagation();

    const char = wcState.characters.find(c => c.id === wcState.editingCharId);
    if (!char || !char.phoneData) return;

    let title = '';
    let content = '';
    let time = '';
    let item = null; // 增加安全检查变量

    // 根据类型提取数据，并加入防空保护
    if (type === 'memo') {
        item = char.phoneData.favorites?.memos?.[index];
        if (item) { title = item.title; content = item.content; time = item.time; }
    } else if (type === 'diary') {
        item = char.phoneData.favorites?.diaries?.[index];
        if (item) { title = "手写日记"; content = item.content; time = item.time; }
    } else if (type === 'history') {
        item = char.phoneData.browser?.history?.[index];
        if (item) { title = item.title; content = `[内心批注] ${item.annotation}`; time = item.time; }
    } else if (type === 'post') {
        item = char.phoneData.browser?.posts?.[index];
        if (item) { title = item.title; content = item.content; time = ""; }
    } else if (type === 'masturbation') {
        // 兼容新旧数据结构
        item = char.phoneData.privacy?.masturbation || char.phoneData.privacy;
        if (item) { 
            title = "私密记录"; 
            content = `[状态] ${item.status || '无'}\n[动作] ${item.action || '无'}\n[感受] ${item.feeling || '无'}`; 
            time = item.time || ""; 
        }
    } else if (type === 'wetDream') {
        item = char.phoneData.privacy?.wetDream;
        if (item) { 
            title = "春梦记录"; 
            content = `[状态] ${item.status || '无'}\n[梦境] ${item.dream || '无'}\n[感受] ${item.feeling || '无'}`; 
            time = item.time || ""; 
        }
    }

    // 核心修复：如果找不到数据，直接拦截，防止报错
    if (!item) {
        alert("无法读取该数据，可能数据为空或已损坏。");
        return;
    }

    // 清理 HTML 标签（针对日记中的涂改/高亮等标签），用于在弹窗中纯文本预览
    const cleanContent = content.replace(/<[^>]*>?/gm, '');

    pendingShareItem = { type, title, content, time };

    // 填充弹窗内容
    document.getElementById('share-confirm-title').innerText = title;
    document.getElementById('share-confirm-desc').innerText = cleanContent;

    // 显示弹窗
    const modal = document.getElementById('wc-modal-share-confirm');
    modal.classList.remove('hidden');
    modal.style.display = 'flex';
}

function wcCancelShare() {
    const modal = document.getElementById('wc-modal-share-confirm');
    modal.classList.add('hidden');
    setTimeout(() => modal.style.display = 'none', 300);
    pendingShareItem = null;
}

function wcExecuteShare() {
    if (!pendingShareItem) return;

    const charId = wcState.editingCharId; 
    if (!charId) return;

    let tagText = "";
    if (pendingShareItem.type === 'memo') tagText = "MEMO / 备忘录";
    else if (pendingShareItem.type === 'diary') tagText = "DIARY / 手账日记";
    else if (pendingShareItem.type === 'history') tagText = "WEB HISTORY / 浏览记录";
    else if (pendingShareItem.type === 'post') tagText = "FORUM POST / 论坛帖子";
    else if (pendingShareItem.type === 'masturbation') tagText = "SECRET / 私密记录";
    else if (pendingShareItem.type === 'wetDream') tagText = "SECRET / 春梦记录";

    // 构造高级感聊天卡片 HTML
    const cardHtml = `
        <div class="chat-shared-card">
            <div class="shared-card-tag">${tagText}</div>
            <div class="shared-card-title">${pendingShareItem.title}</div>
            <div class="shared-card-content">${pendingShareItem.content}</div>
            ${pendingShareItem.time ? `<div class="shared-card-footer">${pendingShareItem.time}</div>` : ''}
        </div>
    `;

    // 【核心修复】：先将 pendingShareItem 的数据保存到局部变量，防止被 wcCancelShare 清空
    const currentShareItem = pendingShareItem;

    // 1. 关闭手机模拟器
    wcClosePhoneSim();
    
    // 2. 关闭分享弹窗 (这里会将全局的 pendingShareItem 置为 null)
    wcCancelShare();

    // 3. 将卡片作为 receipt 类型发送到聊天界面 (receipt 类型支持直接渲染 HTML)
    wcAddMessage(charId, 'me', 'receipt', cardHtml);

    // 4. 给 AI 发送隐藏的系统提示，强制让它做出反应 (使用保存好的 currentShareItem)
    const aiPrompt = `[系统内部信息(仅AI可见): 用户偷偷查看了你的手机，并把你的【${tagText}】截图发给了你。内容是：“${currentShareItem.title} - ${currentShareItem.content.replace(/<[^>]*>?/gm, '')}”。]`;
    wcAddMessage(charId, 'system', 'system', aiPrompt, { hidden: true });

    // 5. 提示用户
    setTimeout(() => {
        alert("已成功发送给 Ta！快看看 Ta 的反应吧~");
    }, 300);
}

// ==========================================================================
// 新增：全局收藏功能 (Favorites) 核心逻辑
// ==========================================================================

// 生成唯一标识符，用于判断是否已收藏
function getFavSignature(type, title, time, content) {
    const cleanContent = (content || '').replace(/<[^>]*>?/gm, '').substring(0, 30);
    return `${type}_${title}_${time}_${cleanContent}`;
}

// 切换收藏状态
function wcToggleFavorite(event, type, index) {
    if (event) event.stopPropagation();
    const char = wcState.characters.find(c => c.id === wcState.editingCharId);
    if (!char || !char.phoneData) return;

    let title = ''; let content = ''; let time = ''; let item = null;

    if (type === 'memo') {
        item = char.phoneData.favorites?.memos?.[index];
        if (item) { title = item.title; content = item.content; time = item.time; }
    } else if (type === 'diary') {
        item = char.phoneData.favorites?.diaries?.[index];
        if (item) { title = "手写日记"; content = item.content; time = item.time; }
    } else if (type === 'history') {
        item = char.phoneData.browser?.history?.[index];
        if (item) { title = item.title; content = `[内心批注] ${item.annotation}`; time = item.time; }
    } else if (type === 'post') {
        item = char.phoneData.browser?.posts?.[index];
        if (item) { title = item.title; content = item.content; time = ""; }
    } else if (type === 'masturbation') {
        item = char.phoneData.privacy?.masturbation || char.phoneData.privacy;
        if (item) { title = "私密记录"; content = `[状态] ${item.status || '无'}\n[动作] ${item.action || '无'}\n[感受] ${item.feeling || '无'}`; time = item.time || ""; }
    } else if (type === 'wetDream') {
        item = char.phoneData.privacy?.wetDream;
        if (item) { title = "春梦记录"; content = `[状态] ${item.status || '无'}\n[梦境] ${item.dream || '无'}\n[感受] ${item.feeling || '无'}`; time = item.time || ""; }
    }

    if (!item) return alert("无法读取该数据");

    const sig = getFavSignature(type, title, time, content);
    if (!wcState.myFavorites) wcState.myFavorites = [];

    const existingIdx = wcState.myFavorites.findIndex(f => f.sig === sig);
    if (existingIdx > -1) {
        // 取消收藏
        wcState.myFavorites.splice(existingIdx, 1);
    } else {
        // 添加收藏
        wcState.myFavorites.unshift({
            id: Date.now(),
            sig, type, title, content, time,
            charName: char.name,
            charAvatar: char.avatar,
            savedAt: Date.now()
        });
        showFavoriteAlert();
    }
    
    wcSaveData();
    wcRefreshCurrentPhoneView();
}

// 刷新当前正在查看的手机页面
function wcRefreshCurrentPhoneView() {
    if (document.getElementById('wc-phone-app-privacy').style.display === 'flex') wcRenderPhonePrivacyContent();
    if (document.getElementById('wc-phone-app-browser').style.display === 'flex') wcRenderPhoneBrowserContent();
    if (document.getElementById('wc-phone-app-favorites').style.display === 'flex') wcRenderPhoneFavoritesContent();
}

// 显示高级感收藏成功弹窗
function showFavoriteAlert() {
    const modal = document.getElementById('wc-modal-favorite-alert');
    modal.classList.remove('hidden');
    modal.classList.add('active');
    
    setTimeout(() => {
        modal.classList.remove('active');
        setTimeout(() => modal.classList.add('hidden'), 400);
    }, 1500);
}

// ==========================================================================
// 新增：WeChat 主界面的「我的收藏」页面逻辑
// ==========================================================================

// 替换以下三个函数
function wcOpenMyFavorites() {
    document.getElementById('wc-view-user').classList.remove('active');
    document.getElementById('wc-view-my-favorites').classList.add('active');
    document.getElementById('wc-main-tabbar').style.display = 'none';
    
    // 复用主 Navbar，防止点击穿透
    document.getElementById('wc-btn-exit').style.display = 'none';
    document.getElementById('wc-btn-back').style.display = 'flex';
    document.getElementById('wc-btn-back').onclick = wcCloseMyFavorites;
    
    const titleEl = document.getElementById('wc-nav-title');
    titleEl.innerText = '我的收藏';
    titleEl.onclick = null;
    titleEl.style.cursor = 'default';
    
    const rightContainer = document.getElementById('wc-nav-right-container');
    rightContainer.innerHTML = '';
    
    wcRenderMyFavorites();
}

function wcCloseMyFavorites() {
    document.getElementById('wc-view-my-favorites').classList.remove('active');
    wcSwitchTab('user');
    
    document.getElementById('wc-main-tabbar').style.display = 'flex';
    document.getElementById('wc-btn-back').style.display = 'none';
    document.getElementById('wc-btn-exit').style.display = 'flex';
    
    document.getElementById('wc-btn-back').onclick = wcHandleBack;
}

function wcRenderMyFavorites() {
    const list = document.getElementById('wc-my-favorites-list');
    list.innerHTML = '';

    if (!wcState.myFavorites || wcState.myFavorites.length === 0) {
        list.innerHTML = '<div style="text-align: center; color: #8E8E93; padding-top: 50px; font-size: 14px;">暂无收藏内容</div>';
        return;
    }

    wcState.myFavorites.forEach(fav => {
        const dateStr = new Date(fav.savedAt).toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        
        const div = document.createElement('div');
        div.className = 'fav-accordion-item';
        div.innerHTML = `
            <div class="fav-accordion-header" onclick="this.parentElement.classList.toggle('expanded')">
                <div class="fav-header-left">
                    <img src="${fav.charAvatar}" class="fav-char-avatar">
                    <div class="fav-header-info">
                        <div class="fav-title">${fav.title}</div>
                        <div class="fav-time">${dateStr} · ${fav.charName}</div>
                    </div>
                </div>
                <svg class="fav-chevron" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </div>
            <div class="fav-accordion-body">
                <div class="fav-content-inner">
                    <div class="fav-original-time">记录时间: ${fav.time || '未知'}</div>
                    <div class="fav-text">${fav.content}</div>
                    <div class="fav-delete-btn" onclick="wcDeleteFavorite(${fav.id})">取消收藏</div>
                </div>
            </div>
        `;
        list.appendChild(div);
    });
}

function wcDeleteFavorite(id) {
    if (confirm("确定要取消收藏吗？")) {
        wcState.myFavorites = wcState.myFavorites.filter(f => f.id !== id);
        wcSaveData();
        wcRenderMyFavorites();
    }
}

// 【新增】：渲染手机预设列表
function wcRenderPhonePresets() {
    const select = document.getElementById('wc-phone-preset-select');
    if (!select) return;
    select.innerHTML = '<option value="">选择预设...</option>';
    wcState.phonePresets.forEach((p, idx) => {
        const opt = document.createElement('option');
        opt.value = idx;
        opt.innerText = p.name;
        select.appendChild(opt);
    });
}

// 【新增】：保存当前手机装修为预设
function wcSavePhonePreset() {
    const name = prompt("请输入手机预设名称：");
    if (!name) return;
    
    const char = wcState.characters.find(c => c.id === wcState.editingCharId);
    const currentConfig = char && char.phoneConfig ? char.phoneConfig : {};
    
    const preset = {
        name: name,
        wallpaper: wcState.tempPhoneConfig.wallpaper || currentConfig.wallpaper || '',
        stickyNote: wcState.tempPhoneConfig.stickyNote || currentConfig.stickyNote || '',
        icons: {
            msg: (wcState.tempPhoneConfig.icons && wcState.tempPhoneConfig.icons.msg) || (currentConfig.icons && currentConfig.icons.msg) || '',
            browser: (wcState.tempPhoneConfig.icons && wcState.tempPhoneConfig.icons.browser) || (currentConfig.icons && currentConfig.icons.browser) || '',
            cart: (wcState.tempPhoneConfig.icons && wcState.tempPhoneConfig.icons.cart) || (currentConfig.icons && currentConfig.icons.cart) || '',
            settings: (wcState.tempPhoneConfig.icons && wcState.tempPhoneConfig.icons.settings) || (currentConfig.icons && currentConfig.icons.settings) || ''
        }
    };
    
    wcState.phonePresets.push(preset);
    wcSaveData();
    wcRenderPhonePresets();
    alert("手机预设已保存！");
}

// 【新增】：应用手机预设
function wcApplyPhonePreset(idx) {
    if (idx === "") return;
    const preset = wcState.phonePresets[idx];
    if (!preset) return;
    
    wcState.tempPhoneConfig.wallpaper = preset.wallpaper;
    wcState.tempPhoneConfig.stickyNote = preset.stickyNote;
    wcState.tempPhoneConfig.icons = { ...preset.icons };
    
    // 更新预览图
    if (preset.wallpaper) {
        document.getElementById('wc-preview-phone-bg').src = preset.wallpaper;
        document.getElementById('wc-preview-phone-bg').style.display = 'block';
        document.getElementById('wc-text-phone-bg').style.display = 'none';
    }
    if (preset.stickyNote) {
        document.getElementById('wc-preview-sticky-note').src = preset.stickyNote;
        document.getElementById('wc-preview-sticky-note').style.display = 'block';
        document.getElementById('wc-text-sticky-note').style.display = 'none';
    }
    ['msg', 'browser', 'cart', 'settings'].forEach(id => {
        if (preset.icons[id]) {
            document.getElementById(`wc-preview-icon-${id}`).src = preset.icons[id];
            document.getElementById(`wc-preview-icon-${id}`).style.display = 'block';
        }
    });
}

// 【新增】：删除手机预设
function wcDeletePhonePreset() {
    const select = document.getElementById('wc-phone-preset-select');
    const idx = select.value;
    if (idx === "") return alert("请先选择一个预设");
    
    if (confirm("确定删除该手机预设吗？")) {
        wcState.phonePresets.splice(idx, 1);
        wcSaveData();
        wcRenderPhonePresets();
    }
}

// ==========================================================================
// 新增：购物 (Shopping) 逻辑
// ==========================================================================
function wcActionShopping() {
    wcCloseAllPanels();
    wcOpenShoppingPage();
}

function wcOpenShoppingPage() {
    document.getElementById('wc-view-chat-detail').classList.remove('active');
    const shopPage = document.getElementById('wc-view-shopping');
    shopPage.classList.add('active');
    // 【修复】：强制设置为 flex，覆盖可能存在的 none
    shopPage.style.display = 'flex';
    
    if (!wcState.shopData) {
        wcState.shopData = { mall: [], takeout: [], cart: [], config: { worldbookEntries: [] } };
    }
    
    wcSwitchShopTab('mall');
    wcUpdateCartBadge();
}

function wcCloseShoppingPage() {
    const shopPage = document.getElementById('wc-view-shopping');
    shopPage.classList.remove('active');
    // 【修复】：强制设置为 none，防止它挤占空间
    shopPage.style.display = 'none';
    document.getElementById('wc-view-chat-detail').classList.add('active');
}

function wcSwitchShopTab(tab) {
    // 兼容旧的 shop-tab 和新的 shop-cap-tab
    document.querySelectorAll('.shop-tab, .shop-cap-tab').forEach(el => el.classList.remove('active'));
    const activeTab = document.getElementById(`shop-tab-${tab}`);
    if (activeTab) activeTab.classList.add('active');
    
    document.querySelectorAll('.shop-list').forEach(el => el.style.display = 'none');
    const activeList = document.getElementById(`shop-list-${tab}`);
    if (activeList) activeList.style.display = 'block';
    
    wcRenderShopItems(tab);
}

function wcOpenShopSettingsModal() {
    const list = document.getElementById('wc-shop-setting-wb-list');
    list.innerHTML = '';
    let shopWbCount = 0;
    if (wcState.shopData.config && wcState.shopData.config.worldbookEntries) {
        wcState.shopData.config.worldbookEntries.forEach(id => {
            list.innerHTML += `<input type="checkbox" value="${id}" checked>`;
            shopWbCount++;
        });
    }
    document.getElementById('wc-shop-setting-wb-count').innerText = `已选 ${shopWbCount} 项`;

    wcOpenModal('wc-modal-shop-settings');
}

function wcSaveShopSettings() {
    const checkboxes = document.querySelectorAll('#wc-shop-setting-wb-list input[type="checkbox"]:checked');
    wcState.shopData.config.worldbookEntries = Array.from(checkboxes).map(cb => cb.value);
    wcSaveData();
    wcCloseModal('wc-modal-shop-settings');
    alert("商城设置已保存");
}

async function wcGenerateShopItems() {
    const apiConfig = await getActiveApiConfig('phone');
    if (!apiConfig || !apiConfig.key) return alert("请先配置 API");

    const limit = apiConfig.limit || 50;
    if (limit > 0 && sessionApiCallCount >= limit) {
        wcShowError("已达到API调用上限");
        return;
    }
    sessionApiCallCount++;

    wcShowLoading("正在进货中...");

    try {
        // 1. 获取当前角色和用户设定
        const charId = wcState.activeChatId || wcState.editingCharId;
        const char = wcState.characters.find(c => c.id === charId);
        let charInfo = "";
        let userInfo = "";
        if (char) {
            charInfo = `【角色设定 (${char.name})】：${char.prompt}\n`;
            const chatConfig = char.chatConfig || {};
            userInfo = `【用户设定】：${chatConfig.userPersona || wcState.user.persona || "无"}\n`;
        }

        // 2. 获取勾选的世界书
        let wbInfo = "";
        const selectedWbs = wcState.shopData.config.worldbookEntries || [];
        if (worldbookEntries.length > 0 && selectedWbs.length > 0) {
            const linkedEntries = worldbookEntries.filter(e => selectedWbs.includes(e.id.toString()));
            if (linkedEntries.length > 0) {
                wbInfo = "【世界观参考】:\n" + linkedEntries.map(e => `${e.title}: ${e.desc}`).join('\n');
            }
        }

        // 3. 组装强大的 Prompt
        let prompt = `你现在是一个商城和外卖平台的后台引擎。请根据以下设定，生成商城商品和外卖商品。\n`;
        prompt += charInfo;
        prompt += userInfo;
        if (wbInfo) prompt += wbInfo + "\n";
        
        prompt += `【要求】：\n`;
        prompt += `1. 总共生成 30 个商品：商城 (mall) 15 个，外卖 (takeout) 15 个。\n`;
        prompt += `2. 商城商品 (mall) 包含两类：\n`;
        prompt += `   - 前 8 个为【日常用品DAILY】：符合世界观和角色日常生活的普通物品。\n`;
        prompt += `   - 后 7 个为【可能喜欢FAV】：根据角色和用户的设定，专门为他们推荐的特殊物品、礼物或情趣用品。\n`;
        prompt += `   - 注意：日常用品和可能喜欢的商品必须完全不同，不互通！\n`;
        prompt += `3. 外卖商品 (takeout) 包含两类：\n`;
        prompt += `   - 前 8 个为【普通小吃/餐饮SNACK】：符合世界观的常见食物。\n`;
        prompt += `   - 后 7 个为【可能喜欢的小吃FAV】：根据角色和用户的口味偏好，专门推荐的特色美食或饮品。\n`;
        prompt += `   - 注意：普通小吃和可能喜欢的小吃必须完全不同，不互通！\n`;
        prompt += `4. 每个商品包含物品名称 (name)、符合设定的简短描述 (desc)、以及合理的价格 (price，数字格式)。\n`;
        prompt += `5. 返回纯 JSON 对象，格式如下：\n`;
        prompt += `{
          "mall": [
            {"name": "商品名", "desc": "描述", "price": 99.00}
          ],
          "takeout": [
            {"name": "外卖名", "desc": "描述", "price": 25.50}
          ]
        }\n`;

        const response = await fetch(`${apiConfig.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiConfig.key}` },
            body: JSON.stringify({
                model: apiConfig.model,
                messages: [{ role: "user", content: prompt }],
                temperature: parseFloat(apiConfig.temp) || 0.8,
                max_tokens: 4000
            })
        });

        const data = await response.json();
        let content = data.choices[0].message.content;
        content = content.replace(/<thinking>[\s\S]*?<\/thinking>/g, '').trim();
        content = content.replace(/```json/g, '').replace(/```/g, '').trim();
        const generatedData = JSON.parse(content);

        wcState.shopData.mall = generatedData.mall || [];
        wcState.shopData.takeout = generatedData.takeout || [];
        wcSaveData();

        wcUpdateCatOrbit(); // 刷新当前视图
        wcShowSuccess("进货成功");

    } catch (e) {
        console.error(e);
        wcShowError("生成失败");
    }
}

// ==========================================
// 商城全局状态与分类轨道逻辑 (支持商城与外卖双模式)
// ==========================================
let wcShopCurrentTab = 'mall'; // 记录当前是大 Tab 是商城还是外卖
let wcShopCurrentItems = [];
let wcCatCurrentIndex = 0;
const wcCatRadius = 300; 
const wcCatStepAngle = 30; 

// 动态获取当前 Tab 的分类
function getShopCategories() {
    if (wcShopCurrentTab === 'mall') {
        return [
            { id: 'all', label: 'ALL' },
            { id: 'daily', label: 'DAILY' },
            { id: 'fav', label: 'FAV' },
            { id: 'add', label: 'ADD' }
        ];
    } else {
        return [
            { id: 'all', label: 'ALL' },
            { id: 'snack', label: 'SNACK' },
            { id: 'fav', label: 'FAV' },
            { id: 'add', label: 'ADD' }
        ];
    }
}

// 覆盖原有的 wcSwitchShopTab，让外卖也支持轨道
function wcSwitchShopTab(tab) {
    wcShopCurrentTab = tab; // 更新当前大 Tab 状态
    
    document.querySelectorAll('.shop-tab, .shop-cap-tab').forEach(el => el.classList.remove('active'));
    const activeTab = document.getElementById(`shop-tab-${tab}`) || document.getElementById(`cap-tab-${tab}`);
    if (activeTab) activeTab.classList.add('active');
    
    document.querySelectorAll('.shop-list').forEach(el => el.style.display = 'none');
    const activeList = document.getElementById(`shop-list-${tab}`);
    if (activeList) activeList.style.display = 'flex'; // 保持 flex 布局
    
    // 无论是商城还是外卖，都显示星际轨道
    document.querySelector('.orbit-category-container').style.display = 'flex';
    
    // 切换大 Tab 时，重置轨道到 ALL 分类
    wcCatCurrentIndex = 0;
    wcRenderCatOrbit();
}

function wcRenderCatOrbit() {
    const wheel = document.getElementById('wc-cat-orbit-wheel');
    if (!wheel) return;
    wheel.innerHTML = '';
    
    const categories = getShopCategories();
    categories.forEach((cat, i) => {
        const angleDeg = i * wcCatStepAngle;
        const angleRad = (angleDeg - 90) * (Math.PI / 180);
        const x = wcCatRadius * Math.cos(angleRad);
        const y = wcCatRadius * Math.sin(angleRad);

        const node = document.createElement('div');
        node.className = `orbit-node ${i === wcCatCurrentIndex ? 'active' : ''}`;
        node.style.transform = `translate(${x}px, ${y}px)`;
        
        node.innerHTML = `
            <div class="orbit-node-content" id="wc-cat-content-${i}">
                <div class="orbit-dot"></div>
                <div class="orbit-label">${cat.label}</div>
            </div>
        `;
        node.onclick = () => {
            wcCatCurrentIndex = i;
            wcUpdateCatOrbit();
        };
        wheel.appendChild(node);
    });
    wcUpdateCatOrbit();
}

function wcUpdateCatOrbit() {
    const wheel = document.getElementById('wc-cat-orbit-wheel');
    if (!wheel) return;
    const rotation = -wcCatCurrentIndex * wcCatStepAngle;
    wheel.style.transform = `rotate(${rotation}deg)`;

    const categories = getShopCategories();
    categories.forEach((_, i) => {
        const content = document.getElementById(`wc-cat-content-${i}`);
        if (content) {
            content.style.transform = `rotate(${-rotation}deg) ${i === wcCatCurrentIndex ? 'scale(1.2)' : 'scale(1)'}`;
        }
        const node = wheel.children[i];
        if (node) {
            if (i === wcCatCurrentIndex) node.classList.add('active');
            else node.classList.remove('active');
        }
    });

    // 动态过滤数据 (严格隔离前8个和后7个)
    const catId = categories[wcCatCurrentIndex].id;
    const allItems = wcState.shopData[wcShopCurrentTab] || [];
    
    if (catId === 'add') {
        // 仅显示手动添加的商品
        wcShopCurrentItems = allItems.filter(item => item.isManual);
    } else if (catId === 'all') {
        // 显示所有商品
        wcShopCurrentItems = [...allItems];
    } else if (catId === 'daily' || catId === 'snack') {
        // 显示前半部分 AI 生成的商品 (前8个)
        const aiItems = allItems.filter(item => !item.isManual);
        wcShopCurrentItems = aiItems.slice(0, 8);
    } else if (catId === 'fav') {
        // 显示后半部分 AI 生成的商品 (后7个)
        const aiItems = allItems.filter(item => !item.isManual);
        wcShopCurrentItems = aiItems.slice(8, 15);
    }
    
    // 渲染当前 Tab 的商品列表
    wcRenderShopItems(wcShopCurrentTab, catId === 'add');
}

// 分类轨道滑动事件
let wcCatStartX = 0;
let wcCatIsDragging = false;
window.wcCatTouchStart = function(e) { wcCatStartX = e.touches[0].clientX; wcCatIsDragging = true; };
window.wcCatTouchMove = function(e) { if (wcCatIsDragging && e.cancelable) e.preventDefault(); };
window.wcCatTouchEnd = function(e) {
    if (!wcCatIsDragging) return;
    wcCatIsDragging = false;
    const diff = e.changedTouches[0].clientX - wcCatStartX;
    const categories = getShopCategories();
    if (diff > 40 && wcCatCurrentIndex > 0) {
        wcCatCurrentIndex--; wcUpdateCatOrbit();
    } else if (diff < -40 && wcCatCurrentIndex < categories.length - 1) {
        wcCatCurrentIndex++; wcUpdateCatOrbit();
    }
};

// ==========================================
// 商品列表渲染与添加/编辑/删除逻辑
// ==========================================
function wcRenderShopItems(tab, isAddMode = false) {
    const container = document.getElementById(`shop-list-${tab}`);
    if (!container) return;
    container.innerHTML = '';
    
    const items = wcShopCurrentItems;

    if (isAddMode) {
        // 渲染手动添加的商品（去除了卡片表面的编辑删除按钮，保持极简）
        items.forEach((item, idx) => {
            const icon = tab === 'mall' ? '🔮' : '🍱';
            const card = document.createElement('div');
            card.className = 'ins-shop-card manual-card';
            card.innerHTML = `
                <div class="ins-shop-card-icon">${icon}</div>
                <div class="ins-shop-card-name">${item.name}</div>
                <div class="ins-shop-card-price">¥${parseFloat(item.price).toFixed(2)}</div>
            `;
            card.onclick = () => wcOpenTarotModal(tab, idx);
            container.appendChild(card);
        });

        // 渲染添加按钮卡片 (换成了高级的 SVG 加号)
        const addCard = document.createElement('div');
        addCard.className = 'ins-shop-card add-card';
        addCard.onclick = () => {
            document.getElementById('wc-add-modal-title').innerText = `添加新${tab === 'mall' ? '商品' : '外卖'}`;
            document.getElementById('wc-add-id').value = '';
            document.getElementById('wc-add-name').value = '';
            document.getElementById('wc-add-desc').value = '';
            document.getElementById('wc-add-price').value = '';
            document.getElementById('wc-add-product-modal').classList.add('active');
        };
        addCard.innerHTML = `
            <div class="ins-shop-card-icon">
                <svg viewBox="0 0 24 24" style="width:24px;height:24px;fill:none;stroke:currentColor;stroke-width:1.5;"><path d="M12 5v14M5 12h14"/></svg>
            </div>
            <div class="ins-shop-card-name">添加新${tab === 'mall' ? '商品' : '外卖'}</div>
        `;
        container.appendChild(addCard);
        return;
    }

    if (items.length === 0) {
        container.innerHTML = '<div style="text-align: center; color: #999; margin: 50px auto; width: 100%;">空空如也</div>';
        return;
    }

    items.forEach((item, idx) => {
        const icon = tab === 'mall' ? '🔮' : '🍱';
        const card = document.createElement('div');
        card.className = 'ins-shop-card';
        card.onclick = () => wcOpenTarotModal(tab, idx);
        card.innerHTML = `
            <div class="ins-shop-card-icon">${icon}</div>
            <div class="ins-shop-card-name">${item.name}</div>
            <div class="ins-shop-card-price">¥${parseFloat(item.price).toFixed(2)}</div>
        `;
        container.appendChild(card);
    });
}

window.wcSaveNewProduct = function() {
    const idField = document.getElementById('wc-add-id').value;
    const name = document.getElementById('wc-add-name').value.trim();
    const desc = document.getElementById('wc-add-desc').value.trim();
    const price = document.getElementById('wc-add-price').value.trim();
    
    if (!name || !price) return alert("请填写名称和价格");

    if (!wcState.shopData[wcShopCurrentTab]) wcState.shopData[wcShopCurrentTab] = [];
    
    if (idField) {
        // 编辑模式
        const item = wcState.shopData[wcShopCurrentTab].find(i => i.id === idField);
        if (item) {
            item.name = name;
            item.desc = desc;
            item.price = parseFloat(price).toFixed(2);
        }
    } else {
        // 新增模式
        wcState.shopData[wcShopCurrentTab].push({
            id: 'manual_' + Date.now(),
            isManual: true, // 标记为手动添加
            name: name,
            desc: desc || '神秘的未知物品',
            price: parseFloat(price).toFixed(2)
        });
    }
    
    wcSaveData();
    
    document.getElementById('wc-add-product-modal').classList.remove('active');
    wcUpdateCatOrbit(); // 刷新当前视图
    alert(idField ? "修改成功！" : "添加成功！");
};

window.wcDeleteProduct = function(tab, id) {
    if (confirm("确定要删除这个商品吗？")) {
        wcState.shopData[tab] = wcState.shopData[tab].filter(i => i.id !== id);
        wcSaveData();
        wcUpdateCatOrbit(); // 刷新当前视图
    }
};

window.wcEditProduct = function(tab, id) {
    const item = wcState.shopData[tab].find(i => i.id === id);
    if (!item) return;
    document.getElementById('wc-add-modal-title').innerText = "编辑商品";
    document.getElementById('wc-add-id').value = item.id;
    document.getElementById('wc-add-name').value = item.name;
    document.getElementById('wc-add-desc').value = item.desc;
    document.getElementById('wc-add-price').value = item.price;
    document.getElementById('wc-add-product-modal').classList.add('active');
};


// ==========================================
// 塔罗牌弹窗与星际轨道逻辑
// ==========================================
let wcTarotCurrentTab = 'mall';
let wcTarotCurrentIdx = 0;
const wcTarotRadius = 200;
const wcTarotStepAngle = 25;

window.wcOpenTarotModal = function(tab, idx) {
    wcTarotCurrentTab = tab;
    wcTarotCurrentIdx = idx;
    wcRenderTarotCards(tab);
    wcRenderTarotOrbit(tab);
    wcUpdateTarotTransforms();
    const modal = document.getElementById('wc-tarot-modal');
    modal.style.display = 'flex'; // 👈 核心修复：先显示容器，彻底解决阻挡点击的Bug
    setTimeout(() => modal.classList.add('active'), 10);
};

window.wcCloseTarotModal = function() {
    const modal = document.getElementById('wc-tarot-modal');
    modal.classList.remove('active');
    setTimeout(() => modal.style.display = 'none', 400); // 👈 核心修复：动画结束后彻底隐藏容器
};

window.wcRenderTarotCards = function(tab) {
    const slider = document.getElementById('wc-tarot-slider');
    slider.innerHTML = '';
    const items = tab === 'mall' ? wcShopCurrentItems : (wcState.shopData[tab] || []);
    
    items.forEach((item, index) => {
        const icon = tab === 'mall' ? '🔮' : '🌙';
        const card = document.createElement('div');
        card.className = 'tarot-card';
        card.id = `tarot-card-${index}`;
        
        const displayId = String(index + 1).padStart(2, '0');
        
        // 👇 判断是否为手动添加的商品，如果是，注入高级 SVG 编辑/删除按钮
        let manageActionsHtml = '';
        if (item.isManual) {
            manageActionsHtml = `
                <div class="tarot-manage-actions">
                    <div class="tarot-action-btn edit" onclick="event.stopPropagation(); wcEditProduct('${tab}', '${item.id}'); wcCloseTarotModal();" title="编辑">
                        <svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                    </div>
                    <div class="tarot-action-btn delete" onclick="event.stopPropagation(); wcDeleteProduct('${tab}', '${item.id}'); wcCloseTarotModal();" title="删除">
                        <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                    </div>
                </div>
            `;
        }
        
        card.innerHTML = `
            <div class="tarot-header">
                <span class="tarot-tag">NO.${displayId}</span>
                <span class="tarot-close" onclick="wcCloseTarotModal()">×</span>
            </div>
            ${manageActionsHtml}
            <div class="tarot-icon">${icon}</div>
            <div class="tarot-title">${item.name}</div>
            <div class="tarot-desc">${item.desc}</div>
            <div class="tarot-price">¥${parseFloat(item.price).toFixed(2)}</div>
            <button class="tarot-btn" onclick="wcAddToCartFromTarot('${tab}', ${index})">ADD TO CART</button>
        `;
        slider.appendChild(card);
    });
};

window.wcRenderTarotOrbit = function(tab) {
    const wheel = document.getElementById('wc-tarot-orbit-wheel');
    if (!wheel) return;
    wheel.innerHTML = '';
    const items = tab === 'mall' ? wcShopCurrentItems : (wcState.shopData[tab] || []);
    
    items.forEach((_, i) => {
        const angleDeg = i * wcTarotStepAngle;
        const angleRad = (angleDeg - 90) * (Math.PI / 180);
        const x = wcTarotRadius * Math.cos(angleRad);
        const y = wcTarotRadius * Math.sin(angleRad);

        const node = document.createElement('div');
        node.className = `tarot-orbit-node ${i === wcTarotCurrentIdx ? 'active' : ''}`;
        node.style.transform = `translate(${x}px, ${y}px)`;
        node.innerHTML = `<div class="tarot-orbit-dot"></div>`;
        node.onclick = () => {
            wcTarotCurrentIdx = i;
            wcUpdateTarotTransforms();
        };
        wheel.appendChild(node);
    });
};

window.wcUpdateTarotTransforms = function() {
    // 👈 增加父级限制，防止误伤恋人空间里的同名卡片导致索引错位
    const cards = document.querySelectorAll('#wc-tarot-slider .tarot-card');
    cards.forEach((card, index) => {
        const offset = index - wcTarotCurrentIdx;
        if (offset === 0) {
            card.style.transform = `translateX(0) scale(1) translateZ(0)`;
            card.style.zIndex = 10; card.style.opacity = 1; card.style.pointerEvents = 'auto';
        } else if (offset < 0) {
            card.style.transform = `translateX(${offset * 120}px) scale(0.85) rotateY(15deg) translateZ(-100px)`;
            card.style.zIndex = 5 + offset; card.style.opacity = 1 - Math.abs(offset) * 0.4; card.style.pointerEvents = 'none';
        } else {
            card.style.transform = `translateX(${offset * 120}px) scale(0.85) rotateY(-15deg) translateZ(-100px)`;
            card.style.zIndex = 5 - offset; card.style.opacity = 1 - Math.abs(offset) * 0.4; card.style.pointerEvents = 'none';
        }
    });

    const wheel = document.getElementById('wc-tarot-orbit-wheel');
    if (wheel) {
        const rotation = -wcTarotCurrentIdx * wcTarotStepAngle;
        wheel.style.transform = `rotate(${rotation}deg)`;
        Array.from(wheel.children).forEach((node, i) => {
            if (i === wcTarotCurrentIdx) node.classList.add('active');
            else node.classList.remove('active');
        });
    }
};

let wcTarotStartX = 0;
let wcTarotIsDragging = false;
window.wcTarotTouchStart = function(e) { wcTarotStartX = e.touches[0].clientX; wcTarotIsDragging = true; };
window.wcTarotTouchMove = function(e) { if (wcTarotIsDragging && e.cancelable) e.preventDefault(); };
window.wcTarotTouchEnd = function(e) {
    if (!wcTarotIsDragging) return;
    wcTarotIsDragging = false;
    const diff = e.changedTouches[0].clientX - wcTarotStartX;
    const items = wcTarotCurrentTab === 'mall' ? wcShopCurrentItems : (wcState.shopData[wcTarotCurrentTab] || []);

    if (diff > 40 && wcTarotCurrentIdx > 0) {
        wcTarotCurrentIdx--; wcUpdateTarotTransforms();
    } else if (diff < -40 && wcTarotCurrentIdx < items.length - 1) {
        wcTarotCurrentIdx++; wcUpdateTarotTransforms();
    }
};

window.wcAddToCartFromTarot = function(tab, idx) {
    // 找到真实的商品数据
    const items = tab === 'mall' ? wcShopCurrentItems : (wcState.shopData[tab] || []);
    const item = items[idx];
    if (!item) return;
    
    if (!wcState.shopData.cart) wcState.shopData.cart = [];
    wcState.shopData.cart.push({ ...item, id: Date.now() + Math.random() });
    wcSaveData();
    wcUpdateCartBadge();
    
    wcCloseTarotModal();
    alert("已化作星光落入购物车");
};

function wcAddToCart(tab, idx) {
    const item = wcState.shopData[tab][idx];
    if (!item) return;
    
    if (!wcState.shopData.cart) wcState.shopData.cart = [];
    wcState.shopData.cart.push({ ...item, id: Date.now() + Math.random() });
    wcSaveData();
    wcUpdateCartBadge();
    
    // 简单的加入购物车动画提示
    const badge = document.getElementById('shop-cart-badge');
    badge.style.transform = 'scale(1.5)';
    setTimeout(() => badge.style.transform = 'scale(1)', 200);
}

function wcUpdateCartBadge() {
    const badge = document.getElementById('shop-cart-badge');
    const count = wcState.shopData.cart ? wcState.shopData.cart.length : 0;
    badge.innerText = count;
    badge.style.display = count > 0 ? 'flex' : 'none';
}

function wcOpenCartModal() {
    wcRenderCart();
    wcOpenModal('wc-modal-shop-cart');
}

function wcRenderCart() {
    const container = document.getElementById('shop-cart-list');
    const cart = wcState.shopData.cart || [];
    
    if (cart.length === 0) {
        container.innerHTML = '<div style="text-align: center; color: #999; margin-top: 50px;">购物车是空的</div>';
        document.getElementById('shop-cart-total').innerText = '¥0.00';
        return;
    }

    let html = '';
    let total = 0;
    cart.forEach((item, idx) => {
        total += parseFloat(item.price);
        html += `
            <div class="cart-item">
                <div class="cart-item-info">
                    <div class="cart-item-title">${item.name}</div>
                    <div class="cart-item-price">¥${parseFloat(item.price).toFixed(2)}</div>
                </div>
                <div class="cart-item-remove" onclick="wcRemoveFromCart(${idx})">×</div>
            </div>
        `;
    });
    container.innerHTML = html;
    document.getElementById('shop-cart-total').innerText = `¥${total.toFixed(2)}`;
}

function wcRemoveFromCart(idx) {
    wcState.shopData.cart.splice(idx, 1);
    wcSaveData();
    wcUpdateCartBadge();
    wcRenderCart();
}

// --- 找到 wcCheckoutCart 函数，替换为以下内容 ---
function wcCheckoutCart() {
    const cart = wcState.shopData.cart || [];
    if (cart.length === 0) return alert("购物车是空的");

    // 计算总价并更新到新的结算卡片上
    let total = 0;
    cart.forEach(item => {
        total += parseFloat(item.price);
    });
    document.getElementById('checkout-card-total').innerText = `¥${total.toFixed(2)}`;

    // 打开新的卡片式结算弹窗
    wcOpenModal('wc-modal-shop-checkout-card');
}


// --- 找到 wcOpenDeliveryTypeModal 函数，替换为以下内容 ---
function wcOpenDeliveryTypeModal(method) {
    // 存储支付方式（赠送或代付）
    wcState.tempShopTransaction = { method: method };
    // 关闭结算卡片
    wcCloseModal('wc-modal-shop-checkout-card');
    // 打开新的配送方式卡片
    wcOpenModal('wc-modal-delivery-card');
}


// --- 找到 wcProceedToPay 函数，替换为以下内容 ---
function wcProceedToPay(deliveryType) {
    // 关闭配送方式卡片
    wcCloseModal('wc-modal-delivery-card');
    if (!wcState.tempShopTransaction) return;

    if (deliveryType === 'now') {
        // 如果是立即配送，直接进入支付/发送流程
        wcPayAndSend(wcState.tempShopTransaction.method, '立即配送');
    } else if (deliveryType === 'reserve') {
        // 如果是预约，打开时间选择器
        wcOpenTimePickerModal();
    }
}


// --- 在脚本中任意位置（建议放在购物逻辑附近）新增以下三个函数 ---

/**
 * 新增：打开时间选择器弹窗
 */
function wcOpenTimePickerModal() {
    // 清空之前可能输入的值
    const customTimeInput = document.getElementById('custom-time-input');
    if (customTimeInput) {
        customTimeInput.value = '';
    }
    wcOpenModal('wc-modal-time-picker');
}

/**
 * 新增：处理时间选择并继续流程
 * @param {string} timeOption - 'now', 'tomorrow_am', 'tomorrow_pm', 或 'custom'
 */
function wcSetDeliveryTime(timeOption) {
    let deliveryTimeText = '';
    const now = new Date();

    switch (timeOption) {
        case 'now':
            deliveryTimeText = '立即配送';
            break;
        case 'tomorrow_am':
            now.setDate(now.getDate() + 1);
            now.setHours(10, 0, 0, 0);
            deliveryTimeText = `预约: ${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} 10:00`;
            break;
        case 'tomorrow_pm':
            now.setDate(now.getDate() + 1);
            now.setHours(15, 0, 0, 0);
            deliveryTimeText = `预约: ${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} 15:00`;
            break;
        case 'custom':
            const customTime = document.getElementById('custom-time-input').value;
            if (!customTime) {
                alert('请选择一个自定义时间！');
                return;
            }
            const selectedDate = new Date(customTime);
            if (selectedDate < new Date()) {
                alert('预约时间不能早于当前时间！');
                return;
            }
            deliveryTimeText = `预约: ${customTime.replace('T', ' ')}`;
            break;
    }

    // 关闭时间选择器
    wcCloseModal('wc-modal-time-picker');

    // 继续支付/发送流程
    if (wcState.tempShopTransaction) {
        wcPayAndSend(wcState.tempShopTransaction.method, deliveryTimeText);
    }
}

function wcPayAndSend(method, deliveryText) {
    const cart = wcState.shopData.cart || [];
    if (cart.length === 0) return;

    let total = 0;
    let itemNames = [];
    const receiptItems = [];
    
    cart.forEach(item => {
        total += parseFloat(item.price);
        itemNames.push(item.name);
        receiptItems.push({ name: item.name, price: parseFloat(item.price).toFixed(2) });
    });

    const itemsStr = itemNames.join('、');

    // 构造基础小票数据
    const receiptData = {
        logo: method === 'gift' ? "LUXURY ORDER" : "PAYMENT REQUEST",
        date: new Date().toLocaleString('zh-CN'),
        items: receiptItems,
        total: total.toFixed(2),
        msg: "" // 稍后由用户输入填充
    };

    if (method === 'gift') {
        wcOpenGeneralInput(`支付 ¥${total.toFixed(2)} (输入支付密码)`, (pass) => {
            if (pass !== wcState.wallet.password) return alert("密码错误！");
            if (wcState.wallet.balance < total) return alert("余额不足！请先充值。");
            
            wcState.wallet.balance -= total;
            wcState.wallet.transactions.push({
                id: Date.now(), type: 'payment', amount: total,
                note: `商城购物赠送`, time: Date.now()
            });
            
            wcState.shopData.cart = [];
            wcSaveData();
            wcUpdateCartBadge();
            wcCloseModal('wc-modal-shop-cart');
            wcCloseShoppingPage();

            // 支付成功后，弹出留言输入框
            setTimeout(() => {
                wcOpenGeneralInput("给 Ta 留个言吧 (选填)", (customMsg) => {
                    receiptData.msg = customMsg || "“给你买了一点小礼物，希望你喜欢。”";
                    
                    const aiSystemMessage = `[系统内部信息(仅AI可见): 用户刚刚为你购买了以下物品：${itemsStr}。配送方式：${deliveryText}。用户的留言是：“${receiptData.msg}”。请在回复中做出反应。]`;
                    
                    wcAddMessage(wcState.activeChatId, 'system', 'system', aiSystemMessage, { hidden: true });
                    setTimeout(() => {
                        wcAddMessage(wcState.activeChatId, 'me', 'order', '购物订单', {
                            orderType: 'gift',
                            deliveryText: deliveryText,
                            receiptData: receiptData
                        });
                    }, 300);
                });
            }, 300);
            
        }, true);

    } else if (method === 'daifu') {
        wcCloseModal('wc-modal-shop-cart');
        wcCloseShoppingPage();

        // 直接弹出留言输入框
        setTimeout(() => {
            wcOpenGeneralInput("输入代付留言 (选填)", (customMsg) => {
                receiptData.msg = customMsg || "“帮我付一下这个好不好~”";
                
                const aiSystemMessage = `[系统内部信息(仅AI可见): 用户刚刚向你发送了一个代付请求，希望你帮忙支付以下物品：${itemsStr}。总价：¥${total.toFixed(2)}。配送方式：${deliveryText}。用户的留言是：“${receiptData.msg}”。请在回复中做出回应（同意付款或拒绝付款等）。]`;

                wcState.shopData.cart = [];
                wcSaveData();
                wcUpdateCartBadge();
                
                wcAddMessage(wcState.activeChatId, 'system', 'system', aiSystemMessage, { hidden: true });
                setTimeout(() => {
                    wcAddMessage(wcState.activeChatId, 'me', 'order', '代付请求', {
                        orderType: 'daifu',
                        deliveryText: deliveryText,
                        receiptData: receiptData
                    });
                }, 300);
            });
        }, 300);
    }
}
// ==========================================================================
// 新增：手机模拟器 - 购物车 (Cart) 逻辑
// ==========================================================================

function wcSwitchPhoneCartTab(tab) {
    wcState.phoneCartTab = tab;
    document.getElementById('cap-tab-cart').classList.toggle('active', tab === 'cart');
    document.getElementById('cap-tab-history').classList.toggle('active', tab === 'history');
    wcRenderPhoneCartContent();
}

function wcRenderPhoneCartContent() {
    const char = wcState.characters.find(c => c.id === wcState.editingCharId);
    const content = document.getElementById('wc-phone-cart-content');
    if (!char) return;

    const cartData = (char.phoneData && char.phoneData.cartApp) ? char.phoneData.cartApp : null;

    if (!cartData) {
        content.innerHTML = `
            <div style="height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #8E8E93; font-size: 14px; text-align: center; margin-top: 50%;">
                <svg viewBox="0 0 24 24" style="width: 48px; height: 48px; stroke: #CCC; fill: none; stroke-width: 1; margin-bottom: 15px;"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
                点击左上角「偷看购物车」<br>生成 Ta 的私密购物数据...
            </div>`;
        return;
    }

    const currentList = wcState.phoneCartTab === 'cart' ? cartData.cart : cartData.history;
    const titleText = wcState.phoneCartTab === 'cart' ? 'Shopping Cart' : 'Purchase History';
    
    let html = `<div style="font-family: 'Georgia', serif; font-size: 22px; font-weight: bold; color: #111; margin: 10px 0 20px 0; letter-spacing: -0.5px;">${titleText}</div>`;

    if (currentList && currentList.length > 0) {
        currentList.forEach((item, index) => { // <--- 注意这里加了 index
            // 随机生成一个柔和的背景色作为占位图
            const hue = Math.floor(Math.random() * 360);
            const imgBg = `hsl(${hue}, 20%, 95%)`;
            const icon = wcState.phoneCartTab === 'cart' ? '🛒' : '📦';

            // 新增：如果是购物车页面，显示买单按钮
            let actionHtml = '';
            if (wcState.phoneCartTab === 'cart') {
                actionHtml = `<div style="background: #111; color: #fff; font-size: 12px; padding: 6px 12px; border-radius: 12px; font-weight: bold; cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,0.2);" onclick="wcBuyCharCartItem(${index})">帮Ta买单</div>`;
            }

            html += `
                <div class="phone-cart-item-card">
                    <div class="phone-cart-img-box" style="background: ${imgBg};">${icon}</div>
                    <div class="phone-cart-info">
                        <div class="phone-cart-title">${item.name}</div>
                        <div class="phone-cart-desc">${item.desc}</div>
                        <div class="phone-cart-bottom">
                            <div class="phone-cart-price">¥${item.price}</div>
                            ${item.date ? `<div class="phone-cart-date">${item.date}</div>` : actionHtml}
                        </div>
                    </div>
                </div>
            `;
        });
    } else {
        html += `<div style="text-align: center; color: #999; padding: 40px 0; font-size: 13px;">空空如也</div>`;
    }

    content.innerHTML = html;
}

async function wcGeneratePhoneCart() {
    const char = wcState.characters.find(c => c.id === wcState.editingCharId);
    if (!char) return;

    const apiConfig = await getActiveApiConfig('phone');
    if (!apiConfig || !apiConfig.key) return alert("请先配置 API");

    const limit = apiConfig.limit || 50;
    if (limit > 0 && sessionApiCallCount >= limit) {
        wcShowError("已达到API调用上限");
        return;
    }
    sessionApiCallCount++;

    wcShowLoading("正在潜入 Ta 的购物车...");

    try {
        const realMsgs = wcState.chats[char.id] || [];
        const recentMsgs = realMsgs.slice(-30).map(m => `${m.sender==='me'?'User':char.name}: ${m.content}`).join('\n');
        const chatConfig = char.chatConfig || {};
        const userPersona = chatConfig.userPersona || wcState.user.persona || "无";

        // 读取关联的世界书
        let wbInfo = "";
        if (worldbookEntries.length > 0 && chatConfig.worldbookEntries && chatConfig.worldbookEntries.length > 0) {
            const linkedEntries = worldbookEntries.filter(e => chatConfig.worldbookEntries.includes(e.id.toString()));
            if (linkedEntries.length > 0) {
                wbInfo = "【世界观参考】:\n" + linkedEntries.map(e => `${e.title}: ${e.desc}`).join('\n');
            }
        }

        const lifeStatusPrompt = getLifeStatusPrompt(char); // 新增

        let prompt = `你扮演角色：${char.name}。\n`;
        prompt += `人设：${char.prompt}\n${wbInfo}\n`;
        prompt += `【用户(User)设定】：${userPersona}\n`;
        prompt += lifeStatusPrompt; 
        prompt += `【核心场景设定】：我（User）现在正在偷偷查看你（${char.name}）手机上的购物APP。\n`;
        prompt += `【最近我们的聊天记录（20-30条）】：\n${recentMsgs}\n\n`;
        
        prompt += `请基于你的人设、当前生活状态，以及我们**最近的聊天上下文**，生成你的私密购物数据。\n`;
        prompt += `【核心要求（极具活人感与强因果逻辑）】：\n`;
        prompt += `1. 【反模板化警告】：绝对禁止生成老套的“防小人”、“智商税”等固定模板商品！商品必须与今天发生的事强相关！\n`;
        prompt += `2. 购物车(cart) 5-10条：如果聊天里User说冷，你可能会加购暖宝宝；如果今天行程里你去了健身房，可能会加购蛋白粉；如果你们吵架了，可能会加购道歉礼物。必须有明确的因果关系！\n`;
        prompt += `3. 购买记录(history) 5-10条：最近已经买下的东西。同样必须映射你们最近的聊天话题或你的生活状态。\n`;
        prompt += `4. 内心OS(desc)：商品描述必须是你添加购物车时的【真实内心OS】。要体现出你买这个东西的动机（是因为User，还是因为今天遇到的某件事）。\n`;
        prompt += `【内在逻辑要求】：在生成 JSON 之前，请确保你的内部推演包含：\n`;
        prompt += `1. 仔细阅读【今日行程】和【聊天记录】，找出你目前最缺什么，或者最想给User买什么。\n`;
        prompt += `2. 构思具体的商品名称（带品牌或定语，显得真实）。\n`;
        prompt += `推演结束后，直接返回纯 JSON 对象，格式如下：\n`;
        prompt += `{
  "cart": [
    {"name": "具体的商品名称", "desc": "你加购时的真实内心OS", "price": "129.00"}
  ],
  "history": [
    {"name": "具体的商品名称", "desc": "购买原因OS", "price": "45.00", "date": "10-24"}
  ]
}\n`;

        const response = await fetch(`${apiConfig.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiConfig.key}` },
            body: JSON.stringify({
                model: apiConfig.model,
                messages: [{ role: "user", content: prompt }],
                temperature: parseFloat(apiConfig.temp) || 0.8,
                max_tokens: 4000
            })
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error?.message || `HTTP 错误: ${response.status}`);
        }
        if (!data.choices || !data.choices[0] || !data.choices[0].message) {
            throw new Error("API 返回数据异常，请检查模型名称是否正确。");
        }

        let content = data.choices[0].message.content;
        content = content.replace(/<thinking>[\s\S]*?<\/thinking>/g, '').trim();
        content = content.replace(/```json/g, '').replace(/```/g, '').trim();
        
        let cartData;
        try {
            cartData = JSON.parse(content);
        } catch (parseErr) {
            throw new Error("AI 返回的 JSON 格式错误，请重试。返回内容：" + content.substring(0, 50) + "...");
        }

        if (!char.phoneData) char.phoneData = {};
        char.phoneData.cartApp = cartData;
        wcSaveData();

        wcRenderPhoneCartContent();
        wcShowSuccess("偷看成功");

    } catch (e) {
        console.error(e);
        if (typeof showApiErrorModal === 'function') {
            showApiErrorModal(`[购物车生成失败] ${e.message}`);
        } else {
            wcShowError("生成失败");
        }
    }
}
// ==========================================================================
// 新增：帮 Char 清空购物车的支付逻辑
// ==========================================================================
function wcBuyCharCartItem(index) {
    const char = wcState.characters.find(c => c.id === wcState.editingCharId);
    if (!char || !char.phoneData || !char.phoneData.cartApp || !char.phoneData.cartApp.cart) return;

    const item = char.phoneData.cartApp.cart[index];
    if (!item) return;

    const price = parseFloat(item.price);
    if (isNaN(price)) return alert("商品价格异常，无法支付");

    // 弹出密码输入框
    wcOpenGeneralInput(`帮Ta买单 ¥${price.toFixed(2)} (输入支付密码)`, (pass) => {
        // 1. 校验密码和余额
        if (pass !== wcState.wallet.password) {
            alert("密码错误！");
            return;
        }
        if (wcState.wallet.balance < price) {
            alert("余额不足！请先在「我」-「钱包」中充值哦~");
            return;
        }

        // 2. 扣除用户钱包余额并记录账单
        wcState.wallet.balance -= price;
        wcState.wallet.transactions.push({
            id: Date.now(),
            type: 'payment',
            amount: price,
            note: `帮 ${char.name} 清空购物车: ${item.name}`,
            time: Date.now()
        });

        // 3. 将商品从 Ta 的购物车移出，放入 Ta 的购买记录中
        char.phoneData.cartApp.cart.splice(index, 1);
        if (!char.phoneData.cartApp.history) char.phoneData.cartApp.history = [];
        
        const now = new Date();
        const dateStr = `${now.getMonth() + 1}-${now.getDate()}`;
        
        char.phoneData.cartApp.history.unshift({
            name: item.name,
            desc: item.desc + " (User 偷偷买给我的🎁)",
            price: item.price,
            date: dateStr
        });

        wcSaveData();

        // 4. 刷新购物车页面 UI
        wcRenderPhoneCartContent();

        // 5. 弹出留言输入框，并发送结构化的高级卡片
        wcOpenGeneralInput("给 Ta 留个言吧 (选填)", (customMsg) => {
            const finalMsg = customMsg || "“偷偷看了你的购物车，就当是给你的小惊喜吧。”";
            
            const receiptData = {
                logo: "LUXURY ORDER",
                date: new Date().toLocaleString('zh-CN'),
                items: [{ name: item.name, price: price.toFixed(2) }],
                total: price.toFixed(2),
                msg: finalMsg
            };

            const aiSystemMessage = `[系统内部信息(仅AI可见): 用户偷偷查看了你的手机购物车，并花钱帮你买下了你一直想买的物品："${item.name}" (价格: ¥${price.toFixed(2)})。用户的留言是：“${finalMsg}”。请在回复中做出反应。]`;

            wcAddMessage(char.id, 'system', 'system', aiSystemMessage, { hidden: true });
            setTimeout(() => {
                wcAddMessage(char.id, 'me', 'order', '购物订单', {
                    orderType: 'gift',
                    deliveryText: '惊喜送达',
                    receiptData: receiptData
                });
            }, 300);

            alert(`支付成功！已帮 Ta 买下 ${item.name}，快去聊天界面看看 Ta 的反应吧！`);
        });
    }, true); // true 表示这是一个密码输入框
}


// ==========================================================================
// 全局补丁与覆盖 (Global Patches & Overrides)
// ==========================================================================
(function applyGlobalPatches() {
    const style = document.createElement('style');
    style.innerHTML = `
        .wc-wallet-header { padding-top: 60px !important; }
        #wc-modal-phone-settings { z-index: 20001 !important; }
        
        /* 【修复】：强制购物页面隐藏，防止破坏布局 */
        #wc-view-shopping {
            display: none !important;
        }
        #wc-view-shopping.active {
            display: flex !important;
        }
                /* 【修复】：防止朋友圈、聊天列表等被底部导航栏遮挡 */
        #wc-view-moments, #wc-view-chat, #wc-view-contacts, #wc-view-user {
            padding-bottom: 85px !important;
            box-sizing: border-box;
        }
        /* 确保长按菜单层级最高，防止被遮挡无法点击 */
        #wc-context-menu {
            z-index: 99999 !important;
        }

        body.edit-mode-active .app-item {
            animation: shake 0.3s infinite;
        }
        body.edit-mode-active .ls-widget-inner {
            animation: shake 0.3s infinite;
        }
        @keyframes shake {
            0% { transform: rotate(0deg); }
            25% { transform: rotate(1deg); }
            50% { transform: rotate(0deg); }
            75% { transform: rotate(-1deg); }
            100% { transform: rotate(0deg); }
        }
        #home-edit-bar {
            position: fixed; top: 0; left: 0; width: 100%; height: 60px;
            background: rgba(255,255,255,0.9); backdrop-filter: blur(10px);
            z-index: 9999; display: none; justify-content: space-between; align-items: center;
            padding: 0 20px; box-shadow: 0 1px 5px rgba(0,0,0,0.1);
        }
        .edit-btn {
            padding: 8px 16px; border-radius: 20px; font-size: 14px; font-weight: 600; cursor: pointer;
        }
        .edit-btn.cancel { background: #E5E5EA; color: #000; }
        .edit-btn.save { background: #007AFF; color: #fff; }
        
        /* 限制真实图片的最大尺寸 */
        .wc-bubble-img { 
            max-width: 160px !important; 
            max-height: 200px !important; 
            border-radius: 10px; 
            display: block; 
            object-fit: cover; 
            cursor: pointer;
        }
    `;
    document.head.appendChild(style);
    
    const editBar = document.createElement('div');
    editBar.id = 'home-edit-bar';
    editBar.innerHTML = `
        <div class="edit-btn cancel" onclick="cancelHomeEdit()">取消</div>
        <div style="font-weight:bold;">编辑主屏幕</div>
        <div class="edit-btn save" onclick="saveHomeEdit()">完成</div>
    `;
    document.body.appendChild(editBar);

    window.applyFont = function(url) {
        const finalUrl = url || document.getElementById('fontUrlInput').value;
        const fontStyle = document.getElementById('dynamic-font-style');
        if (finalUrl && fontStyle) {
            fontStyle.textContent = `
                @font-face { font-family: 'CustomFont'; src: url('${finalUrl}'); } 
                body, input, textarea, button, select, 
                .ls-view, #wechat-root, #wc-view-phone-sim, .wc-page, .wc-bubble, 
                .ls-feed-text, .ls-widget-note-text, .wc-system-msg-text,
                .ins-forum-root, .ins-forum-view, .ins-forum-post-text, .ins-forum-story-text,
                .ins-forum-profile-name, .ins-forum-profile-bio, .ins-forum-comment-text { 
                    font-family: 'CustomFont', sans-serif !important; 
                }
            `;
            saveThemeSettings();
        }
    };
})();
// --- 快捷进入手机的 iOS 风格通用弹窗 ---
window.wcPromptEnterPhone = function(charId, charName) {
    const char = wcState.characters.find(c => c.id === charId);
    if (char && char.isGroup) {
        alert("群聊无法查看手机哦~");
        return;
    }
    let modal = document.getElementById('wc-modal-ios-confirm');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'wc-modal-ios-confirm';
        modal.className = 'ios-alert-overlay';
        document.body.appendChild(modal);
    }
    modal.innerHTML = `
        <div class="ios-alert-box" style="width: 280px;">
            <div class="ios-alert-title">系统提示</div>
            <div class="ios-alert-message" style="padding-bottom: 15px;">是否要偷偷查看 ${charName} 的手机？</div>
            <div style="display: flex; border-top: 0.5px solid rgba(60, 60, 67, 0.29);">
                <button class="ios-alert-btn" style="flex: 1; border-right: 0.5px solid rgba(60, 60, 67, 0.29); color: #007AFF;" onclick="document.getElementById('wc-modal-ios-confirm').classList.remove('active')">取消</button>
                <button class="ios-alert-btn" style="flex: 1; font-weight: bold; color: #FF3B30;" onclick="wcConfirmEnterPhone(${charId})">确定</button>
            </div>
        </div>
    `;
    modal.classList.add('active');
};

window.wcConfirmEnterPhone = function(charId) {
    document.getElementById('wc-modal-ios-confirm').classList.remove('active');
    wcState.editingCharId = charId;
    wcOpenPhoneSim();
};

// ==========================================
// 真实浏览器后台通知与保活逻辑 (重构版)
// ==========================================

// 1. 页面交互逻辑
function openNotificationSettings() {
    updateNotifUI();
    document.getElementById('notificationSettingsModal').classList.add('open');
}

function closeNotificationSettings() {
    document.getElementById('notificationSettingsModal').classList.remove('open');
}

function updateNotifUI() {
    const notifToggle = document.getElementById('toggle-real-notif');
    const alwaysNotifToggle = document.getElementById('toggle-always-real-notif');
    const keepAliveToggle = document.getElementById('toggle-keep-alive');
    const mainStatus = document.getElementById('main-notif-status');

    if (notifToggle) notifToggle.checked = isRealNotifEnabled;
    if (alwaysNotifToggle) alwaysNotifToggle.checked = isAlwaysRealNotifEnabled;
    if (keepAliveToggle) keepAliveToggle.checked = isKeepAliveEnabled;

    if (mainStatus) {
        let statusText = '未开启';
        if (isAlwaysRealNotifEnabled) statusText = '全程开启';
        else if (isRealNotifEnabled) statusText = '后台开启';
        
        mainStatus.innerHTML = statusText + '<svg class="chevron-right" viewBox="0 0 24 24"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>';
    }
}

// 2. 通知开关逻辑
function requestNotificationPermission(callback) {
    if (!("Notification" in window)) {
        alert("宝宝，你当前的浏览器不支持系统通知哦~");
        callback(false);
    } else if (Notification.permission === "granted") {
        callback(true);
    } else if (Notification.permission !== "denied") {
        Notification.requestPermission().then(permission => {
            if (permission === "granted") {
                alert("太棒啦！真实通知已开启！");
                callback(true);
            } else {
                alert("通知权限被拒绝了，请在浏览器设置中手动允许哦。");
                callback(false);
            }
        });
    } else {
        alert("通知权限已被系统拒绝，请在浏览器或系统设置中手动打开！");
        callback(false);
    }
}

function handleNotifToggle(checkbox) {
    if (checkbox.checked) {
        requestNotificationPermission((granted) => {
            isRealNotifEnabled = granted;
            checkbox.checked = granted;
            localStorage.setItem('ios_theme_real_notif_enabled', granted);
            
            // 互斥逻辑：开启仅后台时，关闭全程
            if (granted && isAlwaysRealNotifEnabled) {
                isAlwaysRealNotifEnabled = false;
                localStorage.setItem('ios_theme_always_real_notif_enabled', false);
            }
            updateNotifUI();
        });
    } else {
        isRealNotifEnabled = false;
        localStorage.setItem('ios_theme_real_notif_enabled', false);
        updateNotifUI();
    }
}

function handleAlwaysNotifToggle(checkbox) {
    if (checkbox.checked) {
        requestNotificationPermission((granted) => {
            isAlwaysRealNotifEnabled = granted;
            checkbox.checked = granted;
            localStorage.setItem('ios_theme_always_real_notif_enabled', granted);
            
            // 互斥逻辑：开启全程时，关闭仅后台
            if (granted && isRealNotifEnabled) {
                isRealNotifEnabled = false;
                localStorage.setItem('ios_theme_real_notif_enabled', false);
            }
            updateNotifUI();
        });
    } else {
        isAlwaysRealNotifEnabled = false;
        localStorage.setItem('ios_theme_always_real_notif_enabled', false);
        updateNotifUI();
    }
}
// 3. 发送真实通知的函数 (核心修复：解决保活状态下的后台判定与通知覆盖)
function sendRealSystemNotification(title, body, iconUrl) {
    // 如果两个都没开，直接返回
    if (!isRealNotifEnabled && !isAlwaysRealNotifEnabled) return;

    let shouldSend = false;

    // 1. 如果开启了“全程真实通知”，无视前后台状态，直接发送
    if (isAlwaysRealNotifEnabled) {
        shouldSend = true;
    } 
    // 2. 如果开启了“仅后台真实通知”，则判断当前页面是否不可见
    else if (isRealNotifEnabled) {
        if (document.hidden || document.visibilityState !== 'visible') {
            shouldSend = true;
        }
    }

    if (!shouldSend) return;

    if (Notification.permission === "granted") {
        navigator.serviceWorker.ready.then(function(registration) {
            registration.showNotification(title, {
                body: body,
                icon: iconUrl || 'https://i.postimg.cc/yYrDHvG5/mmexport1766982633245.jpg',
                badge: 'https://i.postimg.cc/yYrDHvG5/mmexport1766982633245.jpg',
                vibrate: [200, 100, 200],
                // 核心修改：使用动态 tag，防止旧消息被新消息覆盖
                tag: 'msg-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
                renotify: true
            });
        });
    }
}

// 4. 后台通知测试逻辑
function testRealNotification() {
    if (!isRealNotifEnabled) {
        alert("宝宝，请先开启上方的【允许后台真实通知】开关哦~");
        return;
    }
    if (Notification.permission !== "granted") {
        alert("浏览器通知权限未授予，请检查系统设置！");
        return;
    }
    
    alert("测试已启动！\n请在 5 秒内将浏览器切换到后台，或者锁屏...");
    
    setTimeout(() => {
        if (Notification.permission === "granted") {
            navigator.serviceWorker.ready.then(function(registration) {
                registration.showNotification("后台通知测试", {
                    body: "成功啦！你能在后台收到这条消息，说明通知功能正常工作哦~",
                    icon: "https://i.postimg.cc/yYrDHvG5/mmexport1766982633245.jpg",
                    badge: "https://i.postimg.cc/yYrDHvG5/mmexport1766982633245.jpg",
                    vibrate: [200, 100, 200],
                    tag: 'honey-chat-test',
                    renotify: true
                });
            });
        }
    }, 5000);
}
// ==========================================
// 5. 网页后台保活 (防休眠) 逻辑 (强化兼容版)
// ==========================================
let isKeepAliveEnabled = false;
let keepAliveAudio = null;

function handleKeepAliveToggle() {
    const keepAliveToggle = document.getElementById('toggle-keep-alive');

    if (isKeepAliveEnabled) {
        // --- 当前是开启状态，现在需要关闭 ---
        isKeepAliveEnabled = false; // 先设置标志位，防止触发 pause 监听
        if (keepAliveAudio) {
            keepAliveAudio.pause();
        }
        console.log("后台保活已关闭。");
        updateNotifUI();
    } else {
        // --- 当前是关闭状态，现在需要开启 ---
        if (!keepAliveAudio) {
            // 【修复】：改用 Audio 对象，避免 video 标签在手机后台被系统强制暂停
            keepAliveAudio = new Audio();
            keepAliveAudio.src = "https://img.heliar.top/file/1772516513350_30min-osbvow_2.mp4";
            keepAliveAudio.loop = true;
            keepAliveAudio.volume = 0.1; // 极低音量，不打扰用户
            
            // 【核心】：监听意外暂停（如切后台被系统暂停），强制恢复播放
            keepAliveAudio.addEventListener('pause', () => {
                if (isKeepAliveEnabled) {
                    keepAliveAudio.play().catch(e => console.log("保活音频恢复失败:", e));
                }
            });
        }

        // 强制触发网络加载
        keepAliveAudio.load();

        // 尝试播放
        const playPromise = keepAliveAudio.play();

        if (playPromise !== undefined) {
            playPromise.then(() => {
                // 播放成功！
                isKeepAliveEnabled = true;
                console.log("后台保活已成功开启。");
                updateNotifUI();
            }).catch(error => {
                // 播放失败 (通常是因为网络慢或浏览器严格限制)
                console.error("后台保活开启失败:", error);
                alert("开启保活失败！音频正在缓冲或被浏览器拦截，请稍等两秒后再次点击开关。");
                
                // 重置状态和UI
                isKeepAliveEnabled = false;
                if (keepAliveToggle) {
                    keepAliveToggle.checked = false;
                }
                updateNotifUI();
            });
        }
    }
}

// 【新增】：额外增加 visibilitychange 监听，确保切后台时继续播放
document.addEventListener('visibilitychange', () => {
    if (document.hidden && isKeepAliveEnabled && keepAliveAudio) {
        keepAliveAudio.play().catch(e => console.log("切后台恢复播放失败", e));
    }
});

/* ==========================================================================
   APP 3: INS MUSIC PLAYER LOGIC (Advanced iOS Style)
   ========================================================================== */

const musicState = {
    profile: {
        name: 'Aesthetic User',
        avatar: 'https://i.postimg.cc/yYrDHvG5/mmexport1766982633245.jpg',
        bg: 'https://i.postimg.cc/kgD9CsbW/IMG-8012.jpg'
    },
    playlists: [],
    currentSong: null,
    isPlaying: false,
    playMode: 'loop', 
    currentPlaylist: [], 
    currentIndex: -1,
    lyrics: [],
    listenTogether: {
        active: false,
        charId: null,
        startTime: 0,
        timerInterval: null,
        totalListenSeconds: 0,
        sessionSongCount: 0
    },
    pendingAddSong: null
};
// 👇 就是在这里加上这一行！创造出播放器实体！
const audioPlayer = new Audio();
// --- 初始化与数据加载 ---
async function musicLoadData() {
    const data = await idb.get('ins_music_data');
    if (data) {
        if (data.profile) musicState.profile = data.profile;
        if (data.playlists) musicState.playlists = data.playlists;
        if (data.listenTogether) {
            musicState.listenTogether.active = data.listenTogether.active;
            musicState.listenTogether.charId = data.listenTogether.charId;
            musicState.listenTogether.startTime = data.listenTogether.startTime;
        }
    }
}

async function musicSaveData() {
    await idb.set('ins_music_data', {
        profile: musicState.profile,
        playlists: musicState.playlists,
        listenTogether: {
            active: musicState.listenTogether.active,
            charId: musicState.listenTogether.charId,
            startTime: musicState.listenTogether.startTime,
            totalListenSeconds: musicState.listenTogether.totalListenSeconds,
            sessionSongCount: musicState.listenTogether.sessionSongCount
        }
    });
}
// 新增：页面加载时恢复一起听歌状态
async function musicInitState() {
    await musicLoadData();
    if (musicState.listenTogether && musicState.listenTogether.active && musicState.listenTogether.charId) {
        musicStartListenTogether(musicState.listenTogether.charId, true);
    }
}
// 进度条与歌词同步
audioPlayer.addEventListener('timeupdate', () => {
    if (!audioPlayer.duration) return;
    
    // 1. 性能优化：先获取 DOM 元素，如果不存在则直接返回，避免后台播放时高频报错
    const progressFill = document.getElementById('music-progress-fill');
    const timeCurrentEl = document.getElementById('music-time-current');
    const timeTotalEl = document.getElementById('music-time-total');
    const lyricsContainer = document.getElementById('music-fp-lyrics');

    // 如果进度条元素不存在，说明播放器界面未打开或未渲染，无需更新 UI
    if (!progressFill) return;

    const current = audioPlayer.currentTime;
    const total = audioPlayer.duration;
    const percent = (current / total) * 100;
    
    progressFill.style.width = `${percent}%`;
    if (timeCurrentEl) timeCurrentEl.innerText = musicFormatTime(current);
    if (timeTotalEl) timeTotalEl.innerText = musicFormatTime(total);
    
    // 👇【新增】：同步更新音乐胶囊的进度条和时间
    const capProgressFill = document.getElementById('capsule-progress-fill');
    const capTimeCurrentEl = document.getElementById('capsule-time-current');
    const capTimeTotalEl = document.getElementById('capsule-time-total');
    
    if (capProgressFill) capProgressFill.style.width = `${percent}%`;
    if (capTimeCurrentEl) capTimeCurrentEl.innerText = musicFormatTime(current);
    if (capTimeTotalEl) capTimeTotalEl.innerText = musicFormatTime(total);
    // 👆新增结束
    // 同步更新桌面小组件进度条
    const widgetProgressFill = document.getElementById('widget-progress-fill');
    if (widgetProgressFill) widgetProgressFill.style.width = `${percent}%`;

    // 2. 同步歌词
    if (musicState.lyrics.length > 0 && lyricsContainer) {
        let activeIndex = -1;
        for (let i = 0; i < musicState.lyrics.length; i++) {
            if (current >= musicState.lyrics[i].time) {
                activeIndex = i;
            } else {
                break;
            }
        }
        
        if (activeIndex !== -1) {
            // 3. 性能优化：只在歌词行真正发生切换时，才去操作 DOM 重绘
            const lastActiveIndex = lyricsContainer.getAttribute('data-active-index');
            
            if (lastActiveIndex !== activeIndex.toString()) {
                const lines = lyricsContainer.querySelectorAll('.ins-music-lyric-line');
                lines.forEach(l => l.classList.remove('active'));
                
                if (lines[activeIndex]) {
                    lines[activeIndex].classList.add('active');
                    
                    const player = document.getElementById('music-full-player');
                    const isLyricMode = player.classList.contains('lyric-mode');
                    
                    if (isLyricMode) {
                        // 歌词模式下：动态计算高度并居中
                        let offset = 0;
                        for (let i = 0; i < activeIndex; i++) {
                            offset += lines[i].offsetHeight;
                        }
                        const containerHeight = document.querySelector('.ins-music-fp-lyrics-container').offsetHeight;
                        offset = offset - containerHeight / 2 + lines[activeIndex].offsetHeight / 2;
                        lyricsContainer.style.transform = `translateY(-${Math.max(0, offset)}px)`;
                    } else {
                        // 唱片模式下：固定行高 30px
                        const offset = activeIndex * 30;
                        lyricsContainer.style.transform = `translateY(-${offset}px)`;
                    }
                }
                // 记录当前高亮的歌词索引
                lyricsContainer.setAttribute('data-active-index', activeIndex);
                // 【新增】：同步歌词到音乐胶囊
                const capsuleLyricEl = document.getElementById('capsule-exp-lyric');
                if (capsuleLyricEl && musicState.lyrics[activeIndex]) {
                    capsuleLyricEl.innerText = musicState.lyrics[activeIndex].text || '...';
                }               
                // 同步歌词到桌面小组件 (带智能滚动判断)
                const widgetLyricEl = document.getElementById('widget-song-lyric');
                if (widgetLyricEl && musicState.lyrics[activeIndex]) {
                    widgetLyricEl.innerText = musicState.lyrics[activeIndex].text || '...';
                    
                    // 动态判断是否需要滚动
                    const wrapper = widgetLyricEl.parentElement;
                    // 强制浏览器重绘以获取真实宽度
                    void widgetLyricEl.offsetWidth; 
                    
                    if (widgetLyricEl.scrollWidth > wrapper.clientWidth) {
                        // 如果歌词宽度大于容器宽度，计算需要滚动的距离 (负值)
                        const dist = wrapper.clientWidth - widgetLyricEl.scrollWidth;
                        widgetLyricEl.style.setProperty('--scroll-dist', `${dist}px`);
                        widgetLyricEl.classList.add('scrolling');
                    } else {
                        // 如果不够长，移除滚动类，恢复居中静止状态
                        widgetLyricEl.classList.remove('scrolling');
                        widgetLyricEl.style.transform = 'translateX(0)';
                    }
                }

            }
        }
    }
});
// 【补充代码】：监听音乐播放结束，自动播放下一首
audioPlayer.addEventListener('ended', () => {
    // 稍微延迟一下，避免频繁切换卡顿
    setTimeout(() => {
        musicPlayNext();
    }, 500);
});      
function musicFormatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
}

function musicSeek(e) {
    // 修复：使用 e.currentTarget 获取当前点击的进度条（兼容全屏和胶囊）
    const bar = e.currentTarget; 
    const rect = bar.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    
    // 修复：增加 isFinite 检查，防止 The provided double value is non-finite 报错
    if (audioPlayer && isFinite(audioPlayer.duration) && audioPlayer.duration > 0) {
        audioPlayer.currentTime = percent * audioPlayer.duration;
    }
}

// --- 初始化与数据加载 ---
async function musicLoadData() {
    const data = await idb.get('ins_music_data');
    if (data) {
        if (data.profile) musicState.profile = data.profile;
        if (data.playlists) musicState.playlists = data.playlists;
    }
}

async function musicSaveData() {
    await idb.set('ins_music_data', {
        profile: musicState.profile,
        playlists: musicState.playlists
    });
}

// --- 页面导航 ---
async function openMusicApp() {
    await musicLoadData();
    document.getElementById('musicModal').classList.add('open');
    musicSwitchTab('home');
    musicRenderHomeChars();
    musicRenderProfile();
}

function closeMusicApp() {
    document.getElementById('musicModal').classList.remove('open');
}

function musicSwitchTab(tab) {
    document.querySelectorAll('.ins-music-view').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.ins-music-tab').forEach(el => el.classList.remove('active'));
    
    document.getElementById(`music-view-${tab}`).classList.add('active');
    document.getElementById(`music-tab-${tab}`).classList.add('active');
    
    const exitBtn = document.querySelector('.ins-music-exit-btn');
    // 👇 加上这个 if 判断，防止因为删除了按钮而报错
    if (exitBtn) {
        if (tab === 'profile') {
            exitBtn.style.background = 'rgba(255,255,255,0.2)';
            exitBtn.style.color = '#FFF';
            exitBtn.style.border = 'none';
        } else {
            exitBtn.style.background = 'rgba(255,255,255,0.9)';
            exitBtn.style.color = '#111';
            exitBtn.style.border = '1px solid #F0F0F0';
        }
    }
}
// --- 主页角色渲染 ---
function musicRenderHomeChars() {
    const grid = document.getElementById('music-char-grid');
    grid.innerHTML = '';
    
    const availableChars = wcState.characters.filter(c => !c.isGroup);
    if (availableChars.length === 0) {
        grid.innerHTML = '<div style="grid-column: span 2; text-align: center; color: #888; padding: 20px;">No characters available.</div>';
        return;
    }

    availableChars.forEach(char => {
        const card = document.createElement('div');
        card.className = 'ins-music-char-card';
        card.innerHTML = `
            <img src="${char.avatar}" class="ins-music-char-img">
            <div class="ins-music-char-info">
                <div class="ins-music-char-name">${char.name}</div>
                <div class="ins-music-char-action">Invite to listen</div>
            </div>
        `;
        card.onclick = () => musicInviteChar(char);
        grid.appendChild(card);
    });
}

// --- 邀请弹窗与一起听歌逻辑 ---
let musicPendingInviteChar = null;

function musicInviteChar(char) {
    if (!musicState.currentSong) {
        alert("Please play a song first before inviting someone!");
        return;
    }
    
    musicPendingInviteChar = char;
    document.getElementById('music-invite-avatar').src = char.avatar;
    document.getElementById('music-invite-name').innerText = char.name;
    document.getElementById('music-invite-song-title').innerText = musicState.currentSong.title;
    
    wcOpenModal('music-modal-invite');
}

function musicConfirmInvite() {
    if (!musicPendingInviteChar || !musicState.currentSong) return;
    
    const char = musicPendingInviteChar;
    
    // 发送专属的音乐邀请卡片消息
    wcAddMessage(char.id, 'me', 'music_invite', '邀请听歌', {
        songId: musicState.currentSong.id,
        songTitle: musicState.currentSong.title,
        songArtist: musicState.currentSong.artist,
        songCover: musicState.currentSong.cover
    });
    
    wcCloseModal('music-modal-invite');
    showMainSystemNotification("Music", `已向 ${char.name} 发送听歌邀请，等待回复...`, char.avatar);
    
    // 【修改】：移除这里的自动开启听歌，改为等待 AI 回复
    musicPendingInviteChar = null;
}

// 聊天记录中点击卡片接受邀请
window.musicAcceptInvite = function(charId, songId, title, artist, cover) {
    openMusicApp();
    musicPlaySong(songId, title, artist, cover);
    musicStartListenTogether(charId);
    musicOpenFullPlayer();
};

// 计算两个经纬度之间的距离 (公里)
function calculateDistance(lat1, lon1, lat2, lon2) {
    if (!lat1 || !lon1 || !lat2 || !lon2) return null;
    const R = 6371; // 地球半径
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return (R * c).toFixed(2);
}

function musicStartListenTogether(charId, isResume = false) {
    const char = wcState.characters.find(c => c.id === charId);
    if (!char) return;
    
    musicState.listenTogether.active = true;
    musicState.listenTogether.charId = charId;
    
    if (!isResume) {
        musicState.listenTogether.startTime = Date.now();
        musicState.listenTogether.sessionSongCount = 1; // 初始算1首
        musicSaveData();
    }
    
    const userAvatar = (char.chatConfig && char.chatConfig.userAvatar) ? char.chatConfig.userAvatar : wcState.user.avatar;
    document.getElementById('music-fp-avatar-user').src = userAvatar;
    document.getElementById('music-fp-avatar-char').src = char.avatar;
    document.getElementById('music-fp-together').style.display = 'flex';
    
    // 尝试获取真实距离或虚拟距离
    let distanceStr = "未知距离";
    
    if (char.chatConfig && char.chatConfig.locationType === 'virtual') {
        // 如果是虚拟世界，直接读取自定义距离
        if (char.chatConfig.virtualDistance) {
            distanceStr = char.chatConfig.virtualDistance;
            // 如果用户输入的是纯数字，自动加上"公里"，否则直接显示文本（如"光年之外"）
            if (!isNaN(distanceStr)) {
                distanceStr += " 公里";
            }
        } else {
            distanceStr = "跨越次元";
        }
    } else if (char.chatConfig && char.chatConfig.locationLat && char.chatConfig.locationLon) {
        // 如果是现实世界，计算经纬度距离
        if (typeof sendLocLat !== 'undefined' && sendLocLat !== 0) {
            const dist = calculateDistance(sendLocLat, sendLocLon, char.chatConfig.locationLat, char.chatConfig.locationLon);
            if (dist) distanceStr = `${dist} 公里`;
        } else if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition((pos) => {
                const dist = calculateDistance(pos.coords.latitude, pos.coords.longitude, char.chatConfig.locationLat, char.chatConfig.locationLon);
                if (dist) distanceStr = `${dist} 公里`; // 异步获取成功后更新变量，setInterval 会自动读到新值
            }, () => {}, { timeout: 5000 });
        }
    }

    if (musicState.listenTogether.timerInterval) clearInterval(musicState.listenTogether.timerInterval);
    
    musicState.listenTogether.timerInterval = setInterval(() => {
        const currentSessionSeconds = Math.floor((Date.now() - musicState.listenTogether.startTime) / 1000);
        const totalSeconds = (musicState.listenTogether.totalListenSeconds || 0) + currentSessionSeconds;
        
        const totalHours = Math.floor(totalSeconds / 3600);
        const totalMins = Math.floor((totalSeconds % 3600) / 60);
        
        const metaEl = document.getElementById('music-fp-meta');
        if (metaEl) {
            metaEl.innerText = `相距 ${distanceStr}，一起听了 ${totalHours} 小时 ${totalMins} 分钟`;
        }

        const m = Math.floor(currentSessionSeconds / 60).toString().padStart(2, '0');
        const s = (currentSessionSeconds % 60).toString().padStart(2, '0');
        const capsuleTimerEl = document.getElementById('capsule-timer'); 
        if (capsuleTimerEl) capsuleTimerEl.innerText = `${m}:${s}`;
    }, 1000);
}


// 【新增】：手动结束一起听歌
window.musicStopListenTogether = function() {
    if (confirm("要结束和 Ta 的一起听歌吗？")) {
        const charId = musicState.listenTogether.charId;
        
        // 1. 计算本次时长并累加到总时长
        const sessionDurationMs = Date.now() - musicState.listenTogether.startTime;
        const sessionSeconds = Math.floor(sessionDurationMs / 1000);
        musicState.listenTogether.totalListenSeconds = (musicState.listenTogether.totalListenSeconds || 0) + sessionSeconds;
        
        // 2. 构造总结数据
        const summaryData = {
            startTime: musicState.listenTogether.startTime,
            endTime: Date.now(),
            durationMs: sessionDurationMs,
            songCount: musicState.listenTogether.sessionSongCount || 1
        };

        // 3. 找到聊天记录中最近的一条 music_invite，将其状态改为 ended 并附上数据
        if (charId && wcState.chats[charId]) {
            const msgs = wcState.chats[charId];
            for (let i = msgs.length - 1; i >= 0; i--) {
                if (msgs[i].type === 'music_invite' && msgs[i].status !== 'ended') {
                    msgs[i].status = 'ended';
                    msgs[i].summaryData = summaryData;
                    break;
                }
            }
            wcAddMessage(charId, 'system', 'system', `[系统内部信息(仅AI可见): 用户结束了和你的“一起听歌”。]`, { hidden: true });       
        }

        // 4. 清理状态
        musicState.listenTogether.active = false;
        musicState.listenTogether.charId = null;
        musicState.listenTogether.sessionSongCount = 0;
        clearInterval(musicState.listenTogether.timerInterval);
        document.getElementById('music-fp-together').style.display = 'none';
        
        const capsuleTimerEl = document.getElementById('capsule-timer');
        if (capsuleTimerEl) capsuleTimerEl.innerText = "00:00";      
        
        musicSaveData();
        wcSaveData();
        if (charId === wcState.activeChatId) wcRenderMessages(charId); // 刷新聊天界面卡片
        
        alert("已结束一起听歌。聊天界面的卡片已生成听歌报告。");
    }
};


// --- 搜索功能 ---
function musicOpenSearch() {
    document.getElementById('music-search-overlay').classList.add('active');
    document.getElementById('music-search-input').focus();
}

function musicCloseSearch() {
    document.getElementById('music-search-overlay').classList.remove('active');
}

function musicHandleSearchEnter(e) {
    if (e.key === 'Enter') musicPerformSearch();
}

async function musicPerformSearch() {
    const kw = document.getElementById('music-search-input').value.trim();
    if (!kw) return;

    const resultsContainer = document.getElementById('music-search-results');
    resultsContainer.innerHTML = '<div class="wc-ios-spinner" style="margin: 50px auto;"></div>';

    try {
        const res = await fetch(`https://zm.armoe.cn/cloudsearch?keywords=${encodeURIComponent(kw)}`);
        const data = await res.json();
        
        if (data.code === 200 && data.result && data.result.songs) {
            musicState.currentPlaylist = data.result.songs.map(song => ({
                id: song.id,
                title: song.name,
                artist: song.ar.map(a => a.name).join(', '),
                cover: song.al.picUrl + '?param=100y100'
            }));
            musicRenderSearchResults(musicState.currentPlaylist);
        } else {
            resultsContainer.innerHTML = '<div class="ins-music-empty-state">No results found.</div>';
        }
    } catch (e) {
        resultsContainer.innerHTML = '<div class="ins-music-empty-state">Search failed.</div>';
    }
}

function musicRenderSearchResults(songs) {
    const container = document.getElementById('music-search-results');
    container.innerHTML = '';
    
    songs.forEach((song, index) => {
        const item = document.createElement('div');
        item.className = 'ins-music-song-item';
        item.innerHTML = `
            <img src="${song.cover}" class="ins-music-song-cover" onclick="musicPlayFromSearch(${index})">
            <div class="ins-music-song-info" onclick="musicPlayFromSearch(${index})">
                <div class="ins-music-song-title">${song.title}</div>
                <div class="ins-music-song-artist">${song.artist}</div>
            </div>
            <div class="ins-music-btn-icon" style="background: transparent; border: 1px solid #E5E5EA; color: #111;" onclick="musicOpenAddToPlaylistFromSearch(${index})">
                <svg viewBox="0 0 24 24"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
            </div>
        `;
        container.appendChild(item);
    });
    
    const spacer = document.createElement('div');
    spacer.className = 'ins-music-bottom-spacer';
    container.appendChild(spacer);
}

// 新增辅助函数：从搜索列表播放
window.musicPlayFromSearch = function(index) {
    musicState.currentIndex = index;
    const song = musicState.currentPlaylist[index];
    musicPlaySong(song.id, song.title, song.artist, song.cover);
};

// 新增辅助函数：从搜索列表添加到歌单
window.musicOpenAddToPlaylistFromSearch = function(index) {
    const song = musicState.currentPlaylist[index];
    musicOpenAddToPlaylist(song);
};

async function musicPlaySong(id, title, artist, cover) {
    try {
        // 1. 获取播放链接
        const res = await fetch(`https://api.qijieya.cn/meting/?server=netease&type=song&id=${id}`);
        const data = await res.json();
        
        if (data && data.length > 0 && data[0].url) {
            let songUrl = data[0].url;
            
            // 修复：强制将 http 转换为 https，防止浏览器拦截混合内容
            songUrl = songUrl.replace('http://', 'https://');
            
            musicState.currentSong = { id, title, artist, cover, url: songUrl };
            audioPlayer.src = songUrl;
            
            // 【核心修复】：捕获 play() 的 Promise 异常，防止 NotSupportedError 报错卡死
            audioPlayer.play().then(() => {
                musicState.isPlaying = true;
                
                // 如果正在一起听歌，增加歌曲数量
                if (musicState.listenTogether.active) {
                    musicState.listenTogether.sessionSongCount = (musicState.listenTogether.sessionSongCount || 0) + 1;
                }

                document.getElementById('music-mini-player').style.display = 'flex';
                musicUpdatePlayerUI();
                musicCloseSearch();
                
                // 2. 获取歌词
                musicFetchLyrics(id);
            }).catch(e => {
                console.error("播放失败:", e);
                alert("抱歉宝宝，这首歌可能是 VIP 专属或无版权，当前格式无法播放哦~");
                musicState.isPlaying = false;
                musicUpdatePlayerUI();
            });
            
        } else {
            alert("抱歉宝宝，这首歌无版权或需要 VIP，无法获取播放链接。");
            // 如果列表里有多首歌，才尝试播放下一首，防止死循环
            if (musicState.currentPlaylist.length > 1) {
                musicPlayNext();
            }
        }
    } catch (e) {
        console.error(e);
        alert("获取歌曲信息失败，网络异常。");
    }
}

async function musicFetchLyrics(id) {
    const lyricsContainer = document.getElementById('music-fp-lyrics');
    lyricsContainer.innerHTML = '<div class="ins-music-lyric-line">Loading lyrics...</div>';
    musicState.lyrics = [];
    
    try {
        const res = await fetch(`https://zm.armoe.cn/lyric?id=${id}`);
        const data = await res.json();
        
        if (data.lrc && data.lrc.lyric) {
            const lines = data.lrc.lyric.split('\n');
            const parsedLyrics = [];
            
            lines.forEach(line => {
                const match = line.match(/\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)/);
                if (match) {
                    const m = parseInt(match[1]);
                    const s = parseInt(match[2]);
                    const ms = parseInt(match[3]);
                    const time = m * 60 + s + ms / 1000;
                    const text = match[4].trim();
                    if (text) parsedLyrics.push({ time, text });
                }
            });
            
            musicState.lyrics = parsedLyrics;
            
            if (parsedLyrics.length > 0) {
                lyricsContainer.innerHTML = '';
                parsedLyrics.forEach(l => {
                    const div = document.createElement('div');
                    div.className = 'ins-music-lyric-line';
                    div.innerText = l.text;
                    lyricsContainer.appendChild(div);
                });
            } else {
                lyricsContainer.innerHTML = '<div class="ins-music-lyric-line">Pure Music</div>';
            }
        } else {
            lyricsContainer.innerHTML = '<div class="ins-music-lyric-line">No lyrics available</div>';
        }
    } catch (e) {
        lyricsContainer.innerHTML = '<div class="ins-music-lyric-line">Failed to load lyrics</div>';
    }
}
       
function musicPlayNext() {
    if (musicState.currentPlaylist.length === 0) return;
    if (musicState.playMode === 'random') {
        musicState.currentIndex = Math.floor(Math.random() * musicState.currentPlaylist.length);
    } else {
        musicState.currentIndex = (musicState.currentIndex + 1) % musicState.currentPlaylist.length;
    }
    const nextSong = musicState.currentPlaylist[musicState.currentIndex];
    musicPlaySong(nextSong.id, nextSong.title, nextSong.artist, nextSong.cover);
}
       
function musicPlayPrev() {
    if (musicState.currentPlaylist.length === 0) return;
    if (musicState.playMode === 'random') {
        musicState.currentIndex = Math.floor(Math.random() * musicState.currentPlaylist.length);
    } else {
        musicState.currentIndex = (musicState.currentIndex - 1 + musicState.currentPlaylist.length) % musicState.currentPlaylist.length;
    }
    const prevSong = musicState.currentPlaylist[musicState.currentIndex];
    musicPlaySong(prevSong.id, prevSong.title, prevSong.artist, prevSong.cover);
}
// --- 新增：控制音乐播放与暂停的核心逻辑 ---
function musicTogglePlay() {
    if (!musicState.currentSong) return;
    
    if (musicState.isPlaying) {
        audioPlayer.pause();
        musicState.isPlaying = false;
    } else {
        audioPlayer.play();
        musicState.isPlaying = true;
    }
    
    // 更新播放器和胶囊的 UI 状态
    musicUpdatePlayerUI();
}
function musicTogglePlayMode() {
    const modes = ['loop', 'single', 'random'];
    const currentIndex = modes.indexOf(musicState.playMode);
    musicState.playMode = modes[(currentIndex + 1) % modes.length];
    
    const modeBtn = document.getElementById('music-btn-mode');
    if (musicState.playMode === 'loop') {
        modeBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/></svg>';
    } else if (musicState.playMode === 'single') {
        modeBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4zm-4-2V9h-1l-2 1v1h1.5v4H13z"/></svg>';
    } else if (musicState.playMode === 'random') {
        modeBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z"/></svg>';
    }

    // 👇 宝宝，把下面这一行加在这个函数的最后面！
    // 它的作用是：每次切换模式后，立刻通知胶囊更新UI
    if (typeof musicUpdateCapsuleUI === 'function') musicUpdateCapsuleUI();
}

function musicOpenCurrentPlaylist() {
    const container = document.getElementById('music-current-playlist-container');
    container.innerHTML = '';
    
    if (musicState.currentPlaylist.length === 0) {
        container.innerHTML = '<div style="text-align: center; color: #888; padding: 20px;">No songs in playlist.</div>';
    } else {
        musicState.currentPlaylist.forEach((song, index) => {
            const isPlaying = index === musicState.currentIndex;
            const item = document.createElement('div');
            item.className = 'ins-music-song-item';
            item.style.borderBottom = '1px solid #F9F9F9';
            item.innerHTML = `
                <div class="ins-music-song-info">
                    <div class="ins-music-song-title" style="color: ${isPlaying ? '#111' : '#666'}; font-weight: ${isPlaying ? '700' : '500'};">${song.title}</div>
                    <div class="ins-music-song-artist">${song.artist}</div>
                </div>
                ${isPlaying ? '<svg viewBox="0 0 24 24" style="width:20px;height:20px;fill:#111;"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>' : ''}
            `;
            item.onclick = () => {
                musicState.currentIndex = index;
                musicPlaySong(song.id, song.title, song.artist, song.cover);
                wcCloseModal('music-modal-current-playlist');
            };
            container.appendChild(item);
        });
    }
        wcOpenModal('music-modal-current-playlist');
}

// 1. 安全地绑定迷你播放器的点击事件（放在全局或 window.onload 中）
document.addEventListener('DOMContentLoaded', () => {
    const miniPlayerEl = document.getElementById('music-mini-player');
    if (miniPlayerEl) {
        miniPlayerEl.addEventListener('click', (e) => {
            // 如果点击的是播放/暂停按钮，则不打开全屏
            if (e.target.closest('.ins-music-player-controls')) return;
            musicOpenFullPlayer();
        });
    }
});

// 2. 修复后的打开全屏播放器函数
function musicOpenFullPlayer() {
    if (!musicState.currentSong) return;
    const fullPlayer = document.getElementById('music-full-player');
    if (fullPlayer) {
        fullPlayer.classList.add('active');
    }
}

function musicCloseFullPlayer() {
    const fullPlayer = document.getElementById('music-full-player');
    if (fullPlayer) {
        fullPlayer.classList.remove('active');
    }
}
// 🌟 新增：切换歌词模式
function toggleLyricMode() {
    const player = document.getElementById('music-full-player');
    if (!player) return;
    
    player.classList.toggle('lyric-mode');
    
    // 延迟重新计算滚动位置，等待 CSS 动画展开
    setTimeout(() => {
        // 强制触发一次 timeupdate 来重新计算歌词位置
        if (audioPlayer && !audioPlayer.paused) {
            const event = new Event('timeupdate');
            audioPlayer.dispatchEvent(event);
        }
    }, 50);
}

function musicUpdatePlayerUI() {
    if (!musicState.currentSong) return;
    
    document.getElementById('music-player-cover').src = musicState.currentSong.cover;
    document.getElementById('music-fp-cover').src = musicState.currentSong.cover;
// 修改为：
const miniTitle = document.getElementById('music-player-title');
const miniArtist = document.getElementById('music-player-artist');
const fpTitle = document.getElementById('music-fp-title');
const fpArtist = document.getElementById('music-fp-artist');

if (miniTitle) miniTitle.innerText = musicState.currentSong.title;
if (miniArtist) miniArtist.innerText = musicState.currentSong.artist;
if (fpTitle) fpTitle.innerText = musicState.currentSong.title;
if (fpArtist) fpArtist.innerText = musicState.currentSong.artist; 
const widgetTitle = document.getElementById('widget-song-name');
if (widgetTitle) widgetTitle.innerText = musicState.currentSong.title;

    const coverEl = document.getElementById('music-player-cover');
    const fpRecordEl = document.getElementById('music-fp-record');
    const playBtn = document.getElementById('music-btn-play');
    const fpPlayBtn = document.getElementById('music-fp-btn-play');
    
    const pauseIcon = '<svg viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>';
    const playIcon = '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>';            
    
    if (musicState.isPlaying) {
        coverEl.classList.add('playing');
        fpRecordEl.classList.add('playing');
        playBtn.innerHTML = pauseIcon;
        fpPlayBtn.innerHTML = pauseIcon;
    } else {
        coverEl.classList.remove('playing');
        fpRecordEl.classList.remove('playing');
        playBtn.innerHTML = playIcon;
        fpPlayBtn.innerHTML = playIcon;
    }
    const widgetPlayBtn = document.getElementById('widget-btn-play');
    if (widgetPlayBtn) {
        widgetPlayBtn.innerHTML = musicState.isPlaying ? pauseIcon : playIcon;
    }

    // 【追加这一行】：同步更新音乐胶囊的 UI
    if (typeof musicUpdateCapsuleUI === 'function') musicUpdateCapsuleUI();
}

// --- 个人主页与歌单管理 ---
function musicRenderProfile() {
    document.getElementById('music-profile-bg').style.backgroundImage = `url('${musicState.profile.bg}')`;
    document.getElementById('music-profile-avatar').src = musicState.profile.avatar;
    document.getElementById('music-profile-name').innerText = musicState.profile.name;
    
    const list = document.getElementById('music-playlist-list');
    list.innerHTML = '';
    
    if (musicState.playlists.length === 0) {
        list.innerHTML = '<div style="text-align: center; color: #888; font-style: italic; padding: 20px;">No playlists yet.</div>';
        return;
    }
    
    musicState.playlists.forEach((pl, idx) => {
        const card = document.createElement('div');
        card.className = 'ins-music-playlist-card';
        card.innerHTML = `
            <img src="${pl.cover}" class="ins-music-playlist-cover">
            <div class="ins-music-playlist-info">
                <div class="ins-music-playlist-name">${pl.name}</div>
                <div class="ins-music-playlist-count">${pl.tracks ? pl.tracks.length : 0} tracks</div>
            </div>
            <div class="ins-music-btn-icon" style="background: transparent; border: none; color: #888;" onclick="musicDeletePlaylist(event, ${idx})">
                <svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
            </div>
        `;
        card.onclick = () => musicOpenPlaylistDetail(idx);
        list.appendChild(card);
    });
}

function musicOpenProfileEdit() {
    document.getElementById('music-edit-name').value = musicState.profile.name;
    document.getElementById('music-edit-avatar-url').value = '';
    document.getElementById('music-edit-bg-url').value = '';
    wcState.tempImage = ''; 
    wcOpenModal('music-modal-edit-profile');
}

function musicHandleFileUpload(input, type) {
    const file = input.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            if (type === 'avatar') {
                document.getElementById('music-edit-avatar-url').value = 'Local Image Selected';
                musicState.tempAvatar = e.target.result;
            } else if (type === 'bg') {
                document.getElementById('music-edit-bg-url').value = 'Local Image Selected';
                musicState.tempBg = e.target.result;
            } else if (type === 'pl-cover') {
                document.getElementById('music-create-pl-cover').value = 'Local Image Selected';
                musicState.tempPlCover = e.target.result;
            }
        };
        reader.readAsDataURL(file);
    }
}

function musicSaveProfile() {
    const name = document.getElementById('music-edit-name').value.trim();
    const avatarUrl = document.getElementById('music-edit-avatar-url').value.trim();
    const bgUrl = document.getElementById('music-edit-bg-url').value.trim();
    
    if (name) musicState.profile.name = name;
    if (avatarUrl && avatarUrl !== 'Local Image Selected') musicState.profile.avatar = avatarUrl;
    else if (musicState.tempAvatar) musicState.profile.avatar = musicState.tempAvatar;
    
    if (bgUrl && bgUrl !== 'Local Image Selected') musicState.profile.bg = bgUrl;
    else if (musicState.tempBg) musicState.profile.bg = musicState.tempBg;
    
    musicState.tempAvatar = null;
    musicState.tempBg = null;
    
    musicSaveData();
    musicRenderProfile();
    wcCloseModal('music-modal-edit-profile');
}

function musicOpenCreatePlaylist() { wcOpenModal('music-modal-playlist-options'); }

function musicCreatePlaylist() {
    const name = document.getElementById('music-create-pl-name').value.trim();
    const coverUrl = document.getElementById('music-create-pl-cover').value.trim();
    if (!name) return alert("Please enter a playlist name.");
    
    let finalCover = 'https://i.postimg.cc/yYrDHvG5/mmexport1766982633245.jpg'; 
    if (coverUrl && coverUrl !== 'Local Image Selected') finalCover = coverUrl;
    else if (musicState.tempPlCover) finalCover = musicState.tempPlCover;
    
    musicState.playlists.push({ id: Date.now(), name: name, cover: finalCover, tracks: [] });
    
    musicState.tempPlCover = null;
    musicSaveData();
    musicRenderProfile();
    wcCloseModal('music-modal-create-playlist');
}

async function musicImportPlaylist() {
    const link = document.getElementById('music-import-pl-link').value.trim();
    if (!link) return alert("Please paste a link.");
    
    const match = link.match(/id=(\d+)/);
    if (!match) return alert("Invalid NetEase Music link.");
    
    const plId = match[1];
    const btn = document.querySelector('#music-modal-import-playlist .wc-btn-primary');
    const originalText = btn.innerText;
    btn.innerText = "Importing...";
    
    try {
        // 1. 获取歌单详情
        const resDetail = await fetch(`https://zm.armoe.cn/playlist/detail?id=${plId}`);
        const dataDetail = await resDetail.json();
        
        if (dataDetail.code === 200 && dataDetail.playlist) {
            // 2. 获取歌单所有歌曲
            // 👇 就是修改下面这一行，把 limit=50 改成 limit=1000 👇
            const resTracks = await fetch(`https://zm.armoe.cn/playlist/track/all?id=${plId}&limit=1000`);
            const dataTracks = await resTracks.json();
            
            let tracks = [];
            if (dataTracks.code === 200 && dataTracks.songs) {
                tracks = dataTracks.songs.map(song => ({
                    id: song.id,
                    title: song.name,
                    artist: song.ar.map(a => a.name).join(', '),
                    cover: song.al.picUrl + '?param=100y100'
                }));
            }
            
            musicState.playlists.push({
                id: dataDetail.playlist.id,
                name: dataDetail.playlist.name,
                cover: dataDetail.playlist.coverImgUrl,
                tracks: tracks
            });
            
            musicSaveData();
            musicRenderProfile();
            wcCloseModal('music-modal-import-playlist');
            alert("Playlist imported successfully!");
        } else {
            alert("Failed to fetch playlist details.");
        }
    } catch (e) {
        alert("Network error during import.");
    } finally {
        btn.innerText = originalText;
        document.getElementById('music-import-pl-link').value = '';
    }
}

function musicDeletePlaylist(e, idx) {
    e.stopPropagation();
    if (confirm("Delete this playlist?")) {
        musicState.playlists.splice(idx, 1);
        musicSaveData();
        musicRenderProfile();
    }
}

// --- 歌单内歌曲管理 ---
function musicOpenPlaylistDetail(idx) {
    const pl = musicState.playlists[idx];
    if (!pl) return;
    
    document.getElementById('music-detail-pl-name').innerText = pl.name;
    const container = document.getElementById('music-detail-pl-tracks');
    container.innerHTML = '';
    
    if (!pl.tracks || pl.tracks.length === 0) {
        container.innerHTML = '<div style="text-align: center; color: #888; padding: 20px;">No songs in this playlist.</div>';
    } else {
        pl.tracks.forEach((song, songIdx) => {
            const item = document.createElement('div');
            item.className = 'ins-music-song-item';
            item.innerHTML = `
                <img src="${song.cover}" class="ins-music-song-cover">
                <div class="ins-music-song-info">
                    <div class="ins-music-song-title">${song.title}</div>
                    <div class="ins-music-song-artist">${song.artist}</div>
                </div>
                <div class="ins-music-btn-icon" style="background: transparent; border: none; color: #FF3B30;" onclick="musicRemoveFromPlaylist(event, ${idx}, ${songIdx})">
                    <svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                </div>
            `;
            item.onclick = () => {
                // 将当前歌单设为播放列表
                musicState.currentPlaylist = [...pl.tracks];
                musicState.currentIndex = songIdx;
                musicPlaySong(song.id, song.title, song.artist, song.cover);
            };
            container.appendChild(item);
        });
    }
    
    wcOpenModal('music-modal-playlist-detail');
}

function musicRemoveFromPlaylist(e, plIdx, songIdx) {
    e.stopPropagation();
    if (confirm("Remove this song from playlist?")) {
        musicState.playlists[plIdx].tracks.splice(songIdx, 1);
        musicSaveData();
        musicRenderProfile();
        musicOpenPlaylistDetail(plIdx); // 刷新列表
    }
}

function musicOpenAddToPlaylist(songObj = null) {
    // 如果传入了 songObj，说明是从搜索列表点的；否则默认用当前播放的歌
    const targetSong = songObj || musicState.currentSong;
    
    if (!targetSong) return alert("No song selected.");
    
    musicState.pendingAddSong = targetSong; // 暂存这首歌
    
    const container = document.getElementById('music-add-to-pl-list');
    container.innerHTML = '';
    
    if (musicState.playlists.length === 0) {
        container.innerHTML = '<div style="text-align: center; color: #888; padding: 20px;">No playlists available. Create one first.</div>';
    } else {
        musicState.playlists.forEach((pl, idx) => {
            const item = document.createElement('div');
            item.className = 'ins-music-playlist-card';
            item.style.marginBottom = '10px';
            item.innerHTML = `
                <img src="${pl.cover}" class="ins-music-playlist-cover" style="width: 40px; height: 40px;">
                <div class="ins-music-playlist-info">
                    <div class="ins-music-playlist-name" style="font-size: 14px;">${pl.name}</div>
                </div>
            `;
            item.onclick = () => musicAddSongToPlaylist(idx);
            container.appendChild(item);
        });
    }
    
    wcOpenModal('music-modal-add-to-playlist');
}

function musicAddSongToPlaylist(plIdx) {
    const pl = musicState.playlists[plIdx];
    const song = musicState.pendingAddSong; // 使用暂存的歌曲
    
    if (!song) return;
    if (!pl.tracks) pl.tracks = [];
    
    // 检查是否已存在
    if (pl.tracks.find(s => s.id === song.id)) {
        alert("Song is already in this playlist.");
    } else {
        pl.tracks.push({
            id: song.id,
            title: song.title,
            artist: song.artist,
            cover: song.cover
        });
        musicSaveData();
        musicRenderProfile();
        alert("Added to playlist!");
    }
    
    wcCloseModal('music-modal-add-to-playlist');
    musicState.pendingAddSong = null; // 清空暂存
}
// ==========================================
// 音乐播放器迷你聊天功能
// ==========================================
// 【修复】：接收事件参数 e，并阻止默认跳转行为
function musicToggleChatWindow(e) {
    // 拦截默认点击事件，防止页面闪烁跳动
    if (e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    if (!musicState.listenTogether.active || !musicState.listenTogether.charId) {
        alert("请先在发现页邀请一位角色一起听歌哦~");
        return;
    }
    const chatWin = document.getElementById('music-chat-window');
    if (chatWin.style.display === 'none' || chatWin.style.display === '') {
        chatWin.style.display = 'flex';
        musicRenderChatMessages();
    } else {
        chatWin.style.display = 'none';
    }
}

function musicRenderChatMessages() {
    const charId = musicState.listenTogether.charId;
    if (!charId) return;
    
    const container = document.getElementById('music-chat-history');
    container.innerHTML = '';
    
    const msgs = wcState.chats[charId] || [];
    const recentMsgs = msgs.slice(-20); 
    
    recentMsgs.forEach(msg => {
        if (msg.hidden || msg.type === 'system') return; 
        
        const div = document.createElement('div');
        div.className = `music-chat-msg ${msg.sender === 'me' ? 'me' : 'them'}`;
        
        // 支持渲染表情包和图片
        if (msg.type === 'sticker' || msg.type === 'image') {
            div.innerHTML = `<img src="${msg.content}" style="max-width: 120px; border-radius: 8px; display: block;">`;
            div.style.background = 'transparent';
            div.style.padding = '0';
        } else if (msg.type === 'voice') {
            div.innerText = '[语音]';
        } else if (msg.type === 'transfer') {
            div.innerText = '[转账]';
        } else if (msg.type === 'music_invite') {
            div.innerText = '[听歌邀请]';
        } else {
            div.innerText = msg.content;
        }
        
        container.appendChild(div);
    });
    
    setTimeout(() => {
        container.scrollTop = container.scrollHeight;
    }, 50);
}

function musicHandleChatEnter(e) {
    if (e.key === 'Enter') {
        e.preventDefault(); // 【关键修复】：阻止默认回车事件，防止页面刷新卡跳
        musicSendChatMessage();
    }
}

function musicSendChatMessage() {
    const input = document.getElementById('music-chat-input');
    const text = input.value.trim();
    if (!text) return;
    
    const charId = musicState.listenTogether.charId;
    if (!charId) return;
    
    wcAddMessage(charId, 'me', 'text', text);
    input.value = '';
    musicRenderChatMessages();
    
    // 删除了 musicTriggerAI(); 这样发完消息就不会自动触发AI了，必须手动点AI回复按钮
}

function musicTriggerAI() {
    const charId = musicState.listenTogether.charId;
    if (!charId) return;
    
    // 【修复】：如果已经在生成中，就不再添加 loading 提示
    if (aiGeneratingLocks[charId]) return;
    
    // 添加一个临时的“正在输入”状态
    const container = document.getElementById('music-chat-history');
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'music-chat-msg them';
    loadingDiv.id = 'music-chat-loading'; // 【修复】：加上 ID 以便后续移除
    loadingDiv.innerText = '正在输入...';
    container.appendChild(loadingDiv);
    container.scrollTop = container.scrollHeight;

    wcTriggerAI(charId);
}
// ==========================================
// 新增：AI 音乐控制支撑函数
// ==========================================

// AI 搜索歌曲逻辑 (返回结果给AI筛选)
async function musicCharSearch(charId, keyword) {
    if (!keyword) return;
    try {
        const res = await fetch(`https://zm.armoe.cn/cloudsearch?keywords=${encodeURIComponent(keyword)}`);
        const data = await res.json();
        
        if (data.code === 200 && data.result && data.result.songs && data.result.songs.length > 0) {
            const songs = data.result.songs.slice(0, 5); // 取前5首供AI选择
            let resultText = `[系统内部信息(仅AI可见): 搜索 "${keyword}" 的结果如下：\n`;
            songs.forEach((song, index) => {
                const artist = song.ar.map(a => a.name).join(', ');
                resultText += `${index + 1}. ID: ${song.id}, 歌名: ${song.name}, 歌手: ${artist}\n`;
            });
            resultText += `请仔细核对歌名和歌手，筛选出正确的版本，然后使用 {"type":"music_play_selected", "songId": 对应的ID, "songName": "歌名"} 指令来播放。]`;
            
            // 把搜索结果作为隐藏消息发给 AI
            wcAddMessage(charId, 'system', 'system', resultText, { hidden: true });
            
            // 自动触发 AI 再次思考并做出选择
            setTimeout(() => {
                wcTriggerAI(charId);
            }, 1500);
        } else {
            wcAddMessage(charId, 'system', 'system', `[系统内部信息(仅AI可见): 未找到关于 "${keyword}" 的歌曲，请换个关键词重新搜索。]`, { hidden: true });
            setTimeout(() => {
                wcTriggerAI(charId);
            }, 1500);
        }
    } catch (e) {
        console.error("AI 搜索失败", e);
        wcAddMessage(charId, 'system', 'system', `[系统内部信息(仅AI可见): 搜索失败，网络异常。]`, { hidden: true });
    }
}

// AI 播放选定歌曲逻辑
async function musicCharPlaySelected(charId, songId, songName) {

    if (!songId) return;
    try {
        const res = await fetch(`https://zm.armoe.cn/song/detail?ids=${songId}`);
        const data = await res.json();
        
        if (data.code === 200 && data.songs && data.songs.length > 0) {
            const song = data.songs[0];
            const newSong = {
                id: song.id,
                title: song.name,
                artist: song.ar.map(a => a.name).join(', '),
                cover: song.al.picUrl + '?param=100y100'
            };
            
            // 加入当前播放列表并播放
            musicState.currentPlaylist.push(newSong);
            musicState.currentIndex = musicState.currentPlaylist.length - 1;
            musicPlaySong(newSong.id, newSong.title, newSong.artist, newSong.cover);
            
            wcAddMessage(charId, 'system', 'system', `[系统提示: ${wcState.characters.find(c=>c.id===charId).name} 为你点播了《${newSong.title}》- ${newSong.artist}]`, { style: 'transparent' });
        } else {
            wcAddMessage(charId, 'system', 'system', `[系统提示: 歌曲获取失败]`, { style: 'transparent' });
        }
    } catch (e) {
        console.error("AI 播放选中歌曲失败", e);
    }
}

// AI 强制退出一起听歌 (不弹确认框)
function musicForceStopListenTogether(charId) {
    const sessionDurationMs = Date.now() - musicState.listenTogether.startTime;
    const sessionSeconds = Math.floor(sessionDurationMs / 1000);
    musicState.listenTogether.totalListenSeconds = (musicState.listenTogether.totalListenSeconds || 0) + sessionSeconds;
    
    const summaryData = {
        startTime: musicState.listenTogether.startTime,
        endTime: Date.now(),
        durationMs: sessionDurationMs,
        songCount: musicState.listenTogether.sessionSongCount || 1
    };

    if (charId && wcState.chats[charId]) {
        const msgs = wcState.chats[charId];
        for (let i = msgs.length - 1; i >= 0; i--) {
            if (msgs[i].type === 'music_invite' && msgs[i].status !== 'ended') {
                msgs[i].status = 'ended';
                msgs[i].summaryData = summaryData;
                break;
            }
        }
    }

    musicState.listenTogether.active = false;
    musicState.listenTogether.charId = null;
    musicState.listenTogether.sessionSongCount = 0;
    clearInterval(musicState.listenTogether.timerInterval);
    
    const togetherEl = document.getElementById('music-fp-together');
    if (togetherEl) togetherEl.style.display = 'none';
    
    musicSaveData();
    wcSaveData();
    if (charId === wcState.activeChatId) wcRenderMessages(charId);

    wcAddMessage(charId, 'system', 'system', `[系统提示: 对方已退出一起听歌]`, { style: 'transparent' });
}

// ==========================================
// 新增：处理 AI 主动邀请用户的弹窗逻辑
// ==========================================
let pendingCharInviteData = null;

function musicShowCharInviteModal(charId, songName) {
    const char = wcState.characters.find(c => c.id === charId);
    if (!char) return;

    pendingCharInviteData = { charId: charId, songName: songName };

    document.getElementById('char-invite-avatar').src = char.avatar;
    document.getElementById('char-invite-name').innerText = char.name;

    const songBox = document.getElementById('char-invite-song-box');
    if (songName) {
        document.getElementById('char-invite-song-name').innerText = songName;
        songBox.style.display = 'flex';
    } else {
        songBox.style.display = 'none';
    }

    const modal = document.getElementById('music-char-invite-modal');
    modal.classList.remove('hidden');
    modal.style.display = 'flex';
}

function musicRejectCharInvite() {
    const modal = document.getElementById('music-char-invite-modal');
    modal.classList.add('hidden');
    setTimeout(() => modal.style.display = 'none', 300); // 等待动画结束

    if (pendingCharInviteData) {
        const charId = pendingCharInviteData.charId;
        // 【修复】：不发送可见的文本消息，改为发送隐藏的系统提示给 AI
        wcAddMessage(charId, 'system', 'system', `[系统内部信息(仅AI可见): 用户婉拒了你的听歌邀请。]`, { hidden: true });
        wcTriggerAI(charId); // 让 AI 回应你的拒绝
        pendingCharInviteData = null;
    }
}

// 新增：后台静默搜索并播放的辅助函数
async function musicSilentSearchAndPlay(keyword) {
    if (!keyword) return false;
    try {
        const res = await fetch(`https://zm.armoe.cn/cloudsearch?keywords=${encodeURIComponent(keyword)}`);
        const data = await res.json();
        if (data.code === 200 && data.result && data.result.songs && data.result.songs.length > 0) {
            const track = data.result.songs[0];
            const newSong = {
                id: track.id,
                title: track.name,
                artist: track.ar.map(a => a.name).join(', '),
                cover: track.al.picUrl + '?param=100y100'
            };
            if (!musicState.currentPlaylist) musicState.currentPlaylist = [];
            musicState.currentPlaylist.push(newSong);
            musicState.currentIndex = musicState.currentPlaylist.length - 1;
            musicPlaySong(newSong.id, newSong.title, newSong.artist, newSong.cover);
            return true;
        }
    } catch (e) {
        console.error("静默搜索失败", e);
    }
    return false;
}

async function musicAcceptCharInvite() {
    const modal = document.getElementById('music-char-invite-modal');
    modal.classList.add('hidden');
    setTimeout(() => modal.style.display = 'none', 300);

    if (pendingCharInviteData) {
        const charId = pendingCharInviteData.charId;
        const songName = pendingCharInviteData.songName;
        
        wcAddMessage(charId, 'system', 'system', `[系统内部信息(仅AI可见): 用户接受了你的听歌邀请，你们现在正在一起听歌。]`, { hidden: true });
        
        openMusicApp();
        musicStartListenTogether(charId);
        musicOpenFullPlayer();

        let playSuccess = false;

        // 1. 第一重：尝试搜索 AI 指定的歌曲
        if (songName && songName !== '随机推荐') {
            playSuccess = await musicSilentSearchAndPlay(songName);
        }

        // 2. 第二重兜底：如果没搜到，从 Char 手机的“最近常听”歌单里随机挑一首
        if (!playSuccess) {
            const char = wcState.characters.find(c => c.id === charId);
            if (char && char.phoneData && char.phoneData.settings && char.phoneData.settings.playlist && char.phoneData.settings.playlist.length > 0) {
                const charPlaylist = char.phoneData.settings.playlist;
                const randomSong = charPlaylist[Math.floor(Math.random() * charPlaylist.length)];
                
                playSuccess = await musicSilentSearchAndPlay(`${randomSong.title} ${randomSong.artist}`);
                if (playSuccess) {
                    wcAddMessage(charId, 'system', 'system', `[系统提示: 由于之前指定的歌曲未找到，系统自动从你的常听歌单中随机播放了《${randomSong.title}》]`, { style: 'transparent' });
                }
            }
        }

        // 3. 第三重兜底：如果 Char 没歌单，从 User 的全局歌单里随机挑一首
        if (!playSuccess && musicState.playlists && musicState.playlists.length > 0) {
            const validPlaylists = musicState.playlists.filter(pl => pl.tracks && pl.tracks.length > 0);
            if (validPlaylists.length > 0) {
                const randomPl = validPlaylists[Math.floor(Math.random() * validPlaylists.length)];
                const randomSong = randomPl.tracks[Math.floor(Math.random() * randomPl.tracks.length)];
                
                musicState.currentPlaylist = [...randomPl.tracks];
                const songIdx = randomPl.tracks.findIndex(s => s.id === randomSong.id);
                musicState.currentIndex = songIdx !== -1 ? songIdx : 0;
                
                musicPlaySong(randomSong.id, randomSong.title, randomSong.artist, randomSong.cover);
                playSuccess = true;
                wcAddMessage(charId, 'system', 'system', `[系统提示: 系统自动从 User 的歌单中随机播放了《${randomSong.title}》]`, { style: 'transparent' });
            }
        }

        // 4. 终极提示：如果连 User 都没有歌单，只能提示手动点播了
        if (!playSuccess) {
            alert("抱歉宝宝，Ta 推荐的歌曲未找到，且你们都没有预设歌单。请手动搜索播放一首歌曲吧~");
        }
        
        pendingCharInviteData = null;
    }
}
// ==========================================
// 音乐胶囊 (Music Capsule) 逻辑 (完美修复版)
// ==========================================

let isCapsuleEnabled = false;
let isCapsuleExpanded = false;
let capsuleToggleLock = false; // 节流锁，防止短时间内重复触发导致闪烁

// 拖拽相关变量
let capDrag = { active: false, startX: 0, startY: 0, initialLeft: 0, initialTop: 0, moved: false, isTouch: false };

// 4. 拖拽与点击逻辑初始化
document.addEventListener('DOMContentLoaded', () => {
    const capsule = document.getElementById('floating-music-capsule');
    if (!capsule) return;

    capsule.addEventListener('mousedown', startCapsuleDrag);
    capsule.addEventListener('touchstart', startCapsuleDrag, { passive: false });
    
    // 点击外部空白处自动收起胶囊
    document.addEventListener('click', (e) => {
        if (isCapsuleExpanded && capsule && !capsule.contains(e.target)) {
            toggleMusicCapsuleExpand(); // <--- 修改这里
      
        }
    });
});

let lastCapsuleTouchEndTime = 0;

function startCapsuleDrag(e) {
    // 如果点击的是下拉播放器内部，不触发拖拽
    if (e.target.closest('#capsule-dropdown-player')) return;
    if (e.target.closest('.capsule-btn')) return;

    // 防止 touchend 触发的模拟 mousedown 导致重复执行
    if (e.type === 'mousedown' && Date.now() - lastCapsuleTouchEndTime < 500) {
        return;
    }   

    const isTouch = e.type === 'touchstart';
    const touch = isTouch ? e.touches[0] : e;
    
    capDrag.active = true;
    capDrag.moved = false;
    capDrag.startX = touch.clientX;
    capDrag.startY = touch.clientY;
    capDrag.isTouch = isTouch;
    
    const capsule = document.getElementById('floating-music-capsule');
    const rect = capsule.getBoundingClientRect();
    
    // 记录初始位置 (去除 transform 的影响，改用绝对 left/top)
    capDrag.initialLeft = rect.left;
    capDrag.initialTop = rect.top;
    
    capsule.style.transform = 'none';
    capsule.style.left = rect.left + 'px';
    capsule.style.top = rect.top + 'px';
    capsule.style.transition = 'none'; // 拖拽时取消动画，保证跟手

    // 根据事件类型，分别绑定对应的移动和结束事件
    if (isTouch) {
        document.addEventListener('touchmove', onCapsuleDrag, { passive: false });
        document.addEventListener('touchend', endCapsuleDrag);
    } else {
        document.addEventListener('mousemove', onCapsuleDrag);
        document.addEventListener('mouseup', endCapsuleDrag);
    }
}

function onCapsuleDrag(e) {
    if (!capDrag.active) return;
    
    const touch = capDrag.isTouch ? e.touches[0] : e;
    const dx = touch.clientX - capDrag.startX;
    const dy = touch.clientY - capDrag.startY;
    
    // 如果移动距离超过 5px，判定为拖拽而不是点击
// 修改为：
if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
    capDrag.moved = true;
    if (e.cancelable) { e.preventDefault(); }
}

    
    if (capDrag.moved) {
        const capsule = document.getElementById('floating-music-capsule');
        
        // 边界限制
        let newLeft = capDrag.initialLeft + dx;
        let newTop = capDrag.initialTop + dy;
        const maxLeft = window.innerWidth - capsule.offsetWidth;
        const maxTop = window.innerHeight - capsule.offsetHeight;
        
        if (newLeft < 0) newLeft = 0;
        if (newLeft > maxLeft) newLeft = maxLeft;
        if (newTop < 0) newTop = 0;
        if (newTop > maxTop) newTop = maxTop;

        capsule.style.left = newLeft + 'px';
        capsule.style.top = newTop + 'px';
    }
}
function endCapsuleDrag(e) {
    if (!capDrag.active) return;
    capDrag.active = false;
    
    // 如果是触摸事件，记录结束时间，用于拦截后续的模拟鼠标事件
    if (capDrag.isTouch) {
        lastCapsuleTouchEndTime = Date.now();
    }
    
    const capsule = document.getElementById('floating-music-capsule');
    // 恢复动画属性
    capsule.style.transition = 'width 0.4s cubic-bezier(0.25, 1, 0.5, 1), height 0.4s cubic-bezier(0.25, 1, 0.5, 1), border-radius 0.4s cubic-bezier(0.25, 1, 0.5, 1), background 0.4s ease';
    
    // 移除对应的事件监听
    if (capDrag.isTouch) {
        document.removeEventListener('touchmove', onCapsuleDrag);
        document.removeEventListener('touchend', endCapsuleDrag);
    } else {
        document.removeEventListener('mousemove', onCapsuleDrag);
        document.removeEventListener('mouseup', endCapsuleDrag);
    }

    // 如果没有移动（即纯点击），则触发展开/收起
    if (!capDrag.moved) {
        // 【核心修复】：阻止事件冒泡，防止触发 document 的 click 事件导致立即收起
        if (e.stopPropagation) e.stopPropagation();
        if (e.preventDefault) e.preventDefault();
        toggleMusicCapsuleExpand(); // <--- 修改这里
    }
}


// 5. 胶囊内部的控制按钮逻辑
function capsuleTogglePlay(e) {
    if (e) {
        e.stopPropagation();
        e.preventDefault();
    }
    musicTogglePlay(); // 复用已有的播放/暂停逻辑
}

function capsulePlayNext(e) {
    if (e) {
        e.stopPropagation();
        e.preventDefault();
    }
    musicPlayNext(); // 复用已有的下一首逻辑
}

function capsulePlayPrev(e) {
    if (e) {
        e.stopPropagation();
        e.preventDefault();
    }
    musicPlayPrev(); // 复用已有的上一首逻辑
}

// 胶囊展开/收起逻辑
function toggleMusicCapsuleExpand() {
    if (capsuleToggleLock) return;
    capsuleToggleLock = true;
    setTimeout(() => { capsuleToggleLock = false; }, 300);

    const dropdown = document.getElementById('capsule-dropdown-player');
    if (!dropdown) return;
    
    if (dropdown.classList.contains('active')) {
        // 收起
        dropdown.classList.remove('active');
        isCapsuleExpanded = false;
        setTimeout(() => {
            dropdown.classList.add('hidden');
        }, 300);
    } else {
        // 展开
        dropdown.classList.remove('hidden');
        isCapsuleExpanded = true;
        void dropdown.offsetWidth; // 强制重绘
        dropdown.classList.add('active');
    }
}

// 胶囊开关逻辑
function toggleMusicCapsule() {
    const toggle = document.getElementById('music-capsule-toggle');
    const capsule = document.getElementById('floating-music-capsule');
    
    if (!capsule || !toggle) return;

    if (toggle.classList.contains('active')) {
        // 关闭胶囊
        toggle.classList.remove('active');
        capsule.classList.add('hidden');
        isCapsuleEnabled = false;
        // 如果关闭时是展开状态，将其复原收起
        if (isCapsuleExpanded) {
            toggleMusicCapsuleExpand();
        }
    } else {
        // 开启胶囊
        if (musicState.currentSong) {
            toggle.classList.add('active');
            capsule.classList.remove('hidden');
            isCapsuleEnabled = true;
            musicUpdateCapsuleUI();
        } else {
            alert("请先播放一首歌曲");
        }
    }
}

// 更新胶囊 UI
function musicUpdateCapsuleUI() {
    const capsule = document.getElementById('floating-music-capsule');
    if (!capsule) return;
    
    if (!musicState.currentSong) {
        capsule.classList.add('hidden');
        return;
    }
    
    // 如果胶囊开关打开，则显示
    const toggle = document.getElementById('music-capsule-toggle');
    if (toggle && toggle.classList.contains('active')) {
        capsule.classList.remove('hidden');
    }
    
    // 更新收起状态
    document.getElementById('capsule-island-cover').src = musicState.currentSong.cover;
    if (musicState.isPlaying) {
        capsule.classList.remove('paused');
    } else {
        capsule.classList.add('paused');
    }
    
    // 更新一起听歌时长和头像
    const timerEl = document.getElementById('capsule-timer');
    if (musicState.listenTogether.active && musicState.listenTogether.charId) {
        timerEl.style.display = 'block';
        // 头像
        document.getElementById('capsule-exp-cover').style.display = 'none';
        document.getElementById('capsule-exp-avatars').style.display = 'flex';
        
        const char = wcState.characters.find(c => c.id === musicState.listenTogether.charId);
        const userAvatar = (char && char.chatConfig && char.chatConfig.userAvatar) ? char.chatConfig.userAvatar : wcState.user.avatar;
        document.getElementById('capsule-exp-avatar-user').src = userAvatar;
        document.getElementById('capsule-exp-avatar-char').src = char ? char.avatar : '';
    } else {
        timerEl.style.display = 'none';
        // 封面
        document.getElementById('capsule-exp-cover').style.display = 'block';
        document.getElementById('capsule-exp-avatars').style.display = 'none';
        document.getElementById('capsule-exp-cover').src = musicState.currentSong.cover;
    }    
// 修改为：
const capTitle = document.getElementById('capsule-exp-title');
const capArtist = document.getElementById('capsule-exp-artist');
if (capTitle) capTitle.innerText = musicState.currentSong.title;
if (capArtist) capArtist.innerText = musicState.currentSong.artist;
    
    const playBtn = document.getElementById('capsule-btn-play');
    const pauseIcon = '<svg viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>';
    const playIcon = '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>';
    playBtn.innerHTML = musicState.isPlaying ? pauseIcon : playIcon;
    
    // 播放模式
    const modeBtn = document.getElementById('capsule-btn-mode');
    if (musicState.playMode === 'loop') {
        modeBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/></svg>';
    } else if (musicState.playMode === 'single') {
        modeBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4zm-4-2V9h-1l-2 1v1h1.5v4H13z"/></svg>';
    } else if (musicState.playMode === 'random') {
        modeBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z"/></svg>';
    }
}
/* ==========================================================================
   梦境系统 (Dream Space) 逻辑
   ========================================================================== */

const dreamState = {
    cards: [], 
    presets: [], 
    selectedWbIds: [], 
    selectedPresetId: null, 
    currentChat: [],
    // 新增：扩展组件数据
    ext: {
        currentTab: 'css', // 当前停留的tab
        css: [], html: [], regex: [], // 储存的预设列表
        activeCssId: null, activeHtmlId: null, activeRegexId: null // 当前启用的ID
    }
};

async function dreamLoadData() {
    const data = await idb.get('dream_space_data');
    if (data) {
        if (data.cards) dreamState.cards = data.cards;
        if (data.presets) dreamState.presets = data.presets;
        if (data.selectedWbIds) dreamState.selectedWbIds = data.selectedWbIds;
        if (data.selectedPresetId) dreamState.selectedPresetId = data.selectedPresetId;
        if (data.ext) dreamState.ext = { ...dreamState.ext, ...data.ext };
    }
    applyDreamCss(); // 加载时自动应用全局 CSS
}

async function dreamSaveData() {
    await idb.set('dream_space_data', {
        cards: dreamState.cards,
        presets: dreamState.presets,
        selectedWbIds: dreamState.selectedWbIds,
        selectedPresetId: dreamState.selectedPresetId,
        ext: dreamState.ext
    });
}

// --- 页面导航 ---
async function openDreamMainPage() {
    wcCloseAllPanels(); // 关闭微信的更多面板
    await dreamLoadData();
    document.getElementById('dream-main-page').classList.add('active');
    dreamRenderCards();
}

function closeDreamMainPage() {
    document.getElementById('dream-main-page').classList.remove('active');
}

// --- 渲染主页卡片 ---
// --- 渲染主页卡片 (加入云朵注入按钮) ---
function dreamRenderCards() {
    const container = document.getElementById('dream-card-container');
    container.innerHTML = '';
    
    if (dreamState.cards.length === 0) {
        container.innerHTML = '<div class="dream-empty-state">No dreams yet.<br><span style="font-size:10px; color:#E5E5EA;">点击下方进入梦境</span></div>';
        return;
    }

    const sortedCards = [...dreamState.cards].sort((a, b) => b.time - a.time);
    
    sortedCards.forEach((card, idx) => {
        const dateStr = new Date(card.time).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
        const div = document.createElement('div');
        div.className = 'dream-card';
        div.innerHTML = `
            <div class="dream-card-cloud-btn" onclick="injectDreamToChar(${card.id})" title="将此梦境化作记忆注入给当前角色">
                <svg viewBox="0 0 24 24"><path d="M17.5 19c2.48 0 4.5-2.02 4.5-4.5 0-2.33-1.77-4.26-4.05-4.48C17.2 6.52 13.9 4 10 4 6.14 4 3 7.14 3 11c0 .17.01.34.04.5C1.3 11.83 0 13.26 0 15c0 2.21 1.79 4 4 4h13.5z"/></svg>
                <span>INJECT</span>
            </div>
            <div style="position: absolute; top: 15px; right: 15px; display: flex; gap: 12px; align-items: center; font-family: 'Courier New', monospace; font-weight: bold;">
                <div style="color: #007AFF; cursor: pointer; font-size: 12px;" onclick="dreamEditCard(${card.id})">EDIT</div>
                <div style="color: #CCC; cursor: pointer; font-size: 18px; line-height: 1;" onclick="dreamDeleteCard(${card.id})">×</div>
            </div>
            <div class="dream-card-date">${dateStr}</div>
            <div class="dream-card-text">${card.content}</div>
        `;
        container.appendChild(div);
    });
}
function dreamEditCard(id) {
    const card = dreamState.cards.find(c => c.id === id);
    if (!card) return;
    
    openIosTextEditModal("修改梦境", card.content, (newText) => {
        if (newText) {
            card.content = newText;
            dreamSaveData();
            dreamRenderCards();
        }
    });
}

// --- 醒来并总结梦境 (修复卡死 Bug) ---
async function endDreamAndSummarize() {
    if (dreamState.currentChat.length <= 1) {
        document.getElementById('dream-chat-page').classList.remove('active');
        return;
    }

    const apiConfig = await getActiveApiConfig('chat');
    if (!apiConfig || !apiConfig.key) return alert("请先配置 API");

    // 修复：使用正确的 ID 获取按钮
    const btn = document.getElementById('dream-btn-summarize');
    if (btn) btn.innerText = "总结中...";

    try {
        let chatText = dreamState.currentChat
            .filter(m => m.role === 'user' || m.role === 'assistant')
            .map(m => `${m.role === 'user' ? '我' : '梦境'}: ${m.content}`)
            .join('\n');

        let prompt = `请将以下梦境交互记录，总结成一段极具高级感、意识流、文艺且带有一丝忧郁或唯美气息的散文诗（字数100-200字）。不要出现“总结”、“梦境记录”等字眼，直接输出这段散文。\n\n【记录】：\n${chatText}`;

        const response = await fetch(`${apiConfig.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiConfig.key}` },
            body: JSON.stringify({
                model: apiConfig.model,
                messages: [{ role: "user", content: prompt }],
                temperature: 0.7,
                max_tokens: 4000
            })
        });

        const data = await response.json();
        let summary = data.choices[0].message.content;
        summary = summary.replace(/<thinking>[\s\S]*?<\/thinking>/g, '').trim();

        dreamState.cards.push({
            id: Date.now(),
            time: Date.now(),
            content: summary
        });
        await dreamSaveData();

        document.getElementById('dream-chat-page').classList.remove('active');
        dreamRenderCards();

    } catch (e) {
        alert("总结失败：" + e.message);
    } finally {
        if (btn) btn.innerText = "醒来(总结)";
    }
}

function dreamDeleteCard(id) {
    if (confirm("确定要删除这条梦境记录吗？")) {
        dreamState.cards = dreamState.cards.filter(c => c.id !== id);
        dreamSaveData();
        dreamRenderCards();
    }
}

// --- 设置弹窗 (世界书与预设) ---
function openDreamSettings() {
    document.getElementById('dream-settings-modal').classList.add('active');
    dreamRenderSettings();
}

function closeDreamSettings() {
    document.getElementById('dream-settings-modal').classList.remove('active');
}

function dreamRenderSettings() {
    // 1. 渲染世界书列表
    const wbList = document.getElementById('dream-wb-list');
    wbList.innerHTML = '';
    let dreamWbCount = 0;
    if (dreamState.selectedWbIds) {
        dreamState.selectedWbIds.forEach(id => {
            wbList.innerHTML += `<input type="checkbox" value="${id}" checked>`;
            dreamWbCount++;
        });
    }
    document.getElementById('dream-wb-count').innerText = `已选 ${dreamWbCount} 项`;

    // 2. 渲染预设列表 (带左滑删除)
    const presetList = document.getElementById('dream-preset-list');
    presetList.innerHTML = '';
    if (dreamState.presets.length > 0) {
        dreamState.presets.forEach(p => {
            const isChecked = dreamState.selectedPresetId === p.id;
            
            const wrapper = document.createElement('div');
            wrapper.className = 'dream-swipe-wrapper';
            
             wrapper.innerHTML = `
                <div class="dream-swipe-action" onclick="deleteDreamPreset(${p.id})">DELETE</div>
                <div class="dream-swipe-content" ontouchstart="dreamTouchStart(event)" ontouchmove="dreamTouchMove(event)" ontouchend="dreamTouchEnd(event)">
                    <div style="flex:1; cursor:pointer; font-family: 'Courier New', monospace; font-weight: bold;" onclick="openDreamPresetEditor(${p.id})">
                        ${p.name} <span style="color:#999; font-size:10px; font-weight: normal;">(Edit)</span>
                    </div>
                    <!-- 👇修改：改成 checkbox，并传入 this -->
                    <input type="checkbox" class="dream-checkbox" value="${p.id}" ${isChecked ? 'checked' : ''} onchange="dreamSelectPreset(${p.id}, this)">
                </div>
            `;
            presetList.appendChild(wrapper);
        });
    } else {
        presetList.innerHTML = '<div style="color:#999; font-size:12px;">暂无预设</div>';
    }
}

// --- 新增：左滑交互逻辑 ---
function addDreamSwipeLogic(element) {
    let startX = 0, currentX = 0;
    element.addEventListener('touchstart', e => { 
        startX = e.touches[0].clientX; 
    }, {passive: true});
    
    element.addEventListener('touchmove', e => {
        currentX = e.touches[0].clientX;
        let diff = currentX - startX;
        // 只允许向左滑动，最大滑动距离 70px
        if (diff < 0 && diff > -80) { 
            element.style.transform = `translateX(${diff}px)`; 
        }
    }, {passive: true});
    
    element.addEventListener('touchend', e => {
        let diff = currentX - startX;
        if (diff < -35) { 
            element.style.transform = `translateX(-70px)`; // 展开删除按钮
        } else { 
            element.style.transform = `translateX(0px)`; // 恢复原状
        }
    });

    // 点击其他地方恢复原状
    document.addEventListener('touchstart', e => {
        if (!element.contains(e.target)) {
            element.style.transform = `translateX(0px)`;
        }
    }, {passive: true});
}

function dreamToggleWb(checkbox) {
    const val = checkbox.value;
    if (checkbox.checked) {
        if (!dreamState.selectedWbIds.includes(val)) dreamState.selectedWbIds.push(val);
    } else {
        dreamState.selectedWbIds = dreamState.selectedWbIds.filter(id => id !== val);
    }
    dreamSaveData();
}

function dreamSelectPreset(id, checkbox) {
    if (checkbox.checked) {
        // 如果勾选了，记录当前选中的预设 ID
        dreamState.selectedPresetId = id;
    } else {
        // 如果取消勾选，清空预设 ID
        dreamState.selectedPresetId = null;
    }
    dreamSaveData();
    // 重新渲染列表，确保其他多余的勾选被清除（实现可取消的单选效果）
    dreamRenderSettings();
}


function addDreamPreset() {
    const name = prompt("请输入预设名称：");
    if (!name) return;
    const content = prompt("请输入预设内容（AI的系统提示词）：");
    if (!content) return;
    
    dreamState.presets.push({ id: Date.now(), name, content });
    dreamSaveData();
    dreamRenderSettings();
}

function editDreamPreset(id) {
    const preset = dreamState.presets.find(p => p.id === id);
    if (!preset) return;
    
    const newContent = prompt(`编辑预设 [${preset.name}] 的内容：`, preset.content);
    if (newContent !== null) {
        if (newContent.trim() === "") {
            if (confirm("内容为空，是否删除该预设？")) {
                dreamState.presets = dreamState.presets.filter(p => p.id !== id);
                if (dreamState.selectedPresetId === id) dreamState.selectedPresetId = null;
            }
        } else {
            preset.content = newContent;
        }
        dreamSaveData();
        dreamRenderSettings();
    }
}

// --- 梦境聊天交互 ---
function enterDreamChat() {
    dreamState.currentChat = []; // 清空上次的聊天
    document.getElementById('dream-chat-page').classList.add('active');
    dreamRenderChat();
    
    // 插入一条系统提示
    dreamState.currentChat.push({ role: 'system', content: '你闭上眼睛，坠入了梦境...' });
    dreamRenderChat();
}

function exitDreamChat() {
    if (dreamState.currentChat.length > 1) {
        if (!confirm("退出将丢失当前梦境对话，确定退出吗？(如需保存请点击右上角'醒来')")) return;
    }
    document.getElementById('dream-chat-page').classList.remove('active');
}

function dreamRenderChat() {
    const container = document.getElementById('dream-chat-history');
    container.innerHTML = '';
    
    dreamState.currentChat.forEach(msg => {
        const div = document.createElement('div');
        if (msg.role === 'user') {
            div.className = 'dream-msg me';
        } else if (msg.role === 'assistant') {
            div.className = 'dream-msg ai';
        } else {
            div.className = 'dream-msg system';
        }
        div.innerText = msg.content;
        container.appendChild(div);
    });
    
    setTimeout(() => { container.scrollTop = container.scrollHeight; }, 50);
}

function sendDreamMessage() {
    const input = document.getElementById('dream-chat-input');
    const text = input.value.trim();
    if (!text) return;
    
    dreamState.currentChat.push({ role: 'user', content: text });
    input.value = '';
    dreamRenderChat();
}

// --- 梦境 AI 逻辑 (带对话/旁白分离解析) ---
// --- 梦境 AI 逻辑 (带人设读取、动态HTML状态栏与正则解析) ---
async function triggerDreamAI() {
    if (dreamState.currentChat.length === 0) return;

    const apiConfig = await getActiveApiConfig('chat');
    if (!apiConfig || !apiConfig.key) return alert("请先在主设置中配置 API");

    // 1. 基础设定
    let systemPrompt = "你现在处于一个梦境文字交互游戏中（作为独立的小番外）。请根据用户的输入（User），推动梦境的发展。回复要充满画面感、意识流、或者诡异/唯美的梦境氛围。不要输出JSON，直接输出纯文本回复。请使用中文双引号（“”）或单引号（「」）来包裹角色说出的话。\n\n";
    
    // 2. 核心：读取当前角色和用户的人设
    const char = wcState.characters.find(c => c.id === wcState.activeChatId);
    const charName = char ? char.name : "未知角色";
    const charPersona = char ? char.prompt : "无";
    const userPersona = (char && char.chatConfig && char.chatConfig.userPersona) ? char.chatConfig.userPersona : wcState.user.persona;

    systemPrompt += `【当前角色设定 (${charName})】：\n${charPersona}\n\n`;
    systemPrompt += `【用户设定 (User)】：\n${userPersona}\n\n`;

    // 3. 读取关联的世界书
    if (dreamState.selectedWbIds.length > 0 && typeof worldbookEntries !== 'undefined') {
        const linkedWbs = worldbookEntries.filter(e => dreamState.selectedWbIds.includes(e.id.toString()));
        if (linkedWbs.length > 0) {
            systemPrompt += "【梦境背景参考 (世界书)】：\n" + linkedWbs.map(e => `${e.title}: ${e.desc}`).join('\n') + "\n\n";
        }
    }
    
    // 4. 读取梦境预设
    if (dreamState.selectedPresetId) {
        const preset = dreamState.presets.find(p => p.id === dreamState.selectedPresetId);
        if (preset) systemPrompt += "【梦境特殊规则/预设】：\n" + preset.content + "\n\n";
    }

    // 5. 核心：读取 HTML 状态栏模板，并要求 AI 动态填写
    if (dreamState.ext.activeHtmlId) {
        const activeHtml = dreamState.ext.html.find(h => h.id === dreamState.ext.activeHtmlId);
        if (activeHtml && activeHtml.content) {
            systemPrompt += `【强制指令：动态状态栏】：\n你必须在回复的最末尾，输出以下 HTML 状态栏代码，并根据当前梦境的剧情发展，更新里面的数值或状态文本（不要修改 HTML 标签结构，只修改里面的内容）。\n请务必将状态栏代码包裹在 \`\`\`html 和 \`\`\` 之间！\n\n状态栏模板如下：\n${activeHtml.content}\n\n`;
        }
    }

    // 构造消息体
    const messages = [{ role: "system", content: systemPrompt }];
    dreamState.currentChat.forEach(m => {
        if (m.role === 'user' || m.role === 'assistant') {
            // 传给 AI 的历史记录剥离掉 HTML 状态栏，防止污染 AI 的认知
            messages.push({ role: m.role, content: m.rawContent || m.content });
        }
    });

    dreamState.currentChat.push({ role: 'system', content: '梦境正在演化...' });
    dreamRenderChatWithHTML();

    try {
        const response = await fetch(`${apiConfig.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiConfig.key}` },
            body: JSON.stringify({
                model: apiConfig.model,
                messages: messages,
                temperature: parseFloat(apiConfig.temp) || 0.8
            })
        });

        const data = await response.json();
        let rawReply = data.choices[0].message.content;
        rawReply = rawReply.replace(/<thinking>[\s\S]*?<\/thinking>/g, '').trim();
        
        let finalReply = rawReply;
        let extractedHtml = "";

        // ==========================================
        // 解析 AI 动态生成的 HTML 状态栏
        // ==========================================
        const htmlMatch = finalReply.match(/```html\s*([\s\S]*?)\s*```/i);
        if (htmlMatch) {
            extractedHtml = htmlMatch[1]; // 提取出 AI 填好的 HTML
            finalReply = finalReply.replace(/```html\s*[\s\S]*?\s*```/i, '').trim(); // 从正文中删掉代码块
        } else {
            // 兜底：如果 AI 忘了加 ```html，尝试直接提取末尾的 <div>
            const divMatch = finalReply.match(/(<div[\s\S]*>[\s\S]*<\/div>)$/i);
            if (divMatch) {
                extractedHtml = divMatch[1];
                finalReply = finalReply.replace(/(<div[\s\S]*>[\s\S]*<\/div>)$/i, '').trim();
            }
        }

        // ==========================================
        // 执行正则替换 (Regex)
        // ==========================================
        if (dreamState.ext.activeRegexId) {
            const activeRegex = dreamState.ext.regex.find(r => r.id === dreamState.ext.activeRegexId);
            if (activeRegex && activeRegex.content) {
                const lines = activeRegex.content.split('\n');
                lines.forEach(line => {
                    const parts = line.split('===');
                    if (parts.length === 2) {
                        try {
                            const match = parts[0].trim().match(/^\/(.+)\/([gimuy]*)$/);
                            if (match) {
                                const regex = new RegExp(match[1], match[2]);
                                finalReply = finalReply.replace(regex, parts[1].trim());
                            } else {
                                finalReply = finalReply.split(parts[0].trim()).join(parts[1].trim());
                            }
                        } catch(e) {}
                    }
                });
            }
        }

        dreamState.currentChat.pop(); // 移除 loading
        
        // 保存记录：rawContent 存纯净文本，htmlInject 存 AI 填好的状态栏
        dreamState.currentChat.push({ 
            role: 'assistant', 
            content: finalReply, 
            rawContent: rawReply,
            htmlInject: extractedHtml 
        });
        
        dreamRenderChatWithHTML();

    } catch (e) {
        dreamState.currentChat.pop(); 
        dreamState.currentChat.push({ role: 'system', content: '梦境连接断开: ' + e.message });
        dreamRenderChatWithHTML();
    }
}
// 文本解析器：分离对话和旁白
function parseDreamTextToCards(text) {
    // 匹配中文双引号 “”、英文双引号 ""、直角引号 「」『』
    const regex = /([“"「『][^”"」』]+[”"」』])/g;
    const parts = text.split(regex);
    let html = '';
    
    parts.forEach(part => {
        if (!part) return;
        if (part.match(/^[“"「『]/)) {
            // 这是对话，用气泡包裹
            html += `<div class="dream-dialogue-bubble">${part}</div>`;
        } else {
            // 这是旁白，转换换行符
            const formatted = part.replace(/\n/g, '<br>');
            if (formatted.trim() || formatted.includes('<br>')) {
                html += `<div class="dream-narrative-text">${formatted}</div>`;
            }
        }
    });
    return html;
}

// 渲染聊天记录 (支持长按、解析和AI卡片操作)
function dreamRenderChatWithHTML() {
    const container = document.getElementById('dream-chat-history');
    container.innerHTML = '';
    
    dreamState.currentChat.forEach((msg, index) => {
        const div = document.createElement('div');
        
        if (msg.role === 'user') {
            div.className = 'dream-msg me';
            div.innerText = msg.content;
            // 绑定长按事件 (传入 'user' 类型)
            div.addEventListener('touchstart', (e) => handleDreamTouchStart(e, index), {passive: false});
            div.addEventListener('touchend', handleDreamTouchEnd);
            div.addEventListener('contextmenu', (e) => {
                showDreamContextMenu(e, index, 'user');
            });
            
        } else if (msg.role === 'assistant') {
            div.className = 'dream-msg ai';
            let innerHtml = parseDreamTextToCards(msg.content);
            
            if (msg.htmlInject) {
                innerHtml += `<div style="margin-top: 10px; border-top: 1px dashed #E5E5EA; padding-top: 10px;">${msg.htmlInject}</div>`;
            }
            
            // 新增：右下角操作按键 (传入 'ai' 类型)
            innerHtml += `
                <div class="dream-ai-action-btn" onclick="showDreamContextMenu(event, ${index}, 'ai')">
                    <svg viewBox="0 0 24 24"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>
                </div>
            `;
            div.innerHTML = innerHtml;
            
        } else {
            div.className = 'dream-msg system';
            div.innerText = msg.content;
        }
        container.appendChild(div);
    });
    
    setTimeout(() => { container.scrollTop = container.scrollHeight; }, 50);
}

// 自动调整输入框高度
document.addEventListener('DOMContentLoaded', function() {
    const dreamInput = document.getElementById('dream-chat-input');
    if (dreamInput) {
        dreamInput.addEventListener('input', function() {
            this.style.height = '44px';
            // 👉【修改】：使用 setProperty 确保优先级，防止被其他样式覆盖导致闪烁
            this.style.setProperty('height', this.scrollHeight + 'px', 'important');
        });
    }
});
// 覆盖原本的 enterDreamChat 和 sendDreamMessage，让它们调用支持 HTML 的渲染函数
function enterDreamChat() {
    dreamState.currentChat = []; 
    document.getElementById('dream-chat-page').classList.add('active');
    dreamState.currentChat.push({ role: 'system', content: '你闭上眼睛，坠入了梦境...' });
    dreamRenderChatWithHTML();
}

function sendDreamMessage() {
    const input = document.getElementById('dream-chat-input');
    const text = input.value.trim();
    if (!text) return;
    
    dreamState.currentChat.push({ role: 'user', content: text });
    input.value = '';
    dreamRenderChatWithHTML();
}

// --- 梦境预设卡片编辑与保存逻辑 ---
function openDreamPresetEditor(id = null) {
    dreamState.editingPresetId = id;
    const modal = document.getElementById('dream-preset-editor-modal');
    const nameInput = document.getElementById('dream-preset-name');
    const contentInput = document.getElementById('dream-preset-content');
    const idDisplay = document.getElementById('dream-preset-id-display');

    if (id) {
        const preset = dreamState.presets.find(p => p.id === id);
        if (preset) {
            nameInput.value = preset.name;
            contentInput.value = preset.content;
            idDisplay.innerText = id.toString().slice(-4); // 显示ID后四位作为档案号
        }
    } else {
        nameInput.value = '';
        contentInput.value = '';
        idDisplay.innerText = 'NEW';
    }
    
    modal.classList.add('active');
}

function closeDreamPresetEditor() {
    document.getElementById('dream-preset-editor-modal').classList.remove('active');
    dreamState.editingPresetId = null;
}

function saveDreamPreset() {
    const name = document.getElementById('dream-preset-name').value.trim();
    const content = document.getElementById('dream-preset-content').value.trim();
    
    if (!name || !content) {
        alert("SUBJECT 和 内容都不能为空哦。");
        return;
    }

    if (dreamState.editingPresetId) {
        // 编辑模式
        const preset = dreamState.presets.find(p => p.id === dreamState.editingPresetId);
        if (preset) {
            preset.name = name;
            preset.content = content;
        }
    } else {
        // 新增模式
        dreamState.presets.push({ id: Date.now(), name, content });
    }
    
    dreamSaveData();
    dreamRenderSettings();
    closeDreamPresetEditor();
}

function deleteDreamPreset(id) {
    if (confirm("确定要销毁这份档案(预设)吗？")) {
        dreamState.presets = dreamState.presets.filter(p => p.id !== id);
        if (dreamState.selectedPresetId === id) {
            dreamState.selectedPresetId = null; // 如果删除了正在使用的，清空选中状态
        }
        dreamSaveData();
        dreamRenderSettings();
    }
}

// --- 替换旧的 addDreamPreset，让点击“+ 添加”时调用新弹窗 ---
function addDreamPreset() {
    openDreamPresetEditor(null);
}

// --- 预设列表左滑逻辑 ---
let dreamSwipeXDown = null;
let dreamSwipeYDown = null;
let dreamCurrentSwipeElement = null;

function dreamTouchStart(evt) {
    dreamSwipeXDown = evt.touches[0].clientX;
    dreamSwipeYDown = evt.touches[0].clientY;
    dreamCurrentSwipeElement = evt.currentTarget;
}

function dreamTouchMove(evt) {
    if (!dreamSwipeXDown || !dreamSwipeYDown || !dreamCurrentSwipeElement) return;
    let xUp = evt.touches[0].clientX;
    let yUp = evt.touches[0].clientY;
    let xDiff = dreamSwipeXDown - xUp;
    let yDiff = dreamSwipeYDown - yUp;
    
    // 确保是水平滑动
    if (Math.abs(xDiff) > Math.abs(yDiff)) { 
        if (xDiff > 0) {
            // 向左滑，露出删除按钮 (宽度70px)
            dreamCurrentSwipeElement.style.transform = `translateX(-70px)`; 
        } else {
            // 向右滑，恢复原位
            dreamCurrentSwipeElement.style.transform = 'translateX(0px)'; 
        }
    }
}

function dreamTouchEnd(evt) {
    dreamSwipeXDown = null;
    dreamSwipeYDown = null;
}
// ==========================================
// 梦境扩展组件 (CSS / HTML / REGEX) 逻辑
// ==========================================

function openDreamExtModal() {
    document.getElementById('dream-ext-modal').classList.add('active');
    switchDreamExtTab(dreamState.ext.currentTab);
}

function closeDreamExtModal() {
    document.getElementById('dream-ext-modal').classList.remove('active');
}

function switchDreamExtTab(tab) {
    dreamState.ext.currentTab = tab;
    
    // UI 切换
    document.querySelectorAll('.dream-ext-tab').forEach(el => el.classList.remove('active'));
    document.querySelector(`.dream-ext-tab[onclick="switchDreamExtTab('${tab}')"]`).classList.add('active');
    
    // 清空输入框
    document.getElementById('dream-ext-name').value = '';
    document.getElementById('dream-ext-content').value = '';
    
    // 渲染列表
    renderDreamExtList();
}

// 处理文件导入
function handleDreamExtImport(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // 自动提取文件名作为预设名（去掉后缀）
    const fileName = file.name.replace(/\.[^/.]+$/, "");
    document.getElementById('dream-ext-name').value = fileName;

    const reader = new FileReader();
    reader.onload = (e) => {
        document.getElementById('dream-ext-content').value = e.target.result;
    };
    reader.readAsText(file);
    event.target.value = ''; // 清空 input
}

// 保存预设
function saveDreamExt() {
    const tab = dreamState.ext.currentTab;
    const name = document.getElementById('dream-ext-name').value.trim();
    const content = document.getElementById('dream-ext-content').value.trim();
    
    if (!name || !content) return alert("名称和内容不能为空");
    
    const newExt = { id: Date.now(), name, content };
    dreamState.ext[tab].unshift(newExt); // 插入到最前面
    
    // 自动启用刚保存的预设
    if (tab === 'css') dreamState.ext.activeCssId = newExt.id;
    if (tab === 'html') dreamState.ext.activeHtmlId = newExt.id;
    if (tab === 'regex') dreamState.ext.activeRegexId = newExt.id;
    
    dreamSaveData();
    
    if (tab === 'css') applyDreamCss(); // 如果是 CSS，立即生效
    
    document.getElementById('dream-ext-name').value = '';
    document.getElementById('dream-ext-content').value = '';
    renderDreamExtList();
}

// 渲染列表
function renderDreamExtList() {
    const tab = dreamState.ext.currentTab;
    const list = dreamState.ext[tab];
    const container = document.getElementById('dream-ext-list');
    container.innerHTML = '';
    
    if (list.length === 0) {
        container.innerHTML = '<div style="text-align:center; color:#999; font-size:12px; margin-top:20px;">暂无保存的预设</div>';
        return;
    }
    
    let activeId = null;
    if (tab === 'css') activeId = dreamState.ext.activeCssId;
    if (tab === 'html') activeId = dreamState.ext.activeHtmlId;
    if (tab === 'regex') activeId = dreamState.ext.activeRegexId;

    list.forEach(item => {
        const isActive = item.id === activeId;
        const div = document.createElement('div');
        div.className = `dream-ext-item ${isActive ? 'active' : ''}`;
        
        div.innerHTML = `
            <div class="dream-ext-item-info" onclick="toggleDreamExtActive(${item.id})">
                <div class="dream-ext-item-name">${item.name} ${isActive ? '<span style="color:#34C759; font-size:10px;">(已启用)</span>' : ''}</div>
                <div class="dream-ext-item-preview">${item.content.replace(/\n/g, ' ')}</div>
            </div>
            <div class="dream-ext-item-actions">
                <svg onclick="deleteDreamExt(${item.id})" viewBox="0 0 24 24" style="width:18px; height:18px; fill:none; stroke:#FF3B30; stroke-width:2; cursor:pointer;"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
            </div>
        `;
        container.appendChild(div);
    });
}

// 启用/取消启用
function toggleDreamExtActive(id) {
    const tab = dreamState.ext.currentTab;
    let currentActive = null;
    
    if (tab === 'css') currentActive = dreamState.ext.activeCssId;
    if (tab === 'html') currentActive = dreamState.ext.activeHtmlId;
    if (tab === 'regex') currentActive = dreamState.ext.activeRegexId;

    // 如果点击的是已经启用的，则取消启用；否则启用新的
    const newActiveId = (currentActive === id) ? null : id;

    if (tab === 'css') {
        dreamState.ext.activeCssId = newActiveId;
        applyDreamCss(); // 立即刷新 CSS
    }
    if (tab === 'html') dreamState.ext.activeHtmlId = newActiveId;
    if (tab === 'regex') dreamState.ext.activeRegexId = newActiveId;

    dreamSaveData();
    renderDreamExtList();
}

// 删除预设
function deleteDreamExt(id) {
    if (!confirm("确定删除此预设吗？")) return;
    const tab = dreamState.ext.currentTab;
    
    dreamState.ext[tab] = dreamState.ext[tab].filter(item => item.id !== id);
    
    // 如果删除的是正在启用的，清空启用状态
    if (tab === 'css' && dreamState.ext.activeCssId === id) {
        dreamState.ext.activeCssId = null;
        applyDreamCss();
    }
    if (tab === 'html' && dreamState.ext.activeHtmlId === id) dreamState.ext.activeHtmlId = null;
    if (tab === 'regex' && dreamState.ext.activeRegexId === id) dreamState.ext.activeRegexId = null;

    dreamSaveData();
    renderDreamExtList();
}

// 全局注入 CSS
function applyDreamCss() {
    let styleTag = document.getElementById('dream-custom-css-inject');
    if (!styleTag) {
        styleTag = document.createElement('style');
        styleTag.id = 'dream-custom-css-inject';
        document.head.appendChild(styleTag);
    }
    
    if (dreamState.ext.activeCssId) {
        const activeCss = dreamState.ext.css.find(c => c.id === dreamState.ext.activeCssId);
        styleTag.innerHTML = activeCss ? activeCss.content : '';
    } else {
        styleTag.innerHTML = '';
    }
}
// ==========================================
// 梦境长按菜单、编辑与重生成逻辑
// ==========================================
let dreamLongPressTimer = null;
let dreamSelectedMsgIndex = -1;

function handleDreamTouchStart(e, index) {
    dreamLongPressTimer = setTimeout(() => {
        showDreamContextMenu(e, index, 'user');
    }, 500);
}

function handleDreamTouchEnd() {
    if (dreamLongPressTimer) {
        clearTimeout(dreamLongPressTimer);
        dreamLongPressTimer = null;
    }
}

function showDreamContextMenu(e, index, type = 'user') {
    // 阻止默认事件和冒泡，防止触发全局关闭
    if (e.preventDefault) e.preventDefault();
    if (e.stopPropagation) e.stopPropagation();

    dreamSelectedMsgIndex = index;
    const menu = document.getElementById('dream-context-menu');
    
    // 动态生成菜单内容 (纯 SVG 图标)
    menu.innerHTML = '';
    if (type === 'user') {
        menu.innerHTML = `
            <div class="dream-ctx-item" onclick="editDreamMsg()">
                <svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
            </div>
            <div class="dream-ctx-item" onclick="deleteDreamMsg()">
                <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </div>
        `;
    } else if (type === 'ai') {
        menu.innerHTML = `
            <div class="dream-ctx-item" onclick="regenerateDreamMsg()">
                <svg viewBox="0 0 24 24"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>
            </div>
            <div class="dream-ctx-item" onclick="editDreamMsg()">
                <svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
            </div>
            <div class="dream-ctx-item" onclick="deleteDreamMsg()">
                <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </div>
        `;
    }

    // 获取点击位置 (兼容鼠标和触摸)
    let x = e.clientX || (e.touches && e.touches[0].clientX);
    let y = e.clientY || (e.touches && e.touches[0].clientY);

    // 估算菜单宽高 (每个 item 约 60px 宽，高度约 44px)
    const menuWidth = type === 'ai' ? 180 : 120;
    const menuHeight = 44; 
    const screenW = window.innerWidth;
    
    // 计算居中位置：X轴居中于点击点，Y轴在点击点上方
    let leftPos = x - (menuWidth / 2);
    let topPos = y - menuHeight - 20; // 距离手指上方 20px

    // 边界保护：防止超出屏幕左右
    if (leftPos < 10) leftPos = 10;
    if (leftPos + menuWidth > screenW - 10) leftPos = screenW - menuWidth - 10;

    // 边界保护：如果上方空间不够，就显示在手指下方，并翻转小三角
    if (topPos < 10) {
        topPos = y + 30;
        menu.style.setProperty('--triangle-top', '-7px');
        menu.style.setProperty('--triangle-bottom', 'auto');
        menu.style.setProperty('--triangle-rotate', '180deg');
    } else {
        // 正常显示在上方
        menu.style.setProperty('--triangle-top', '100%');
        menu.style.setProperty('--triangle-bottom', 'auto');
        menu.style.setProperty('--triangle-rotate', '0deg');
    }

    menu.style.left = leftPos + 'px';
    menu.style.top = topPos + 'px';
    menu.style.display = 'flex';
}
// ==========================================
// 新增：全局监听 - 点击任意位置隐藏梦境菜单
// ==========================================
document.addEventListener('touchstart', (e) => {
    const menu = document.getElementById('dream-context-menu');
    // 如果菜单正在显示
    if (menu && menu.style.display === 'flex') {
        // 并且点击的区域不是菜单本身
        if (!e.target.closest('#dream-context-menu')) {
            menu.style.display = 'none';
            dreamSelectedMsgIndex = -1; // 重置选中状态
        }
    }
}, { passive: true });

document.addEventListener('mousedown', (e) => {
    const menu = document.getElementById('dream-context-menu');
    if (menu && menu.style.display === 'flex') {
        if (!e.target.closest('#dream-context-menu')) {
            menu.style.display = 'none';
            dreamSelectedMsgIndex = -1;
        }
    }
});

// 重新生成 AI 回复
function regenerateDreamMsg() {
    if (dreamSelectedMsgIndex > -1) {
        const isLastMsg = dreamSelectedMsgIndex === dreamState.currentChat.length - 1;
        
        if (!isLastMsg) {
            if (!confirm("重生成此条消息，将会删除它之后的所有对话记录，确定要继续吗？")) {
                document.getElementById('dream-context-menu').style.display = 'none';
                return;
            }
        }

        // 截断数组：保留到这条 AI 消息之前的所有内容（即删除这条 AI 消息及之后的所有消息）
        dreamState.currentChat = dreamState.currentChat.slice(0, dreamSelectedMsgIndex);
        dreamRenderChatWithHTML();
        document.getElementById('dream-context-menu').style.display = 'none';
        
        // 重新触发 AI
        triggerDreamAI();
    }
}

function deleteDreamMsg() {
    if (dreamSelectedMsgIndex > -1) {
        if (confirm("确定删除这条记录吗？")) {
            dreamState.currentChat.splice(dreamSelectedMsgIndex, 1);
            dreamRenderChatWithHTML();
        }
    }
    document.getElementById('dream-context-menu').style.display = 'none';
}

function editDreamMsg() {
    if (dreamSelectedMsgIndex > -1) {
        const msg = dreamState.currentChat[dreamSelectedMsgIndex];
        document.getElementById('dream-edit-textarea').value = msg.content;
        document.getElementById('dream-edit-modal').classList.add('active');
    }
    document.getElementById('dream-context-menu').style.display = 'none';
}

function closeDreamEditModal() {
    document.getElementById('dream-edit-modal').classList.remove('active');
    dreamSelectedMsgIndex = -1;
}

function saveDreamEditMsg() {
    const newText = document.getElementById('dream-edit-textarea').value.trim();
    if (newText && dreamSelectedMsgIndex > -1) {
        dreamState.currentChat[dreamSelectedMsgIndex].content = newText;
        dreamState.currentChat[dreamSelectedMsgIndex].rawContent = newText; // 同步更新
        dreamRenderChatWithHTML();
    }
    closeDreamEditModal();
}
// --- 将梦境作为潜意识注入给角色 ---
function injectDreamToChar(cardId) {
    const charId = wcState.activeChatId;
    
    if (!charId) {
        alert("请先在微信主界面进入一个角色的聊天框，然后再打开梦境进行注入哦！");
        return;
    }

    const char = wcState.characters.find(c => c.id === charId);
    if (!char) return;

    const card = dreamState.cards.find(c => c.id === cardId);
    if (!card) return;

    if (!char.memories) char.memories = [];
    
    // 查重：防止重复注入同一个梦境
    const isAlreadyInjected = char.memories.some(m => m.content.includes(card.content.substring(0, 20)));
    if (isAlreadyInjected) {
        if (!confirm("这个梦境似乎已经注入过了，确定要重复注入吗？")) return;
    }

    // 包装成潜意识记忆
    const memoryText = `[梦境残影/潜意识] 我最近做了一个无比真实的梦，梦里的情景挥之不去，它可能会影响我现在的潜意识和情绪：${card.content}`;

    char.memories.unshift({
        id: Date.now(),
        type: 'manual', // 存入角色的记忆库
        content: memoryText,
        time: Date.now()
    });

    wcSaveData();
    alert(`成功！\n已将该梦境化作潜意识，植入到 ${char.name} 的记忆中。`);
}

// --- 系统更新日志数据 ---
const systemUpdateLogs = [
   {
        version: "小元机 03.22",
        date: "2026.03.22",
        title: "欢迎来到小元机^这里是小元。",
        content: [
            "1.依旧爆改了几个UI页面",
            "2.增加了API额度查询和token计算，这个API额度查询有一些站子会出现查询不了显示充足的情况（显示充足就是没有查询到）",          
            "3.增加了主副API，可以选择一些板块使用副API，如果没有开启副API，默认使用主API，并且我修了一些小问题嗯嗯对",
            "不接受许愿和点菜，我也不在审核群和小红书群，有问题可以前往我的小红书@小元元元"
        ],
        notes: [
            "更新后若遇到界面显示异常，请尝试清除浏览器缓存。",
            "请妥善保管您的数据，建议定期在设置中进行备份。",
            "一机一码，禁止二传二贩"
        ]
    },
   {
        version: "小元机 03.20",
        date: "2026.03.20",
        title: "欢迎来到小元机^这里是小元。",
        content: [
            "1.APP4论坛功能更新，还在完善，感觉差不多了",
            "2.爆改了桌面和几个页面的UI嗯嗯对",            
            "3.增加了语音通话",
            "不想写更新日志，具体可以看我小红书@小元元元，可以去我评论区许愿，然后：我鸟都不鸟你"
        ],
        notes: [
            "更新后若遇到界面显示异常，请尝试清除浏览器缓存。",
            "请妥善保管您的数据，建议定期在设置中进行备份。",
            "一机一码，禁止二传二贩"
        ]
    },
    {
        version: "小元机 03.16",
        date: "2026.03.16",
        title: "欢迎来到小元机^这里是小元。",
        content: [
            "1.音乐无法搜索已修复orz",
            "2.APP4论坛还未完善，不用点击浪费额度！！我还在完善论坛！！",
            "最后非常感谢喜欢小元机的宝宝，我没有跑路！也不会跑路的！一直在更新TvT",
            "感谢支持，感谢喜欢，过几天打算爆改UI，，，"
        ],
        notes: [
            "更新后若遇到界面显示异常，请尝试清除浏览器缓存。",
            "请妥善保管您的数据，建议定期在设置中进行备份。",
            "一机一码，禁止二传二贩"
        ]
    },

    {
        version: "小元机 03.13",
        date: "2026.03.13",
        title: "欢迎来到小元机^这里是小元。",
        content: [
            "非常非常抱歉！orz滑跪，报错bug已修复",
            "1. 新增微信群聊功能。支持拉入多个角色一起聊天。（因为我没玩过群聊，一直是一个char，所以可能做的不太好）",
            "2. 情侣空间新增未来信件（时空信箱）功能。可以互相写信。嗯嗯对",
            "3. 有问题请多多反馈啦orz"
        ],
        notes: [
            "更新后若遇到界面显示异常，请尝试清除浏览器缓存。",
            "请妥善保管您的数据，建议定期在设置中进行备份。",
            "一机一码，禁止二传二贩"
        ]
    },

    {
        version: "小元机 03.12",
        date: "2026.03.12",
        title: "欢迎来到小元机^这里是小元。",
        content: [
            "1.增加了双语翻译模式（可以自定义翻译和被翻译的语言，你甚至可以把中文翻译成英文。英文翻译成日语。）",
            "2.情侣空间新增默契大挑战。",
            "3.强化了输出格式防止掉格式，以及修复了一点小问题。"
        ],
        notes: [
            "请妥善保管您的数据，建议定期在设置中进行备份。",
            "一机一码，禁止二传二贩"
        ]
    },
    {
        version: "小元机 03.10",
        date: "2026.03.10",
        title: "小元机更新",
        content: [
            "这里是小元，本次更新在设置中更新日志中放置了一个教程，不会的宝宝建议先去看看教程啦^^", 
            "1. 朋友圈ui爆改，增加了朋友圈日历系统（可以查看对应日期的朋友圈）点击头像查看全部朋友圈，默认查看今日朋友圈，增加了纪念日等等。",
            "2. 新增消息提示音，和全程真实系统通知和后台真实通知",
            "3. 修复导入歌单只能导入50首的问题。"        
        ],
        notes: [
            "请妥善保管您的数据，建议定期在设置中进行备份。",
            "一机一码，禁止二传二贩"
        ]
    },
    {
        version: "小元机 03.09",
        date: "2026.03.09",
        title: "欢迎来到小元机^",
        content: [
            "这里是小元，非常抱歉，我拼尽全力还是无法适配iOS的底部白边，再加上本人是安卓手机，怎么改也看不到效果TvT",
            "1. 完善了查手机，新增cart购物车和购买记录（可以帮char买单），新增查看char歌单（在setting页面），点击可以直接播放，一起听歌时char也会知道你播放的是char的歌！",
            "2. 新增查手机内容可以分享char和收藏（喜欢的内容可以收藏）",
            "3. 新增拉黑功能（拉黑char后，点击ai回复键，char会以弹窗的形式发消息，消息内容储存在会话页面的小角色卡，嗯对，我新改的ui）"
        ],
        notes: [
            "小教程：1. 聊天设置页面里面char和用户头像之间的心跳线是可以点击的！！！里面是更多设置功能",
            "2. 想要备份可以前往设置页面的AppleID里面（点击进入页面！！在里面备份！！）",
            "更新后若遇到界面显示异常，请尝试清除浏览器缓存。",
            "请妥善保管您的数据，建议定期在设置中进行备份。",
            "一机一码，禁止二传二贩"
        ]
    },
    {
        version: "小元机",
        date: "2026.03.07",
        title: "欢迎来到小元机^",
        content: [
            "这里是小元，如有问题请多多反馈。",
            "优化了char搜索歌曲模式（音乐的个人页面的五角星是音乐胶囊迷你音乐播放器！）",
            "梦境支持html状态栏和正则式（我也不知道正则式能干什么）"
        ],
        notes: [
            "更新后若遇到界面显示异常，请尝试清除浏览器缓存。",
            "请妥善保管您的数据，建议定期在设置中进行备份。",
            "一机一码，禁止二传二贩"
        ]
    },
];
const CURRENT_VERSION = systemUpdateLogs[0].version;

// --- 系统更新弹窗逻辑 ---
function checkSystemUpdate() {
    const lastVersion = localStorage.getItem('ios_theme_last_version');
    if (lastVersion !== CURRENT_VERSION) {
        showSystemUpdatePopup();
    }
}

function showSystemUpdatePopup() {
    const popup = document.getElementById('system-update-popup');
    if (!popup) return;
    const latestLog = systemUpdateLogs[0];
    
    document.getElementById('sys-update-version-text').innerText = `VERSION ${latestLog.version.replace('v', '')}`;
    document.getElementById('sys-update-title-text').innerText = latestLog.title;
    
    const contentList = document.getElementById('sys-update-content-list');
    contentList.innerHTML = latestLog.content.map(item => `<li>${item}</li>`).join('');
    
    const notesList = document.getElementById('sys-update-notes-list');
    notesList.innerHTML = latestLog.notes.map(item => `<li>${item}</li>`).join('');
    
    popup.classList.remove('hidden');
    requestAnimationFrame(() => {
        popup.classList.add('active');
    });
}

function closeSystemUpdatePopup() {
    const popup = document.getElementById('system-update-popup');
    popup.classList.remove('active');
    setTimeout(() => {
        popup.classList.add('hidden');
    }, 300);
    localStorage.setItem('ios_theme_last_version', CURRENT_VERSION);
}

// --- 更新日志设置页逻辑 ---
function openUpdateLogSettings() {
    document.getElementById('updateLogSettingsModal').classList.add('open');
    renderUpdateLogs();
}

function closeUpdateLogSettings() {
    document.getElementById('updateLogSettingsModal').classList.remove('open');
}

function renderUpdateLogs() {
    const container = document.getElementById('updateLogContainer');
    container.innerHTML = '';
    
    // --- 新增：固定在最顶部的实用指南卡片 ---
    const tutorialCard = document.createElement('div');
    tutorialCard.style.cssText = 'background: #F2F2F7; border-radius: 12px; padding: 16px; margin-bottom: 20px; color: #333; font-size: 14px; line-height: 1.6; text-align: left; box-shadow: inset 0 1px 3px rgba(0,0,0,0.05);';
    tutorialCard.innerHTML = `
        <h3 style="margin-top: 0; margin-bottom: 12px; font-size: 16px; color: #000; border-bottom: 1px solid #E5E5EA; padding-bottom: 8px;">小元机食用指南：</h3>
        
        <div style="margin-bottom: 8px;"><strong>1. 底部Dock栏</strong>从左到右分别为桌面美化，设置，世界书</div>
        
        <div style="margin-bottom: 8px;"><strong>设置页面又分：</strong><br>
        ① AppleID：备份的地方（可以备份桌面美化和全局）<br>
        ② API设置，真实系统弹窗，系统提示音</div>
        
        <div style="margin-bottom: 8px;"><strong>桌面APP介绍：</strong></div>
        <ul style="padding-left: 20px; margin: 0 0 12px 0;">
            <li style="margin-bottom: 8px;"><strong>APP1为聊天：</strong>左上角圆形头像为创建角色，右上角的接听键为退出，删除角色前往contacts通讯录页面左滑角色删除，点击角色可以查手机，聊天页面点击对方头像可以快捷进入查手机。回车键为用户发送键，那个小飞机图标是char回复键，拉黑角色后点击是以弹窗形式出现角色消息，角色消息会储存在chat页面（就是会话列表页面）的小卡片头像里面。爆改了朋友圈UI，点击朋友圈头像显示全部朋友圈，点击单个日期可查看单日朋友圈</li>
            <li style="margin-bottom: 8px;"><strong>APP2为情侣空间：</strong><br>
            ① 可以选择开启桌面小组件（有便利贴和拍立得两种模式），选择发送概率，char就会在桌面发送消息或图片。<br>
            ② 关联账号：开启后，char会实时感知用户和其他人聊天，你可以选择NPC回复频率（注意：这个比较耗费额度），你也可以知道NPC给char发送消息，并且可以进入查手机，帮char回复。</li>
            <li style="margin-bottom: 8px;"><strong>APP3为音乐：</strong>主页面为邀请一起听歌，点击主页面的角色卡邀请对方听歌，个人页面的五角星符号为音乐胶囊，点击后桌面会有一个小胶囊（实则迷你音乐播放器）</li>
            <li style="margin-bottom: 8px;"><strong>APP4还没做。</strong></li>
        </ul>
        
        <div style="background: #E5E5EA; padding: 10px; border-radius: 8px;">
            <strong>没有线下模式，但是有剧情模式：</strong><br>
            梦境为剧情模式可以走点小番外（可以自己做状态栏走番位），总结梦境剧情后可以在总结的梦境卡片左上角的云图标，点击会以梦的方式注入给char。<br>
            <span style="color: #888; font-size: 12px; display: block; margin-top: 4px;">*如果想要玩线下的宝宝比较多的话，会考虑把梦境改成线下和梦境双模式。</span>
        </div>
    `;
    container.appendChild(tutorialCard);

    // --- 原有的更新日志折叠栏渲染逻辑 ---
    systemUpdateLogs.forEach((log, index) => {
        const item = document.createElement('div');
        item.className = 'update-log-item';
        if (index === 0) item.classList.add('expanded'); // 默认展开最新版本
        
        let contentHtml = `<div class="update-log-section"><h4>更新内容</h4><ul class="update-log-list">${log.content.map(c => `<li>${c}</li>`).join('')}</ul></div>`;
        if (log.notes && log.notes.length > 0) {
            contentHtml += `<div class="update-log-section"><h4>注意事项</h4><ul class="update-log-list">${log.notes.map(n => `<li>${n}</li>`).join('')}</ul></div>`;
        }
        
        item.innerHTML = `
            <div class="update-log-header" onclick="toggleUpdateLog(this)">
                <div class="update-log-title-wrap">
                    <span class="update-log-version">${log.version}</span>
                    <span class="update-log-title-text">${log.title}</span>
                </div>
                <div class="update-log-right">
                    <span class="update-log-date">${log.date}</span>
                    <svg class="update-log-chevron" viewBox="0 0 24 24"><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/></svg>
                </div>
            </div>
            <div class="update-log-content">
                <div class="update-log-content-inner">
                    ${contentHtml}
                </div>
            </div>
        `;
        container.appendChild(item);
    });
}

function toggleUpdateLog(headerEl) {
    const item = headerEl.parentElement;
    item.classList.toggle('expanded');
}
// ==========================================
// 新增：拉黑弹窗队列与全屏记录页控制逻辑
// ==========================================

let blockedAlertQueue = [];
let isBlockedAlertShowing = false;

// 处理弹窗队列
function processBlockedAlertQueue() {
    if (isBlockedAlertShowing || blockedAlertQueue.length === 0) return;
    
    isBlockedAlertShowing = true;
    const item = blockedAlertQueue.shift(); // 取出队列第一条
    showBlockedAlert(item.char, item.msg);
}

function showBlockedAlert(char, msgObj) {
    document.getElementById('blocked-alert-avatar').src = char.avatar;
    document.getElementById('blocked-alert-name').innerText = char.name;
    
    const contentContainer = document.getElementById('blocked-alert-content');
    
    // 支持渲染表情包和图片
    if (msgObj.type === 'sticker' || msgObj.type === 'image') {
        contentContainer.innerHTML = `<img src="${msgObj.content}" style="max-width: 120px; border-radius: 8px; display: block; margin: 0 auto; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">`;
    } else {
        contentContainer.innerText = msgObj.content;
    }

    const modal = document.getElementById('wc-modal-blocked-alert');
    modal.classList.remove('hidden');
    modal.style.display = 'flex';
}

function closeBlockedAlert() {
    const modal = document.getElementById('wc-modal-blocked-alert');
    modal.classList.add('hidden');
    
    setTimeout(() => {
        modal.style.display = 'none';
        isBlockedAlertShowing = false;
        // 延迟一点点时间，继续弹出下一条，制造“消息轰炸”的压迫感
        setTimeout(processBlockedAlertQueue, 200); 
    }, 300);
}

function wcOpenBlockedHistory(charId) {
    const char = wcState.characters.find(c => c.id === charId);
    if (!char) return;

    // 动态绑定清空按钮事件
    const clearBtn = document.getElementById('blocked-history-clear-btn');
    if (clearBtn) {
        clearBtn.onclick = () => wcClearBlockedHistory(charId);
    }

    document.getElementById('blocked-history-avatar').src = char.avatar;
    document.getElementById('blocked-history-name').innerText = char.name;

    const list = document.getElementById('blocked-history-list');
    list.innerHTML = '';

    if (!char.blockedMessages || char.blockedMessages.length === 0) {
        list.innerHTML = '<div style="text-align:center; color:#999; margin-top:50px; font-size:14px; font-style:italic;">暂无拦截记录</div>';
    } else {
        char.blockedMessages.forEach((msg, index) => {
            const div = document.createElement('div');
            div.className = 'blocked-msg-card';
            
            let contentHtml = msg.content;
            if (msg.type === 'sticker' || msg.type === 'image') {
                contentHtml = `<img src="${msg.content}" style="max-width: 120px; border-radius: 8px; display: block; margin-top: 8px;">`;
            }
            
            // 👇 修改：加入了右上角的单条删除按钮 👇
            div.innerHTML = `
                <div class="blocked-msg-delete-btn" onclick="wcDeleteSingleBlockedMsg(${charId}, ${index})">
                    <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </div>
                <div class="blocked-msg-time">${new Date(msg.time).toLocaleString()}</div>
                <div class="blocked-msg-text">${contentHtml}</div>
            `;
            list.appendChild(div);
        });
    }

    document.getElementById('wc-view-blocked-history').classList.add('active');
}

// 👇 新增：单条删除拦截消息的函数 👇
function wcDeleteSingleBlockedMsg(charId, index) {
    if (confirm("确定要删除这条拦截记录吗？")) {
        const char = wcState.characters.find(c => c.id === charId);
        if (char && char.blockedMessages) {
            char.blockedMessages.splice(index, 1); // 删除指定索引的消息
            wcSaveData();
            wcOpenBlockedHistory(charId); // 重新渲染列表
        }
    }
    document.getElementById('wc-view-blocked-history').classList.add('active');
}

function wcCloseBlockedHistory() {
    document.getElementById('wc-view-blocked-history').classList.remove('active');
}

function wcClearBlockedHistory(charId) {
    if (confirm("确定要清空该角色的所有拦截记录吗？")) {
        const char = wcState.characters.find(c => c.id === charId);
        if (char) {
            char.blockedMessages = [];
            wcSaveData();
            wcOpenBlockedHistory(charId); // 重新渲染
        }
    }
}

// ==========================================
// 新增：拉黑确认弹窗逻辑
// ==========================================
let pendingBlockCharId = null;
let pendingBlockState = false;

function handleBlockBtnClick() {
    const charId = wcState.activeChatId;
    const char = wcState.characters.find(c => c.id === charId);
    if (!char) return;

    pendingBlockCharId = charId;
    pendingBlockState = !char.isBlocked; // 目标状态：如果当前未拉黑，则目标是拉黑；反之亦然

    const titleEl = document.getElementById('block-confirm-title');
    const descEl = document.getElementById('block-confirm-desc');
    const btnEl = document.getElementById('block-confirm-btn');

    if (pendingBlockState) {
        titleEl.innerText = "确认拉黑？";
        descEl.innerText = `拉黑后，你将不再接收 ${char.name} 的消息，Ta 的消息会被拦截到小黑屋。`;
        btnEl.innerText = "确认拉黑";
        btnEl.style.background = "#FF3B30";
        btnEl.style.boxShadow = "0 4px 12px rgba(255, 59, 48, 0.2)";
    } else {
        titleEl.innerText = "取消拉黑？";
        descEl.innerText = `取消拉黑后，你将恢复接收 ${char.name} 的消息。`;
        btnEl.innerText = "取消拉黑";
        btnEl.style.background = "#111";
        btnEl.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.2)";
    }

    document.getElementById('wc-modal-block-confirm').classList.add('active');
}

function closeBlockConfirmModal() {
    document.getElementById('wc-modal-block-confirm').classList.remove('active');
    pendingBlockCharId = null;
}

function executeBlockToggle() {
    if (!pendingBlockCharId) return;
    const char = wcState.characters.find(c => c.id === pendingBlockCharId);
    
    if (char) {
        const wasBlocked = char.isBlocked; // 记录之前的状态
        char.isBlocked = pendingBlockState; // 更新为新状态
        wcSaveData();
        
        // 更新按钮 UI
        const blockBtn = document.getElementById('wc-setting-block-btn');
        if (char.isBlocked) {
            blockBtn.innerText = "你已拉黑该角色";
            blockBtn.classList.add('blocked');
        } else {
            blockBtn.innerText = "拉黑该角色 (Block)";
            blockBtn.classList.remove('blocked');
        }

        // 👇 修改：解除拉黑时只注入记忆，不主动发消息 👇
        if (wasBlocked && !char.isBlocked) {
            // 只有从“已拉黑”变成“未拉黑”时才触发
            let blockedContext = "【系统强制提示：你刚刚被 User 解除拉黑了！你现在终于可以正常发送消息了。】\n";
            
            if (char.blockedMessages && char.blockedMessages.length > 0) {
                // 提取小黑屋里的消息（取最近的10条，并反转顺序让时间线顺畅）
                const recentBlocked = char.blockedMessages.slice(0, 10).reverse();
                blockedContext += "【以下是你被拉黑期间，疯狂发送但被系统拒收的消息记录（User 刚刚才看到这些记录）】：\n";
                
                recentBlocked.forEach(msg => {
                    let content = msg.content;
                    if (msg.type !== 'text') content = `[${msg.type}]`;
                    blockedContext += `你当时试图发送: ${content}\n`;
                });
                
                blockedContext += "请在下一次回复 User 时，结合以上你发过的无效消息，以及你现在终于被放出来的心情进行回应（可以抱怨、委屈、质问、或者假装无事发生，必须符合你的人设）。";
            } else {
                blockedContext += "你在被拉黑期间没有发送任何消息。请在下一次回复 User 时，自然地表达你重见天日的心情。";
            }

            // 将这段记忆作为一条“隐藏的系统消息”插入聊天记录，用户看不见，但 AI 下次读取上下文时能看到
            wcAddMessage(char.id, 'system', 'system', blockedContext, { hidden: true });    
        }
        // 👆 修改结束 👆
    }
    closeBlockConfirmModal();
}
// ==========================================
// 声音与触感逻辑 (修复版)
// ==========================================
let isSoundEnabled = localStorage.getItem('ios_theme_sound_enabled') !== 'false'; // 默认开启

function handleSoundToggle(checkbox) {
    isSoundEnabled = checkbox.checked;
    localStorage.setItem('ios_theme_sound_enabled', isSoundEnabled);
}

function openSoundSettings() {
    const toggle = document.getElementById('toggle-sound-enabled');
    if (toggle) toggle.checked = isSoundEnabled;
    document.getElementById('soundSettingsModal').classList.add('open');
}

function closeSoundSettings() {
    document.getElementById('soundSettingsModal').classList.remove('open');
}

async function saveSoundUrl() {
    const url = document.getElementById('soundUrlInput').value.trim();
    if (url && url !== '已选择本地音频') {
        customNotificationSound = url;
        await idb.set('ios_theme_sound', { url: customNotificationSound });
        alert("提示音 URL 已保存！");
    }
}

function handleAudioUpload(input) {
    const file = input.files[0];
    if (file) {
        if (file.size > 2 * 1024 * 1024) {
            alert("音频文件过大，请选择 2MB 以内的文件！");
            input.value = '';
            return;
        }
        const reader = new FileReader();
        reader.onload = async function(e) {
            customNotificationSound = e.target.result;
            document.getElementById('soundUrlInput').value = '已选择本地音频';
            await idb.set('ios_theme_sound', { url: customNotificationSound });
            alert("本地提示音已保存！");
        };
        reader.readAsDataURL(file);
    }
}

async function resetSound() {
    customNotificationSound = null;
    document.getElementById('soundUrlInput').value = '';
    await idb.set('ios_theme_sound', { url: null });
    alert("已恢复默认提示音！");
}

// 修复：测试声音无视开关，直接播放当前选中的音频
function playTestSound() {
    try {
        const audio = new Audio();
        audio.src = customNotificationSound || "https://actions.google.com/sounds/v1/alarms/beep_short.ogg"; 
        audio.play().catch(e => alert("播放失败，请检查音频格式: " + e.message));
        if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
    } catch (e) {
        console.error("测试提示音失败", e);
    }
}

// 核心播放函数 (受开关控制)
function playNotificationSound() {
    if (!isSoundEnabled) return; // 如果开关关闭，直接返回不播放
    try {
        const audio = new Audio();
        audio.src = customNotificationSound || "https://actions.google.com/sounds/v1/alarms/beep_short.ogg"; 
        audio.play().catch(e => console.log("浏览器限制了自动播放:", e));
        if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
    } catch (e) {
        console.error("播放提示音失败", e);
    }
}

// ==========================================
// 全新：全屏高级感日历 & 事件管理系统
// ==========================================
let currentCalYear = new Date().getFullYear();
let currentCalMonth = new Date().getMonth();

window.wcOpenCalendarModal = function() {
    let view = document.getElementById('wc-view-full-calendar');
    if (!view) {
        view = document.createElement('div');
        view.id = 'wc-view-full-calendar';
        view.className = 'ins-full-calendar-view';
        document.getElementById('wechat-root').appendChild(view);
    }
    
    currentCalYear = new Date().getFullYear();
    currentCalMonth = new Date().getMonth();
    
    view.innerHTML = `
        <div class="ins-cal-navbar">
            <div class="ins-cal-nav-btn" onclick="wcOpenAddEventModal()">
                <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            </div>
            <div class="ins-cal-nav-title">CALENDAR</div>
            <div class="ins-cal-nav-btn" onclick="wcCloseCalendarModal()">
                <svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"></polyline></svg>
            </div>
        </div>
        
        <div class="ins-cal-header-area">
            <div class="ins-cal-month-selector">
                <button onclick="wcChangeCalMonth(-1)"><svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"></polyline></svg></button>
                <div class="ins-cal-title-large" id="ins-cal-title">2023<br><span>OCTOBER</span></div>
                <button onclick="wcChangeCalMonth(1)"><svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"></polyline></svg></button>
            </div>
            <div class="ins-cal-weekdays">
                <span>SUN</span><span>MON</span><span>TUE</span><span>WED</span><span>THU</span><span>FRI</span><span>SAT</span>
            </div>
        </div>
        
        <div class="ins-cal-body-area">
            <div class="ins-cal-days-grid" id="ins-cal-days"></div>
            <!-- 事件列表区域 -->
            <div class="ins-cal-events-list" id="ins-cal-events-list" style="margin-top: 30px; padding-bottom: 30px;"></div>
        </div>
        
        <!-- 添加事件的底部弹窗 -->
        <div id="ins-cal-add-modal" class="ins-cal-add-overlay hidden">
            <div class="ins-cal-add-card">
                <div class="ins-cal-add-header">
                    <h3>添加记事</h3>
                    <button onclick="wcCloseAddEventModal()">&times;</button>
                </div>
                <div class="wc-form-group">
                    <label class="wc-form-label">日期</label>
                    <input type="date" id="cal-event-date" class="wc-form-input">
                </div>
                <div class="wc-form-group">
                    <label class="wc-form-label">类型</label>
                    <select id="cal-event-type" class="wc-form-input" onchange="wcToggleEventCharSelect()">
                        <option value="todo">待办事项</option>
                        <option value="period">生理期</option>
                        <option value="anniversary">纪念日</option>
                        <option value="birthday">生日</option>
                    </select>
                </div>
                <div class="wc-form-group" id="cal-event-title-group">
                    <label class="wc-form-label">标题/内容</label>
                    <input type="text" id="cal-event-title" class="wc-form-input" placeholder="例如：看电影 / 恋爱纪念日">
                </div>
                
                <!-- 双重关联设置 -->
                <div style="display: flex; gap: 10px; margin-bottom: 16px;">
                    <div style="flex: 1;">
                        <label class="wc-form-label">关联我方</label>
                        <select id="cal-event-user-target" class="wc-form-input" style="font-size: 14px; padding: 10px;">
                            <!-- JS 动态注入 -->
                        </select>
                    </div>
                    <div style="flex: 1;">
                        <label class="wc-form-label">关联对方</label>
                        <select id="cal-event-char-target" class="wc-form-input" style="font-size: 14px; padding: 10px;">
                            <!-- JS 动态注入 -->
                        </select>
                    </div>
                </div>

                <div class="wc-form-group" style="display: flex; align-items: center; gap: 10px; background: #F9F9F9; padding: 12px; border-radius: 10px; border: 1px solid #F0F0F0;">
                    <input type="checkbox" id="cal-event-inject" checked style="width: 20px; height: 20px; accent-color: #111;">
                    <label class="wc-form-label" style="margin: 0; font-size: 13px; color: #333;">注入角色记忆 (AI将感知此事件)</label>
                </div>
                <button class="wc-btn-primary" style="background:#111; border-radius: 16px; height: 50px;" onclick="wcSaveCalendarEvent()">保存</button>
            </div>
        </div>
    `;

    wcRenderCalendar();
    
    view.style.display = 'flex';
    setTimeout(() => view.classList.add('active'), 10);
}

window.wcCloseCalendarModal = function() {
    const view = document.getElementById('wc-view-full-calendar');
    if (view) {
        view.classList.remove('active');
        setTimeout(() => view.style.display = 'none', 300);
    }
}

window.wcChangeCalMonth = function(dir) {
    currentCalMonth += dir;
    if (currentCalMonth < 0) { currentCalMonth = 11; currentCalYear--; } 
    else if (currentCalMonth > 11) { currentCalMonth = 0; currentCalYear++; }
    wcRenderCalendar();
}

window.wcRenderCalendar = function() {
    const monthNames = ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"];
    document.getElementById('ins-cal-title').innerHTML = `${currentCalYear}<br><span>${monthNames[currentCalMonth]}</span>`;
    
    const daysContainer = document.getElementById('ins-cal-days');
    daysContainer.innerHTML = '';

    const firstDay = new Date(currentCalYear, currentCalMonth, 1).getDay();
    const daysInMonth = new Date(currentCalYear, currentCalMonth + 1, 0).getDate();
    
    // 1. 找出有朋友圈的日期
    const momentsDays = new Set();
    wcState.moments.forEach(m => {
        const d = new Date(m.time);
        if (d.getFullYear() === currentCalYear && d.getMonth() === currentCalMonth) {
            momentsDays.add(d.getDate());
        }
    });

    // 2. 找出有事件的日期
    const eventsMap = {};
    if (!wcState.calendarEvents) wcState.calendarEvents = [];
    wcState.calendarEvents.forEach(e => {
        const [y, m, d] = e.date.split('-');
        if (parseInt(y) === currentCalYear && parseInt(m) === currentCalMonth + 1) {
            const dayNum = parseInt(d);
            if (!eventsMap[dayNum]) eventsMap[dayNum] = [];
            eventsMap[dayNum].push(e);
        }
    });

    // 填充空白
    for (let i = 0; i < firstDay; i++) {
        daysContainer.innerHTML += `<div class="ins-cal-cell empty"></div>`;
    }

    const today = new Date();
    const isCurrentMonth = today.getFullYear() === currentCalYear && today.getMonth() === currentCalMonth;

    for (let i = 1; i <= daysInMonth; i++) {
        const hasMoment = momentsDays.has(i);
        const isToday = isCurrentMonth && today.getDate() === i;
        const dayEvents = eventsMap[i] || [];
        
        let classes = 'ins-cal-cell';
        if (isToday) classes += ' today';
        
        let indicatorsHtml = '';
        
        // 朋友圈提示点 (灰色)
        if (hasMoment) indicatorsHtml += `<div class="cal-dot moment-dot"></div>`;
        
        // 事件提示点 (不同颜色)
        dayEvents.forEach(e => {
            if (e.type === 'period') indicatorsHtml += `<div class="cal-dot period-dot"></div>`;
            else if (e.type === 'birthday') indicatorsHtml += `<div class="cal-dot bday-dot"></div>`;
            else if (e.type === 'anniversary') indicatorsHtml += `<div class="cal-dot anniv-dot"></div>`;
            else indicatorsHtml += `<div class="cal-dot todo-dot"></div>`;
        });

                // 节假日文字
                const holiday = getHoliday(currentCalMonth, i);
                const holidayHtml = holiday ? `<div class="cal-holiday-text">${holiday}</div>` : '';

                daysContainer.innerHTML += `
                    <div class="${classes}" onclick="wcSelectCalendarDate(${currentCalYear}, ${currentCalMonth}, ${i})">
                        <span class="cal-num">${i}</span>
                        ${holidayHtml}
                        <div class="cal-indicators">${indicatorsHtml}</div>
                    </div>
                `;
            }
            
            // 👇👇👇 就是在这里加上这一行 👇👇👇
            wcRenderCalendarEventsList();
        }

function getHoliday(month, day) {
    const holidays = {
        "01-01": "元旦", "02-14": "情人节", "03-08": "妇女节", "04-01": "愚人节", 
        "05-01": "劳动节", "05-20": "520", "06-01": "儿童节", "10-01": "国庆节", 
        "12-24": "平安夜", "12-25": "圣诞节", "12-31": "跨年"
    };
    const key = `${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    return holidays[key] || "";
}


// ==========================================
// 下方是全新的事件列表渲染与添加逻辑
// ==========================================

// ==========================================
// 全新：高级感 INS 风事件列表与双重关联逻辑
// ==========================================

window.wcRenderCalendarEventsList = function() {
    const listContainer = document.getElementById('ins-cal-events-list');
    if (!listContainer) return;
    
    // 极简标题
    listContainer.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 15px; padding: 0 5px;">
            <div style="font-family: 'Georgia', serif; font-size: 18px; font-weight: bold; color: #111; letter-spacing: -0.5px;">Events</div>
            <div style="font-size: 11px; color: #999; text-transform: uppercase; letter-spacing: 1px;">This Month</div>
        </div>
    `;
    
    if (!wcState.calendarEvents) wcState.calendarEvents = [];
    
    const monthEvents = wcState.calendarEvents.filter(e => {
        const [y, m, d] = e.date.split('-');
        return parseInt(y) === currentCalYear && parseInt(m) === currentCalMonth + 1;
    });
    
    monthEvents.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    if (monthEvents.length === 0) {
        listContainer.innerHTML += `
            <div style="background: #FAFAFA; border-radius: 20px; padding: 30px; text-align: center; border: 1px dashed #E5E5EA;">
                <div style="font-size: 13px; color: #888; font-style: italic;">No events for this month.</div>
            </div>`;
        return;
    }
    
    monthEvents.forEach(e => {
        const typeMap = {
            'todo': { label: 'TODO', color: '#111', bg: '#F5F5F5' },
            'period': { label: 'PERIOD', color: '#FF3B30', bg: 'rgba(255,59,48,0.08)' },
            'anniversary': { label: 'ANNIV', color: '#AF52DE', bg: 'rgba(175,82,222,0.08)' },
            'birthday': { label: 'BDAY', color: '#FF9500', bg: 'rgba(255,149,0,0.08)' }
        };
        const tInfo = typeMap[e.type] || { label: 'EVENT', color: '#888', bg: '#F5F5F5' };
        
        // 解析双重关联文本
        let relationTextArr = [];
        if (e.userTarget) relationTextArr.push(e.userTarget.name);
        if (e.charTarget) relationTextArr.push(e.charTarget.name);
        
        // 兼容旧数据
        if (!e.userTarget && !e.charTarget) {
            if (e.targetName) relationTextArr.push(e.targetName);
            else if (e.isUser) relationTextArr.push('User');
            else if (e.charId) {
                const c = wcState.characters.find(ch => ch.id === e.charId);
                if (c) relationTextArr.push(c.name);
            }
        }
        
        let relationHtml = '';
        if (relationTextArr.length > 0) {
            relationHtml = `<div style="font-size: 11px; color: #888; margin-top: 6px; display: flex; align-items: center; gap: 4px;">
                <svg viewBox="0 0 24 24" style="width: 12px; height: 12px; fill: none; stroke: currentColor; stroke-width: 2;"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                ${relationTextArr.join(' & ')}
            </div>`;
        }

        const injectIcon = e.inject !== false 
            ? `<svg viewBox="0 0 24 24" style="width: 14px; height: 14px; fill: none; stroke: #34C759; stroke-width: 2;" title="已注入AI记忆"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>` 
            : `<svg viewBox="0 0 24 24" style="width: 14px; height: 14px; fill: none; stroke: #CCC; stroke-width: 2;" title="未注入AI记忆"><circle cx="12" cy="12" r="10"></circle><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line></svg>`;

        const dayNum = e.date.split('-')[2];

        // 高级感卡片 HTML
        const div = document.createElement('div');
        div.style.cssText = "background: #FFF; border-radius: 20px; padding: 16px; margin-bottom: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.03); border: 1px solid #F9F9F9; display: flex; align-items: center; gap: 15px; position: relative; overflow: hidden;";
        div.innerHTML = `
            <!-- 左侧日期块 -->
            <div style="width: 48px; height: 48px; border-radius: 14px; background: ${tInfo.bg}; color: ${tInfo.color}; display: flex; flex-direction: column; align-items: center; justify-content: center; flex-shrink: 0;">
                <span style="font-size: 18px; font-weight: 800; font-family: 'Georgia', serif; line-height: 1;">${dayNum}</span>
            </div>
            
            <!-- 中间内容区 -->
            <div style="flex: 1; overflow: hidden;">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                    <span style="font-size: 9px; font-weight: 800; letter-spacing: 1px; color: ${tInfo.color}; border: 1px solid ${tInfo.color}; padding: 2px 6px; border-radius: 6px;">${tInfo.label}</span>
                    ${injectIcon}
                </div>
                <div style="font-size: 15px; font-weight: 600; color: #111; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${e.title}</div>
                ${relationHtml}
            </div>
            
            <!-- 右侧极简删除按钮 -->
            <div onclick="wcDeleteCalendarEvent(${e.id})" style="width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; color: #CCC; cursor: pointer; transition: color 0.2s;">
                <svg viewBox="0 0 24 24" style="width: 18px; height: 18px; fill: none; stroke: currentColor; stroke-width: 2;"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </div>
        `;
        listContainer.appendChild(div);
    });
}

window.wcDeleteCalendarEvent = function(id) {
    if (confirm("确定要删除这个事件吗？")) {
        wcState.calendarEvents = wcState.calendarEvents.filter(e => e.id !== id);
        wcSaveData();
        wcRenderCalendar();
    }
}

window.wcOpenAddEventModal = function() {
    const userSelect = document.getElementById('cal-event-user-target');
    const charSelect = document.getElementById('cal-event-char-target');
    
    // 填充我方下拉框
    userSelect.innerHTML = '<option value="none">无</option><option value="user_default">默认 User</option>';
    if (wcState.masks && wcState.masks.length > 0) {
        const maskGroup = document.createElement('optgroup');
        maskGroup.label = "我的面具";
        wcState.masks.forEach(m => {
            maskGroup.innerHTML += `<option value="mask_${m.id}">${m.name}</option>`;
        });
        userSelect.appendChild(maskGroup);
    }

    // 填充对方下拉框
    charSelect.innerHTML = '<option value="none">无</option>';
    if (wcState.characters && wcState.characters.length > 0) {
        const charGroup = document.createElement('optgroup');
        charGroup.label = "角色";
        wcState.characters.forEach(c => {
            charGroup.innerHTML += `<option value="char_${c.id}">${c.name}</option>`;
        });
        charSelect.appendChild(charGroup);
    }
    
    // 默认选中今天
    const today = new Date();
    document.getElementById('cal-event-date').value = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
    
    document.getElementById('ins-cal-add-modal').classList.remove('hidden');
    wcToggleEventCharSelect();
}

window.wcCloseAddEventModal = function() {
    document.getElementById('ins-cal-add-modal').classList.add('hidden');
}

window.wcToggleEventCharSelect = function() {
    const type = document.getElementById('cal-event-type').value;
    const titleGroup = document.getElementById('cal-event-title-group');
    if (type === 'period') titleGroup.style.display = 'none';
    else titleGroup.style.display = 'block';
}

window.wcSaveCalendarEvent = function() {
    const date = document.getElementById('cal-event-date').value;
    const type = document.getElementById('cal-event-type').value;
    let title = document.getElementById('cal-event-title').value.trim();
    const userVal = document.getElementById('cal-event-user-target').value;
    const charVal = document.getElementById('cal-event-char-target').value;
    const inject = document.getElementById('cal-event-inject').checked;
    
    if (!date) return alert("请选择日期");
    if (type !== 'period' && !title) return alert("请输入标题");
    if (type === 'period') title = "生理期";

    // 解析我方关联
    let userTarget = null;
    if (userVal === 'user_default') {
        userTarget = { type: 'user', id: null, name: wcState.user.name };
    } else if (userVal.startsWith('mask_')) {
        const id = parseInt(userVal.replace('mask_', ''));
        const mask = wcState.masks.find(m => m.id === id);
        if (mask) userTarget = { type: 'mask', id: id, name: mask.name };
    }

    // 解析对方关联
    let charTarget = null;
    if (charVal.startsWith('char_')) {
        const id = parseInt(charVal.replace('char_', ''));
        const char = wcState.characters.find(c => c.id === id);
        if (char) charTarget = { type: 'char', id: id, name: char.name };
    }

    // ... 前面的代码保持不变 ...
    const newEvent = {
        id: Date.now(),
        date: date,
        type: type,
        title: title,
        userTarget: userTarget,
        charTarget: charTarget,
        inject: inject
    };

    if (!wcState.calendarEvents) wcState.calendarEvents = [];
    wcState.calendarEvents.push(newEvent);
    wcSaveData();
    
    wcRenderCalendar();
    wcCloseAddEventModal();
    alert("添加成功！"); // <--- 加上这一行提示
}

// --- 新增：点击日历具体日期过滤朋友圈 ---
window.wcSelectCalendarDate = function(year, month, day) {
    wcState.momentFilter = 'specificDate';
    wcState.momentFilterDate = { year, month, day };
    
    // 移除顶部导航栏的其他高亮
    document.querySelectorAll('.cal-item').forEach(el => el.classList.remove('active'));
    
    // 关闭日历弹窗
    wcCloseCalendarModal();
    
    // 重新渲染朋友圈
    wcRenderMoments();
}

// ==========================================
// 高级感长文本编辑弹窗逻辑 (全局挂载，防止找不到)
// ==========================================
window.currentTextEditCallback = null;

window.openIosTextEditModal = function(title, initialText, callback) {
    document.getElementById('ios-text-edit-title').innerText = title;
    document.getElementById('ios-text-edit-textarea').value = initialText;
    window.currentTextEditCallback = callback;
    document.getElementById('ios-text-edit-modal').classList.add('active');
};

window.closeIosTextEditModal = function() {
    document.getElementById('ios-text-edit-modal').classList.remove('active');
    window.currentTextEditCallback = null;
};

document.addEventListener('DOMContentLoaded', () => {
    const confirmBtn = document.getElementById('ios-text-edit-confirm');
    if (confirmBtn) {
        confirmBtn.addEventListener('click', () => {
            if (window.currentTextEditCallback) {
                const newText = document.getElementById('ios-text-edit-textarea').value.trim();
                window.currentTextEditCallback(newText);
            }
            window.closeIosTextEditModal();
        });
    }
});
// ==========================================
// 恋人空间：默契大挑战 (Q&A) 逻辑 (支持存档与历史)
// ==========================================

function openLsQaView() {
    if (!lsState.boundCharId) {
        alert("请先在首页绑定一位恋人哦~");
        return;
    }
    document.getElementById('ls-view-main').classList.remove('active');
    document.getElementById('ls-view-qa').classList.add('active');
    document.getElementById('ls-qa-score-display').innerText = lsState.qaScore;
    
    // 检查是否有未完成的会话
    if (lsState.qaCurrentSession && lsState.qaCurrentSession.questions && lsState.qaCurrentSession.questions.length > 0) {
        renderQaList(lsState.qaCurrentSession.source);
    } else {
        document.getElementById('ls-qa-list').innerHTML = `
            <div class="ls-empty-state" style="margin-top: 50px;">
                <svg viewBox="0 0 24 24" style="width:48px;height:48px;stroke:#CCC;fill:none;stroke-width:1;margin-bottom:10px;"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                <p style="font-family: 'Georgia', serif; font-style: italic; color: #999;">点击上方按钮开始挑战</p>
            </div>
        `;
    }
}

function closeLsQaView() {
    document.getElementById('ls-view-qa').classList.remove('active');
    document.getElementById('ls-view-main').classList.add('active');
}

function updateQaScore(points) {
    lsState.qaScore += points;
    lsSaveData();
    document.getElementById('ls-qa-score-display').innerText = lsState.qaScore;
}

// --- AI 出题逻辑 ---
async function generateCharQa() {
    if (lsState.qaCurrentSession) {
        if (!confirm("当前还有未完成的挑战，重新出题将覆盖当前进度，确定吗？")) return;
    }

    const charId = lsState.boundCharId;
    const char = wcState.characters.find(c => c.id === charId);
    if (!char) return;

const apiConfig = await getActiveApiConfig('npc');
    if (!apiConfig || !apiConfig.key) return alert("请先配置 API");

    wcShowLoading("Ta 正在认真思考题目...");

    try {
        const chatConfig = char.chatConfig || {};
        const userPersona = chatConfig.userPersona || wcState.user.persona || "无";
        const msgs = wcState.chats[char.id] || [];
        const recentMsgs = msgs.slice(-40).map(m => `${m.sender==='me'?'User':char.name}: ${m.content}`).join('\n');

        let wbInfo = "";
        if (worldbookEntries.length > 0 && chatConfig.worldbookEntries && chatConfig.worldbookEntries.length > 0) {
            const linkedEntries = worldbookEntries.filter(e => chatConfig.worldbookEntries.includes(e.id.toString()));
            if (linkedEntries.length > 0) {
                wbInfo = "【世界观参考】:\n" + linkedEntries.map(e => `${e.title}: ${e.desc}`).join('\n');
            }
        }

        const topics = [
            "基于我们最近聊天的某个极其微小的细节（比如我随口提过的一句话、某个小动作）",
            "极端的假设性脑洞题（比如：如果我变成了一只猫/丧尸爆发，我第一件事会做什么？）",
            "关于我内心深处的情感、小怪癖或不为人知的秘密",
            "情境反应题（比如：如果我们在街上遇到前任/我突然生气了，我会怎么做？）",
            "送命题（故意挖坑给 User 跳，选项里充满陷阱）"
        ];
        const randomTopic = topics[Math.floor(Math.random() * topics.length)];

        let prompt = `你扮演角色：${char.name}。\n人设：${char.prompt}\n${wbInfo}\n`;
        prompt += `【用户(User)设定】：${userPersona}\n`;
        prompt += `【最近聊天记录】：\n${recentMsgs}\n\n`;
        prompt += `现在你和User正在玩“情侣默契大挑战”。请根据你的人设、User的设定以及你们最近的聊天记录，出 5 道单选题来考验 User。\n`;
        
        prompt += `【核心出题要求（最高优先级）】：\n`;
        prompt += `1. 本次出题请侧重于这个方向：**${randomTopic}**。\n`;
        prompt += `2. 【绝对禁止】：严禁出老套、无聊、表面的题目（绝对不要问：我最喜欢的颜色、食物、季节、动物、想去哪里玩）。\n`;
        prompt += `3. 题目必须刁钻、有趣、有画面感，选项要具有迷惑性。\n`;
        prompt += `4. 语气要完全符合你的人设（可以调皮、傲娇、温柔、腹黑等），在 explanation (解析) 中要对 User 的回答进行吐槽或撒娇。\n`;
        prompt += `5. 必须返回纯 JSON 数组，格式如下：\n`;
        prompt += `[
  {
    "q": "如果明天就是世界末日，你觉得我今晚会拉着你做什么？",
    "options": {"A": "疯狂囤积物资", "B": "躺在床上相拥等死", "C": "去抢劫超市"},
    "answer": "B",
    "explanation": "笨蛋，末日都要来了，我只想和你待在一起呀。"
  }
]\n`;

        const response = await fetch(`${apiConfig.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiConfig.key}` },
            body: JSON.stringify({
                model: apiConfig.model,
                messages: [{ role: "user", content: prompt }],
                temperature: parseFloat(apiConfig.temp) || 0.8,
                max_tokens: 4000
            })
        });

        const data = await response.json();
        let content = data.choices[0].message.content;
        content = content.replace(/<thinking>[\s\S]*?<\/thinking>/g, '').trim();
        content = content.replace(/```json/g, '').replace(/```/g, '').trim();
        
        const questions = JSON.parse(content);
        
        // 初始化当前会话并保存
        lsState.qaCurrentSession = {
            id: Date.now(),
            source: 'char',
            scoreEarned: 0,
            questions: questions.map(q => ({ ...q, userChoice: null, isCorrect: null }))
        };
        lsSaveData();

        renderQaList('char');
        wcShowSuccess("出题完成！");

    } catch (e) {
        console.error(e);
        wcShowError("出题失败，请重试");
    }
}

// --- 渲染题目列表 (支持恢复状态) ---
function renderQaList(source) {
    const container = document.getElementById('ls-qa-list');
    container.innerHTML = '';

    const session = lsState.qaCurrentSession;
    if (!session || !session.questions) return;

    let titleHtml = `<div style="font-size: 18px; font-weight: bold; margin-bottom: 20px; color: #111;">${source === 'char' ? 'Ta 的考验' : 'Ta 的作答结果'}</div>`;
    container.innerHTML = titleHtml;

    session.questions.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'qa-item-card';
        div.id = `qa-card-${index}`;
        
        // 如果已经答过，标记状态
        if (item.userChoice) {
            div.dataset.answered = 'true';
        }
        
        let optionsHtml = '';
        ['A', 'B', 'C'].forEach(key => {
            if (item.options[key]) {
                let optClass = 'qa-option';
                // 恢复已答状态的样式
                if (item.userChoice) {
                    if (key === item.answer) optClass += ' correct';
                    else if (key === item.userChoice && !item.isCorrect) optClass += ' wrong';
                }

                optionsHtml += `
                    <div class="${optClass}" id="qa-opt-${index}-${key}" onclick="answerQa(${index}, '${key}', '${item.answer}', '${source}')">
                        <span class="qa-option-letter">${key}</span>
                        <span class="qa-option-text">${item.options[key]}</span>
                    </div>
                `;
            }
        });

        const expDisplay = item.userChoice ? 'block' : 'none';
        let expContent = `<strong>解析：</strong>${item.explanation || '无'}`;
        if (source === 'user') {
            expContent = `<strong>Ta 的内心OS：</strong>${item.os || '无'}<br><br><strong>正确答案：</strong>${item.answer}`;
        }

        div.innerHTML = `
            <div class="qa-question-text">${index + 1}. ${item.q}</div>
            <div class="qa-options-container">${optionsHtml}</div>
            <div class="qa-explanation" id="qa-exp-${index}" style="display: ${expDisplay};">
                ${expContent}
            </div>
        `;
        container.appendChild(div);
    });
}

// --- 答题逻辑 (带保存) ---
function answerQa(qIndex, selectedKey, correctKey, source) {
    if (source === 'user') return; // 用户出题模式下，是AI答题，用户不能点

    const session = lsState.qaCurrentSession;
    if (!session) return;

    const card = document.getElementById(`qa-card-${qIndex}`);
    if (card.dataset.answered === 'true') return; 
    card.dataset.answered = 'true';

    const isCorrect = (selectedKey === correctKey);
    
    // 记录状态
    session.questions[qIndex].userChoice = selectedKey;
    session.questions[qIndex].isCorrect = isCorrect;

    const selectedOpt = document.getElementById(`qa-opt-${qIndex}-${selectedKey}`);
    const correctOpt = document.getElementById(`qa-opt-${qIndex}-${correctKey}`);
    const expDiv = document.getElementById(`qa-exp-${qIndex}`);

    if (isCorrect) {
        selectedOpt.classList.add('correct');
        updateQaScore(20);
        session.scoreEarned += 20;
    } else {
        selectedOpt.classList.add('wrong');
        if (correctOpt) correctOpt.classList.add('correct');
        updateQaScore(-10);
        session.scoreEarned -= 10;
    }

    if (expDiv) expDiv.style.display = 'block';
    
    lsSaveData(); // 实时保存进度
    checkAllAnswered();
}

function checkAllAnswered() {
    const session = lsState.qaCurrentSession;
    if (!session) return;

    const allAnswered = session.questions.every(q => q.userChoice !== null);
    
    if (allAnswered) {
        const correctCount = session.questions.filter(q => q.isCorrect).length;
        
        setTimeout(() => {
            if (correctCount === 5) {
                alert("太棒了！5题全对，额外奖励 20 积分！");
                updateQaScore(20);
                session.scoreEarned += 20;
            } else {
                alert(`挑战结束！答对了 ${correctCount} 题。`);
            }
            
            // 归档到历史记录
            archiveCurrentSession();
        }, 500);
    }
}

// --- 修复：深拷贝归档，确保数据不丢失 ---
function archiveCurrentSession() {
    if (!lsState.qaCurrentSession) return;
    
    if (!lsState.qaHistory) lsState.qaHistory = [];
    
    // 【关键修复】：使用 JSON 深拷贝，防止当前会话清空时影响历史记录
    const sessionSnapshot = JSON.parse(JSON.stringify(lsState.qaCurrentSession));
    sessionSnapshot.date = Date.now();
    
    // 将当前会话推入历史最前面
    lsState.qaHistory.unshift(sessionSnapshot);
    
    // 清空当前会话
    lsState.qaCurrentSession = null;
    lsSaveData();
}

// --- 用户出题逻辑 ---
function openUserQaInput() {
    if (lsState.qaCurrentSession) {
        if (!confirm("当前还有未完成的挑战，重新出题将覆盖当前进度，确定吗？")) return;
    }

    const container = document.getElementById('ls-qa-input-container');
    container.innerHTML = '';

    for (let i = 0; i < 5; i++) {
        container.innerHTML += `
            <div class="qa-input-block">
                <div class="qa-input-block-title">QUESTION ${i + 1}</div>
                <input type="text" class="qa-input-field" id="uqa-q-${i}" placeholder="输入问题...">
                <input type="text" class="qa-input-field" id="uqa-a-${i}" placeholder="选项 A">
                <input type="text" class="qa-input-field" id="uqa-b-${i}" placeholder="选项 B">
                <input type="text" class="qa-input-field" id="uqa-c-${i}" placeholder="选项 C">
                <select class="qa-select-field" id="uqa-ans-${i}" style="margin-top: 8px;">
                    <option value="A">正确答案：A</option>
                    <option value="B">正确答案：B</option>
                    <option value="C">正确答案：C</option>
                </select>
            </div>
        `;
    }
    wcOpenModal('ls-modal-qa-input');
}

async function submitUserQa() {
    const userQuestions = [];
    for (let i = 0; i < 5; i++) {
        const q = document.getElementById(`uqa-q-${i}`).value.trim();
        const a = document.getElementById(`uqa-a-${i}`).value.trim();
        const b = document.getElementById(`uqa-b-${i}`).value.trim();
        const c = document.getElementById(`uqa-c-${i}`).value.trim();
        const ans = document.getElementById(`uqa-ans-${i}`).value;

        if (!q || !a || !b || !c) {
            return alert(`请完整填写第 ${i + 1} 题的所有内容！`);
        }

        userQuestions.push({
            q: q,
            options: { "A": a, "B": b, "C": c },
            answer: ans
        });
    }

    wcCloseModal('ls-modal-qa-input');
    await aiAnswerUserQa(userQuestions);
}

async function aiAnswerUserQa(questions) {
    const charId = lsState.boundCharId;
    const char = wcState.characters.find(c => c.id === charId);
    if (!char) return;

    const apiConfig = await getActiveApiConfig('npc');
    if (!apiConfig || !apiConfig.key) return alert("请先配置 API");

    wcShowLoading("Ta 正在紧张作答中...");

    try {
        const chatConfig = char.chatConfig || {};
        const userPersona = chatConfig.userPersona || wcState.user.persona || "无";
        
        let prompt = `你扮演角色：${char.name}。\n人设：${char.prompt}\n`;
        prompt += `【用户(User)设定】：${userPersona}\n\n`;
        prompt += `User 给你出了 5 道默契测试题，请你根据人设和对 User 的了解进行作答。\n`;
        prompt += `题目如下：\n${JSON.stringify(questions, null, 2)}\n\n`;
        prompt += `【要求】：\n`;
        prompt += `1. 返回纯 JSON 数组，包含你选择的答案和你的内心OS。\n`;
        prompt += `2. 格式如下：\n`;
        prompt += `[
  {"choice": "A", "os": "这题太简单了，肯定是A！"},
  {"choice": "B", "os": "有点拿不准，猜个B吧。"}
]\n`;

        const response = await fetch(`${apiConfig.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiConfig.key}` },
            body: JSON.stringify({
                model: apiConfig.model,
                messages: [{ role: "user", content: prompt }],
                temperature: parseFloat(apiConfig.temp) || 0.8,
                max_tokens: 4000
            })
        });

        const data = await response.json();
        let content = data.choices[0].message.content;
        content = content.replace(/<thinking>[\s\S]*?<\/thinking>/g, '').trim();
        content = content.replace(/```json/g, '').replace(/```/g, '').trim();
        
        const aiAnswers = JSON.parse(content);
        
        // 构造完整的会话数据
        let scoreEarned = 0;
        const fullQuestions = questions.map((q, i) => {
            const aiAns = aiAnswers[i];
            const isCorrect = (aiAns.choice === q.answer);
            if (isCorrect) scoreEarned += 20;
            else scoreEarned -= 10;
            
            return {
                ...q,
                userChoice: aiAns.choice, // AI的选择存在 userChoice 里方便复用渲染逻辑
                isCorrect: isCorrect,
                os: aiAns.os
            };
        });

        if (fullQuestions.filter(q => q.isCorrect).length === 5) {
            scoreEarned += 20; // 全对额外奖励
        }

        // 存入当前会话并立即归档
        lsState.qaCurrentSession = {
            id: Date.now(),
            source: 'user',
            scoreEarned: scoreEarned,
            questions: fullQuestions
        };
        
        // 渲染界面播放动画
        renderQaList('user');
        wcShowSuccess("作答完毕！");
        
        // 模拟动画展示
        let correctCount = 0;
        for (let i = 0; i < 5; i++) {
            await wcDelay(800);
            const q = fullQuestions[i];
            const selectedOpt = document.getElementById(`qa-opt-${i}-${q.userChoice}`);
            const correctOpt = document.getElementById(`qa-opt-${i}-${q.answer}`);
            const expDiv = document.getElementById(`qa-exp-${i}`);
            
            if (q.isCorrect) {
                selectedOpt.classList.add('correct');
                correctCount++;
            } else {
                selectedOpt.classList.add('wrong');
                if (correctOpt) correctOpt.classList.add('correct');
            }
            expDiv.style.display = 'block';
        }

        setTimeout(() => {
            if (correctCount === 5) {
                alert(`Ta 竟然全答对了！看来你们真的很默契！\n为你增加 20 积分！`);
            } else {
                alert(`Ta 答对了 ${correctCount} 题。继续培养默契吧！`);
            }
            updateQaScore(scoreEarned);
            archiveCurrentSession(); // 动画播完后归档
        }, 1000);

    } catch (e) {
        console.error(e);
        wcShowError("Ta 思考太久睡着了，请重试");
    }
}

// --- 历史仓库逻辑 ---
function openQaArchive() {
    document.getElementById('ls-view-qa').classList.remove('active');
    document.getElementById('ls-view-qa-archive').classList.add('active');
    renderQaArchive();
}

function closeQaArchive() {
    document.getElementById('ls-view-qa-archive').classList.remove('active');
    document.getElementById('ls-view-qa').classList.add('active');
}

// --- 新增：极致丝滑的动态高度折叠引擎 ---
window.toggleQaArchiveCard = function(headerEl) {
    const card = headerEl.parentElement;
    const body = card.querySelector('.qa-archive-body');
    const inner = card.querySelector('.qa-archive-content-inner');
    
    if (card.classList.contains('expanded')) {
        // 【收起动作】
        // 1. 先把高度固定为当前的真实高度
        body.style.height = body.scrollHeight + 'px';
        // 2. 强制浏览器重绘
        void body.offsetHeight; 
        // 3. 触发动画，高度变为 0
        body.style.height = '0px';
        card.classList.remove('expanded');
    } else {
        // 【展开动作】
        card.classList.add('expanded');
        // 1. 精准获取内部内容的真实高度，并赋值给外层
        body.style.height = inner.scrollHeight + 'px';
        
        // 2. 动画结束后，把高度设为 auto，防止后续内容变化被截断
        body.addEventListener('transitionend', function handler(e) {
            if (e.propertyName === 'height' && card.classList.contains('expanded')) {
                body.style.height = 'auto';
            }
            body.removeEventListener('transitionend', handler);
        });
    }
};

// --- 修复：适配 JS 动画引擎的渲染逻辑 ---
function renderQaArchive() {
    const container = document.getElementById('ls-qa-archive-list');
    container.innerHTML = '';

    if (!lsState.qaHistory || lsState.qaHistory.length === 0) {
        container.innerHTML = '<div style="text-align:center; color:#999; margin-top:50px; font-style:italic;">仓库空空如也，快去挑战吧~</div>';
        return;
    }

    lsState.qaHistory.forEach((session, index) => {
        const dateStr = new Date(session.date).toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        const title = session.source === 'char' ? 'Ta 的考验' : '我的出题';
        const scoreClass = session.scoreEarned >= 0 ? '' : 'negative';
        const scoreSign = session.scoreEarned >= 0 ? '+' : '';

        let questionsHtml = '';
        session.questions.forEach((q, qIdx) => {
            const isCorrect = q.isCorrect;
            const statusIcon = isCorrect 
                ? '<span style="color:#34C759; font-weight:bold;">✅ 答对了</span>' 
                : '<span style="color:#FF3B30; font-weight:bold;">❌ 答错了</span>';
            
            let expHtml = '';
            if (session.source === 'char') {
                expHtml = `<div class="qa-archive-exp"><strong>解析:</strong> ${q.explanation || '无'}</div>`;
            } else {
                expHtml = `<div class="qa-archive-exp"><strong>Ta的OS:</strong> ${q.os || '无'}</div>`;
            }

            questionsHtml += `
                <div class="qa-archive-q-block">
                    <div class="qa-archive-q-text">${qIdx + 1}. ${q.q}</div>
                    <div class="qa-archive-ans-row">正确答案: <strong style="color:#111;">${q.answer}</strong></div>
                    <div class="qa-archive-ans-row">作答选择: <strong>${q.userChoice || '未作答'}</strong> ${statusIcon}</div>
                    ${expHtml}
                </div>
            `;
        });

        const card = document.createElement('div');
        card.className = 'qa-archive-card';
        card.innerHTML = `
            <!-- 👇 注意这里：onclick 改成了调用我们新写的 JS 引擎 👇 -->
            <div class="qa-archive-header" onclick="toggleQaArchiveCard(this)">
                <div class="qa-archive-info">
                    <div class="qa-archive-title">${title}</div>
                    <div class="qa-archive-meta">${dateStr}</div>
                </div>
                <div style="display: flex; align-items: center; gap: 12px;">
                    <div class="qa-archive-score ${scoreClass}">${scoreSign}${session.scoreEarned}</div>
                    <svg class="qa-archive-chevron" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"></polyline></svg>
                </div>
            </div>
            <div class="qa-archive-body">
                <div class="qa-archive-content-inner">
                    ${questionsHtml}
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}
// ==========================================
// 恋人空间：时空信箱 (Shrine & Stars) 核心逻辑
// ==========================================
// 1. 打开时空信箱全屏主页
function lsOpenLettersView() {
    if (!lsState.boundCharId) return alert("请先在首页绑定一位恋人哦~");
    
    let view = document.getElementById('ls-view-letters');
    if (!view) {
        view = document.createElement('div');
        view.id = 'ls-view-letters';
        view.className = 'ins-shrine-view';
        document.getElementById('loversSpaceModal').appendChild(view);
    }
    
    const char = wcState.characters.find(c => c.id === lsState.boundCharId);
    const charName = char ? char.name : "You";

    // 动态生成信件列表 HTML
    let lettersHtml = '';
    if (lsState.letters && lsState.letters.length > 0) {
        const sortedLetters = [...lsState.letters].sort((a, b) => b.time - a.time);
        sortedLetters.forEach(l => {
            const dateStr = new Date(l.time).toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '.');
            lettersHtml += `<li onclick="lsOpenLetterDetail(${l.id})"><span>${l.title}</span><span>${dateStr}</span></li>`;
        });
    } else {
        lettersHtml = '<li style="justify-content:center; color:#999;">暂无信件记录</li>';
    }

    view.innerHTML = `
        <div class="shrine-nav">
            <div class="shrine-nav-btn" onclick="lsCloseLettersView()">
                <svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"></polyline></svg>
            </div>
            <div class="shrine-nav-title">TIME MAILBOX</div>
            <div style="width: 40px;"></div>
        </div>

        <div class="shrine-space">
            <!-- 主纸片 (未来信件) -->
            <div class="paper-main">
                <div class="tape tape-1"></div>
                <h2>TIME MAILBOX</h2>
                <div class="greeting">To My Beloved：</div>
                <div class="paragraph">
                    你好。<br>
                    这是一封来自未来的信件。时间在这里失去了意义，只有思念被折叠成文字，投递进无垠的星海。请查收属于我们的记忆碎片。
                </div>

                <div class="bill-title">未来信件</div>
                <div class="bill-subtitle">ARCHIVES OF TIME</div>
                
                <!-- 可滑动的信件列表 -->
                <div class="bill-list-container">
                    <ul class="bill-list">
                        ${lettersHtml}
                    </ul>
                </div>

                <div class="signature-box">
                    <span class="signature-label">Recipient</span>
                    <span class="signature-name">${charName}</span>
                </div>
            </div>

            <!-- 副纸片 (祈愿卡 - 绑定点击事件，内含下雨特效) -->
            <div class="paper-sub" onclick="lsOpenShrineModal()">
                <div class="rain-container">
                    <div class="drop"></div><div class="drop"></div><div class="drop"></div><div class="drop"></div><div class="drop"></div>
                </div>
                <div class="paper-sub-content">
                    <p>PRAYER</p>
                    <h3>聆听星空的回音</h3>
                    <div class="tags">点击开启祈愿<br>抽取命运的羁绊</div>
                </div>
                <div class="tape tape-2"></div>
            </div>
        </div>

        <div class="shrine-footer">
            <button class="shrine-write-btn" onclick="lsOpenUserLetterInput()">
                <svg viewBox="0 0 24 24"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                <span>提笔写信</span>
            </button>
        </div>

        <!-- 祈愿弹窗 -->
        <div id="ls-shrine-modal" class="shrine-modal-overlay" onclick="lsCloseShrineModal()">
            <div class="shrine-modal-box" onclick="event.stopPropagation()">
                <div class="shrine-modal-title">星空の指引</div>
                <button class="shrine-modal-btn primary" onclick="lsGenerateAILetter()" id="btn-ai-pray">生成未来信件</button>
                <button class="shrine-modal-btn secondary" onclick="lsOpenLetterList()">查看过去信件</button>
            </div>
        </div>

        <!-- 祈愿生成动画覆盖层 (心电图 + 塔罗牌) -->
        <div id="ls-pray-animation-overlay" class="pray-anim-overlay">
            <!-- 方案三：命运交叉线 SVG -->
            <div class="ecg-container" id="ecg-anim">
                <svg viewBox="0 0 200 120" width="100%" height="100%">
                    <path class="ecg-path" d="M 0 96 L 50 96 L 55 66 L 62.5 120 L 70 84 L 75 96 L 100 96 C 125 96, 155 66, 155 36 C 155 6, 100 6, 100 36" />
                    <path class="ecg-path" d="M 200 96 L 150 96 L 145 66 L 137.5 120 L 130 84 L 125 96 L 100 96 C 75 96, 45 66, 45 36 C 45 6, 100 6, 100 36" />
                </svg>
            </div>

            <!-- 塔罗牌 3D 容器 -->
            <div class="tarot-glow"></div>
            <div class="tarot-container" id="tarot-anim" onclick="lsFlipTarot()">
                <div class="tarot-card" id="tarot-card">
                    <div class="tarot-face tarot-back"></div>
                    <div class="tarot-face tarot-front">
                        <img id="tarot-front-img" src="" alt="命运的指引">
                    </div>
                </div>
                <div class="tarot-hint">点击翻开命运的指引</div>
                <div class="tarot-desc-box">
                    <div class="tarot-name" id="tarot-name-display"></div>
                    <div class="tarot-meaning" id="tarot-meaning-display"></div>
                </div>
            </div>
        </div>

        <!-- 信件列表全屏页 -->
        <div id="ls-letter-list-view" class="shrine-list-view">
            <div class="shrine-nav" style="border-bottom: 1px solid rgba(255,255,255,0.1);">
                <div class="shrine-nav-btn" onclick="lsCloseLetterList()">
                    <svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"></polyline></svg>
                </div>
                <div class="shrine-nav-title">STAR ARCHIVES</div>
                <div style="width: 40px;"></div>
            </div>
            <div class="shrine-list-content" id="ls-shrine-list-content"></div>
        </div>
        
        <!-- 用户写信全屏页面 -->
        <div id="ls-user-write-view" class="ins-paper-view">
            <div class="ins-paper-nav">
                <div onclick="lsCloseUserLetterInput()" style="cursor:pointer; color:#888;">CANCEL</div>
                <div onclick="lsSubmitUserLetter()" style="cursor:pointer; color:#111; font-weight:bold;">SEND</div>
            </div>
            <div class="ins-paper-content">
                <input type="text" id="ls-write-title" class="ins-paper-title-input" placeholder="信件标题 (如：写在失眠的夜)">
                <textarea id="ls-write-body" class="ins-paper-textarea" placeholder="提笔写下你想对 Ta 说的话..."></textarea>
            </div>
        </div>

        <!-- 阅读信件全屏页面 -->
        <div id="ls-letter-detail-modal" class="ins-paper-view">
            <div class="ins-paper-nav">
                <div onclick="lsCloseLetterDetail()" style="cursor:pointer; color:#888;">CLOSE</div>
                <div id="ls-letter-detail-date" style="font-family: monospace; color:#CCC;"></div>
            </div>
            <div class="ins-paper-content">
                <h3 id="ls-letter-detail-title" class="ins-paper-read-title"></h3>
                <div id="ls-letter-detail-content" class="ins-paper-read-text"></div>
                <div class="ins-paper-read-author" id="ls-letter-detail-author"></div>
            </div>
            <div class="ins-paper-actions">
                <div class="ins-paper-action-btn delete" onclick="lsDeleteCurrentLetter()">销毁此信</div>
                <div class="ins-paper-action-btn reply" id="ls-btn-request-reply" onclick="lsRequestReply()">祈求 Ta 的回信</div>
            </div>
        </div>
    `;
    
    view.style.display = 'flex';
    setTimeout(() => view.classList.add('active'), 10);
}

function lsCloseLettersView() {
    const view = document.getElementById('ls-view-letters');
    if (view) {
        view.classList.remove('active');
        setTimeout(() => view.style.display = 'none', 400);
    }
    const audio = document.getElementById('ls-letters-audio');
    if (audio) audio.pause();
}

// 音乐播放控制
function lsToggleLettersMusic() {
    const audio = document.getElementById('ls-letters-audio');
    const icon = document.getElementById('ls-letters-play-icon');
    if (!audio || !icon) return;

    if (audio.paused) {
        audio.play();
        icon.innerHTML = '<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" fill="currentColor"/>';
    } else {
        audio.pause();
        icon.innerHTML = '<path d="M8 5v14l11-7z" fill="currentColor"/>';
    }
}

// 图片上传、文案编辑
function lsHandleLettersUpload(input, type) {
    const file = input.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            if (!lsState.lettersConfig) lsState.lettersConfig = {};
            lsState.lettersConfig[type] = e.target.result;
            lsSaveData();
            
            if (type === 'bg') {
                document.getElementById('ls-letters-bg').style.backgroundImage = `url('${e.target.result}')`;
                document.getElementById('ls-letters-bg').style.backgroundSize = 'cover';
                document.getElementById('ls-letters-bg').style.backgroundPosition = 'center';
            } else if (type === 'img1') {
                const el = document.getElementById('ls-letters-img1');
                el.style.backgroundImage = `url('${e.target.result}')`;
                const placeholder = document.getElementById('ls-img1-placeholder');
                if (placeholder) placeholder.style.display = 'none';
            } else if (type === 'img2') {
                const el = document.getElementById('ls-letters-img2');
                el.style.backgroundImage = `url('${e.target.result}')`;
                const placeholder = document.getElementById('ls-img2-placeholder');
                if (placeholder) placeholder.style.display = 'none';
            }
        };
        reader.readAsDataURL(file);
    }
}

function lsEditLettersText() {
    const currentText = lsState.lettersConfig?.text || '在这个宇宙，我们终会相遇';
    openTextEditModal("编辑文案", "请输入图片下方的文案", currentText, (val) => {
        if (val) {
            if (!lsState.lettersConfig) lsState.lettersConfig = {};
            lsState.lettersConfig.text = val;
            lsSaveData();
            const textEl = document.getElementById('ls-letters-text');
            if (textEl) textEl.innerText = val;
        }
    });
}

function lsEditLettersPoem() {
    const currentPoem = lsState.lettersConfig?.poem || 'In the universe of time,<br>we will eventually meet.';
    // 将 <br> 转换回换行符方便编辑
    const plainText = currentPoem.replace(/<br>/g, '\n');
    
    openIosTextEditModal("编辑诗句", plainText, (val) => {
        if (val) {
            // 将换行符转换为 <br>
            const htmlText = val.replace(/\n/g, '<br>');
            if (!lsState.lettersConfig) lsState.lettersConfig = {};
            lsState.lettersConfig.poem = htmlText;
            lsSaveData();
            const poemEl = document.getElementById('ls-letters-poem');
            if (poemEl) poemEl.innerHTML = htmlText;
        }
    });
}

window.lsGlobalRipple = function(e) {
    const target = document.getElementById('ls-view-letters');
    if (!target) return;

    const ripple = document.createElement('div');
    ripple.className = 'water-ripple';
    
    const size = 150; 
    ripple.style.width = ripple.style.height = `${size}px`;
    
    const rect = target.getBoundingClientRect();
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;
    ripple.style.zIndex = '9999'; // 确保涟漪在最上层显示
    
    target.appendChild(ripple);
    
    setTimeout(() => { ripple.remove(); }, 600);
};

function lsTriggerRippleAndModal(e) {
    e.stopPropagation(); // 阻止冒泡，防止触发两次涟漪
    lsGlobalRipple(e);   // 触发涟漪
    lsOpenShrineModal(); // 打开祈愿弹窗
}

function lsOpenUploadMenu() {
    const modal = document.getElementById('ls-upload-menu-modal');
    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('active'), 10);
}

function lsCloseUploadMenu() {
    const modal = document.getElementById('ls-upload-menu-modal');
    modal.classList.remove('active');
    setTimeout(() => modal.style.display = 'none', 300);
}
// 2. 渲染闪烁且瞬移的星光
function lsRenderStarlights() {
    const space = document.getElementById('ls-shrine-space');
    if (!space) return;

    const oldStars = space.querySelectorAll('.shrine-starlight');
    oldStars.forEach(star => star.remove());

    if (!lsState.letters) lsState.letters = [];

    lsState.letters.forEach((letter) => {
        const isFromChar = letter.from === 'char';
        const star = document.createElement('div');
        
        // 改为小圆点类名
        star.className = `shrine-starlight dot-star ${isFromChar ? 'star-gold' : 'star-blue'}`;
        
        star.style.left = Math.random() * 90 + 5 + '%';
        star.style.top = Math.random() * 90 + 5 + '%';
        
        const duration = 1.5 + Math.random() * 2; 
        const delay = Math.random() * 2;
        star.style.animationDuration = `${duration}s`;
        star.style.animationDelay = `${delay}s`;

        star.onclick = () => lsOpenLetterDetail(letter.id);
        space.appendChild(star);
    });
}

// 3. 弹窗与列表控制
function lsOpenShrineModal() {
    const modal = document.getElementById('ls-shrine-modal');
    modal.style.display = 'flex'; // 👈 先显示出来
    setTimeout(() => modal.classList.add('active'), 10); // 👈 再触发透明度动画
}
function lsCloseShrineModal() {
    const modal = document.getElementById('ls-shrine-modal');
    modal.classList.remove('active'); // 👈 先触发透明度消失动画
    setTimeout(() => modal.style.display = 'none', 300); // 👈 动画结束后彻底隐藏
}

function lsOpenLetterList() {
    lsCloseShrineModal();
    const container = document.getElementById('ls-shrine-list-content');
    container.innerHTML = '';

    if (!lsState.letters || lsState.letters.length === 0) {
        container.innerHTML = '<div class="shrine-list-empty">星空档案室空空如也</div>';
    } else {
        const sortedLetters = [...lsState.letters].sort((a, b) => b.time - a.time);
        sortedLetters.forEach(letter => {
            const dateStr = new Date(letter.time).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            const isFromChar = letter.from === 'char';
            const tagText = isFromChar ? 'FROM TA' : 'FROM ME';
            const tagClass = isFromChar ? 'tag-gold' : 'tag-blue';

            const div = document.createElement('div');
            div.className = 'shrine-list-card';
            div.innerHTML = `
                <div class="shrine-list-card-top">
                    <span class="shrine-list-tag ${tagClass}">${tagText}</span>
                    <span class="shrine-list-date">${dateStr}</span>
                </div>
                <div class="shrine-list-card-title">${letter.title}</div>
                <div class="shrine-list-card-preview">${letter.content.substring(0, 30)}...</div>
            `;
            div.onclick = () => lsOpenLetterDetail(letter.id);
            container.appendChild(div);
        });
    }

    // 👇 修改这里：先设置为 flex 显示，再延迟触发滑入动画
    const view = document.getElementById('ls-letter-list-view');
    view.style.display = 'flex';
    setTimeout(() => view.classList.add('active'), 10);
}

function lsCloseLetterList() {
    // 👇 修改这里：先触发滑出动画，等动画结束（400ms）后再彻底隐藏
    const view = document.getElementById('ls-letter-list-view');
    view.classList.remove('active');
    setTimeout(() => view.style.display = 'none', 400);
}

// ==========================================
// 塔罗牌数据库 (多节点自动切换，确保 100% 加载成功)
// ==========================================
const globalTarotDeck = [
    { id: "06", name: "恋人 (The Lovers)", sources: ["https://wsrv.nl/?url=upload.wikimedia.org/wikipedia/commons/d/db/Rider-Waite_Tarot_06_Lovers.jpg", "https://www.trustedtarot.com/img/cards/the-lovers.png", "https://sacred-texts.com/tarot/pkt/img/ar06.jpg"] },
    { id: "17", name: "星星 (The Star)", sources: ["https://wsrv.nl/?url=upload.wikimedia.org/wikipedia/en/c/cd/RWS_Tarot_17_Star.jpg", "https://www.trustedtarot.com/img/cards/the-star.png", "https://sacred-texts.com/tarot/pkt/img/ar17.jpg"] },
    { id: "19", name: "太阳 (The Sun)", sources: ["https://wsrv.nl/?url=upload.wikimedia.org/wikipedia/en/1/17/RWS_Tarot_19_Sun.jpg", "https://www.trustedtarot.com/img/cards/the-sun.png", "https://sacred-texts.com/tarot/pkt/img/ar19.jpg"] },
    { id: "10", name: "命运之轮 (Wheel of Fortune)", sources: ["https://wsrv.nl/?url=upload.wikimedia.org/wikipedia/en/3/3c/RWS_Tarot_10_Wheel_of_Fortune.jpg", "https://www.trustedtarot.com/img/cards/wheel-of-fortune.png", "https://sacred-texts.com/tarot/pkt/img/ar10.jpg"] },
    { id: "00", name: "愚者 (The Fool)", sources: ["https://wsrv.nl/?url=upload.wikimedia.org/wikipedia/en/9/90/RWS_Tarot_00_Fool.jpg", "https://www.trustedtarot.com/img/cards/the-fool.png", "https://sacred-texts.com/tarot/pkt/img/ar00.jpg"] },
    { id: "02", name: "女祭司 (The High Priestess)", sources: ["https://wsrv.nl/?url=upload.wikimedia.org/wikipedia/en/8/88/RWS_Tarot_02_High_Priestess.jpg", "https://www.trustedtarot.com/img/cards/the-high-priestess.png", "https://sacred-texts.com/tarot/pkt/img/ar02.jpg"] },
    { id: "03", name: "女皇 (The Empress)", sources: ["https://wsrv.nl/?url=upload.wikimedia.org/wikipedia/en/d/d2/RWS_Tarot_03_Empress.jpg", "https://www.trustedtarot.com/img/cards/the-empress.png", "https://sacred-texts.com/tarot/pkt/img/ar03.jpg"] },
    { id: "08", name: "力量 (Strength)", sources: ["https://wsrv.nl/?url=upload.wikimedia.org/wikipedia/en/f/f5/RWS_Tarot_08_Strength.jpg", "https://www.trustedtarot.com/img/cards/strength.png", "https://sacred-texts.com/tarot/pkt/img/ar08.jpg"] },
    { id: "14", name: "节制 (Temperance)", sources: ["https://wsrv.nl/?url=upload.wikimedia.org/wikipedia/en/f/f8/RWS_Tarot_14_Temperance.jpg", "https://www.trustedtarot.com/img/cards/temperance.png", "https://sacred-texts.com/tarot/pkt/img/ar14.jpg"] },
    { id: "21", name: "世界 (The World)", sources: ["https://wsrv.nl/?url=upload.wikimedia.org/wikipedia/en/f/ff/RWS_Tarot_21_World.jpg", "https://www.trustedtarot.com/img/cards/the-world.png", "https://sacred-texts.com/tarot/pkt/img/ar21.jpg"] }
];

// 4. AI 生成信件 (带心电图与塔罗牌动画)
async function lsGenerateAILetter() {
    const charId = lsState.boundCharId;
    const char = wcState.characters.find(c => c.id === charId);
    if (!char) return;

    const apiConfig = await getActiveApiConfig('npc');
    if (!apiConfig || !apiConfig.key) return alert("请先配置 API");

    // 1. 关闭祈愿菜单，显示动画覆盖层
    lsCloseShrineModal();
    const animOverlay = document.getElementById('ls-pray-animation-overlay');
    animOverlay.style.display = 'flex';

    // 2. 显示心电图并播放动画
    const ecg = document.getElementById('ecg-anim');
    ecg.style.display = 'block';
    void ecg.offsetWidth; // 强制重绘
    ecg.classList.add('active');

    // 记录动画开始时间，确保心电图至少播放 4 秒
    const animStartTime = Date.now();

    try {
        const chatConfig = char.chatConfig || {};
        const userPersona = chatConfig.userPersona || wcState.user.persona || "无";
       
        const msgs = wcState.chats[char.id] || [];
        const recentMsgs = msgs.slice(-40).map(m => {
            if (m.isError || m.type === 'system') return null;
            let content = m.content;
            if (m.type !== 'text') content = `[${m.type}]`;
            return `${m.sender==='me'?'User':char.name}: ${content}`;
        }).filter(Boolean).join('\n');

        let wbInfo = "";
        if (worldbookEntries.length > 0 && chatConfig.worldbookEntries && chatConfig.worldbookEntries.length > 0) {
            const linkedEntries = worldbookEntries.filter(e => chatConfig.worldbookEntries.includes(e.id.toString()));
            if (linkedEntries.length > 0) {
                wbInfo = "【世界观参考】:\n" + linkedEntries.map(e => `${e.title}: ${e.desc}`).join('\n');
            }
        }

        let memoryText = "暂无特殊记忆。";
        let memoryCount = 0;
        if (char.memories && char.memories.length > 0) {
            memoryCount = char.memories.length;
            memoryText = char.memories.slice(0, 15).map(m => `- ${m.content}`).join('\n');
        }

        // 提取塔罗牌列表供 AI 选择
        const tarotOptions = globalTarotDeck.map(t => `${t.id}: ${t.name}`).join(', ');

        let prompt = `你扮演角色：${char.name}。\n人设：${char.prompt}\n${wbInfo}\n`;
        prompt += `【用户(User)面具/设定】：${userPersona}\n`;
        prompt += `【你们的共同记忆（共 ${memoryCount} 条记录）】：\n${memoryText}\n\n`;
        prompt += `【最近的聊天记录（40条上下文）】：\n${recentMsgs}\n\n`;
        
        prompt += `请以 ${char.name} 的口吻，给 User 写一封跨越时空的信，并为 User 抽取一张命运的塔罗牌。\n`;
        prompt += `【核心要求】：\n`;
        prompt += `1. 文风要求：极具高级感、日系/韩系文艺风、意识流、细腻且克制。不要太直白，要像深夜里的呢喃或散文诗。\n`;
        prompt += `2. 内容要求：必须结合【共同记忆】和【聊天记录】中的细节，表达你对 User 的深层情感。\n`;
        prompt += `3. 塔罗牌抽取：请根据当前的聊天氛围和你的心情，从以下列表中选择最合适的一张塔罗牌：[${tarotOptions}]。\n`;
        prompt += `4. 【绝对禁止】：全文严禁使用任何 emoji 表情符号！严禁出现颜文字！\n`;
        prompt += `5. 必须严格按照以下 JSON 格式返回：\n`;
        prompt += `{
  "title": "信件标题（如：写在星轨交汇时 / 听雨时的随笔）",
  "salutation": "对User的亲昵称呼：\\n见字如晤，",
  "content": "信件正文内容（支持使用 \\n 换行，字数400-600字左右）",
  "signature": "你的署名（如：永远爱你的 ${char.name}）",
  "tarotId": "你选择的塔罗牌ID（必须是两位数字，如 06）",
  "tarotMeaning": "结合当前语境，你给出的专属塔罗牌判词（一句话，文艺且深情）"
}\n`;

        const response = await fetch(`${apiConfig.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiConfig.key}` },
            body: JSON.stringify({
                model: apiConfig.model,
                messages: [{ role: "user", content: prompt }],
                temperature: parseFloat(apiConfig.temp) || 0.8,
                max_tokens: 4000
            })
        });

        const data = await response.json();
        let content = data.choices[0].message.content;
        content = content.replace(/<thinking>[\s\S]*?<\/thinking>/g, '').trim();
        content = content.replace(/```json/g, '').replace(/```/g, '').trim();
        const letterData = JSON.parse(content);

        const newLetterId = Date.now();
        if (!lsState.letters) lsState.letters = [];
        lsState.letters.push({
            id: newLetterId,
            from: 'char',
            title: letterData.title || '无题',
            salutation: letterData.salutation || '',
            content: letterData.content || '...',
            signature: letterData.signature || '',
            time: Date.now()
        });
        
        lsSaveData();
        
        // 3. 处理塔罗牌图片加载
        const tId = letterData.tarotId || "06";
        let selectedCard = globalTarotDeck.find(t => t.id === tId);
        if (!selectedCard) selectedCard = globalTarotDeck[0]; // 兜底恋人牌

        const imgEl = document.getElementById('tarot-front-img');
        let currentSourceIndex = 0;
        
        imgEl.onerror = function() {
            currentSourceIndex++;
            if (currentSourceIndex < selectedCard.sources.length) {
                imgEl.src = selectedCard.sources[currentSourceIndex];
            } else {
                imgEl.alt = "图片加载失败，请检查网络";
            }
        };
        imgEl.src = selectedCard.sources[0];

        document.getElementById('tarot-name-display').innerText = selectedCard.name;
        document.getElementById('tarot-meaning-display').innerText = letterData.tarotMeaning || "命运的齿轮已经开始转动。";

        // 4. 确保心电图至少播放了 4 秒
        const elapsedTime = Date.now() - animStartTime;
        const remainingTime = Math.max(0, 4000 - elapsedTime);

        setTimeout(() => {
            ecg.style.display = 'none';
            ecg.classList.remove('active');
            
            // 显示塔罗牌
            const tarot = document.getElementById('tarot-anim');
            tarot.classList.add('show');

            // 绑定点击翻转事件
            tarot.onclick = function() {
                const card = document.getElementById('tarot-card');
                if (card.classList.contains('flipped')) {
                    // 再次点击结束动画
                    animOverlay.style.display = 'none';
                    tarot.classList.remove('show');
                    card.classList.remove('flipped');
                    
                    // 刷新主页信件列表并打开信件详情
                    lsOpenLettersView();
                    setTimeout(() => {
                        lsOpenLetterDetail(newLetterId);
                    }, 300);
                } else {
                    // 第一次点击翻转
                    card.classList.add('flipped');
                }
            };

        }, remainingTime);

        if (typeof showMainSystemNotification === 'function') {
            showMainSystemNotification("星の神社", `收到了一封来自 ${char.name} 的誓言信件`, char.avatar);
        }

    } catch (e) {
        console.error(e);
        alert("祈愿失败，信号在星空中迷失了...");
        document.getElementById('ls-pray-animation-overlay').style.display = 'none';
    }
}

// 供全局调用的翻转函数 (兼容旧代码)
window.lsFlipTarot = function() {
    const card = document.getElementById('tarot-card');
    if (card) card.classList.add('flipped');
};


// 5. 用户写信逻辑
function lsOpenUserLetterInput() {
    document.getElementById('ls-write-title').value = '';
    document.getElementById('ls-write-body').value = '';
    
    const view = document.getElementById('ls-user-write-view');
    view.style.display = 'flex';
    setTimeout(() => view.classList.add('active'), 10);
}

function lsCloseUserLetterInput() {
    const view = document.getElementById('ls-user-write-view');
    view.classList.remove('active');
    setTimeout(() => view.style.display = 'none', 400);
}

function lsSubmitUserLetter() {
    const title = document.getElementById('ls-write-title').value.trim() || '写给你的信';
    const text = document.getElementById('ls-write-body').value.trim();
    
    if (!text) return alert("信件内容不能为空哦~");

    if (!lsState.letters) lsState.letters = [];
    lsState.letters.push({
        id: Date.now(),
        from: 'user',
        title: title,
        content: text,
        time: Date.now()
    });
    
    lsSaveData();
    lsRenderStarlights();
    lsCloseUserLetterInput();
    alert("信件已化作星光投递。你可以在星空中点击它，并祈求 Ta 的回信。");
}

// 6. 阅读信件与手动请求回信
let currentReadingLetterId = null;

function lsOpenLetterDetail(id) {
    const letter = lsState.letters.find(l => l.id === id);
    if (!letter) return;

    currentReadingLetterId = id;
    const char = wcState.characters.find(c => c.id === lsState.boundCharId);
    const authorName = letter.from === 'char' ? (char ? char.name : 'Ta') : 'Me';

    document.getElementById('ls-letter-detail-date').innerText = new Date(letter.time).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    document.getElementById('ls-letter-detail-title').innerText = letter.title;
    
    // 拼装称呼和正文
    let fullContent = '';
    if (letter.salutation) {
        fullContent += `<div style="font-weight: bold; margin-bottom: 15px; color: #3A3533;">${letter.salutation.replace(/\n/g, '<br>')}</div>`;
    }
    fullContent += letter.content.replace(/\n/g, '<br>');
    document.getElementById('ls-letter-detail-content').innerHTML = fullContent;

    // 渲染署名
    if (letter.signature) {
        document.getElementById('ls-letter-detail-author').innerHTML = letter.signature.replace(/\n/g, '<br>');
    } else {
        document.getElementById('ls-letter-detail-author').innerText = `— ${authorName}`;
    }

    // 控制回信按钮的显示与隐藏
    const replyBtn = document.getElementById('ls-btn-request-reply');
    if (letter.from === 'user') {
        replyBtn.style.display = 'block';
    } else {
        replyBtn.style.display = 'none';
    }

    const modal = document.getElementById('ls-letter-detail-modal');
    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('active'), 10);
}

function lsCloseLetterDetail() {
    const modal = document.getElementById('ls-letter-detail-modal');
    modal.classList.remove('active');
    setTimeout(() => modal.style.display = 'none', 400);
    currentReadingLetterId = null;
}

function lsDeleteCurrentLetter() {
    if (!currentReadingLetterId) return;
    if (confirm("确定要将这封信化作宇宙尘埃吗？")) {
        lsState.letters = lsState.letters.filter(l => l.id !== currentReadingLetterId);
        lsSaveData();
        lsRenderStarlights();
        lsCloseLetterDetail();
    }
}

// 7. 手动点击按钮，请求 AI 回信
async function lsRequestReply() {
    if (!currentReadingLetterId) return;
    const letter = lsState.letters.find(l => l.id === currentReadingLetterId);
    if (!letter || letter.from !== 'user') return;

    const charId = lsState.boundCharId;
    const char = wcState.characters.find(c => c.id === charId);
    if (!char) return;

    const apiConfig = await getActiveApiConfig('npc');
    if (!apiConfig || !apiConfig.key) return alert("请先配置 API");

    const replyBtn = document.getElementById('ls-btn-request-reply');
    const originalText = replyBtn.innerText;
    replyBtn.innerText = "Ta 正在提笔回信...";
    replyBtn.style.pointerEvents = 'none';
    replyBtn.style.opacity = '0.5';

    try {
        const chatConfig = char.chatConfig || {};
        const userPersona = chatConfig.userPersona || wcState.user.persona || "无";
        
        let wbInfo = "";
        if (worldbookEntries.length > 0 && chatConfig.worldbookEntries && chatConfig.worldbookEntries.length > 0) {
            const linkedEntries = worldbookEntries.filter(e => chatConfig.worldbookEntries.includes(e.id.toString()));
            if (linkedEntries.length > 0) {
                wbInfo = "【世界观参考】:\n" + linkedEntries.map(e => `${e.title}: ${e.desc}`).join('\n');
            }
        }

        let prompt = `你扮演角色：${char.name}。\n人设：${char.prompt}\n${wbInfo}\n`;
        prompt += `【用户(User)面具/设定】：${userPersona}\n\n`;
        
        prompt += `【核心事件】：User 刚刚在时空信箱中给你写了一封信，并祈求你的回信。\n`;
        prompt += `User 的信件标题：【${letter.title}】\n`;
        prompt += `User 的信件内容：\n${letter.content}\n\n`;
        
        prompt += `请你仔细阅读 User 的信件后，以 ${char.name} 的身份给 User 写一封回信。\n`;
        prompt += `【核心要求】：\n`;
        prompt += `1. 文风要求：极具高级感、日系/韩系文艺风、意识流、细腻且克制。要针对 User 信中的内容进行深情的回应。\n`;
        prompt += `2. 【绝对禁止】：全文严禁使用任何 emoji 表情符号！严禁出现颜文字！\n`;
        prompt += `3. 必须严格按照以下 JSON 格式返回：\n`;
        prompt += `{
  "title": "回信标题（如：展信佳 / 见字如面）",
  "salutation": "对User的亲昵称呼：\\n见字如晤，",
  "content": "回信正文内容（支持使用 \\n 换行，字数400-600字左右）",
  "signature": "你的署名（如：永远爱你的 ${char.name}）"
}\n`;

        const response = await fetch(`${apiConfig.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiConfig.key}` },
            body: JSON.stringify({
                model: apiConfig.model,
                messages: [{ role: "user", content: prompt }],
                temperature: parseFloat(apiConfig.temp) || 0.8,
                max_tokens: 4000
            })
        });

        const data = await response.json();
        let content = data.choices[0].message.content;
        content = content.replace(/<thinking>[\s\S]*?<\/thinking>/g, '').trim();
        content = content.replace(/```json/g, '').replace(/```/g, '').trim();
        const letterData = JSON.parse(content);

        lsState.letters.push({
            id: Date.now(),
            from: 'char',
            title: letterData.title || '回信',
            salutation: letterData.salutation || '',
            content: letterData.content || '...',
            signature: letterData.signature || '',
            time: Date.now()
        });
        
        lsSaveData();
        lsRenderStarlights();
        
        alert("回信已送达！请退出当前信件，在星空中寻找那颗新出现的金色星光吧。");
        lsCloseLetterDetail();

    } catch (e) {
        console.error("回信失败", e);
        alert("回信在时空中迷失了，请重试...");
    } finally {
        replyBtn.innerText = originalText;
        replyBtn.style.pointerEvents = 'auto';
        replyBtn.style.opacity = '1';
    }
}
/* ==========================================================================
   APP 4: INS FORUM LOGIC (Advanced iOS Style - Twitter/INS Clone)
   ========================================================================== */
const forumState = {
    // 👇 新增：多窗口管理数据
    windows: [
        { id: 'default', name: 'Expansion Notice', prompt: '' }
    ],
    activeWindowId: 'default',
    actionWindowId: null, 
    
    // 👇 新增：热搜与书城数据
    hotSearches: [],
    books: [], // 书城里的书
    currentBookId: null, // 当前查看的书
    actionPostId: null, // 当前操作的同人文帖子ID
    readerPages: [], // 阅读器分页数据
    currentReaderPage: 0,
    // 👆 新增结束

    profile: {
        name: 'User',
        handle: '@user_id',
        avatar: '',
        bg: '', // 👈 新增背景图字段
        bio: '记录生活的美好',
        boundMaskId: null
    },

    config: {
        worldbookIds: [],
        charIds: [],
        maskIds: [],
        fanficStyle: '',
        fanficCharA: '',
        fanficCharB: '',
        fanficTrope: ''
    },
    posts: [], 
    privateChats: [], // 👈 修改这里：改为 privateChats，存储会话列表
    tempImage: null,
    tempAvatar: null,
    currentDetailPostId: null,
    pendingSharePostId: null,
    profileTab: 'posts',
    activePMChatId: null // 👈 新增：记录当前正在聊天的私信ID
};

async function forumLoadData() {
    const data = await idb.get('ins_forum_data');
    if (data) {
        if (data.windows) forumState.windows = data.windows;
        if (data.activeWindowId) forumState.activeWindowId = data.activeWindowId;
        if (data.profile) forumState.profile = { ...forumState.profile, ...data.profile };
        if (data.config) forumState.config = { ...forumState.config, ...data.config };
        if (data.posts) forumState.posts = data.posts;
        if (data.privateChats) forumState.privateChats = data.privateChats; 
        if (data.hotSearches) forumState.hotSearches = data.hotSearches; // 👈 新增
        if (data.books) forumState.books = data.books; // 👈 新增
    }
    // 兜底：如果没有窗口，初始化一个默认的
    if (!forumState.windows || forumState.windows.length === 0) {
        forumState.windows = [{ id: 'default', name: 'Expansion Notice', prompt: '' }];
        forumState.activeWindowId = 'default';
    }
    if (!forumState.profile.avatar) {
        forumState.profile.avatar = wcState.user.avatar;
        forumState.profile.name = wcState.user.name;
    }
}

async function forumSaveData() {
    await idb.set('ins_forum_data', {
        windows: forumState.windows,
        activeWindowId: forumState.activeWindowId,
        profile: forumState.profile,
        config: forumState.config,
        posts: forumState.posts,
        privateChats: forumState.privateChats,
        hotSearches: forumState.hotSearches, // 👈 新增
        books: forumState.books // 👈 新增
    });
}

// 生成虚拟的初始点赞数据，让帖子看起来有活人感
function forumGenerateFakeLikes() {
    const count = Math.floor(Math.random() * 80) + 15; // 随机 15 到 95 个赞
    const likes = [];
    for(let i = 0; i < count; i++) {
        likes.push(`fake_user_${Math.random().toString(36).substr(2, 5)}`);
    }
    return likes;
}

async function openForumApp() {
    await forumLoadData();
    document.getElementById('forumModal').classList.add('open');
    forumRenderWindows(); // 👈 新增：渲染顶部窗口列表
    forumSwitchTab('home');
}

function closeForumApp() {
    document.getElementById('forumModal').classList.remove('open');
}

// ==========================================
// 新增：多窗口管理核心逻辑
// ==========================================
function forumRenderWindows() {
    const container = document.getElementById('forum-windows-container');
    if (!container) return;
    container.innerHTML = '';

    forumState.windows.forEach(win => {
        const isActive = win.id === forumState.activeWindowId;
        const div = document.createElement('div');
        div.className = `forum-tab-item ${isActive ? 'active' : ''}`;
        div.onclick = () => forumSwitchWindow(win.id);
        
        div.innerHTML = `
            <svg class="tab-icon" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"/></svg>
            <span>${win.name}</span>
            <div class="tab-close" onclick="forumOpenWindowAction(event, '${win.id}')">
                <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </div>
        `;
        container.appendChild(div);
    });

    // 重新添加 + 号按钮
    const addBtn = document.createElement('div');
    addBtn.className = 'add-tab-btn';
    addBtn.innerText = '+';
    addBtn.onclick = forumOpenCreateWindow;
    container.appendChild(addBtn);

    // 滚动到激活的 Tab
    setTimeout(() => {
        const activeTab = container.querySelector('.forum-tab-item.active');
        if (activeTab) {
            // 修复：弃用 scrollIntoView，改用容器内部 scrollTo，彻底解决页面整体左移/偏移的 Bug
            const scrollLeft = activeTab.offsetLeft - (container.offsetWidth / 2) + (activeTab.offsetWidth / 2);
            container.scrollTo({ left: scrollLeft, behavior: 'smooth' });
        }
    }, 50);
}

function forumSwitchWindow(windowId) {
    if (forumState.activeWindowId === windowId) {
        // 如果点击的是当前窗口，且当前卡在热搜页或书城页，则强制回到主页
        const isSearchActive = document.getElementById('forum-view-search').classList.contains('active');
        const isBookstoreActive = document.getElementById('forum-view-bookstore').classList.contains('active');
        const isBookDetailActive = document.getElementById('forum-view-book-detail').classList.contains('active');
        if (isSearchActive || isBookstoreActive || isBookDetailActive) {
            forumSwitchTab('home');
        }
        return;
    }
    
    forumState.activeWindowId = windowId;
    forumSaveData();
    forumRenderWindows();
    
    // 检查当前是否在热搜页 (search) 或 书城页 (bookstore) 等没有底部高亮Tab的页面
    const isSearchActive = document.getElementById('forum-view-search').classList.contains('active');
    const isBookstoreActive = document.getElementById('forum-view-bookstore').classList.contains('active');
    const isBookDetailActive = document.getElementById('forum-view-book-detail').classList.contains('active');
    
    if (isSearchActive || isBookstoreActive || isBookDetailActive) {
        // 如果在热搜页或书城页点击了窗口，强制跳转回该窗口的 home 页面
        forumSwitchTab('home');
    } else {
        // 否则，保持在当前的底部 Tab (如 home, fanfic, profile)
        const activeTabBtn = document.querySelector('.tab-item.active');
        if (activeTabBtn) {
            const tabId = activeTabBtn.id.replace('forum-tab-', '');
            forumSwitchTab(tabId);
        } else {
            forumSwitchTab('home'); // 兜底
        }
    }
}

function forumOpenCreateWindow() {
    forumState.actionWindowId = null; // null 代表新建
    document.getElementById('forum-window-modal-title').innerText = '创建新窗口';
    document.getElementById('forum-window-name').value = '';
    document.getElementById('forum-window-prompt').value = '';
    wcOpenModal('forum-window-modal');
}

function forumOpenEditWindow() {
    wcCloseModal('forum-window-action-sheet');
    const win = forumState.windows.find(w => w.id === forumState.actionWindowId);
    if (!win) return;
    
    document.getElementById('forum-window-modal-title').innerText = '编辑窗口信息';
    document.getElementById('forum-window-name').value = win.name;
    document.getElementById('forum-window-prompt').value = win.prompt;
    wcOpenModal('forum-window-modal');
}

function forumSaveWindow() {
    const name = document.getElementById('forum-window-name').value.trim();
    const prompt = document.getElementById('forum-window-prompt').value.trim();
    
    if (!name) return alert("请输入窗口名称");

    if (forumState.actionWindowId) {
        // 编辑
        const win = forumState.windows.find(w => w.id === forumState.actionWindowId);
        if (win) {
            win.name = name;
            win.prompt = prompt;
        }
    } else {
        // 新建
        const newId = 'win_' + Date.now();
        forumState.windows.push({ id: newId, name: name, prompt: prompt });
        forumState.activeWindowId = newId; // 自动切换到新窗口
    }

    forumSaveData();
    wcCloseModal('forum-window-modal');
    forumRenderWindows();
    
    // 刷新 URL 显示
    const activeTabBtn = document.querySelector('.tab-item.active');
    if (activeTabBtn) {
        const tabId = activeTabBtn.id.replace('forum-tab-', '');
        forumSwitchTab(tabId);
    }
}

function forumOpenWindowAction(event, windowId) {
    event.stopPropagation(); // 阻止触发切换窗口
    forumState.actionWindowId = windowId;
    wcOpenModal('forum-window-action-sheet');
}

function forumDeleteWindow() {
    if (forumState.windows.length <= 1) {
        return alert("至少需要保留一个窗口哦！");
    }
    if (confirm("确定要删除这个窗口吗？该窗口下的所有帖子也将被删除！")) {
        const winId = forumState.actionWindowId;
        // 删除窗口
        forumState.windows = forumState.windows.filter(w => w.id !== winId);
        // 删除该窗口下的帖子
        forumState.posts = forumState.posts.filter(p => p.windowId !== winId);
        
        // 如果删除的是当前激活的窗口，自动切换到第一个
        if (forumState.activeWindowId === winId) {
            forumState.activeWindowId = forumState.windows[0].id;
        }
        
        forumSaveData();
        wcCloseModal('forum-window-action-sheet');
        forumRenderWindows();
        
        const activeTabBtn = document.querySelector('.tab-item.active');
        if (activeTabBtn) {
            const tabId = activeTabBtn.id.replace('forum-tab-', '');
            forumSwitchTab(tabId);
        }
    }
}

function forumSwitchTab(tab) {
    // 1. 隐藏所有页面和取消所有底部按钮高亮
    document.querySelectorAll('.ins-forum-view').forEach(el => {
        el.classList.remove('active');
        el.style.display = ''; 
    });
    document.querySelectorAll('.tab-item').forEach(el => el.classList.remove('active'));
    
    // 2. 处理私信页面的特殊逻辑
    if (tab === 'messages') {
        forumOpenPrivateMessages();
    } else {
        const view = document.getElementById(`forum-view-${tab}`);
        if (view) view.classList.add('active');
    }
    
    // 3. 激活对应的底部按钮
    const tabBtn = document.getElementById(`forum-tab-${tab}`);
    if (tabBtn) tabBtn.classList.add('active');
    
    // 4. 渲染对应页面的数据
    if (tab === 'home') {
        forumRenderPosts('home');
    } else if (tab === 'fanfic') {
        forumRenderPosts('fanfic');
    } else if (tab === 'post') {
        document.getElementById('forum-post-user-avatar').src = forumState.profile.avatar;
        document.getElementById('forum-post-user-name').innerText = forumState.profile.name;
    } else if (tab === 'profile') {
        forumRenderProfile();
    } else if (tab === 'search') {
        forumRenderHotSearches(); // 👈 新增
    } else if (tab === 'bookstore') {
        forumRenderBookstore(); // 👈 新增
    }

    // 5. 动态更新顶部电脑浏览器的 URL (跟随当前窗口名称)
    const currentWin = forumState.windows.find(w => w.id === forumState.activeWindowId);
    const winName = currentWin ? currentWin.name : 'Expansion Notice';
    
    let url = `https://forum.local/${encodeURIComponent(winName)}/home`;
    if (tab === 'fanfic') { url = `https://forum.local/${encodeURIComponent(winName)}/fanfic`; }
    else if (tab === 'post') { url = `https://forum.local/${encodeURIComponent(winName)}/compose`; }
    else if (tab === 'messages') { url = `https://forum.local/${encodeURIComponent(winName)}/messages`; }
    else if (tab === 'profile') { url = `https://forum.local/${encodeURIComponent(winName)}/profile`; }
    
    const topUrl = document.getElementById('urlInput'); // 👈 注意这里改成了 urlInput
    if (topUrl) topUrl.value = url;

    // 👇 6. 核心修改：控制右上角按钮的显隐 👇
    const genBtn = document.getElementById('forum-top-btn-generate');
    const setBtn = document.getElementById('forum-top-btn-settings');
    const customFanficBtn = document.getElementById('forum-top-btn-custom-fanfic');
    const genFanficBtn = document.getElementById('forum-top-btn-gen-fanfic');
    const hotSearchBtn = document.getElementById('forum-top-btn-hot-search'); // 👈 获取热搜按钮
    
    if (genBtn && setBtn && customFanficBtn && genFanficBtn) {
        // 先全部隐藏
        genBtn.style.display = 'none';
        setBtn.style.display = 'none';
        customFanficBtn.style.display = 'none';
        genFanficBtn.style.display = 'none';
        if (hotSearchBtn) hotSearchBtn.style.display = 'none'; // 👈 隐藏热搜按钮

        if (tab === 'profile') {
            setBtn.style.display = 'block';
        } else if (tab === 'home') {
            genBtn.style.display = 'block';
            genBtn.setAttribute('onclick', `forumGenerateAIPosts('home')`);
        } else if (tab === 'fanfic') {
            // 同人区显示专属的两个按键
            customFanficBtn.style.display = 'block';
            genFanficBtn.style.display = 'block';
        } else if (tab === 'search') {
            // 👈 热搜页专属：只显示热搜刷新按钮，其他按钮保持隐藏
            if (hotSearchBtn) hotSearchBtn.style.display = 'block';
        }
    }
}

// --- 渲染帖子列表 (推特风) ---
function forumRenderPosts(type) {
    const container = document.getElementById(`forum-post-list-${type}`);
    container.innerHTML = '';
    
    // 👈 核心修改：只渲染当前激活窗口的帖子
    const filteredPosts = forumState.posts.filter(p => p.type === type && p.windowId === forumState.activeWindowId).sort((a, b) => b.time - a.time);
    
    if (filteredPosts.length === 0) {
        container.innerHTML = '<div style="text-align: center; color: #888; padding: 60px 20px; font-size: 14px; font-style: italic;">这里空空如也<br>点击右上角让 AI 注入灵魂吧</div>';
        return;
    }
    
    filteredPosts.forEach(post => {
        container.appendChild(forumCreatePostElement(post));
    });
}

function forumCreatePostElement(post) {
    const div = document.createElement('div');
    div.className = 'ins-forum-post-card';
    
    const timeStr = new Date(post.time).toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    
    const isLiked = Array.isArray(post.likes) && post.likes.includes(forumState.profile.name);
    const likeIconFill = isLiked ? '#FF3B30' : 'none';
    const likeIconStroke = isLiked ? '#FF3B30' : '#888';

    const isSaved = Array.isArray(post.saves) && post.saves.includes(forumState.profile.name);
    const saveIconFill = isSaved ? '#111' : 'none';
    const saveIconStroke = isSaved ? '#111' : '#888';

    // 渲染标题
    let titleHtml = '';
    if (post.title) {
        // 增大字号到20px，字重900(最粗)，纯黑色，增加底部间距
        titleHtml = `<div style="font-size: 20px; font-weight: 900; color: #000; margin-bottom: 12px; line-height: 1.4; letter-spacing: 0.5px;">${post.title}</div>`;
    }

    // 渲染图片或占位符
    let imageHtml = '';
    if (post.image) {
        imageHtml = `<img src="${post.image}" class="ins-forum-post-image" onclick="event.stopPropagation(); wcPreviewImage('${post.image}')">`;
    } else if (post.imageDesc) {
        const safeDesc = post.imageDesc.replace(/'/g, "\\'").replace(/"/g, "&quot;");
        imageHtml = `<div class="wc-moment-image-placeholder" onclick="event.stopPropagation(); wcOpenImageDescCard('${safeDesc}')" style="margin-top: 12px;"><svg class="wc-icon" style="margin-bottom: 4px; width: 24px; height:24px;" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg><div style="font-size: 10px; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">${post.imageDesc}</div></div>`;
    }

    // 如果是同人小说，增加专属 Tag 和排版类名
    let tagHtml = '';
    let textClass = 'ins-forum-post-text';
    let moreOptionsHtml = ''; // 👈 新增
    
    // 核心修复：只要是同人区的帖子，或者带有 isStory 标签，都显示菜单键和排版
    if (post.isStory || post.type === 'fanfic') {
        tagHtml = `<div style="font-size: 12px; color: #AF52DE; background: rgba(175,82,222,0.1); padding: 4px 10px; border-radius: 6px; font-weight: bold; margin-bottom: 12px; display: inline-block;">📖 同人小说</div>`;
        textClass += ' ins-forum-story-text line-clamp-5'; 
        
        // 👈 新增：同人文专属的右上角菜单按钮
        moreOptionsHtml = `
            <div class="ins-forum-more-options" onclick="event.stopPropagation(); forumOpenFanficMenu(${post.id})">
                <svg viewBox="0 0 24 24"><circle cx="5" cy="12" r="2"></circle><circle cx="12" cy="12" r="2"></circle><circle cx="19" cy="12" r="2"></circle></svg>
            </div>
        `;
    }


    // 👇 新增：如果是用户自己发的帖子，且还没有评论，显示 AI 注入按钮 👇
    let aiInjectBtnHtml = '';
    if (post.author.name === forumState.profile.name && (!post.comments || post.comments.length === 0)) {
        aiInjectBtnHtml = `
            <div class="ins-forum-action-btn" onclick="event.stopPropagation(); forumGenerateInteractions(${post.id})" title="让AI注入互动">
                <svg viewBox="0 0 24 24" style="stroke: #AF52DE;"><path d="M21 16.05L15.95 21 4 9.05 9.05 4 21 16.05zM15.95 21l-5.05-5.05M9.05 4l5.05 5.05M13 3l1.5 3.5L18 8l-3.5 1.5L13 13l-1.5-3.5L8 8l3.5-1.5L13 3z"/></svg>
            </div>
        `;
    }
    div.innerHTML = `
        <div class="ins-forum-post-header">
            <img src="${post.author.avatar}" class="ins-forum-avatar-small">
            <div class="ins-forum-post-info">
                <span class="ins-forum-post-name">${post.author.name}</span>
                <span class="ins-forum-post-handle">${post.author.handle || '@' + post.author.name}</span>
            </div>
            <div style="display: flex; align-items: center; gap: 10px; margin-left: auto;">
                ${aiInjectBtnHtml}
                ${moreOptionsHtml}
            </div>
        </div>
        <div class="ins-forum-post-body" onclick="forumOpenPostDetail(${post.id})">

            ${tagHtml}
            ${titleHtml}
            <div class="${textClass}">${post.content}</div>
            ${imageHtml}
        </div>
        <div class="ins-forum-post-actions">
            <div class="action-btn" onclick="event.stopPropagation(); forumToggleLike(${post.id})">
                <svg viewBox="0 0 24 24" style="fill: ${likeIconFill}; stroke: ${likeIconStroke};"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                <span style="color: ${isLiked ? '#FF3B30' : '#888'}">${Array.isArray(post.likes) ? post.likes.length : (post.likes || 0)}</span>
            </div>
            <div class="action-btn" onclick="forumOpenPostDetail(${post.id})">
                <svg viewBox="0 0 24 24"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
                <span>${post.comments ? post.comments.length : 0}</span>
            </div>
            <div class="action-btn" onclick="event.stopPropagation(); forumOpenShareModal(${post.id})">
                <svg viewBox="0 0 24 24"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path><polyline points="16 6 12 2 8 6"></polyline><line x1="12" y1="2" x2="12" y2="15"></line></svg>
            </div>
            <div class="action-btn" onclick="event.stopPropagation(); forumToggleSave(${post.id})">
                <svg viewBox="0 0 24 24" style="fill: ${saveIconFill}; stroke: ${saveIconStroke};"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>
            </div>
            <div class="action-btn delete-btn" onclick="event.stopPropagation(); forumDeletePost(${post.id})">
                <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
            </div>
        </div>
        <div class="post-time">${timeStr}</div>
    `;
    return div;
}

// --- 发布与上传 ---
// 新增：切换图片上传类型
window.forumTogglePostImageType = function(type) {
    forumState.postImageType = type;
    document.getElementById('forum-seg-img-local').classList.toggle('active', type === 'local');
    document.getElementById('forum-seg-img-desc').classList.toggle('active', type === 'desc');
    document.getElementById('forum-area-img-local').style.display = type === 'local' ? 'block' : 'none';
    document.getElementById('forum-area-img-desc').style.display = type === 'desc' ? 'block' : 'none';
};

function forumHandleImageUpload(input) {
    const file = input.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            forumState.tempImage = e.target.result;
            document.getElementById('forum-post-image-preview').src = e.target.result;
            document.getElementById('forum-post-image-preview-container').style.display = 'block';
            document.getElementById('forum-image-upload-btn').style.display = 'none';
        };
        reader.readAsDataURL(file);
    }
}

window.forumRemoveImage = function() {
    forumState.tempImage = null;
    document.getElementById('forum-post-image-preview').src = '';
    document.getElementById('forum-post-image-preview-container').style.display = 'none';
    document.getElementById('forum-image-upload-btn').style.display = 'inline-flex';
    document.getElementById('forum-image-input').value = '';
};

function forumSubmitPost() {
    const title = document.getElementById('forum-post-title-input').value.trim();
    const content = document.getElementById('forum-post-input').value.trim();
    const postType = document.getElementById('forum-post-type-select').value; 
    const isAnonymous = document.getElementById('forum-post-anonymous').checked; 
    
    let image = null;
    let imageDesc = null;
    
    if (forumState.postImageType === 'desc') {
        imageDesc = document.getElementById('forum-post-img-desc-input').value.trim();
    } else {
        image = forumState.tempImage;
    }
    
    if (!content && !image && !imageDesc && !title) {
        return alert("请输入内容、标题或上传图片");
    }
    
    let authorName = forumState.profile.name;
    let authorHandle = forumState.profile.handle;
    let authorAvatar = forumState.profile.avatar;

    if (isAnonymous) {
        authorName = "匿名网友";
        authorHandle = "@anonymous";
        const defaultAvatarSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100" height="100" fill="#E5E5EA"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#888" font-size="30" font-weight="bold">匿</text></svg>`;
        authorAvatar = 'data:image/svg+xml;base64,' + window.btoa(unescape(encodeURIComponent(defaultAvatarSvg)));
    }

    const newPost = {
        id: Date.now(),
        windowId: forumState.activeWindowId, // 👈 核心修改：绑定当前窗口ID
        type: postType, 
        isStory: postType === 'fanfic', 
        title: title, 
        author: {
            name: authorName,
            handle: authorHandle,
            avatar: authorAvatar
        },
        content: content,
        image: image,
        imageDesc: imageDesc, // 👈 存入图片描述
        time: Date.now(),
        likes: [], 
        saves: [],
        comments: []
    };
    
    forumState.posts.unshift(newPost);
    forumSaveData();
    
    // 清空所有输入
    document.getElementById('forum-post-title-input').value = '';
    document.getElementById('forum-post-input').value = '';
    document.getElementById('forum-post-img-desc-input').value = '';
    if (document.getElementById('forum-post-image-preview-container')) {
        document.getElementById('forum-post-image-preview-container').style.display = 'none';
    }
    if (document.getElementById('forum-image-upload-btn')) {
        document.getElementById('forum-image-upload-btn').style.display = 'inline-flex';
    }
    document.getElementById('forum-post-anonymous').checked = false; 
    forumState.tempImage = null;
    if (typeof forumTogglePostImageType === 'function') forumTogglePostImageType('local');
    
    forumSwitchTab(postType); 
}


// --- 互动：点赞、评论、分享 ---
function forumToggleLike(postId) {
    const post = forumState.posts.find(p => p.id === postId);
    if (!post) return;
    
    if (!Array.isArray(post.likes)) post.likes = [];
    const idx = post.likes.indexOf(forumState.profile.name);
    
    if (idx > -1) {
        post.likes.splice(idx, 1);
    } else {
        post.likes.push(forumState.profile.name);
    }
    
    forumSaveData();
    
    if (document.getElementById('forum-view-home').classList.contains('active')) forumRenderPosts('home');
    if (document.getElementById('forum-view-fanfic').classList.contains('active')) forumRenderPosts('fanfic');
    if (document.getElementById('forum-view-profile').classList.contains('active')) forumRenderProfileList();
    if (document.getElementById('forum-post-detail-view').classList.contains('active')) forumRenderPostDetailContent();
}
function forumToggleSave(postId) {
    const post = forumState.posts.find(p => p.id === postId);
    if (!post) return;
    
    if (!Array.isArray(post.saves)) post.saves = [];
    const idx = post.saves.indexOf(forumState.profile.name);
    if (idx > -1) {
        post.saves.splice(idx, 1);
    } else {
        post.saves.push(forumState.profile.name);
    }
    
    forumSaveData();
    
    // 刷新当前视图
    if (document.getElementById('forum-view-home').classList.contains('active')) forumRenderPosts('home');
    if (document.getElementById('forum-view-fanfic').classList.contains('active')) forumRenderPosts('fanfic');
    if (document.getElementById('forum-view-profile').classList.contains('active')) forumRenderProfileList();
    if (document.getElementById('forum-post-detail-view').classList.contains('active')) forumRenderPostDetailContent();
}

function forumOpenPostDetail(postId) {
    forumState.currentDetailPostId = postId;
    document.getElementById('forum-post-detail-view').classList.add('active');
    forumRenderPostDetailContent();
}

function forumClosePostDetail() {
    document.getElementById('forum-post-detail-view').classList.remove('active');
    forumState.currentDetailPostId = null;
    
    if (document.getElementById('forum-view-home').classList.contains('active')) forumRenderPosts('home');
    if (document.getElementById('forum-view-fanfic').classList.contains('active')) forumRenderPosts('fanfic');
    if (document.getElementById('forum-view-profile').classList.contains('active')) forumRenderProfileList();
}
// --- 删除帖子逻辑 ---
function forumDeletePost(postId, isFromDetail = false) {
    if (confirm("确定要将这条帖子化作赛博尘埃吗？")) {
        // 从数据中过滤掉该帖子
        forumState.posts = forumState.posts.filter(p => p.id !== postId);
        forumSaveData();
        
        if (isFromDetail) {
            // 如果是在详情页删除的，关闭详情页（关闭时会自动刷新列表）
            forumClosePostDetail();
        } else {
            // 如果是在列表页删除的，直接刷新当前激活的 Tab
            if (document.getElementById('forum-view-home').classList.contains('active')) forumRenderPosts('home');
            if (document.getElementById('forum-view-fanfic').classList.contains('active')) forumRenderPosts('fanfic');
            if (document.getElementById('forum-view-profile').classList.contains('active')) forumRenderProfileList();
        }
    }
}

function forumRenderPostDetailContent() {
    const post = forumState.posts.find(p => p.id === forumState.currentDetailPostId);
    if (!post) return;
    
    const container = document.getElementById('forum-post-detail-content');
    
    const timeStr = new Date(post.time).toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    
    const isLiked = Array.isArray(post.likes) && post.likes.includes(forumState.profile.name);
    const likeIconFill = isLiked ? '#FF3B30' : 'none';
    const likeIconStroke = isLiked ? '#FF3B30' : '#888';

    const isSaved = Array.isArray(post.saves) && post.saves.includes(forumState.profile.name);
    const saveIconFill = isSaved ? '#111' : 'none';
    const saveIconStroke = isSaved ? '#111' : '#888';
    
    // 渲染标题 (详情页字号更大)
    let titleHtml = '';
    if (post.title) {
        // 增大字号到24px，纯黑色，增加底部间距，并加上一条极浅的分割线与正文彻底区分
        titleHtml = `<div style="font-size: 24px; font-weight: 900; color: #000; margin-bottom: 16px; line-height: 1.4; letter-spacing: 0.5px; border-bottom: 1px solid #F0F0F0; padding-bottom: 12px;">${post.title}</div>`;
    }

    // 渲染图片或占位符
    let imageHtml = '';
    if (post.image) {
        imageHtml = `<img src="${post.image}" class="ins-forum-post-image" style="margin-top: 15px;" onclick="wcPreviewImage('${post.image}')">`;
    } else if (post.imageDesc) {
        const safeDesc = post.imageDesc.replace(/'/g, "\\'").replace(/"/g, "&quot;");
        imageHtml = `<div class="wc-moment-image-placeholder" onclick="wcOpenImageDescCard('${safeDesc}')" style="margin-top: 15px;"><svg class="wc-icon" style="margin-bottom: 4px; width: 24px; height:24px;" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg><div style="font-size: 10px; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">${post.imageDesc}</div></div>`;
    }

    let tagHtml = '';
    let textClass = 'ins-forum-post-text';
    if (post.isStory) {
        tagHtml = `<div style="font-size: 12px; color: #AF52DE; background: rgba(175,82,222,0.1); padding: 4px 10px; border-radius: 6px; font-weight: bold; margin-bottom: 12px; display: inline-block;">📖 同人小说</div>`;
        textClass += ' ins-forum-story-text'; // 详情页不截断
    }
    
    let commentsHtml = '';
    if (post.comments && post.comments.length > 0) {
        post.comments.forEach(c => {
            // 👇 修改：给评论加上点击事件，触发回复 👇
            commentsHtml += `
                <div class="ins-forum-comment-item" onclick="forumPrepareReplyComment('${c.name}')" style="cursor: pointer;">
                    <img src="${c.avatar}" class="ins-forum-avatar-small">
                    <div class="ins-forum-comment-info">
                        <div style="display: flex; align-items: baseline; gap: 6px; margin-bottom: 4px;">
                            <span class="ins-forum-comment-name">${c.name}</span>
                            <span class="ins-forum-post-handle">${c.handle || '@'+c.name}</span>
                        </div>
                        <div class="ins-forum-comment-text">${c.content}</div>
                    </div>
                </div>
            `;
        });
    } else {
        commentsHtml = '<div style="text-align: center; color: #888; padding: 20px; font-size: 13px;">暂无评论，快来抢沙发</div>';
    }

    // 👇 新增：底部 AI 互动按钮 👇
    let aiActionHtml = '';
    if (!post.comments || post.comments.length === 0) {
        aiActionHtml = `
            <div style="text-align: center; padding: 20px 15px;">
                <button class="wc-btn-primary" style="background: #111; color: #FFF; border-radius: 20px; padding: 10px 24px; font-size: 14px; width: auto; margin: 0 auto; display: inline-flex; align-items: center; gap: 8px;" onclick="forumGenerateInteractions(${post.id})">
                    <svg viewBox="0 0 24 24" style="width: 18px; height: 18px; fill: none; stroke: currentColor; stroke-width: 2;"><path d="M21 16.05L15.95 21 4 9.05 9.05 4 21 16.05zM15.95 21l-5.05-5.05M9.05 4l5.05 5.05M13 3l1.5 3.5L18 8l-3.5 1.5L13 13l-1.5-3.5L8 8l3.5-1.5L13 3z"/></svg>
                    让 AI 注入点赞与评论
                </button>
            </div>
        `;
    } else {
        aiActionHtml = `
            <div style="text-align: center; padding: 20px 15px;">
                <button class="wc-btn-primary" style="background: #F5F5F5; color: #111; border: 1px solid #EAEAEA; border-radius: 20px; padding: 10px 24px; font-size: 14px; width: auto; margin: 0 auto; display: inline-flex; align-items: center; gap: 8px;" onclick="forumGenerateMoreComments(${post.id})">
                    <svg viewBox="0 0 24 24" style="width: 18px; height: 18px; fill: none; stroke: currentColor; stroke-width: 2;"><path d="M21 16.05L15.95 21 4 9.05 9.05 4 21 16.05zM15.95 21l-5.05-5.05M9.05 4l5.05 5.05M13 3l1.5 3.5L18 8l-3.5 1.5L13 13l-1.5-3.5L8 8l3.5-1.5L13 3z"/></svg>
                    加载更多 AI 评论
                </button>
            </div>
        `;
    }
    
    container.innerHTML = `
        <div class="ins-forum-post-header" style="padding: 20px 20px 10px 20px; position: relative;">
            <img src="${post.author.avatar}" class="ins-forum-avatar-small">
            <div class="ins-forum-post-info">
                <span class="ins-forum-post-name">${post.author.name}</span>
                <span class="ins-forum-post-handle">${post.author.handle || '@'+post.author.name}</span>
            </div>
            <!-- 新增：右上角高级感关闭按钮 -->
            <div class="ins-forum-detail-close" onclick="forumClosePostDetail()">
                <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </div>
        </div>
        <div class="ins-forum-post-body" style="padding: 0 20px 20px 20px; border-bottom: 1px solid #F0F0F0;">
            ${tagHtml}
            ${titleHtml}
            <div class="${textClass}" style="font-size: 16px;">${post.content}</div>
            ${imageHtml}
            
            <div class="ins-forum-post-actions" style="margin-top: 20px; padding-top: 16px; border-top: 1px solid #F9F9F9;">
                <div class="action-btn" onclick="forumToggleLike(${post.id})">
                    <svg viewBox="0 0 24 24" style="fill: ${likeIconFill}; stroke: ${likeIconStroke};"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                    <span style="color: ${isLiked ? '#FF3B30' : '#888'}">${Array.isArray(post.likes) ? post.likes.length : (post.likes || 0)}</span>
                </div>
                <div class="action-btn">
                    <svg viewBox="0 0 24 24"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
                    <span>${post.comments ? post.comments.length : 0}</span>
                </div>
                <div class="action-btn" onclick="forumOpenShareModal(${post.id})">
                    <svg viewBox="0 0 24 24"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path><polyline points="16 6 12 2 8 6"></polyline><line x1="12" y1="2" x2="12" y2="15"></line></svg>
                </div>
                <div class="action-btn" onclick="forumToggleSave(${post.id})">
                    <svg viewBox="0 0 24 24" style="fill: ${saveIconFill}; stroke: ${saveIconStroke};"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>
                </div>
                <div class="action-btn delete-btn" onclick="forumDeletePost(${post.id}, true)">
                    <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                </div>
            </div>
            <div class="post-time" style="margin-top: 10px;">${timeStr}</div>
        </div>
        <div class="ins-forum-comments-section">
            ${commentsHtml}
            ${aiActionHtml}
        </div>
    `;
}

function forumSubmitComment() {
    const input = document.getElementById('forum-comment-input');
    const text = input.value.trim();
    if (!text) return;
    
    const post = forumState.posts.find(p => p.id === forumState.currentDetailPostId);
    if (!post) return;
    
    let finalContent = text;
    if (forumState.replyingToComment) {
        finalContent = `回复 @${forumState.replyingToComment}: ${text}`;
    }
    
    // 👇 新增：判断是否勾选了匿名评论 👇
    const isAnonymous = document.getElementById('forum-comment-anonymous') && document.getElementById('forum-comment-anonymous').checked;
    let commenterName = forumState.profile.name;
    let commenterHandle = forumState.profile.handle;
    let commenterAvatar = forumState.profile.avatar;

    if (isAnonymous) {
        commenterName = "匿名网友";
        commenterHandle = "@anonymous";
        // 生成一个带“匿”字的默认灰色头像
        const defaultAvatarSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100" height="100" fill="#E5E5EA"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#888" font-size="30" font-weight="bold">匿</text></svg>`;
        commenterAvatar = 'data:image/svg+xml;base64,' + window.btoa(unescape(encodeURIComponent(defaultAvatarSvg)));
    }
    // 👆 新增结束 👆

    if (!post.comments) post.comments = [];
    post.comments.push({
        name: commenterName,       // 👈 使用处理后的名字
        handle: commenterHandle,   // 👈 使用处理后的ID
        avatar: commenterAvatar,   // 👈 使用处理后的头像
        content: finalContent,
        time: Date.now()
    });
    
    forumSaveData();
    input.value = '';
    input.placeholder = "发布评论...";
    forumState.replyingToComment = null; 
    
    // 评论完后自动取消勾选匿名，防止下次忘记关掉
    if (document.getElementById('forum-comment-anonymous')) {
        document.getElementById('forum-comment-anonymous').checked = false;
    }
    
    forumRenderPostDetailContent();
}

// --- 新增：用户评论后，AI 自动回复并概率掉落私信 ---
window.forumTriggerReactionToUser = async function(postId, userCommentText) {
    const post = forumState.posts.find(p => p.id === postId);
    if (!post) return;

    const apiConfig = await getActiveApiConfig('forum');
    if (!apiConfig || !apiConfig.key) return;

    // 静默加载，不打断用户浏览
    const loadingToast = document.createElement('div');
    loadingToast.style.cssText = 'position:fixed; top:60px; left:50%; transform:translateX(-50%); background:rgba(0,0,0,0.7); color:#fff; padding:8px 16px; border-radius:20px; font-size:12px; z-index:9999;';
    loadingToast.innerText = '网友正在回复你...';
    document.body.appendChild(loadingToast);

    try {
        let contextInfo = "";
        if (forumState.config.charIds.length > 0) {
            const chars = wcState.characters.filter(c => forumState.config.charIds.includes(c.id.toString()));
            if (chars.length > 0) contextInfo += "【你认识的熟人(NPC)设定】:\n" + chars.map(c => `${c.name}: ${c.prompt}`).join('\n') + "\n\n";
        }

        let prompt = `你现在是一个社交论坛的后台引擎。用户（${forumState.profile.name}）刚刚在帖子里发表了一条评论。\n`;
        prompt += `【原帖发帖人】：${post.author.name}\n`;
        prompt += `【原帖内容】：\n${post.content}\n\n`;
        prompt += `【用户的评论】：\n${userCommentText}\n\n`;
        prompt += `${contextInfo}`;
        prompt += `【要求】：\n`;
        prompt += `1. 请生成 5 到 10 条其他网友或 NPC 针对用户这条评论的【回复】。\n`;
        prompt += `2. 语气要极度口语化、有网感（如：确实、笑死、抱抱楼主等）。请注意【原帖发帖人】、评论人（User）和回复人之间的身份关系，绝对不要认错人！\n`;
        prompt += `3. 【私信掉落机制】：你有 35% 的概率生成一条发给用户的【私信】（比如有人想私下认识用户、或者 NPC 私下吐槽）。如果不生成私信，请将 privateMessage 设为 null。\n`;
        prompt += `4. 【最高防OOC指令】：你绝对不能以用户的身份（${forumState.profile.name}）发表评论！所有评论人和私信发送人只能是 NPC 或 虚构网友！\n`;
        prompt += `5. 返回纯 JSON 对象，格式如下：\n`;
        prompt += `{
  "comments": [
    {"name": "网友名字", "handle": "@ID", "content": "回复 @${forumState.profile.name}: 评论内容"}
  ],
  "privateMessage": {
    "senderName": "发件人名字",
    "content": "私信内容"
  }
}\n`;

        const response = await fetch(`${apiConfig.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiConfig.key}` },
            body: JSON.stringify({
                model: apiConfig.model,
                messages: [{ role: "user", content: prompt }],
                temperature: parseFloat(apiConfig.temp) || 0.8,
                max_tokens: 4000
            })
        });

        const data = await response.json();
        let content = data.choices[0].message.content;
        content = content.replace(/<thinking>[\s\S]*?<\/thinking>/g, '').trim();
        content = content.replace(/```json/g, '').replace(/```/g, '').trim();
        const result = JSON.parse(content);

        // 1. 处理追加的评论
        if (result.comments && result.comments.length > 0) {
            const processedComments = result.comments.map(c => {
                const cNpc = wcState.characters.find(char => char.name === c.name);
                return {
                    name: c.name,
                    handle: c.handle || '@' + c.name,
                    avatar: cNpc ? cNpc.avatar : getRandomNpcAvatar(),
                    content: c.content,
                    time: Date.now()
                };
            });
            post.comments.push(...processedComments);
        }

        // 2. 处理掉落的私信
        if (result.privateMessage && result.privateMessage.senderName && result.privateMessage.content) {
            const pm = result.privateMessage;
            const npc = wcState.characters.find(c => c.name === pm.senderName);
            const avatar = npc ? npc.avatar : getRandomNpcAvatar();

            if (!forumState.privateMessages) forumState.privateMessages = [];
            forumState.privateMessages.unshift({
                id: Date.now(),
                senderName: pm.senderName,
                avatar: avatar,
                content: pm.content,
                contextPreview: userCommentText.substring(0, 15) + '...',
                time: Date.now()
            });
            
            if (typeof showMainSystemNotification === 'function') {
                showMainSystemNotification("论坛私信", `收到来自 ${pm.senderName} 的新私信`, avatar);
            }
        }

        forumSaveData();
        if (forumState.currentDetailPostId === postId) {
            forumRenderPostDetailContent();
        }

    } catch (e) {
        console.error("AI 回复用户评论失败", e);
    } finally {
        loadingToast.remove();
    }
};

// ==========================================
// 👇 新增：AI 注入互动与加载更多评论逻辑 👇
// ==========================================

window.forumPrepareReplyComment = function(name) {
    forumState.replyingToComment = name;
    const input = document.getElementById('forum-comment-input');
    if (input) {
        input.placeholder = `回复 @${name}...`;
        input.focus();
    }
};

window.forumGenerateInteractions = async function(postId) {
    const post = forumState.posts.find(p => p.id === postId);
    if (!post) return;

    const apiConfig = await getActiveApiConfig('forum');
    if (!apiConfig || !apiConfig.key) return alert("请先配置 API");

    wcShowLoading("正在召唤网友...");

    try {
        let contextInfo = "";
        if (forumState.config.worldbookIds.length > 0) {
            const wbs = worldbookEntries.filter(e => forumState.config.worldbookIds.includes(e.id.toString()));
            if (wbs.length > 0) contextInfo += "【世界观背景】:\n" + wbs.map(e => `${e.title}: ${e.desc}`).join('\n') + "\n\n";
        }
        if (forumState.config.charIds.length > 0) {
            const chars = wcState.characters.filter(c => forumState.config.charIds.includes(c.id.toString()));
            if (chars.length > 0) contextInfo += "【你认识的熟人(NPC)设定】:\n" + chars.map(c => `${c.name}: ${c.prompt}`).join('\n') + "\n\n";
        }

        let prompt = `你现在是一个社交论坛的后台引擎。请为以下帖子生成 8 到 15 条极具“活人感”的评论。\n`;
        prompt += `【原帖发帖人】：${post.author.name}\n`;
        prompt += `【帖子内容】：\n${post.content}\n\n`;
        prompt += `${contextInfo}`;
        prompt += `【要求】：\n`;
        prompt += `1. 评论人可以是【你认识的熟人(NPC)】，也可以是虚构的网友。请根据【原帖发帖人】的身份，生成符合逻辑的互动评论，绝对不要把发帖人当成 User（除非发帖人真的是 User）！\n`;
        prompt += `2. 语气要极度口语化、有网感。评论区要有互动感（网友互相回复、吐槽等）。\n`;
        prompt += `3. 【私信掉落机制】：你有 35% 的概率生成一条发给用户的【私信】。如果不生成私信，请将 privateMessage 设为 null。\n`;
        prompt += `4. 【绝对禁止】：全文严禁使用任何 emoji 表情符号！严禁出现颜文字！\n`;
        prompt += `5. 【最高防OOC指令】：你绝对不能以用户的身份（${forumState.profile.name}）发表评论！所有评论人和私信发送人只能是 NPC 或 虚构网友！\n`;
        prompt += `6. 返回纯 JSON 对象，格式如下：\n`;
        prompt += `{
  "comments": [
    {"name": "评论人名字", "handle": "@ID", "content": "评论内容"}
  ],
  "privateMessage": {
    "senderName": "发件人名字",
    "content": "私信内容"
  }
}\n`;

        const response = await fetch(`${apiConfig.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiConfig.key}` },
            body: JSON.stringify({
                model: apiConfig.model,
                messages: [{ role: "user", content: prompt }],
                temperature: parseFloat(apiConfig.temp) || 0.8,
                max_tokens: 4000
            })
        });

        const data = await response.json();
        let content = data.choices[0].message.content;
        content = content.replace(/<thinking>[\s\S]*?<\/thinking>/g, '').trim();
        content = content.replace(/```json/g, '').replace(/```/g, '').trim();
        const result = JSON.parse(content);

        // 1. 增加点赞和评论
        const newLikes = forumGenerateFakeLikes();
        if (!Array.isArray(post.likes)) post.likes = [];
        post.likes.push(...newLikes);

        if (result.comments && result.comments.length > 0) {
            if (!post.comments) post.comments = [];
            const processedComments = result.comments.map(c => {
                const cNpc = wcState.characters.find(char => char.name === c.name);
                return {
                    name: c.name,
                    handle: c.handle || '@' + c.name,
                    avatar: cNpc ? cNpc.avatar : getRandomNpcAvatar(),
                    content: c.content,
                    time: Date.now()
                };
            });
            post.comments.push(...processedComments);
        }

        // 2. 处理掉落的私信 (升级为会话模式)
        if (result.privateMessage && result.privateMessage.senderName && result.privateMessage.content) {
            const pm = result.privateMessage;
            
            // 核心修复：查找是否已有该人在【当前窗口】的会话
            let chat = forumState.privateChats.find(c => c.targetName === pm.senderName && c.windowId === forumState.activeWindowId);
            if (!chat) {
                const npc = wcState.characters.find(c => c.name === pm.senderName);
                chat = {
                    id: Date.now().toString(),
                    windowId: forumState.activeWindowId, // 👈 绑定当前窗口
                    targetName: pm.senderName,
                    targetAvatar: npc ? npc.avatar : getRandomNpcAvatar(),
                    messages: [],
                    lastUpdateTime: Date.now()
                };
                forumState.privateChats.push(chat);
            }
            
            // 将新消息推入会话
            chat.messages.push({
                id: Date.now(),
                sender: 'them',
                content: pm.content,
                time: Date.now()
            });
            chat.lastUpdateTime = Date.now();
            
            if (typeof showMainSystemNotification === 'function') {
                showMainSystemNotification("论坛私信", `收到来自 ${pm.senderName} 的新私信`, chat.targetAvatar);
            }
        }

        forumSaveData();
        forumRenderPostDetailContent();
        if (document.getElementById('forum-view-home').classList.contains('active')) forumRenderPosts('home');
        if (document.getElementById('forum-view-fanfic').classList.contains('active')) forumRenderPosts('fanfic');
        if (document.getElementById('forum-view-profile').classList.contains('active')) forumRenderProfileList();
        
        wcShowSuccess("互动注入成功！");

    } catch (e) {
        console.error(e);
        wcShowError("生成失败");
    }
};

window.forumGenerateMoreComments = async function(postId) {
    const post = forumState.posts.find(p => p.id === postId);
    if (!post) return;

    const apiConfig = await getActiveApiConfig('forum');
    if (!apiConfig || !apiConfig.key) return alert("请先配置 API");

    wcShowLoading("正在加载更多评论...");

    try {
        let contextInfo = "";
        if (forumState.config.worldbookIds.length > 0) {
            const wbs = worldbookEntries.filter(e => forumState.config.worldbookIds.includes(e.id.toString()));
            if (wbs.length > 0) contextInfo += "【世界观背景】:\n" + wbs.map(e => `${e.title}: ${e.desc}`).join('\n') + "\n\n";
        }
        if (forumState.config.charIds.length > 0) {
            const chars = wcState.characters.filter(c => forumState.config.charIds.includes(c.id.toString()));
            if (chars.length > 0) contextInfo += "【你认识的熟人(NPC)设定】:\n" + chars.map(c => `${c.name}: ${c.prompt}`).join('\n') + "\n\n";
        }

        const existingComments = (post.comments || []).slice(-10).map(c => `${c.name}: ${c.content}`).join('\n');

        let prompt = `你现在是一个社交论坛的后台引擎。请为以下帖子继续生成 5 到 10 条后续评论。\n`;
        prompt += `【原帖发帖人】：${post.author.name}\n`;
        prompt += `【帖子内容】：\n${post.content}\n\n`;
        if (existingComments) {
            prompt += `【已有评论上下文】：\n${existingComments}\n\n`;
        }
        prompt += `${contextInfo}`;
        prompt += `【要求】：\n`;
        prompt += `1. 评论人可以是【你认识的熟人(NPC)】，也可以是虚构的网友。请根据【原帖发帖人】和【已有评论上下文】的身份关系进行回复，绝对不要认错人！\n`;
        prompt += `2. 语气要极度口语化、有网感。可以针对【已有评论上下文】进行回复（如：回复 @某某）。\n`;
        prompt += `3. 【私信掉落机制】：你有 35% 的概率生成一条发给用户的【私信】。如果不生成私信，请将 privateMessage 设为 null。\n`;
        prompt += `4. 【最高防OOC指令】：你绝对不能以用户的身份（${forumState.profile.name}）发表评论！所有评论人和私信发送人只能是 NPC 或 虚构网友！\n`;
        prompt += `5. 返回纯 JSON 对象，格式如下：\n`;
        prompt += `{
  "comments": [
    {"name": "评论人名字", "handle": "@ID", "content": "评论内容"}
  ],
  "privateMessage": {
    "senderName": "发件人名字",
    "content": "私信内容"
  }
}\n`;

        const response = await fetch(`${apiConfig.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiConfig.key}` },
            body: JSON.stringify({
                model: apiConfig.model,
                messages: [{ role: "user", content: prompt }],
                temperature: parseFloat(apiConfig.temp) || 0.8,
                max_tokens: 4000
            })
        });

        const data = await response.json();
        let content = data.choices[0].message.content;
        content = content.replace(/<thinking>[\s\S]*?<\/thinking>/g, '').trim();
        content = content.replace(/```json/g, '').replace(/```/g, '').trim();
        const result = JSON.parse(content);

        // 1. 处理追加的评论
        if (result.comments && result.comments.length > 0) {
            if (!post.comments) post.comments = [];
            const processedComments = result.comments.map(c => {
                const cNpc = wcState.characters.find(char => char.name === c.name);
                return {
                    name: c.name,
                    handle: c.handle || '@' + c.name,
                    avatar: cNpc ? cNpc.avatar : getRandomNpcAvatar(),
                    content: c.content,
                    time: Date.now()
                };
            });
            post.comments.push(...processedComments);
        }

        // 2. 处理掉落的私信 (升级为会话模式)
        if (result.privateMessage && result.privateMessage.senderName && result.privateMessage.content) {
            const pm = result.privateMessage;
            
            // 核心修复：查找是否已有该人在【当前窗口】的会话
            let chat = forumState.privateChats.find(c => c.targetName === pm.senderName && c.windowId === forumState.activeWindowId);
            if (!chat) {
                const npc = wcState.characters.find(c => c.name === pm.senderName);
                chat = {
                    id: Date.now().toString(),
                    windowId: forumState.activeWindowId, // 👈 绑定当前窗口
                    targetName: pm.senderName,
                    targetAvatar: npc ? npc.avatar : getRandomNpcAvatar(),
                    messages: [],
                    lastUpdateTime: Date.now()
                };
                forumState.privateChats.push(chat);
            }
            
            // 将新消息推入会话
            chat.messages.push({
                id: Date.now(),
                sender: 'them',
                content: pm.content,
                time: Date.now()
            });
            chat.lastUpdateTime = Date.now();
            
            if (typeof showMainSystemNotification === 'function') {
                showMainSystemNotification("论坛私信", `收到来自 ${pm.senderName} 的新私信`, chat.targetAvatar);
            }
        }

        forumSaveData();
        forumRenderPostDetailContent();
        if (document.getElementById('forum-view-home').classList.contains('active')) forumRenderPosts('home');
        if (document.getElementById('forum-view-fanfic').classList.contains('active')) forumRenderPosts('fanfic');
        if (document.getElementById('forum-view-profile').classList.contains('active')) forumRenderProfileList();
        
        wcShowSuccess("评论加载成功！");

    } catch (e) {
        console.error(e);
        wcShowError("生成失败");
    }
};
// --- 分享帖子给 Char ---
function forumOpenShareModal(postId) {
    forumState.pendingSharePostId = postId;
    const list = document.getElementById('forum-share-char-list');
    list.innerHTML = '';
    
    const chars = wcState.characters.filter(c => !c.isGroup);
    if (chars.length === 0) {
        list.innerHTML = '<div style="text-align:center; color:#999; padding:20px;">暂无联系人</div>';
    } else {
        chars.forEach(char => {
            const div = document.createElement('div');
            div.className = 'wc-list-item';
            div.style.background = 'white';
            div.style.borderBottom = '1px solid #F0F0F0';
            div.innerHTML = `
                <img src="${char.avatar}" class="wc-avatar" style="width:36px;height:36px;">
                <div class="wc-item-content"><div class="wc-item-title">${char.name}</div></div>
                <button class="wc-btn-mini" style="background:#111; color:white; border:none; padding:6px 16px; border-radius:16px; font-weight:bold;" onclick="forumConfirmShare(${char.id})">发送</button>
            `;
            list.appendChild(div);
        });
    }
    wcOpenModal('forum-modal-share');
}

function forumConfirmShare(charId) {
    const post = forumState.posts.find(p => p.id === forumState.pendingSharePostId);
    if (!post) return;

    // 构造高级感分享卡片
    const cardHtml = `
        <div class="chat-shared-card">
            <div class="shared-card-tag">FORUM POST</div>
            <div class="shared-card-title">${post.author.name} 的帖子</div>
            <div class="shared-card-content">${post.content}</div>
        </div>
    `;

    // 发送卡片到聊天
    wcAddMessage(charId, 'me', 'receipt', cardHtml);

    // 给 AI 发送隐藏的系统提示
    const aiPrompt = `[系统内部信息(仅AI可见): 用户在论坛看到了一篇帖子并分享给了你。发帖人：${post.author.name}。内容：“${post.content}”。请在回复中针对这篇帖子发表你的看法或吐槽。]`;
    wcAddMessage(charId, 'system', 'system', aiPrompt, { hidden: true });

    wcCloseModal('forum-modal-share');
    alert("已成功分享给 Ta！快去微信看看 Ta 的反应吧~");
}

// --- 个人信息与设置 (推特风重构) ---
function forumRenderProfile() {
    // 渲染背景图和头像
    const bgEl = document.getElementById('forum-profile-bg');
    if (forumState.profile.bg) {
        bgEl.style.backgroundImage = `url('${forumState.profile.bg}')`;
    } else {
        bgEl.style.backgroundImage = `url('https://i.postimg.cc/kgD9CsbW/IMG-8012.jpg')`; // 默认图
    }
    
    document.getElementById('forum-profile-avatar').src = forumState.profile.avatar;
    document.getElementById('forum-profile-name').innerText = forumState.profile.name;
    document.getElementById('forum-profile-handle').innerText = forumState.profile.handle;
    document.getElementById('forum-profile-bio').innerText = forumState.profile.bio;
    
    // 随机生成关注数 (仅作装饰)
    document.getElementById('forum-following-count').innerText = Math.floor(Math.random() * 50) + 10;
    document.getElementById('forum-follower-count').innerText = Math.floor(Math.random() * 500) + 50;
    
    forumSwitchProfileTab(forumState.profileTab);
}

function forumSwitchProfileTab(tab) {
    forumState.profileTab = tab;
    document.querySelectorAll('.ins-forum-profile-tab').forEach(el => el.classList.remove('active'));
    document.getElementById(`forum-profile-tab-${tab}`).classList.add('active');
    forumRenderProfileList();
}

function forumRenderProfileList() {
    const container = document.getElementById('forum-my-post-list');
    container.innerHTML = '';
    
    let list = [];
    
    if (forumState.profileTab === 'posts') {
        // 发布的帖子：与当前窗口独立
        list = forumState.posts.filter(p => p.author.name === forumState.profile.name && p.windowId === forumState.activeWindowId);
    } else if (forumState.profileTab === 'likes') {
        // 点赞的帖子：与当前窗口独立
        list = forumState.posts.filter(p => Array.isArray(p.likes) && p.likes.includes(forumState.profile.name) && p.windowId === forumState.activeWindowId);
    } else if (forumState.profileTab === 'saves') {
        // 核心修改：收藏的帖子是全局的！去掉 windowId 的限制
        list = forumState.posts.filter(p => Array.isArray(p.saves) && p.saves.includes(forumState.profile.name));
    }

    list.sort((a, b) => b.time - a.time);
    
    if (list.length === 0) {
        const emptyText = forumState.profileTab === 'saves' ? '暂无收藏的帖子' : '当前频道空空如也';
        container.innerHTML = `<div style="text-align: center; color: #888; padding: 60px 20px; font-size: 14px; font-style: italic;">${emptyText}</div>`;
        return;
    }
    
    list.forEach(post => {
        container.appendChild(forumCreatePostElement(post));
    });
}

function forumOpenEditProfile() {
    document.getElementById('forum-edit-name').value = forumState.profile.name;
    document.getElementById('forum-edit-handle').value = forumState.profile.handle;
    document.getElementById('forum-edit-bio').value = forumState.profile.bio;
    
    document.getElementById('forum-edit-avatar-url').value = '';
    document.getElementById('forum-edit-bg-url').value = '';
    
    forumState.tempAvatar = null;
    forumState.tempProfileBg = null;

    // 填充面具下拉框
    const maskSelect = document.getElementById('forum-edit-mask-select');
    if (maskSelect) {
        maskSelect.innerHTML = '<option value="">默认身份 (User)</option>';
        wcState.masks.forEach(m => {
            const isSelected = forumState.profile.boundMaskId == m.id ? 'selected' : '';
            maskSelect.innerHTML += `<option value="${m.id}" ${isSelected}>扮演: ${m.name}</option>`;
        });
    }

    wcOpenModal('forum-modal-edit-profile');
}

// 统一处理头像和背景图的本地上传
function forumHandleImageUploadForProfile(input, type) {
    const file = input.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            if (type === 'avatar') {
                forumState.tempAvatar = e.target.result;
                document.getElementById('forum-edit-avatar-url').value = '已选择本地图片';
            } else if (type === 'bg') {
                forumState.tempProfileBg = e.target.result;
                document.getElementById('forum-edit-bg-url').value = '已选择本地图片';
            }
        };
        reader.readAsDataURL(file);
    }
}

function forumSaveProfile() {
    const name = document.getElementById('forum-edit-name').value.trim();
    const handle = document.getElementById('forum-edit-handle').value.trim();
    const bio = document.getElementById('forum-edit-bio').value.trim();
    
    const avatarUrl = document.getElementById('forum-edit-avatar-url').value.trim();
    const bgUrl = document.getElementById('forum-edit-bg-url').value.trim();
    const maskId = document.getElementById('forum-edit-mask-select').value;

    // 1. 处理面具绑定
    if (!maskId) {
        forumState.profile.boundMaskId = null;
        forumState.profile.name = name || wcState.user.name;
        // 如果没有填新的头像，才恢复默认头像
        if (!avatarUrl && !forumState.tempAvatar) {
            forumState.profile.avatar = wcState.user.avatar;
        }
    } else {
        const mask = wcState.masks.find(m => m.id == maskId);
        if (mask) {
            forumState.profile.boundMaskId = mask.id;
            forumState.profile.name = mask.name;
            // 如果没有填新的头像，才使用面具头像
            if (!avatarUrl && !forumState.tempAvatar) {
                forumState.profile.avatar = mask.avatar;
            }
        }
    }

    // 2. 处理手动修改的名称和签名
    if (name && !maskId) forumState.profile.name = name;
    if (handle) forumState.profile.handle = handle.startsWith('@') ? handle : '@' + handle;
    if (bio) forumState.profile.bio = bio;
    
    // 3. 处理头像更新 (URL 优先，本地其次)
    if (avatarUrl && avatarUrl !== '已选择本地图片') {
        forumState.profile.avatar = avatarUrl;
    } else if (forumState.tempAvatar) {
        forumState.profile.avatar = forumState.tempAvatar;
    }
    
    // 4. 处理背景图更新
    if (bgUrl && bgUrl !== '已选择本地图片') {
        forumState.profile.bg = bgUrl;
    } else if (forumState.tempProfileBg) {
        forumState.profile.bg = forumState.tempProfileBg;
    }
    
    forumState.tempAvatar = null;
    forumState.tempProfileBg = null;
    
    forumSaveData();
    forumRenderProfile();
    wcCloseModal('forum-modal-edit-profile');
}
function forumOpenSettings() {
    // 渲染世界书列表
    const wbList = document.getElementById('forum-setting-wb-list');
    wbList.innerHTML = '';
    let forumWbCount = 0;
    if (forumState.config.worldbookIds) {
        forumState.config.worldbookIds.forEach(id => {
            wbList.innerHTML += `<input type="checkbox" value="${id}" class="forum-wb-cb" checked>`;
            forumWbCount++;
        });
    }
    document.getElementById('forum-setting-wb-count').innerText = `已选 ${forumWbCount} 项`;

    // 渲染角色列表
    const charList = document.getElementById('forum-setting-char-list');
    charList.innerHTML = '';
    wcState.characters.filter(c => !c.isGroup).forEach(char => {
        const isChecked = forumState.config.charIds.includes(char.id.toString());
        charList.innerHTML += `<div class="wc-checkbox-item"><input type="checkbox" value="${char.id}" class="forum-char-cb" ${isChecked ? 'checked' : ''}><span>${char.name}</span></div>`;
    });

    // 渲染面具列表
    const maskList = document.getElementById('forum-setting-mask-list');
    maskList.innerHTML = '';
    wcState.masks.forEach(mask => {
        const isChecked = forumState.config.maskIds.includes(mask.id.toString());
        maskList.innerHTML += `<div class="wc-checkbox-item"><input type="checkbox" value="${mask.id}" class="forum-mask-cb" ${isChecked ? 'checked' : ''}><span>${mask.name}</span></div>`;
    });

    wcOpenModal('forum-modal-settings');
}

function forumSaveSettings() {
    const wbCbs = document.querySelectorAll('.forum-wb-cb:checked');
    forumState.config.worldbookIds = Array.from(wbCbs).map(cb => cb.value);

    const charCbs = document.querySelectorAll('.forum-char-cb:checked');
    forumState.config.charIds = Array.from(charCbs).map(cb => cb.value);

    const maskCbs = document.querySelectorAll('.forum-mask-cb:checked');
    forumState.config.maskIds = Array.from(maskCbs).map(cb => cb.value);

    forumSaveData();
    wcCloseModal('forum-modal-settings');
    alert("设定已保存！AI 生成帖子时将参考这些背景。");
}

// --- 核心：高强度活人感 AI 生成 (8帖 + 6评 + 绝对禁止生成User + 覆盖未收藏的旧帖) ---
async function forumGenerateAIPosts(type) {
    const apiConfig = await getActiveApiConfig('forum');
    if (!apiConfig || !apiConfig.key) return alert("请先配置 API");

    const limit = apiConfig.limit || 50;
    if (limit > 0 && sessionApiCallCount >= limit) {
        wcShowError("已达到API调用上限");
        return;
    }
    sessionApiCallCount++;

    wcShowLoading("正在刷新高浓度活人动态...");

    try {
        forumState.posts = forumState.posts.filter(p => {
            if (p.type !== type) return true;
            if (p.author.name === forumState.profile.name) return true;
            if (Array.isArray(p.likes) && p.likes.includes(forumState.profile.name)) return true;
            if (Array.isArray(p.saves) && p.saves.includes(forumState.profile.name)) return true;
            return false;
        });

        let contextInfo = "";
        const currentWin = forumState.windows.find(w => w.id === forumState.activeWindowId);
        if (currentWin && currentWin.prompt) {
            contextInfo += `【当前论坛板块专属背景设定 (${currentWin.name})】:\n${currentWin.prompt}\n\n`;
        }
        
        if (forumState.config.worldbookIds.length > 0) {
            const wbs = worldbookEntries.filter(e => forumState.config.worldbookIds.includes(e.id.toString()));
            if (wbs.length > 0) {
                contextInfo += "【世界观背景】:\n" + wbs.map(e => `${e.title}: ${e.desc}`).join('\n') + "\n\n";
            }
        }
        
        let npcNames = [];
        if (forumState.config.charIds.length > 0) {
            const chars = wcState.characters.filter(c => forumState.config.charIds.includes(c.id.toString()));
            if (chars.length > 0) {
                contextInfo += "【你认识的熟人(NPC)设定】:\n" + chars.map(c => {
                    npcNames.push(c.name);
                    return `${c.name}: ${c.prompt}`;
                }).join('\n') + "\n\n";
            }
        }

        let userNames = [forumState.profile.name, wcState.user.name];
        if (forumState.config.maskIds.length > 0) {
            const masks = wcState.masks.filter(m => forumState.config.maskIds.includes(m.id.toString()));
            if (masks.length > 0) {
                contextInfo += "【关于我(User)的设定/马甲】:\n" + masks.map(m => {
                    userNames.push(m.name);
                    return `${m.name}: ${m.prompt}`;
                }).join('\n') + "\n\n";
            }
        }

        let prompt = `你现在是一个社交论坛的后台引擎。请生成一批极具“活人感”的论坛帖子和评论。\n`;
        if (type === 'home') {
            prompt += `论坛类型：日常主页。内容是生活吐槽、情感分享、日常记录、发疯文学等。\n`;
        } else {
            prompt += `论坛类型：同人论坛。内容是关于某些角色（可以是设定的NPC或虚构人物）的同人段子、脑洞、CP向发言、泥塑等。\n`;
        }
        
        prompt += `\n${contextInfo}`;
        
        prompt += `【核心强制要求（最高优先级）】：\n`;
        prompt += `1. 数量要求：必须一次性生成 6 到 10 条帖子！每条帖子必须包含至少 8 到 10 条评论！(减少数量防止截断)\n`;
        prompt += `2. 角色穿插：发帖人和评论人中，必须穿插出现【你认识的熟人(NPC)】（如果有的话：${npcNames.join(', ')}），以及大量虚构的网友。\n`;
        prompt += `3. 活人感：语气要极度口语化、有网感（如：笑死、救命、谁懂啊、破防了）。评论区要有互动感（网友互相回复、楼主回复网友）。\n`;
        prompt += `4. 【绝对禁止扮演用户】：上面提供的【关于我(User)的设定/马甲】仅供你作为背景参考（NPC可以发关于User的帖子或吐槽User）。但是，你绝对不能以 User（${userNames.join('、')}）的身份发帖或评论！User 会自己操作，不需要你代劳！所有发帖人和评论人只能是 NPC 或 虚构网友！\n`;                
        prompt += `5. 【身份隔离警告】：在生成 comments 时，必须清楚认知该帖子的 authorName 是谁！不要让 NPC 误以为帖子是 User 发的，除非帖子内容明确提到了 User！\n`;
        prompt += `6. 【绝对禁止】：全文严禁使用任何 emoji 表情符号！严禁出现颜文字！\n`;
        prompt += `7. 返回纯 JSON 数组，格式如下：\n`;
        prompt += `[
  {
    "title": "帖子标题(必须有，吸引眼球)",
    "authorName": "发帖人名字(NPC或网友)",
    "handle": "@英文ID",
    "content": "帖子的正文内容...",
    "comments": [
      {"name": "评论人名字", "handle": "@ID", "content": "评论内容"}
    ]
  }
]\n`;

        const response = await fetch(`${apiConfig.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiConfig.key}` },
            body: JSON.stringify({
                model: apiConfig.model,
                messages: [{ role: "user", content: prompt }],
                temperature: parseFloat(apiConfig.temp) || 0.9 
            })
        });

        const data = await response.json();
        let content = data.choices[0].message.content;
        content = content.replace(/<thinking>[\s\S]*?<\/thinking>/g, '').trim();
        content = content.replace(/```json/g, '').replace(/```/g, '').trim();
        
        // 强力 JSON 容错解析
        if (!content.endsWith(']')) {
            const lastBrace = content.lastIndexOf('}');
            if (lastBrace !== -1) {
                content = content.substring(0, lastBrace + 1) + ']';
            } else {
                content += '}]';
            }
        }

        let generatedPosts = [];
        try {
            generatedPosts = JSON.parse(content);
        } catch (e) {
            console.warn("JSON 解析失败，尝试正则提取兜底", e);
            const regex = /\{[^{}]*"authorName"[^{}]*\}/g;
            const matches = content.match(regex);
            if (matches) {
                generatedPosts = matches.map(m => {
                    try { return JSON.parse(m); } catch(err) { return null; }
                }).filter(Boolean);
            } else {
                throw new Error("JSON 解析彻底失败");
            }
        }

        generatedPosts.forEach(p => {
            let finalAuthorName = p.authorName;
            if (userNames.includes(finalAuthorName)) {
                finalAuthorName = "匿名网友" + Math.floor(Math.random() * 10000);
            }

            const npc = wcState.characters.find(c => c.name === finalAuthorName);
            const avatar = npc ? npc.avatar : getRandomNpcAvatar();
            
            const processedComments = (p.comments || []).map(c => {
                let finalCommentName = c.name;
                if (userNames.includes(finalCommentName)) {
                    finalCommentName = "热心网友" + Math.floor(Math.random() * 10000);
                }
                const cNpc = wcState.characters.find(char => char.name === finalCommentName);
                return {
                    name: finalCommentName,
                    handle: c.handle || '@' + finalCommentName,
                    avatar: cNpc ? cNpc.avatar : getRandomNpcAvatar(),
                    content: c.content,
                    time: Date.now() - Math.floor(Math.random() * 3600000)
                };
            });

            forumState.posts.unshift({
                id: Date.now() + Math.random(),
                windowId: forumState.activeWindowId,
                type: type,
                title: p.title || '', // 确保保存标题
                author: {
                    name: finalAuthorName,
                    handle: p.handle || '@' + finalAuthorName,
                    avatar: avatar
                },
                content: p.content,
                image: null,
                time: Date.now() - Math.floor(Math.random() * 3600000),
                likes: forumGenerateFakeLikes(), 
                saves: [],
                comments: processedComments
            });
        });

        forumSaveData();
        forumRenderPosts(type);
        wcShowSuccess("刷新成功");

    } catch (e) {
        console.error(e);
        wcShowError("刷新失败，可能生成内容过长");
    }
}

// ==========================================
// 同人文书城生成逻辑 (Fanfic Generator)
// ==========================================

// --- 打开同人文设定弹窗 ---
async function forumOpenGenFanficModal() {
    // 👇 新增：强制加载梦境数据，确保能读到你在聊天更多面板(梦境)里保存的预设
    if (typeof dreamLoadData === 'function') {
        await dreamLoadData();
    }

    // 1. 填充文风预设 (读取梦境预设)
    const styleSelect = document.getElementById('fanfic-style-select');
    styleSelect.innerHTML = '<option value="">默认文风 (细腻/意识流)</option>';
    if (typeof dreamState !== 'undefined' && dreamState.presets) {
        dreamState.presets.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.content; // 直接把内容作为 value
            opt.innerText = p.name;
            styleSelect.appendChild(opt);
        });
    }

    // 2. 填充角色 A 和 B
    const charASelect = document.getElementById('fanfic-char-a');
    const charBSelect = document.getElementById('fanfic-char-b');
    
    let charOptionsHtml = '<option value="">随机/不指定</option>';
    charOptionsHtml += `<option value="${wcState.user.name} (User)">${wcState.user.name} (我)</option>`;
    
    wcState.characters.filter(c => !c.isGroup).forEach(c => {
        charOptionsHtml += `<option value="${c.name}">${c.name}</option>`;
    });
    
    wcState.masks.forEach(m => {
        charOptionsHtml += `<option value="${m.name} (我的马甲)">${m.name} (面具)</option>`;
    });

    charASelect.innerHTML = charOptionsHtml;
    charBSelect.innerHTML = charOptionsHtml;

    // 3. 恢复已保存的设定
    styleSelect.value = forumState.config.fanficStyle || '';
    charASelect.value = forumState.config.fanficCharA || '';
    charBSelect.value = forumState.config.fanficCharB || '';
    document.getElementById('fanfic-trope-input').value = forumState.config.fanficTrope || '';

    wcOpenModal('forum-modal-gen-fanfic');
}

// --- 保存同人文设定 ---
function forumSaveFanficSettings() {
    forumState.config.fanficStyle = document.getElementById('fanfic-style-select').value;
    forumState.config.fanficCharA = document.getElementById('fanfic-char-a').value;
    forumState.config.fanficCharB = document.getElementById('fanfic-char-b').value;
    forumState.config.fanficTrope = document.getElementById('fanfic-trope-input').value.trim();

    forumSaveData();
    wcCloseModal('forum-modal-gen-fanfic');
    alert("同人文设定已保存！点击右上角闪电图标即可一键生成。");
}

// --- 一键生成同人文 ---
function forumDirectGenFanfic() {
    const charA = forumState.config.fanficCharA || '随机角色A';
    const charB = forumState.config.fanficCharB || '随机角色B';
    const trope = forumState.config.fanficTrope || '随机日常/发疯脑洞';
    const style = forumState.config.fanficStyle || '极具高级感、日系/韩系文艺风、意识流、细腻且克制。';

    let basePrompt = `你现在是一个同人论坛的驻站神仙太太（同人文作者）。\n`;
    basePrompt += `请根据以下设定，创作同人文：\n`;
    basePrompt += `【主角 A】：${charA}\n`;
    basePrompt += `【主角 B】：${charB}\n`;
    basePrompt += `【小说类型/梗】：${trope}\n`;
    basePrompt += `【文风要求】：${style}\n`;

    // 附加世界书和角色设定作为背景参考
    let contextInfo = "";
    
    // 👇 核心修改：读取当前窗口的专属世界观设定 👇
    const currentWin = forumState.windows.find(w => w.id === forumState.activeWindowId);
    if (currentWin && currentWin.prompt) {
        contextInfo += `【当前论坛板块专属背景设定 (${currentWin.name})】:\n${currentWin.prompt}\n\n`;
    }

    if (forumState.config.worldbookIds.length > 0) {
        const wbs = worldbookEntries.filter(e => forumState.config.worldbookIds.includes(e.id.toString()));
        if (wbs.length > 0) {
            contextInfo += "【世界观背景参考】:\n" + wbs.map(e => `${e.title}: ${e.desc}`).join('\n') + "\n\n";
        }
    }
    if (forumState.config.charIds.length > 0) {
        const chars = wcState.characters.filter(c => forumState.config.charIds.includes(c.id.toString()));
        if (chars.length > 0) {
            contextInfo += "【角色性格参考】:\n" + chars.map(c => `${c.name}: ${c.prompt}`).join('\n') + "\n\n";
        }
    }
    if (contextInfo) {
        basePrompt += `\n${contextInfo}`;
    }

    _executeGenFanfic(basePrompt);
}

// 内部核心：执行同人文 API 请求 (覆盖未收藏的旧文)
async function _executeGenFanfic(basePrompt) {
    const apiConfig = await getActiveApiConfig('forum');
    if (!apiConfig || !apiConfig.key) return alert("请先配置 API");

    const limit = apiConfig.limit || 50;
    if (limit > 0 && sessionApiCallCount >= limit) {
        wcShowError("已达到API调用上限");
        return;
    }
    sessionApiCallCount++;

    wcShowLoading("正在生成同人文，请耐心等待...");

    try {
        forumState.posts = forumState.posts.filter(p => {
            if (p.type !== 'fanfic') return true;
            if (p.author.name === forumState.profile.name) return true;
            if (Array.isArray(p.likes) && p.likes.includes(forumState.profile.name)) return true;
            if (Array.isArray(p.saves) && p.saves.includes(forumState.profile.name)) return true;
            return false;
        });

        let prompt = basePrompt;
        prompt += `\n【核心强制要求（最高优先级）】：\n`;
        prompt += `1. 数量与长度：必须一次性生成 2 篇不同视角的同人文！为了防止输出截断，每篇字数控制在 500-800 字左右，但必须保证故事结构完整！\n`;
        prompt += `2. 评论互动：每篇小说必须附带 3-5 条读者评论（虚构的网友名字），评论要像真实的追更读者（如：太太饿饿饭饭、神仙绝美爱情、刀死我了等）。\n`;
        prompt += `3. 【绝对禁止】：全文严禁使用任何 emoji 表情符号！严禁出现颜文字！\n`;
        prompt += `4. 返回纯 JSON 数组，格式如下：\n`;
        prompt += `[
  {
    "title": "同人文标题(必须有)",
    "authorName": "虚构的作者笔名",
    "handle": "@作者ID",
    "content": "小说的正文内容（支持使用 \\n 换行排版）...",
    "comments": [
      {"name": "读者A", "handle": "@ID", "content": "评论内容"}
    ]
  }
]\n`;

        const response = await fetch(`${apiConfig.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiConfig.key}` },
            body: JSON.stringify({
                model: apiConfig.model,
                messages: [{ role: "user", content: prompt }],
                temperature: parseFloat(apiConfig.temp) || 0.8,
                max_tokens: 4000 
            })
        });

        const data = await response.json();
        let content = data.choices[0].message.content;
        content = content.replace(/<thinking>[\s\S]*?<\/thinking>/g, '').trim();
        content = content.replace(/```json/g, '').replace(/```/g, '').trim();
        
        // 强力 JSON 容错解析
        if (!content.endsWith(']')) {
            const lastBrace = content.lastIndexOf('}');
            if (lastBrace !== -1) {
                content = content.substring(0, lastBrace + 1) + ']';
            } else {
                content += '}]';
            }
        }

        let generatedPosts = [];
        try {
            generatedPosts = JSON.parse(content);
        } catch (e) {
            console.warn("JSON 解析失败，尝试正则提取兜底", e);
            const regex = /\{[^{}]*"authorName"[^{}]*\}/g;
            const matches = content.match(regex);
            if (matches) {
                generatedPosts = matches.map(m => {
                    try { return JSON.parse(m); } catch(err) { return null; }
                }).filter(Boolean);
            } else {
                throw new Error("JSON 解析彻底失败");
            }
        }

        generatedPosts.forEach(p => {
            const processedComments = (p.comments || []).map(c => ({
                name: c.name,
                handle: c.handle || '@' + c.name,
                avatar: getRandomNpcAvatar(),
                content: c.content,
                time: Date.now() - Math.floor(Math.random() * 3600000)
            }));

            forumState.posts.unshift({
                id: Date.now() + Math.random(),
                windowId: forumState.activeWindowId,
                type: 'fanfic',
                isStory: true, 
                title: p.title || '无题', // 确保保存标题
                author: {
                    name: p.authorName,
                    handle: p.handle || '@' + p.authorName,
                    avatar: getRandomNpcAvatar()
                },
                content: p.content,
                image: null,
                time: Date.now(),
                likes: forumGenerateFakeLikes(), 
                saves: [],
                comments: processedComments
            });
        });

        forumSaveData();
        forumRenderPosts('fanfic');
        wcShowSuccess("神仙太太更新啦！");

    } catch (e) {
        console.error(e);
        wcShowError("生成失败，可能是字数太多导致截断");
    }
}
// ==========================================
// 论坛私信系统 (会话列表 + 聊天界面)
// ==========================================

// 1. 打开私信会话列表
function forumOpenPrivateMessages() {
    let view = document.getElementById('forum-pm-list-view');
    if (!view) {
        view = document.createElement('div');
        view.id = 'forum-pm-list-view';
        view.className = 'ins-forum-view';
        // 去掉了旧的 ins-forum-header，直接渲染内容区
        view.innerHTML = `
            <div class="ins-forum-content" id="forum-pm-list-container" style="padding: 0; background: #FFF;"></div>
        `;
        // 插入到 pages-container 中，而不是 forumModal 最外层
        const pagesContainer = document.querySelector('.pages-container');
        if (pagesContainer) {
            pagesContainer.appendChild(view);
        } else {
            document.getElementById('forumModal').appendChild(view);
        }
    }
    forumRenderPMList();
    // 修复：不使用内联 display: flex，直接依赖 active 类，防止切换 tab 时页面重叠
    view.classList.add('active');
}
function forumClosePrivateMessages() {
    const view = document.getElementById('forum-pm-list-view');
    if (view) {
        view.classList.remove('active');
        setTimeout(() => view.style.display = 'none', 300);
    }
}

// 2. 渲染会话列表 (支持左滑删除)
function forumRenderPMList() {
    const container = document.getElementById('forum-pm-list-container');
    container.innerHTML = '';
    
    // 核心修复：只提取当前窗口的私信
    const currentChats = (forumState.privateChats || []).filter(c => c.windowId === forumState.activeWindowId);
    
    if (currentChats.length === 0) {
        container.innerHTML = '<div style="text-align: center; color: #888; padding: 50px 20px; font-size: 13px;">当前频道暂无私信</div>';
        return;
    }

    // 按最后更新时间排序
    const sortedChats = [...currentChats].sort((a, b) => b.lastUpdateTime - a.lastUpdateTime);
    
    sortedChats.forEach(chat => {
        const lastMsg = chat.messages.length > 0 ? chat.messages[chat.messages.length - 1] : null;
        const lastMsgText = lastMsg ? lastMsg.content : '...';
        const timeStr = lastMsg ? new Date(lastMsg.time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '';

        const div = document.createElement('div');
        div.className = 'forum-pm-swipe-wrapper';
        
        div.innerHTML = `
            <div class="forum-pm-swipe-action" onclick="forumDeletePMChat('${chat.id}')">删除</div>
            <div class="forum-pm-swipe-content" onclick="forumOpenPMChat('${chat.id}')" ontouchstart="forumPMTouchStart(event)" ontouchmove="forumPMTouchMove(event)" ontouchend="forumPMTouchEnd(event)">
                <img src="${chat.targetAvatar}" class="forum-pm-avatar">
                <div class="forum-pm-info">
                    <div class="forum-pm-name-row">
                        <span class="forum-pm-name">${chat.targetName}</span>
                        <span class="forum-pm-time">${timeStr}</span>
                    </div>
                    <div class="forum-pm-preview">${lastMsgText}</div>
                </div>
            </div>
        `;
        container.appendChild(div);
    });
}

// 👇👇👇 在 forumRenderPMList 函数下方，紧接着粘贴这段滑动与删除逻辑 👇👇👇

let forumPMSwipeXDown = null;
let forumPMSwipeYDown = null;
let forumPMCurrentSwipeElement = null;

window.forumPMTouchStart = function(evt) {
    forumPMSwipeXDown = evt.touches[0].clientX;
    forumPMSwipeYDown = evt.touches[0].clientY;
    forumPMCurrentSwipeElement = evt.currentTarget;
};

window.forumPMTouchMove = function(evt) {
    if (!forumPMSwipeXDown || !forumPMSwipeYDown || !forumPMCurrentSwipeElement) return;
    let xUp = evt.touches[0].clientX;
    let yUp = evt.touches[0].clientY;
    let xDiff = forumPMSwipeXDown - xUp;
    let yDiff = forumPMSwipeYDown - yUp;
    
    // 确保是水平滑动
    if (Math.abs(xDiff) > Math.abs(yDiff)) { 
        if (xDiff > 0) {
            // 向左滑，露出删除按钮 (宽度70px)
            forumPMCurrentSwipeElement.style.transform = `translateX(-70px)`; 
        } else {
            // 向右滑，恢复原位
            forumPMCurrentSwipeElement.style.transform = 'translateX(0px)'; 
        }
    }
};

window.forumPMTouchEnd = function(evt) {
    forumPMSwipeXDown = null;
    forumPMSwipeYDown = null;
};

window.forumDeletePMChat = function(chatId) {
    if (confirm("确定要删除这个私信会话吗？")) {
        forumState.privateChats = forumState.privateChats.filter(c => c.id !== chatId);
        forumSaveData();
        forumRenderPMList();
    }
};
// 👆👆👆 粘贴结束 👆👆👆


// 3. 打开具体的私信聊天页面
function forumOpenPMChat(chatId) {
    forumState.activePMChatId = chatId;
    const chat = forumState.privateChats.find(c => c.id === chatId);
    if (!chat) return;

    let view = document.getElementById('forum-pm-chat-view');
    if (!view) {
        view = document.createElement('div');
        view.id = 'forum-pm-chat-view';
        view.className = 'ins-forum-view';
        view.style.zIndex = '3100'; 
        view.style.paddingBottom = '0'; 
        
        // 核心修复：增加 padding-top 避开刘海屏，整体下移
        view.innerHTML = `
            <div class="ins-forum-header" style="background: #F9F9F9; display: flex; justify-content: space-between; align-items: center; padding: calc(env(safe-area-inset-top, 20px) + 15px) 20px 15px 20px; border-bottom: 1px solid #E5E5EA;">
                <div class="ins-forum-header-left" onclick="forumClosePMChat()" style="cursor: pointer; display: flex; align-items: center; width: 40px;">
                    <svg viewBox="0 0 24 24" style="width: 24px; height: 24px; fill: none; stroke: #111; stroke-width: 2;"><polyline points="15 18 9 12 15 6"></polyline></svg>
                </div>
                <div class="ins-forum-title" id="forum-pm-chat-title" style="font-size: 16px; font-weight: bold; color: #111; text-align: center; flex: 1;">名字</div>
                <div style="width: 40px;"></div> 
            </div>
            <div class="forum-pm-chat-history" id="forum-pm-chat-history"></div>
            <div class="forum-pm-chat-footer" style="display: flex; align-items: center; gap: 8px; padding: 10px; border-top: 1px solid #E5E5EA; background: #FFF;">
                <div class="ins-forum-action-btn" onclick="forumTriggerPMAI(forumState.activePMChatId)" style="display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; background: #F5F5F5; border-radius: 50%; cursor: pointer; flex-shrink: 0;" title="让AI回复">
                    <svg viewBox="0 0 24 24" style="width: 18px; height: 18px; fill: none; stroke: #AF52DE; stroke-width: 2;"><path d="M21 16.05L15.95 21 4 9.05 9.05 4 21 16.05zM15.95 21l-5.05-5.05M9.05 4l5.05 5.05M13 3l1.5 3.5L18 8l-3.5 1.5L13 13l-1.5-3.5L8 8l3.5-1.5L13 3z"/></svg>
                </div>
                <input type="text" id="forum-pm-chat-input" placeholder="发私信..." style="flex: 1; border: 1px solid #E5E5EA; border-radius: 16px; padding: 0 12px; height: 32px; outline: none; font-size: 14px; background: transparent;">
                <button onclick="forumSendPM()" style="background: #111; color: #FFF; border: none; border-radius: 16px; padding: 0 16px; height: 32px; font-weight: bold; cursor: pointer; flex-shrink: 0;">发送</button>
            </div>
        `;
        document.getElementById('forumModal').appendChild(view);
        document.getElementById('forum-pm-chat-input').addEventListener('keypress', function(e) {
            if (e.key === 'Enter') forumSendPM();
        });
    }

    document.getElementById('forum-pm-chat-title').innerText = chat.targetName;
    forumRenderPMChatHistory();
    
    view.style.display = 'flex';
    setTimeout(() => view.classList.add('active'), 10);
}

function forumClosePMChat() {
    const view = document.getElementById('forum-pm-chat-view');
    if (view) {
        view.classList.remove('active');
        setTimeout(() => view.style.display = 'none', 300);
    }
    forumState.activePMChatId = null;
    forumRenderPMList(); // 退回列表时刷新一下最后一条消息
}

// 4. 渲染聊天记录
function forumRenderPMChatHistory() {
    const container = document.getElementById('forum-pm-chat-history');
    container.innerHTML = '';
    
    const chat = forumState.privateChats.find(c => c.id === forumState.activePMChatId);
    if (!chat) return;

    chat.messages.forEach(msg => {
        const div = document.createElement('div');
        div.className = `forum-pm-bubble-row ${msg.sender === 'me' ? 'me' : 'them'}`;
        
// 找到这段代码（大约在 17730 行左右）：
        let avatarHtml = '';
        if (msg.sender === 'them') {
            avatarHtml = `<img src="${chat.targetAvatar}" class="forum-pm-bubble-avatar">`;
        } else {
            avatarHtml = `<img src="${forumState.profile.avatar}" class="forum-pm-bubble-avatar">`;
        }
        // 👇👇👇 将下面的 div.innerHTML 替换掉 👇👇👇
        const bilingualRegex = /^([\s\S]*?)(?:<br>\s*)+<span[^>]*>([\s\S]*?)<\/span>\s*$/i;
        const match = msg.content.match(bilingualRegex);
        
        let bubbleContentHtml = msg.content;
        let onClickAttr = "";
        const isMe = msg.sender === 'me';

        if (match) {
            const originalText = match[1].replace(/^(<br>|\s)+|(<br>|\s)+$/gi, '');
            const translatedText = match[2].replace(/^(<br>|\s)+|(<br>|\s)+$/gi, '');
            const transId = 'pm-trans-' + Math.random().toString(36).substr(2, 9);
            
            onClickAttr = `onclick="const el = document.getElementById('${transId}'); if(el.style.display==='none'){el.style.display='block';}else{el.style.display='none';}" style="cursor: pointer; -webkit-tap-highlight-color: transparent;"`;
            // 核心修复：压缩为单行
            bubbleContentHtml = `<div style="word-break: break-word; width: 100%;">${originalText}</div><div id="${transId}" style="display: none; width: 100%; margin-top: 8px;"><div style="height: 1px; width: 100%; background-color: ${isMe ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.08)'}; margin-bottom: 8px;"></div><div style="font-size: 13px; word-break: break-word; color: ${isMe ? '#CCCCCC' : '#888888'};">${translatedText}</div></div>`;
        }

        div.innerHTML = `
            ${avatarHtml}
            <div class="forum-pm-bubble" ${onClickAttr}>${bubbleContentHtml}</div>
        `;
        // 👆👆👆 替换结束 👆👆👆
        
        container.appendChild(div);
    });

    setTimeout(() => { container.scrollTop = container.scrollHeight; }, 50);
}

// 5. 用户发送私信
function forumSendPM() {
    const input = document.getElementById('forum-pm-chat-input');
    const text = input.value.trim();
    if (!text) return;

    const chat = forumState.privateChats.find(c => c.id === forumState.activePMChatId);
    if (!chat) return;

    // 存入用户消息
    chat.messages.push({
        id: Date.now(),
        sender: 'me',
        content: text,
        time: Date.now()
    });
    chat.lastUpdateTime = Date.now();
    forumSaveData();
    
    input.value = '';
    forumRenderPMChatHistory();

}

// 6. 专属的私信 AI 回复逻辑
async function forumTriggerPMAI(chatId) {
    const chat = forumState.privateChats.find(c => c.id === chatId);
    if (!chat) return;

    const apiConfig = await getActiveApiConfig('forum');
    if (!apiConfig || !apiConfig.key) return;

    // 插入一个临时的“正在输入”气泡
    const container = document.getElementById('forum-pm-chat-history');
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'forum-pm-bubble-row them';
    loadingDiv.id = 'forum-pm-loading';
    loadingDiv.innerHTML = `<img src="${chat.targetAvatar}" class="forum-pm-bubble-avatar"><div class="forum-pm-bubble" style="color:#888;">正在输入...</div>`;
    container.appendChild(loadingDiv);
    container.scrollTop = container.scrollHeight;

    try {
        // 提取最近的聊天记录
        const recentMsgs = chat.messages.slice(-15).map(m => {
            const speaker = m.sender === 'me' ? forumState.profile.name : chat.targetName;
            return `${speaker}: ${m.content}`;
        }).join('\n');

        // 👇 修改：查找对方是否是已知的 NPC，如果不是，赋予路人设定
        const npc = wcState.characters.find(c => c.name === chat.targetName);
        let npcPersona = npc ? npc.prompt : "一个在论坛上关注你的热心网友/路人。请根据你们的聊天记录推断你的性格，语气要像真实的活人网友。";

        let prompt = `你现在正在一个社交论坛的私信界面里，和用户（${forumState.profile.name}）进行一对一私聊。\n`;
        prompt += `【你的身份】：${chat.targetName}\n`;
        prompt += `【你的人设】：${npcPersona}\n\n`;
        prompt += `【最近的私信聊天记录】：\n${recentMsgs}\n\n`;
        prompt += `【要求】：\n`;
        prompt += `1. 请根据你的人设和聊天记录，回复用户的最后一条消息。\n`;
        prompt += `2. 语气要符合论坛私聊的氛围（可以是网感、暧昧、吐槽等，取决于你的人设）。\n`;
        // 👇 修改：强制要求碎片化输出
        prompt += `3. 【碎片化口语化强制指令】：必须像真人聊天一样，将长回复拆分成 2-4 条短消息！严禁把所有话挤在一个气泡里！\n`;
        prompt += `4. 【最高防OOC指令】：你绝对不能以用户的身份（${forumState.profile.name}）说话！你只能扮演 ${chat.targetName}！\n`;
        prompt += `5. 返回纯 JSON 数组，格式如下：\n`;
        prompt += `[
  {"content": "第一句短消息"},
  {"content": "第二句短消息"}
]\n`;

        const response = await fetch(`${apiConfig.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiConfig.key}` },
            body: JSON.stringify({
                model: apiConfig.model,
                messages: [{ role: "user", content: prompt }],
                temperature: parseFloat(apiConfig.temp) || 0.8,
                max_tokens: 4000
            })
        });

        const data = await response.json();
        let content = data.choices[0].message.content;
        content = content.replace(/<thinking>[\s\S]*?<\/thinking>/g, '').trim();
        content = content.replace(/```json/g, '').replace(/```/g, '').trim();
        
        // 👇 修改：解析数组，并遍历推入聊天记录
        let replies = [];
        try {
            replies = JSON.parse(content);
            if (!Array.isArray(replies)) {
                replies = [replies]; // 兜底：如果AI还是返回了对象，转成数组
            }
        } catch (e) {
            replies = [{"content": content}]; // 兜底：解析失败直接作为纯文本
        }

        // 移除 loading
        const loadingEl = document.getElementById('forum-pm-loading');
        if (loadingEl) loadingEl.remove();

        // 存入 AI 回复 (遍历数组)
        for (const reply of replies) {
            if (reply.content) {
                chat.messages.push({
                    id: Date.now() + Math.random(),
                    sender: 'them',
                    content: reply.content,
                    time: Date.now()
                });
            }
        }
        
        chat.lastUpdateTime = Date.now();
        forumSaveData();

        // 如果当前还在这个聊天页面，刷新界面
        if (forumState.activePMChatId === chatId) {
            forumRenderPMChatHistory();
        }

    } catch (e) {
        console.error("私信回复失败", e);
        const loadingEl = document.getElementById('forum-pm-loading');
        if (loadingEl) loadingEl.remove();
    }
}
/* ==========================================================================
   语音通话系统 (Voice Call Logic - 沉浸互通版)
   ========================================================================== */

// 1. 我呼叫 Ta
async function wcActionVoiceCall() {
    wcCloseAllPanels();
    const charId = wcState.activeChatId;
    const char = wcState.characters.find(c => c.id === charId);
    if (!char) return;

    if (char.isGroup) {
        alert("群聊暂不支持语音通话哦~");
        return;
    }

    // 初始化 UI (居中状态)
    const callView = document.getElementById('wc-view-call-screen');
    callView.classList.remove('active-call'); 
    
    document.getElementById('ins-call-bg').style.backgroundImage = `url('${char.avatar}')`;
    document.getElementById('ins-call-avatar').src = char.avatar;
    document.getElementById('ins-call-name').innerText = char.name;
    document.getElementById('ins-call-status').innerText = "正在呼叫...";
    document.getElementById('ins-call-voice-wave').classList.add('hidden'); // 隐藏音波
    
    document.getElementById('ins-call-actions-ringing').style.display = 'flex';
    document.getElementById('ins-call-actions-incoming').style.display = 'none';
    document.getElementById('ins-call-actions-active').style.display = 'none';
    document.getElementById('ins-call-chat-area').style.display = 'none';
    document.getElementById('ins-call-messages').innerHTML = '';
    
    callView.classList.remove('hidden');

    wcState.callState.charId = charId;
    wcState.callState.isActive = false;

    // 触发 AI 决定是否接听
    await wcProcessCallDecision(char);
}

// 2. AI 决定是否接听 (读取世界书、面具、记忆，严禁emoji)
async function wcProcessCallDecision(char) {
    const apiConfig = await getActiveApiConfig('chat');
    if (!apiConfig || !apiConfig.key) {
        setTimeout(() => wcHangUpCall('rejected', "未配置API，无法接通"), 2000);
        return;
    }

    try {
        const chatConfig = char.chatConfig || {};
        const userPersona = chatConfig.userPersona || wcState.user.persona || "无";
        const msgs = wcState.chats[char.id] || [];
        const recentMsgs = msgs.slice(-15).map(m => `${m.sender==='me'?'User':char.name}: ${m.content}`).join('\n');
        
        // 读取世界书
        let wbInfo = "";
        if (worldbookEntries.length > 0 && chatConfig.worldbookEntries && chatConfig.worldbookEntries.length > 0) {
            const linkedEntries = worldbookEntries.filter(e => chatConfig.worldbookEntries.includes(e.id.toString()));
            if (linkedEntries.length > 0) {
                wbInfo = "【世界观参考】:\n" + linkedEntries.map(e => `${e.title}: ${e.desc}`).join('\n');
            }
        }

        // 读取记忆
        let memoryText = "暂无特殊记忆。";
        if (char.memories && char.memories.length > 0) {
            const readCount = chatConfig.aiMemoryCount || 5;
            memoryText = char.memories.slice(0, readCount).map(m => `- ${m.content}`).join('\n');
        }

        let prompt = `你扮演角色：${char.name}。\n人设：${char.prompt}\n${wbInfo}\n`;
        prompt += `【用户(User)设定/面具】：${userPersona}\n`;
        prompt += `【你们的共同记忆】：\n${memoryText}\n\n`;
        prompt += `【当前情境】：User 突然给你打来了一个语音电话。\n`;
        prompt += `【最近聊天记录】：\n${recentMsgs}\n\n`;
        prompt += `请根据你的人设、记忆、世界观以及最近的聊天氛围，决定是否接听这个电话。\n`;
        prompt += `【核心表现要求】：\n`;
        prompt += `1. 如果接听，请给出接通后的第一句话。你可以使用括号 () 来描述你接电话时的语气、呼吸声或环境音，例如：(刚睡醒，声音沙哑) 或 (轻笑一声)。\n`;
        prompt += `2. 语气必须像真人一样自然、口语化，不要太死板！\n`;
        prompt += `3. 【绝对禁止】：全文严禁使用任何 emoji 表情符号！严禁出现颜文字！\n`;
        prompt += `如果拒接，请给出拒接的理由（内心OS）。\n`;
        prompt += `返回纯 JSON 对象，格式如下：\n`;
        prompt += `{"accept": true, "firstSentence": "(接起电话，伴随着走路的喘息声) 喂？怎么突然打电话来了？"}\n`;
        prompt += `或 {"accept": false, "reason": "现在在开会，不方便接。"}\n`;

        const response = await fetch(`${apiConfig.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiConfig.key}` },
            body: JSON.stringify({
                model: apiConfig.model,
                messages: [{ role: "user", content: prompt }],
                temperature: 0.7,
                max_tokens: 4000
            })
        });

        const data = await response.json();
        let content = data.choices[0].message.content.replace(/```json/g, '').replace(/```/g, '').trim();
        const decision = JSON.parse(content);

        if (!document.getElementById('wc-view-call-screen') || document.getElementById('wc-view-call-screen').classList.contains('hidden')) return;

        if (decision.accept) {
            wcStartActiveCall(decision.firstSentence);
        } else {
            wcHangUpCall('rejected', decision.reason);
        }

    } catch (e) {
        console.error("AI 决策失败", e);
        wcStartActiveCall("(接通电话) 喂？");
    }
}

// 3. Ta 呼叫我 (AI 主动来电)
window.wcShowIncomingCall = function(charId) {
    const char = wcState.characters.find(c => c.id === charId);
    if (!char) return;

    wcState.callState.charId = charId;
    wcState.callState.isActive = false;

    const callView = document.getElementById('wc-view-call-screen');
    callView.classList.remove('active-call'); 
    
    document.getElementById('ins-call-bg').style.backgroundImage = `url('${char.avatar}')`;
    document.getElementById('ins-call-avatar').src = char.avatar;
    document.getElementById('ins-call-name').innerText = char.name;
    document.getElementById('ins-call-status').innerText = "邀请你进行语音通话...";
    document.getElementById('ins-call-voice-wave').classList.add('hidden');
    
    document.getElementById('ins-call-actions-ringing').style.display = 'none';
    document.getElementById('ins-call-actions-incoming').style.display = 'flex'; 
    document.getElementById('ins-call-actions-active').style.display = 'none';
    document.getElementById('ins-call-chat-area').style.display = 'none';
    document.getElementById('ins-call-messages').innerHTML = '';
    
    callView.classList.remove('hidden');
    
    if (typeof showMainSystemNotification === 'function') {
        showMainSystemNotification("语音通话", `${char.name} 邀请你进行语音通话`, char.avatar);
    }
    if (navigator.vibrate) navigator.vibrate([500, 200, 500, 200, 500]);
};

// 4. 我接听 Ta 的来电
window.wcAcceptIncomingCall = function() {
    const charId = wcState.callState.charId;
    if (!charId) return;

    document.getElementById('ins-call-actions-incoming').style.display = 'none';
    
    wcAddMessage(charId, 'system', 'system', `[系统内部信息: User 接听了你的语音通话！请立刻说第一句话。]`, { hidden: true });
    
    wcStartActiveCall(); 
    wcTriggerCallAI();
};

// 5. 我拒绝 Ta 的来电
window.wcRejectIncomingCall = function() {
    const charId = wcState.callState.charId;
    if (!charId) return;

    document.getElementById('wc-view-call-screen').classList.add('hidden');
    wcAddMessage(charId, 'me', 'call_record', '已拒绝', { status: 'rejected' });
    wcAddMessage(charId, 'system', 'system', `[系统内部信息: User 挂断/拒绝了你的语音通话。]`, { hidden: true });
    
    wcState.callState.isActive = false;
    wcState.callState.charId = null;
};

// 6. 正式接通电话 (UI 变化)
function wcStartActiveCall(firstSentence = null) {
    wcState.callState.isActive = true;
    wcState.callState.startTime = Date.now();

    const callView = document.getElementById('wc-view-call-screen');
    callView.classList.add('active-call'); 

    document.getElementById('ins-call-actions-ringing').style.display = 'none';
    document.getElementById('ins-call-actions-incoming').style.display = 'none';
    document.getElementById('ins-call-actions-active').style.display = 'flex';
    document.getElementById('ins-call-chat-area').style.display = 'flex';

    wcState.callState.timerInterval = setInterval(() => {
        const diff = Math.floor((Date.now() - wcState.callState.startTime) / 1000);
        const m = Math.floor(diff / 60).toString().padStart(2, '0');
        const s = (diff % 60).toString().padStart(2, '0');
        // 只有在没说话的时候才显示时间
        if (!wcState.callState.isSpeaking) {
            document.getElementById('ins-call-status').innerText = `${m}:${s}`;
        }
    }, 1000);

    if (firstSentence) {
        wcAddCallMessage('them', firstSentence);
        wcAddMessage(wcState.callState.charId, 'system', 'system', `[语音通话已接通] ${wcState.characters.find(c=>c.id===wcState.callState.charId).name} 说: "${firstSentence}"`, { hidden: true });
    }
}

// 7. 挂断电话 (注入强力记忆)
window.wcHangUpCall = function(reason, aiReason = "") {
    const charId = wcState.callState.charId;
    if (!charId) return;

    clearInterval(wcState.callState.timerInterval);
    document.getElementById('wc-view-call-screen').classList.add('hidden');
    document.getElementById('ins-call-voice-wave').classList.add('hidden');

    if (reason === 'cancel') {
        wcAddMessage(charId, 'me', 'call_record', '已取消', { status: 'canceled' });
    } else if (reason === 'rejected') {
        wcAddMessage(charId, 'them', 'call_record', '已拒绝接听', { status: 'rejected' });
        if (aiReason) {
            wcAddMessage(charId, 'system', 'system', `[系统内部信息: 对方拒接了电话，Ta的内心OS是: "${aiReason}"]`, { hidden: true });
        }
    } else if (reason === 'end') {
        const diff = Math.floor((Date.now() - wcState.callState.startTime) / 1000);
        const m = Math.floor(diff / 60).toString().padStart(2, '0');
        const s = (diff % 60).toString().padStart(2, '0');
        const durationStr = `${m}:${s}`;
        
        wcAddMessage(charId, 'me', 'call_record', '通话时长', { duration: durationStr, status: 'ended' });
        
        // 👇 核心修改：挂断时注入强力记忆，确保文字聊天能接上话题 👇
        const memoryPrompt = `[系统强制提示：你们刚刚结束了一通长达 ${durationStr} 的语音通话。在接下来的文字聊天中，请你自然地顺延刚刚电话里聊过的话题或情绪，不要表现得像刚认识一样！]`;
        wcAddMessage(charId, 'system', 'system', memoryPrompt, { hidden: true });
    }

    wcState.callState.isActive = false;
    wcState.callState.charId = null;
    wcState.callState.isSpeaking = false;
    document.getElementById('ins-call-avatar-wrapper').classList.remove('speaking');
};

// 8. 通话中发送消息 (User)
window.wcSendCallMessage = function() {
    const input = document.getElementById('ins-call-input');
    const text = input.value.trim();
    if (!text) return;

    wcAddCallMessage('me', text);
    wcAddMessage(wcState.callState.charId, 'system', 'system', `[语音通话中] User 说: "${text}"`, { hidden: true });

    input.value = '';
    setTimeout(wcTriggerCallAI, 500);
};

// 9. 通话中 AI 回复 (深度记忆互通、活人感、严禁emoji)
window.wcTriggerCallAI = async function() {
    const charId = wcState.callState.charId;
    const char = wcState.characters.find(c => c.id === charId);
    if (!char || !wcState.callState.isActive) return;

    const apiConfig = await getActiveApiConfig('chat');
    if (!apiConfig || !apiConfig.key) return;

    // 开启说话动画和 SVG 音波
    wcState.callState.isSpeaking = true;
    document.getElementById('ins-call-avatar-wrapper').classList.add('speaking');
    document.getElementById('ins-call-status').innerText = "对方正在说话...";
    document.getElementById('ins-call-voice-wave').classList.remove('hidden');

    try {
        const chatConfig = char.chatConfig || {};
        const userPersona = chatConfig.userPersona || wcState.user.persona || "无";
        
        // 读取世界书
        let wbInfo = "";
        if (worldbookEntries.length > 0 && chatConfig.worldbookEntries && chatConfig.worldbookEntries.length > 0) {
            const linkedEntries = worldbookEntries.filter(e => chatConfig.worldbookEntries.includes(e.id.toString()));
            if (linkedEntries.length > 0) {
                wbInfo = "【世界观参考】:\n" + linkedEntries.map(e => `${e.title}: ${e.desc}`).join('\n');
            }
        }

        // 读取记忆
        let memoryText = "暂无特殊记忆。";
        if (char.memories && char.memories.length > 0) {
            const readCount = chatConfig.aiMemoryCount || 5;
            memoryText = char.memories.slice(0, readCount).map(m => `- ${m.content}`).join('\n');
        }

        // 提取最近的聊天记录（包含文字聊天和语音通话记录，实现无缝互通）
        const msgs = wcState.chats[char.id] || [];
        const recentMsgs = msgs.slice(-20).map(m => {
            if (m.type === 'system' && m.content.includes('[语音通话中]')) return m.content;
            if (m.type === 'system' && m.content.includes('[语音通话已接通]')) return m.content;
            if (m.type === 'text') return `${m.sender==='me'?'User':char.name}: ${m.content}`;
            return null;
        }).filter(Boolean).join('\n');

        let prompt = `你扮演角色：${char.name}。\n人设：${char.prompt}\n${wbInfo}\n`;
        prompt += `【用户(User)设定/面具】：${userPersona}\n`;
        prompt += `【你们的共同记忆】：\n${memoryText}\n\n`;
        prompt += `【当前情境】：你正在和 User 打语音电话。\n`;
        prompt += `【最近的文字与语音聊天记录】：\n${recentMsgs}\n\n`;
        
        prompt += `请根据你的人设、记忆、世界观以及上下文，回复 User 的话。\n`;
        prompt += `【核心表现要求】：\n`;
        prompt += `1. 语气要像真实的语音通话一样自然、口语化，可以带点语气词（嗯、啊、哦），绝对不要像机器或客服！不要太死板！\n`;
        prompt += `2. 你可以使用括号 () 来描述你说话时的语气、呼吸声、微动作或环境音，例如：(轻笑)、(深吸一口气)、(翻身摩擦被子的声音)、(声音有些沙哑)。\n`;
        prompt += `3. 【绝对禁止】：全文严禁使用任何 emoji 表情符号！严禁出现颜文字！\n`;
        prompt += `返回纯 JSON 对象：{"content": "你说的话"}\n`;

        const response = await fetch(`${apiConfig.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiConfig.key}` },
            body: JSON.stringify({
                model: apiConfig.model,
                messages: [{ role: "user", content: prompt }],
                temperature: 0.8
            })
        });

        const data = await response.json();
        let content = data.choices[0].message.content.replace(/```json/g, '').replace(/```/g, '').trim();
        const reply = JSON.parse(content);

        if (wcState.callState.isActive) {
            wcAddCallMessage('them', reply.content);
            wcAddMessage(charId, 'system', 'system', `[语音通话中] ${char.name} 说: "${reply.content}"`, { hidden: true });
        }

    } catch (e) {
        console.error("通话回复失败", e);
    } finally {
        // 关闭说话动画和 SVG 音波
        wcState.callState.isSpeaking = false;
        document.getElementById('ins-call-avatar-wrapper').classList.remove('speaking');
        document.getElementById('ins-call-voice-wave').classList.add('hidden');
        
        // 恢复显示时间
        const diff = Math.floor((Date.now() - wcState.callState.startTime) / 1000);
        const m = Math.floor(diff / 60).toString().padStart(2, '0');
        const s = (diff % 60).toString().padStart(2, '0');
        document.getElementById('ins-call-status').innerText = `${m}:${s}`;
    }
};

// 10. 渲染单条通话消息到屏幕
function wcAddCallMessage(sender, text) {
    const container = document.getElementById('ins-call-messages');
    const div = document.createElement('div');
    div.className = `ins-call-msg ${sender}`;
    
    // 简单处理一下括号，让括号里的动作文字变成灰色斜体，更有高级感
    let formattedText = text.replace(/\((.*?)\)/g, '<span style="color: rgba(255,255,255,0.5); font-style: italic;">($1)</span>');
    formattedText = formattedText.replace(/（(.*?)）/g, '<span style="color: rgba(255,255,255,0.5); font-style: italic;">（$1）</span>');
    
    div.innerHTML = formattedText;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
}
// ==========================================
// 新增：全局高级世界书选择弹窗逻辑
// ==========================================
let currentWbTargetListId = '';
let currentWbTargetCountId = '';
let currentWbCheckboxClass = '';
let currentWbCallback = null;

function openGlobalWbModal(listId, countId, checkboxClass = '', callback = null) {
    currentWbTargetListId = listId;
    currentWbTargetCountId = countId;
    currentWbCheckboxClass = checkboxClass;
    currentWbCallback = callback;

    // 1. 读取当前已选的 ID
    const hiddenInputs = document.querySelectorAll(`#${listId} input[type="checkbox"]:checked`);
    const selectedIds = Array.from(hiddenInputs).map(input => input.value);

    // 2. 渲染弹窗内容
    const container = document.getElementById('global-wb-modal-body');
    container.innerHTML = '';

    if (!worldbookGroups || worldbookGroups.length === 0 || !worldbookEntries || worldbookEntries.length === 0) {
        container.innerHTML = '<div style="text-align:center; color:#999; padding:40px 20px; font-size:14px;">暂无世界书，请先在主界面添加哦~</div>';
    } else {
        worldbookGroups.forEach((group, index) => {
            const entries = worldbookEntries.filter(e => e.type === group);
            if (entries.length === 0) return;

            const selectedInGroup = entries.filter(e => selectedIds.includes(e.id.toString())).length;
            const isExpanded = index === 0 ? 'expanded' : ''; // 默认展开第一个

            let html = `
                <div class="ins-wb-group ${isExpanded}">
                    <div class="ins-wb-group-header" onclick="this.parentElement.classList.toggle('expanded')">
                        <div class="ins-wb-group-title">${group} <span class="ins-wb-group-count">${selectedInGroup}/${entries.length}</span></div>
                        <svg class="ins-wb-group-chevron" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"></polyline></svg>
                    </div>
                    <div class="ins-wb-group-content">
            `;

            entries.forEach(entry => {
                const isChecked = selectedIds.includes(entry.id.toString()) ? 'checked' : '';
                html += `
                    <label class="ins-wb-item">
                        <input type="checkbox" value="${entry.id}" class="global-wb-checkbox" ${isChecked} onchange="updateGlobalWbGroupCount(this)">
                        <span class="ins-wb-item-title">${entry.title}</span>
                    </label>
                `;
            });

            html += `</div></div>`;
            container.innerHTML += html;
        });
    }

    // 3. 显示弹窗
    const modal = document.getElementById('global-wb-modal');
    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('active'), 10);
}

function updateGlobalWbGroupCount(checkbox) {
    const groupEl = checkbox.closest('.ins-wb-group');
    const total = groupEl.querySelectorAll('.global-wb-checkbox').length;
    const checked = groupEl.querySelectorAll('.global-wb-checkbox:checked').length;
    groupEl.querySelector('.ins-wb-group-count').innerText = `${checked}/${total}`;
}

function closeGlobalWbModal() {
    const modal = document.getElementById('global-wb-modal');
    modal.classList.remove('active');
    setTimeout(() => modal.style.display = 'none', 300);
}

function confirmGlobalWbSelect() {
    // 1. 获取弹窗中所有勾选的 ID
    const selectedCheckboxes = document.querySelectorAll('#global-wb-modal-body .global-wb-checkbox:checked');
    const selectedIds = Array.from(selectedCheckboxes).map(cb => cb.value);

    // 2. 更新隐藏的列表 (完美兼容原有的保存逻辑)
    const hiddenList = document.getElementById(currentWbTargetListId);
    if (hiddenList) {
        hiddenList.innerHTML = '';
        selectedIds.forEach(id => {
            hiddenList.innerHTML += `<input type="checkbox" value="${id}" class="${currentWbCheckboxClass}" checked>`;
        });
    }

    // 3. 更新按钮上的数量显示
    const countDisplay = document.getElementById(currentWbTargetCountId);
    if (countDisplay) {
        countDisplay.innerText = `已选 ${selectedIds.length} 项`;
    }

    // 4. 触发回调 (如果有)
    if (currentWbCallback) {
        currentWbCallback(selectedIds);
    }

    // 触发实时 Token 计算 (如果当前在聊天设置页面)
    if (typeof calculateRealtimeTokens === 'function') {
        calculateRealtimeTokens();
    }

    closeGlobalWbModal();
}
// ==========================================
// 新增：Token 计算与 API 额度查询逻辑 (增强版)
// ==========================================

// 粗略估算 Token (中文按 1.2 算，英文按 0.3 算)
function estimateTokens(text) {
    if (!text) return 0;
    let tokens = 0;
    for (let i = 0; i < text.length; i++) {
        if (text.charCodeAt(i) > 255) {
            tokens += 1.2;
        } else {
            tokens += 0.3;
        }
    }
    return Math.ceil(tokens);
}

// 实时计算当前聊天的各项 Token 占用 (已剔除内置提示词)
function calculateRealtimeTokens() {
    const char = wcState.characters.find(c => c.id === wcState.activeChatId);
    if (!char) return;
    
    let wbTokens = 0;
    let chatTokens = 0;
    let memTokens = 0;
    let stickerTokens = 0;

    // 1. 计算世界书 (从当前勾选的复选框读取)
    const wbCheckboxes = document.querySelectorAll('#wc-setting-worldbook-list input[type="checkbox"]:checked');
    const selectedWbIds = Array.from(wbCheckboxes).map(cb => cb.value);
    if (selectedWbIds.length > 0) {
        const linkedWbs = worldbookEntries.filter(e => selectedWbIds.includes(e.id.toString()));
        linkedWbs.forEach(wb => {
            wbTokens += estimateTokens(wb.title + wb.desc);
        });
    }

    // 2. 计算聊天上下文 (从当前输入的限制条数读取)
    const msgs = wcState.chats[char.id] || [];
    let limit = parseInt(document.getElementById('wc-setting-context-limit').value);
    if (isNaN(limit) || limit <= 0) limit = 30; // 默认30
    const recentMsgs = msgs.slice(-limit);
    recentMsgs.forEach(m => {
        if (!m.isError) {
            chatTokens += estimateTokens(m.content);
        }
    });

    // 3. 计算记忆 (记忆条数不在当前面板修改，直接读 config)
    if (char.memories && char.memories.length > 0) {
        const readCount = (char.chatConfig && char.chatConfig.aiMemoryCount !== undefined) ? char.chatConfig.aiMemoryCount : 5;
        const recentMemories = char.memories.slice(0, readCount);
        recentMemories.forEach(m => {
            memTokens += estimateTokens(m.content);
        });
    }

    // 4. 计算表情包 (从当前勾选的复选框读取)
    const stickerCheckboxes = document.querySelectorAll('#wc-setting-sticker-group-list input[type="checkbox"]:checked');
    const selectedStickerIds = Array.from(stickerCheckboxes).map(cb => parseInt(cb.value));
    if (selectedStickerIds.length > 0) {
        selectedStickerIds.forEach(groupId => {
            const group = wcState.stickerCategories[groupId];
            if (group && group.list) {
                group.list.forEach(s => {
                    stickerTokens += estimateTokens(s.desc);
                });
            }
        });
    }

    const totalTokens = wbTokens + chatTokens + memTokens + stickerTokens;

    // 更新 UI
    const uiTotal = document.getElementById('ui-total-token');
    if (uiTotal) uiTotal.innerText = `约 ${totalTokens.toLocaleString()}`;
    
    const dWb = document.getElementById('detail-token-wb');
    if (dWb) dWb.innerText = wbTokens.toLocaleString();
    
    const dChat = document.getElementById('detail-token-chat');
    if (dChat) dChat.innerText = chatTokens.toLocaleString();
    
    const dMem = document.getElementById('detail-token-mem');
    if (dMem) dMem.innerText = memTokens.toLocaleString();
    
    const dSticker = document.getElementById('detail-token-sticker');
    if (dSticker) dSticker.innerText = stickerTokens.toLocaleString();
    
    const dTotal = document.getElementById('detail-token-total');
    if (dTotal) dTotal.innerText = totalTokens.toLocaleString();
}

// 打开/关闭弹窗
function openTokenModal() {
    const modal = document.getElementById('tokenDetailModal');
    if (!modal) return;
    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('active'), 10);
}

function closeTokenModal() {
    const modal = document.getElementById('tokenDetailModal');
    if (!modal) return;
    modal.classList.remove('active');
    setTimeout(() => modal.style.display = 'none', 300);
}

// 查询 API 额度 (终极完美适配版)
async function refreshApiQuota() {
    const quotaEl = document.getElementById('ui-api-quota');
    if (!quotaEl) return;
    
    quotaEl.innerText = "查询中...";
    quotaEl.style.opacity = "0.5";

    try {
        const apiConfig = await getActiveApiConfig('chat');
        if (!apiConfig || !apiConfig.key || !apiConfig.baseUrl) {
            throw new Error("未配置API");
        }

        const baseUrlMatch = apiConfig.baseUrl.match(/^(https?:\/\/[^\/]+)/);
        const host = baseUrlMatch ? baseUrlMatch[1] : apiConfig.baseUrl;

        const response = await fetch(`${host}/v1/dashboard/billing/subscription`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${apiConfig.key}` }
        });

        if (!response.ok) throw new Error("接口不支持");

        const data = await response.json();
        let finalBalance = "未知";
        
        let rawValue = data.balance ?? data.remain_quota ?? data.total_available ?? data.quota;
        if (data.data) {
            rawValue = rawValue ?? data.data.balance ?? data.data.remain_quota ?? data.data.quota;
        }

        if (rawValue !== undefined && rawValue !== null) {
            let num = parseFloat(rawValue);
            if (num > 10000) {
                let calc50 = (num / 500000).toFixed(2);
                let calc10 = (num / 100000).toFixed(2);
                finalBalance = `${calc50} 或 ${calc10} (原数据:${num})`;
            } else {
                finalBalance = num.toFixed(2);
            }
        } else if (data.hard_limit_usd !== undefined) {
            let total_usage = 0;
            if (data.total_usage !== undefined) {
                total_usage = data.total_usage / 100;
            } else {
                try {
                    const now = new Date();
                    const year = now.getFullYear();
                    const month = String(now.getMonth() + 1).padStart(2, '0');
                    const day = String(now.getDate()).padStart(2, '0');
                    const startDate = `${year}-${month}-01`;
                    const endDate = `${year}-${month}-${day}`;
                    
                    const usageRes = await fetch(`${host}/v1/dashboard/billing/usage?start_date=${startDate}&end_date=${endDate}`, {
                        headers: { 'Authorization': `Bearer ${apiConfig.key}` }
                    });
                    const usageData = await usageRes.json();
                    if (usageData.total_usage !== undefined) {
                        total_usage = usageData.total_usage / 100;
                    }
                } catch(e) {}
            }
            
            // 🌟 核心修改：如果是无限额度令牌，直接显示已消耗的金额！
            if (data.hard_limit_usd > 9000000) {
                finalBalance = `已用: $${total_usage.toFixed(4)} (无限额度令牌)`;
            } else {
                finalBalance = (data.hard_limit_usd - total_usage).toFixed(2);
            }
        }

        if (finalBalance !== "未知") {
            quotaEl.innerText = finalBalance;
            quotaEl.style.fontSize = "12px"; 
        } else {
            quotaEl.innerText = "格式不支持";
        }

    } catch (e) {
        console.warn("额度查询失败:", e);
        quotaEl.innerText = "接口不支持";
    } finally {
        quotaEl.style.opacity = "1";
    }
}

// ==========================================
// 新增：位置功能核心逻辑 (发送位置 & 角色城市 & 查看地图)
// ==========================================

let sendLocMapInstance = null;
let sendLocCurrentType = 'real'; 
let sendLocRealAddress = "正在获取高精度定位...";
let sendLocLat = 0;
let sendLocLon = 0;

// 1. 打开发送位置弹窗 (User)
function wcOpenSendLocationModal() {
    wcCloseAllPanels(); 
    const modal = document.getElementById('wc-modal-send-location');
    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('active'), 10);
    
    wcSwitchSendLocTab('real'); 
    fetchSendLocation(); 
}

function wcCloseSendLocationModal() {
    const modal = document.getElementById('wc-modal-send-location');
    modal.classList.remove('active');
    setTimeout(() => modal.style.display = 'none', 300);
}

function wcSwitchSendLocTab(tab) {
    sendLocCurrentType = tab;
    document.getElementById('send-loc-seg-real').classList.toggle('active', tab === 'real');
    document.getElementById('send-loc-seg-virtual').classList.toggle('active', tab === 'virtual');
    document.getElementById('send-loc-view-real').style.display = tab === 'real' ? 'block' : 'none';
    document.getElementById('send-loc-view-virtual').style.display = tab === 'virtual' ? 'block' : 'none';
    
    if (tab === 'real' && sendLocMapInstance) {
        setTimeout(() => sendLocMapInstance.invalidateSize(), 100);
    }
}

// 获取真实定位并渲染地图
function fetchSendLocation() {
    const titleEl = document.getElementById('send-loc-real-address');
    titleEl.innerText = "正在获取高精度定位...";
    
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(async (pos) => {
            sendLocLat = pos.coords.latitude;
            sendLocLon = pos.coords.longitude;
            try {
                const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${sendLocLat}&lon=${sendLocLon}&zoom=18&addressdetails=1`, {
                    headers: { 'Accept-Language': 'zh-CN' }
                });
                const data = await res.json();
                
                let address = data.display_name;
                if (data.address) {
                    const a = data.address;
                    address = `${a.city || a.town || a.province || ''} ${a.suburb || a.county || ''} ${a.road || ''}`.trim();
                    if (!address) address = data.display_name;
                }
                
                sendLocRealAddress = address || `${sendLocLat.toFixed(4)}, ${sendLocLon.toFixed(4)}`;
                titleEl.innerText = sendLocRealAddress;

                // 渲染 Leaflet 地图
                if (typeof L !== 'undefined') {
                    if (!sendLocMapInstance) {
                        sendLocMapInstance = L.map('send-real-map-container', {
                            zoomControl: false, attributionControl: false
                        }).setView([sendLocLat, sendLocLon], 16);
                        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(sendLocMapInstance);
                    } else {
                        sendLocMapInstance.setView([sendLocLat, sendLocLon], 16);
                    }
                    setTimeout(() => { sendLocMapInstance.invalidateSize(); }, 100);
                }
            } catch (e) {
                sendLocRealAddress = `${sendLocLat.toFixed(4)}, ${sendLocLon.toFixed(4)}`;
                titleEl.innerText = sendLocRealAddress;
            }
        }, (err) => {
            sendLocRealAddress = "定位失败或未授权";
            titleEl.innerText = sendLocRealAddress;
        }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
    } else {
        sendLocRealAddress = "设备不支持定位";
        titleEl.innerText = sendLocRealAddress;
    }
}

// 发送位置到聊天 (带上经纬度参数)
function wcSubmitSendLocation() {
    const charId = wcState.activeChatId;
    if (!charId) return;

    let locTitle = "";
    let locDesc = "";
    let isVirtual = false;
    let lat = 0, lon = 0;

    if (sendLocCurrentType === 'real') {
        locTitle = sendLocRealAddress;
        locDesc = "真实地理位置";
        lat = sendLocLat;
        lon = sendLocLon;
    } else {
        const virtualInput = document.getElementById('send-loc-virtual-input').value.trim();
        if (!virtualInput) return alert("请输入虚拟地名哦~");
        locTitle = virtualInput;
        locDesc = "自定义虚拟坐标";
        isVirtual = true;
    }

    const mapClass = isVirtual ? "wc-bubble-location-map virtual" : "wc-bubble-location-map";
    const markerClass = isVirtual ? "ins-loc-marker virtual-marker" : "ins-loc-marker";
    
    // 核心：给卡片绑定 onclick 事件，传入参数打开地图弹窗
    const cardHtml = `
        <div class="wc-bubble-location-card" onclick="window.wcOpenMapView(${isVirtual}, '${locTitle}', '${locDesc}', ${lat}, ${lon})">
            <div class="${mapClass}">
                <div class="${markerClass}"></div>
            </div>
            <div class="wc-bubble-location-info">
                <div class="wc-bubble-location-title">${locTitle}</div>
                <div class="wc-bubble-location-desc">${locDesc}</div>
            </div>
        </div>
    `;

    wcAddMessage(charId, 'me', 'receipt', cardHtml);

    const aiPrompt = `[系统内部信息(仅AI可见): User 刚刚向你发送了一个地理位置。位置名称是：“${locTitle}”。请在接下来的回复中，根据这个地点做出自然的反应。]`;
    wcAddMessage(charId, 'system', 'system', aiPrompt, { hidden: true });

    wcCloseSendLocationModal();
}

// ==========================================
// 2. 角色所在城市设定逻辑 (Char)
// ==========================================
let charLocCurrentType = 'real';
let charLocMapInstance = null;
let charLocLat = 0;
let charLocLon = 0;

function wcOpenCharLocationModal() {
    const char = wcState.characters.find(c => c.id === wcState.activeChatId);
    if (!char) return;
    
    const config = char.chatConfig || {};
    const locType = config.locationType || 'real';

    wcSwitchCharLocTab(locType);
    
    if (locType === 'virtual') {
        document.getElementById('char-loc-virtual-input').value = config.locationName || '';
        document.getElementById('char-loc-virtual-distance').value = config.virtualDistance || ''; // 读取自定义距离
    } else {
        document.getElementById('char-loc-real-country').value = config.locationCountry || '';
        document.getElementById('char-loc-real-province').value = config.locationProvince || '';
        document.getElementById('char-loc-real-city').value = config.locationCity || '';
        
        // 如果之前存过经纬度，直接渲染地图
        if (config.locationLat && config.locationLon) {
            charLocLat = config.locationLat;
            charLocLon = config.locationLon;
            document.getElementById('char-loc-coords-display').innerText = `经纬度: ${charLocLat.toFixed(4)}, ${charLocLon.toFixed(4)}`;
            renderCharLocMap(charLocLat, charLocLon);
        }
    }

    const modal = document.getElementById('wc-modal-char-location');
    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('active'), 10);
}

function wcCloseCharLocationModal() {
    const modal = document.getElementById('wc-modal-char-location');
    modal.classList.remove('active');
    setTimeout(() => modal.style.display = 'none', 300);
}

function wcSwitchCharLocTab(tab) {
    charLocCurrentType = tab;
    document.getElementById('char-loc-seg-real').classList.toggle('active', tab === 'real');
    document.getElementById('char-loc-seg-virtual').classList.toggle('active', tab === 'virtual');
    document.getElementById('char-loc-view-real').style.display = tab === 'real' ? 'block' : 'none';
    document.getElementById('char-loc-view-virtual').style.display = tab === 'virtual' ? 'block' : 'none';
    
    if (tab === 'real' && charLocMapInstance) {
        setTimeout(() => charLocMapInstance.invalidateSize(), 100);
    }
}

// 搜索 Char 的真实地理位置
async function searchCharLocation() {
    const country = document.getElementById('char-loc-real-country').value.trim();
    const province = document.getElementById('char-loc-real-province').value.trim();
    const city = document.getElementById('char-loc-real-city').value.trim();
    
    if (!country && !province && !city) return alert("请至少输入一个地名进行搜索哦~");
    
    const query = [country, province, city].filter(Boolean).join('+');
    const coordsDisplay = document.getElementById('char-loc-coords-display');
    coordsDisplay.innerText = "正在搜索地图坐标...";

    try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`, {
            headers: { 'Accept-Language': 'zh-CN' }
        });
        const data = await res.json();
        
        if (data && data.length > 0) {
            charLocLat = parseFloat(data[0].lat);
            charLocLon = parseFloat(data[0].lon);
            coordsDisplay.innerText = `经纬度: ${charLocLat.toFixed(4)}, ${charLocLon.toFixed(4)}`;
            renderCharLocMap(charLocLat, charLocLon);
        } else {
            coordsDisplay.innerText = "未找到该地点的坐标，请检查拼写";
        }
    } catch (e) {
        coordsDisplay.innerText = "搜索失败，网络异常";
    }
}

function renderCharLocMap(lat, lon) {
    if (typeof L !== 'undefined') {
        if (!charLocMapInstance) {
            charLocMapInstance = L.map('char-real-map-container', {
                zoomControl: false, attributionControl: false
            }).setView([lat, lon], 12);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(charLocMapInstance);
        } else {
            charLocMapInstance.setView([lat, lon], 12);
        }
        setTimeout(() => { charLocMapInstance.invalidateSize(); }, 100);
    }
}

function wcSubmitCharLocation() {
    const char = wcState.characters.find(c => c.id === wcState.activeChatId);
    if (!char) return;
    if (!char.chatConfig) char.chatConfig = {};

    let locName = "";
    let aiPrompt = "";
    let displayLoc = "";

    if (charLocCurrentType === 'virtual') {
        locName = document.getElementById('char-loc-virtual-input').value.trim();
        const virtualDist = document.getElementById('char-loc-virtual-distance').value.trim(); // 获取自定义距离
        if (!locName) return alert("请输入虚拟城市名称哦~");
        
        char.chatConfig.locationType = 'virtual';
        char.chatConfig.locationName = locName;
        char.chatConfig.virtualDistance = virtualDist; // 保存自定义距离
        
        displayLoc = locName;
        aiPrompt = `[系统设定更新：你现在的居住地设定为“${locName}”。请在后续聊天中，严格符合该城市/异世界的背景设定，并保持与 User 异地/跨次元的逻辑。]`;
    } else {
        const country = document.getElementById('char-loc-real-country').value.trim();
        const province = document.getElementById('char-loc-real-province').value.trim();
        const city = document.getElementById('char-loc-real-city').value.trim();
        if (!country && !province && !city) return alert("请至少输入国家、省份或城市名称哦~");
        
        locName = [country, province, city].filter(Boolean).join(' ');
        
        char.chatConfig.locationType = 'real';
        char.chatConfig.locationCountry = country;
        char.chatConfig.locationProvince = province;
        char.chatConfig.locationCity = city;
        char.chatConfig.locationName = locName;
        char.chatConfig.locationLat = charLocLat;
        char.chatConfig.locationLon = charLocLon;
        
        displayLoc = locName;
        aiPrompt = `[系统设定更新：你现在的居住地设定为现实世界中的“${locName}”。请在后续聊天中，符合该地的气候、时差、文化背景，并保持与 User 异地的逻辑。]`;
    }

    wcSaveData();

    const displayEl = document.getElementById('wc-setting-loc-display');
    if (displayEl) displayEl.innerText = displayLoc;

    wcAddMessage(char.id, 'system', 'system', aiPrompt, { hidden: true });

    wcCloseCharLocationModal();
    alert("Ta 的城市设定已保存！");
}

const originalWcOpenChatSettings = wcOpenChatSettings;
wcOpenChatSettings = function() {
    originalWcOpenChatSettings(); 
    const char = wcState.characters.find(c => c.id === wcState.activeChatId);
    if (char && char.chatConfig) {
        const displayEl = document.getElementById('wc-setting-loc-display');
        if (displayEl) {
            if (char.chatConfig.locationName) {
                displayEl.innerText = char.chatConfig.locationName;
            } else {
                displayEl.innerText = '未设置';
            }
        }
    }
};

// ==========================================
// 3. 查看地图详情弹窗 (点击聊天卡片触发)
// ==========================================
let viewMapInstance = null;
let viewMapMarker = null;

window.wcOpenMapView = function(isVirtual, title, desc, lat, lon) {
    const modal = document.getElementById('wc-modal-map-view');
    document.getElementById('view-map-title').innerText = title;
    document.getElementById('view-map-desc').innerText = desc;
    
    const mapContainer = document.getElementById('view-map-container');
    const virtualBg = document.getElementById('view-map-virtual-bg');
    const coordsEl = document.getElementById('view-map-coords');

    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('active'), 10);

    if (isVirtual) {
        // 虚拟位置：显示紫色网格背景，隐藏真实地图
        virtualBg.style.display = 'flex';
        coordsEl.innerText = "经纬度: 异世界坐标无法解析";
        if (viewMapInstance) {
            viewMapInstance.remove();
            viewMapInstance = null;
        }
    } else {
        // 真实位置：隐藏虚拟背景，渲染 Leaflet 地图
        virtualBg.style.display = 'none';
        coordsEl.innerText = `经纬度: ${parseFloat(lat).toFixed(4)}, ${parseFloat(lon).toFixed(4)}`;
        
        setTimeout(() => {
            if (typeof L !== 'undefined') {
                if (!viewMapInstance) {
                    viewMapInstance = L.map('view-map-container', {
                        zoomControl: false, attributionControl: false
                    }).setView([lat, lon], 16);
                    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(viewMapInstance);
                    
                    // 添加一个红色的定位大头针
                    const customIcon = L.divIcon({
                        className: 'custom-pin',
                        html: `<svg viewBox="0 0 24 24" style="width:36px;height:36px;fill:#FF3B30;stroke:#FFF;stroke-width:2;filter:drop-shadow(0 4px 6px rgba(0,0,0,0.3));"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3" fill="#FFF"></circle></svg>`,
                        iconSize: [36, 36],
                        iconAnchor: [18, 36]
                    });
                    viewMapMarker = L.marker([lat, lon], {icon: customIcon}).addTo(viewMapInstance);
                } else {
                    viewMapInstance.setView([lat, lon], 16);
                    viewMapMarker.setLatLng([lat, lon]);
                }
                viewMapInstance.invalidateSize();
            }
        }, 300); // 等待弹窗动画结束再渲染地图，防止尺寸计算错误
    }
}

window.wcCloseMapView = function() {
    const modal = document.getElementById('wc-modal-map-view');
    modal.classList.remove('active');
    setTimeout(() => modal.style.display = 'none', 300);
}
// ==========================================
// 新增：API 报错弹窗控制逻辑
// ==========================================
window.showApiErrorModal = function(errorMsg) {
    const modal = document.getElementById('api-error-modal');
    const textContainer = document.getElementById('api-error-text');
    const btnText = document.getElementById('copy-btn-text');
    
    if (modal && textContainer) {
        textContainer.innerText = errorMsg;
        if (btnText) btnText.innerText = '一键复制报错信息'; // 重置按钮文字
        
        modal.style.display = 'flex';
        setTimeout(() => modal.classList.add('active'), 10);
    }
};

window.closeApiErrorModal = function() {
    const modal = document.getElementById('api-error-modal');
    if (modal) {
        modal.classList.remove('active');
        setTimeout(() => {
            modal.style.display = 'none';
        }, 300);
    }
};

window.copyApiErrorText = function() {
    const text = document.getElementById('api-error-text').innerText;
    const textArea = document.createElement("textarea");
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    
    try {
        document.execCommand('copy');
        const btnText = document.getElementById('copy-btn-text');
        if (btnText) btnText.innerText = '复制成功！';
        if (navigator.vibrate) navigator.vibrate(50);
    } catch (err) {
        alert('复制失败，请手动长按上方灰色区域的文本进行复制哦~');
    }
    document.body.removeChild(textArea);
};
// ==========================================
// 角色生活状态系统 (Life Status)
// ==========================================

// 初始化或获取角色的状态数据
function getCharLifeStatus(charId) {
    let char = wcState.characters.find(c => c.id === charId);
    if (!char) return null;
    
    if (!char.lifeStatus) {
        char.lifeStatus = {
            location: "未知",
            action: "未知",
            mood: "未知",
            timeline: [],
            autoRefresh: true,
            refreshTime: "06:00",
            lastRefreshTimestamp: 0 // 记录上次刷新的时间戳
        };
    }
    return char.lifeStatus;
}

// 打开状态弹窗
function wcOpenCharStatusModal() {
    if (!wcState.activeChatId) {
        alert("请在单人聊天中使用");
        return;
    }
    wcCloseAllPanels(); // 关闭更多面板
    
    const status = getCharLifeStatus(wcState.activeChatId);
    if (!status) return;
    // 如果跨天了，只清空 timeline，保留当前状态(模拟在线)
    if (status.autoRefresh && isNewDayForStatus(status)) {
        status.timeline = [];
        wcSaveData();
    }

    // 渲染设置
    document.getElementById('ins-status-time-picker').value = status.refreshTime || "06:00";
    document.getElementById('ins-status-auto-toggle').checked = status.autoRefresh !== false;
    
    // 渲染内容
    renderCharStatusUI(status);
    
    wcOpenModal('wc-modal-char-status');
}

// 保存设置
function wcSaveCharStatusSettings() {
    if (!wcState.activeChatId) return;
    const status = getCharLifeStatus(wcState.activeChatId);
    if (!status) return;
    
    status.refreshTime = document.getElementById('ins-status-time-picker').value;
    status.autoRefresh = document.getElementById('ins-status-auto-toggle').checked;
    wcSaveData();
}

// 渲染 UI
function renderCharStatusUI(status) {
    document.getElementById('ins-status-loc').innerText = status.location || "未知";
    document.getElementById('ins-status-act').innerText = status.action || "未知";
    document.getElementById('ins-status-mood').innerText = status.mood || "暂无状态";
    
    const timelineContainer = document.getElementById('ins-status-timeline');
    timelineContainer.innerHTML = '';
    
    if (!status.timeline || status.timeline.length === 0) {
        timelineContainer.innerHTML = '<div style="font-size: 12px; color: #888; text-align: center; padding: 20px 0;">暂无行程记录，点击刷新生成</div>';
        return;
    }
    
    status.timeline.forEach((item, index) => {
        const isLast = index === status.timeline.length - 1;
        const html = `
            <div class="ins-timeline-item ${isLast ? 'active' : ''}">
                <div class="ins-timeline-dot"></div>
                <div class="ins-timeline-time">${item.time} ${isLast ? '(Now)' : ''}</div>
                <div class="ins-timeline-content">${item.content}</div>
            </div>
        `;
        timelineContainer.insertAdjacentHTML('beforeend', html);
    });
}

// 判断是否跨越了设定的刷新时间 (即是否是新的一天)
function isNewDayForStatus(status) {
    const now = new Date();
    const lastRefresh = new Date(status.lastRefreshTimestamp || 0);
    
    // 解析设定的刷新时间 (如 "06:00")
    const [refreshHour, refreshMinute] = (status.refreshTime || "06:00").split(':').map(Number);
    
    // 获取今天的刷新时间点
    const todayRefreshTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), refreshHour, refreshMinute, 0);
    
    // 如果当前时间已经过了今天的刷新点，且上次刷新时间在今天的刷新点之前，说明跨天了
    if (now >= todayRefreshTime && lastRefresh < todayRefreshTime) {
        return true;
    }
    
    // 如果当前时间还没到今天的刷新点，但上次刷新时间在昨天的刷新点之前，也算跨天
    const yesterdayRefreshTime = new Date(todayRefreshTime.getTime() - 24 * 60 * 60 * 1000);
    if (now < todayRefreshTime && lastRefresh < yesterdayRefreshTime) {
        return true;
    }
    
    return false;
}

// 核心：请求 AI 生成/刷新状态 (极致活人感与时间感知版 - 极简模糊化)
async function wcGenerateCharStatus() {
    const charId = wcState.activeChatId;
    if (!charId) return;
    
    const char = wcState.characters.find(c => c.id === charId);
    if (!char) return;
    
    const apiConfig = await getActiveApiConfig('chat');
    if (!apiConfig || !apiConfig.key) return alert("请先配置 API");

    const status = getCharLifeStatus(charId);
    const isNewDay = isNewDayForStatus(status);
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const currentTimeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    const dayString = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'][now.getDay()];
    
    // 强力时间段感知
    let timeSlotVibe = "";
    if (hours >= 0 && hours < 6) timeSlotVibe = "凌晨/深夜：绝大多数人都在睡觉。如果行程更新在这个时间，大概率是‘睡得正香’、‘翻了个身’、‘起夜喝水’，或者‘被手机震动吵醒，有点懵/烦躁’。";
    else if (hours >= 6 && hours < 9) timeSlotVibe = "清晨：刚醒、洗漱、买早饭、通勤挤地铁。可能带有起床气、没睡醒的迷糊感，或者匆忙感。";
    else if (hours >= 9 && hours < 12) timeSlotVibe = "上午：正常上课或工作时间。状态可能是‘认真听讲/干活’，也可能是‘偷偷摸鱼刷手机’、‘喝咖啡续命’。";
    else if (hours >= 12 && hours < 14) timeSlotVibe = "中午：午休时间。干饭、排队拿外卖、趴在桌上睡午觉。";
    else if (hours >= 14 && hours < 18) timeSlotVibe = "下午：下午的课程或工作。容易犯困、发呆、盯着窗外、期待下班/放学。";
    else if (hours >= 18 && hours < 21) timeSlotVibe = "傍晚：下班/放学、吃晚饭、通勤回家、在沙发上瘫着。";
    else timeSlotVibe = "夜晚：私人放松时间。洗澡、打游戏、看剧、护肤、躺在床上酝酿睡意。";

    // 准备已有行程文本
    let existingTimelineText = "无";
    if (!isNewDay && status.timeline && status.timeline.length > 0) {
        existingTimelineText = status.timeline.map(t => `[${t.time}] ${t.content}`).join('\n');
    }

    const prompt = `
你是一个极具“活人感”的角色扮演辅助系统。请根据角色的设定和当前极其具体的时间点，推断角色【现在】正在经历的生活碎片，并生成行程记录。

【角色设定】：${char.prompt || char.name}
【当前现实时间】：${dayString} ${currentTimeStr}
【当前时间段状态参考】：${timeSlotVibe}

【核心生成要求（最高优先级）】：
1. **极度模糊与简练**：不要写具体的长句！"location"、"action"、"mood" 这三个字段【绝对不能超过10个字】！越短越好，越模糊越有真实感。
   - "location" (地点)：如：被窝里、路上、工位、阳台、便利店。
   - "action" (动作)：如：发呆、刚睡醒、走路、摸鱼中、吃东西。
   - "mood" (状态/心情)：如：有点困、很烦躁、心情不错、饿了、懵懵的。
2. **严格符合当前时间**：如果现在是凌晨3点，Ta大概率在睡觉，被吵醒了可能有点懵或起床气；如果是中午12点，Ta可能在干饭或午休。绝对不能出现时间逻辑错误！
3. **行程记录要求**：
   - ${isNewDay ? '这是新的一天！请清空之前的行程，根据当前时间生成 1 到 3 条从今天早上到现在的【生活碎片记录】。' : '这是同一天的状态更新！请在以下已有行程的基础上，推断角色现在的新状态，并追加 1 条当前时间的【最新生活碎片】。'}
   - 行程内容可以稍微长一点，写成有画面的小事（例如：“差点没赶上公交，匆忙咽下了一个冷掉的包子”）。
4. **已有行程记录**：\n${existingTimelineText}
5. **绝对禁止**：全文严禁使用任何 emoji 表情符号！严禁出现颜文字！

请严格返回以下 JSON 格式（不要包含 markdown 代码块，直接返回纯 JSON）：
{
  "location": "极简地点(10字内)",
  "action": "极简动作(10字内)",
  "mood": "极简状态(10字内)",
  "newTimeline": [
    {"time": "时间(如 08:15)", "content": "充满画面的生活碎片记录"}
  ]
}`;

    wcShowLoading("正在感知 Ta 的生活...");
    try {
        const response = await fetch(`${apiConfig.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiConfig.key}` },
            body: JSON.stringify({
                model: apiConfig.model,
                messages: [{ role: "user", content: prompt }],
                temperature: 0.8 
            })
        });

        const data = await response.json();
        let cleanText = data.choices[0].message.content.replace(/<thinking>[\s\S]*?<\/thinking>/g, '').trim();
        cleanText = cleanText.replace(/```json/g, '').replace(/```/g, '').trim();
        const result = JSON.parse(cleanText);

        // 更新状态数据
        status.location = result.location;
        status.action = result.action;
        status.mood = result.mood;
        status.lastRefreshTimestamp = now.getTime();

        // 更新行程
        if (isNewDay) {
            status.timeline = result.newTimeline || []; // 新的一天，直接覆盖
        } else {
            if (result.newTimeline && result.newTimeline.length > 0) {
                status.timeline.push(...result.newTimeline); // 同一天，追加
            }
        }

        wcSaveData();
        renderCharStatusUI(status);
        // 手动刷新后，同步更新聊天顶栏
        if (wcState.activeChatId === charId) {
            const char = wcState.characters.find(c => c.id === charId);
            if (char) updateChatTopBarStatus(char);
        }
        wcShowSuccess("状态已更新");

    } catch (error) {
        console.error(error);
        wcShowError("获取状态失败");
    }
}
// ==========================================
// 新增：食谱系统 (Recipe) 核心逻辑
// ==========================================

// 初始化食谱数据
function initRecipeData(char) {
    if (!char.phoneData) char.phoneData = {};
    if (!char.phoneData.recipe) {
        char.phoneData.recipe = {
            my: { b: '', l: '', d: '', edits: {} },
            ta: { b: '', l: '', d: '', edits: {} }
        };
    }
    return char.phoneData.recipe;
}

// 打开食谱主页
function wcActionRecipe() {
    wcCloseAllPanels();
    document.getElementById('wc-view-chat-detail').classList.remove('active');
    document.getElementById('wc-view-recipe').classList.add('active');
    
    const globalNavbar = document.querySelector('.wc-navbar');
    if (globalNavbar) globalNavbar.style.display = 'none';

    wcSwitchRecipeTab('my');
}

function wcCloseRecipePage() {
    document.getElementById('wc-view-recipe').classList.remove('active');
    document.getElementById('wc-view-chat-detail').classList.add('active');
    
    const globalNavbar = document.querySelector('.wc-navbar');
    if (globalNavbar) globalNavbar.style.display = 'flex';
}

function wcSwitchRecipeTab(tab) {
    // 切换钢琴键状态
    document.querySelectorAll('.piano-key').forEach(el => el.classList.remove('active'));
    document.getElementById(`recipe-tab-${tab}`).classList.add('active');
    wcRenderRecipeContent(tab);
}

function wcRenderRecipeContent(tab) {
    const char = wcState.characters.find(c => c.id === wcState.activeChatId);
    if (!char) return;
    const recipeData = initRecipeData(char);
    const data = tab === 'my' ? recipeData.my : recipeData.ta;
    const container = document.getElementById('wc-recipe-content-area');
    
    const title = tab === 'my' ? "TODAY'S MENU" : "TA'S MENU";
    
    let html = `
        <div class="recipe-card active">
            <div class="recipe-card-header">
                <div class="recipe-date">${title}</div>
                <div class="recipe-edit-btn" onclick="wcEditRecipe('${tab}')">
                    <svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                    编辑
                </div>
            </div>
    `;

    const meals = [
        { key: 'b', icon: '🥐', name: 'Breakfast' },
        { key: 'l', icon: '🍱', name: 'Lunch' },
        { key: 'd', icon: '🍲', name: 'Dinner' }
    ];

    meals.forEach(m => {
        let desc = data[m.key] || '暂无记录，点击右上角编辑';
        if (data.edits && data.edits[m.key]) {
            desc = `<span style="color:#FF9500; font-weight:bold;">[已修改]</span> ${desc}`;
        }
        html += `
            <div class="meal-item">
                <div class="meal-icon-box">${m.icon}</div>
                <div class="meal-info">
                    <div class="meal-name">${m.name}</div>
                    <div class="meal-desc">${desc}</div>
                </div>
            </div>
        `;
    });

    // 动态生成底部操作区
    if (tab === 'ta') {
        const autoTime = data.autoTime || '12:00';
        html += `
            <div style="background: #F9F9F9; border-radius: 16px; padding: 16px; margin-top: 20px; border: 1px solid #F0F0F0;">
                <div style="font-size: 13px; font-weight: bold; color: #111; margin-bottom: 10px;">定时报备设置</div>
                <div style="display: flex; align-items: center; justify-content: space-between;">
                    <span style="font-size: 12px; color: #888;">到达设定时间自动发送食谱</span>
                    <input type="time" value="${autoTime}" onchange="wcSaveRecipeAutoTime(this.value)" style="background: #FFF; border: 1px solid #EAEAEA; padding: 6px 10px; border-radius: 8px; font-family: monospace; outline: none; color: #111;">
                </div>
            </div>
            <button class="recipe-action-btn btn-dark" onclick="wcGenerateTaRecipe(true)">
                <svg viewBox="0 0 24 24" style="width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:2;"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                让 Ta 立即生成并主动报备
            </button>
        `;
    } else {
        html += `
            <button class="recipe-action-btn btn-dark" onclick="wcSendRecipe('my')">
                <svg viewBox="0 0 24 24" style="width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:2;"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                发送给 Ta
            </button>
        `;
    }

    html += `</div>`;
    container.innerHTML = html;
}

// 保存定时发送时间
window.wcSaveRecipeAutoTime = function(timeVal) {
    const char = wcState.characters.find(c => c.id === wcState.activeChatId);
    if (!char) return;
    const recipeData = initRecipeData(char);
    recipeData.ta.autoTime = timeVal;
    wcSaveData();
};

// ==========================================
// 新增：高级食谱编辑弹窗逻辑
// ==========================================
let currentRecipeEditTab = 'my';

function wcEditRecipe(tab) {
    currentRecipeEditTab = tab;
    const char = wcState.characters.find(c => c.id === wcState.activeChatId);
    if (!char) return;
    const recipeData = initRecipeData(char);
    const data = tab === 'my' ? recipeData.my : recipeData.ta;

    // 填充当前数据到输入框
    document.getElementById('re-input-b').value = data.b || '';
    document.getElementById('re-input-l').value = data.l || '';
    document.getElementById('re-input-d').value = data.d || '';

    // 设置标题
    const title = tab === 'my' ? "编辑我的食谱" : "修改 Ta 的食谱";
    document.getElementById('re-modal-title').innerText = title;

    // 打开弹窗
    const modal = document.getElementById('wc-modal-recipe-edit');
    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('active'), 10);
}

function wcCloseRecipeEdit() {
    const modal = document.getElementById('wc-modal-recipe-edit');
    modal.classList.remove('active');
    setTimeout(() => modal.style.display = 'none', 300);
}

function wcSaveRecipeEdit() {
    const char = wcState.characters.find(c => c.id === wcState.activeChatId);
    if (!char) return;
    const recipeData = initRecipeData(char);
    const data = currentRecipeEditTab === 'my' ? recipeData.my : recipeData.ta;

    // 获取新输入的数据
    const newB = document.getElementById('re-input-b').value.trim();
    const newL = document.getElementById('re-input-l').value.trim();
    const newD = document.getElementById('re-input-d').value.trim();

    let isModified = false;

    // 辅助函数：检查并记录修改
    const checkAndRecord = (key, newVal) => {
        const oldVal = data[key] || '';
        if (oldVal !== newVal) {
            isModified = true;
            // 如果是修改对方的食谱，记录修改痕迹
            if (currentRecipeEditTab === 'ta') {
                if (!data.edits) data.edits = {};
                data.edits[key] = {
                    old: oldVal || '无',
                    new: newVal,
                    author: wcState.user.name
                };
            }
            data[key] = newVal; // 更新数据
        }
    };

    checkAndRecord('b', newB);
    checkAndRecord('l', newL);
    checkAndRecord('d', newD);

    if (isModified) {
        wcSaveData();
        wcRenderRecipeContent(currentRecipeEditTab);

        // 如果修改了对方的食谱，发送卡片并通知 AI
        if (currentRecipeEditTab === 'ta') {
            wcAddMessage(char.id, 'me', 'recipe', '食谱', {
                title: "Ta's Menu (已修改)",
                desc: `我帮你把食谱改了`,
                isEdited: true,
                recipeData: JSON.parse(JSON.stringify(data)) // 深拷贝当前状态
            });
            
            wcAddMessage(char.id, 'system', 'system', `[系统内部信息: User 刚刚强行修改了你的今日食谱。请在回复中对此做出反应（比如抗议、撒娇或顺从）。]`, { hidden: true });
        }
    }

    wcCloseRecipeEdit();
}

// 发送我的食谱到聊天
function wcSendRecipe(tab) {
    const char = wcState.characters.find(c => c.id === wcState.activeChatId);
    if (!char) return;
    const recipeData = initRecipeData(char);
    const data = tab === 'my' ? recipeData.my : recipeData.ta;

    wcAddMessage(char.id, 'me', 'recipe', '食谱', {
        title: "My Menu",
        desc: "这是我今天的食谱哦~",
        isEdited: false,
        recipeData: JSON.parse(JSON.stringify(data))
    });
    
    wcAddMessage(char.id, 'system', 'system', `[系统内部信息: User 刚刚向你发送了Ta的今日食谱。早餐:${data.b||'无'}，午餐:${data.l||'无'}，晚餐:${data.d||'无'}。请在回复中对此做出反应。]`, { hidden: true });
    
    wcCloseRecipePage();
    alert("已发送给 Ta！");
}

// AI 生成 Ta 的食谱 (支持主动发送到聊天)
window.wcGenerateTaRecipe = async function(sendToChat = false, targetCharId = null) {
    const charId = targetCharId || wcState.activeChatId;
    const char = wcState.characters.find(c => c.id === charId);
    if (!char) return;

    const apiConfig = await getActiveApiConfig('chat');
    if (!apiConfig || !apiConfig.key) {
        if (!targetCharId) alert("请先配置 API");
        return;
    }

    if (!targetCharId) wcShowLoading("正在感知 Ta 的饮食...");

    try {
        let prompt = `你扮演角色：${char.name}。\n人设：${char.prompt}\n`;
        prompt += `请根据你的人设和当前的生活状态，生成你今天的【一日三餐食谱】。\n`;
        prompt += `要求：\n1. 必须符合你的性格（比如：养生人吃沙拉，打工人吃外卖，发疯人吃泡面）。\n`;
        prompt += `2. 返回纯 JSON 对象，格式如下：\n`;
        prompt += `{"b": "早餐内容", "l": "午餐内容", "d": "晚餐内容"}\n`;

        const response = await fetch(`${apiConfig.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiConfig.key}` },
            body: JSON.stringify({
                model: apiConfig.model,
                messages: [{ role: "user", content: prompt }],
                temperature: 0.8
            })
        });

        const data = await response.json();
        let content = data.choices[0].message.content.replace(/<thinking>[\s\S]*?<\/thinking>/g, '').trim();
        content = content.replace(/```json/g, '').replace(/```/g, '').trim();
        const result = JSON.parse(content);

        const recipeData = initRecipeData(char);
        // 保留原有的 autoTime 设置
        const currentAutoTime = recipeData.ta.autoTime || '12:00';
        recipeData.ta = { b: result.b, l: result.l, d: result.d, edits: {}, autoTime: currentAutoTime };
        
        // 如果是定时触发，记录今天已经发送过
        if (targetCharId) {
            const todayStr = new Date().toDateString();
            recipeData.ta.lastAutoSendDate = todayStr;
        }
        
        wcSaveData();
        
        // 如果当前停留在食谱页，刷新 UI
        if (!targetCharId && document.getElementById('wc-view-recipe').classList.contains('active')) {
            wcRenderRecipeContent('ta');
        }

        // 如果要求发送到聊天界面
        if (sendToChat) {
            wcAddMessage(char.id, 'them', 'recipe', '食谱', {
                title: "Ta's Menu",
                desc: "这是我今天的食谱哦~",
                isEdited: false,
                recipeData: JSON.parse(JSON.stringify(recipeData.ta))
            });
            
            // 发送一条配套的文本消息
            wcAddMessage(char.id, 'them', 'text', "给你看看我今天吃了什么~");
            
            // 触发系统通知
            if (typeof showMainSystemNotification === 'function') {
                showMainSystemNotification("今日食谱", `${char.name} 向你报备了今日食谱`, char.avatar);
            }
        }

        if (!targetCharId) wcShowSuccess("生成并发送成功！");

    } catch (e) {
        console.error(e);
        if (!targetCharId) wcShowError("生成失败");
    }
};

// 打开聊天记录中的食谱详情弹窗
window.wcOpenRecipeDetail = function(msgId) {
    const msgs = wcState.chats[wcState.activeChatId];
    const msg = msgs.find(m => m.id.toString() === msgId.toString());
    if (!msg || !msg.recipeData) return;

    const data = msg.recipeData;
    document.getElementById('recipe-detail-title').innerText = msg.title;
    
    const container = document.getElementById('recipe-detail-content');
    let html = '';

    const meals = [
        { key: 'b', label: 'BRKF' },
        { key: 'l', label: 'LNCH' },
        { key: 'd', label: 'DINR' }
    ];

    meals.forEach(m => {
        let detailHtml = '';
        if (data.edits && data.edits[m.key]) {
            // 有修改痕迹
            const edit = data.edits[m.key];
            detailHtml = `
                <div class="rm-edit-group">
                    <div class="rm-text-old">${edit.old}</div>
                    <div class="rm-text-new">${edit.new}</div>
                    <div class="rm-edit-author">${edit.author} 修改了此项</div>
                </div>
            `;
        } else {
            // 正常显示
            detailHtml = `<div class="rm-text-normal">${data[m.key] || '无'}</div>`;
        }

        html += `
            <div class="rm-meal-item">
                <div class="rm-meal-label">${m.label}</div>
                <div class="rm-meal-detail">${detailHtml}</div>
            </div>
        `;
    });

    container.innerHTML = html;
    
    const modal = document.getElementById('wc-modal-recipe-detail');
    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('active'), 10);
};

window.wcCloseRecipeDetail = function(e) {
    if (e && e.target.id !== 'wc-modal-recipe-detail') return;
    const modal = document.getElementById('wc-modal-recipe-detail');
    modal.classList.remove('active');
    setTimeout(() => modal.style.display = 'none', 300);
};
// ==========================================
// 新增：高级小票弹窗逻辑
// ==========================================
window.wcOpenReceiptDetail = function(msgId) {
    const msgs = wcState.chats[wcState.activeChatId];
    const msg = msgs.find(m => m.id.toString() === msgId.toString());
    if (!msg || !msg.receiptData) return;

    const data = msg.receiptData;
    
    document.getElementById('rcpt-logo').innerText = data.logo || 'RECEIPT';
    document.getElementById('rcpt-date').innerText = data.date || new Date().toLocaleString();
    
    let itemsHtml = '';
    if (data.items && data.items.length > 0) {
        data.items.forEach(item => {
            itemsHtml += `
                <div class="rcpt-row">
                    <div class="rcpt-col-left">1x ${item.name}</div>
                    <div class="rcpt-col-right">¥${item.price}</div>
                </div>
            `;
        });
    }
    document.getElementById('rcpt-items').innerHTML = itemsHtml;
    
    document.getElementById('rcpt-subtotal').innerText = `¥${data.total}`;
    document.getElementById('rcpt-total').innerText = `¥${data.total}`;
    document.getElementById('rcpt-msg').innerText = data.msg || '';
    
    // 随机生成一个订单号
    document.getElementById('rcpt-order-no').innerText = `ORD-${Math.floor(Math.random() * 900000000) + 100000000}`;

    const modal = document.getElementById('wc-modal-receipt');
    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('active'), 10);
};

window.wcCloseReceiptDetail = function(e) {
    if (e && e.target.id !== 'wc-modal-receipt' && !e.target.classList.contains('rcpt-close')) return;
    const modal = document.getElementById('wc-modal-receipt');
    modal.classList.remove('active');
    setTimeout(() => modal.style.display = 'none', 300);
};
// ==========================================
// 听歌总结弹窗逻辑
// ==========================================
window.musicOpenSummaryModal = function(msgId) {
    const charId = wcState.activeChatId;
    const char = wcState.characters.find(c => c.id === charId);
    if (!char) return;

    const msgs = wcState.chats[charId];
    const msg = msgs.find(m => m.id.toString() === msgId.toString());
    if (!msg || !msg.summaryData) return alert("报告数据已丢失");

    const data = msg.summaryData;

    // 渲染头像
    const userAvatar = (char.chatConfig && char.chatConfig.userAvatar) ? char.chatConfig.userAvatar : wcState.user.avatar;
    document.getElementById('summary-avatar-user').src = userAvatar;
    document.getElementById('summary-avatar-char').src = char.avatar;

    // 格式化时长 (HH:MM:SS)
    const totalSecs = Math.floor(data.durationMs / 1000);
    const h = Math.floor(totalSecs / 3600).toString().padStart(2, '0');
    const m = Math.floor((totalSecs % 3600) / 60).toString().padStart(2, '0');
    const s = (totalSecs % 60).toString().padStart(2, '0');
    document.getElementById('summary-duration').innerText = `${h}:${m}:${s}`;

    // 歌曲数量
    document.getElementById('summary-song-count').innerText = `${data.songCount} 首`;

    // 格式化开始和结束时间 (YYYY-MM-DD HH:MM:SS)
    const formatFullTime = (ts) => {
        const d = new Date(ts);
        return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}`;
    };
    document.getElementById('summary-start-time').innerText = formatFullTime(data.startTime);
    document.getElementById('summary-end-time').innerText = formatFullTime(data.endTime);

    // 显示弹窗
    const modal = document.getElementById('music-modal-summary');
    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('active'), 10);
};

window.musicCloseSummaryModal = function(e) {
    if (e && e.target.id !== 'music-modal-summary') return;
    const modal = document.getElementById('music-modal-summary');
    modal.classList.remove('active');
    setTimeout(() => modal.style.display = 'none', 300);
};
// ==========================================
// 论坛新增：热搜功能逻辑
// ==========================================
async function forumGenerateHotSearches() {
    const apiConfig = await getActiveApiConfig('forum');
    if (!apiConfig || !apiConfig.key) return alert("请先配置 API");

    const list = document.getElementById('forum-hot-search-list');
    list.innerHTML = '<div style="text-align:center; padding:40px 0;"><div class="wc-ios-spinner" style="margin: 0 auto;"></div><div style="color:#888; margin-top:10px; font-size:13px;">正在获取全网热点...</div></div>';

    try {
        // 👇 新增：读取关联的世界书和角色设定 👇
        let contextInfo = "";
        if (forumState.config.worldbookIds && forumState.config.worldbookIds.length > 0) {
            const wbs = worldbookEntries.filter(e => forumState.config.worldbookIds.includes(e.id.toString()));
            if (wbs.length > 0) {
                contextInfo += "【世界观背景参考】:\n" + wbs.map(e => `${e.title}: ${e.desc}`).join('\n') + "\n\n";
            }
        }
        if (forumState.config.charIds && forumState.config.charIds.length > 0) {
            const chars = wcState.characters.filter(c => forumState.config.charIds.includes(c.id.toString()));
            if (chars.length > 0) {
                contextInfo += "【相关人物设定参考】:\n" + chars.map(c => `${c.name}: ${c.prompt}`).join('\n') + "\n\n";
            }
        }

        let prompt = `你现在是一个社交论坛的后台引擎。请生成 10 个当前最热门的搜索词条（热搜）。\n`;
        
        // 👈 将背景设定注入到 Prompt 中
        if (contextInfo) {
            prompt += `请务必结合以下背景设定来生成热搜内容，让热搜看起来是发生在这个世界里的真实事件：\n${contextInfo}`;
        }
        
        prompt += `要求：\n`;
        prompt += `1. 词条内容可以是：社会新闻、娱乐八卦、重大事件、或者带有悬疑/科幻色彩的事件。\n`;
        prompt += `2. 词条要简短有力，像真实的微博/B站热搜（例如：赛博朋克边缘行者大结局、魔法学院新生入学指南、某某角色深夜密会）。\n`;
        prompt += `3. 返回纯 JSON 数组，格式如下：\n`;
        prompt += `["词条1", "词条2", "词条3"]\n`;

        const response = await fetch(`${apiConfig.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiConfig.key}` },
            body: JSON.stringify({
                model: apiConfig.model,
                messages: [{ role: "user", content: prompt }],
                temperature: 0.9
            })
        });

        const data = await response.json();
        let content = data.choices[0].message.content.replace(/```json/g, '').replace(/```/g, '').trim();
        const topics = JSON.parse(content);

        forumState.hotSearches = topics.map(t => ({
            title: t,
            heat: Math.floor(Math.random() * 500) + 100
        }));
        forumSaveData();
        forumRenderHotSearches();

    } catch (e) {
        console.error(e);
        list.innerHTML = '<div style="text-align:center; color:#FF3B30; padding:40px 0; font-size:13px;">获取失败，请重试</div>';
    }
}

function forumRenderHotSearches() {
    const list = document.getElementById('forum-hot-search-list');
    list.innerHTML = '';
    
    if (!forumState.hotSearches || forumState.hotSearches.length === 0) {
        list.innerHTML = '<div style="text-align:center; color:#999; padding:40px 0; font-size:13px;">点击顶栏右侧刷新图标获取全网热点</div>';
        return;
    }

    forumState.hotSearches.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'hot-item';
        div.onclick = () => forumClickHotSearch(item.title);
        div.innerHTML = `
            <div class="hot-rank">${index + 1}</div>
            <div class="hot-title">${item.title}</div>
            <div class="hot-heat">${item.heat}w</div>
        `;
        list.appendChild(div);
    });
}

function forumClickHotSearch(topic) {
    // 取前三个字加省略号作为窗口名
    const shortName = topic.length > 3 ? topic.substring(0, 3) + '...' : topic;
    
    // 检查是否已经存在同名窗口
    const existingWin = forumState.windows.find(w => w.name === shortName);
    
    if (existingWin) {
        // 如果存在，直接切换到该窗口
        forumState.activeWindowId = existingWin.id;
    } else {
        // 如果不存在，创建新窗口
        const newId = 'win_' + Date.now();
        forumState.windows.push({ 
            id: newId, 
            name: shortName, 
            prompt: `这是关于【${topic}】的专属讨论频道。请生成与此话题高度相关的帖子和讨论。` 
        });
        forumState.activeWindowId = newId;
    }
    
    forumSaveData();
    
    // 刷新顶栏窗口列表
    forumRenderWindows();
    
    // 切换回主页视图
    forumSwitchTab('home');
    
    // 如果是新创建的，或者里面没帖子，给个提示
    const currentPosts = forumState.posts.filter(p => p.windowId === forumState.activeWindowId && p.type === 'home');
    if (currentPosts.length === 0) {
        const container = document.getElementById('forum-post-list-home');
        if (container) {
            container.innerHTML = `<div style="text-align:center; color:#999; padding:60px 20px; font-size:14px; line-height:1.6;">欢迎来到【${topic}】专属频道<br>点击右上角让AI生成相关内容吧</div>`;
        }
    }
}

// ==========================================
// 论坛新增：同人文菜单与催更逻辑
// ==========================================
function forumOpenFanficMenu(postId) {
    forumState.actionPostId = postId;
    wcOpenModal('forum-fanfic-action-sheet');
}

function forumAddToBookstore() {
    const post = forumState.posts.find(p => p.id === forumState.actionPostId);
    if (!post) return;

    // 检查是否已存在
    const exists = forumState.books.find(b => b.originalPostId === post.id);
    if (exists) {
        wcCloseModal('forum-fanfic-action-sheet');
        return alert("这本书已经在你的书城里啦！");
    }

    // 随机生成一个封面颜色
    const colors = ['#4A5568', '#2D3748', '#8E54E9', '#4776E6', '#FF9A9E', '#FECFEF', '#43E97B', '#38F9D7'];
    const bg1 = colors[Math.floor(Math.random() * colors.length)];
    const bg2 = colors[Math.floor(Math.random() * colors.length)];

    const newBook = {
        id: Date.now(),
        originalPostId: post.id,
        title: post.title || '无题',
        author: post.author.name,
        desc: post.content.substring(0, 50) + '...',
        coverBg: `linear-gradient(135deg, ${bg1}, ${bg2})`,
        chapters: [
            { title: '第一章', content: post.content, time: post.time }
        ]
    };

    forumState.books.unshift(newBook);
    forumSaveData();
    wcCloseModal('forum-fanfic-action-sheet');
    alert("已成功加入书城！点击左上角 LABEL 即可查看。");
}

function forumOpenUrgeModal() {
    wcCloseModal('forum-fanfic-action-sheet');
    setTimeout(() => {
        document.getElementById('forum-urge-prompt').value = '';
        wcOpenModal('forum-urge-modal');
    }, 300);
}

async function forumSubmitUrge() {
    const post = forumState.posts.find(p => p.id === forumState.actionPostId);
    if (!post) return;

    const urgeText = document.getElementById('forum-urge-prompt').value.trim();
    
    const apiConfig = await getActiveApiConfig('forum');
    if (!apiConfig || !apiConfig.key) return alert("请先配置 API");

    wcCloseModal('forum-urge-modal');
    wcShowLoading("作者正在快马加鞭码字中...");

    try {
        let prompt = `你是一个同人文作者。你的读者正在催更你的小说。\n`;
        prompt += `【小说作者（你现在的笔名）】：${post.author.name}\n`;
        prompt += `【前文内容】：\n${post.content}\n\n`;
        if (urgeText) {
            prompt += `【读者的剧情期望】：${urgeText}\n\n`;
        }
        prompt += `请根据前文和读者的期望，续写下一章的内容。\n`;
        prompt += `【核心要求】：\n`;
        prompt += `1. 续写正文：字数 500-1000 字，保持文风一致，推动剧情发展。\n`;
        prompt += `2. 读者评论：生成 3-5 条读者看到最新更新后的激动评论（如：啊啊啊终于更新了、太太太会写了、好甜/好虐等）。\n`;
        prompt += `3. 返回纯 JSON 对象，格式如下：\n`;
        prompt += `{
  "content": "续写的正文内容（支持使用 \\n 换行排版）...",
  "comments": [
    {"name": "读者A", "content": "评论内容"}
  ]
}\n`;

        const response = await fetch(`${apiConfig.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiConfig.key}` },
            body: JSON.stringify({
                model: apiConfig.model,
                messages: [{ role: "user", content: prompt }],
                temperature: 0.8,
                max_tokens: 4000
            })
        });

        const data = await response.json();
        let content = data.choices[0].message.content.replace(/<thinking>[\s\S]*?<\/thinking>/g, '').trim();
        content = content.replace(/```json/g, '').replace(/```/g, '').trim();

        let result;
        try {
            result = JSON.parse(content);
        } catch (e) {
            console.warn("JSON 解析失败，降级为纯文本", e);
            result = { content: content, comments: [] };
        }

        const newContent = result.content || "作者卡文了...";
        const newComments = result.comments || [];

        // 1. 更新原帖内容 (追加)
        post.content += `\n\n【更新分割线】\n\n${newContent}`;
        
        // 2. 追加新评论
        if (newComments.length > 0) {
            if (!post.comments) post.comments = [];
            const processedComments = newComments.map(c => ({
                name: c.name || "热心读者",
                handle: '@' + (c.name || "reader"),
                avatar: getRandomNpcAvatar(),
                content: c.content,
                time: Date.now()
            }));
            post.comments.push(...processedComments);
        }

        // 3. 如果这本书在书城里，同步更新章节
        const book = forumState.books.find(b => b.originalPostId === post.id);
        if (book) {
            book.chapters.push({
                title: `第 ${book.chapters.length + 1} 章`,
                content: newContent,
                time: Date.now()
            });
        }

        forumSaveData();
        
        // 刷新当前视图
        if (document.getElementById('forum-view-fanfic').classList.contains('active')) {
            forumRenderPosts('fanfic');
        }
        if (forumState.currentDetailPostId === post.id) {
            forumRenderPostDetailContent();
        }
        // 如果当前在书城详情页，也需要刷新评论区
        if (document.getElementById('forum-view-book-detail').classList.contains('active') && forumState.currentBookId) {
            forumOpenBookDetail(forumState.currentBookId);
        }

        wcShowSuccess("催更成功，已更新！");

    } catch (e) {
        console.error(e);
        wcShowError("作者卡文了，请重试");
    }
}

// ==========================================
// 论坛新增：书城与全屏阅读器逻辑
// ==========================================
function forumRenderBookstore() {
    const grid = document.getElementById('forum-book-grid');
    grid.innerHTML = '';
    
    if (!forumState.books || forumState.books.length === 0) {
        grid.innerHTML = '<div style="grid-column: span 3; text-align: center; color: #888; padding: 40px 0; font-size: 13px;">书架空空如也<br>去同人区把喜欢的文章加入书城吧</div>';
        return;
    }

    forumState.books.forEach(book => {
        const shortTitle = book.title.length > 4 ? book.title.substring(0, 4) : book.title;
        const div = document.createElement('div');
        div.className = 'book-item';
        div.onclick = () => forumOpenBookDetail(book.id);
        div.innerHTML = `
            <div class="book-cover" style="background: ${book.coverBg};">
                <span class="book-title-cover">${shortTitle}</span>
            </div>
            <div class="book-name">${book.title}</div>
            <div class="book-author">${book.author}</div>
        `;
        grid.appendChild(div);
    });
}

function forumOpenBookDetail(bookId) {
    forumState.currentBookId = bookId;
    const book = forumState.books.find(b => b.id === bookId);
    if (!book) return;

    const shortTitle = book.title.length > 4 ? book.title.substring(0, 4) : book.title;
    document.getElementById('forum-bd-cover').style.background = book.coverBg;
    document.getElementById('forum-bd-cover-text').innerText = shortTitle;
    
    // 👇 核心修改：注入带“催更”按钮的标题 👇
    document.getElementById('forum-bd-title').innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 18px; font-weight: bold; color: #111; flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${book.title}</span>
            <span onclick="forumTriggerUrgeFromBook(${book.originalPostId})" style="font-size: 12px; color: #AF52DE; background: rgba(175,82,222,0.1); padding: 4px 12px; border-radius: 12px; cursor: pointer; flex-shrink: 0; margin-left: 10px; font-weight: bold;">催更</span>
        </div>
    `;
    
    document.getElementById('forum-bd-author').innerText = `作者：${book.author}`;
    document.getElementById('forum-bd-desc').innerText = book.desc;

    const list = document.getElementById('forum-bd-chapter-list');
    list.innerHTML = '';
    book.chapters.forEach((ch, idx) => {
        const timeStr = new Date(ch.time).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
        const div = document.createElement('div');
        div.className = 'chapter-item';
        // 👇 核心修改：点击章节不再直接进阅读器，而是打开选择弹窗 👇
        div.onclick = () => forumOpenChapterActionModal(idx);
        div.innerHTML = `<span>${ch.title}</span> <span style="color:#999; font-size:12px;">${timeStr}</span>`;
        list.appendChild(div);
    });

    // 👇 核心修改：渲染原帖的评论到下方 👇
    const commentsSection = document.getElementById('forum-bd-comments-section');
    if (commentsSection) {
        const originalPost = forumState.posts.find(p => p.id === book.originalPostId);
        let commentsHtml = '<div style="font-size: 14px; font-weight: bold; margin-bottom: 15px; color: #111;">读者评论</div>';
        
        if (originalPost && originalPost.comments && originalPost.comments.length > 0) {
            originalPost.comments.forEach(c => {
                commentsHtml += `
                    <div style="display: flex; gap: 10px; margin-bottom: 15px;">
                        <img src="${c.avatar}" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover; flex-shrink: 0; border: 1px solid #F0F0F0;">
                        <div>
                            <div style="font-size: 12px; color: #888; margin-bottom: 4px; font-weight: bold;">${c.name}</div>
                            <div style="font-size: 14px; color: #333; line-height: 1.5;">${c.content}</div>
                        </div>
                    </div>
                `;
            });
        } else {
            commentsHtml += '<div style="text-align: center; color: #999; font-size: 12px; padding: 20px 0;">暂无评论</div>';
        }
        commentsSection.innerHTML = commentsHtml;
    }

    forumSwitchTab('book-detail');
}

// --- 阅读器核心逻辑 ---
function forumOpenReader(chapterIndex) {
    const book = forumState.books.find(b => b.id === forumState.currentBookId);
    if (!book || !book.chapters[chapterIndex]) return;

    forumState.currentChapterIndex = chapterIndex;
    const chapter = book.chapters[chapterIndex];

    document.getElementById('reader-book-title').innerText = book.title;
    document.getElementById('reader-chapter-title').innerText = chapter.title;

    // 简单的分页逻辑：按字数切割 (每页约 300 字)
    const text = chapter.content;
    const pageSize = 300;
    forumState.readerPages = [];
    for (let i = 0; i < text.length; i += pageSize) {
        forumState.readerPages.push(text.substring(i, i + pageSize));
    }
    
    forumState.currentReaderPage = 0;
    forumRenderReaderPage();

    // 更新时间
    const now = new Date();
    document.getElementById('reader-time-display').innerText = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    document.getElementById('forum-reader-overlay').style.display = 'flex';
    setTimeout(() => document.getElementById('forum-reader-overlay').classList.add('active'), 10);
}

function forumRenderReaderPage() {
    const content = forumState.readerPages[forumState.currentReaderPage];
    // 将换行符转换为 <br>
    document.getElementById('reader-content-text').innerHTML = content.replace(/\n/g, '<br>');
    document.getElementById('reader-page-num').innerText = `${forumState.currentReaderPage + 1} / ${forumState.readerPages.length}`;
}

function forumReaderNextPage() {
    if (forumState.currentReaderPage < forumState.readerPages.length - 1) {
        forumState.currentReaderPage++;
        forumRenderReaderPage();
    } else {
        // 尝试进入下一章
        const book = forumState.books.find(b => b.id === forumState.currentBookId);
        if (book && forumState.currentChapterIndex < book.chapters.length - 1) {
            forumOpenReader(forumState.currentChapterIndex + 1);
        } else {
            alert("已经是最后一页了，快去催更吧！");
        }
    }
}

function forumReaderPrevPage() {
    if (forumState.currentReaderPage > 0) {
        forumState.currentReaderPage--;
        forumRenderReaderPage();
    } else {
        // 尝试进入上一章
        if (forumState.currentChapterIndex > 0) {
            forumOpenReader(forumState.currentChapterIndex - 1);
            // 跳转到上一章的最后一页
            setTimeout(() => {
                forumState.currentReaderPage = forumState.readerPages.length - 1;
                forumRenderReaderPage();
            }, 50);
        }
    }
}

function forumToggleReaderMenu() {
    document.getElementById('forum-reader-menu').classList.toggle('active');
}

function forumCloseReader() {
    document.getElementById('forum-reader-overlay').classList.remove('active');
    document.getElementById('forum-reader-menu').classList.remove('active');
    setTimeout(() => document.getElementById('forum-reader-overlay').style.display = 'none', 300);
}

// 新增：切换回帖子模式
function forumSwitchToPostMode() {
    const book = forumState.books.find(b => b.id === forumState.currentBookId);
    if (!book) return;
    
    // 关闭阅读器
    forumCloseReader();
    
    // 打开对应的帖子详情页
    setTimeout(() => {
        forumOpenPostDetail(book.originalPostId);
    }, 300);
}
// ==========================================
// 新增：书城章节点击弹窗与催更逻辑
// ==========================================
let pendingChapterIndex = 0;

// 打开选择阅读模式的弹窗
function forumOpenChapterActionModal(idx) {
    pendingChapterIndex = idx;
    wcOpenModal('forum-chapter-action-modal');
}

// 执行选择的阅读模式
function forumExecuteChapterAction(mode) {
    wcCloseModal('forum-chapter-action-modal');
    
    // 延迟 300ms 等待弹窗收起动画结束，防止页面卡顿
    setTimeout(() => {
        if (mode === 'reader') {
            // 进入全屏阅读器
            forumOpenReader(pendingChapterIndex);
        } else if (mode === 'post') {
            // 进入论坛帖子模式
            const book = forumState.books.find(b => b.id === forumState.currentBookId);
            if (book) {
                forumOpenPostDetail(book.originalPostId);
            }
        }
    }, 300);
}

// 从书城详情页直接触发催更
function forumTriggerUrgeFromBook(postId) {
    forumState.actionPostId = postId;
    document.getElementById('forum-urge-prompt').value = '';
    wcOpenModal('forum-urge-modal');
}
