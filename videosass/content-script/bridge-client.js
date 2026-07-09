// VideoSaaS Bridge Client
// 基于 VDP bridge.js 模式

const MSG = {
  VIDEO_FOUND: 'video:found',
  VIDEO_CLEAN: 'video:clean',
  DOWNLOAD_START: 'download:start',
  DOWNLOAD_PROGRESS: 'download:progress',
  HLS_GET_VIDEO_DATA: 'hls:getVideoData'
};

// 白名单命令
const WHITELIST = new Set([
  MSG.VIDEO_FOUND,
  MSG.VIDEO_CLEAN,
  MSG.DOWNLOAD_START,
  MSG.DOWNLOAD_PROGRESS,
  MSG.HLS_GET_VIDEO_DATA
]);

class BridgeClient {
  constructor(tabId) {
    this.tabId = tabId;
    this.channel = null;
    this.pending = new Map();
    this.messageId = 0;
    this._init();
  }

  _init() {
    const key = `injected-${this.tabId}`;
    this.channel = new BroadcastChannel(key);

    this.channel.addEventListener('message', (event) => {
      const { id, data } = event.data;
      if (id && this.pending.has(id)) {
        const { resolve, reject } = this.pending.get(id);
        this.pending.delete(id);
        resolve(data);
      }
    });
  }

  send(cmd, data = {}) {
    return new Promise((resolve, reject) => {
      if (!WHITELIST.has(cmd)) {
        reject(new Error(`Command not whitelisted: ${cmd}`));
        return;
      }

      const id = ++this.messageId;
      this.pending.set(id, { resolve, reject });

      this.channel.postMessage({ id, cmd, data });

      // 超时处理
      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          reject(new Error('Message timeout'));
        }
      }, 30000);
    });
  }

  on(cmd, handler) {
    this.channel.addEventListener('message', (event) => {
      if (event.data.cmd === cmd) {
        handler(event.data.data);
      }
    });
  }

  destroy() {
    if (this.channel) {
      this.channel.close();
      this.channel = null;
    }
    this.pending.clear();
  }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { BridgeClient, MSG, WHITELIST };
}
