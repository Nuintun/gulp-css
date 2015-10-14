/**
 * Created by Newton on 2015/5/10.
 */

'use strict';

var through = require('./through');
var util = require('./util');
var debug = util.debug;
var colors = util.colors;

function concat(){
  var code = [];
  var imports = '';

  return through({ objectMode: true }, function (vinyl, encoding, next){
    // return empty vinyl
    if (vinyl.isNull()) {
      return next(null, vinyl);
    }

    // throw error if stream vinyl
    if (vinyl.isStream()) {
      return next(util.throwError('streaming not supported.'));
    }

    // package
    var pkg = vinyl.package;

    // remote uri
    if (pkg && Array.isArray(pkg.remote)) {
      var current = '';

      pkg.remote.forEach(function (uri){
        // compile remote uri
        current += '@import ' + JSON.stringify(uri) + ';\n';
      });

      imports = current + imports;
    }

    // start concat
    if (isStart(vinyl)) {
      // debug
      debug('concat: %s start', colors.magenta(util.pathFromCwd(vinyl.path)));

      return next();
    }

    // concat
    code.push(vinyl.contents);

    // end concat
    if (isEnd(vinyl)) {
      // has remote imports
      if (imports) {
        code.unshift(new Buffer(imports));
      }

      vinyl.contents = Buffer.concat(code);

      this.push(vinyl);
      // debug
      debug('concat: %s ...ok', colors.magenta(util.pathFromCwd(vinyl.path)));

      code = [];
      imports = '';
    } else {
      // debug
      debug('include: %s', colors.magenta(util.pathFromCwd(vinyl.path)));
    }

    next();
  });
}

function isStart(vinyl){
  return vinyl.startConcat;
}

function isEnd(vinyl){
  return vinyl.endConcat;
}

/**
 * exports module.
 */
module.exports = concat;
