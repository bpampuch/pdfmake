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

	measureSVG(svgString) {
		let doc = parseSVG(svgString);

		let docWidth = stripUnits(doc.attr.width);
		let docHeight = stripUnits(doc.attr.height);

		if ((docWidth === undefined || docHeight === undefined) && typeof doc.attr.viewBox === 'string') {
			let viewBoxParts = doc.attr.viewBox.split(/[,\s]+/);
			if (viewBoxParts.length !== 4) {
				throw new Error("Unexpected svg viewbox format, should have 4 entries but found: '" + doc.attr.viewBox + "'");
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
	}

	writeDimensions(svgString, dimensions) {
		let doc = parseSVG(svgString);

		doc.attr.width = "" + dimensions.width;
		doc.attr.height = "" + dimensions.height;

		return doc.toString();
	}
}

export default SVGMeasure;
