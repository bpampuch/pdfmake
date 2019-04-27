'use strict';

function SVGMeasure() {}

SVGMeasure.prototype.measureSVG = function (svgString) {

	// remove newlines
	svgString = svgString.replace(/\r?\n|\r/g, "");

	var svgNodeMatches = svgString.match(/<svg(.*?)>/);

	if (svgNodeMatches) {
		// extract svg node <svg ... >
		var svgNode = svgNodeMatches[0];

		var widthMatches = svgNode.match(/width="([0-9]*)"/);
		var heightMatches = svgNode.match(/height="([0-9]*)"/);

		if (widthMatches && heightMatches) {
			return {width: widthMatches[1], height: heightMatches[1]};
		}

		var viewboxMatches = svgNode.match(/viewBox="([0-9\s]*)"/);
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
				return {width: viewboxEntries[2], height: viewboxEntries[3]};
			}

			throw new Error("Unexpected svg viewbox format, should have 4 entries but found: '" + viewboxStr + "'");
		}
	}


	return {};
};

SVGMeasure.prototype.writeDimensions = function (svgString, dimensions) {

	// remove newlines
	svgString = svgString.replace(/\r?\n|\r/g, "");

	var svgNodeMatches = svgString.match(/<svg(.*?)>/);

	if (svgNodeMatches) {
		// extract svg node <svg ... >
		var svgNode = svgNodeMatches[0];

		if (dimensions.width) {
			svgNode = svgNode.replace(/width="[0-9]*"/, 'width="' + dimensions.width + '"');
		}

		if (dimensions.height) {
			svgNode = svgNode.replace(/height="[0-9]*"/, 'height="' + dimensions.height + '"');
		}

		// insert updated svg node
		return svgString.replace(/<svg(.*?)>/, svgNode);
	}

	return svgString;
};

module.exports = SVGMeasure;
