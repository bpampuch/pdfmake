import { isString, isArray, isValue } from './helpers/variableType'

/**
 * Class for style inheritance and style overrides
 */
class StyleContextStack {

	/**
	 * @param {object} styleDictionary named styles dictionary
	 * @param {object} defaultStyle optional default style definition
	 */
	constructor(styleDictionary, defaultStyle = {}) {
		this.defaultStyle = defaultStyle;
		this.styleDictionary = styleDictionary;
		this.styleOverrides = [];
	}

	/**
	 * Creates cloned version of current stack
	 *
	 * @return {StyleContextStack} current stack snapshot
	 */
	clone() {
		let stack = new StyleContextStack(this.styleDictionary, this.defaultStyle);

		this.styleOverrides.forEach((item) => {
			stack.styleOverrides.push(item);
		});

		return stack;
	}

	/**
	 * Pushes style-name or style-overrides-object onto the stack for future evaluation
	 *
	 * @param {string|object} styleNameOrOverride style-name (referring to styleDictionary) or
	 *                                            a new dictionary defining overriding properties
	 */
	push(styleNameOrOverride) {
		this.styleOverrides.push(styleNameOrOverride);
	}

	/**
	 * Removes last style-name or style-overrides-object from the stack
	 *
	 * @param {Number} howMany - optional number of elements to be popped (if not specified,
	 *                           one element will be removed from the stack)
	 */
	pop(howMany = 1) {
		while (howMany-- > 0) {
			this.styleOverrides.pop();
		}
	}

	/**
	 * Creates a set of named styles or/and a style-overrides-object based on the item,
	 * pushes those elements onto the stack for future evaluation and returns the number
	 * of elements pushed, so they can be easily poped then.
	 *
	 * @param {Object} item - an object with optional style property and/or style overrides
	 * @return the number of items pushed onto the stack
	 */
	autopush(item) {
		if (isString(item)) {
			return 0;
		}

		let styleNames = [];

		if (item.style) {
			if (isArray(item.style)) {
				styleNames = item.style;
			} else {
				styleNames = [item.style];
			}
		}

		for (let i = 0, l = styleNames.length; i < l; i++) {
			this.push(styleNames[i]);
		}

		let styleProperties = [
			'font',
			'fontSize',
			'fontFeatures',
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
		];
		let styleOverrideObject = {};
		let pushStyleOverrideObject = false;

		styleProperties.forEach((key) => {
			if (isValue(item[key])) {
				styleOverrideObject[key] = item[key];
				pushStyleOverrideObject = true;
			}
		});

		if (pushStyleOverrideObject) {
			this.push(styleOverrideObject);
		}

		return styleNames.length + (pushStyleOverrideObject ? 1 : 0);
	}

	/**
	 * Automatically pushes elements onto the stack, using autopush based on item,
	 * executes callback and then pops elements back. Returns value returned by callback
	 *
	 * @param  {Object}   item - an object with optional style property and/or style overrides
	 * @param  {Function} function to be called between autopush and pop
	 * @return {Object} value returned by callback
	 */
	auto(item, callback) {
		let pushedItems = this.autopush(item);
		let result = callback();

		if (pushedItems > 0) {
			this.pop(pushedItems);
		}

		return result;
	}

	/**
	 * Evaluates stack and returns value of a named property
	 *
	 * @param {String} property - property name
	 * @return property value or null if not found
	 */
	getProperty(property) {
		if (this.styleOverrides) {
			for (let i = this.styleOverrides.length - 1; i >= 0; i--) {
				let item = this.styleOverrides[i];

				if (isString(item)) { // named-style-override
					let style = this.styleDictionary[item];
					if (style && isValue(style[property])) {
						return style[property];
					}
				} else if (isValue(item[property])) { // style-overrides-object
					return item[property];
				}
			}
		}

		return this.defaultStyle && this.defaultStyle[property];
	}

}

export default StyleContextStack;
