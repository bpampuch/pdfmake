var assert = require('assert');

var pdfMake = require('../src/layout.js');
var Line = pdfMake.Line;
var TextTools = pdfMake.TextTools;
var Block = pdfMake.Block;
var StyleContextStack = pdfMake.StyleContextStack;
var LayoutBuilder = pdfMake.LayoutBuilder;

describe('Line', function() {
	describe('addInline', function() {
		it('should add inline if there is enough space', function() {
			var line = new Line(100);
			assert(line.addInline({ width: 50 }));
			assert.equal(line.inlines.length, 1);
		});
		it('should add first inline even if theres not enough space', function() {
			var line = new Line(100);
			assert(line.addInline({ width: 170 }));
			assert.equal(line.inlines.length, 1);
		});
		it('should not add following inlines if theres not enough space', function() {
			var line = new Line(100);
			assert(line.addInline({ width: 70 }));
			assert(!line.addInline({ width: 40 }));
			assert.equal(line.inlines.length, 1);
		});
		it('should take into account first inline leadingCut (left-trimming) when deciding if theres enough space', function() {
			var line = new Line(100);
			assert(line.addInline({ width: 70, leadingCut: 20 }));
			assert(line.addInline({ width: 40 }));
			assert.equal(line.inlines.length, 2);
		});
		it('should not take into account following inline leadingCuts (left-trimming) when deciding if theres enough space', function() {
			var line = new Line(100);
			assert(line.addInline({ width: 70, leadingCut: 20 }));
			assert(line.addInline({ width: 20, leadingCut: 10 }));
			assert(line.addInline({ width: 20, leadingCut: 10 }));
			assert(!line.addInline({ width: 20, leadingCut: 10 }));
			assert.equal(line.inlines.length, 3);
		});
		it('should take into account last inline trailingCut (right-trimming) when deciding if theres enough space', function() {
			var line = new Line(100);
			assert(line.addInline({ width: 30 }));
			assert(line.addInline({ width: 40 }));
			assert(line.addInline({ width: 50, trailingCut: 20 }));
			assert.equal(line.inlines.length, 3);
		});
		it('should not take into account previous inline trailingCuts (right-trimming) when deciding if theres enough space', function() {
			var line = new Line(100);
			assert(line.addInline({ width: 40, trailingCut: 20 }));
			assert(line.addInline({ width: 30, trailingCut: 20 }));
			assert(!line.addInline({ width: 31 }));
			assert.equal(line.inlines.length, 2);
		});

		it('should set x to 0 for first inline if there is no left-trimming (leadingCut)', function() {
			var line = new Line(100);
			assert(line.addInline({ width: 40, leadingCut: 0, trailingCut: 20 }));
			assert.equal(line.inlines[0].x, 0);
		});

		it('should set x to sum of preceding inline widths if there is no left-trimming', function() {
			var line = new Line(100);
			assert(line.addInline({ width: 40, leadingCut: 0, trailingCut: 0 }));
			assert(line.addInline({ width: 40, leadingCut: 0, trailingCut: 0 }));
			assert(line.addInline({ width: 10, leadingCut: 0, trailingCut: 0 }));
			assert.equal(line.inlines[2].x, 80);
		});

		it('should set x to -leadingCut for first inline when its left-trimmed', function() {
			var line = new Line(100);
			assert(line.addInline({ width: 40, leadingCut: 10, trailingCut: 20 }));
			assert.equal(line.inlines[0].x, -10);
		});

		it('should set x to 0 for second inline if first inline is fully trimmed (cut)', function() {
			var line = new Line(100);
			assert(line.addInline({ width: 40, leadingCut: 40, trailingCut: 40 }));
			assert(line.addInline({ width: 40, leadingCut: 40, trailingCut: 40 }));
			assert.equal(line.inlines[1].x, 0);
		});

		it('should set x to sum of preceding inline widths minus first inline leadingCut', function() {
			var line = new Line(100);
			assert(line.addInline({ width: 40, leadingCut: 30, trailingCut: 0 }));
			assert(line.addInline({ width: 40, leadingCut: 0, trailingCut: 0 }));
			assert(line.addInline({ width: 10, leadingCut: 0, trailingCut: 0 }));
			assert.equal(line.inlines[2].x, 80 - 30);
		});

		it('should not subtract leadingCuts other than from the first inline when setting x', function() {
			var line = new Line(100);
			assert(line.addInline({ width: 40, leadingCut: 30, trailingCut: 0 }));
			assert(line.addInline({ width: 40, leadingCut: 10, trailingCut: 0 }));
			assert(line.addInline({ width: 10, leadingCut: 5, trailingCut: 0 }));
			assert.equal(line.inlines[2].x, 80 - 30);
		});

		it('should ignore trailingCuts when setting x', function() {
			var line = new Line(100);
			assert(line.addInline({ width: 40, leadingCut: 30, trailingCut: 10 }));
			assert(line.addInline({ width: 40, leadingCut: 10, trailingCut: 10 }));
			assert(line.addInline({ width: 20, leadingCut: 5, trailingCut: 5 }));
			assert.equal(line.inlines[2].x, 80 - 30);
		});
	});

	describe('getWidth', function() {
		it('should return sum of all inline widths', function() {
			var line = new Line(100);
			assert(line.addInline({ width: 30 }));
			assert(line.addInline({ width: 20 }));
			assert(line.addInline({ width: 5 }));
			assert.equal(line.getWidth(), 55);
		});

		it('should subtract first inline leadingCut (left-trimming) from total width', function() {
			var line = new Line(100);
			assert(line.addInline({ width: 30, leadingCut: 20 }));
			assert(line.addInline({ width: 20, leadingCut: 10 }));
			assert(line.addInline({ width: 5, leadingCut: 3 }));
			assert.equal(line.getWidth(), 55 - 20);
		});

		it('should subtract last inline trailingCut (right-trimming) from total width', function() {
			var line = new Line(100);
			assert(line.addInline({ width: 30, leadingCut: 20, trailingCut: 5 }));
			assert(line.addInline({ width: 20, leadingCut: 10, trailingCut: 3 }));
			assert(line.addInline({ width: 5, leadingCut: 3, trailingCut: 1 }));
			assert.equal(line.getWidth(), 55 - 20 - 1);
		});
	});

	describe('getMinWidth', function() {
		it('should return longest inline trimmed width', function() {
			var line = new Line(100);
			assert(line.addInline({ width: 30, leadingCut: 10, trailingCut: 5 }));
			assert(line.addInline({ width: 20, leadingCut: 3, trailingCut: 7 }));
			assert(line.addInline({ width: 40, leadingCut: 9, trailingCut: 6 }));
			assert.equal(line.getMinWidth(), 25);
		});
	});

	describe.skip('getHeight', function() {
		it('should return highest inline height when baselines are equal', function() {
		});

		it('should take into account baseline offsets', function() {
		});
	})
});







var sampleTestProvider = {
	provideFont: function(familyName, bold, italics) {
		return {
			widthOfString: function(text, size) {
				return text.length * size * (bold ? 1.5 : 1);
			},
			lineHeight: function(size) {
				return size;
			}
		}
	}
};


describe('StyleContextStack', function() {

	var defaultStyle = { fontSize: 12, bold: false, font: 'Helvetica' };

	var stackWithDefaultStyle;
	var fullStack;

	beforeEach(function() {
		stackWithDefaultStyle = new StyleContextStack({}, defaultStyle);

		fullStack = new StyleContextStack(
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
				fontSize: 12, 
				bold: false,
				font: 'Helvetica'
			});
	});

	describe('getProperty', function() {
		it('should return null for an empty stack', function(){
			assert(!(new StyleContextStack().getProperty('fontSize')));
		});

		it('should return null if default style has been provided, but does not define the property', function(){
			assert(!stackWithDefaultStyle.getProperty('unknownProperty'));
		});

		it('should return property value from default style if found', function(){
			assert.equal(stackWithDefaultStyle.getProperty('fontSize'), 12);
		});

		it('should return overriden property value from style overrides', function(){
			stackWithDefaultStyle.push({ fontSize: 50 });
			assert.equal(stackWithDefaultStyle.getProperty('fontSize'), 50);
			stackWithDefaultStyle.pop();
			assert.equal(stackWithDefaultStyle.getProperty('fontSize'), 12);
		});

		it('should return latest overriden property value from style overrides if multiple style overrides have been provided', function(){
			stackWithDefaultStyle.push({ fontSize: 50 });
			stackWithDefaultStyle.push({ fontSize: 150 });
			assert.equal(stackWithDefaultStyle.getProperty('fontSize'), 150);
			stackWithDefaultStyle.pop();
			assert.equal(stackWithDefaultStyle.getProperty('fontSize'), 50);
			stackWithDefaultStyle.pop();
			assert.equal(stackWithDefaultStyle.getProperty('fontSize'), 12);
		});

		it('should return property value from named style', function(){
			fullStack.push('header');
			assert.equal(fullStack.getProperty('fontSize'), 150);
		});

		it('should support named styles mixed with style overrides and obey their order', function(){
			// default value
			assert.equal(fullStack.getProperty('fontSize'), 12);

			// named style value
			fullStack.push('header');
			assert.equal(fullStack.getProperty('fontSize'), 150);

			// overriden value
			fullStack.push({ fontSize: 50 });
			assert.equal(fullStack.getProperty('fontSize'), 50);

			// overriden second type with a named style
			fullStack.push('small');
			assert.equal(fullStack.getProperty('fontSize'), 8);

			// taken from previous overrides (not found in latest overrides)
			assert.equal(fullStack.getProperty('font'), 'Roboto');
		});
	});

	describe('autopush', function() {
		it('should not push anything if no style nor style-property is defined', function() {
			assert.equal(fullStack.autopush({ anotherProperty: 'test' }), 0);
		});

		it('should push style name if object specifies it in the style property', function() {
			assert.equal(fullStack.styleOverrides.length, 0);
			assert.equal(fullStack.autopush({ anotherProperty: 'test', style: 'header' }), 1);
			assert.equal(fullStack.styleOverrides.length, 1);
			assert.equal(fullStack.styleOverrides[0], 'header');
		});

		it('should push all style names if object specifies them as an array in the style property', function() {
			assert.equal(fullStack.styleOverrides.length, 0);
			assert.equal(fullStack.autopush({ anotherProperty: 'test', style: ['header', 'small'] }), 2);
			assert.equal(fullStack.styleOverrides.length, 2);
			assert.equal(fullStack.styleOverrides[0], 'header');
			assert.equal(fullStack.styleOverrides[1], 'small');
		});

		it('should create a style-overrides-object from all styling properties and push it onto the stack', function() {
			assert.equal(fullStack.styleOverrides.length, 0);
			assert.equal(fullStack.autopush({ anotherProperty: 'test', font: 'Helvetica', fontSize: 123, bold: false, italics: true, alignment: 'left' }), 1);
			assert.equal(fullStack.styleOverrides.length, 1);
			assert.equal(fullStack.styleOverrides[0].font, 'Helvetica');
			assert.equal(fullStack.styleOverrides[0].fontSize, 123);
			assert.equal(fullStack.styleOverrides[0].bold, false);
			assert.equal(fullStack.styleOverrides[0].italics, true);
			assert.equal(fullStack.styleOverrides[0].alignment, 'left');
		});

		it('should support mixed styles and styling properties and also make sure the style-overrides-object is pushed as the last element', function() {
			assert.equal(fullStack.styleOverrides.length, 0);
			assert.equal(fullStack.autopush({ anotherProperty: 'test', font: 'Helvetica', style: ['a', 'b', 'c'], fontSize: 123 }), 4);
			assert.equal(fullStack.styleOverrides.length, 4);
			assert.equal(fullStack.styleOverrides[0], 'a');
			assert.equal(fullStack.styleOverrides[1], 'b');
			assert.equal(fullStack.styleOverrides[2], 'c');
			assert.equal(fullStack.styleOverrides[3].font, 'Helvetica');
			assert.equal(fullStack.styleOverrides[3].fontSize, 123);
		});
	});
});

var textTools = new TextTools(sampleTestProvider);

describe('TextTools', function() {
	var sampleText = 'Przyklad, bez nowych linii,   ale !!!! rozne!!!konstrukcje i ..blablablabla.';
	var sampleText2 = 'Przyklad, z nowy\nmi liniami\n, \n \n  ale\n\n !!!! rozne!!!konstrukcje i ..blablablabla.';

	var plainText = 'Imię: Jan      Nazwisko: Nowak\nDodatkowe informacje:';

	var plainTextArray = [
		'Imię: ',
		'Jan   ',
		'   Nazwisko:',
		' Nowak\nDodatkowe informacje:'
	]

	var mixedTextArray = [
		{ text: 'Imię: ', bold: true },
		'Jan   ',
		{ text: '   Nazwisko:', bold: true },
		{ text: ' Nowak\nDodatkowe informacje:', bold: true }
	]

	var mixedTextArrayWithUnknownStyleDefinitions = [
		{ text: 'Imię: ', bold: true },
		'Jan   ',
		{ text: '   Nazwisko:', bold: true },
		{ text: ' Nowak\nDodatkowe informacje:', bold: true, unknownStyle: 123 }
	]

	var plainTextArrayWithoutNewLines = [
		'Imię: ',
		'Jan   ',
		'   Nazwisko:',
		' Nowak Dodatkowe informacje:'
	]

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


	describe('splitWords', function() {
		it('should do basic splitting', function() {
			var result = textTools.splitWords(sampleText);
			assert.equal(result.length, 9);
		});

		it('should not set lineEnd on inlines if there are no new-lines', function() {
			var result = textTools.splitWords(sampleText);

			result.forEach(function(item) {
				assert.notEqual(item.lineEnd, true);
			})
		});

		it('should split into lines if there are new-line chars', function() {
			var result = textTools.splitWords(sampleText2);
			assert.equal(result.length, 15);
		});

		it('should split properly when adjacent newlines appear', function() {
			var result = textTools.splitWords(sampleText2);
			assert.equal(result[9].text.length, 0);			
			assert.equal(result[9].lineEnd, true);
		});

		it('should support whitespace-only lines', function() {
			var result = textTools.splitWords(sampleText2);
			assert.equal(result[6].text, ' ');			
			assert.equal(result[6].lineEnd, true);
		})
	});

	describe('normalizeTextArray', function() {
		it('should support plain strings', function() {
			var result = textTools.normalizeTextArray(plainText);
			assert.equal(result.length, 6);
		});

		it('should support plain strings with new-lines', function() {
			var result = textTools.normalizeTextArray(plainText);
			assert(result[3].lineEnd);
		});

		it('should support an array of plain strings', function() {
			var result = textTools.normalizeTextArray(plainTextArray);
			assert.equal(result.length, 8);
		});

		it('should support an array of plain strings with new-lines', function() {
			var result = textTools.normalizeTextArray(plainTextArray);
			assert.equal(result[5].lineEnd, true);
		});

		it('should support arrays with style definition', function() {
			var result = textTools.normalizeTextArray(mixedTextArray);
			assert.equal(result.length, 8);
		});

		it('should keep style definitions after splitting new-lines', function() {
			var result = textTools.normalizeTextArray(mixedTextArray);
			[0, 2, 3, 4, 5, 6, 7].forEach(function(i) { 
				assert.equal(result[i].bold, true);
			});

			assert(!result[1].bold);
		});

		it('should keep unknown style fields after splitting new-lines', function() {
			var result = textTools.normalizeTextArray(mixedTextArrayWithUnknownStyleDefinitions);
			assert.equal(result.length, 8);
			assert.equal(result[6].unknownStyle, 123);
			assert.equal(result[7].unknownStyle, 123);
		});
	});

	describe('measure', function() {
		// width + positioning
		it('should set width', function() {
			var result = textTools.measure(sampleTestProvider, plainTextArray);
			assert.notEqual(result, null);
			assert.notEqual(result.length, 0);
			assert.notEqual(result[0].width, null);
		});

		it('should measure text widths', function() {
			var result = textTools.measure(sampleTestProvider, plainTextArray);
			assert.equal(result[0].width, 72);
			assert.equal(result[2].width, 36);
			assert.equal(result[3].width, 108);
		});

		it('should calculate leading and trailing cuts', function() {
			var result = textTools.measure(sampleTestProvider, plainTextArray);
			assert.equal(result[0].trailingCut, 12);
			assert.equal(result[0].leadingCut, 0);
		});

		it('should set the same value for leading and trailing cuts for whitespace-only strings', function() {
			var result = textTools.measure(sampleTestProvider, plainTextArray);
			assert.equal(result[2].trailingCut, 36);
			assert.equal(result[2].leadingCut, 36);
		});

		it('should set leading and trailing cuts to 0 if texts cannot be trimmed', function() {
			var result = textTools.measure(sampleTestProvider, plainTextArray);
			assert.equal(result[5].trailingCut, 0);
			assert.equal(result[5].leadingCut, 0);
		});

		// styling
		it('should use default style', function() {
			var result = textTools.measure(sampleTestProvider, 'Imię', styleStack);
			assert.equal(result[0].width, 4 * 15);
		});

		it('should use overriden styles from styleStack', function() {
			styleStack.push('header');
			var result = textTools.measure(sampleTestProvider, 'Imię', styleStack);
			assert.equal(result[0].width, 4 * 150);
			styleStack.pop();
		})

		it('should support style overrides at text definition level', function() {
			var result = textTools.measure(sampleTestProvider, [{ text: 'Imię', fontSize: 20 }], styleStack);
			assert.equal(result[0].width, 4 * 20);
		});

		it('should support named styles at text definition level', function() {
			var result = textTools.measure(sampleTestProvider, [{ text: 'Imię', style: 'header' }], styleStack);
			assert.equal(result[0].width, 4 * 150);
		});

		it('should support multiple named styles at text definition level', function() {
			var result = textTools.measure(sampleTestProvider, [{ text: 'Imię', style: ['header', 'small'] }], styleStack);
			assert.equal(result[0].width, 4 * 8);
		});

		it('should obey named styles order', function() {
			var result = textTools.measure(sampleTestProvider, [{ text: 'Imię', style: ['header', 'small'] }], styleStack);
			assert.equal(result[0].width, 4 * 8);

			result = textTools.measure(sampleTestProvider, [{ text: 'Imię', style: ['small', 'header'] }], styleStack);
			assert.equal(result[0].width, 4 * 150);
		});

		it('should not take values from named styles if style-overrides have been providede', function() {
			var result = textTools.measure(sampleTestProvider, [{ text: 'Imię', fontSize: 123, style: 'header' }], styleStack);
			assert.equal(result[0].width, 4 * 123);
		});
	});

	describe('buildLines', function() {
		it('should create one line if there is enough space and text contains no newlines', function(){
			var lines = textTools.buildLines(plainTextArrayWithoutNewLines, 1000);
			assert.equal(lines.length, 1);
		});

		it('should split text into lines if there is not enough space', function(){
			var lines = textTools.buildLines(plainTextArrayWithoutNewLines, 100);
			assert(lines.length > 1);
		});

		it('should split text into lines even if there is enough space but text contains new lines', function(){
			var lines = textTools.buildLines(plainTextArray, 1000);
			assert.equal(lines.length, 2);
		});

		it('should take into account styled inlines in text', function() {
			var lines = textTools.buildLines(mixedTextArray, (6+3)*12);
			assert.equal(lines.length, 6);
		});
	});
});

describe('Block', function() {
	function createBlock(maxWidth, textArray, alignment) {
		var lines = textTools.buildLines(textArray, maxWidth);
		var block = new Block(maxWidth);
		block.setLines(lines, alignment);
		return block;
	}

	describe('setLines', function() {
		it('should addLines to block.lines collection', function() {
			var lines = textTools.buildLines(['To jest testowy komentarz\nA to jakis inny\nA tu jeszcze cos'], 500);
			var block = new Block(500);
			block.setLines(lines);
			assert.equal(block.lines, lines);
		});

		it('should not add overflown lines to block if maxHeight is specified', function() {
			var lines = textTools.buildLines(['To jest testowy komentarz\nA to jakis inny\nA tu jeszcze cos'], 500);
			var block = new Block(500);
			block.setLines(lines, 'left', 20);
			assert.equal(block.lines.length, 1);
		});

		it('should return overflown lines if maxHeight is specified', function() {
			var lines = textTools.buildLines(['To jest testowy komentarz\nA to jakis inny\nA tu jeszcze cos'], 500);
			var block = new Block(500);
			var remainingLines = block.setLines(lines, 'left', 20);
			assert.equal(remainingLines.length, 2);
		});

		describe('align left', function() {
			it('should set x to 0 for all lines if there are no leading cuts (no left-trimming)', function() {
				var block = createBlock(500, ['To jest testowy komentarz\nA to jakis inny\nA tu jeszcze cos'], 'left');
				assert.equal(block.lines.length, 3);
				block.lines.forEach(function(line) { assert.equal(line.x, 0 )});
			});
		});

		describe('align center', function() {
			it('should set x to (block width - line width) / 2', function() {
				var block = createBlock(500, ['To jest testowy komentarz\nA to jakis inny\nA tu jeszcze cos'], 'center');
				assert.equal(block.lines.length, 3);
				block.lines.forEach(function(line) { assert.equal(line.x, (500 - line.getWidth())/2 )});
			});
		});

		describe('align right', function() {
			it('should set x to blockWidth - line width', function() {
				var block = createBlock(500, ['To\ninna\nlinia'], 'right');
				assert.equal(block.lines.length, 3);
				block.lines.forEach(function(line) { assert.equal(500 - line.getWidth(), line.x )});
			});

			it('should set x to blockWidth - line width even if there are leading spaces', function() {
				var block = createBlock(500, ['To\n  inna\nlinia'], 'right');
				assert.equal(block.lines.length, 3);
				block.lines.forEach(function(line) { assert.equal(500 - line.getWidth(), line.x )});
			});

			it('should set x to blockWidth - line width even if there are trailing spaces', function() {
				var block = createBlock(500, ['To\n  inna\nlinia    '], 'right');
				assert.equal(block.lines.length, 3);
				block.lines.forEach(function(line) { assert.equal(500 - line.getWidth(), line.x )});
			});
		});
	});

	describe('getHeight', function() {
		it('should return sum of all line heights', function() {
			var block = createBlock(500, ['To jest testowy komentarz\nA to jakis inny\nA tu jeszcze cos']);
			assert.equal(block.lines.length, 3);
			
			var sum = 0;
			block.lines.forEach(function(line) { sum += line.getHeight(); });
			assert.equal(block.getHeight(), sum);
		});

		it('should take into account line-spacing');
	})
});

describe('LayoutBuilder', function() {
	var builder;

	before(function() {
		builder = new LayoutBuilder(sampleTestProvider, { width: 400, height: 800 }, { left: 40, right: 40, top: 40, bottom: 40 });
	});

	describe('processDocument', function() {
		it('should arrange texts one below another', function() {
			var desc = [
				'first paragraph',
				'another paragraph'
			];

			var pages = builder.layoutDocument(desc);

			assert.equal(pages.length, 1);
			assert(pages[0].blocks[0].y < pages[0].blocks[1].y);
			assert.equal(pages[0].blocks[0].y + pages[0].blocks[0].getHeight(), pages[0].blocks[1].y);
		});

		it('should span text into lines if theres not enough horizontal space', function() {
			var desc = [
				'first paragraph',
				'another paragraph, this time a little bit longer though, we want to force this line to be broken into several lines'
			];

			var pages = builder.layoutDocument(desc);

			assert.equal(pages.length, 1);
			assert.equal(pages[0].blocks.length, 2);
			assert.equal(pages[0].blocks[1].lines.length, 5);
		});

		it('should add new pages when required and split blocks when theres not enough space left on current page', function() {
			var desc = [
				'first paragraph',
				'another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block'
			];

			var pages = builder.layoutDocument(desc);

			assert.equal(pages.length, 2);
			assert.equal(pages[0].blocks.length, 2);
			assert.equal(pages[1].blocks.length, 1);
		});

		it('should be able to split blocks onto more than 2 pages', function() {
			var desc = [
				'first paragraph',
				'another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block'
			];

			var pages = builder.layoutDocument(desc);

			assert.equal(pages.length, 3);
			assert.equal(pages[0].blocks.length, 2);
			assert.equal(pages[1].blocks.length, 1);
			assert.equal(pages[2].blocks.length, 1);
		});

		it('should support named styles', function() {
			var desc = [
				'paragraph',
				{ 
					text: 'paragraph', 
					style: 'header' 
				}
			];

			var pages = builder.layoutDocument(desc, { header: { fontSize: 70 }});

			assert.equal(pages[0].blocks[0].lines[0].getWidth(), 9*12);
			assert.equal(pages[0].blocks[1].lines[0].getWidth(), 9*70);
		});

		it('should support arrays of inlines (as an alternative to simple strings)', function() {
			var desc = [
				'paragraph',
				{ 
					text: [
						'paragraph ', 
						'nextInline'
					],
					style: 'header' 
				}
			];

			var pages = builder.layoutDocument(desc, { header: { fontSize: 15 }});

			assert.equal(pages.length, 1);
			assert.equal(pages[0].blocks.length, 2);
			assert.equal(pages[0].blocks[0].lines.length, 1);
			assert.equal(pages[0].blocks[1].lines.length, 1);
		});

		it('should support inline styling and style overrides', function() {
			var desc = [
				'paragraph',
				{ 
					text: [ 
						'paragraph', 
						{ 
							text: 'paragraph', 
							fontSize: 4 
						}, 
					],
					style: 'header'
				}
			];

			var pages = builder.layoutDocument(desc, { header: { fontSize: 70 }});

			assert.equal(pages[0].blocks[0].lines[0].getWidth(), 9*12);
			assert.equal(pages[0].blocks[1].lines[0].getWidth(), 9*70);
			assert.equal(pages[0].blocks[1].lines[1].getWidth(), 9*4);
		});

		it('should support multiple styles (last property wins)', function() {
			var desc = [
				'paragraph',
				{ text: 'paragraph', style: [ 'header', 'small' ] }
			];

			var pages = builder.layoutDocument(desc, { header: { fontSize: 70 }, small: { fontSize: 35 }});

			assert.equal(pages[0].blocks[0].lines[0].getWidth(), 9*12);
			assert.equal(pages[0].blocks[1].lines[0].getWidth(), 9*35);
		});

		it('should support style-overrides', function() {
			var desc = [
				'paragraph',
				{ text: 'paragraph', fontSize: 40 }
			];

			var pages = builder.layoutDocument(desc, { header: { fontSize: 70 }});

			assert.equal(pages[0].blocks[0].lines[0].getWidth(), 9*12);
			assert.equal(pages[0].blocks[1].lines[0].getWidth(), 9*40);
		});

		it('style-overrides should take precedence over named styles', function() {
			var desc = [
				'paragraph',
				{ text: 'paragraph', fontSize: 40, style: 'header' }
			];

			var pages = builder.layoutDocument(desc, { header: { fontSize: 70 }});

			assert.equal(pages[0].blocks[1].lines[0].getWidth(), 9*40);
		});

		it('should support default document style', function() {
			var desc = [
				'text',
				'text2'
			];

			var pages = builder.layoutDocument(desc, {}, { fontSize: 50 });

			assert.equal(pages[0].blocks[0].lines[0].getWidth(), 4 * 50);
		});

		it('should support columns', function() {
			var desc = [
				{
					columns: [
						{
							text: 'column 1'
						},
						{
							text: 'column 2'
						}
					]
				}
			];

			var pages = builder.layoutDocument(desc);
			assert.equal(pages[0].blocks[0].x, 40);
			assert.equal(pages[0].blocks[1].x, 200);
		});

		it('column descriptor should support named style inheritance', function() {
			var desc = [
				{
					style: 'header',

					columns: [
						{
							text: 'column 1'
						},
						{
							text: 'column 2'
						}
					]
				}
			];

			var pages = builder.layoutDocument(desc, { header: { fontSize: 40 }});
			assert.equal(pages[0].blocks[0].lines.length, 2);
			assert.equal(pages[0].blocks[0].lines[0].getWidth(), 6*40);
			assert.equal(pages[0].blocks[0].lines[1].getWidth(), 40);
		});

		it('column descriptor should support style overrides', function() {
			var desc = [
				{
					fontSize: 8,

					columns: [
						{
							text: 'column 1'
						},
						{
							text: 'column 2'
						}
					]
				}
			];

			var pages = builder.layoutDocument(desc, { header: { fontSize: 40 }});
			assert.equal(pages[0].blocks[0].lines.length, 1);
			assert.equal(pages[0].blocks[0].lines[0].getWidth(), 8*8);
		});

		it('should support fixed column widths', function() {
			var desc = [
				{
					columns: [
						{
							text: 'col1',
							width: 100,
						},
						{
							text: 'col2',
							width: 150,
						},
						{
							text: 'col3',
							width: 90,
						}

					]
				}
			];

			var pages = builder.layoutDocument(desc);
			assert(pages[0].blocks.length, 3);
			assert.equal(pages[0].blocks[0].x, 40);
			assert.equal(pages[0].blocks[1].x, 40 + 100);
			assert.equal(pages[0].blocks[2].x, 40 + 100 + 150);
		});

		it('should support star columns and divide available width equally between all star columns', function() {
			var desc = [
				{
					columns: [
						{
							text: 'col1',
						},
						{
							text: 'col2',
							width: 50
						},
						{
							text: 'col3',
						}

					]
				}
			];

			var pages = builder.layoutDocument(desc);

			var pageSpace = 400 - 40 - 40;
			var starWidth = (pageSpace - 50)/2;

			assert(pages[0].blocks.length, 3);
			assert.equal(pages[0].blocks[0].x, 40);
			assert.equal(pages[0].blocks[1].x, 40 + starWidth);
			assert.equal(pages[0].blocks[2].x, 40 + starWidth + 50);
		});

		it('should pass column widths to inner elements', function() {
			var desc = [
				{
					columns: [
						{
							columns: [
								{ 
									text: 'sample text here, should have maxWidth set to ((400-40-40-50)/2)/2'
								},
								{
									text: 'second column'
								}
							]
						},
						{
							text: 'col2',
							width: 50
						},
						{
							text: 'col3',
						}

					]
				}
			];

			var pages = builder.layoutDocument(desc);
			// ((pageWidth - margins - fixed_column_width) / 2_columns) / 2_subcolumns
			var maxWidth = (400-40-40-50)/2/2;

			assert.equal(pages[0].blocks[0].lines[0].maxWidth, maxWidth);
		});

		it.skip('should support auto columns', function() {
			var desc = [
				{
					columns: [
						{
							text: 'col1',
							width: 'auto'
						},
						{
							text: 'col2',
							width: 50
						},
						{
							text: 'col3',
						}
					]
				}
			];

			var pages = builder.layoutDocument(desc);

			//TODO:
		});


		describe.skip('TODO', function() {
			it('should support block margins');
			it('should support inline margins');
			it('should support line indents');
			it('should support unordered lists');
			it('should support ordered lists');
			it('should support sub-lists');
			it('should support subscript');
			it('should support superscript');
			it('should support tables with fixed column widths');
			it('should support tables with auto column widths');
			it('should support tables with percentage column widths');
			it('should support table headers');
			it('should support table splitting between pages and repeat table headers');
			it('should support table-cell splitting between pages');
			it('should support subtables created from arrays');
			it('should support subtables created from another table');
			it('should support vertical alignment inside cells');
			it('should support table styling');
			it('should support column spans');
			it('should support row spans');
			it('should support programmatic cell styling');
			it('should support multiline content in table cells');
			it('should support page headers');
			it('should support page footers');
			it('should support justify alignment');
			it('should support non-breaking-spaces');
			it('should support non-breaking-lines');
			it('should support current page number');
			it('should support page count');
			it('should support custom page breaks');
			it('should support custom page breaks inside nested elements');
			it('should support images');
			it('should support image scaling');
			it('should support vectors');
			it('should support various page orientations');
			it('should support various page sizes');
			it('should support colors');
			it('should support absolute positioning');
			it('should support text continuations');
			it('should support line-height');
			it('should support programmatic styling');
			it('should support line filling action');
			it('should render lines to pdf in a single call if style is the same');
			it('should support document encryption');
			it('should support document permissions');
		});
	});
});

