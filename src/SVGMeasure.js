
class SVGMeasure {
	constructor() {

	}

	getSVGNode(svgString) {
		// remove newlines
		svgString = svgString.replace(/\r?\n|\r/g, "");

		let svgNodeMatches = svgString.match(/<svg(.*?)>/);

		if (svgNodeMatches) {
			// extract svg node <svg ... >
			return svgNodeMatches[0];
		}

		return "";
	}

	getHeightAndWidth(svgString) {
		let svgNode = this.getSVGNode(svgString);

		let widthMatches = svgNode.match(/width="([0-9]+(\.[0-9]+)?)(em|ex|px|in|cm|mm|pt|pc|%)?"/);
		let heightMatches = svgNode.match(/height="([0-9]+(\.[0-9]+)?)(em|ex|px|in|cm|mm|pt|pc|%)?"/);

		if (widthMatches || heightMatches) {
			return {
				width: widthMatches ? +widthMatches[1] : undefined,
				height: heightMatches ? +heightMatches[1] : undefined
			};
		}
	}

	getViewboxHeightAndWidth(svgString) {
		let svgNode = this.getSVGNode(svgString);

		let viewboxMatches = svgNode.match(/viewBox="([+-]?(\d*\.)?\d+(,|\s+|,\s+)[+-]?(\d*\.)?\d+(,|\s+|,\s+)[+-]?(\d*\.)?\d+(,|\s+|,\s+)[+-]?(\d*\.)?\d+)"/);
		if (viewboxMatches) {
			let viewboxStr = viewboxMatches[1];
			let allVieboxEntries = viewboxStr.split(" ");

			let viewboxEntries = []; // weeding out empty strings
			for (let i = 0; i < allVieboxEntries.length; i++) {
				if (allVieboxEntries[i]) {
					viewboxEntries.push(allVieboxEntries[i]);
				}
			}

			if (viewboxEntries.length === 4) {
				return { width: +viewboxEntries[2], height: +viewboxEntries[3] };
			}

			throw new Error("Unexpected svg viewbox format, should have 4 entries but found: '" + viewboxStr + "'");
		}
	}

	measureSVG(svgString) {
		let heightAndWidth = this.getHeightAndWidth(svgString);
		let viewboxHeightAndWidth = this.getViewboxHeightAndWidth(svgString);

		return heightAndWidth || viewboxHeightAndWidth || {};
	}

	writeDimensions(svgString, dimensions) {
		let svgNode = this.getSVGNode(svgString);
		if (svgNode) {
			let nodeDimensions = this.getHeightAndWidth(svgString);

			if (dimensions.width) {
				let newWidth = 'width="' + dimensions.width + '"';

				if (nodeDimensions && nodeDimensions.width) {
					// replace existing width
					svgNode = svgNode.replace(/width="[0-9]+(\.[0-9]+)?(em|ex|px|in|cm|mm|pt|pc|%)?"/, newWidth);
				} else {
					// insert new width
					svgNode = svgNode.replace(">", " " + newWidth + ">");
				}
			}

			if (dimensions.height) {
				let newHeight = 'height="' + dimensions.height + '"';

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
	}
}

export default SVGMeasure;
