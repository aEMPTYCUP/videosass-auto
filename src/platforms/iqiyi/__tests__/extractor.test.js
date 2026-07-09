/**
 * iQIYI Extractor Tests
 */

import { describe, it, expect } from 'vitest';
import { IQIYIExtractor } from '../extractor.js';

describe('IQIYIExtractor', () => {
  const extractor = new IQIYIExtractor();

  const sampleHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <script>
        window.tvid = '6310337914711300';
        window.vid = '26d43d0353a333fca43d6de6f2423b96';
        window.bid = 500;
        window.duration = 2609;
        var playerVersion = "Wonder Player v17.064.1";
      </script>
    </head>
    <body>
      <div data-resolution="1280x536"></div>
    </body>
    </html>
  `;

  it('should extract all video information', () => {
    const result = extractor.extract(sampleHtml);

    expect(result).not.toBeNull();
    expect(result.tvid).toBe('6310337914711300');
    expect(result.vid).toBe('26d43d0353a333fca43d6de6f2423b96');
    expect(result.bid).toBe(500);
    expect(result.player).toBe('Wonder Player v17.064.1');
    expect(result.duration).toBe(2609000);
    expect(result.resolution).toBe('1280x536');
    expect(result.platform).toBe('iqiyi');
  });

  it('should return null for invalid player', () => {
    const invalidHtml = '<html><script>playerVersion="Other Player";</script></html>';
    const result = extractor.extract(invalidHtml);
    expect(result).toBeNull();
  });

  it('should infer resolution from bid when not provided', () => {
    const html = `
      <script>
        window.tvid = '6310337914711300';
        window.vid = '26d43d0353a333fca43d6de6f2423b96';
        window.bid = 1000;
        playerVersion = "Wonder Player v17.064.1";
      </script>
    `;
    const result = extractor.extract(html);
    expect(result.resolution).toBe('1920x1080');
  });

  it('should handle null source gracefully', () => {
    const result = extractor.extract(null);
    expect(result).toBeNull();
  });

  it('should convert seconds to milliseconds for duration', () => {
    const html = `
      <script>
        window.tvid = '6310337914711300';
        window.vid = '26d43d0353a333fca43d6de6f2423b96';
        window.duration = 100;
        playerVersion = "Wonder Player v17.064.1";
      </script>
    `;
    const result = extractor.extract(html);
    expect(result.duration).toBe(100000);
  });
});
