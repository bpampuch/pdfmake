'use strict';

var assert = require('assert');
var SVGMeasure = require('../../js/SVGMeasure').default;

// NOTE: more tests for SVGMeasure in integration/svgs.js

var inputBasic =
	'<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n' +
	'<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">\n' +
	'<svg width="105pt" height="222pt" viewBox="0.00 0.00 105.43 222.00" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">\n' +
	'    <rect width="105" height="222" fill="none" stroke="black"/>\n' +
	'</svg>\n';

var inputWithNewline =
	'<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n' +
	'<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">\n' +
	'<svg width="105pt" height="222pt" viewBox="0.00 0.00 105.43 222.00" xmlns="http://www.w3.org/2000/svg"\n' +
	'    xmlns:xlink="http://www.w3.org/1999/xlink">\n' +
	'    <rect width="105" height="222" fill="none" stroke="black"/>\n' +
	'</svg>\n';

var inputWithComment1 =
	'<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n' +
	'<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">\n' +
	'<!-- <svg -->\n' +
	'<svg width="105pt" height="222pt" viewBox="0.00 0.00 105.43 222.00" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">\n' +
	'    <rect width="105" height="222" fill="none" stroke="black"/>\n' +
	'</svg>\n';

var inputWithComment2 =
	'<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n' +
	'<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">\n' +
	'<!-- <svg width="123" height="456"> -->\n' + // [ evil laughter intensifies ]
	'<svg width="105pt" height="222pt" viewBox="0.00 0.00 105.43 222.00" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">\n' +
	'    <rect width="105" height="222" fill="none" stroke="black"/>\n' +
	'</svg>\n';


describe('SVGMeasure', function () {

	var svgMeasure = new SVGMeasure();

	describe('measureSVG()', function () {

		it('returns correct dimensions for pts', function () {
			var dimensions = svgMeasure.measureSVG(inputBasic);

			assert.equal(typeof dimensions, 'object');
			assert.equal(typeof dimensions.width, 'number');
			assert.equal(typeof dimensions.height, 'number');

			assert.equal(dimensions.width, 105);
			assert.equal(dimensions.height, 222);
		});

		it('correctly handles multi-line svg tags', function () {
			var dimensions = svgMeasure.measureSVG(inputWithNewline);

			assert.equal(typeof dimensions, 'object');
			assert.equal(typeof dimensions.width, 'number');
			assert.equal(typeof dimensions.height, 'number');

			assert.equal(dimensions.width, 105);
			assert.equal(dimensions.height, 222);
		});

		it('ignores "svg tags" in comments (1)', function () {
			var dimensions = svgMeasure.measureSVG(inputWithComment1);

			assert.equal(typeof dimensions, 'object');
			assert.equal(typeof dimensions.width, 'number');
			assert.equal(typeof dimensions.height, 'number');

			assert.equal(dimensions.width, 105);
			assert.equal(dimensions.height, 222);
		});

		it('ignores "svg tags" in comments (2)', function () {
			var dimensions = svgMeasure.measureSVG(inputWithComment2);

			assert.equal(typeof dimensions, 'object');
			assert.equal(typeof dimensions.width, 'number');
			assert.equal(typeof dimensions.height, 'number');

			assert.equal(dimensions.width, 105);
			assert.equal(dimensions.height, 222);
		});
	});

	describe('writeDimensions()', function () {

		var replacementDimensions = {
			width: 1984,
			height: 2001
		};

		it('updates dimensions', function () {
			var updatedSVGString = svgMeasure.writeDimensions(inputBasic, replacementDimensions);
			var updatedDimensions = svgMeasure.measureSVG(updatedSVGString);

			assert.equal(updatedDimensions.width, 1984);
			assert.equal(updatedDimensions.height, 2001);
		});

		it('correctly ignores comments', function () {
			var updatedSVGString = svgMeasure.writeDimensions(inputWithComment2, replacementDimensions);
			var updatedDimensions = svgMeasure.measureSVG(updatedSVGString);

			assert.equal(updatedDimensions.width, 1984);
			assert.equal(updatedDimensions.height, 2001);
		});
	});
});
