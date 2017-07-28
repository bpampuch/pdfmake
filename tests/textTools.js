/* jslint node: true */
'use strict';

var assert = require('assert');

var TextTools = require('../src/textTools');
var StyleContextStack = require('../src/styleContextStack');

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



var textTools = new TextTools(sampleTestProvider);

describe('TextTools', function () {
	var sampleText = 'Przyklad, bez nowych linii,   ale !!!! rozne!!!konstrukcje i ..blablablabla.';
	var sampleText2 = 'Przyklad, z nowy\nmi liniami\n, \n \n  ale\n\n !!!! rozne!!!konstrukcje i ..blablablabla.';

	var plainText = 'Imię: Jan      Nazwisko: Nowak\nDodatkowe informacje:';

	var plainTextArray = [
		'Imię: ',
		'Jan   ',
		'   Nazwisko:',
		' Nowak\nDodatkowe informacje:'
	];

	var mixedTextArray = [
		{text: 'Imię: ', bold: true},
		'Jan   ',
		{text: '   Nazwisko:', bold: true},
		{text: ' Nowak\nDodatkowe informacje:', bold: true}
	];

	var mixedTextArrayWithUnknownStyleDefinitions = [
		{text: 'Imię: ', bold: true},
		'Jan   ',
		{text: '   Nazwisko:', bold: true},
		{text: ' Nowak\nDodatkowe informacje:', bold: true, unknownStyle: 123}
	];

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

	var mixedTextArrayWithVariousTypes = [
		{text: ''},
		{text: null},
		{text: 2016},
		{text: true},
		{text: false},
		'',
		null,
		2016,
		true,
		false
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

	describe('splitWords', function () {
		it('should do basic splitting', function () {
			var result = textTools.splitWords(sampleText);
			assert.equal(result.length, 8);
		});

		it('should not set lineEnd on inlines if there are no new-lines', function () {
			var result = textTools.splitWords(sampleText);

			result.forEach(function (item) {
				assert.notEqual(item.lineEnd, true);
			});
		});

		it('should split into lines if there are new-line chars', function () {
			var result = textTools.splitWords(sampleText2);
			assert.equal(result.length, 14);
		});

		it('should split properly when adjacent newlines appear', function () {
			var result = textTools.splitWords(sampleText2);
			assert.equal(result[9].text.length, 0);
			assert.equal(result[9].lineEnd, true);
		});

		it('should support whitespace-only lines', function () {
			var result = textTools.splitWords(sampleText2);
			assert.equal(result[6].text, ' ');
			assert.equal(result[6].lineEnd, true);
		});

		it('should replace tab with 4 spaces', function () {
			var txt = 'A\ttest';

			assert.equal(txt.length, 6);
			var result = textTools.splitWords(txt);
			assert.equal(result[0].text, 'A    ');
			assert.equal(result[1].text, 'test');
		});

		it('should split ZERO WIDTH SPACE character', function () {
			var result = textTools.splitWords('first line\u200Bsecond line\u200Bthird line');
			assert.equal(result.length, 6);
		});

		it('should split basic Chinese text', function () {
			var result = textTools.splitWords('起来！不愿做奴隶的人们！');
			assert.equal(result.length, 10);
		});

		it('should split Chinese text into lines if there are new-line chars', function () {
			var result = textTools.splitWords('中华民族到了最危险的时候，\n每个人被迫着发出最后的吼声。\n起来！起来！起来！');
			assert.equal(result.length, 31);
		});
	});

	describe('normalizeTextArray', function () {
		it('should support plain strings', function () {
			var result = textTools.normalizeTextArray(plainText, styleStack);
			assert.equal(result.length, 6);
		});

		it('should support plain strings with new-lines', function () {
			var result = textTools.normalizeTextArray(plainText, styleStack);
			assert(result[3].lineEnd);
		});

		it('should support an array of plain strings', function () {
			var result = textTools.normalizeTextArray(plainTextArray, styleStack);
			assert.equal(result.length, 7);
		});

		it('should support an array of plain strings with new-lines', function () {
			var result = textTools.normalizeTextArray(plainTextArray, styleStack);
			assert.equal(result[4].lineEnd, true);
		});

		it('should support arrays with style definition', function () {
			var result = textTools.normalizeTextArray(mixedTextArray, styleStack);
			assert.equal(result.length, 7);
		});

		it('should keep style definitions after splitting new-lines', function () {
			var result = textTools.normalizeTextArray(mixedTextArray, styleStack);
			[0, 2, 3, 4, 5, 6].forEach(function (i) {
				assert.equal(result[i].bold, true);
			});

			assert(!result[1].bold);
		});

		it('should keep unknown style fields after splitting new-lines', function () {
			var result = textTools.normalizeTextArray(mixedTextArrayWithUnknownStyleDefinitions, styleStack);
			assert.equal(result.length, 7);
			assert.equal(result[5].unknownStyle, 123);
			assert.equal(result[6].unknownStyle, 123);
		});

		it('should support cast to text', function () {
			var result = textTools.normalizeTextArray(mixedTextArrayWithVariousTypes, styleStack);
			assert.equal(result.length, 6);
			assert.equal(result[0].text, '2016');
			assert.equal(result[1].text, 'true');
			assert.equal(result[2].text, 'false');
			assert.equal(result[3].text, '2016');
			assert.equal(result[4].text, 'true');
			assert.equal(result[5].text, 'false');
		});

		it('should support keep noWrap from style', function () {
			var result = textTools.normalizeTextArray([{text: 'very long text'}], styleStackNoWrap);
			assert.equal(result.length, 1);
		});

		it('should support disable noWrap in text', function () {
			var result = textTools.normalizeTextArray([{text: 'very long text', noWrap: false}], styleStackNoWrap);
			assert.equal(result.length, 3);
		});

		it('should support enable noWrap in text', function () {
			var result = textTools.normalizeTextArray([{text: 'very long text', noWrap: true}], styleStack);
			assert.equal(result.length, 1);
		});

	});

	describe('measure', function () {
		// width + positioning
		it('should set width', function () {
			var result = textTools.measure(sampleTestProvider, plainTextArray);
			assert.notEqual(result, null);
			assert.notEqual(result.length, 0);
			assert.notEqual(result[0].width, null);
		});

		it('should measure text widths', function () {
			var result = textTools.measure(sampleTestProvider, plainTextArray);
			assert.equal(result[0].width, 72);
			assert.equal(result[2].width, 36);
			assert.equal(result[3].width, 108);
		});

		it('should calculate leading and trailing cuts', function () {
			var result = textTools.measure(sampleTestProvider, plainTextArray);
			assert.equal(result[0].trailingCut, 12);
			assert.equal(result[0].leadingCut, 0);
		});

		it('should set the same value for leading and trailing cuts for whitespace-only strings', function () {
			var result = textTools.measure(sampleTestProvider, plainTextArray);
			assert.equal(result[2].trailingCut, 36);
			assert.equal(result[2].leadingCut, 36);
		});

		it('should set leading and trailing cuts to 0 if texts cannot be trimmed', function () {
			var result = textTools.measure(sampleTestProvider, plainTextArray);
			assert.equal(result[6].trailingCut, 0);
			assert.equal(result[6].leadingCut, 0);
		});

		// styling
		it('should use default style', function () {
			var result = textTools.measure(sampleTestProvider, 'Imię', styleStack);
			assert.equal(result[0].width, 4 * 15);
		});

		it('should use overriden styles from styleStack', function () {
			styleStack.push('header');
			var result = textTools.measure(sampleTestProvider, 'Imię', styleStack);
			assert.equal(result[0].width, 4 * 150);
			styleStack.pop();
		});

		it('should support style overrides at text definition level', function () {
			var result = textTools.measure(sampleTestProvider, [{text: 'Imię', fontSize: 20}], styleStack);
			assert.equal(result[0].width, 4 * 20);
		});

		it('should support named styles at text definition level', function () {
			var result = textTools.measure(sampleTestProvider, [{text: 'Imię', style: 'header'}], styleStack);
			assert.equal(result[0].width, 4 * 150);
		});

		it('should support multiple named styles at text definition level', function () {
			var result = textTools.measure(sampleTestProvider, [{text: 'Imię', style: ['header', 'small']}], styleStack);
			assert.equal(result[0].width, 4 * 8);
		});

		it('should obey named styles order', function () {
			var result = textTools.measure(sampleTestProvider, [{text: 'Imię', style: ['header', 'small']}], styleStack);
			assert.equal(result[0].width, 4 * 8);

			result = textTools.measure(sampleTestProvider, [{text: 'Imię', style: ['small', 'header']}], styleStack);
			assert.equal(result[0].width, 4 * 150);
		});

		it('should not take values from named styles if style-overrides have been providede', function () {
			var result = textTools.measure(sampleTestProvider, [{text: 'Imię', fontSize: 123, style: 'header'}], styleStack);
			assert.equal(result[0].width, 4 * 123);
		});
	});

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
