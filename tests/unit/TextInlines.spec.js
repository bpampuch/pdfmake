const assert = require('assert');

const TextInlines = require('../../js/TextInlines').default;
const StyleContextStack = require('../../js/StyleContextStack').default;

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

var textInlines = new TextInlines(sampleTestProvider);

describe('TextInlines', function () {

	var plainTextArray = [
		'Imię: ',
		'Jan   ',
		'   Nazwisko:',
		' Nowak\nDodatkowe informacje:'
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
		{ text: ' Nowak Dodatkowe informacje:', noWrap: true }
	];

	var mixedTextArrayWithoutNewLinesNoWrapShortest = [
		'Imię: ',
		{ text: 'Jan   ', noWrap: true },
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
		{ text: '    This is a paragraph', preserveLeadingSpaces: true }
	];

	var textWithTrailingSpaces = [
		{ text: 'This is a paragraph    ', preserveTrailingSpaces: true }
	];

	var textWithLeadingAndTrailingSpaces = [
		{ text: '    This is a paragraph    ', preserveLeadingSpaces: true, preserveTrailingSpaces: true }
	];

	var styleStack = new StyleContextStack(
		{
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
		}
	);

	var styleStackNoWrap = new StyleContextStack({}, { noWrap: true });

	describe('buildInlines', function () {

		describe('width and positioning', function () {

			it('should set width', function () {
				var result = textInlines.buildInlines(plainTextArray);
				assert.notEqual(result, null);
				assert.notEqual(result.items, null);
				assert.notEqual(result.items.length, 0);
				assert.notEqual(result.items[0].width, null);
			});

			it('should measure text widths', function () {
				var result = textInlines.buildInlines(plainTextArray);
				assert.equal(result.items[0].width, 72);
				assert.equal(result.items[2].width, 36);
				assert.equal(result.items[3].width, 108);
			});

			it('should calculate leading and trailing cuts', function () {
				var result = textInlines.buildInlines(plainTextArray);
				assert.equal(result.items[0].trailingCut, 12);
				assert.equal(result.items[0].leadingCut, 0);
			});

			it('should set the same value for leading and trailing cuts for whitespace-only strings', function () {
				var result = textInlines.buildInlines(plainTextArray);
				assert.equal(result.items[2].trailingCut, 36);
				assert.equal(result.items[2].leadingCut, 36);
			});

			it('should set leading and trailing cuts to 0 if texts cannot be trimmed', function () {
				var result = textInlines.buildInlines(plainTextArray);
				assert.equal(result.items[7].trailingCut, 0);
				assert.equal(result.items[7].leadingCut, 0);
			});

		});

		describe('styling', function () {
			it('should use default style', function () {
				var result = textInlines.buildInlines('Imię', styleStack);
				assert.equal(result.items[0].width, 4 * 15);
			});

			it('should use overriden styles from styleStack', function () {
				styleStack.push('header');
				var result = textInlines.buildInlines('Imię', styleStack);
				assert.equal(result.items[0].width, 4 * 150);
				styleStack.pop();
			});

			it('should support style overrides at text definition level', function () {
				var result = textInlines.buildInlines([{ text: 'Imię', fontSize: 20 }], styleStack);
				assert.equal(result.items[0].width, 4 * 20);
			});

			it('should support named styles at text definition level', function () {
				var result = textInlines.buildInlines([{ text: 'Imię', style: 'header' }], styleStack);
				assert.equal(result.items[0].width, 4 * 150);
			});

			it('should support multiple named styles at text definition level', function () {
				var result = textInlines.buildInlines([{ text: 'Imię', style: ['header', 'small'] }], styleStack);
				assert.equal(result.items[0].width, 4 * 8);
			});

			it('should obey named styles order', function () {
				var result = textInlines.buildInlines([{ text: 'Imię', style: ['header', 'small'] }], styleStack);
				assert.equal(result.items[0].width, 4 * 8);

				result = textInlines.buildInlines([{ text: 'Imię', style: ['small', 'header'] }], styleStack);
				assert.equal(result.items[0].width, 4 * 150);
			});

			it('should not take values from named styles if style-overrides have been providede', function () {
				var result = textInlines.buildInlines([{ text: 'Imię', fontSize: 123, style: 'header' }], styleStack);
				assert.equal(result.items[0].width, 4 * 123);
			});

		});

		describe('minWidth and maxWidth', function () {
			it('should return an object containing a collection of inlines and calculated minWidth/maxWidth', function () {
				var inlines = textInlines.buildInlines(plainTextArrayWithoutNewLines);
				assert(inlines.items);
				assert(inlines.minWidth);
				assert(inlines.maxWidth);
			});

			it('should set minWidth to the largest inline width', function () {
				var inlines = textInlines.buildInlines(plainTextArrayWithoutNewLines);
				assert.equal(inlines.minWidth, 11 * 12);
			});

			it('should take into account trimming when calculating minWidth', function () {
				var inlines = textInlines.buildInlines(plainTextArrayWithoutNewLinesWhichRequiresTrimming);
				assert.equal(inlines.minWidth, 11 * 12);
			});

			it('should set maxWidth to the sum of all widths if there is no trimming and no newlines', function () {
				var inlines = textInlines.buildInlines(plainTextArrayWithoutNewLines);
				assert.equal(inlines.maxWidth, 52 * 12);
			});

			it('should take into account trimming when calculating maxWidth', function () {
				var inlines = textInlines.buildInlines(plainTextArrayWithoutNewLinesWhichRequiresTrimming);
				assert.equal(inlines.maxWidth, 52 * 12);
			});

			it('should set maxWidth to the width of the largest line if there are new-lines', function () {
				var inlines = textInlines.buildInlines(textArrayWithNewLines);
				assert.equal(inlines.maxWidth, 21 * 12);
			});

			it('should take into account trimming at line level when calculating maxWidth', function () {
				var inlines = textInlines.buildInlines(textArrayWithNewLinesWhichRequiresTrimming);
				assert.equal(inlines.maxWidth, 21 * 12);
			});

			it('should set min width to max when nowrap style is specified', function () {
				var inlines = textInlines.buildInlines(plainTextArrayWithoutNewLines, styleStackNoWrap);
				assert.equal(inlines.minWidth, 52 * 12);
				assert.equal(inlines.maxWidth, 52 * 12);
			});

			it('should set min width to longest when nowrap style is specified on longest segment', function () {
				var inlines = textInlines.buildInlines(mixedTextArrayWithoutNewLinesNoWrapLongest);
				assert.equal(inlines.minWidth, 27 * 12);
				assert.equal(inlines.maxWidth, 52 * 12);
			});

			it('should set widths to normal when nowrap style is specified on shortest segment', function () {
				var inlines = textInlines.buildInlines(mixedTextArrayWithoutNewLinesNoWrapShortest);
				assert.equal(inlines.minWidth, 11 * 12);
				assert.equal(inlines.maxWidth, 52 * 12);
			});

			it('should set set the leading indent only to the first line of a paragraph', function () {
				var inlines = textInlines.buildInlines(textWithLeadingIndent);
				assert.equal(inlines.items[0].leadingCut, -10);
				var countLeadingCut = 0;
				inlines.items.forEach(function (item) {
					countLeadingCut += item.leadingCut;
				});
				assert.equal(countLeadingCut, -10);
			});

			it('should preserve leading whitespaces when preserveLeadingSpaces is set', function () {
				var inlines = textInlines.buildInlines(textWithLeadingSpaces);
				assert.equal(inlines.maxWidth, 23 * 12);
			});

			it('should preserve trailing whitespaces when preserveTrailingSpaces is set', function () {
				var inlines = textInlines.buildInlines(textWithTrailingSpaces);
				assert.equal(inlines.maxWidth, 23 * 12);
			});

			it('should preserve leading and trailing whitespaces when preserveLeadingSpaces and preserveTrailingSpaces are set', function () {
				var inlines = textInlines.buildInlines(textWithLeadingAndTrailingSpaces);
				assert.equal(inlines.maxWidth, 27 * 12);
			});

		});

	});

	describe('widthOfText', function () {
		// TODO
	});

	describe('sizeOfText', function () {
		// TODO
	});

});
