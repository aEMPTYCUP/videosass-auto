/**
 * VideoSaaS HLS m3u8 Parser
 * 基于 VDP core.js 的 m3u8-parser v7.2.0 实现
 *
 * @author Codex Bot
 * @date 2026-07-09
 */

/**
 * Line Stream - 将字符串分割为行
 */
class LineStream {
  constructor() {
    this.buffer = '';
  }

  push(data) {
    this.buffer += data;
    const lines = this.buffer.split('\n');
    this.buffer = lines.pop() || '';
    return lines;
  }

  end() {
    if (this.buffer) {
      const line = this.buffer;
      this.buffer = '';
      return [line];
    }
    return [];
  }
}

/**
 * Parse Stream - 解析 m3u8 行
 */
class ParseStream {
  constructor() {
    this.listeners = {};
  }

  on(event, handler) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(handler);
  }

  emit(event, data) {
    const handlers = this.listeners[event] || [];
    handlers.forEach(handler => handler(data));
  }
}

/**
 * M3u8 Parser
 */
class M3u8Parser {
  constructor(options = {}) {
    this.options = options;
    this.lineStream = new LineStream();
    this.parseStream = new ParseStream();
    this.lineStream.pipe = (other) => {
      this.lineStream.on = (event, handler) => other.on(event, handler);
    };
    this.lineStream.on = (event, handler) => this.parseStream.on(event, handler);

    // 解析状态
    this.currentSegment = null;
    this.segments = [];
    this.mediaGroups = { AUDIO: {}, VIDEO: {}, SUBTITLES: {}, CLOSED-CAPTIONS: {} };
    this.contentProtection = {};
    this.version = 3;
    this.targetDuration = 0;
    this.allowCache = true;
    this.endList = false;
    this.discontinuitySequence = 0;
    this.timeline = 0;

    // 初始化管道
    this.lineStream.pipe(this.parseStream);
  }

  /**
   * 解析 m3u8 文本
   * @param {string} data
   */
  push(data) {
    const lines = this.lineStream.push(data);
    lines.forEach(line => this.parseLine(line));
  }

  end() {
    const lines = this.lineStream.end();
    lines.forEach(line => this.parseLine(line));
    this.parseStream.emit('done', { segments: this.segments });
  }

  /**
   * 解析单行
   * @param {string} line
   */
  parseLine(line) {
    line = line.trim();
    if (!line || line.startsWith('#EXTM3U')) return;

    if (line.startsWith('#EXTINF')) {
      this.parseExtINF(line);
    } else if (line.startsWith('#EXT-X-TARGETDURATION')) {
      this.targetDuration = parseInt(line.split(':')[1], 10);
      this.parseStream.emit('targetduration', this.targetDuration);
    } else if (line.startsWith('#EXT-X-VERSION')) {
      this.version = parseInt(line.split(':')[1], 10);
    } else if (line.startsWith('#EXT-X-ALLOW-CACHE')) {
      this.allowCache = line.includes('YES');
    } else if (line.startsWith('#EXT-X-ENDLIST')) {
      this.endList = true;
      this.parseStream.emit('endlist', true);
    } else if (line.startsWith('#EXT-X-DISCONTINUITY')) {
      this.parseDiscontinuity(line);
    } else if (line.startsWith('#EXT-X-KEY')) {
      this.parseKey(line);
    } else if (line.startsWith('#EXT-X-MAP')) {
      this.parseMap(line);
    } else if (line.startsWith('#EXT-X-MEDIA-SEQUENCE')) {
      // 忽略
    } else if (line.startsWith('#EXT-X-PART-INF')) {
      // 忽略
    } else if (line.startsWith('#EXT-X-PART')) {
      this.parsePart(line);
    } else if (line.startsWith('#EXT-X-PROGRAM-DATE-TIME')) {
      // 忽略
    } else if (line.startsWith('#EXT-X-DATERANGE')) {
      // 忽略
    } else if (line.startsWith('#EXT-X-CONTENT-STEERING')) {
      // 忽略
    } else if (line.startsWith('#EXT-X-STREAM-INF')) {
      this.parseStreamInf(line);
    } else if (line.startsWith('#EXT-X-MEDIA')) {
      this.parseMedia(line);
    } else if (line.startsWith('#EXT-X-')) {
      // 忽略其他 EXT-X 标签
    } else if (!line.startsWith('#')) {
      // 实际的 URL
      this.parseUrl(line);
    }
  }

  parseExtINF(line) {
    const parts = line.split(':');
    const durationStr = parts[1].split(',')[0];
    const duration = parseFloat(durationStr);
    this.currentSegment = {
      uri: '',
      duration,
      timeline: this.timeline,
      discontinuity: false,
      key: null,
      map: null
    };
    this.parseStream.emit('segment', this.currentSegment);
  }

  parseDiscontinuity(line) {
    const sequence = line.split(':')[1];
    this.discontinuitySequence = parseInt(sequence, 10);
    this.timeline = this.discontinuitySequence;
    if (this.currentSegment) {
      this.currentSegment.discontinuity = true;
    }
  }

  parseKey(line) {
    const attrs = this.parseAttributes(line.split(':')[1]);
    if (attrs.METHOD === 'NONE') {
      if (this.currentSegment) {
        this.currentSegment.key = null;
      }
    } else if (attrs.METHOD === 'AES-128') {
      const key = {
        method: 'AES-128',
        uri: attrs.URI ? attrs.URI.replace(/"/g, '') : null,
        iv: attrs.IV ? attrs.IV : null
      };
      if (this.currentSegment) {
        this.currentSegment.key = key;
      }
    }
    this.parseStream.emit('key', { method: attrs.METHOD, uri: attrs.URI, iv: attrs.IV });
  }

  parseMap(line) {
    const attrs = this.parseAttributes(line.split(':')[1]);
    const map = {
      uri: attrs.URI ? attrs.URI.replace(/"/g, '') : '',
      byterange: attrs.BYTERANGE || null
    };
    if (this.currentSegment) {
      this.currentSegment.map = map;
    }
    this.parseStream.emit('map', map);
  }

  parsePart(line) {
    // 低延迟 HLS 分片
    const attrs = this.parseAttributes(line.split(':')[1]);
    const part = {
      uri: attrs.URI ? attrs.URI.replace(/"/g, '') : '',
      duration: parseFloat(attrs.DURATION),
      byterange: attrs.BYTERANGE || null
    };
    this.parseStream.emit('part', part);
  }

  parseStreamInf(line) {
    const attrs = this.parseAttributes(line.split(':')[1]);
    this.parseStream.emit('streaminf', attrs);
  }

  parseMedia(line) {
    const attrs = this.parseAttributes(line.split(':')[1]);
    const type = attrs.TYPE;
    const groupId = attrs.GROUP_ID;

    if (!this.mediaGroups[type]) {
      this.mediaGroups[type] = {};
    }
    this.mediaGroups[type][groupId] = attrs;
    this.parseStream.emit('media', attrs);
  }

  parseUrl(url) {
    if (this.currentSegment) {
      this.currentSegment.uri = url;
      this.segments.push(this.currentSegment);
      this.parseStream.emit('segment', this.currentSegment);
      this.currentSegment = null;
    }
  }

  parseAttributes(attrString) {
    const attrs = {};
    const regex = /([A-Z-]+)=(?:"([^"]*)"|([^",\s]+))/g;
    let match;
    while ((match = regex.exec(attrString)) !== null) {
      const key = match[1];
      const value = match[2] || match[3];
      attrs[key] = value;
    }
    return attrs;
  }

  /**
   * 解析 m3u8 文本（便捷方法）
   * @param {string} m3u8Text
   * @returns {Object}
   */
  static parse(m3u8Text) {
    const parser = new M3u8Parser();
    parser.push(m3u8Text);
    parser.end();
    return {
      allowCache: parser.allowCache,
      endList: parser.endList,
      segments: parser.segments,
      mediaGroups: parser.mediaGroups,
      targetDuration: parser.targetDuration,
      version: parser.version
    };
  }
}

/**
 * 判断是否为 VOD（点播）
 * @param {Object} parsed - M3u8Parser.parse() 返回结果
 * @returns {boolean}
 */
function isVod(parsed) {
  return parsed.endList === true;
}

/**
 * 判断是否为 Live（直播）
 * @param {Object} parsed
 * @returns {boolean}
 */
function isLive(parsed) {
  return parsed.endList === false;
}

/**
 * 提取所有 segment URL
 * @param {Object} parsed
 * @returns {string[]}
 */
function extractSegmentUrls(parsed) {
  return parsed.segments.map(seg => seg.uri).filter(Boolean);
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    M3u8Parser,
    LineStream,
    ParseStream,
    isVod,
    isLive,
    extractSegmentUrls
  };
}
