import { processAllExtenstionsByCondition, processFirstExtenstionsByCondition } from './helpers/extensionsRunner';
import { isNumber, isArray, isUndefined } from './helpers/variableType';
import TextInlines from './textInlines';
import StyleContextStack from './styleContextStack';

const getNodeMargin = node => {
	const processSingleMargins = (node, currentMargin) => {
		if (node.marginLeft || node.marginTop || node.marginRight || node.marginBottom) {
			return [
				node.marginLeft || currentMargin[0] || 0,
				node.marginTop || currentMargin[1] || 0,
				node.marginRight || currentMargin[2] || 0,
				node.marginBottom || currentMargin[3] || 0
			];
		}
		return currentMargin;
	};

	const flattenStyleArray = styleArray => {
		let flattenedStyles = {};
		for (let i = styleArray.length - 1; i >= 0; i--) {
			let styleName = styleArray[i];
			let style = self.styleStack.styleDictionary[styleName];
			for (let key in style) {
				if (style.hasOwnProperty(key)) {
					flattenedStyles[key] = style[key];
				}
			}
		}
		return flattenedStyles;
	};

	const convertMargin = margin => {
		if (isNumber(margin)) {
			margin = [margin, margin, margin, margin];
		} else if (isArray(margin)) {
			if (margin.length === 2) {
				margin = [margin[0], margin[1], margin[0], margin[1]];
			}
		}
		return margin;
	};

	let margin = [undefined, undefined, undefined, undefined];

	if (node.style) {
		let styleArray = isArray(node.style) ? node.style : [node.style];
		let flattenedStyleArray = flattenStyleArray(styleArray);

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

	if (isUndefined(margin[0]) && isUndefined(margin[1]) && isUndefined(margin[2]) && isUndefined(margin[3])) {
		return null;
	}

	return margin;
};

const extendMargins = node => {
	let margin = node._margin;

	if (margin) {
		node._minWidth += margin[0] + margin[2];
		node._maxWidth += margin[0] + margin[2];
	}

	return node;
};

class DocMeasurer {

	constructor(fontProvider, styleDictionary, defaultStyle) {
		this.nodeTypes = [];
		this.properties = [];

		this.textInlines = new TextInlines(fontProvider);
		this.styleStack = new StyleContextStack(styleDictionary, defaultStyle);
	}

	registerNodeType(condition, callback) {
		this.nodeTypes.push({
			condition: condition,
			callback: callback
		});
	}

	registerProperty(condition, callback) {
		this.properties.push({
			condition: condition,
			callback: callback
		});
	}

	measureDocument(docStructure) {
		return this.measureNode(docStructure);
	}

	measureNode(node) {
		return this.styleStack.auto(node, () => {
			// TODO: refactor + rethink whether this is the proper way to handle margins
			node._margin = getNodeMargin(node);

			node = processFirstExtenstionsByCondition(this.nodeTypes, node);
			node = processAllExtenstionsByCondition(this.properties, node);

			return extendMargins(node);
		});
	}

}

export default DocMeasurer;
