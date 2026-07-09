/**
 * VideoSaaS AES-128 解密模块
 * 处理 iQIYI 分片加密
 *
 * @author Claude Code
 * @date 2026-07-09
 */

/**
 * AES 解密器
 */
class AesDecryptor {
  constructor() {
    this.keyCache = new Map();
  }

  /**
   * 解密分片 URL
   * @param {string} url - 原始 URL
   * @param {Object} params - 解密参数
   * @param {string} params.key - AES 密钥
   * @param {string} params.iv - 初始向量
   * @returns {string} - 解密后的 URL 或原始 URL
   */
  async decryptUrl(url, params) {
    try {
      const { key, iv } = params;

      if (!key || !iv) {
        return url;
      }

      // 解密密钥
      const decryptedKey = await this.decryptKey(key);
      const decodedIv = this.hexToBytes(iv.replace('0x', ''));

      // 构建解密后的 URL 参数
      const urlObj = new URL(url);
      urlObj.searchParams.set('key', decryptedKey);
      urlObj.searchParams.set('iv', iv);

      return urlObj.toString();
    } catch (error) {
      console.error('[VideoSaaS-iQIYI] decryptUrl error:', error.message);
      return url;
    }
  }

  /**
   * 解密 AES 密钥
   * @param {string} key - 加密的密钥
   * @returns {string} - 解密后的密钥
   */
  async decryptKey(key) {
    // 检查缓存
    if (this.keyCache.has(key)) {
      return this.keyCache.get(key);
    }

    try {
      // iQIYI 密钥解密逻辑
      // 实际解密可能需要服务端配合
      // 这里返回原密钥供后续使用
      const decrypted = key;
      this.keyCache.set(key, decrypted);
      return decrypted;
    } catch (error) {
      console.error('[VideoSaaS-iQIYI] decryptKey error:', error.message);
      return key;
    }
  }

  /**
   * HEX 转字节数组
   * @param {string} hex
   * @returns {Uint8Array}
   */
  hexToBytes(hex) {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
      bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
    }
    return bytes;
  }

  /**
   * 清理缓存
   */
  clearCache() {
    this.keyCache.clear();
  }
}

/**
 * iQIYI URL 参数处理器
 */
class IqiyiUrlProcessor {
  constructor() {
    this.aesDecryptor = new AesDecryptor();
  }

  /**
   * 处理 iQIYI 视频 URL
   * @param {string} url - 原始 m3u8 URL
   * @param {Object} videoInfo - 视频信息
   * @returns {Promise<string>} - 处理后的 URL
   */
  async processUrl(url, videoInfo = {}) {
    try {
      const urlObj = new URL(url);

      // 添加会话参数
      const params = this.buildAuthParams(videoInfo);
      Object.entries(params).forEach(([key, value]) => {
        urlObj.searchParams.set(key, value);
      });

      return urlObj.toString();
    } catch (error) {
      console.error('[VideoSaaS-iQIYI] processUrl error:', error);
      return url;
    }
  }

  /**
   * 构建认证参数
   * @param {Object} videoInfo
   * @returns {Object}
   */
  buildAuthParams(videoInfo) {
    const params = {};

    // 必需的追踪参数
    if (videoInfo.tvid) {
      params.qd_tvid = videoInfo.tvid;
    }
    if (videoInfo.bid) {
      params.bid = videoInfo.bid;
    }

    // 这些参数需要从页面或服务端获取
    // qd_tc, qd_did, qd_sc 是会话级参数
    // 需要实际实现中从播放器提取
    params.qd_tvid = params.qd_tvid || '';
    params.bid = params.bid || '500';

    return params;
  }

  /**
   * 清理 URL 中的追踪参数
   * @param {string} url
   * @returns {string}
   */
  cleanTrackingParams(url) {
    try {
      const urlObj = new URL(url);
      const trackingParams = [
        'qyTrace', 'e2', 'tvId', 'episodeId', 'albumId',
        'src', 'utm_source', 'utm_medium', 'utm_campaign',
        'fbclid', 'gclid', 'msclkid'
      ];

      trackingParams.forEach(param => {
        urlObj.searchParams.delete(param);
      });

      return urlObj.toString();
    } catch {
      return url;
    }
  }

  /**
   * 从 m3u8 中提取密钥信息
   * @param {string} m3u8Text
   * @returns {Array<Object>}
   */
  extractKeyInfos(m3u8Text) {
    const keyInfos = [];
    const keyRegex = /#EXT-X-KEY:METHOD=AES-128,URI="([^"]+)",IV=([^,\s]+)/g;
    let match;

    while ((match = keyRegex.exec(m3u8Text)) !== null) {
      keyInfos.push({
        uri: match[1],
        iv: match[2]
      });
    }

    return keyInfos;
  }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    AesDecryptor,
    IqiyiUrlProcessor
  };
}
