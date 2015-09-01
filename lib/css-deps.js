/**
 * Created by Newton on 2015/5/9.
 */

'use strict';

var is = require('is');
var css = require('css');

/**
 * get css resource uri
 * @param src
 * @param replace
 * @param options
 * @returns {*}
 */

function cdeps(src, replace, options){
  options = options || {};

  if (Buffer.isBuffer(src)) src = src.toString();

  replace = is.fn(replace) ? replace : undefined;

  if (is.object(replace) && !Array.isArray(replace)) {
    options = replace;
    replace = undefined;
  }

  try {
    var ast = css.parse(src);
  } catch (e) {
    return replace ? src : [];
  }

  var rules = ast.stylesheet.rules;
  var PATHRE = /url\(["']?(.*?)["']?\)/gi;
  var IMPORTRE = /url\(["']?(.*?)["']?\)|['"](.*?)['"]/gi;

  var onpath = options.onpath;
  var prefix = options.prefix;

  if (replace) {
    onpath = is.fn(onpath) ? onpath : undefined;

    if (is.string(onpath)) {
      prefix = onpath;
    } else {
      prefix = is.string(prefix) ? prefix : undefined;
    }
  } else {
    onpath = prefix = undefined;
  }

  // traverse
  function traverse(rules, parent){
    var imports = [];

    // filter rules
    parent.rules = rules.filter(function (rule){
      // if has rules call traverse
      if (rule.rules) {
        imports = imports.concat(traverse(rule.rules, rule));
      } else {
        // delete charset
        if (rule.type === 'charset') {
          return false;
        }

        // process import
        if (rule.type === 'import') {
          var keepImport = true;

          if (IMPORTRE.test(rule.import)) {
            rule.import = rule.import.replace(IMPORTRE, function (){
              var source = arguments[0];
              var src = arguments[1] || arguments[2];

              // collect dependencies
              imports.push(src);

              // replace import
              if (replace) {
                var path = replace(src, rule.type);

                if (is.string(path) && path.trim()) {
                  return source.replace(src, path);
                } else if (path === false) {
                  keepImport = false;
                }

                return source;
              }
            });
          }

          return keepImport;
        }

        // process css resource
        if (onpath && rule.declarations) {
          rule.declarations.forEach(function (declaration){
            if (PATHRE.test(declaration.value)) {
              declaration.value = declaration.value.replace(PATHRE, function (){
                var source = arguments[0];
                var src = arguments[1];
                var path = onpath(src, declaration.property);

                // replace resource path
                if (is.string(path) && path.trim()) {
                  return source.replace(src, path);
                } else {
                  return source;
                }
              });
            }
          });
        }

        // process prefix
        if (prefix && rule.selectors) {
          rule.selectors = rule.selectors.map(function (selector){
            // handle :root selector {}
            if (selector.indexOf(':root') === 0) {
              return selector.replace(':root', ':root ' + prefix);
            }

            return prefix + ' ' + selector;
          });
        }
      }

      return true;
    });

    return imports;
  }

  // get import
  var imports = traverse(rules, ast.stylesheet);

  // if replace is true, return code else all import
  if (replace) {
    return css.stringify(ast, { compress: options.compress, sourcemap: false });
  } else {
    return imports;
  }
}

/**
 * Exports module.
 */

module.exports = cdeps;
