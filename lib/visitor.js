/**
 * @module visitor
 * @license MIT
 * @version 2018/01/23
 */

'use strict';

const fs = require('fs');
const utils = require('./utils');
const gutil = require('@nuintun/gulp-util');

/**
 * @class Visitor
 */
class Visitor {
  /**
   * @constructor
   * @param {Object} options
   */
  constructor(options) {
    this.options = options;
    this.cache = new Map();
  }

  /**
   * @private
   * @method visitDependency
   * @param {Vinyl} vinyl
   * @param {Function} progress
   * @param {Function} done
   */
  visitDependency(vinyl, progress, done) {
    const cache = this.cache;
    const pkg = vinyl.package;
    const state = cache.get(vinyl.path);

    /**
     * @function flush
     * @description Include current file and flush state
     */
    const flush = () => {
      // Call progress
      if (!state.included) {
        // Change cache state
        state.next = null;
        state.included = true;

        progress(vinyl);
      }

      const parent = state.parent;

      // All file include
      if (parent === null || parent.next === null) {
        cache.clear();

        return done();
      }

      // Clean parent
      state.parent = null;

      // Run parent next dependencies
      parent.next();
    };

    // Bootstrap
    if (state.included || !pkg) {
      flush();
    } else {
      /**
       * @function transform
       * @description Transport dependence file
       * @param {Object} module
       * @param {Function} next
       */
      const transform = (module, next) => {
        const path = module.path;

        // Already transport
        if (cache.has(path)) return next();

        // Create a vinyl file
        vinylFile(path, gutil.cwd, vinyl.base)
          .then(dependency => {
            // Debug
            utils.debug('include: %r', dependency.path);

            // Transport file
            utils
              .transport(dependency, this.options)
              .then(dependency => {
                // Cache next
                state.next = next;

                // Add cache state
                cache.set(dependency.path, {
                  next: null,
                  parent: state,
                  included: false
                });

                // Visit dependency
                this.visitDependency(dependency, progress, done);
              })
              .catch(error => {
                utils.print(gutil.chalk.reset.red.bold(gutil.inspectError(error)) + '\x07');
              });
          })
          .catch(error => {
            utils.print(
              'module: %s in %s is %s',
              gutil.chalk.reset.yellow.bold(module.id),
              gutil.chalk.reset.yellow.bold(gutil.pathFromCwd(vinyl.path)),
              error.code
            );

            next();
          });
      };

      gutil.async.series(pkg.include, transform, flush);
    }
  }

  /**
   * @public
   * @method traverse
   * @param {Vinyl} vinyl
   * @param {Function} progress
   * @param {Function} done
   */
  traverse(vinyl, progress, done) {
    const cache = this.cache;
    const pkg = vinyl.package;
    const options = this.options;
    let include = options.include;

    include = gutil.isFunction(include) ? include(pkg.id || null, vinyl.path) : include;

    // Return if not include
    if (include !== true) {
      progress(vinyl);

      cache.clear();

      return done();
    }

    // Set cache
    cache.set(vinyl.path, {
      next: null,
      parent: null,
      included: false
    });

    // Visit dependency
    this.visitDependency(vinyl, progress, done);
  }
}

/**
 * @function vinylFile
 * @description Create a new vinyl
 * @param {string} path
 * @param {string} cwd
 * @param {string} base
 * @returns {Promise}
 */
function vinylFile(path, cwd, base) {
  return new Promise((resolve, reject) => {
    // Read file stat
    fs.stat(path, (error, stat) => {
      if (error) return reject(error);

      // Read file
      fs.readFile(path, (error, data) => {
        if (error) return reject(error);

        resolve(
          new gutil.Vinyl({
            path: path,
            cwd: cwd,
            base: base,
            stat: stat,
            contents: data
          })
        );
      });
    });
  });
}

module.exports = Visitor;
