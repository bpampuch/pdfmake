'use strict';
var xml2js = require('xml2js');

function SVGMeasure() {}

var xmlToJson = function (xml) {
	var svg = {};

	xml2js.parseString(xml, {mergeAttrs: true, explicitArray: false}, function (err, json) {
		if (err || !json.svg) {
			throw new Error('Unable to parse SVG')
		}

		svg = json.svg;
	});

	return svg;
};

SVGMeasure.prototype.measureSVG = function (svgString) {

	var svg = xmlToJson(svgString);

	// <svg width="w" height="h">...</svg>
	var svgWidth = svg.width;
	var svgHeight = svg.height;
	if (svgWidth && svgHeight) {
		return {width: svgWidth, height: svgHeight};
	}

	// <svg viewBox="x y w h">...</svg>
	if (svg.viewBox) {
		var viewBoxEntries = svg.viewBox.split(' ');

		var viewBoxWidth = viewBoxEntries[2];
		var viewBoxHeight = viewBoxEntries[3];

		return {width: viewBoxWidth, height: viewBoxHeight}
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
			svgNode = svgNode.replace(/width="[0-9]*"/, 'width="'+dimensions.width+'"')
		}

		if (dimensions.height) {
			svgNode = svgNode.replace(/height="[0-9]*"/, 'height="'+dimensions.height+'"')
		}

		// insert updated svg node
		return svgString.replace(/<svg(.*?)>/, svgNode);
	}

	return svgString;
};

module.exports = SVGMeasure;
