"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

exports.default = patchObject;

var _constants = require("../constants");

function patchObject(obj, patches) {
  // Start with a shallow copy of the object.
  var newObject = _extends({}, obj);
  // Iterate through the patches.
  patches.forEach(function (patch) {
    // If the value is an object whose keys are being updated,
    // then recursively patch the object.
    if (patch.type === _constants.DIFF_STATUS_KEYS_UPDATED) {
      newObject[patch.key] = patchObject(newObject[patch.key], patch.value);
    }
    // If the key has been deleted, delete it.
    else if (patch.type === _constants.DIFF_STATUS_REMOVED) {
        delete newObject[patch.key];
      }
      // If the key has been updated to a new value, update it.
      else if (patch.type === _constants.DIFF_STATUS_UPDATED) {
          newObject[patch.key] = patch.value;
        }
  });
  return newObject;
}