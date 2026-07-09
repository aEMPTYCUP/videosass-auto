/**
 * VideoSaaS 平台适配管理器
 * 统一管理各平台适配器
 *
 * @author Claude Code
 * @date 2026-07-09
 */

// 动态导入适配器
let adapters = null;

/**
 * 加载所有适配器
 * @returns {Promise<Map<string, PlatformAdapter>>}
 */
async function loadAdapters() {
  if (adapters) {
    return adapters;
  }

  adapters = new Map();

  // iQIYI 适配器
  try {
    const { IqiyiAdapter } = await import('./iqiyi-adapter.js');
    adapters.set('iqiyi', new IqiyiAdapter());
  } catch (error) {
    console.warn('[VideoSaaS] Failed to load IqiyiAdapter:', error);
  }

  return adapters;
}

/**
 * 检测当前页面支持的平台
 * @returns {Promise<PlatformAdapter|null>}
 */
async function detectPlatform() {
  const platformAdapters = await loadAdapters();

  for (const [name, adapter] of platformAdapters) {
    if (adapter.isSupported()) {
      console.log(`[VideoSaaS] Detected platform: ${name}`);
      return adapter;
    }
  }

  return null;
}

/**
 * 从当前页面提取视频信息
 * @returns {Promise<Object|null>}
 */
async function extractVideoFromCurrentPage() {
  const platform = await detectPlatform();

  if (!platform) {
    console.log('[VideoSaaS] No supported platform detected');
    return null;
  }

  return await platform.extract();
}

/**
 * 获取视频信息（带重试）
 * @param {number} retries
 * @param {number} delay
 * @returns {Promise<Object|null>}
 */
async function extractVideoWithRetry(retries = 3, delay = 1000) {
  for (let i = 0; i < retries; i++) {
    const video = await extractVideoFromCurrentPage();
    if (video) {
      return video;
    }
    if (i < retries - 1) {
      console.log(`[VideoSaaS] Retry ${i + 1}/${retries}...`);
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
    extractVideoWithRetry
  };
}
