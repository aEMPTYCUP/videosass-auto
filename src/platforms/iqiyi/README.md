# iQIYI MSE Blob URL Detector

Detects m3u8 template URLs from iQIYI's MSE-based adaptive streaming player.

## Usage

```js
import { detectIQIYIMSE, snapshotIQIYIMSE } from '@/platforms/iqiyi';

// Async: wait for playback, optionally probe AES-128 metadata.
const video = await detectIQIYIMSE({ withEncryption: true });

// Sync: read what's already available right now.
const snap = snapshotIQIYIMSE();
```

## Contract

```ts
{
  tvid: string,
  vid: string,
  bid: number,   // 码率
  m3u8: string   // m3u8 URL
}
```

## Notes

- Polls `window.playback.msePlayback._mvInfo.levelInfoArr` until available.
- Falls back to `msePlayback._mvInfo.m3u8Url` when a current rendition is set.
- Encryption probing is opt-in (`withEncryption: true`) and fetches each
  variant's m3u8 to look for `#EXT-X-KEY:METHOD=AES-128` directives.
