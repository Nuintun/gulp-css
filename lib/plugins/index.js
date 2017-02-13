/**
 * Created by nuintun on 2015/5/13.
 */

'use strict';

var Plugin = require('../plugin');

// default plugins
var defaults = {
  css: require('./css'),
  other: require('./other')
};

/**
 * plugins
 * @param plugins
 * @returns {*|{}}
 */
module.exports = function(plugins) {
  var name;
  var plugin;

  plugins = plugins || {};

  for (name in plugins) {
    if (plugins.hasOwnProperty(name)) {
      plugin = plugins[name];
      plugins[name] = new Plugin(name, plugin);
    }
  }

  for (name in defaults) {
    if (defaults.hasOwnProperty(name)) {
      plugins[name] = plugins[name] || defaults[name];
    }
  }

  return plugins;
};
module.exports.defaults = defaults;
