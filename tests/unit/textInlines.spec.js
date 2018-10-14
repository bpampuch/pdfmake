const assert = require('assert');

const TextInlines = require('../../js/textInlines').default;
const StyleContextStack = require('../../js/styleContextStack').default;

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
				assert.equal(result.items[6].trailingCut, 0);
				assert.equal(result.items[6].leadingCut, 0);
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

				var result = textInlines.buildInlines([{ text: 'Imię', style: ['small', 'header'] }], styleStack);
				assert.equal(result.items[0].width, 4 * 150);
			});

			it('should not take values from named styles if style-overrides have been providede', function () {
				var result = textInlines.buildInlines([{ text: 'Imię', fontSize: 123, style: 'header' }], styleStack);
				assert.equal(result.items[0].width, 4 * 123);
			});

		});

	});

});
