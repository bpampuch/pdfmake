/* jslint node: true */
'use strict';

var assert = require('assert');

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

describe('StyleContextStack', function () {

	var defaultStyle = {fontSize: 12, bold: false, font: 'Helvetica'};

	var stackWithDefaultStyle;
	var fullStack;

	beforeEach(function () {
		stackWithDefaultStyle = new StyleContextStack({}, defaultStyle);

		fullStack = new StyleContextStack(
			{
				header: {
					fontSize: 150,
					font: 'Roboto'
				},
				small: {
					fontSize: 8
				},
				samplebold: {
					bold: true,
				}

			},
			{
				fontSize: 12,
				bold: false,
				font: 'Helvetica'
			});
	});

	describe('getProperty', function () {
		it('should return null for an empty stack', function () {
			assert(!(new StyleContextStack().getProperty('fontSize')));
		});

		it('should return null if default style has been provided, but does not define the property', function () {
			assert(!stackWithDefaultStyle.getProperty('unknownProperty'));
		});

		it('should return property value from default style if found', function () {
			assert.equal(stackWithDefaultStyle.getProperty('fontSize'), 12);
		});

		it('should return overriden property value from style overrides', function () {
			stackWithDefaultStyle.push({fontSize: 50});
			assert.equal(stackWithDefaultStyle.getProperty('fontSize'), 50);
			stackWithDefaultStyle.pop();
			assert.equal(stackWithDefaultStyle.getProperty('fontSize'), 12);
		});

		it('should return latest overriden property value from style overrides if multiple style overrides have been provided', function () {
			stackWithDefaultStyle.push({fontSize: 50});
			stackWithDefaultStyle.push({fontSize: 150});
			assert.equal(stackWithDefaultStyle.getProperty('fontSize'), 150);
			stackWithDefaultStyle.pop();
			assert.equal(stackWithDefaultStyle.getProperty('fontSize'), 50);
			stackWithDefaultStyle.pop();
			assert.equal(stackWithDefaultStyle.getProperty('fontSize'), 12);
		});

		it('should return property value from named style', function () {
			fullStack.push('header');
			assert.equal(fullStack.getProperty('fontSize'), 150);
		});

		it('should support named styles mixed with style overrides and obey their order', function () {
			// default value
			assert.equal(fullStack.getProperty('fontSize'), 12);

			// named style value
			fullStack.push('header');
			assert.equal(fullStack.getProperty('fontSize'), 150);

			// overriden value
			fullStack.push({fontSize: 50});
			assert.equal(fullStack.getProperty('fontSize'), 50);

			// overriden second type with a named style
			fullStack.push('small');
			assert.equal(fullStack.getProperty('fontSize'), 8);

			// taken from previous overrides (not found in latest overrides)
			assert.equal(fullStack.getProperty('font'), 'Roboto');
		});

		it('"false" boolean overrides (bold, italics, etc) should override inherited "true" values', function () {
			assert.equal(fullStack.getProperty('bold'), false);
			fullStack.push('samplebold');
			assert.equal(fullStack.getProperty('bold'), true);
			fullStack.push({bold: false});
			assert.equal(fullStack.getProperty('bold'), false);
		});
	});

	describe('autopush', function () {
		it('should not push anything if no style nor style-property is defined', function () {
			assert.equal(fullStack.autopush({anotherProperty: 'test'}), 0);
		});

		it('should push style name if object specifies it in the style property', function () {
			assert.equal(fullStack.styleOverrides.length, 0);
			assert.equal(fullStack.autopush({anotherProperty: 'test', style: 'header'}), 1);
			assert.equal(fullStack.styleOverrides.length, 1);
			assert.equal(fullStack.styleOverrides[0], 'header');
		});

		it('should push all style names if object specifies them as an array in the style property', function () {
			assert.equal(fullStack.styleOverrides.length, 0);
			assert.equal(fullStack.autopush({anotherProperty: 'test', style: ['header', 'small']}), 2);
			assert.equal(fullStack.styleOverrides.length, 2);
			assert.equal(fullStack.styleOverrides[0], 'header');
			assert.equal(fullStack.styleOverrides[1], 'small');
		});

		it('should create a style-overrides-object from all styling properties and push it onto the stack', function () {
			assert.equal(fullStack.styleOverrides.length, 0);
			assert.equal(fullStack.autopush({anotherProperty: 'test', font: 'Helvetica', fontSize: 123, bold: false, italics: true, alignment: 'left'}), 1);
			assert.equal(fullStack.styleOverrides.length, 1);
			assert.equal(fullStack.styleOverrides[0].font, 'Helvetica');
			assert.equal(fullStack.styleOverrides[0].fontSize, 123);
			assert.equal(fullStack.styleOverrides[0].bold, false);
			assert.equal(fullStack.styleOverrides[0].italics, true);
			assert.equal(fullStack.styleOverrides[0].alignment, 'left');
		});

		it('should support mixed styles and styling properties and also make sure the style-overrides-object is pushed as the last element', function () {
			assert.equal(fullStack.styleOverrides.length, 0);
			assert.equal(fullStack.autopush({anotherProperty: 'test', font: 'Helvetica', style: ['a', 'b', 'c'], fontSize: 123}), 4);
			assert.equal(fullStack.styleOverrides.length, 4);
			assert.equal(fullStack.styleOverrides[0], 'a');
			assert.equal(fullStack.styleOverrides[1], 'b');
			assert.equal(fullStack.styleOverrides[2], 'c');
			assert.equal(fullStack.styleOverrides[3].font, 'Helvetica');
			assert.equal(fullStack.styleOverrides[3].fontSize, 123);
		});
	});
});
