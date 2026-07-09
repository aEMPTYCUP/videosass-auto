/**
 * VideoSaaS 平台适配管理器
 * 统一管理各平台适配器
 *
 * @author Claude Code
 * @date 2026-07-09
 */

const LOG_PREFIX = '[VideoSaaS-platform]';

// 缓存 Promise 而非 Map，避免重复导入
let adaptersPromise = null;

/**
 * 加载所有适配器
 * @returns {Promise<Map<string, PlatformAdapter>>}
 */
async function loadAdapters() {
  if (adaptersPromise) {
    return adaptersPromise;
  }

  adaptersPromise = (async () => {
    const adapters = new Map();

    // iQIYI 适配器
    try {
      const { IqiyiAdapter } = await import('./iqiyi-adapter.js');
      adapters.set('iqiyi', new IqiyiAdapter());
      console.log(`${LOG_PREFIX} Loaded IqiyiAdapter`);
    } catch (error) {
      console.warn(`${LOG_PREFIX} Failed to load IqiyiAdapter:`, error?.message);
    }

    return adapters;
  })();

  return adaptersPromise;
}

/**
 * 检测当前页面支持的平台
 * @returns {Promise<PlatformAdapter|null>}
 */
async function detectPlatform() {
  const platformAdapters = await loadAdapters();

  for (const [name, adapter] of platformAdapters) {
    if (adapter.isSupported()) {
      console.log(`${LOG_PREFIX} Detected: ${name}`);
      return adapter;
    }
  }

  console.log(`${LOG_PREFIX} No supported platform`);
  return null;
}

/**
 * 从当前页面提取视频信息
 * @returns {Promise<Object|null>}
 */
async function extractVideoFromCurrentPage() {
  const platform = await detectPlatform();

  if (!platform) {
    return null;
  }

  return await platform.extract();
}

/**
 * 获取视频信息（带重试和防抖）
 * @param {number} retries
 * @param {number} delay
 * @param {number} debounce - 防抖延迟 ms
 * @returns {Promise<Object|null>}
 */
async function extractVideoWithRetry(retries = 3, delay = 1000, debounce = 300) {
  // 防抖
  await new Promise(r => setTimeout(r, debounce));

  for (let i = 0; i < retries; i++) {
    const video = await extractVideoFromCurrentPage();
    if (video) {
      return video;
    }
    if (i < retries - 1) {
      console.log(`${LOG_PREFIX} Retry ${i + 1}/${retries}...`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  return null;
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    loadAdapters,
    detectPlatform,
    extractVideoFromCurrentPage,
    extractVideoWithRetry,
    LOG_PREFIX
  };
}
