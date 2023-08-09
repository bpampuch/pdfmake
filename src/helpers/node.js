import { isNumber } from './variableType';

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
	function processSingleMargins(node, currentMargin) {
		if (node.marginLeft || node.marginTop || node.marginRight || node.marginBottom) {
			return [
				node.marginLeft || currentMargin[0] || 0,
				node.marginTop || currentMargin[1] || 0,
				node.marginRight || currentMargin[2] || 0,
				node.marginBottom || currentMargin[3] || 0
			];
		}
		return currentMargin;
	}

	function flattenStyleArray(styleArray, styleStack) {
		let flattenedStyles = {};
		for (let i = styleArray.length - 1; i >= 0; i--) {
			let styleName = styleArray[i];
			let style = styleStack.styleDictionary[styleName];
			for (let key in style) {
				if (style.hasOwnProperty(key)) {
					flattenedStyles[key] = style[key];
				}
			}
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

	if (node.margin) {
		margin = convertMargin(node.margin);
	}

	if (margin[0] === undefined && margin[1] === undefined && margin[2] === undefined && margin[3] === undefined) {
		return null;
	}

	return margin;
}
