'use strict';

var xmldoc = require('xmldoc');

/** Strip unit postfix, parse number, but return undefined instead of NaN for bad input */
function stripUnits(textVal) {
	var n = parseFloat(textVal);
	if (typeof n !== 'number' || isNaN(n)) {
		return undefined;
	}
	return n;
}

/** Make sure it's valid XML and the root tage is <svg/>, returns xmldoc DOM */
function parseSVG(svgString) {
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
}

function SVGMeasure() {
}

SVGMeasure.prototype.measureSVG = function (svgString) {

	var doc = parseSVG(svgString);

	var docWidth = stripUnits(doc.attr.width);
	var docHeight = stripUnits(doc.attr.height);

	if ((docWidth == undefined || docHeight == undefined) && typeof doc.attr.viewBox == 'string') {
		var viewBoxParts = doc.attr.viewBox.split(/[,\s]+/);
		if (viewBoxParts.length !== 4) {
			throw new Error("Unexpected svg viewbox format, should have 4 entries but found: '" + doc.attr.viewBox + "'");
		}
		if (docWidth == undefined) {
			docWidth = stripUnits(viewBoxParts[2]);
		}
		if (docHeight == undefined) {
			docHeight = stripUnits(viewBoxParts[3]);
		}
	}

	return {
		width: docWidth,
		height: docHeight
	};
};

SVGMeasure.prototype.writeDimensions = function (svgString, dimensions) {

	var doc = parseSVG(svgString);

	doc.attr.width = "" + dimensions.width;
	doc.attr.height = "" + dimensions.height;

	return doc.toString();
};

module.exports = SVGMeasure;
