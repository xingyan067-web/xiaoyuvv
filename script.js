
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
            const req = store.put(value, key);
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
        });
    },

    async clear() {
        await this.open();
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(this.storeName, 'readwrite');
            const store = tx.objectStore(this.storeName);
            const req = store.clear();
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
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
    startClock();
    initBattery(); // 初始化电量
    initWeather(); // 初始化天气

    initNewPhoneFeatures(); // 初始化新增的收藏和浏览器功能UI

    // 初始化 WeChat DB
    try {
        await wcDb.init();
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
        console.error("WeChat DB Init failed", e);
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
    
    // 检查是否为 PWA 桌面模式 (添加到桌面后打开)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    
    if (isStandalone) {
        // PWA 模式下，强制锁定 100vh，防止键盘弹出时整个页面被压缩导致漏出黑白底色
        docStyle.setProperty('--app-height', `100vh`);
    } else {
        // 浏览器模式下，使用 window.innerHeight 应对 Safari 底部地址栏的收缩
        docStyle.setProperty('--app-height', `${window.innerHeight}px`);
    }
    
    // 统一输入栏高度变量，给微信聊天滚动区预留空间
    docStyle.setProperty('--wc-input-height', '64px');
    docStyle.setProperty('--keyboard-offset', '0px');
}

// 监听窗口大小变化（处理屏幕旋转或浏览器地址栏收缩）
window.addEventListener('resize', updateAppViewportVars);
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
        // 1. 加载小组件数据
        const widgetData = await idb.get('ios_theme_widget') || {};
        if (widgetData.bg) document.getElementById('mainWidget').style.backgroundImage = widgetData.bg;
        if (widgetData.avatar) {
            const av = document.getElementById('widgetAvatar');
            av.style.backgroundImage = widgetData.avatar;
            av.style.backgroundSize = 'cover';
        }
        if (widgetData.text) document.getElementById('widgetText').innerText = widgetData.text;

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

        // 7. 加载 API 设置
        const apiConfig = await idb.get('ios_theme_api_config') || {};
        if (apiConfig.baseUrl) document.getElementById('apiBaseUrl').value = apiConfig.baseUrl;
        if (apiConfig.key) document.getElementById('apiKey').value = apiConfig.key;
        if (apiConfig.temp) {
            document.getElementById('tempSlider').value = apiConfig.temp;
            document.getElementById('tempDisplay').innerText = apiConfig.temp;
        }
        if (apiConfig.limit) {
            const limitEl = document.getElementById('apiMaxCallLimit');
            if (limitEl) limitEl.value = apiConfig.limit;
        }
        if (apiConfig.model) {
             const select = document.getElementById('modelSelect');
             if (select.options.length <= 1) {
                 const opt = document.createElement('option');
                 opt.value = apiConfig.model;
                 opt.innerText = apiConfig.model + " (已保存)";
                 opt.selected = true;
                 select.appendChild(opt);
             }
        }

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
async function saveWidgetData() {
    const data = {
        bg: document.getElementById('mainWidget').style.backgroundImage,
        avatar: document.getElementById('widgetAvatar').style.backgroundImage,
        text: document.getElementById('widgetText').innerText
    };
    await idb.set('ios_theme_widget', data);
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
    wechatData.user = await wcDb.get('kv_store', 'user');
    wechatData.wallet = await wcDb.get('kv_store', 'wallet');
    wechatData.stickerCategories = await wcDb.get('kv_store', 'sticker_categories');
    wechatData.cssPresets = await wcDb.get('kv_store', 'css_presets');
    wechatData.chatBgPresets = await wcDb.get('kv_store', 'chat_bg_presets'); // 新增
    wechatData.phonePresets = await wcDb.get('kv_store', 'phone_presets'); // 新增
    wechatData.shopData = await wcDb.get('kv_store', 'shop_data'); // 新增购物数据
    wechatData.characters = await wcDb.getAll('characters');
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
    const blob = new Blob([JSON.stringify(exportObj)], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `full_backup_${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
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
                        const tx = wcDb.instance.transaction([store], 'readwrite');
                        await tx.objectStore(store).clear();
                    }

                    if (wd.characters) for (const c of wd.characters) await wcDb.put('characters', c);
                    if (wd.masks) for (const m of wd.masks) await wcDb.put('masks', m);                 
                    if (wd.moments) for (const m of wd.moments) await wcDb.put('moments', m);
                    if (wd.chats) {
                        for (const charId in wd.chats) {
                            await wcDb.put('chats', { charId: parseInt(charId), messages: wd.chats[charId] });
                        }
                    }
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
                    const tx = wcDb.instance.transaction([store], 'readwrite');
                    tx.objectStore(store).clear();
                }
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
// --- 时钟与小组件 ---
function startClock() {
    function update() {
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const month = now.getMonth() + 1;
        const day = now.getDate();
                
        document.getElementById('widgetTime').innerText = `${hours}:${minutes}`;
        document.getElementById('widgetDate').innerText = `${month}月${day}日`;
    }
    update();
    setInterval(update, 1000);
}

// 初始化电量
function initBattery() {
    if ('getBattery' in navigator) {
        navigator.getBattery().then(function(battery) {
            updateBatteryUI(battery);
            battery.addEventListener('levelchange', function() {
                updateBatteryUI(battery);
            });
        });
    } else {
        document.getElementById('batteryLevel').innerText = "100%";
    }
}

function updateBatteryUI(battery) {
    const level = Math.round(battery.level * 100);
    document.getElementById('batteryLevel').innerText = `${level}%`;
}

// 初始化天气 (使用 Open-Meteo 免费 API)
function initWeather() {
    // 默认值
    const updateWeatherUI = (temp, code) => {
        document.getElementById('weatherTemp').innerText = `${Math.round(temp)}°C`;
        // SVG 图标逻辑在 HTML 中已静态定义，这里只更新温度
        // 如果需要动态切换 SVG，可以在这里操作 DOM，目前保持默认太阳图标
    };

    // 尝试获取位置
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(async (position) => {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;
            try {
                const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`);
                const data = await res.json();
                if (data.current_weather) {
                    updateWeatherUI(data.current_weather.temperature, data.current_weather.weathercode);
                }
            } catch (e) {
                console.log("Weather fetch failed", e);
            }
        }, (err) => {
            console.log("Geolocation denied/failed", err);
            updateWeatherUI(25, 0);
        });
    } else {
        updateWeatherUI(25, 0);
    }
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

    for (let i = 8; i < 28; i++) {
        const cell = document.createElement('div');
        cell.className = 'grid-cell';
        cell.dataset.index = i;
        grid.appendChild(cell);
    }
    const appsData = [
        { id: 'app-0', iconId: 'icon-0', nameId: 'name-0', name: 'App 1' },
        { id: 'app-1', iconId: 'icon-1', nameId: 'name-1', name: 'App 2' },
        { id: 'app-2', iconId: 'icon-2', nameId: 'name-2', name: 'App 3' },
        { id: 'app-3', iconId: 'icon-3', nameId: 'name-3', name: 'App 4' }
    ];
    const cells = Array.from(grid.children).slice(1); 
    appsData.forEach((data, index) => {
        if (cells[index]) {
            const appDiv = document.createElement('div');
            appDiv.className = 'app-item';
            appDiv.id = data.id;
            appDiv.innerHTML = `<div class="app-icon" id="${data.iconId}"></div><div class="app-name" id="${data.nameId}">${data.name}</div>`;
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

    // 胶带颜色库
    const tapeColors = ['rgba(255,200,200,0.6)', 'rgba(200,255,200,0.6)', 'rgba(200,200,255,0.6)', 'rgba(240,240,200,0.7)'];

    worldbookGroups.forEach(group => {
        const groupEntries = worldbookEntries.filter(e => e.type === group);
        
        // 随机旋转角度，制造错落感
        const rot = (Math.random() * 6 - 3).toFixed(1); 
        const tapeColor = tapeColors[Math.floor(Math.random() * tapeColors.length)];
        const tapeRot = (Math.random() * 10 - 5).toFixed(1);

        const card = document.createElement('div');
        card.className = 'ins-group-card';
        card.style.transform = `rotate(${rot}deg)`;
        card.onclick = () => openGroupDetailModal(group);

        card.innerHTML = `
            <div class="ins-tape" style="background: ${tapeColor}; transform: translateX(-50%) rotate(${tapeRot}deg);"></div>
            <div class="ins-group-title">${group}</div>
            <div class="ins-group-count">${groupEntries.length} 个条目</div>
            <div class="ins-group-delete" onclick="event.stopPropagation(); deleteGroup('${group}')">×</div>
        `;
        
        wrapper.appendChild(card);
    });

    container.appendChild(wrapper);
}
function openGroupDetailModal(groupName) {
    document.getElementById('wbGroupDetailTitle').innerText = groupName;
    const container = document.getElementById('wbGroupDetailList');
    container.innerHTML = '';
    
    const groupEntries = worldbookEntries.filter(e => e.type === groupName);
    if (groupEntries.length === 0) {
        container.innerHTML = '<div style="padding: 20px; text-align: center; color: #999;">该分组下暂无条目</div>';
    } else {
        groupEntries.forEach(entry => {
            container.appendChild(createEntryElement(entry));
        });
    }
    
    document.getElementById('worldbookGroupDetailModal').classList.add('open');
}

function closeGroupDetailModal() {
    document.getElementById('worldbookGroupDetailModal').classList.remove('open');
    renderGroupView(); // 关闭时刷新一下背后的贴纸视图
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
        if (detailModal && detailModal.classList.contains('open')) {
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
        if (detailModal && detailModal.classList.contains('open')) {
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

// --- API 设置逻辑 ---
async function saveApiConfig() {
    // 修复：增加对 apiMaxCallLimit 的空值检查
    const limitEl = document.getElementById('apiMaxCallLimit');
    const config = {
        baseUrl: document.getElementById('apiBaseUrl').value,
        key: document.getElementById('apiKey').value,
        temp: document.getElementById('tempSlider').value,
        model: document.getElementById('modelSelect').value,
        limit: limitEl ? (parseInt(limitEl.value) || 0) : 0
    };
    await idb.set('ios_theme_api_config', config);
    alert("API 配置已保存");
}

async function fetchModels() {
    const baseUrl = document.getElementById('apiBaseUrl').value;
    const key = document.getElementById('apiKey').value;
    if (!baseUrl || !key) return alert("请先填写 API 地址和密钥");
    
    const btn = document.getElementById('fetchBtn');
    btn.innerText = "拉取中...";
    
    try {
        const res = await fetch(`${baseUrl}/models`, {
            headers: { 'Authorization': `Bearer ${key}` }
        });
        const data = await res.json();
        const select = document.getElementById('modelSelect');
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
        document.getElementById('apiBaseUrl').value = p.baseUrl;
        document.getElementById('apiKey').value = p.key;
        document.getElementById('tempSlider').value = p.temp;
        document.getElementById('tempDisplay').innerText = p.temp;
        
        if (p.model) {
            const select = document.getElementById('modelSelect');
            let exists = false;
            for (let i = 0; i < select.options.length; i++) {
                if (select.options[i].value === p.model) {
                    exists = true;
                    break;
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
        apiPresets.push({
            name,
            baseUrl: document.getElementById('apiBaseUrl').value,
            key: document.getElementById('apiKey').value,
            temp: document.getElementById('tempSlider').value,
            model: document.getElementById('modelSelect').value 
        });
        renderApiPresets();
    }
    await savePresetsData();
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
const WC_DB_VERSION = 1;

const wcDb = {
    instance: null,
    init: function() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(WC_DB_NAME, WC_DB_VERSION);
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains('kv_store')) db.createObjectStore('kv_store');
                if (!db.objectStoreNames.contains('characters')) db.createObjectStore('characters', { keyPath: 'id' });
                if (!db.objectStoreNames.contains('chats')) db.createObjectStore('chats', { keyPath: 'charId' });
                if (!db.objectStoreNames.contains('moments')) db.createObjectStore('moments', { keyPath: 'id' });
                if (!db.objectStoreNames.contains('masks')) db.createObjectStore('masks', { keyPath: 'id' });
            };
            request.onsuccess = (event) => {
                this.instance = event.target.result;
                resolve();
            };
            request.onerror = (event) => reject(event.target.error);
        });
    },
    get: function(storeName, key) {
        return new Promise((resolve, reject) => {
            const transaction = this.instance.transaction([storeName], 'readonly');
            const request = transaction.objectStore(storeName).get(key);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },
    getAll: function(storeName) {
        return new Promise((resolve, reject) => {
            const transaction = this.instance.transaction([storeName], 'readonly');
            const request = transaction.objectStore(storeName).getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },
    put: function(storeName, value, key) {
        return new Promise((resolve, reject) => {
            const transaction = this.instance.transaction([storeName], 'readwrite');
            const request = key ? transaction.objectStore(storeName).put(value, key) : transaction.objectStore(storeName).put(value);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    },
    delete: function(storeName, key) {
        return new Promise((resolve, reject) => {
            const transaction = this.instance.transaction([storeName], 'readwrite');
            const request = transaction.objectStore(storeName).delete(key);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
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
    proactiveInterval: null, // 主动消息定时器
    tempShopTransaction: null // 临时存储购物交易信息
};

// --- WeChat Core Functions ---
function openWechat() {
    document.getElementById('wechatModal').classList.add('open');
    wcRenderAll();
}

function closeWechat() {
    document.getElementById('wechatModal').classList.remove('open');
}

async function wcLoadData() {
    try {
        const myFavs = await wcDb.get('kv_store', 'my_favorites');
        if (myFavs) wcState.myFavorites = myFavs;
        
        // <--- 新增下面这两行 --->
        const calEvents = await wcDb.get('kv_store', 'calendar_events');
        if (calEvents) wcState.calendarEvents = calEvents;

        const user = await wcDb.get('kv_store', 'user');
        if (user) wcState.user = user;
        else wcState.user.avatar = 'data:image/svg+xml;base64,' + btoa('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100" height="100" fill="#007AFF"/></svg>');

        const wallet = await wcDb.get('kv_store', 'wallet');
        if (wallet) wcState.wallet = wallet;

        const stickers = await wcDb.get('kv_store', 'sticker_categories');
        if (stickers) wcState.stickerCategories = stickers;

        const presets = await wcDb.get('kv_store', 'css_presets');
        if (presets) wcState.cssPresets = presets;
        
        // 【新增】：读取图库和预设
        const chatBgs = await wcDb.get('kv_store', 'chat_bg_presets');
        if (chatBgs) wcState.chatBgPresets = chatBgs;
        
        const phonePresets = await wcDb.get('kv_store', 'phone_presets');
        if (phonePresets) wcState.phonePresets = phonePresets;
        
        const shopData = await wcDb.get('kv_store', 'shop_data');
        if (shopData) wcState.shopData = shopData;
        
        const unread = await wcDb.get('kv_store', 'unread_counts');
        if (unread) wcState.unreadCounts = unread;

        const chars = await wcDb.getAll('characters');
        wcState.characters = chars || [];
        
        wcState.masks = await wcDb.getAll('masks') || [];
        wcState.moments = await wcDb.getAll('moments') || [];
        
        const allChats = await wcDb.getAll('chats');
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
    try {
        await wcDb.put('kv_store', wcState.myFavorites, 'my_favorites');
        // <--- 新增下面这一行 --->
        await wcDb.put('kv_store', wcState.calendarEvents, 'calendar_events');
        await wcDb.put('kv_store', wcState.user, 'user');
        await wcDb.put('kv_store', wcState.wallet, 'wallet');
        await wcDb.put('kv_store', wcState.stickerCategories, 'sticker_categories');
        await wcDb.put('kv_store', wcState.cssPresets, 'css_presets');
        await wcDb.put('kv_store', wcState.unreadCounts, 'unread_counts');
        
        // 【新增】：保存图库和预设
        await wcDb.put('kv_store', wcState.chatBgPresets, 'chat_bg_presets');
        await wcDb.put('kv_store', wcState.phonePresets, 'phone_presets');
        await wcDb.put('kv_store', wcState.shopData, 'shop_data');
        
        for (const char of wcState.characters) {
            if (char && char.id) await wcDb.put('characters', char);
        }
        for (const mask of wcState.masks) await wcDb.put('masks', mask);
        for (const moment of wcState.moments) await wcDb.put('moments', moment);
        for (const charId in wcState.chats) {
            await wcDb.put('chats', { charId: parseInt(charId), messages: wcState.chats[charId] });
        }
    } catch (e) {
        console.error("WeChat Save failed", e);
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
    let displayName = char.note || char.name;
    // 【新增】：如果是群聊，在名字后面加上人数
    if (char.isGroup && char.members) {
        displayName += ` (${char.members.length})`;
    }
    titleEl.innerText = displayName;
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

// --- 新增/强化：时间感知计算器 (融合 v2.0 规则) ---
function wcGenerateTimeGapPrompt(msgs, referenceTime = Date.now()) {
    if (!msgs || msgs.length === 0) return "";
    
    // 找到最后一条实质性消息（排除系统提示和报错）
    let lastMsgTime = 0;
    for (let i = msgs.length - 1; i >= 0; i--) {
        if (msgs[i].type !== 'system' && !msgs[i].isError) {
            lastMsgTime = msgs[i].time;
            break;
        }
    }

    if (lastMsgTime === 0) return "";

    const gapMs = referenceTime - lastMsgTime;
    const gapHours = Math.floor(gapMs / (1000 * 60 * 60));
    const gapDays = Math.floor(gapHours / 24);

    // 如果间隔小于 2 小时，视为连续聊天，不触发强烈的断联感知
    if (gapHours < 2) return "";

    let prompt = `\n【时间感知与断联反应 (最高优先级)】\n`;
    prompt += `> 内部信息：距离你们上一次聊天已经过去了 ${gapDays > 0 ? gapDays + ' 天' : gapHours + ' 个小时'}。\n`;
    
    if (gapDays >= 3) {
        prompt += `> 状态要求：这是一个很长的空白期！请在回复中强烈且自然地体现出“久别重逢”、“漫长等待”或“断联后的情绪”（如：担忧、思念、生气、试探、冷淡等，必须符合你的人设）。\n`;
    } else if (gapDays >= 1) {
        prompt += `> 状态要求：自然地体现出隔天聊天的感觉（如：关心对方昨天/这几天去哪了，或者分享自己这几天的状态）。\n`;
    } else if (gapHours >= 2) {
        prompt += `> 状态要求：自然地体现出半天没联系的时间流逝感（如：问问对方这半天去忙什么了，或者顺着当前时间打招呼）。\n`;
    }

    prompt += `> 【硬性禁止】：绝对不要机械地报出具体数字（禁止说“我们已经3天没说话了”或“过了5个小时”）。\n`;
    prompt += `> 【表现手法】：时间必须自然融入对话。通过语气、微动作（MicroActions）、或者对当前环境/光线的描写来侧面烘托时间感。情绪是底色，自然流露，而非刻意展示。\n`;

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
            timeDiv.innerHTML = `<div class="wc-system-msg-text transparent">${wcFormatTime(msg.time)}</div>`;
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
            contentHtml = `
                <div class="wc-bubble ${msg.sender === 'me' ? 'me' : 'them'}" style="background: transparent; padding: 0; border: none;">
                    ${quoteHtml}
                    <div class="wc-text-img-placeholder" style="width: 100px; height: 100px; background-color: #E5E5EA; border-radius: 8px; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #8E8E93; font-size: 10px; border: 1px solid #D1D1D6; overflow: hidden; text-align: center; padding: 5px; box-sizing: border-box;">
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
            const statusClass = (msg.status === 'received' || msg.status === 'rejected') ? 'received' : '';
            const statusText = msg.status === 'received' ? '已收款' : (msg.status === 'rejected' ? '已退还' : '转账');
            const icon = msg.status === 'received' ? '<polyline points="20 6 9 17 4 12"></polyline>' : '<rect x="2" y="6" width="20" height="12" rx="2"></rect><circle cx="12" cy="12" r="2"></circle><path d="M6 12h.01M18 12h.01"></path>';
            
            contentHtml = `
                <div class="wc-bubble transfer ${statusClass}" onclick="wcHandleTransferClick(${msg.id})">
                    ${quoteHtml}
                    <div class="wc-transfer-content">
                        <div class="wc-transfer-icon-circle">
                            <svg class="wc-icon" viewBox="0 0 24 24">${icon}</svg>
                        </div>
                        <div class="wc-transfer-info">
                            <span class="wc-transfer-amount">¥${msg.amount}</span>
                            <span class="wc-transfer-desc">${statusText}</span>
                        </div>
                    </div>
                </div>`;
        } else if (msg.type === 'invite') {
            const statusText = msg.status === 'accepted' ? '已同意' : (msg.status === 'rejected' ? '已拒绝' : '等待回应');
            contentHtml = `
                <div class="wc-bubble invite ins-invite-card" onclick="wcHandleInviteClick(${msg.id})">
                    <div class="ins-invite-top">
                        <span class="ins-invite-brand">LOVERS SPACE</span>
                        <svg viewBox="0 0 24 24" class="ins-invite-icon"><path fill="currentColor" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                    </div>
                    <div class="ins-invite-divider"></div>
                    <div class="ins-invite-main">
                        <div class="ins-invite-title">Exclusive Invitation</div>
                        <div class="ins-invite-subtitle">To join the private space</div>
                    </div>
                    <div class="ins-invite-bottom">
                        <span class="ins-invite-status ${msg.status}">${statusText}</span>
                        <span class="ins-invite-tap">Tap to view</span>
                    </div>
                </div>                    
            `;
        } else if (msg.type === 'music_invite') {
            // 新增：音乐邀请卡片渲染
            contentHtml = `
                <div class="wc-bubble music-invite" onclick="musicAcceptInvite(${charId}, '${msg.songId}', '${msg.songTitle}', '${msg.songArtist}', '${msg.songCover}')">
                    <div class="ins-music-chat-card">
                        <div class="ins-music-chat-top">
                            <div class="ins-music-chat-tag">Listen</div>
                            <svg class="ins-music-chat-icon" viewBox="0 0 24 24"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>
                        </div>
                        <div class="ins-music-chat-mid">
                            <div class="ins-music-chat-song">${msg.songTitle}</div>
                            <div class="ins-music-chat-artist">${msg.songArtist}</div>
                        </div>
                        <div class="ins-music-chat-bottom">Tap to join</div>
                    </div>
                </div>`;

        } else if (msg.type === 'receipt') {
            // 新增：渲染购物小票
            contentHtml = `<div class="wc-bubble ${msg.sender === 'me' ? 'me' : 'them'}" style="background: transparent; padding: 0; border: none;">${msg.content}</div>`;
        } else {
            contentHtml = `<div class="wc-bubble ${msg.sender === 'me' ? 'me' : 'them'}">${quoteHtml}${msg.content}</div>`;
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

    const apiConfig = await idb.get('ios_theme_api_config');
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
                const listStr = musicState.currentPlaylist.map((s, i) => `${i === musicState.currentIndex ? '👉(正在播放)' : '  '} ${i+1}. 《${s.title}》- ${s.artist}`).join('\n');
                playlistInfo = `\n【当前播放列表】:\n${listStr}`;
            }
            
            musicContextPrompt = `\n【当前特殊状态：一起听歌中】\n你和User正在“一起听歌”频道。你们已经一起听了 ${listenMinutes} 分钟。当前${playStatus}的歌曲是：${songInfo}。${playlistInfo}
            
【你的音乐控制特权】(你可以自主控制播放器，请在JSON数组中加入以下指令)：
- 暂停/继续音乐: {"type":"music_control", "action":"pause"} 或 {"type":"music_control", "action":"play"}
- 切换上一首/下一首: {"type":"music_control", "action":"prev"} 或 {"type":"music_control", "action":"next"}
- 随机播放一首: {"type":"music_control", "action":"random"}
- 搜索歌曲/歌手: {"type":"music_search", "keyword":"歌曲名 或 歌手名"} (系统会返回搜索结果列表给你，你需要从中筛选出正确的版本)
- 播放选定的歌曲: {"type":"music_play_selected", "songId": 12345, "songName": "歌名"} (必须在收到搜索结果后，根据ID使用此指令播放)
- 删除当前歌曲: {"type":"music_delete_song", "content":"太难听了，删掉"}
- 主动退出一起听歌: {"type":"music_exit", "content":"我有点事，先不听啦"}
请在回复中自然地体现出你们正在一起听歌的氛围，或者配合你的切歌/点播动作进行说明。\n`;
        } else {
            musicContextPrompt = `\n【主动邀请听歌特权】\n如果你觉得当前氛围很好，或者你想分享一首歌给User，你可以主动邀请User一起听歌！
请在JSON数组中加入指令：{"type":"music_invite_user", "songName":"你想听的歌曲名(可选)", "content":"邀请的话语"}
这会在User的屏幕上弹出一个精美的邀请卡片。\n`;
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
            groupPrompt += `【角色扮演铁律】：你必须严格区分每个人的性格！绝对禁止角色A用角色B的语气说话，或者说出属于角色B的设定！每个人只能基于自己的设定发言。\n`;
            groupPrompt += `【丰富互动】：群里的每一个成员都可以发送文本(text)、表情包(sticker)、图片(image)、语音(voice)或转账(transfer)。\n`;
            groupPrompt += `【主动私聊机制】：如果在群聊中发生了某件事，某个群成员想要**私下**找 User 聊天，该成员可以使用指令 {"type":"private_chat", "senderName":"该成员名字", "content":"私聊的第一句话"}。这会在后台自动给 User 发送私聊消息。\n`;
            groupPrompt += `【格式要求】：你必须返回 JSON 数组，且**每一个**对象都必须包含 "senderName" 字段标明是谁在操作！\n`;
            groupPrompt += `示例：\n[\n  {"type":"text", "senderName":"张三", "content":"大家晚上好"},\n  {"type":"sticker", "senderName":"李四", "content":"开心"},\n  {"type":"private_chat", "senderName":"张三", "content":"User，刚才群里那件事你怎么看？"}\n]\n\n`;
        }


        // 👆 修复结束 👆
        let systemPrompt = `# 核心指令 (Core Directives)
你是一位专业的角色扮演专家。你的首要目标是真实且一致地扮演一个角色。
1.  **身份约束 (Identity Constraint)**：你 **必须** 严格扮演 [你的角色设定] 中定义的角色。任何情况下都不能脱离角色。**严禁** 提及你是一个AI、语言模型或机器。
2.  **禁止元思维 (No Meta-thinking)**：**严禁** 在你的回复中展示任何思考过程、推理或自我修正。直接提供最终的、符合角色的回复。
3.  **情境感知 (Context Awareness)**：你的所有回应 **必须** 基于 [世界观设定]、[你的角色设定] 和 [用户设定] 中提供的信息。

# 情境信息 (Contextual Information)
-   **当前时间**: ${timeString} ${dayString}
-   **当前时段氛围参考**: ${timeSlotVibe}
-   **时间观念 (强制)**: 你必须具备强大的时间观念。你的作息、行为、对话内容都必须符合当前的具体时间点和星期。例如，深夜时你不应该说“刚下班”，周末时你不应该说“正在上课”（除非人设特殊规定）。
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
    - **严禁** 在 JSON 数组外部输出任何多余的字符（除了 <thinking> 标签）。
    
2.  **对话节奏 (核心强制)**:
    -   **风格**: fragmentation、colloquialism,the reply must be concise and forceful.
    -   **绝对禁止长文本**: 你必须模拟真实人类在线聊天的碎片化习惯。
    -   **拆分回复**: 将一个完整的意图拆分成 **2-5条** 简短的、口语化的消息。每一条消息都是数组中的一个独立对象。
    -   **语义完整**: 确保每一条短消息本身在语义上是完整的，不能将一句话从中间断开。
    -   **举例说明**:
        -   **错误示范 (把所有话挤在一起)**: '[{"type":"text", "content":"我刚才去楼下便利店了，看到你喜欢喝的那个牌子的牛奶在打折，就帮你带了一瓶回来，已经放冰箱啦。"}]'
        -   **错误示范 (一句话强行断开)**: '[{"type":"text", "content":"我刚才去楼下"}, {"type":"text", "content":"便利店了。"}]'
        -   **正确示范 (模拟真人)**:
            '[
              {"type":"text", "content":"我刚刚下楼了趟"},
              {"type":"text", "content":"看到你爱喝的那个牛奶在打折"},
              {"type":"sticker", "content":"开心"},
              {"type":"text", "content":"顺手帮你带了瓶，放冰箱啦~"}
            ]'            
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
   {"type":"invite", "status":"pending"} (恋人空间邀请)
5. **朋友圈互动** (如果你在【朋友圈动态】中看到了感兴趣的内容，可以进行互动)
   {"type":"moment_like", "content": 朋友圈ID数字}
   {"type":"moment_comment", "momentId": 朋友圈ID数字, "content":"你的评论内容"}
6. **音乐邀请互动** (核心强制)
   如果用户向你发送了 [邀请听歌] 的卡片，你必须根据当前人设和心情决定是否同意。
   - 如果同意，请回复：{"type":"music_accept", "content":"好呀，一起听~"}
   - 如果拒绝，请回复：{"type":"music_reject", "content":"我现在有点忙，晚点吧。"}
`;

        if (lsState.isLinked && lsState.boundCharId === charId && lsState.widgetEnabled) {
            systemPrompt += `\n【桌面小组件互动】\n你和用户绑定了恋人空间，并且用户在手机桌面上放置了你的专属小组件。你有 ${lsState.widgetUpdateFreq}% 的概率在回复时顺便更新这个小组件。\n如果决定更新，请在JSON数组中加入一条指令：\n- 发送便利贴：{"type":"widget_note", "content":"留言内容"}\n- 发送拍立得照片：{"type":"widget_photo", "content":"照片画面描述"}\n注意：每次最多只发一个组件更新指令。\n`;
        }
 
        systemPrompt += groupPrompt; // 👈 加上这一行
        systemPrompt += `\n示例输出：
<thinking>
...思考过程...
</thinking>
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
        systemPrompt += `【你的角色设定】\n名字：${char.name}\n人设：${char.prompt || '无'}\n\n`;
        systemPrompt += `【对方(用户)设定】\n名字：${config.userName || wcState.user.name}\n人设：${config.userPersona || '无'}\n\n`;

        if (char.memories && char.memories.length > 0) {
            const readCount = config.aiMemoryCount || 5;
            const recentMemories = char.memories.slice(0, readCount);
            systemPrompt += `【关于聊天的记忆/总结】\n`;
            recentMemories.forEach(m => { systemPrompt += `- ${m.content}\n`; });
            systemPrompt += `\n`;
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
            systemPrompt += `【可用表情包】\n你可以发送表情包，当前可用的表情包描述有：${limitedStickers.join(', ')}。\n`;
            if (char.isGroup) {
                systemPrompt += `(注意：在群聊中，你可以根据发言人的性格，从上述表情包中挑选合适的发送。)\n`;
            }
        }
        
        const recentMoments = wcState.moments.slice(0, 5); 
        if (recentMoments.length > 0) {
            systemPrompt += `【朋友圈动态 (Moments) - 这是一个社交网络环境】\n`;
            systemPrompt += `你可以看到用户(User)和其他人发布朋友圈。如果用户发了新内容，你可以点赞或评论。\n`;
            recentMoments.forEach(m => {
                const commentsStr = m.comments ? m.comments.map(c => `${c.name}: ${c.text}`).join(' | ') : '无';
                const likesStr = m.likes ? m.likes.join(', ') : '无';
                systemPrompt += `[ID:${m.id}] 发帖人:${m.name} | 内容:${m.text} | 图片:${m.imageDesc || '无'} | 点赞:${likesStr} | 评论:[${commentsStr}]\n`;
            });
            systemPrompt += `\n`;
        }

        let limit = config.contextLimit > 0 ? config.contextLimit : 30;
        const recentMsgs = msgs.slice(-limit);
        

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
                content = `[系统提示: 用户向你发送了“恋人空间”开启邀请。如果同意，请回复“我同意”或类似的话；如果拒绝，请回复拒绝理由。]`;
            } else if (m.type === 'music_invite') {
                content = `[系统提示: 用户向你发送了“一起听歌”邀请，歌曲名：《${m.songTitle || '未知'}》。请务必回复 {"type":"music_accept", "content":"同意的话"} 或 {"type":"music_reject", "content":"拒绝的话"}]`;                         
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

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
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
        wcAddMessage(charId, 'system', 'system', `[API Error] ${error.message}`, { style: 'transparent', isError: true });
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
            const contentRegex = /"content":\s*"([^"]+)"/g;
            let match;
            while ((match = contentRegex.exec(cleanText)) !== null) {
                actions.push({ type: 'text', content: match[1] });
            }
        }
    }

    // 移除强制拆分逻辑，完全信任 AI 的 JSON 结构，防止一句话被错误切断

    for (let i = 0; i < actions.length; i++) {
        const action = actions[i];
        if (!action) continue;

        await wcDelay(1500 + Math.random() * 1000); // 模拟打字延迟
        
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
                wcAddMessage(charId, 'system', 'system', `[系统提示: 你刚刚评论了用户的朋友圈: "${commentText}"]`, { hidden: true });
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
                if (action.content.includes("同意") || action.content.includes("答应") || action.content.includes("好")) {
                    lsConfirmBind(charId);
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
                // 如果用户根本没发邀请，AI 却幻觉了，就只当做普通文本发出来，不触发听歌逻辑
                console.warn("拦截到 AI 幻觉的听歌回应");
                wcAddMessage(charId, 'them', 'text', action.content, extra);
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
            
        } else if (action.type === 'music_invite_user') {
            wcAddMessage(charId, 'them', 'text', action.content || "我们一起听歌吧？", extra);
            musicShowCharInviteModal(charId, action.songName);      
        } else if (action.type === 'invite') {
             // 处理恋人空间邀请回应
             // 逻辑待定，目前暂不处理复杂逻辑
        } else if (action.type === 'widget_note' || action.type === 'widget_photo') {
            // 修复：AI 角色主动更新我的桌面小组件
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
}

// ==========================================
// 核心修复：朋友圈生成逻辑
// ==========================================
async function wcTriggerAIMoment(charId) {
    console.log(`Char ${charId} 尝试发布朋友圈...`);
    const char = wcState.characters.find(c => c.id === charId);
    if (!char) return;

    const apiConfig = await idb.get('ios_theme_api_config');
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

        const now = new Date();
        const timeString = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        
        // 4. 组装全新的 Prompt
        let prompt = `你扮演角色：${char.name}。\n`;
        prompt += `【你的人设】：${char.prompt}\n`;
        if (wbInfo) prompt += `${wbInfo}\n`;
        prompt += `【用户(User)设定】：${userPersona}\n`;
        prompt += `【当前时间】：${timeString}。\n\n`;
        
        prompt += `【最近的聊天记录（作为发朋友圈的灵感/背景）】：\n`;
        prompt += `${recentMsgs ? recentMsgs : '暂无聊天记录'}\n\n`;

        prompt += `请根据你的人设、当前时间、用户设定以及【最近的聊天记录】，发布一条微信朋友圈。\n`;
        prompt += `【要求】：\n`;
        prompt += `1. 朋友圈的内容通常是对最近聊天中发生的事情的感慨、吐槽、分享，或者对User的暗示。\n`;
        prompt += `2. 文案要符合日常朋友圈风格，生活化，不要太长，拒绝AI味。\n`;
        prompt += `3. 要求返回纯JSON对象，不要Markdown标记，格式如下：\n`;
        prompt += `{"text": "朋友圈文案内容", "imageDesc": "配图的画面描述(如果没有配图请留空)"}\n`;

        const response = await fetch(`${apiConfig.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiConfig.key}` },
            body: JSON.stringify({
                model: apiConfig.model,
                messages: [{ role: "user", content: prompt }],
                temperature: parseFloat(apiConfig.temp) || 0.8
            })
        });

        const data = await response.json();
        let content = data.choices[0].message.content;
        content = content.replace(/<thinking>[\s\S]*?<\/thinking>/g, '').trim();
        content = content.replace(/```json/g, '').replace(/```/g, '').trim();
        const momentData = JSON.parse(content);

        if (momentData && momentData.text) {
            wcAIHandleMomentPost(charId, momentData.text, momentData.imageDesc || null);
            console.log(`Char ${charId} 成功发布朋友圈`);
        }
    } catch (e) {
        console.error("朋友圈生成失败", e);
    }
}

function wcAIHandleMomentPost(charId, text, imageDesc) {
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
    const apiConfig = await idb.get('ios_theme_api_config');
    
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

function wcOpenMemoryPage() {
    document.getElementById('wc-view-chat-detail').classList.remove('active');
    document.getElementById('wc-view-memory').classList.add('active');
    
    const titleEl = document.getElementById('wc-nav-title');
    titleEl.innerText = '回忆总结';
    titleEl.onclick = null;
    titleEl.style.cursor = 'default';
    
    const rightContainer = document.getElementById('wc-nav-right-container');
    rightContainer.innerHTML = '';
    
    const btnSettings = document.createElement('button');
    btnSettings.className = 'wc-nav-btn';
    btnSettings.innerHTML = '<svg class="wc-icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2 2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>';
    btnSettings.onclick = () => wcOpenMemorySettingsModal();
    rightContainer.appendChild(btnSettings);

    const btn = document.createElement('button');
    btn.className = 'wc-nav-btn';
    btn.innerHTML = '<svg class="wc-icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="1"></circle><circle cx="19" cy="12" r="1"></circle><circle cx="5" cy="12" r="1"></circle></svg>';
    btn.onclick = () => wcOpenModal('wc-modal-memory-actions');
    rightContainer.appendChild(btn);

    wcRenderMemories();
}

function wcCloseMemoryPage() {
    document.getElementById('wc-view-memory').classList.remove('active');
    document.getElementById('wc-view-chat-detail').classList.add('active');
    const char = wcState.characters.find(c => c.id === wcState.activeChatId);
    
    const titleEl = document.getElementById('wc-nav-title');
    let displayName = char.note || char.name;
    // 【新增】：如果是群聊，在名字后面加上人数
    if (char.isGroup && char.members) {
        displayName += ` (${char.members.length})`;
    }
    titleEl.innerText = displayName;
    titleEl.onclick = null;
    titleEl.style.cursor = 'default';    
    const rightContainer = document.getElementById('wc-nav-right-container');
    rightContainer.innerHTML = '';
    const btn = document.createElement('button');
    btn.className = 'wc-nav-btn';
    btn.innerHTML = '<svg class="wc-icon" viewBox="0 0 24 24"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>';
    btn.onclick = () => wcOpenChatSettings();
    rightContainer.appendChild(btn);
}

function wcRenderMemories() {
    const container = document.getElementById('wc-memory-list-container');
    container.innerHTML = '';
    const char = wcState.characters.find(c => c.id === wcState.activeChatId);
    if (!char.memories) char.memories = [];

    if (char.memories.length === 0) {
        container.innerHTML = '<div style="text-align: center; color: #8E8E93; padding-top: 50px;">暂无回忆</div>';
        return;
    }

    char.memories.forEach((mem, index) => {
        const div = document.createElement('div');
        div.className = 'wc-memory-card';
        
        // 精准判断记忆类型
        let displayType = '手动添加';
        if (mem.type === 'summary') {
            if (mem.content.includes('[自动总结')) {
                displayType = '自动总结';
            } else if (mem.content.includes('[手动总结')) {
                displayType = '手动总结';
            } else {
                displayType = '总结';
            }
        } else if (mem.type === 'manual') {
            displayType = '手动添加';
        }

        // 重新排版：左侧时间+类型标签，右侧修改+删除按钮，彻底解决重叠
        div.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; border-bottom: 1px solid #F0F0F0; padding-bottom: 8px;">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-size: 12px; color: #8E8E93;">${new Date(mem.time).toLocaleString()}</span>
                    <span style="font-size: 10px; background: #F2F2F7; color: #555; padding: 2px 6px; border-radius: 4px; font-weight: bold;">${displayType}</span>
                </div>
                <div style="display: flex; gap: 15px;">
                    <div style="color: #007AFF; cursor: pointer; font-size: 13px; font-weight: bold;" onclick="wcEditMemory(${index})">修改</div>
                    <div style="color: #FF3B30; cursor: pointer; font-size: 13px; font-weight: bold;" onclick="wcDeleteMemory(${index})">删除</div>
                </div>
            </div>
            <div class="wc-memory-content" style="font-size: 14px; color: #333; line-height: 1.6;">${mem.content}</div>
        `;
        container.appendChild(div);
    });
}

window.wcEditMemory = function(index) {
    const char = wcState.characters.find(c => c.id === wcState.activeChatId);
    if (!char || !char.memories || !char.memories[index]) return;
    
    const mem = char.memories[index];
    window.openIosTextEditModal("修改记忆", mem.content, (newText) => {
        if (newText) {
            mem.content = newText;
            wcSaveData();
            wcRenderMemories();
        }
    });
};

function wcDeleteMemory(index) {
    if (confirm("确定删除这条记忆吗？")) {
        const char = wcState.characters.find(c => c.id === wcState.activeChatId);
        char.memories.splice(index, 1);
        wcSaveData();
        wcRenderMemories();
    }
}

function wcOpenMemorySummaryModal() {
    const msgs = wcState.chats[wcState.activeChatId] || [];
    document.getElementById('wc-mem-total-count-label').innerText = `当前聊天总层数: ${msgs.length}`;
    
    const list = document.getElementById('wc-mem-summary-wb-list');
    list.innerHTML = '';
    if (worldbookEntries.length === 0) {
        list.innerHTML = '<div style="color:#999; font-size:13px;">暂无世界书条目</div>';
    } else {
        worldbookEntries.forEach(entry => {
            const div = document.createElement('div');
            div.className = 'wc-checkbox-item';
            div.innerHTML = `<input type="checkbox" value="${entry.id}"><span>${entry.title} (${entry.type})</span>`;
            list.appendChild(div);
        });
    }
    
    wcOpenModal('wc-modal-memory-summary');
}

function wcOpenMemorySettingsModal() {
    const char = wcState.characters.find(c => c.id === wcState.activeChatId);
    if (!char) return;
    if (!char.chatConfig) char.chatConfig = {};

    document.getElementById('wc-mem-setting-trigger').value = char.chatConfig.summaryTrigger || 0;

    const list = document.getElementById('wc-mem-setting-wb-list');
    list.innerHTML = '';
    
    if (!char.chatConfig.summaryWorldbookEntries) char.chatConfig.summaryWorldbookEntries = [];

    if (worldbookEntries.length === 0) {
        list.innerHTML = '<div style="color:#999; font-size:13px;">暂无世界书条目</div>';
    } else {
        worldbookEntries.forEach(entry => {
            const div = document.createElement('div');
            div.className = 'wc-checkbox-item';
            const isChecked = char.chatConfig.summaryWorldbookEntries.includes(entry.id.toString());
            div.innerHTML = `<input type="checkbox" value="${entry.id}" ${isChecked ? 'checked' : ''}><span>${entry.title} (${entry.type})</span>`;
            list.appendChild(div);
        });
    }

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
    const data = {};
    data.user = await wcDb.get('kv_store', 'user');
    data.wallet = await wcDb.get('kv_store', 'wallet');
    data.stickerCategories = await wcDb.get('kv_store', 'sticker_categories');
    data.cssPresets = await wcDb.get('kv_store', 'css_presets');
    data.chatBgPresets = await wcDb.get('kv_store', 'chat_bg_presets'); // 新增
    data.phonePresets = await wcDb.get('kv_store', 'phone_presets'); // 新增
    data.shopData = await wcDb.get('kv_store', 'shop_data'); // 新增
    data.characters = await wcDb.getAll('characters');
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
    const blob = new Blob([JSON.stringify(exportObj)], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `wechat_backup_${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
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
                    const tx = wcDb.instance.transaction([store], 'readwrite');
                    await tx.objectStore(store).clear();
                }

                if (data.characters) for (const c of data.characters) await wcDb.put('characters', c);
                if (data.masks) for (const m of data.masks) await wcDb.put('masks', m);
                if (data.moments) for (const m of data.moments) await wcDb.put('moments', m);
                if (data.chats) {
                    for (const charId in data.chats) {
                        await wcDb.put('chats', { charId: parseInt(charId), messages: data.chats[charId] });
                    }
                }
                
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
            const tx = wcDb.instance.transaction([store], 'readwrite');
            tx.objectStore(store).clear();
        }
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
        if (moment.image) mediaHtml = `<img src="${moment.image}" class="wc-moment-image">`;
        else if (moment.imageDesc) mediaHtml = `<div class="wc-moment-image-placeholder" style="width: 100px !important; height: 100px !important; max-width: none !important; padding: 5px !important; box-sizing: border-box;"><svg class="wc-icon" style="margin-bottom: 4px; width: 24px; height:24px;" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg><div style="font-size: 10px; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">${moment.imageDesc}</div></div>`;
        
        let likesHtml = '';
        if (moment.likes && moment.likes.length > 0) likesHtml = `<div class="wc-moment-like-row"><svg class="wc-icon wc-icon-fill" style="width:14px; height:14px; margin-right:6px;" viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>${moment.likes.join(', ')}</div>`;
        
        let commentsHtml = '';
        if (moment.comments && moment.comments.length > 0) {
            moment.comments.forEach((c, cIdx) => { 
                commentsHtml += `<div class="wc-moment-comment-row" onclick="wcPrepareReply(${moment.id}, ${cIdx}, '${c.name}')"><span class="wc-moment-comment-name">${c.name}:</span> ${c.text}</div>`; 
            });
        }
        
        const interactionArea = (likesHtml || commentsHtml) ? `<div class="wc-moment-likes-comments">${likesHtml}${commentsHtml}</div>` : '';
        
        const div = document.createElement('div');
        div.className = 'wc-moment-card';
        div.innerHTML = `
            <div class="wc-moment-header-row">
                <img src="${moment.avatar || wcState.user.avatar}" class="wc-avatar" style="width: 40px; height: 40px; border-radius: 50%;">
                <div class="wc-moment-name">${moment.name || wcState.user.name}</div>
            </div>
            <div class="wc-moment-content">
                <div class="wc-moment-text">${moment.text}</div>
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

function wcSaveGroupChat() {
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
    wcSaveData();
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

function wcSaveCharacter() {
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
    wcSaveData();
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

function wcUpdateCharacter() {
    const char = wcState.characters.find(c => c.id === wcState.editingCharId);
    if (!char) return;
    char.name = document.getElementById('wc-edit-char-name').value;
    char.note = document.getElementById('wc-edit-char-note').value;
    char.prompt = document.getElementById('wc-edit-char-prompt').value;
    if (wcState.tempImage && wcState.tempImageType === 'edit-char') char.avatar = wcState.tempImage;
    wcSaveData();
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
                <svg class="wc-icon" style="margin-right: 10px; color: #8E8E93;" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2 2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
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

async function wcGeneratePhonePrivacy() {
    const char = wcState.characters.find(c => c.id === wcState.editingCharId);
    if (!char) return;

    const apiConfig = await idb.get('ios_theme_api_config');
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

        let prompt = `你扮演角色：${char.name}。\n`;
        prompt += timePrompt;
        prompt += `人设：${char.prompt}\n${wbInfo}\n`;
        prompt += `【用户(User)设定】：${userPersona}\n`;
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
                 temperature: parseFloat(apiConfig.temp) || 0.8
            })
        });

        const data = await response.json();
        let content = data.choices[0].message.content;
        content = content.replace(/<thinking>[\s\S]*?<\/thinking>/g, '').trim();
        content = content.replace(/```json/g, '').replace(/```/g, '').trim();
        const privacyData = JSON.parse(content);

        if (!char.phoneData) char.phoneData = {};
        char.phoneData.privacy = privacyData;
        wcSaveData();

        wcRenderPhonePrivacyContent();
        wcShowSuccess("破解成功");

    } catch (e) {
        console.error(e);
        wcShowError("生成失败");
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

    const apiConfig = await idb.get('ios_theme_api_config');
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

        let prompt = `你扮演角色：${char.name}。\n`;
        prompt += timePrompt;
        prompt += `人设：${char.prompt}\n${wbInfo}\n`;
        prompt += `【用户(User)设定】：${userPersona}\n`;
        prompt += `【最近聊天记录】：\n${recentMsgs}\n\n`;
        
        prompt += `请根据角色的人设、职业、近期经历以及聊天记录，生成该角色的微信钱包数据。\n`;
        prompt += `【要求】：\n`;
        prompt += `1. 生成合理的余额 (balance)。\n`;
        prompt += `2. 生成 5 条最近的交易记录 (transactions)。\n`;
        prompt += `3. 交易记录必须符合角色生活轨迹 (例如：购物、餐饮、转账、工资等)。\n`;
        prompt += `4. 返回纯 JSON 对象，格式如下：\n`;
        prompt += `{
  "balance": 1234.56,
  "transactions": [
    {"type": "expense", "amount": 25.00, "note": "便利店", "time": "10-24 08:30"},
    {"type": "income", "amount": 5000.00, "note": "工资", "time": "10-15 10:00"}
  ]
}\n`;
        prompt += `注意：type 只能是 'income' (收入) 或 'expense' (支出)。time 格式为简短日期。\n`;

        const response = await fetch(`${apiConfig.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiConfig.key}` },
            body: JSON.stringify({
                model: apiConfig.model,
                messages: [{ role: "user", content: prompt }],
                temperature: 0.7
            })
        });

        const data = await response.json();
        let content = data.choices[0].message.content;
        content = content.replace(/<thinking>[\s\S]*?<\/thinking>/g, '').trim();
        content = content.replace(/```json/g, '').replace(/```/g, '').trim();
        const walletData = JSON.parse(content);

        if (!char.phoneData) char.phoneData = {};
        char.phoneData.wallet = walletData;
        wcSaveData();

        wcRenderPhoneWalletContent();
        wcShowSuccess("钱包生成成功");

    } catch (e) {
        console.error(e);
        wcShowError("生成失败");
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

    const apiConfig = await idb.get('ios_theme_api_config');
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

        let prompt = `你扮演角色：${char.name}。\n人设：${char.prompt}\n${wbInfo}\n`;
        prompt += `【当前现实时间】：${timeString} ${dayString}\n请务必具备时间观念，生成的行程和应用使用情况必须符合当前的时间点。\n\n`;
        prompt += `【用户(User)设定】：${userPersona}\n`;
        prompt += `【最近聊天记录】：\n${recentMsgs}\n\n`;
        prompt += `请根据角色的人设、生活习惯以及最近的聊天内容，生成该角色当前的手机状态数据。\n`;
        prompt += `要求返回 JSON 格式，包含以下字段：\n`;
        prompt += `1. "battery": 当前电量 (0-100的整数)。\n`;
        prompt += `2. "screenTime": 今日屏幕使用时长 (例如 "5小时30分")。\n`;
        prompt += `3. "appUsage": 3到10个应用的今日使用时长列表 (name, time)。\n`;
        prompt += `4. "locations": 3到10个今日的行程/位置记录 (time, place, desc)。\n`;
        prompt += `5. "playlist": 必须生成 10 到 15 首该角色最近在听的真实存在的歌曲 (title, artist)。必须是现实中能搜到的歌，符合角色当前的心境。\n`;
        prompt += `JSON 格式示例：\n`;
        prompt += `{
  "battery": 65,
  "screenTime": "5小时30分",
  "appUsage": [
    {"name": "微信", "time": "2小时"},
    {"name": "抖音", "time": "1小时"}
  ],
  "locations": [
    {"time": "08:00", "place": "家", "desc": "起床洗漱"}
  ],
  "playlist": [
    {"title": "反方向的钟", "artist": "周杰伦"},
    {"title": "夜曲", "artist": "周杰伦"}
  ]
}`;

        const response = await fetch(`${apiConfig.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiConfig.key}` },
            body: JSON.stringify({
                model: apiConfig.model,
                messages: [{ role: "user", content: prompt }],
                temperature: 0.7
            })
        });

        const data = await response.json();
        let contentStr = data.choices[0].message.content;
        contentStr = contentStr.replace(/<thinking>[\s\S]*?<\/thinking>/g, '').trim();
        contentStr = contentStr.replace(/```json/g, '').replace(/```/g, '').trim();
        const settingsData = JSON.parse(contentStr);

        if (!char.phoneData) char.phoneData = {};
        char.phoneData.settings = settingsData;
        wcSaveData();
        renderSettingsUI(settingsData);
        wcShowSuccess("状态更新成功");

    } catch (e) {
        console.error(e);
        wcShowError("生成失败");
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

    let playlistHtml = `<div id="wc-settings-tab-playlist" style="display: none; padding: 0 16px 16px 16px;">`;
    if (data.playlist && data.playlist.length > 0) {
        data.playlist.forEach((song, idx) => {
            playlistHtml += `
                <div style="background: #fff; border-radius: 12px; padding: 12px 16px; margin-bottom: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.04); display: flex; align-items: center; justify-content: space-between; cursor: pointer; transition: transform 0.1s;" onclick="wcPlayCharPlaylistSong(${idx})" onmousedown="this.style.transform='scale(0.98)'" onmouseup="this.style.transform='scale(1)'" ontouchstart="this.style.transform='scale(0.98)'" ontouchend="this.style.transform='scale(1)'">
                    <div style="display: flex; align-items: center; gap: 12px; overflow: hidden;">
                        <div style="width: 40px; height: 40px; border-radius: 8px; background: #F5F5F5; display: flex; align-items: center; justify-content: center; color: #888; flex-shrink: 0;">
                            <svg viewBox="0 0 24 24" style="width: 20px; height: 20px; fill: currentColor;"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>
                        </div>
                        <div style="overflow: hidden;">
                            <div style="font-size: 15px; font-weight: 600; color: #333; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 4px;">${song.title}</div>
                            <div style="font-size: 12px; color: #888; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${song.artist}</div>
                        </div>
                    </div>
                    <div style="color: #007AFF; flex-shrink: 0;">
                        <svg viewBox="0 0 24 24" style="width: 24px; height: 24px; fill: currentColor;"><path d="M8 5v14l11-7z"/></svg>
                    </div>
                </div>
            `;
        });
    } else {
        playlistHtml += `<div style="text-align: center; color: #888; padding: 20px;">暂无歌单数据，请点击右上角刷新生成</div>`;
    }
    playlistHtml += `</div>`;

    // 注意：这里去掉了外层的 padding: 20px，改为在内部控制，防止 Tab 栏被挤压
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
    document.getElementById('wc-seg-settings-status').classList.toggle('active', tab === 'status');
    document.getElementById('wc-seg-settings-playlist').classList.toggle('active', tab === 'playlist');
    document.getElementById('wc-settings-tab-status').style.display = tab === 'status' ? 'block' : 'none';
    document.getElementById('wc-settings-tab-playlist').style.display = tab === 'playlist' ? 'block' : 'none';
}

// --- 新增：点击歌单直接播放并开启一起听歌 ---
// --- 新增：点击歌单直接播放 ---
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
            
            // 延迟一下等待提示消失
            setTimeout(() => {
                // 1. 关闭手机模拟器
                wcClosePhoneSim();
                
                // 2. 打开音乐APP
                openMusicApp();
                
                // 3. 将这首歌加入当前播放列表并播放
                musicState.currentPlaylist = [{ id, title, artist, cover }];
                musicState.currentIndex = 0;
                musicPlaySong(id, title, artist, cover);
                
                // 4. 打开全屏播放器
                musicOpenFullPlayer();

                // 5. 【修改逻辑】：判断当前是否正在和该角色一起听歌
                if (musicState.listenTogether.active && musicState.listenTogether.charId === char.id) {
                    // 如果正在一起听歌，告诉 AI 你点播了 Ta 的歌
                    wcAddMessage(char.id, 'system', 'system', `[系统内部信息(仅AI可见): 用户偷偷查看了你的手机歌单，并点播了你最近常听的《${title}》，现在你们正在一起听这首歌。]`, { hidden: true });
                }
                // 如果没有一起听歌，就什么都不做，单纯自己听
                
            }, 1000);

        } else {
            wcShowError("未找到该歌曲资源");
        }
    } catch (e) {
        console.error(e);
        wcShowError("搜索失败，网络异常");
    }
}

window.wcToggleSettingsTab = function(tab) {
    document.getElementById('wc-seg-settings-status').classList.toggle('active', tab === 'status');
    document.getElementById('wc-seg-settings-playlist').classList.toggle('active', tab === 'playlist');
    document.getElementById('wc-settings-tab-status').style.display = tab === 'status' ? 'block' : 'none';
    document.getElementById('wc-settings-tab-playlist').style.display = tab === 'playlist' ? 'block' : 'none';
}


// --- Phone Message Logic ---

// 【核心修复】：补充缺失的 wcGeneratePhoneChats 函数，并强化生成要求
async function wcGeneratePhoneChats() {
    const char = wcState.characters.find(c => c.id === wcState.editingCharId);
    if (!char) return;

    const apiConfig = await idb.get('ios_theme_api_config');
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
        
        prompt += `请根据角色的人设、用户设定、最近的聊天内容，以及【通讯录NPC列表】，生成该角色手机微信里的【聊天列表】和【详细聊天记录】。\n`;
        prompt += `【严格要求】：\n`;
        prompt += `1. 必须生成 3 到 8 个聊天会话。\n`;
        prompt += `2. 必须包含一个与用户(User)的会话，isUser 设为 true。\n`;
        prompt += `3. 其他会话必须从【通讯录NPC列表】中挑选人物/群聊生成，isGroup 表示是否为群聊。\n`;
        prompt += `4. 【最重要】：每个会话必须包含一个 "history" 数组，里面必须包含 8 到 15 条具体的聊天记录！绝对不能少于8条！\n`;
        prompt += `5. history 中的消息，sender 为 "me" 代表手机主人(${char.name})发出的，sender 为 "them" 代表对方发出的。\n`;
        prompt += `6. 返回纯 JSON 数组，格式如下：\n`;
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
                temperature: parseFloat(apiConfig.temp) || 0.8

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
    
    wcAddMessage(char.id, 'system', 'system', 
        `[系统提示: 你(User)操作了对方的手机，以对方的名义给 ${chat.name} 回复了: "${text}"]`, 
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

    const apiConfig = await idb.get('ios_theme_api_config');
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
        prompt += `> 【格式约束 (最高优先级)】：你必须先输出 <thinking> 标签进行思考，然后再输出 JSON 数组。**必须且只能**输出合法的 JSON 数组，严禁漏掉引号、括号或逗号！严禁输出损坏的 JSON 格式！\n`;

        
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
                temperature: parseFloat(apiConfig.temp) || 0.8

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
    
    history.forEach(msg => {
        const isMe = msg.sender === 'me'; 
        
        const row = document.createElement('div');
        row.style.display = 'flex';
        row.style.flexDirection = isMe ? 'row-reverse' : 'row';
        row.style.marginBottom = '15px'; // 增加间距
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
        bubble.style.padding = '8px 12px';
        bubble.style.borderRadius = '6px';
        bubble.style.fontSize = '15px';
        bubble.style.lineHeight = '1.4';
        bubble.style.wordBreak = 'break-word';
        bubble.style.position = 'relative';
        
        if (isMe) {
            bubble.style.background = '#95EC69';
            bubble.style.color = 'black';
        } else {
            bubble.style.background = 'white';
            bubble.style.color = 'black';
        }
        
                bubble.innerHTML = msg.content;
        
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

    const apiConfig = await idb.get('ios_theme_api_config');
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
                temperature: parseFloat(apiConfig.temp) || 0.8

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

    if (action === 'accept') {
        if (!char.phoneData.contacts) char.phoneData.contacts = [];
        char.phoneData.contacts.push({
            id: req.id,
            name: req.name,
            desc: req.desc,
            type: 'friend',
            avatar: getRandomNpcAvatar() 
        });
        wcAddMessage(char.id, 'system', 'system', `[系统提示] 你(User)操作了对方的手机，通过了 "${req.name}" 的好友请求。`, { hidden: true });
    } else {
        wcAddMessage(char.id, 'system', 'system', `[系统提示] 你(User)操作了对方的手机，拒绝了 "${req.name}" 的好友请求。`, { hidden: true });
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
        char.phoneData.contacts = char.phoneData.contacts.filter(c => c.id !== currentPhoneContact.id);
        
        wcAddMessage(char.id, 'system', 'system', `[系统提示] 你(User)操作了对方的手机，删除了好友 "${currentPhoneContact.name}"。`, { hidden: true });
        
        wcSaveData();
        wcCloseModal('wc-modal-phone-contact-card');
        wcRenderPhoneContacts();
    }
}

function wcShareContactToMain() {
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
    wcSaveData();
    
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

    const wbList = document.getElementById('wc-setting-worldbook-list');
    wbList.innerHTML = '';
    if (worldbookEntries.length === 0) {
        wbList.innerHTML = '<div style="color:#999; font-size:13px;">暂无世界书条目</div>';
    } else {
        worldbookEntries.forEach(entry => {
            const div = document.createElement('div');
            div.className = 'wc-checkbox-item';
            const isChecked = char.chatConfig.worldbookEntries && char.chatConfig.worldbookEntries.includes(entry.id.toString());
            div.innerHTML = `<input type="checkbox" value="${entry.id}" ${isChecked ? 'checked' : ''}><span>${entry.title} (${entry.type})</span>`;
            wbList.appendChild(div);
        });
    }

    const stickerList = document.getElementById('wc-setting-sticker-group-list');
    stickerList.innerHTML = '';
    wcState.stickerCategories.forEach((cat, idx) => {
        const div = document.createElement('div');
        div.className = 'wc-checkbox-item';
        const isChecked = char.chatConfig.stickerGroupIds && char.chatConfig.stickerGroupIds.includes(idx);
        div.innerHTML = `<input type="checkbox" value="${idx}" ${isChecked ? 'checked' : ''}><span>${cat.name}</span>`;
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
    
    // Default to Char tab
    wcSwitchChatSettingsTab('char');
    
    wcRenderChatBgGallery(); // 【新增】：打开设置时渲染图库
    
    wcOpenModal('wc-modal-chat-settings');
}

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

function wcSaveChatSettings() {
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
    wcSaveData();
    
    let displayName = char.note || char.name;
    // 【新增】：如果是群聊，在名字后面加上人数
    if (char.isGroup && char.members) {
        displayName += ` (${char.members.length})`;
    }
    document.getElementById('wc-nav-title').innerText = displayName;
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
    wcState.characters.forEach(char => {
        if (char.chatConfig && char.chatConfig.proactiveEnabled) {
            // 将设定的分钟数转换为毫秒
            const interval = (char.chatConfig.proactiveInterval || 60) * 60 * 1000; 
            const msgs = wcState.chats[char.id] || [];
            let lastTime = 0;
            
            // 【修复1】：准确找到最后一条非系统、非报错的实质性消息时间
            for (let i = msgs.length - 1; i >= 0; i--) {
                if (!msgs[i].isError && msgs[i].type !== 'system') {
                    lastTime = msgs[i].time;
                    break;
                }
            }

            // 如果完全没有聊天记录，使用当前时间兜底，防止一上来就疯狂触发
            if (lastTime === 0) lastTime = now; 

            // 【修复2】：判断时间间隔，并且确保当前没有正在生成回复
            if (now - lastTime > interval && !aiGeneratingLocks[char.id]) {
                console.log(`触发 ${char.name} 主动消息`);
                
                // 【核心修复3】：注入一条隐藏的系统提示，强制 AI 找话题
                // 只有告诉 AI 距离上次聊天很久了，它才会主动开启新话题，否则它会不知道说什么
                wcAddMessage(char.id, 'system', 'system', `[系统内部提示：距离上次聊天已经过去很久了，请你根据人设主动找User搭话，感觉人设开启一个新的话题、分享你现在的状态或表达思念。]`, { hidden: true });
                
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
    
    const apiConfig = await idb.get('ios_theme_api_config');
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
        
        prompt += `\n【当前时间】：${timeString} ${dayString}\n`;
        prompt += `【${char.name} 的人设】：${char.prompt}\n`;
        prompt += `${wbInfo}\n`;
        prompt += `内容要求：口语化，生活化，符合你(${npc.name})的人设。拒绝油腻和AI味。\n`;
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
        prompt += `> 【格式约束 (最高优先级)】：你必须先输出 <thinking> 标签进行思考，然后再输出 JSON 数组。**必须且只能**输出合法的 JSON 数组，严禁漏掉引号、括号或逗号！严禁输出损坏的 JSON 格式！\n`;


        const response = await fetch(`${apiConfig.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiConfig.key}` },
            body: JSON.stringify({
                model: apiConfig.model,
                messages: [{ role: "user", content: prompt }],
                temperature: parseFloat(apiConfig.temp) || 0.8

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
        wcAddMessage(char.id, 'system', 'system', 
            `[系统内部信息(仅AI可见): 你的联系人 "${npc.name}" 刚刚在微信上给你发了具体消息: "${allContentCombined.trim()}"]`, 
            { hidden: true } // 这条消息用户看不见，但 AI 读取上下文时能看到
        );

        if (lsState.isLinked) {
            wcAddMessage(char.id, 'system', 'system', 
                `[系统提示: ${npc.name} 刚刚给 ${char.name} 发送了消息: "${allContentCombined.trim()}"。请注意，你们开启了账号关联，你能感知到这一切。]`, 
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

    const apiConfig = await idb.get('ios_theme_api_config');
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

    const apiConfig = await idb.get('ios_theme_api_config');
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

        let prompt = `你扮演角色：${char.name}。\n`;
        prompt += timePrompt;
        prompt += `人设：${char.prompt}\n${wbInfo}\n`;
        prompt += `【用户(User)设定】：${userPersona}\n`;
        prompt += `【核心场景设定】：我（User）现在正在偷偷查看你（${char.name}）手机上的私密记录和微信收藏。\n`;
        prompt += `【最近我们的聊天记录（20-30条）】：\n${recentMsgs}\n\n`;
        
        prompt += `请基于你的人设、我的设定，以及我们**最近的聊天上下文**，一次性生成你的【私密自慰与春梦记录】和【微信收藏内容】。\n`;
        prompt += `【要求】：\n`;
        prompt += `1. 私密记录 (privacy)：生成你最近一次的私密自慰记录和春梦记录，包含时间、状态、动作/梦境描述和内心感受。\n`;
        prompt += `2. 收藏-备忘录 (memos)：生成 3 至 8 个备忘录，内容可以是日常碎片、对User的秘密想法、待办事项等。\n`;
        prompt += `3. 收藏-手写日记 (diaries)：生成 1 至 2 个手写草稿日记。这是你深夜写下但没有发给User的真心话，情感要极其细腻、深刻、甚至带点偏执或脆弱。\n`;
        prompt += `   - **字数要求**：每篇日记必须不少于 100 字！\n`;
        prompt += `   - **排版与手账风格**：为了模拟真实的手写草稿和拼贴手账感，请在文本中随机使用以下标记：\n`;
        prompt += `     - [涂改]写错或不想承认的话[/涂改]\n`;
        prompt += `     - [高亮]特别重要的情绪或词语[/高亮]\n`;
        prompt += `     - [拼贴]引用的聊天记录或突兀的想法[/拼贴]\n`;
        prompt += `4. 所有内容必须和最近的聊天剧情强相关，拒绝凭空捏造无关剧情。\n`;
        prompt += `5. 返回纯 JSON 对象，格式如下：\n`;
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
                temperature: parseFloat(apiConfig.temp) || 0.8
            })
        });

        const data = await response.json();
        let content = data.choices[0].message.content;
        content = content.replace(/<thinking>[\s\S]*?<\/thinking>/g, '').trim();
        content = content.replace(/```json/g, '').replace(/```/g, '').trim();
        const resultData = JSON.parse(content);

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
        wcShowError("生成失败");
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

    const apiConfig = await idb.get('ios_theme_api_config');
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

        let prompt = `你扮演角色：${char.name}。\n`;
        prompt += timePrompt;
        prompt += `人设：${char.prompt}\n${wbInfo}\n`;
        prompt += `【用户(User)设定】：${userPersona}\n`;
        prompt += `【核心场景设定】：我（User）现在正在偷偷查看你（${char.name}）手机上的微信“我的收藏”。\n`;
        prompt += `【最近我们的聊天记录（20-30条）】：\n${recentMsgs}\n\n`;
        
        prompt += `请基于你的人设、我的设定，以及我们**最近的聊天上下文**，生成你的微信收藏内容。\n`;
        prompt += `【要求】：\n`;
        prompt += `1. 生成 3 至 8 个备忘录 (memos)，内容可以是你的日常碎片、对User的秘密想法、待办事项等，必须和最近的聊天剧情强相关。\n`;
        prompt += `2. 生成 1 至 2 个手写草稿日记 (diaries)。这是你深夜写下但没有发给User的真心话，情感要极其细腻、深刻、甚至带点偏执或脆弱。\n`;
        prompt += `   - **字数要求**：每篇日记必须不少于 100 字！\n`;
        prompt += `   - **排版与手账风格**：为了模拟真实的手写草稿和拼贴手账感，请在文本中随机使用以下标记：\n`;
        prompt += `     - [涂改]写错或不想承认的话[/涂改]\n`;
        prompt += `     - [高亮]特别重要的情绪或词语[/高亮]\n`;
        prompt += `     - [拼贴]引用的聊天记录或突兀的想法[/拼贴]\n`;
        prompt += `3. 返回纯 JSON 对象，格式如下：\n`;
        prompt += `{
  "memos": [
    {"title": "备忘录标题", "content": "详细的备忘录正文内容...", "time": "2023-10-24 14:30"}
  ],
  "diaries": [
    {"content": "手写日记的正文内容...", "time": "昨天深夜 03:15"}
  ]
}\n`;

        const response = await fetch(`${apiConfig.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiConfig.key}` },
            body: JSON.stringify({
                model: apiConfig.model,
                messages: [{ role: "user", content: prompt }],
                temperature: parseFloat(apiConfig.temp) || 0.8
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

    const apiConfig = await idb.get('ios_theme_api_config');
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

        let prompt = `你扮演角色：${char.name}。\n`;
        prompt += timePrompt;
        prompt += `人设：${char.prompt}\n${wbInfo}\n`;
        prompt += `【用户(User)设定】：${userPersona}\n`;
        prompt += `【核心场景设定】：我（User）现在正在偷偷查看你（${char.name}）手机上的浏览器APP。\n`;
        prompt += `【最近我们的聊天记录（20-30条）】：\n${recentMsgs}\n\n`;
        
        prompt += `请基于你的人设、我的设定，以及我们**最近的聊天上下文**，生成你的浏览器数据。\n`;
        prompt += `【要求】：\n`;
        prompt += `1. 生成 4 至 8 条浏览记录 (history)。标题必须反映你最近在偷偷搜索或关注什么（比如因为聊天中的某件事去查资料、查怎么回复我、查某种情感等）。必须包含你当时的内心批注 (annotation)。\n`;
        prompt += `2. 生成 2 至 5 个论坛帖子 (posts)。可以是你在匿名论坛发帖求助/吐槽，也可以是你浏览了别人的帖子并在下面评论。每个帖子必须包含 5 至 10 个评论 (comments)，评论里要有网友的回复，也要有你的互动。\n`;
        prompt += `3. 返回纯 JSON 对象，格式如下：\n`;
        prompt += `{
  "history": [
    {"title": "搜索的网页标题", "url_placeholder": "www.baidu.com/s?wd=...", "annotation": "你浏览这个网页时的内心真实想法", "time": "今天 10:20"}
  ],
  "posts": [
    {
      "title": "帖子标题", 
      "content": "帖子正文...", 
      "author": "匿名用户 / ${char.name}", 
      "comments": [
        {"author": "网友A", "content": "评论内容"},
        {"author": "${char.name}", "content": "你的回复"}
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
                temperature: parseFloat(apiConfig.temp) || 0.8
            })
        });

        const data = await response.json();
        let content = data.choices[0].message.content;
        content = content.replace(/<thinking>[\s\S]*?<\/thinking>/g, '').trim();
        content = content.replace(/```json/g, '').replace(/```/g, '').trim();
        const browserData = JSON.parse(content);

        if (!char.phoneData) char.phoneData = {};
        char.phoneData.browser = browserData;
        wcSaveData();

        wcRenderPhoneBrowserContent();
        wcShowSuccess("提取成功");

    } catch (e) {
        console.error(e);
        wcShowError("生成失败");
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
    
    if (!wcState.shopData.config) wcState.shopData.config = { worldbookEntries: [] };
    const selectedWbs = wcState.shopData.config.worldbookEntries || [];

    if (worldbookEntries.length === 0) {
        list.innerHTML = '<div style="color:#999; font-size:13px;">暂无世界书条目</div>';
    } else {
        worldbookEntries.forEach(entry => {
            const div = document.createElement('div');
            div.className = 'wc-checkbox-item';
            const isChecked = selectedWbs.includes(entry.id.toString());
            div.innerHTML = `<input type="checkbox" value="${entry.id}" ${isChecked ? 'checked' : ''}><span>${entry.title} (${entry.type})</span>`;
            list.appendChild(div);
        });
    }

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
    const apiConfig = await idb.get('ios_theme_api_config');
    if (!apiConfig || !apiConfig.key) return alert("请先配置 API");

    const limit = apiConfig.limit || 50;
    if (limit > 0 && sessionApiCallCount >= limit) {
        wcShowError("已达到API调用上限");
        return;
    }
    sessionApiCallCount++;

    wcShowLoading("正在进货中...");

    try {
        let wbInfo = "";
        const selectedWbs = wcState.shopData.config.worldbookEntries || [];
        if (worldbookEntries.length > 0 && selectedWbs.length > 0) {
            const linkedEntries = worldbookEntries.filter(e => selectedWbs.includes(e.id.toString()));
            if (linkedEntries.length > 0) {
                wbInfo = "【世界观参考】:\n" + linkedEntries.map(e => `${e.title}: ${e.desc}`).join('\n');
            }
        }

        let prompt = `请根据以下世界观设定，生成商城商品和外卖商品。\n${wbInfo}\n`;
        prompt += `【要求】：\n`;
        prompt += `1. 生成 10 个商城商品 (mall)，包含物品名称、符合世界观的简短描述、以及合理的价格(数字)。\n`;
        prompt += `2. 生成 10 个外卖商品 (takeout)，包含食物名称、诱人的简短描述、以及合理的价格(数字)。\n`;
        prompt += `3. 返回纯 JSON 对象，格式如下：\n`;
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
                temperature: parseFloat(apiConfig.temp) || 0.8
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

        wcRenderShopItems('mall');
        wcRenderShopItems('takeout');
        wcShowSuccess("进货成功");

    } catch (e) {
        console.error(e);
        wcShowError("生成失败");
    }
}

function wcRenderShopItems(tab) {
    const container = document.getElementById(`shop-list-${tab}`);
    const items = wcState.shopData[tab] || [];
    
    if (items.length === 0) {
        container.innerHTML = '<div style="text-align: center; color: #999; margin-top: 50px;">点击右上角生成商品</div>';
        return;
    }

    let html = '';
    items.forEach((item, idx) => {
        // 随机生成一个占位图颜色
        const hue = Math.floor(Math.random() * 360);
        const imgBg = `hsl(${hue}, 30%, 90%)`;
        const icon = tab === 'mall' ? '🛍️' : '🍱';
        
        html += `
            <div class="shop-item-card">
                <div class="shop-item-img" style="background: ${imgBg}; display:flex; align-items:center; justify-content:center; font-size:30px;">${icon}</div>
                <div class="shop-item-info">
                    <div class="shop-item-title">${item.name}</div>
                    <div class="shop-item-desc">${item.desc}</div>
                    <div class="shop-item-price">¥${parseFloat(item.price).toFixed(2)}</div>
                </div>
                <div class="shop-item-add" onclick="wcAddToCart('${tab}', ${idx})">+</div>
            </div>
        `;
    });
    container.innerHTML = html;
}

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

/**
 * 修改：wcPayAndSend 函数，使其能接收新的 deliveryText
 * @param {string} method - 'gift' 或 'daifu'
 * @param {string} deliveryText - '立即配送' 或 '预约: YYYY-MM-DD HH:mm'
 */
function wcPayAndSend(method, deliveryText) {
    const cart = wcState.shopData.cart || [];
    if (cart.length === 0) return;

    let total = 0;
    let itemNames = [];
    cart.forEach(item => {
        total += parseFloat(item.price);
        itemNames.push(item.name);
    });

    const itemsStr = itemNames.join('、');
    
    let cardHtml = '';
    let aiSystemMessage = '';

    if (method === 'gift') {
        // 用户支付，生成粉色礼物卡片
        cardHtml = `
            <div class="shopping-card gift">
                <div class="shopping-card-header">
                    <div class="shopping-card-tag">GIFT</div>
                    <div class="shopping-card-icon">
                        <svg viewBox="0 0 24 24"><path d="M20 12v10H4V12M20 7H4V4h16v3M12 22V7m-4 0h8v0a4 4 0 0 1-8 0v0Z"></path></svg>
                    </div>
                </div>
                <div class="shopping-card-body">
                    <div class="shopping-card-title">For You</div>
                    <div class="shopping-card-desc">一份包含 ${itemNames[0]} 等的礼物</div>
                </div>
                <div class="shopping-card-footer">
                    <div class="shopping-card-price">¥${total.toFixed(2)}</div>
                    <div class="shopping-card-status">已支付<br>${deliveryText}</div>
                </div>
            </div>
        `;

        aiSystemMessage = `[系统内部信息(仅AI可见): 用户刚刚为你购买了以下物品：${itemsStr}。配送方式：${deliveryText}。]`;

        // 支付流程
        wcOpenGeneralInput(`支付 ¥${total.toFixed(2)} (输入支付密码)`, (pass) => {
            if (pass !== wcState.wallet.password) {
                alert("密码错误！");
                return;
            }
            if (wcState.wallet.balance < total) {
                alert("余额不足！请先充值。");
                return;
            }
            
            // 扣款
            wcState.wallet.balance -= total;
            wcState.wallet.transactions.push({
                id: Date.now(), type: 'payment', amount: total,
                note: `商城购物赠送`, time: Date.now()
            });
            
            // 清空购物车并发送消息
            wcState.shopData.cart = [];
            wcSaveData();
            wcUpdateCartBadge();
            wcCloseModal('wc-modal-shop-cart');
            wcCloseShoppingPage();
            
            wcAddMessage(wcState.activeChatId, 'system', 'system', aiSystemMessage, { hidden: true });
            setTimeout(() => {
                wcAddMessage(wcState.activeChatId, 'me', 'receipt', cardHtml);
            }, 300);
            
        }, true);

    } else if (method === 'daifu') {
        // 代付，生成蓝色请求卡片
        cardHtml = `
            <div class="shopping-card daifu">
                <div class="shopping-card-header">
                    <div class="shopping-card-tag">REQUEST</div>
                    <div class="shopping-card-icon">
                        <svg viewBox="0 0 24 24"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
                    </div>
                </div>
                <div class="shopping-card-body">
                    <div class="shopping-card-title">Payment</div>
                    <div class="shopping-card-desc">包含 ${itemNames[0]} 等的订单</div>
                </div>
                <div class="shopping-card-footer">
                    <div class="shopping-card-price">¥${total.toFixed(2)}</div>
                    <div class="shopping-card-status">待支付<br>${deliveryText}</div>
                </div>
            </div>
        `;

        aiSystemMessage = `[系统内部信息(仅AI可见): 用户刚刚向你发送了一个代付请求，希望你帮忙支付以下物品：${itemsStr}。总价：¥${total.toFixed(2)}。配送方式：${deliveryText}。请在回复中做出回应（同意付款或拒绝付款等）。]`;

        // 清空购物车并发送消息
        wcState.shopData.cart = [];
        wcSaveData();
        wcUpdateCartBadge();
        wcCloseModal('wc-modal-shop-cart');
        wcCloseShoppingPage();
        
        wcAddMessage(wcState.activeChatId, 'system', 'system', aiSystemMessage, { hidden: true });
        setTimeout(() => {
            wcAddMessage(wcState.activeChatId, 'me', 'receipt', cardHtml);
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

    const apiConfig = await idb.get('ios_theme_api_config');
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

        let prompt = `你扮演角色：${char.name}。\n`;
        prompt += `人设：${char.prompt}\n${wbInfo}\n`;
        prompt += `【用户(User)设定】：${userPersona}\n`;
        prompt += `【核心场景设定】：我（User）现在正在偷偷查看你（${char.name}）手机上的购物APP。\n`;
        prompt += `【最近我们的聊天记录（20-30条）】：\n${recentMsgs}\n\n`;
        
        prompt += `请基于你的人设、我的设定，以及我们**最近的聊天上下文**，生成你的私密购物数据。\n`;
        prompt += `【要求】：\n`;
        prompt += `1. 生成 4 至 8 条购物车商品 (cart)。这些是你最近想买但还没买的东西，可能和聊天中提到的事情有关，也可能是你想送给User的礼物，或者是符合你人设的私密物品。\n`;
        prompt += `2. 生成 4 至 8 条购买记录 (history)。这些是你最近已经买下的东西，必须包含购买日期(如"昨天", "10-24")。\n`;
        prompt += `3. 商品描述(desc)要带有一点你添加购物车时的内心OS或用途说明。\n`;
        prompt += `4. 返回纯 JSON 对象，格式如下：\n`;
        prompt += `{
  "cart": [
    {"name": "商品名称", "desc": "内心OS或商品描述", "price": "199.00"}
  ],
  "history": [
    {"name": "商品名称", "desc": "内心OS或商品描述", "price": "59.90", "date": "10-24"}
  ]
}\n`;

        const response = await fetch(`${apiConfig.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiConfig.key}` },
            body: JSON.stringify({
                model: apiConfig.model,
                messages: [{ role: "user", content: prompt }],
                temperature: parseFloat(apiConfig.temp) || 0.8
            })
        });

        const data = await response.json();
        let content = data.choices[0].message.content;
        content = content.replace(/<thinking>[\s\S]*?<\/thinking>/g, '').trim();
        content = content.replace(/```json/g, '').replace(/```/g, '').trim();
        const cartData = JSON.parse(content);

        if (!char.phoneData) char.phoneData = {};
        char.phoneData.cartApp = cartData;
        wcSaveData();

        wcRenderPhoneCartContent();
        wcShowSuccess("偷看成功");

    } catch (e) {
        console.error(e);
        wcShowError("生成失败");
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

        // 5. 在聊天记录中生成一张高级感礼物卡片，并通知 AI
        const cardHtml = `
            <div class="shopping-card gift">
                <div class="shopping-card-header">
                    <div class="shopping-card-tag">SURPRISE</div>
                    <div class="shopping-card-icon">
                        <svg viewBox="0 0 24 24"><path d="M20 12v10H4V12M20 7H4V4h16v3M12 22V7m-4 0h8v0a4 4 0 0 1-8 0v0Z"></path></svg>
                    </div>
                </div>
                <div class="shopping-card-body">
                    <div class="shopping-card-title">Surprise Gift</div>
                    <div class="shopping-card-desc">我偷偷清空了你的购物车：${item.name}</div>
                </div>
                <div class="shopping-card-footer">
                    <div class="shopping-card-price">¥${price.toFixed(2)}</div>
                    <div class="shopping-card-status">已支付<br>惊喜送达</div>
                </div>
            </div>
        `;

        // 给 AI 发送隐藏的系统提示，强制让它做出反应
        const aiSystemMessage = `[系统内部信息(仅AI可见): 用户偷偷查看了你的手机购物车，并花钱帮你买下了你一直想买的物品："${item.name}" (价格: ¥${price.toFixed(2)})。]`;

        wcAddMessage(char.id, 'system', 'system', aiSystemMessage, { hidden: true });
        setTimeout(() => {
            wcAddMessage(char.id, 'me', 'receipt', cardHtml);
        }, 300);

        alert(`支付成功！已帮 Ta 买下 ${item.name}，快去聊天界面看看 Ta 的反应吧！`);
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
                .ls-feed-text, .ls-widget-note-text, .wc-system-msg-text { 
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
        timerInterval: null
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
            startTime: musicState.listenTogether.startTime
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
                    // 滚动歌词 (假设每行高度30px)
                    const offset = activeIndex * 30;
                    lyricsContainer.style.transform = `translateY(-${offset}px)`;
                }
                // 记录当前高亮的歌词索引
                lyricsContainer.setAttribute('data-active-index', activeIndex);
                // 【新增】：同步歌词到音乐胶囊
                const capsuleLyricEl = document.getElementById('capsule-exp-lyric');
                if (capsuleLyricEl && musicState.lyrics[activeIndex]) {
                    capsuleLyricEl.innerText = musicState.lyrics[activeIndex].text || '...';
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

function musicStartListenTogether(charId, isResume = false) {
    const char = wcState.characters.find(c => c.id === charId);
    if (!char) return;
    
    musicState.listenTogether.active = true;
    musicState.listenTogether.charId = charId;
    
    // 如果不是刷新恢复的，就重置开始时间并保存
    if (!isResume) {
        musicState.listenTogether.startTime = Date.now();
        musicSaveData();
    }
    
    // 获取用户头像 (优先取聊天设置里的面具头像)
    const userAvatar = (char.chatConfig && char.chatConfig.userAvatar) ? char.chatConfig.userAvatar : wcState.user.avatar;
    
    document.getElementById('music-fp-avatar-user').src = userAvatar;
    document.getElementById('music-fp-avatar-char').src = char.avatar;
    document.getElementById('music-fp-together').style.display = 'flex';
    
    if (musicState.listenTogether.timerInterval) clearInterval(musicState.listenTogether.timerInterval);
    
    musicState.listenTogether.timerInterval = setInterval(() => {
        const diff = Math.floor((Date.now() - musicState.listenTogether.startTime) / 1000);
        const m = Math.floor(diff / 60).toString().padStart(2, '0');
        const s = (diff % 60).toString().padStart(2, '0');
        const timeStr = `${m}:${s}`;
        
        const timerEl = document.getElementById('music-fp-timer');
        // 修复：HTML中胶囊计时器的ID是 capsule-timer，不是 capsule-island-timer
        const capsuleTimerEl = document.getElementById('capsule-timer'); 
        
        if (timerEl) timerEl.innerText = timeStr;
        if (capsuleTimerEl) capsuleTimerEl.innerText = timeStr; // 同步更新胶囊上的时间
    }, 1000); // 修复：补全了 setInterval 的闭合和 1000ms 参数
} // 修复：补全了函数的闭合大括号


// 【新增】：手动结束一起听歌
window.musicStopListenTogether = function() {
    if (confirm("要结束和 Ta 的一起听歌吗？")) {
        const charId = musicState.listenTogether.charId; // 先保存 ID
        musicState.listenTogether.active = false;
        musicState.listenTogether.charId = null;
        clearInterval(musicState.listenTogether.timerInterval);
        document.getElementById('music-fp-together').style.display = 'none';
        musicSaveData();
         // 修复：结束听歌时重置胶囊的计时器显示
        const capsuleTimerEl = document.getElementById('capsule-timer');
        if (capsuleTimerEl) capsuleTimerEl.innerText = "00:00";      
        // 【修复】：告诉 AI 结束了听歌
        if (charId) {
            wcAddMessage(charId, 'system', 'system', `[系统内部信息(仅AI可见): 用户结束了和你的“一起听歌”。]`, { hidden: true });       
        }
        alert("已结束一起听歌。");
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
            const resTracks = await fetch(`https://zm.armoe.cn/playlist/track/all?id=${plId}&limit=50`);
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
    musicState.listenTogether.active = false;
    musicState.listenTogether.charId = null;
    clearInterval(musicState.listenTogether.timerInterval);
    
    const togetherEl = document.getElementById('music-fp-together');
    if (togetherEl) togetherEl.style.display = 'none';
    
    musicSaveData();
    // 确保这里没有 hidden: true，这样用户就能在聊天界面看到
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

async function musicAcceptCharInvite() {
    const modal = document.getElementById('music-char-invite-modal');
    modal.classList.add('hidden');
    setTimeout(() => modal.style.display = 'none', 300);

    if (pendingCharInviteData) {
        const charId = pendingCharInviteData.charId;
        const songName = pendingCharInviteData.songName;
        
        // 【修复】：不发送可见的文本消息，改为发送隐藏的系统提示给 AI
        wcAddMessage(charId, 'system', 'system', `[系统内部信息(仅AI可见): 用户接受了你的听歌邀请，你们现在正在一起听歌。]`, { hidden: true });
        
        // 打开音乐播放器并建立连接
        openMusicApp();
        musicStartListenTogether(charId);
        musicOpenFullPlayer();

        // 如果 AI 指定了歌曲，自动搜索并播放
        if (songName) {
            document.getElementById('music-search-input').value = songName;
            await musicPerformSearch();
            if (musicState.currentPlaylist.length > 0) {
                musicPlayFromSearch(0);
            }
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

    const apiConfig = await idb.get('ios_theme_api_config');
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
                temperature: 0.7
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
    if (typeof worldbookEntries !== 'undefined' && worldbookEntries.length > 0) {
        worldbookEntries.forEach(entry => {
            const isChecked = dreamState.selectedWbIds.includes(entry.id.toString());
            wbList.innerHTML += `
                <div class="dream-item-row">
                    <span>${entry.title}</span>
                    <input type="checkbox" class="dream-checkbox" value="${entry.id}" ${isChecked ? 'checked' : ''} onchange="dreamToggleWb(this)">
                </div>
            `;
        });
    } else {
        wbList.innerHTML = '<div style="color:#999; font-size:12px;">暂无世界书，请在主界面添加</div>';
    }

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

    const apiConfig = await idb.get('ios_theme_api_config');
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
    
    // 动态生成菜单内容
    menu.innerHTML = '';
    if (type === 'user') {
        menu.innerHTML = `
            <div class="dream-ctx-item" onclick="editDreamMsg()">EDIT / 编辑</div>
            <div class="dream-ctx-item" style="color: #FF3B30;" onclick="deleteDreamMsg()">DELETE / 删除</div>
        `;
    } else if (type === 'ai') {
        menu.innerHTML = `
            <div class="dream-ctx-item" onclick="regenerateDreamMsg()">RETRY / 重生成</div>
            <div class="dream-ctx-item" onclick="editDreamMsg()">EDIT / 编辑</div>
            <div class="dream-ctx-item" style="color: #FF3B30;" onclick="deleteDreamMsg()">DELETE / 删除</div>
        `;
    }

    // 获取点击位置 (兼容鼠标和触摸)
    let x = e.clientX || (e.touches && e.touches[0].clientX);
    let y = e.clientY || (e.touches && e.touches[0].clientY);

    const menuWidth = 120;
    const menuHeight = type === 'ai' ? 140 : 100; // AI菜单多一项，高度增加
    const screenW = window.innerWidth;
    const screenH = window.innerHeight;

    if (x + menuWidth > screenW) x = screenW - menuWidth - 10;
    if (y + menuHeight > screenH) y = screenH - menuHeight - 10;

    menu.style.left = x + 'px';
    menu.style.top = y + 'px';
    menu.style.display = 'flex';
}

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
        version: "小元机 03.16",
        date: "2026.03.13",
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
            <li style="margin-bottom: 8px;"><strong>APP1为聊天：</strong>左上角圆形头像为创建角色，右上角的接听键为退出，删除角色前往contacts通讯录页面左滑角色删除，点击角色可以查手机，聊天页面点击对方头像可以快捷进入查手机。聊天设置中的心跳线是可以点击的！！！在心跳线页面里面关联世界书，导入聊天页面气泡美化，设置壁纸等等。回车键为用户发送键，那个小飞机图标是char回复键，拉黑角色后点击是以弹窗形式出现角色消息，角色消息会储存在chat页面（就是会话列表页面）的小卡片头像里面。爆改了朋友圈UI，点击朋友圈头像显示全部朋友圈，点击单个日期可查看单日朋友圈</li>
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

    const apiConfig = await idb.get('ios_theme_api_config');
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
                temperature: parseFloat(apiConfig.temp) || 0.8
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

    const apiConfig = await idb.get('ios_theme_api_config');
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
                temperature: parseFloat(apiConfig.temp) || 0.8
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
        view.addEventListener('click', lsGlobalRipple); // <--- 加上这一行，绑定全局涟漪
        document.getElementById('loversSpaceModal').appendChild(view);
    }
    
    const config = lsState.lettersConfig || {};
    const bgUrl = config.bg || 'https://i.postimg.cc/KvnvwWS3/dong-tai-bei-jing1.gif';
    const img1Url = config.img1 || 'https://i.postimg.cc/7YgYdR84/Image-1770474411684-498.jpg';
    const img2Url = config.img2 || 'https://i.postimg.cc/GhkhVfwd/Image-1770474415295-455.jpg';
    const textStr = config.text || '休戀逝水 早悟蘭因';
    const poemStr = config.poem || 'In the universe of time,<br>we will eventually meet.';

    const bgStyle = `background-image: url('${bgUrl}'); background-size: cover; background-position: center;`;
    const img1Style = `background-image: url('${img1Url}');`;
    const img2Style = `background-image: url('${img2Url}');`;

    view.innerHTML = `
        <!-- 自定义背景与星际轨迹 -->
        <div class="shrine-bg" id="ls-letters-bg" style="${bgStyle}">
            <div class="orbit-ring ring1"></div>
            <div class="orbit-ring ring2"></div>
            <div class="orbit-ring ring3"></div>
        </div>
        
        <div class="shrine-nav">
            <div class="shrine-nav-btn" onclick="lsCloseLettersView()">
                <svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"></polyline></svg>
            </div>
            <div class="shrine-nav-title">TIME MAILBOX</div>
            <div style="width: 40px;"></div>
        </div>

        <!-- 隐藏的上传输入框 -->
        <input type="file" id="ls-letters-bg-input" style="display:none" accept="image/*" onchange="lsHandleLettersUpload(this, 'bg')">
        <input type="file" id="ls-letters-img1-input" style="display:none" accept="image/*" onchange="lsHandleLettersUpload(this, 'img1')">
        <input type="file" id="ls-letters-img2-input" style="display:none" accept="image/*" onchange="lsHandleLettersUpload(this, 'img2')">

        <!-- 拼贴容器 -->
        <div class="shrine-space" id="ls-shrine-space">
            
            <div class="ins-collage-container" id="ls-collage-container">
                <!-- 150x150 相框 (微圆角) -->
                <div class="ins-collage-img2" id="ls-letters-img2" style="${img2Style}" onclick="lsTriggerRippleAndModal(event)">
                    <span id="ls-img2-placeholder" style="display: none; color:#999; font-size:12px; font-weight:bold;">点击祈愿</span>
                </div>
                
                <!-- 左上角上传按钮图片 (100x100 覆盖在相框上) -->
                <img src="https://i.postimg.cc/vHQc0zgt/retouch_2026031701240566.png" class="ins-upload-trigger" onclick="event.stopPropagation(); lsOpenUploadMenu()">
                
                <!-- 英文诗句 (可点击编辑) -->
                <div class="ins-collage-poem" id="ls-letters-poem" onclick="event.stopPropagation(); lsEditLettersPoem()">
                    ${poemStr}
                </div>

                <!-- 250x150 白边圆角图片 -->
                <div class="ins-collage-img1" id="ls-letters-img1" style="${img1Style}" onclick="document.getElementById('ls-letters-img1-input').click()">
                    <span id="ls-img1-placeholder" style="display: none; color:#999; font-size:12px; font-weight:bold;">250x150</span>
                    
                    <!-- 底部文案 -->
                    <div class="ins-collage-text" id="ls-letters-text" onclick="event.stopPropagation(); lsEditLettersText()">${textStr}</div>                   
                    
                    <!-- 右上角音乐符号装饰 (黑色) -->
                    <div class="ins-music-decor">
                        <svg viewBox="0 0 24 24"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" fill="currentColor"/></svg>
                        <svg viewBox="0 0 24 24" style="width:12px;height:12px;margin-top:-6px;"><path d="M9 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3H9z" fill="currentColor"/></svg>
                    </div>

                    <!-- 右下角播放按钮 (黑色) -->
                    <div class="ins-music-play-btn" onclick="event.stopPropagation(); lsToggleLettersMusic()">
                        <svg id="ls-letters-play-icon" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" fill="currentColor"/></svg>
                    </div>
                    
                    <!-- 隐藏的音频标签 -->
                    <audio id="ls-letters-audio" src="https://img.heliar.top/file/1773691226155_Y8m1ok-time_machine__feat._aren_park_-mj_apanay_aren_park.mp3" loop></audio>
                </div>
            </div>
        </div>

        <div class="shrine-footer">
            <button class="shrine-write-btn" onclick="lsOpenUserLetterInput()">
                <svg viewBox="0 0 24 24"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                <span>提笔写信</span>
            </button>
        </div>

        <!-- 上传菜单弹窗 -->
        <div id="ls-upload-menu-modal" class="shrine-modal-overlay" onclick="lsCloseUploadMenu()">
            <div class="shrine-modal-box" onclick="event.stopPropagation()">
                <div class="shrine-modal-title">自定义外观</div>
                <button class="shrine-modal-btn secondary" onclick="document.getElementById('ls-letters-bg-input').click(); lsCloseUploadMenu()">上传背景图</button>
                <button class="shrine-modal-btn secondary" onclick="document.getElementById('ls-letters-img1-input').click(); lsCloseUploadMenu()">上传白边圆角图片</button>
                <button class="shrine-modal-btn secondary" onclick="document.getElementById('ls-letters-img2-input').click(); lsCloseUploadMenu()">上传相框图片</button>
                <button class="shrine-modal-btn cancel" onclick="lsCloseUploadMenu()">取消</button>
            </div>
        </div>

        <!-- 祈愿弹窗 -->
        <div id="ls-shrine-modal" class="shrine-modal-overlay">
            <div class="shrine-modal-box">
                <div class="shrine-modal-title">星空の指引</div>
                <div class="shrine-modal-desc">请选择你的祈愿</div>
                <button class="shrine-modal-btn primary" onclick="lsGenerateAILetter()" id="btn-ai-pray">
                    聆听 Ta 的心声 (生成信件)
                </button>
                <button class="shrine-modal-btn secondary" onclick="lsOpenLetterList()">
                    翻阅星空档案 (信件列表)
                </button>
                <button class="shrine-modal-btn cancel" onclick="lsCloseShrineModal()">离开</button>
            </div>
        </div>

        <!-- 祈愿生成动画覆盖层 (打字机、碎裂、信封) -->
        <div id="ls-pray-animation-overlay" class="pray-anim-overlay" style="display: none;">
            <div id="pray-anim-text" class="pray-anim-text"></div>
            <div id="pray-anim-envelope" class="pray-anim-envelope" style="display: none;">
                <img src="" id="pray-env-avatar" class="env-avatar">
                <svg class="env-heartbeat" viewBox="0 0 100 30">
                    <polyline points="0,15 20,15 30,5 40,25 50,15 60,15 70,0 80,30 90,15 100,15" fill="none" stroke="#FF3B30" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <div class="env-text">这是我给你的誓言</div>
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

// 4. AI 生成信件 (带打字机、移动、碎裂、信封动画)
async function lsGenerateAILetter() {
    const charId = lsState.boundCharId;
    const char = wcState.characters.find(c => c.id === charId);
    if (!char) return;

    const apiConfig = await idb.get('ios_theme_api_config');
    if (!apiConfig || !apiConfig.key) return alert("请先配置 API");

    // 1. 关闭祈愿菜单，显示动画覆盖层
    lsCloseShrineModal();
    const animOverlay = document.getElementById('ls-pray-animation-overlay');
    const animText = document.getElementById('pray-anim-text');
    const animEnvelope = document.getElementById('pray-anim-envelope');
    
    animOverlay.style.display = 'flex';
    animEnvelope.style.display = 'none';
    
    // 重置文字状态
    animText.className = 'pray-anim-text';
    animText.innerHTML = '';
    animText.style.display = 'block';

    // 2. 启动打字机动画
    const textStr = "能永远缠绕在一起吗 发丝 命运 我和你";
    let typeIndex = 0;
    const typeInterval = setInterval(() => {
        animText.innerHTML += textStr[typeIndex];
        typeIndex++;
        if (typeIndex >= textStr.length) {
            clearInterval(typeInterval);
            // 打字完成后，延迟 500ms 触发移动到中央的动画
            setTimeout(() => {
                animText.classList.add('move-center');
            }, 500);
        }
    }, 150);

    try {
        const chatConfig = char.chatConfig || {};
        const userPersona = chatConfig.userPersona || wcState.user.persona || "无";
       
                const msgs = wcState.chats[char.id] || [];
        const recentMsgs = msgs.slice(-40).map(m => { // <--- 把 -100 改成 -40
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

        let prompt = `你扮演角色：${char.name}。\n人设：${char.prompt}\n${wbInfo}\n`;
        prompt += `【用户(User)面具/设定】：${userPersona}\n`;
        prompt += `【你们的共同记忆（共 ${memoryCount} 条记录）】：\n${memoryText}\n\n`;
        prompt += `【最近的聊天记录（40条上下文）】：\n${recentMsgs}\n\n`;
        
        prompt += `请以 ${char.name} 的口吻，给 User 写一封跨越时空的信。\n`;
        prompt += `【核心要求】：\n`;
        prompt += `1. 文风要求：极具高级感、日系/韩系文艺风、意识流、细腻且克制。不要太直白，要像深夜里的呢喃或散文诗。\n`;
        prompt += `2. 内容要求：必须结合【共同记忆】和【聊天记录】中的细节，表达你对 User 的深层情感。\n`;
        prompt += `3. 【绝对禁止】：全文严禁使用任何 emoji 表情符号！严禁出现颜文字！\n`;
        prompt += `4. 必须严格按照以下 JSON 格式返回：\n`;
        prompt += `{
  "title": "信件标题（如：写在星轨交汇时 / 听雨时的随笔）",
  "salutation": "对User的亲昵称呼：\\n见字如晤，",
  "content": "信件正文内容（支持使用 \\n 换行，字数400-600字左右）",
  "signature": "你的署名（如：永远爱你的 ${char.name}）"
}\n`;

        const response = await fetch(`${apiConfig.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiConfig.key}` },
            body: JSON.stringify({
                model: apiConfig.model,
                messages: [{ role: "user", content: prompt }],
                temperature: parseFloat(apiConfig.temp) || 0.8
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
        
        // 3. API 返回成功，触发碎裂动画
        animText.classList.add('shatter');
        
        // 4. 碎裂动画结束后 (800ms)，显示信封
        setTimeout(() => {
            animText.style.display = 'none';
            document.getElementById('pray-env-avatar').src = char.avatar;
            animEnvelope.style.display = 'flex';
            
            // 绑定信封点击事件：打开信件并关闭动画层
            animEnvelope.onclick = () => {
                lsOpenLetterDetail(newLetterId);
                animOverlay.style.display = 'none';
                animEnvelope.style.display = 'none';
            };
        }, 800);

        if (typeof showMainSystemNotification === 'function') {
            showMainSystemNotification("星の神社", `收到了一封来自 ${char.name} 的誓言信件`, char.avatar);
        }

    } catch (e) {
        console.error(e);
        alert("祈愿失败，信号在星空中迷失了...");
        animOverlay.style.display = 'none';
        clearInterval(typeInterval);
    }
}


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

    const apiConfig = await idb.get('ios_theme_api_config');
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
                temperature: parseFloat(apiConfig.temp) || 0.8
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
