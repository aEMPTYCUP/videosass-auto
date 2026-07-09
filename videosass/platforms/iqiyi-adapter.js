/**
 * VideoSaaS iQIYI 平台适配器
 * 基于 VDH×VDP 逆向分析报告 Phase 2
 *
 * @author Claude Code
 * @date 2026-07-09
 */

/**
 * iQIYI 视频信息提取器
 * 基于 window.playback MSE 架构
 */
class IqiyiAdapter {
  constructor() {
    this.platform = 'iqiyi';
    this.domains = ['iqiyi.com'];
  }

  /**
   * 检查是否支持当前页面
   * @returns {boolean}
   */
  isSupported() {
    return this.domains.some(domain => window.location.hostname.includes(domain));
  }

  /**
   * 提取视频信息
   * @returns {Promise<VideoInfo|null>}
   */
  async extract() {
    try {
      // 检查 window.playback 是否存在
      if (!window.playback || !window.playback.msePlayback) {
        console.log('[VideoSaaS-iQIYI] window.playback not found');
        return null;
      }

      const msePlayback = window.playback.msePlayback;

      // 提取 _mvInfo.levelInfoArr
      const mvInfo = msePlayback._mvInfo;
      if (!mvInfo || !mvInfo.levelInfoArr) {
        console.log('[VideoSaaS-iQIYI] _mvInfo.levelInfoArr not found');
        return null;
      }

      // 提取视频信息
      const videoInfo = this.extractVideoInfo(mvInfo);

      if (!videoInfo) {
        return null;
      }

      // 提取播放器信息
      const playerInfo = this.extractPlayerInfo();

      return {
        platform: this.platform,
        ...videoInfo,
        ...playerInfo,
        extractedAt: Date.now()
      };
    } catch (error) {
      console.error('[VideoSaaS-iQIYI] Extract error:', error);
      return null;
    }
  }

  /**
   * 提取视频基本信息
   * @param {Object} mvInfo
   * @returns {Object|null}
   */
  extractVideoInfo(mvInfo) {
    try {
      // 尝试从 levelInfoArr 提取
      const levelInfoArr = mvInfo.levelInfoArr;
      if (!levelInfoArr || !levelInfoArr.length) {
        return null;
      }

      // 获取最高质量的 m3u8
      const bestLevel = levelInfoArr[levelInfoArr.length - 1];
      if (!bestLevel || !bestLevel.m3u8) {
        return null;
      }

      // 提取 tvid 和 vid
      const tvid = mvInfo.tvid || this.extractTvidFromUrl();
      const vid = bestLevel.vid || this.extractVidFromUrl();
      const bid = bestLevel.bid || 500; // 默认 1080p

      return {
        tvid,
        vid,
        bid,
        m3u8: bestLevel.m3u8,
        duration: mvInfo.duration || 0,
        resolution: bestLevel.resolution || '1280x720'
      };
    } catch (error) {
      console.error('[VideoSaaS-iQIYI] extractVideoInfo error:', error);
      return null;
    }
  }

  /**
   * 提取播放器信息
   * @returns {Object}
   */
  extractPlayerInfo() {
    try {
      const player = window.playback;
      return {
        player: player._playerVersion || 'Unknown',
        drmType: player.drmType || '清流',
        algot: player.algot || 'netflix'
      };
    } catch {
      return {
        player: 'Unknown',
        drmType: 'Unknown',
        algot: 'Unknown'
      };
    }
  }

  /**
   * 从 URL 提取 tvid
   * @returns {string}
   */
  extractTvidFromUrl() {
    try {
      const match = window.location.href.match(/tvId=(\d+)/);
      return match ? match[1] : '';
    } catch {
      return '';
    }
  }

  /**
   * 从 URL 提取 vid
   * @returns {string}
   */
  extractVidFromUrl() {
    try {
      const match = window.location.href.match(/vid=([^&]+)/);
      return match ? match[1] : '';
    } catch {
      return '';
    }
  }

  /**
   * 获取所有可用码率
   * @returns {Array<{bid: number, resolution: string, m3u8: string}>}
   */
  getAvailableQualities() {
    try {
      const mvInfo = window.playback?.msePlayback?._mvInfo;
      if (!mvInfo || !mvInfo.levelInfoArr) {
        return [];
      }

      return mvInfo.levelInfoArr.map(level => ({
        bid: level.bid,
        resolution: level.resolution,
        m3u8: level.m3u8
      }));
    } catch {
      return [];
    }
  }

  /**
   * 获取指定码率的 m3u8
   * @param {number} bid - 码率 ID (300/500/800)
   * @returns {string|null}
   */
  getM3u8ByBid(bid) {
    try {
      const mvInfo = window.playback?.msePlayback?._mvInfo;
      if (!mvInfo || !mvInfo.levelInfoArr) {
        return null;
      }

      const level = mvInfo.levelInfoArr.find(l => l.bid === bid);
      return level ? level.m3u8 : null;
    } catch {
      return null;
    }
  }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { IqiyiAdapter };
}
