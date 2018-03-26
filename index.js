/**
 * @module index
 * @license MIT
 * @version 2018/03/26
 */

import bundler from './lib/bundler';
import * as utils from './lib/utils';
import through from '@nuintun/through';
import * as gutil from '@nuintun/gulp-util';

/**
 * @function main
 * @param {Object} options
 */
export default function main(options) {
  options = utils.initOptions(options);

  const cache = options.cache;
  const cacheable = options.combine;

  // Stream
  return through(
    async function(vinyl, encoding, next) {
      vinyl = gutil.VinylFile.wrap(vinyl);

      // Throw error if stream vinyl
      if (vinyl.isStream()) {
        return next(new TypeError('Streaming not supported.'));
      }

      // Return empty vinyl
      if (vinyl.isNull()) {
        return next(null, vinyl);
      }

      // Next
      try {
        next(null, await bundler(vinyl, options));
      } catch (error) {
        next(error);
      }
    },
    function(next) {
      // Clear cache
      cache.clear();

      // Next
      next();
    }
  );
}

// Exports
main.chalk = gutil.chalk;
main.logger = gutil.logger;
