/*!
 * transform
 * Version: 0.0.1
 * Date: 2017/05/19
 * https://github.com/nuintun/gulp-css
 *
 * This is licensed under the MIT License (MIT).
 * For details, see: https://github.com/nuintun/gulp-css/blob/master/LICENSE
 */

'use strict';

var fs = require('fs');
var path = require('path');
var util = require('./util');
var through = require('@nuintun/through');
var gutil = require('@nuintun/gulp-util');

var relative = path.relative;

/**
 * transform
 *
 * @param options
 * @returns {Stream}
 */
module.exports = function(options) {
  var configure = util.initOptions(options);

  // debug
  util.debug('cwd: %p', gutil.normalize(gutil.cwd));

  // stream
  return through(function(vinyl, encoding, next) {
    vinyl = gutil.wrapVinyl(vinyl);

    // throw error if stream vinyl
    if (vinyl.isStream()) {
      return next(gutil.throwError('streaming not supported.'));
    }

    // return empty vinyl
    if (vinyl.isNull()) {
      return next(null, vinyl);
    }

    // stream
    var stream = this;
    var path = gutil.pathFromCwd(vinyl.path);

    // clone options
    options = gutil.extend(true, {}, configure);

    // lock wwwroot
    gutil.readonlyProperty(options, 'wwwroot');
    // lock plugins
    gutil.readonlyProperty(options, 'plugins');

    // transport
    util.transport(vinyl, options, function(error, vinyl, options) {
      // show error message
      if (error) {
        util.print(gutil.colors.reset.red.bold(gutil.inspectError(error)) + '\x07');
      }

      var pool = {};
      var pkg = vinyl.package;
      var start = gutil.blankVinyl(vinyl);
      var end = gutil.blankVinyl(vinyl);

      // set start and end file status
      start.concat = gutil.CONCAT_STATUS.START;
      end.concat = gutil.CONCAT_STATUS.END;

      // compute include
      options.include = gutil.isFunction(options.include)
        ? options.include(pkg.id || null, vinyl.path)
        : options.include;

      // debug
      util.debug('concat: %p start', path);
      // push start blank vinyl
      stream.push(start);
      // include dependencies files
      includeDeps.call(stream, vinyl, pool, options, function() {
        // push end blank vinyl
        stream.push(end);

        // free memory
        pool = null;

        // debug
        util.debug('concat: %p ...ok', path);
        next();
      });
    });
  });
};

/**
 * create a new vinyl
 *
 * @param path
 * @param cwd
 * @param base
 * @param done
 * @param error
 * @returns {void}
 */
function vinylFile(path, cwd, base, done, error) {
  // read file
  fs.stat(path, function(err, stat) {
    if (err) return error(err);

    fs.readFile(path, function(err, data) {
      if (err) return error(err);

      done(new gutil.Vinyl({
        path: path,
        cwd: cwd,
        base: base,
        stat: stat,
        contents: data
      }));
    });
  });
}

/**
 * walk file
 *
 * @param vinyl
 * @param pool
 * @param options
 * @param done
 * @returns {void}
 */
function walk(vinyl, pool, options, done) {
  var stream = this;
  var status = pool[vinyl.path];

  /**
   * transport dependence file
   *
   * @param module
   * @param next
   * @returns {void}
   */
  function transform(module, next) {
    var path = module.path;

    // already transport
    if (pool[path]) return next();

    // create a vinyl file
    vinylFile(path, gutil.cwd, vinyl.base, function(child) {
      // debug
      util.debug('include: %r', child.path);
      // transport file
      util.transport(child, options, function(error, child, options) {
        // show error message
        if (error) {
          util.print(gutil.colors.reset.red.bold(gutil.inspectError(error)) + '\x07');
        }

        // cache next
        status.next = next;
        // add cache status
        pool[child.path] = {
          next: null,
          parent: status,
          included: false
        };

        // walk
        walk.call(stream, child, pool, options, done);
      });
    }, function(error) {
      util.print(
        'module: %s in %s is %s',
        gutil.colors.reset.yellow.bold(src),
        gutil.colors.reset.yellow.bold(gutil.pathFromCwd(vinyl.path)),
        error.code
      );

      next();
    });
  }

  /**
   * include current file and flush status
   *
   * @returns {void}
   */
  function flush() {
    // push file to stream
    if (!status.included) {
      stream.push(vinyl);

      // change cache status
      status.next = null;
      status.included = true;
    }

    var parent = status.parent;

    // all file include
    if (parent === null || parent.next === null) {
      done();
    } else {
      // run parent next dependencies
      parent.next();

      // clean parent
      delete status.parent;
    }
  }

  var pkg = vinyl.package;

  // bootstrap
  if (status.included || !pkg) {
    flush();
  } else {
    gutil.async.series(pkg.include, transform, flush);
  }
}

/**
 * include dependencies file
 *
 * @param vinyl
 * @param pool
 * @param options
 * @param done
 * @returns {void}
 */
function includeDeps(vinyl, pool, options, done) {
  // return if include not equal 'all' and 'relative'
  if (!options.include) {
    // push file to stream
    this.push(vinyl);

    // free memory
    pool = null;

    // callback
    return done();
  }

  // set pool cache
  pool[vinyl.path] = {
    next: null,
    parent: null,
    included: false
  };

  // bootstrap
  walk.call(this, vinyl, pool, options, function() {
    // free memory
    pool = null;

    // callback
    done();
  });
}
