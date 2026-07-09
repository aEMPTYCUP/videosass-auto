/**
 * iQIYI MSE Blob URL Detector
 *
 * Detects m3u8 template URLs from iQIYI's MSE-based adaptive streaming.
 * Based on VDH×VDP reverse engineering analysis (Phase 2).
 *
 * iQIYI uses Netflix-style adaptive streaming where Blob URLs are created
 * via MSE SourceBuffer. The playback info is exposed via window.playback.
 */

const POLL_INTERVAL_MS = 1000;
const POLL_TIMEOUT_MS = 30000;
const ENCRYPTION_METHODS = {
  AES_128: 'AES-128',
  AES_128_CTR: 'AES-128-CTR',
  SAMPLE_AES: 'SAMPLE-AES',
};

/**
 * Wait for window.playback.msePlayback to be available.
 *
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Promise<object|null>} The msePlayback instance or null on timeout
 */
function waitForMSEPlayback(timeout = POLL_TIMEOUT_MS) {
  return new Promise((resolve) => {
    const start = Date.now();

    const check = () => {
      try {
        if (window.playback && window.playback.msePlayback) {
          resolve(window.playback.msePlayback);
          return;
        }
      } catch (e) {
        // window.playback might throw on access, ignore
      }

      if (Date.now() - start >= timeout) {
        resolve(null);
        return;
      }

      setTimeout(check, POLL_INTERVAL_MS);
    };

    check();
  });
}

/**
 * Extract level info array from msePlayback._mvInfo.
 *
 * @param {object} msePlayback
 * @returns {Array} levelInfoArr
 */
function extractLevelInfo(msePlayback) {
  if (!msePlayback || !msePlayback._mvInfo) return [];

  const mvInfo = msePlayback._mvInfo;
  const levelInfoArr = mvInfo.levelInfoArr;

  if (!Array.isArray(levelInfoArr) || levelInfoArr.length === 0) return [];

  return levelInfoArr;
}

/**
 * Convert a single level entry to a normalized video info object.
 *
 * @param {object} level
 * @returns {object|null}
 */
function normalizeLevel(level) {
  if (!level) return null;

  const m3u8 = level.m3u8 || level.m3u8Url || level.templateUrl || level.url;
  if (!m3u8) return null;

  return {
    bid: level.bid || level.bitrate || level.code || 0,
    m3u8,
    width: level.width || 0,
    height: level.height || 0,
    bitrate: level.bitrate || level.bid || 0,
    codec: level.codec || level.videoCodec || '',
    encryption: level.encryption || level.encryptionMethod || null,
    keyUri: level.keyUri || level.keyUriTemplate || null,
    iv: level.iv || null,
  };
}

/**
 * Detect AES-128 encryption markers in m3u8 content.
 *
 * @param {string} m3u8Content
 * @returns {object|null}
 */
function detectEncryption(m3u8Content) {
  if (!m3u8Content || typeof m3u8Content !== 'string') return null;

  const extKeyMatch = m3u8Content.match(
    /#EXT-X-KEY:METHOD=([^,]+)(?:,URI="([^"]+)")?(?:,IV=([^,\s]+))?/
  );

  if (!extKeyMatch) return null;

  const method = extKeyMatch[1];
  if (method !== ENCRYPTION_METHODS.AES_128 && method !== ENCRYPTION_METHODS.AES_128_CTR) {
    return null;
  }

  return {
    method,
    keyUri: extKeyMatch[2] || null,
    iv: extKeyMatch[3] || null,
  };
}

/**
 * Fetch m3u8 content (if accessible) to detect encryption metadata.
 *
 * @param {string} m3u8Url
 * @returns {Promise<string|null>}
 */
async function fetchM3U8Content(m3u8Url) {
  if (!m3u8Url) return null;

  try {
    const response = await fetch(m3u8Url, {
      credentials: 'include',
      headers: { Accept: 'application/vnd.apple.mpegurl' },
    });
    if (!response.ok) return null;
    return await response.text();
  } catch (e) {
    return null;
  }
}

/**
 * Extract tvid / vid identifiers from various locations on window.playback.
 *
 * @returns {object}
 */
function extractVideoIds() {
  const tvidCandidates = [
    window.tvid,
    window.__INITIAL_STATE__?.tvid,
    window.playback?._mvInfo?.tvid,
    window.playback?.tvid,
  ];

  const vidCandidates = [
    window.vid,
    window.__INITIAL_STATE__?.vid,
    window.playback?._mvInfo?.vid,
    window.playback?.vid,
  ];

  const tvid = tvidCandidates.find((v) => typeof v === 'string' && v.length > 0) || '';
  const vid = vidCandidates.find((v) => typeof v === 'string' && v.length > 0) || '';

  return { tvid: String(tvid), vid: String(vid) };
}

/**
 * Normalize and order levels by bitrate (descending).
 *
 * @param {Array} rawLevels
 * @returns {Array}
 */
function rankLevels(rawLevels) {
  const normalized = rawLevels.map(normalizeLevel).filter(Boolean);

  normalized.sort((a, b) => {
    const ba = Number(a.bid) || 0;
    const bb = Number(b.bid) || 0;
    return bb - ba;
  });

  return normalized;
}

/**
 * Resolve a selected bid -> m3u8 mapping from playback state.
 *
 * @param {object} msePlayback
 * @returns {object|null}
 */
function resolveCurrentSelection(msePlayback) {
  try {
    const mvInfo = msePlayback?._mvInfo;
    if (!mvInfo) return null;

    const currentBid = mvInfo.curBid || mvInfo.bid || mvInfo.selectedBid;
    const currentUrl =
      mvInfo.m3u8Url || mvInfo.m3u8 || mvInfo.templateUrl || mvInfo.url;

    if (!currentUrl) return null;

    return {
      bid: Number(currentBid) || 0,
      m3u8: currentUrl,
    };
  } catch (e) {
    return null;
  }
}

/**
 * Build the final video info payload conforming to the acceptance contract.
 *
 * @param {object} args
 * @returns {object}
 */
function buildVideoInfo({ tvid, vid, bid, m3u8 }) {
  return {
    tvid: String(tvid || ''),
    vid: String(vid || ''),
    bid: Number(bid) || 0,
    m3u8: String(m3u8 || ''),
  };
}

/**
 * Main detection routine.
 *
 * Returns an array of candidate video info objects (one per rendition), or
 * a single object if a current selection can be resolved.
 *
 * @param {object} [options]
 * @param {boolean} [options.withEncryption=false] - Probe each m3u8 for AES-128
 * @returns {Promise<Array<object>|object|null>}
 */
async function detectIQIYIMSE(options = {}) {
  const { withEncryption = false } = options;

  const msePlayback = await waitForMSEPlayback();
  if (!msePlayback) return null;

  const rawLevels = extractLevelInfo(msePlayback);
  if (rawLevels.length === 0) return null;

  const ranked = rankLevels(rawLevels);
  const ids = extractVideoIds();
  const current = resolveCurrentSelection(msePlayback);

  // Best-effort encryption probing (only if explicitly requested).
  if (withEncryption) {
    await Promise.all(
      ranked.map(async (lvl) => {
        const content = await fetchM3U8Content(lvl.m3u8);
        if (content) {
          const enc = detectEncryption(content);
          if (enc) {
            lvl.encryption = enc.method;
            lvl.keyUri = enc.keyUri || lvl.keyUri;
            lvl.iv = enc.iv || lvl.iv;
          }
        }
      })
    );
  }

  if (current && current.m3u8) {
    return buildVideoInfo({
      tvid: ids.tvid,
      vid: ids.vid,
      bid: current.bid,
      m3u8: current.m3u8,
    });
  }

  return ranked.map((lvl) =>
    buildVideoInfo({
      tvid: ids.tvid,
      vid: ids.vid,
      bid: lvl.bid,
      m3u8: lvl.m3u8,
    })
  );
}

/**
 * Lightweight synchronous snapshot for runtime tooling/UI hooks.
 *
 * @returns {object|null}
 */
function snapshotIQIYIMSE() {
  try {
    if (!window.playback || !window.playback.msePlayback) return null;

    const rawLevels = extractLevelInfo(window.playback.msePlayback);
    if (rawLevels.length === 0) return null;

    const ranked = rankLevels(rawLevels);
    const ids = extractVideoIds();
    const current = resolveCurrentSelection(window.playback.msePlayback);

    if (current && current.m3u8) {
      return buildVideoInfo({
        tvid: ids.tvid,
        vid: ids.vid,
        bid: current.bid,
        m3u8: current.m3u8,
      });
    }

    return ranked.map((lvl) =>
      buildVideoInfo({
        tvid: ids.tvid,
        vid: ids.vid,
        bid: lvl.bid,
        m3u8: lvl.m3u8,
      })
    );
  } catch (e) {
    return null;
  }
}

const IQIYIMSEDetector = {
  detect: detectIQIYIMSE,
  snapshot: snapshotIQIYIMSE,
  waitForMSEPlayback,
  extractLevelInfo,
  detectEncryption,
  fetchM3U8Content,
  ENCRYPTION_METHODS,
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = IQIYIMSEDetector;
}

if (typeof window !== 'undefined') {
  window.IQIYIMSEDetector = IQIYIMSEDetector;
}

export {
  detectIQIYIMSE,
  snapshotIQIYIMSE,
  waitForMSEPlayback,
  extractLevelInfo,
  detectEncryption,
  fetchM3U8Content,
  ENCRYPTION_METHODS,
};
