/**
 * Created by nuintun on 2015/4/27.
 */

'use strict';

var hash = require('./hash');
var cache = require('./cache');
var extname = require('path').extname;
var plugins = require('./plugins/');
var util = require('./util');
var debug = util.debug;

function transport(vinyl, options){
  if (options.cache) {
    // set hash
    vinyl.hash = hash(vinyl.stat);
    // get cache
    var cached = cache.get(vinyl);

    // if not cached, parse vinyl
    if (cached === null) {
      vinyl = parse(vinyl, options);

      // cache vinyl
      cache.set(vinyl);
    } else {
      // debug
      debug('read file from cache: %s', colors.magenta(pathFromCwd(vinyl.path)));

      vinyl = cached;
    }
  } else {
    vinyl = parse(vinyl, options);
  }

  return vinyl;
}

function parse(vinyl, options){
  var ext = extname(vinyl.path);
  var plugin = plugins[ext.substring(1)] || plugins.other;

  // parse vinyl
  return plugin(vinyl, options);
}

/**
 * exports module.
 */
module.exports = transport;
