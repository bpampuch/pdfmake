var assert = require('assert');

var pdfMake = require('../src/layout.js');
var Line = pdfMake.Line;

describe('Line', function() {
	describe('addInline', function() {
		it('should add inline if there is enough space');
		it('should add first inline even if theres not enough space');
		it('should not add following inlines if theres not enough space');
		it('should trim-left first inline');
		it('should not trim-left next inlines');
		it('should trim-right last inline');
		it('should not trim-right previous inlines');
		it('should set x property for all inlines')
	});

	describe('getWidth', function() {
	});

	describe('getMinWidth', function() {
		it('should return longest inline trimmed width');
	})
})