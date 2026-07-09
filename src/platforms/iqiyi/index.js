/**
 * iQIYI Platform Module Entry
 */

export {
  IQIYIExtractor,
  iqiyiExtractor,
  default
} from './extractor.js';

export const PLATFORM_INFO = {
  id: 'iqiyi',
  name: 'iQIYI',
  url: 'www.iqiyi.com',
  player: 'Wonder Player v17.064.1',
  version: '1.0.0',
  supportedFeatures: [
    'tvid-extraction',
    'vid-extraction',
    'bid-extraction',
    'duration-extraction',
    'resolution-extraction'
  ]
};
