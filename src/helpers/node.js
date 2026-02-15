import { isNumber, isString } from './variableType';

function fontStringify(key, val) {
	if (key === 'font') {
		return 'font';
	}
	return val;
}

/**
 * Convert node to readable string
 *
 * @param {object} node
 * @returns {string}
 */
export function stringifyNode(node) {
	return JSON.stringify(node, fontStringify);
}

/**
 * @param {object} node
 * @returns {?string}
 */
export function getNodeId(node) {
	if (node.id) {
		return node.id;
	}

	if (Array.isArray(node.text)) {
		for (let n of node.text) {
			let nodeId = getNodeId(n);
			if (nodeId) {
				return nodeId;
			}
		}
	}

	return null;
}

/**
 * @param {object} node
 * @param {object} styleStack object is instance of PDFDocument
 * @returns {?Array}
 */
export function getNodeMargin(node, styleStack) {

	function processSingleMargins(node, currentMargin, defaultMargin = 0) {
		if (node.marginLeft !== undefined || node.marginTop !== undefined || node.marginRight !== undefined || node.marginBottom !== undefined) {
			return [
				node.marginLeft ?? currentMargin[0] ?? defaultMargin,
				node.marginTop ?? currentMargin[1] ?? defaultMargin,
				node.marginRight ?? currentMargin[2] ?? defaultMargin,
				node.marginBottom ?? currentMargin[3] ?? defaultMargin
			];
		}
		return currentMargin;
	}

	function flattenStyleArray(styleArray, styleStack, visited = new Set()) {
		styleArray = Array.isArray(styleArray) ? styleArray : [styleArray];

		// style is not valid array of strings
		if (!styleArray.every(item => isString(item))) {
			return {};
		}

		let flattenedStyles = {};
		for (let index = 0; index < styleArray.length; index++) {
			let styleName = styleArray[index];
			let style = styleStack.styleDictionary[styleName];

			// style not found
			if (style === undefined) {
				continue;
			}

			if (visited.has(styleName)) {
				continue;
			}

			if (style.extends !== undefined) {
				flattenedStyles = { ...flattenedStyles, ...flattenStyleArray(style.extends, styleStack, new Set([...visited, styleName])) };
			}

			if (style.margin !== undefined) {
				flattenedStyles = { margin: convertMargin(style.margin) };
				continue;
			}

			flattenedStyles = { margin: processSingleMargins(style, flattenedStyles.margin ?? {}, undefined) };
		}

		return flattenedStyles;
	}

	function convertMargin(margin) {
		if (isNumber(margin)) {
			margin = [margin, margin, margin, margin];
		} else if (Array.isArray(margin)) {
			if (margin.length === 2) {
				margin = [margin[0], margin[1], margin[0], margin[1]];
			}
		}
		return margin;
	}

	let margin = [undefined, undefined, undefined, undefined];

	if (node.style) {
		let styleArray = Array.isArray(node.style) ? node.style : [node.style];
		let flattenedStyleArray = flattenStyleArray(styleArray, styleStack);

		if (flattenedStyleArray) {
			margin = processSingleMargins(flattenedStyleArray, margin);
		}

		if (flattenedStyleArray.margin) {
			margin = convertMargin(flattenedStyleArray.margin);
		}
	}

	margin = processSingleMargins(node, margin);

	if (node.margin !== undefined) {
		margin = convertMargin(node.margin);
	}

	if (margin[0] === undefined && margin[1] === undefined && margin[2] === undefined && margin[3] === undefined) {
		return null;
	}

	return margin;
}
