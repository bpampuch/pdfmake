'use strict';

var assert = require('assert');
var rewire = require("rewire");

var TextTools = rewire('../js/textTools');
var StyleContextStack = require('../js/styleContextStack').default;
var DocPreprocessor = require('../js/docPreprocessor').default;

var sampleTestProvider = {
	provideFont: function (familyName, bold, italics) {
		return {
			widthOfString: function (text, size) {
				return text.length * size * (bold ? 1.5 : 1) * (italics ? 1.1 : 1);
			},
			lineHeight: function (size) {
				return size;
			}
		};
	}
};



var textTools = new TextTools.default(sampleTestProvider);

describe('TextTools', function () {

	var plainTextArrayWithoutNewLines = [
		'Imię: ',
		'Jan   ',
		'   Nazwisko:',
		' Nowak Dodatkowe informacje:'
	];

	var mixedTextArrayWithoutNewLinesNoWrapLongest = [
		'Imię: ',
		'Jan   ',
		'   Nazwisko:',
		{text: ' Nowak Dodatkowe informacje:', noWrap: true}
	];

	var mixedTextArrayWithoutNewLinesNoWrapShortest = [
		'Imię: ',
		{text: 'Jan   ', noWrap: true},
		'   Nazwisko:',
		' Nowak Dodatkowe informacje:'
	];

	var plainTextArrayWithoutNewLinesWhichRequiresTrimming = [
		'                          Imię: ',
		'Jan   ',
		'   Nazwisko:',
		' Nowak Dodatkowe informacje: '
	];

	var textArrayWithNewLines = [
		'This',
		' is a sample\n',
		'text having two lines'
	];

	var textArrayWithNewLinesWhichRequiresTrimming = [
		' This',
		' is a sample  \n',
		'         text having two lines       '
	];

	var textWithLeadingIndent = {
		text:
			'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut porttitor risus sapien, at commodo eros suscipit ' +
			'nec. Pellentesque pretium, justo eleifend pulvinar malesuada, lorem arcu pellentesque ex, ac congue arcu erat ' +
			'id nunc. Morbi facilisis pulvinar nunc, quis laoreet ligula rutrum ut. Mauris at ante imperdiet, vestibulum ' +
			'libero nec, iaculis justo. Mauris aliquam congue ligula vel convallis. Duis iaculis ornare nulla, id finibus ' +
			'sapien commodo quis. Sed semper sagittis urna. Nunc aliquam aliquet placerat. Maecenas ac arcu auctor, ' +
			'bibendum nisl non, bibendum odio. Proin semper lacus faucibus, pretium neque nec, viverra sem. ',
		leadingIndent: 10
	};

	var textWithLeadingSpaces = [
		{text: '    This is a paragraph', preserveLeadingSpaces: true}
	];

	var styleStack = new StyleContextStack({
		header: {
			fontSize: 150,
			font: 'Roboto'
		},
		small: {
			fontSize: 8
		}
	},
		{
			fontSize: 15,
			bold: false,
			font: 'Helvetica'
		});
	var styleStackNoWrap = new StyleContextStack({}, {noWrap: true});

	describe('buildInlines', function () {
		it('should return an object containing a collection of inlines and calculated minWidth/maxWidth', function () {
			var inlines = textTools.buildInlines(plainTextArrayWithoutNewLines);
			assert(inlines.items);
			assert(inlines.minWidth);
			assert(inlines.maxWidth);
		});

		it('should set minWidth to the largest inline width', function () {
			var inlines = textTools.buildInlines(plainTextArrayWithoutNewLines);
			assert.equal(inlines.minWidth, 11 * 12);
		});

		it('should take into account trimming when calculating minWidth', function () {
			var inlines = textTools.buildInlines(plainTextArrayWithoutNewLinesWhichRequiresTrimming);
			assert.equal(inlines.minWidth, 11 * 12);
		});

		it('should set maxWidth to the sum of all widths if there is no trimming and no newlines', function () {
			var inlines = textTools.buildInlines(plainTextArrayWithoutNewLines);
			assert.equal(inlines.maxWidth, 52 * 12);
		});

		it('should take into account trimming when calculating maxWidth', function () {
			var inlines = textTools.buildInlines(plainTextArrayWithoutNewLinesWhichRequiresTrimming);
			assert.equal(inlines.maxWidth, 52 * 12);
		});

		it('should set maxWidth to the width of the largest line if there are new-lines', function () {
			var inlines = textTools.buildInlines(textArrayWithNewLines);
			assert.equal(inlines.maxWidth, 21 * 12);
		});

		it('should take into account trimming at line level when calculating maxWidth', function () {
			var inlines = textTools.buildInlines(textArrayWithNewLinesWhichRequiresTrimming);
			assert.equal(inlines.maxWidth, 21 * 12);
		});

		it('should set min width to max when nowrap style is specified', function () {
			var inlines = textTools.buildInlines(plainTextArrayWithoutNewLines, styleStackNoWrap);
			assert.equal(inlines.minWidth, 52 * 12);
			assert.equal(inlines.maxWidth, 52 * 12);
		});

		it('should set min width to longest when nowrap style is specified on longest segment', function () {
			var inlines = textTools.buildInlines(mixedTextArrayWithoutNewLinesNoWrapLongest);
			assert.equal(inlines.minWidth, 27 * 12);
			assert.equal(inlines.maxWidth, 52 * 12);
		});

		it('should set widths to normal when nowrap style is specified on shortest segment', function () {
			var inlines = textTools.buildInlines(mixedTextArrayWithoutNewLinesNoWrapShortest);
			assert.equal(inlines.minWidth, 11 * 12);
			assert.equal(inlines.maxWidth, 52 * 12);
		});

		it('should set set the leading indent only to the first line of a paragraph', function () {
			var inlines = textTools.buildInlines(textWithLeadingIndent);
			assert.equal(inlines.items[0].leadingCut, -10);
			var countLeadingCut = 0;
			inlines.items.forEach(function (item) {
				countLeadingCut += item.leadingCut;
			});
			assert.equal(countLeadingCut, -10);
		});

		it('should preserve leading whitespaces when preserveLeadingSpaces is set', function () {
			var inlines = textTools.buildInlines(textWithLeadingSpaces);
			assert.equal(inlines.maxWidth, 23 * 12);
		});
	});

	describe('sizeOfString', function () {
		it('should treat tab as 4 spaces', function () {
			var explicitSpaces = textTools.sizeOfString('a    b', styleStack);
			var tab = textTools.sizeOfString('a\tb', styleStack);

			assert.equal(explicitSpaces.width, tab.width);
			assert.equal(explicitSpaces.height, tab.height);
		});
	});
});
