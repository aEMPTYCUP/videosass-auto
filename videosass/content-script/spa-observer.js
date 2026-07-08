/**
 * VideoSaaS SPA Observer
 * 基于 VDP content_script.js 的 MutationObserver 实现
 *
 * @author Codex Bot
 * @date 2026-07-09
 */

const DEBOUNCE_MS = 300;

/**
 * SPA 路由监听器
 * @param {Object} state - 状态对象
 * @param {Function} onVideosFound - 发现视频时的回调
 */
function initSpaObserver(state, onVideosFound) {
  let debounceTimer = null;

  const observer = new MutationObserver((mutations) => {
    const hasNewContent = mutations.some(mutation => {
      const addedNodes = mutation.addedNodes || [];
      return [...addedNodes].some(node => {
        if (!(node instanceof Element)) return false;

        // 检查是否是视频相关元素
        if (node.matches && (
          node.matches('a, video, audio, source') ||
          node.matches('[src*=".mp4"], [src*=".m3u8"], [href*=".mp4"], [href*=".m3u8"]')
        )) {
          return true;
        }

        // 检查子元素
        if (node.querySelector) {
          return !!node.querySelector('a[href*=".mp4"], a[href*=".m3u8"], a[href*=".ts"], video, audio');
        }

        return false;
      });
    });

    if (hasNewContent) {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        console.log('[VideoSaaS] SPA content changed, rescanning...');
        onVideosFound(document.body, state.seenVideoUrls);
      }, DEBOUNCE_MS);
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  console.log('[VideoSaaS] SPA Observer initialized');
  return observer;
}

/**
 * 创建 SPA 状态
 * @returns {Object}
 */
function createSpaState() {
  return {
    seenVideoUrls: new Set(),
    observer: null,
    spaRescanTimer: null
  };
}

/**
 * 停止 SPA 监听
 * @param {Object} state
 */
function stopSpaObserver(state) {
  if (state.observer) {
    state.observer.disconnect();
    state.observer = null;
  }
  if (state.spaRescanTimer) {
    clearTimeout(state.spaRescanTimer);
    state.spaRescanTimer = null;
  }
  console.log('[VideoSaaS] SPA Observer stopped');
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    initSpaObserver,
    createSpaState,
    stopSpaObserver,
    DEBOUNCE_MS
  };
}
