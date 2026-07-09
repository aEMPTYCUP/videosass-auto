// VideoSaaS Service Worker
// 入口文件

const ctx = self;

// 导入公共库
importScripts('../lib/monad.js', '../lib/m3u8-parser.js');

// Bridge 消息类型
const MSG = {
  VIDEO_FOUND: 'video:found',
  VIDEO_CLEAN: 'video:clean',
  DOWNLOAD_START: 'download:start',
  DOWNLOAD_PROGRESS: 'download:progress',
  HLS_GET_VIDEO_DATA: 'hls:getVideoData'
};

// FNV-1a Hash
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

// 广播频道管理
const channels = new Map();

function getChannel(tabId) {
  if (!channels.has(tabId)) {
    const key = `injected-${tabId}`;
    const channel = new BroadcastChannel(key);
    channels.set(tabId, channel);
    return channel;
  }
  return channels.get(tabId);
}

// 处理来自内容脚本的消息
ctx.addEventListener('message', async (event) => {
  const { type, data, tabId } = event.data;

  switch (type) {
    case MSG.VIDEO_FOUND:
      ctx.dispatchEvent(new ctx.ExtendableEvent('videofound', { video: data }));
      break;

    case MSG.DOWNLOAD_START:
      await handleDownload(data);
      break;
  }
});

// 处理下载请求
async function handleDownload(videoInfo) {
  console.log('[VideoSaaS] Download requested:', videoInfo);

  if (videoInfo.extension === 'm3u8') {
    // HLS 下载
    const result = await downloadHls(videoInfo);
    return result;
  } else {
    // 直接下载
    ctx.clients.matchAll({ type: 'window' }).then(clients => {
      clients.forEach(client => {
        client.postMessage({ type: MSG.DOWNLOAD_PROGRESS, data: { url: videoInfo.url, status: 'complete' } });
      });
    });
  }
}

// HLS 下载
async function downloadHls(videoInfo) {
  console.log('[VideoSaaS] Downloading HLS:', videoInfo.url);

  try {
    const response = await ctx.fetch(videoInfo.url);
    const m3u8Text = await response.text();
    const parsed = M3u8Parser.parse(m3u8Text);

    const urls = parsed.segments.map(s => s.uri);

    ctx.clients.matchAll({ type: 'window' }).then(clients => {
      clients.forEach(client => {
        client.postMessage({
          type: MSG.DOWNLOAD_PROGRESS,
          data: { total: urls.length, completed: 0 }
        });
      });
    });

    return { success: true, segments: urls.length };
  } catch (error) {
    console.error('[VideoSaaS] HLS download error:', error);
    return { success: false, error: error.message };
  }
}

// Service Worker 生命周期
ctx.addEventListener('install', (event) => {
  console.log('[VideoSaaS] Service Worker installed');
  ctx.skipWaiting();
});

ctx.addEventListener('activate', (event) => {
  console.log('[VideoSaaS] Service Worker activated');
  event.waitUntil(ctx.clients.claim());
});

console.log('[VideoSaaS] Service Worker loaded');
