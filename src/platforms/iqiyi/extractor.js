/**
 * iQIYI Video Information Extractor
 *
 * Extracts video metadata from iQIYI pages using Wonder Player v17.064.1
 * Based on VDH×VDP reverse analysis report 3.4-3.7
 *
 * @module platforms/iqiyi/extractor
 */

import { Logger } from '../../utils/logger.js';

const logger = new Logger('IQIYI-Extractor');

/**
 * iQIYI Video Info Extractor class
 */
export class IQIYIExtractor {
  constructor() {
    this.platform = 'iqiyi';
    this.playerPattern = /Wonder Player v([\d.]+)/i;
    this.tvidPattern = /['"]tvid['"]\s*[:=]\s*['"]?(\d+)['"]?/i;
    this.vidPattern = /['"]vid['"]\s*[:=]\s*['"]?([a-f0-9]+)['"]?/i;
    this.bidPattern = /['"]bid['"]\s*[:=]\s*['"]?(\d+)['"]?/i;
    this.durationPattern = /['"]duration['"]\s*[:=]\s*(\d+)/i;
    this.resolutionPattern = /(\d{3,4})\s*[x×*]\s*(\d{3,4})/i;
  }

  /**
   * Extract complete video information from page
   * @param {Document|HTMLElement|String} source - Source page DOM or HTML string
   * @returns {Object|null} Video information object
   */
  extract(source) {
    try {
      const html = this._normalizeSource(source);

      const player = this._extractPlayer(html);
      if (!this._validatePlayer(player)) {
        logger.warn('Player version mismatch, expected Wonder Player v17.064.1');
        return null;
      }

      const tvid = this._extractTvid(html);
      const vid = this._extractVid(html);
      const bid = this._extractBid(html);
      const duration = this._extractDuration(html);
      const resolution = this._extractResolution(html);

      if (!tvid || !vid) {
        logger.error('Failed to extract tvid or vid');
        return null;
      }

      return {
        tvid,
        vid,
        bid: bid || 500,
        player: player || 'Wonder Player v17.064.1',
        duration: duration || 0,
        resolution: resolution || this._inferResolution(bid),
        platform: this.platform,
        extractedAt: Date.now()
      };
    } catch (error) {
      logger.error(`Extraction failed: ${error.message}`);
      return null;
    }
  }

  /**
   * Normalize source to HTML string
   * @private
   */
  _normalizeSource(source) {
    if (typeof source === 'string') {
      return source;
    }

    if (source instanceof HTMLElement || source instanceof Document) {
      return source.documentElement?.outerHTML || source.outerHTML || '';
    }

    if (source && typeof source === 'object') {
      return source.html || source.content || '';
    }

    return '';
  }

  /**
   * Validate player version
   * @private
   */
  _validatePlayer(player) {
    if (!player) return false;
    return /Wonder Player v17\.\d+\.\d+/.test(player);
  }

  /**
   * Extract player version string
   * @private
   */
  _extractPlayer(html) {
    const match = html.match(this.playerPattern);
    if (match) {
      return `Wonder Player v${match[1]}`;
    }

    const playerConfigMatch = html.match(/playerVersion['"]\s*[:=]\s*['"]([^'"]+)['"]/i);
    if (playerConfigMatch) {
      return playerConfigMatch[1];
    }

    const scriptMatch = this._extractFromScripts(html, /Wonder Player v[\d.]+/i);
    if (scriptMatch) {
      return scriptMatch[0];
    }

    return null;
  }

  /**
   * Extract tvid (TV ID)
   * @private
   */
  _extractTvid(html) {
    const patterns = [
      /window\.tvid\s*=\s*['"]?(\d+)['"]?/i,
      /['"]tvid['"]\s*:\s*['"]?(\d{10,})['"]?/i,
      /tvId\s*=\s*['"]?(\d+)['"]?/i,
      /data-tvid\s*=\s*['"](\d+)['"]/i
    ];

    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match) {
        return match[1];
      }
    }

    return this._extractFromScripts(html, /tvid[\s:='"]+(\d{10,})/i);
  }

  /**
   * Extract vid (Video ID)
   * @private
   */
  _extractVid(html) {
    const patterns = [
      /window\.vid\s*=\s*['"]?([a-f0-9]+)['"]?/i,
      /['"]vid['"]\s*:\s*['"]?([a-f0-9]{32})['"]?/i,
      /videoId\s*=\s*['"]?([a-f0-9]+)['"]?/i,
      /data-vid\s*=\s*['"]([a-f0-9]+)['"]/i
    ];

    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match) {
        return match[1];
      }
    }

    return this._extractFromScripts(html, /vid[\s:='"]+([a-f0-9]{32})/i);
  }

  /**
   * Extract bid (Bitrate/Quality ID)
   * @private
   */
  _extractBid(html) {
    const patterns = [
      /['"]bid['"]\s*:\s*['"]?(\d+)['"]?/i,
      /window\.bid\s*=\s*['"]?(\d+)['"]?/i,
      /currentBid\s*[:=]\s*['"]?(\d+)['"]?/i
    ];

    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match) {
        return parseInt(match[1], 10);
      }
    }

    return null;
  }

  /**
   * Extract video duration in milliseconds
   * @private
   */
  _extractDuration(html) {
    const patterns = [
      /['"]duration['"]\s*:\s*(\d+)/i,
      /window\.duration\s*=\s*(\d+)/i,
      /videoLength\s*[:=]\s*(\d+)/i
    ];

    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match) {
        const value = parseInt(match[1], 10);
        // Convert seconds to milliseconds if needed
        return value < 100000 ? value * 1000 : value;
      }
    }

    return null;
  }

  /**
   * Extract video resolution
   * @private
   */
  _extractResolution(html) {
    const patterns = [
      /['"]resolution['"]\s*:\s*['"](\d{3,4}[x×*]\d{3,4})['"]/i,
      /['"]videoSize['"]\s*:\s*['"](\d{3,4}[x×*]\d{3,4})['"]/i,
      /(\d{3,4})\s*[x×*]\s*(\d{3,4})/i
    ];

    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match) {
        if (match.length === 3) {
          return `${match[1]}x${match[2]}`;
        }
        return match[1].replace(/[×*]/g, 'x');
      }
    }

    return null;
  }

  /**
   * Infer resolution from bid value
   * @private
   */
  _inferResolution(bid) {
    const bidResolutionMap = {
      10: '320x180',
      20: '480x270',
      30: '640x360',
      50: '854x480',
      80: '1280x536',
      100: '1920x800',
      300: '1280x536',
      500: '1280x536',
      600: '1920x800',
      800: '1920x800',
      1000: '1920x1080',
      1200: '1920x1080'
    };

    return bidResolutionMap[bid] || '1280x536';
  }

  /**
   * Extract pattern from script tags
   * @private
   */
  _extractFromScripts(html, pattern) {
    const scriptRegex = /<script[^>]*>([\s\S]*?)<\/script>/gi;
    let match;

    while ((match = scriptRegex.exec(html)) !== null) {
      const scriptContent = match[1];
      const result = scriptContent.match(pattern);
      if (result) {
        return result[1] || result[0];
      }
    }

    return null;
  }

  /**
   * Extract from runtime page (for browser environment)
   * @returns {Promise<Object>}
   */
  async extractFromRuntime() {
    try {
      const config = window?.__NEXT_DATA__?.props?.pageProps
        || window?.initialState
        || window?.playerObject
        || null;

      if (!config) {
        logger.warn('No runtime config available');
        return null;
      }

      return {
        tvid: config.tvid || config.tvId,
        vid: config.vid || config.videoId,
        bid: config.bid || 500,
        player: `Wonder Player v${config.playerVersion || '17.064.1'}`,
        duration: (config.duration || 0) * 1000,
        resolution: config.resolution || this._inferResolution(config.bid || 500),
        platform: this.platform,
        extractedAt: Date.now()
      };
    } catch (error) {
      logger.error(`Runtime extraction failed: ${error.message}`);
      return null;
    }
  }
}

/**
 * Default singleton instance
 */
export const iqiyiExtractor = new IQIYIExtractor();

export default IQIYIExtractor;
