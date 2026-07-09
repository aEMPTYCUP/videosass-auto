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

  on(cmd, handler) {
    this.handlers.set(cmd, handler);
  }

  start() {
    self.addEventListener('message', (event) => {
      this.handleMessage(event);
    });
    console.log('[VideoSaaS-bridge] Bridge server started');
  }

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

bridgeServer.on(MSG.DOWNLOAD_START, async (data) => {
  console.log('[VideoSaaS-bridge] Download start:', data);
  return { success: true };
});

bridgeServer.on(MSG.VIDEO_FOUND, async (data) => {
  console.log('[VideoSaaS-bridge] Video found:', data);
  return { received: true };
});

bridgeServer.start();
