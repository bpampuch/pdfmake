import xmldoc from 'xmldoc';

/**
 * Strip unit postfix, parse number, but return undefined instead of NaN for bad input
 *
 * @param {string} textVal
 * @returns {?number}
 */
const stripUnits = textVal => {
	var n = parseFloat(textVal);
	if (typeof n !== 'number' || isNaN(n)) {
		return undefined;
	}
	return n;
};

const extractWidthAndHeight = (widthAttributeValue, heightAttributeValue, viewBoxAttributeValue) => {
	let docWidth = stripUnits(widthAttributeValue);
	let docHeight = stripUnits(heightAttributeValue);

	if ((docWidth === undefined || docHeight === undefined) && typeof viewBoxAttributeValue === 'string') {
		let viewBoxParts = viewBoxAttributeValue.split(/[,\s]+/);
		if (viewBoxParts.length !== 4) {
			throw new Error("Unexpected svg viewbox format, should have 4 entries but found: '" + viewBoxAttributeValue + "'");
		}
		if (docWidth === undefined) {
			docWidth = stripUnits(viewBoxParts[2]);
		}
		if (docHeight === undefined) {
			docHeight = stripUnits(viewBoxParts[3]);
		}
	}

	return {
		width: docWidth,
		height: docHeight
	};
};

/**
 * Make sure it's valid XML and the root tage is <svg/>, returns xmldoc DOM
 *
 * @param {string} svgString
 * @returns {object}
 */
const parseSVG = (svgString) => {
	var doc;

	try {
		doc = new xmldoc.XmlDocument(svgString);
	} catch (err) {
		throw new Error('SVGMeasure: ' + err);
	}

	if (doc.name !== "svg") {
		throw new Error('SVGMeasure: expected <svg> document');
	}

	return doc;
};

class SVGMeasure {
	constructor() {

	}




	measureSVG(svgElementOrString) {
		let width, height, viewBox;
		if (typeof(svgElementOrString) === "string") {
			let doc = parseSVG(svgElementOrString);
			width = doc.attr.width;
			height = doc.attr.height;
			viewBox = doc.attr.viewBox;
		} else {
			width = svgElementOrString.getAttribute("width");
			height = svgElementOrString.getAttribute("height");
			viewBox = svgElementOrString.getAttribute("viewBox");
		}
		return extractWidthAndHeight(width, height, viewBox);
	}

	writeDimensions(svgElementOrString, dimensions) {
		if (typeof svgElementOrString === "string") {
			let doc = parseSVG(svgElementOrString);

			doc.attr.width = "" + dimensions.width;
			doc.attr.height = "" + dimensions.height;

			return doc.toString();
		} else {
			svgElementOrString.setAttribute("width", "" + dimensions.width);
			svgElementOrString.setAttribute("height", "" + dimensions.height);
			return svgElementOrString;
		}

	}
}

export default SVGMeasure;
