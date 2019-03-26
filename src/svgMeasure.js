'use strict';
var xml2js = require('xml2js');

function SVGMeasure() {}

SVGMeasure.prototype.measureSVG = function (src) {

	var result = {};

	xml2js.parseString(src, {mergeAttrs: true, explicitArray: false}, function (err, svgJson) {
		if (err || !svgJson.svg) {
			throw new Error('Unable to parse SVG')
		}

		// <svg width="w" height="h">...</svg>
		var svgWidth = svgJson.svg.width;
		var svgHeight = svgJson.svg.height;
		if (svgWidth && svgHeight) {
			result = {width: svgWidth, height: svgHeight};
		}

		// <svg viewBox="x y w h">...</svg>
		if (svgJson.svg.viewBox) {
			var viewBoxEntries = svgJson.svg.viewBox.split(' ');

			var viewBoxWidth = viewBoxEntries[2];
			var viewBoxHeight = viewBoxEntries[3];

			result = {width: viewBoxWidth, height: viewBoxHeight}
		}

	});


	return result;
};

module.exports = SVGMeasure;
