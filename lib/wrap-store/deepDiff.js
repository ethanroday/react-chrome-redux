"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

exports.default = diffObjects;

var _constants = require("../constants");

var objectConstructor = {}.constructor;
function isObject(o) {
  return (typeof cur === "undefined" ? "undefined" : _typeof(cur)) === "object" && o.constructor === objectConstructor;
}

function diffValues(cur, prev, shouldContinue, context) {
  // If it's a non-object, or if the type is changing, or if it's an array,
  // just go with the current value.
  if (!isObject(cur) || (typeof cur === "undefined" ? "undefined" : _typeof(cur)) !== (typeof prev === "undefined" ? "undefined" : _typeof(prev)) || Array.isArray(cur) || shouldContinue && !shouldContinue(cur, prev, context)) {
    return { type: _constants.DIFF_STATUS_UPDATED, value: cur };
  }
  // If it's an object, compute the differences for each key.
  else {
      return { type: _constants.DIFF_STATUS_KEYS_UPDATED, value: diffObjects(cur, prev, shouldContinue, context) };
    }
}

function diffObjects(cur, prev) {
  var shouldContinue = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;
  var context = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : [];

  var difference = [];

  // For each key in the current state,
  // get the differences in values.
  Object.keys(cur).forEach(function (key) {
    if (prev[key] !== cur[key]) {
      difference.push(_extends({
        key: key
      }, diffValues(cur[key], prev[key], context.concat(key))));
    }
  });

  // For each key previously present,
  // record its deletion.
  Object.keys(prev).forEach(function (key) {
    if (cur[key] === undefined) {
      difference.push({
        key: key, type: _constants.DIFF_STATUS_REMOVED
      });
    }
  });

  return difference;
}