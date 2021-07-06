import { isString, isValue } from './helpers/variableType';

/**
 * Used for style inheritance and style overrides
 */
class StyleContextStack {

	/**
	 * @param {object} styleDictionary named styles dictionary
	 * @param {object} defaultStyle optional default style definition
	 */
	constructor(styleDictionary, defaultStyle = {}) {
		this.styleDictionary = styleDictionary;
		this.defaultStyle = defaultStyle;
		this.styleOverrides = [];
	}

	/**
	 * Creates cloned version of current stack
	 *
	 * @returns {StyleContextStack} current stack snapshot
	 */
	clone() {
		let stack = new StyleContextStack(this.styleDictionary, this.defaultStyle);

		this.styleOverrides.forEach(item => {
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
	 * @param {number} howMany optional number of elements to be popped (if not specified,
	 *                         one element will be removed from the stack)
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
	 * @param {object} item - an object with optional style property and/or style overrides
	 * @returns {number} the number of items pushed onto the stack
	 */
	autopush(item) {
		if (isString(item)) {
			return 0;
		}

		let styleNames = [];

		if (item.style) {
			if (Array.isArray(item.style)) {
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
			'fillOpacity',
			'decoration',
			'decorationStyle',
			'decorationColor',
			'background',
			'lineHeight',
			'characterSpacing',
			'noWrap',
			'markerColor',
			'leadingIndent',
			'sup',
			'sub'
			//'tableCellPadding'
			// 'cellBorder',
			// 'headerCellBorder',
			// 'oddRowCellBorder',
			// 'evenRowCellBorder',
			// 'tableBorder'
		];
		let styleOverrideObject = {};
		let pushStyleOverrideObject = false;

		styleProperties.forEach(key => {
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
	 * @param {object} item - an object with optional style property and/or style overrides
	 * @param {Function} callback to be called between autopush and pop
	 * @returns {object} value returned by callback
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
	 * @param {string} property - property name
	 * @returns {?any} property value or null if not found
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

	/**
	 * @param {object} item
	 * @param {StyleContextStack} styleContextStack
	 * @param {string} property
	 * @param {any} defaultValue
	 * @returns {any}
	 */
	static getStyleProperty(item, styleContextStack, property, defaultValue) {
		let value;

		if (isValue(item[property])) { // item defines this property
			return item[property];
		}

		if (!styleContextStack) {
			return defaultValue;
		}

		styleContextStack.auto(item, () => {
			value = styleContextStack.getProperty(property);
		});

		return isValue(value) ? value : defaultValue;
	}

	/**
	 * @param {object} source
	 * @param {object} destination
	 * @returns {object}
	 */
	static copyStyle(source = {}, destination = {}) {
		// TODO: default style to source

		for (let key in source) {
			if (key != 'text' && source.hasOwnProperty(key)) {
				destination[key] = source[key];
			}
		}

		return destination;
	}

}

export default StyleContextStack;
