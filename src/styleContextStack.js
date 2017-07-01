/* jslint node: true */
'use strict';

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
	if (typeof item === 'string' || item instanceof String) {
		return 0;
	}

	var styleNames = [];

	if (item.style) {
		if (Array.isArray(item.style)) {
			styleNames = item.style;
		} else {
			styleNames = [item.style];
		}
	}

	for (var i = 0, l = styleNames.length; i < l; i++) {
		this.push(styleNames[i]);
	}

	var styleOverrideObject = {};
	var pushSOO = false;

	[
		'font',
		'fontSize',
		'bold',
		'italics',
		'alignment',
		'color',
		'columnGap',
		'fillColor',
		'decoration',
		'decorationStyle',
		'decorationColor',
		'background',
		'lineHeight',
		'characterSpacing',
		'noWrap',
		'markerColor',
		'leadingIndent'
			//'tableCellPadding'
			// 'cellBorder',
			// 'headerCellBorder',
			// 'oddRowCellBorder',
			// 'evenRowCellBorder',
			// 'tableBorder'
	].forEach(function (key) {
		if (item[key] !== undefined && item[key] !== null) {
			styleOverrideObject[key] = item[key];
			pushSOO = true;
		}
	});

	if (pushSOO) {
		this.push(styleOverrideObject);
	}

	return styleNames.length + (pushSOO ? 1 : 0);
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

			if (typeof item === 'string' || item instanceof String) {
				// named-style-override

				var style = this.styleDictionary[item];
				if (style && style[property] !== null && style[property] !== undefined) {
					return style[property];
				}
			} else {
				// style-overrides-object
				if (item[property] !== undefined && item[property] !== null) {
					return item[property];
				}
			}
		}
	}

	return this.defaultStyle && this.defaultStyle[property];
};

module.exports = StyleContextStack;
