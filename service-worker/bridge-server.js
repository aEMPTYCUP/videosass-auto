// VideoSaaS Bridge Server
// Service Worker 端的 BroadcastChannel 服务

const MSG = {
  VIDEO_FOUND: 'video:found',
  VIDEO_CLEAN: 'video:clean',
  DOWNLOAD_START: 'download:start',
  DOWNLOAD_PROGRESS: 'download:progress',
  HLS_GET_VIDEO_DATA: 'hls:getVideoData'
};

class BridgeServer {
  constructor() {
    this.handlers = new Map();
    this.channels = new Map();
  }

  // 注册消息处理器
  on(cmd, handler) {
    this.handlers.set(cmd, handler);
  }

  // 启动服务
  start() {
    self.addEventListener('message', (event) => {
      this.handleMessage(event);
    });
    console.log('[VideoSaaS-bridge] Bridge server started');
  }

  // 处理消息
  async handleMessage(event) {
    const { id, cmd, data, tabId } = event.data;

    if (!this.handlers.has(cmd)) {
      console.warn('[VideoSaaS-bridge] Unknown command:', cmd);
      return;
    }

    try {
      const result = await this.handlers.get(cmd)(data, tabId);

      if (id) {
        this.getChannel(tabId).postMessage({ id, data: result });
      }
    } catch (error) {
      console.error('[VideoSaaS-bridge] Handler error:', error);
      if (id) {
        this.getChannel(tabId).postMessage({ id, error: error.message });
      }
    }
  }

  // 获取或创建 Channel
  getChannel(tabId) {
    if (!this.channels.has(tabId)) {
      const key = `injected-${tabId}`;
      const channel = new BroadcastChannel(key);
      this.channels.set(tabId, channel);
    }
    return this.channels.get(tabId);
  }
}

const bridgeServer = new BridgeServer();

// 默认处理器
bridgeServer.on(MSG.DOWNLOAD_START, async (data, tabId) => {
  console.log('[VideoSaaS-bridge] Download start:', data);
  return { success: true, message: 'Download queued' };
});

bridgeServer.on(MSG.VIDEO_FOUND, async (data, tabId) => {
  console.log('[VideoSaaS-bridge] Video found:', data);
  return { received: true };
});

// 启动
bridgeServer.start();
