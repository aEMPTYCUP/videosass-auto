# VideoSaaS 架构设计

> 基于 VDH×VDP 逆向分析报告的最小架构
> 版本: 1.0.0
> 日期: 2026-07-09

---

## 1. 核心约束

### 1.1 Manifest V3
- 必须使用 Manifest V3
- Service Worker 替代 background page
- Side Panel API 支持

### 1.2 最小权限原则

**必需权限:**
- `tabs` - 读取标签页 URL
- `storage` - 本地存储配置
- `declarativeNetRequest` - 网络请求拦截（可选）

**禁止权限:**
- `scripting` - 禁止在页面注入脚本
- `webRequest` - 禁止拦截请求
- `webNavigation` - 禁止监听导航
- `offscreen` - 禁止后台文档

**可选权限:**
- `downloads` - 用户触发时申请

### 1.3 数据隐私
- URL 上传需剥离追踪参数（qyTrace, e2, fbclid 等）
- 不使用 Server Fetch 模式，纯本地处理

---

## 2. 目录结构

```
videosass/
├── manifest.json           # 扩展配置
├── _locales/              # 国际化
│   └── zh_CN/
│       └── messages.json
├── content-script/        # 内容脚本
│   ├── dom-scanner.js    # DOM 视频扫描
│   ├── spa-observer.js   # SPA 路由监听
│   └── bridge-client.js   # BroadcastChannel 客户端
├── service-worker/        # Service Worker
│   ├── index.js          # 入口
│   ├── bridge-server.js   # BroadcastChannel 服务端
│   └── downloader.js     # 下载调度
├── options/               # 选项页
│   ├── index.html
│   └── index.js
├── lib/                   # 公共库
│   ├── monad.js          # Option/Result 单子
│   └── m3u8-parser.js    # HLS 解析器
├── icons/                 # 图标
│   ├── icon-16.png
│   ├── icon-32.png
│   ├── icon-48.png
│   └── icon-128.png
└── sidepanel/
    ├── index.html
    └── index.js
```

---

## 3. 通信架构

### 3.1 BroadcastChannel 模式

```
┌─────────────────────────────────────────────────────┐
│                    Tab (页面)                        │
├─────────────────────────────────────────────────────┤
│  content_script.js                                   │
│    │                                                 │
│    ├── dom-scanner.js ──► 发现视频 URL              │
│    │                                                 │
│    └── bridge-client.js ──► BroadcastChannel        │
│                                 ▲                   │
└─────────────────────────────────│───────────────────┘
                                  │ key: injected-{FNV-1a(location.href)}
┌─────────────────────────────────│───────────────────┐
│                    Service Worker                     │
├─────────────────────────────────────────────────────┤
│  bridge-server.js ◄── BroadcastChannel              │
│    │                                                 │
│    └── downloader.js ◄── 下载请求                   │
└─────────────────────────────────────────────────────┘
```

### 3.2 消息类型

```javascript
const MSG = {
  VIDEO_FOUND: 'video:found',           // 发现视频
  VIDEO_CLEAN: 'video:clean',           // 清理后的视频
  DOWNLOAD_START: 'download:start',     // 开始下载
  DOWNLOAD_PROGRESS: 'download:progress', // 下载进度
  HLS_GET_VIDEO_DATA: 'hls:getVideoData' // HLS 数据获取
};
```

### 3.3 FNV-1a Hash

每个 Tab 使用唯一的 BroadcastChannel key：

```javascript
function fnv32a(str) {
  let h1 = 0x811c9dc5, h2 = 0x7193e855;
  for (let i = 0; i < str.length; i++) {
    h1 ^= str.charCodeAt(i);
    h1 = Math.imul(h1, 0x01000193);
    h2 ^= str.charCodeAt(i);
    h2 = Math.imul(h2, 0x01000193);
  }
  return 4294967296 * (h2 & 0xffff) + (h1 >>> 0);
}

const channelKey = `injected-${fnv32a(location.href)}`;
const channel = new BroadcastChannel(channelKey);
```

---

## 4. 数据流

### 4.1 视频发现流程

```
用户访问页面
    │
    ▼
content_script.js 加载
    │
    ▼
dom-scanner.js 扫描 DOM
    │
    ├──► video/audio/source 元素
    ├──► a[href$=".mp4|.m3u8|.ts"]
    └──► MSE blob URL
    │
    ▼
spa-observer.js 监听 SPA 路由变化
    │
    ▼
发现视频 → cleanTrackingParams() 清理追踪参数
    │
    ▼
bridge-client.js → BroadcastChannel → Service Worker
```

### 4.2 下载流程

```
用户点击下载按钮
    │
    ▼
bridge-server.js 接收 DOWNLOAD_START
    │
    ▼
downloader.js 处理
    │
    ├──► m3u8-parser.js 解析 HLS
    │
    ├──► 分片下载 (并发)
    │
    └──► 合并为 MP4/TS
    │
    ▼
chrome.downloads.download()
```

---

## 5. 错误处理

使用 Option/Result 单子模式：

```javascript
const m3u8 = extractM3u8(video);
if (m3u8.isNone()) return Result.err('No M3u8 found');

const parsed = M3u8Parser.parse(m3u8.value);
if (parsed.isErr()) return Result.err(parsed.error);

return Result.ok(parsed.value);
```

---

## 6. API 接口

### 6.1 DOMScanner

```typescript
interface VideoInfo {
  url: string;
  title: string;
  extension: string;
  uuid: string;
}

function extractVideoUrls(root: Element, seenUrls?: Set<string>): VideoInfo[];
function cleanTrackingParams(url: string): string;
```

### 6.2 M3u8Parser

```typescript
interface ParsedM3u8 {
  allowCache: boolean;
  endList: boolean;
  segments: Segment[];
  targetDuration: number;
}

function M3u8Parser.parse(m3u8Text: string): ParsedM3u8;
function isVod(parsed: ParsedM3u8): boolean;
```

### 6.3 Bridge

```typescript
class BridgeClient {
  constructor(tabId: number);
  send(cmd: string, data: any): Promise<any>;
  on(cmd: string, handler: Function): void;
}

class BridgeServer {
  static start(onConnect: (port: BroadcastChannel) => void): void;
}
```

---

## 7. 平台适配策略

### 7.1 已测试平台
- [ ] 通用视频网站 (mp4/webm 直接链接)
- [ ] HLS 流媒体 (m3u8)

### 7.2 未来适配
- [ ] Bilibili (WBI 签名)
- [ ] iQiyi (MSE blob 拦截)
- [ ] Netflix (Widevine DRM)

---

## 8. 参考资料

- VDH×VDP 逆向分析报告
- [Chrome Extension Manifest V3](https://developer.chrome.com/docs/extensions/mv3/)
- [BroadcastChannel API](https://developer.mozilla.org/en-US/docs/Web/API/BroadcastChannel)
