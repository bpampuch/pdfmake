'use strict';

var isString = require('./helpers').isString;
var isArray = require('./helpers').isArray;
var isUndefined = require('./helpers').isUndefined;
var isNull = require('./helpers').isNull;

/**
 * Creates an instance of StyleContextStack used for style inheritance and style overrides
 *
 * @constructor
 * @this {StyleContextStack}
 * @param {Object} named styles dictionary
 * @param {Object} optional default style definition
 */
function StyleContextStack(styleDictionary, defaultStyle) {
	this.defaultStyle = defaultStyle || {};
	this.styleDictionary = styleDictionary;
	this.styleOverrides = [];
}

/**
 * Creates cloned version of current stack
 * @return {StyleContextStack} current stack snapshot
 */
StyleContextStack.prototype.clone = function () {
	var stack = new StyleContextStack(this.styleDictionary, this.defaultStyle);

	this.styleOverrides.forEach(function (item) {
		stack.styleOverrides.push(item);
	});

	return stack;
};

/**
 * Pushes style-name or style-overrides-object onto the stack for future evaluation
 *
 * @param {String|Object} styleNameOrOverride style-name (referring to styleDictionary) or
 *                                            a new dictionary defining overriding properties
 */
StyleContextStack.prototype.push = function (styleNameOrOverride) {
	this.styleOverrides.push(styleNameOrOverride);
};

/**
 * Removes last style-name or style-overrides-object from the stack
 *
 * @param {Number} howMany - optional number of elements to be popped (if not specified,
 *                           one element will be removed from the stack)
 */
StyleContextStack.prototype.pop = function (howMany) {
	howMany = howMany || 1;

	while (howMany-- > 0) {
		this.styleOverrides.pop();
	}
};

/**
 * Creates a set of named styles or/and a style-overrides-object based on the item,
 * pushes those elements onto the stack for future evaluation and returns the number
 * of elements pushed, so they can be easily poped then.
 *
 * @param {Object} item - an object with optional style property and/or style overrides
 * @return the number of items pushed onto the stack
 */
StyleContextStack.prototype.autopush = function (item) {
	if (isString(item)) {
		return 0;
	}

	var styleNames = [];

	if (item.style) {
		if (isArray(item.style)) {
			styleNames = item.style;
		} else {
			styleNames = [item.style];
		}
	}

	for (var i = 0, l = styleNames.length; i < l; i++) {
		this.push(styleNames[i]);
	}

	// rather than spend significant time making a styleOverrideObject, just add item
	this.push(item);
	return styleNames.length + 1;
};

/**
 * Automatically pushes elements onto the stack, using autopush based on item,
 * executes callback and then pops elements back. Returns value returned by callback
 *
 * @param  {Object}   item - an object with optional style property and/or style overrides
 * @param  {Function} function to be called between autopush and pop
 * @return {Object} value returned by callback
 */
StyleContextStack.prototype.auto = function (item, callback) {
	var pushedItems = this.autopush(item);
	var result = callback();

	if (pushedItems > 0) {
		this.pop(pushedItems);
	}

	return result;
};

/**
 * Evaluates stack and returns value of a named property
 *
 * @param {String} property - property name
 * @return property value or null if not found
 */
StyleContextStack.prototype.getProperty = function (property) {
	if (this.styleOverrides) {
		for (var i = this.styleOverrides.length - 1; i >= 0; i--) {
			var item = this.styleOverrides[i];

			if (isString(item)) {
				// named-style-override
				var style = this.styleDictionary[item];
				if (style && !isUndefined(style[property]) && !isNull(style[property])) {
					return style[property];
				}
			} else if (!isUndefined(item[property]) && !isNull(item[property])) {
				// style-overrides-object
				return item[property];
			}
		}
	}

	return this.defaultStyle && this.defaultStyle[property];
};

module.exports = StyleContextStack;
