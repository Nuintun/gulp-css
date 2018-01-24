/**
 * @module bundle
 * @license MIT
 * @version 2017/11/13
 */

'use strict';

const gutil = require('@nuintun/gulp-util');
const through = require('@nuintun/through');

/**
 * @function bundle
 * @returns {Stream}
 */
module.exports = function() {
  let code = [];
  let imports = '';

  return through(function(vinyl, encoding, next) {
    // Throw error if stream vinyl
    if (vinyl.isStream()) {
      return next(gutil.throwError('streaming not supported.'));
    }

    // Return empty vinyl
    if (vinyl.isNull()) {
      return next(null, vinyl);
    }

    // Package
    const pkg = vinyl.package;
    const bundle = vinyl.bundle;

    // Remote uri
    if (pkg && Array.isArray(pkg.remote)) {
      let current = '';

      pkg.remote.forEach(uri => {
        // Compile remote uri
        current += `@import ${JSON.stringify(uri)};\n`;
      });

      imports = current + imports;
    }

    // Start bundle
    if (bundle === gutil.BUNDLE_STATE.START) {
      return next();
    }

    // End bundle
    if (bundle === gutil.BUNDLE_STATE.END) {
      // Has remote imports
      if (imports) {
        code.unshift(new Buffer(imports));
      }

      vinyl.contents = Buffer.concat(code);

      // Clean vinyl
      delete vinyl.bundle;

      this.push(vinyl);

      code = [];
      imports = '';

      return next();
    }

    // Concat
    code.push(vinyl.contents);
    next();
  });
};
