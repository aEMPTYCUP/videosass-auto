/**
 * VideoSaaS DOM Scanner
 * 基于 VDP content_script.js 的 extractVideoUrls 实现模式
 *
 * @author Codex Bot
 * @date 2026-07-09
 */

const VIDEO_EXTENSIONS = ['mp4', 'webm', 'm3u8', 'mpd', 'm4v', 'mkv', 'ts', 'mov', 'avi', 'flv', 'wmv'];

/**
 * 获取 URL 扩展名
 * @param {string} url
 * @returns {string}
 */
function getExtension(url) {
  if (!url) return '';
  try {
    const pathname = new URL(url).pathname;
    const ext = pathname.split('.').pop().toLowerCase();
    return ext || '';
  } catch {
    return '';
  }
}

/**
 * 解析相对 URL 为绝对 URL
 * @param {string} url
 * @returns {string}
 */
function resolveUrl(url) {
  if (!url) return '';
  try {
    return new URL(url, window.location.href).href;
  } catch {
    return url;
  }
}

/**
 * 从 DOM 树中提取视频 URL
 * @param {Element} root - 根元素
 * @param {Set<string>} seenUrls - 已处理的 URL 集合（用于去重）
 * @returns {Array<{url: string, title: string, extension: string, uuid: string}>}
 */
function extractVideoUrls(root, seenUrls = new Set()) {
  const results = [];

  if (!root) return results;

  // 扫描 <a> 标签
  root.querySelectorAll('a').forEach(a => {
    const href = a.getAttribute('href');
    if (!href) return;

    const url = resolveUrl(href);
    const ext = getExtension(url);

    if (VIDEO_EXTENSIONS.includes(ext) && !seenUrls.has(url)) {
      seenUrls.add(url);
      results.push({
        url,
        title: a.title || a.textContent?.trim() || document.title,
        extension: ext,
        uuid: crypto.randomUUID()
      });
    }
  });

  // 扫描 <video>, <audio>, <source> 元素
  root.querySelectorAll('video, audio').forEach(el => {
    // 直接获取 src
    const directSrc = el.getAttribute('src');
    if (directSrc) {
      const url = resolveUrl(directSrc);
      const ext = getExtension(url);
      if (VIDEO_EXTENSIONS.includes(ext) && !seenUrls.has(url)) {
        seenUrls.add(url);
        results.push({
          url,
          title: el.title || el.getAttribute('data-title') || document.title,
          extension: ext,
          uuid: crypto.randomUUID()
        });
      }
    }

    // 扫描 <source> 元素
    el.querySelectorAll('source').forEach(source => {
      const src = source.getAttribute('src');
      if (!src) return;

      const url = resolveUrl(src);
      const ext = getExtension(url);
      if (VIDEO_EXTENSIONS.includes(ext) && !seenUrls.has(url)) {
        seenUrls.add(url);
        results.push({
          url,
          title: source.title || el.title || document.title,
          extension: ext,
          uuid: crypto.randomUUID()
        });
      }
    });

    // 扫描 <track> 元素（字幕）
    el.querySelectorAll('track').forEach(track => {
      const src = track.getAttribute('src');
      if (!src) return;

      const url = resolveUrl(src);
      const ext = getExtension(url);
      if (['vtt', 'srt', 'json'].includes(ext) && !seenUrls.has(url)) {
        seenUrls.add(url);
        results.push({
          url,
          title: track.label || 'Subtitle',
          extension: ext,
          uuid: crypto.randomUUID()
        });
      }
    });
  });

  return results;
}

/**
 * 清理 URL 中的追踪参数
 * @param {string} url
 * @returns {string}
 */
function cleanTrackingParams(url) {
  if (!url) return '';

  const TRACKING_PARAMS = [
    'qyTrace', 'e2', 'tvId', 'episodeId', 'albumId',
    'src', 'utm_source', 'utm_medium', 'utm_campaign',
    'fbclid', 'gclid', 'msclkid'
  ];

  try {
    const urlObj = new URL(url);
    TRACKING_PARAMS.forEach(param => urlObj.searchParams.delete(param));
    return urlObj.toString();
  } catch {
    return url;
  }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    extractVideoUrls,
    cleanTrackingParams,
    getExtension,
    resolveUrl,
    VIDEO_EXTENSIONS
  };
}
