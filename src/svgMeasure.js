'use strict';

function SVGMeasure() {
}

SVGMeasure.prototype.getSVGNode = function (svgString) {
	if (typeof svgString !== 'string') {
		return { nodeText: "" };
	}

	var idx = 0;
	var tagStart = -1;

	while (idx < svgString.length) {
		var nextSVGTagMaybe = svgString.indexOf('<svg', idx);
		var nextCommentMaybe = svgString.indexOf('<!--', idx);

		if (nextSVGTagMaybe === -1) {
			// Missing :(
			break;
		}

		if (nextCommentMaybe === -1 || nextCommentMaybe > nextSVGTagMaybe) {
			// Found!
			tagStart = nextSVGTagMaybe;
			break;
		}

		// Advance to end of comment, continue search
		var commentEnd = svgString.indexOf('-->', nextCommentMaybe);
		if (commentEnd === -1) {
			throw new Error('SVGMeasure: malformed SVG document');
		}

		idx = commentEnd + 3;
	}

	if (tagStart === -1) {
		return { nodeText: "" }; // No <svg> tag found
	}

	var tagEnd = svgString.indexOf('>', tagStart);

	if (tagEnd === -1) {
		throw new Error('SVGMeasure: malformed SVG document');
	}

	tagEnd++; // Since the '>' is part of the tag

	var nodeText = svgString.substr(tagStart, tagEnd - tagStart);

	return {
		nodeText: nodeText,
		startPos: tagStart,
		endPos: tagEnd
	};
}

SVGMeasure.prototype.getHeightAndWidth = function (svgString) {
	var svgNode = this.getSVGNode(svgString).nodeText;

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
	var svgNode = this.getSVGNode(svgString).nodeText;

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

	var nodeDetails = this.getSVGNode(svgString);
	var svgNode = nodeDetails.nodeText;

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
		return (svgString.substr(0,nodeDetails.startPos) + svgNode + svgString.substr(nodeDetails.endPos));
	}

	return svgString;
};

module.exports = SVGMeasure;
