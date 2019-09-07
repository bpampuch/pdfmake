'use strict';

function SVGMeasure() {
}

SVGMeasure.prototype.getSVGNode = function (svgString) {
	// remove newlines
	svgString = svgString.replace(/\r?\n|\r/g, "");

	var svgNodeMatches = svgString.match(/<svg(.*?)>/);

	if (svgNodeMatches) {
		// extract svg node <svg ... >
		return svgNodeMatches[0];
	}

	return "";
};

SVGMeasure.prototype.getHeightAndWidth = function (svgString) {
	var svgNode = this.getSVGNode(svgString);

	var widthMatches = svgNode.match(/width="([0-9]+(\.[0-9]+)?)(em|ex|px|in|cm|mm|pt|pc|%)?"/);
	var heightMatches = svgNode.match(/height="([0-9]+(\.[0-9]+)?)(em|ex|px|in|cm|mm|pt|pc|%)?"/);

	if (widthMatches || heightMatches) {
		return {
			width: widthMatches ? +widthMatches[1] : undefined,
			height: heightMatches ? +heightMatches[1] : undefined
		};
	}
};

SVGMeasure.prototype.getViewboxHeightAndWidth = function (svgString) {
	var svgNode = this.getSVGNode(svgString);

	var viewboxMatches = svgNode.match(/viewBox="([+-]?(\d*\.)?\d+(,|\s+|,\s+)[+-]?(\d*\.)?\d+(,|\s+|,\s+)[+-]?(\d*\.)?\d+(,|\s+|,\s+)[+-]?(\d*\.)?\d+)"/);
	if (viewboxMatches) {
		var viewboxStr = viewboxMatches[1];
		var allVieboxEntries = viewboxStr.split(" ");

		var viewboxEntries = []; // weeding out empty strings
		for (var i = 0; i < allVieboxEntries.length; i++) {
			if (allVieboxEntries[i]) {
				viewboxEntries.push(allVieboxEntries[i]);
			}
		}

		if (viewboxEntries.length === 4) {
			return { width: +viewboxEntries[2], height: +viewboxEntries[3] };
		}

		throw new Error("Unexpected svg viewbox format, should have 4 entries but found: '" + viewboxStr + "'");
	}
};

SVGMeasure.prototype.measureSVG = function (svgString) {

	var heightAndWidth = this.getHeightAndWidth(svgString);
	var viewboxHeightAndWidth = this.getViewboxHeightAndWidth(svgString);

	return heightAndWidth || viewboxHeightAndWidth || {};
};

SVGMeasure.prototype.writeDimensions = function (svgString, dimensions) {

	var svgNode = this.getSVGNode(svgString);

	if (svgNode) {

		var nodeDimensions = this.getHeightAndWidth(svgString);

		if (dimensions.width) {

			var newWidth = 'width="' + dimensions.width + '"';

			if (nodeDimensions && nodeDimensions.width) {
				// replace existing width
				svgNode = svgNode.replace(/width="[0-9]+(\.[0-9]+)?(em|ex|px|in|cm|mm|pt|pc|%)?"/, newWidth);
			} else {
				// insert new width
				svgNode = svgNode.replace(">", " " + newWidth + ">");
			}
		}

		if (dimensions.height) {

			var newHeight = 'height="' + dimensions.height + '"';

			if (nodeDimensions && nodeDimensions.height) {
				// replace existing height
				svgNode = svgNode.replace(/height="[0-9]+(\.[0-9]+)?(em|ex|px|in|cm|mm|pt|pc|%)?"/, newHeight);
			} else {
				// insert new height
				svgNode = svgNode.replace(">", " " + newHeight + ">");
			}
		}

		// insert updated svg node
		return svgString.replace(/<svg(.*?)>/, svgNode);
	}

	return svgString;
};

module.exports = SVGMeasure;
