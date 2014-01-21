var assert = require('assert');

var pdfMake = require('../src/layout.js');
var Line = pdfMake.Line;
var TextTools = pdfMake.TextTools;

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

		it('should not subtract leadingCuts other than the from first inline when setting x', function() {
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



describe('TextTools', function() {
	var sampleText = 'Przyklad, bez nowych linii,   ale !!!! rozne!!!konstrukcje i ..blablablabla.';
	var sampleText2 = 'Przyklad, z nowy\nmi liniami\n, \n \n  ale\n\n !!!! rozne!!!konstrukcje i ..blablablabla.';

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

	var plainTextArrayWithoutNewLines = [
		'Imię: ',
		'Jan   ',
		'   Nazwisko:',
		' Nowak Dodatkowe informacje:'
	]

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

	var textTools = new TextTools(sampleTestProvider);

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
			var result = textTools.normalizeTextArray(plainTextArray);
			assert.equal(result.length, 8);
		});

		it('should support new lines in plain strings', function() {
			var result = textTools.normalizeTextArray(plainTextArray);
			assert.equal(result[5].lineEnd, true);
		});

		it('should support arrays with style definition', function() {
			var result = textTools.normalizeTextArray(mixedTextArray);
			assert.equal(result.length, 8);
		});

		it('should keep style definition after splitting', function() {
			var result = textTools.normalizeTextArray(mixedTextArray);
			[0, 2, 3, 4, 5, 6, 7].forEach(function(i) { 
				assert.equal(result[i].bold, true);
			});

			assert(!result[1].bold);
		});
	});

	describe('measure', function() {
		it('should use default style', function(){
			var result = textTools.measure(sampleTestProvider, plainTextArray);
			assert.notEqual(result, null);
			assert.notEqual(result.length, 0);
		});

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

		it('should support default style overrides', function() {
			var result = textTools.measure(sampleTestProvider, plainTextArray, { fontSize: 100 });
			assert.equal(result[0].width, 600);
		});

		it('should take into account styles defined in textArrays', function() {
			var result = textTools.measure(sampleTestProvider, mixedTextArray);
			assert.equal(result[0].width, 108);
			assert.equal(result[0].trailingCut, 18);
			assert.equal(result[0].leadingCut, 0);
			assert.equal(result[0].bold, true);

			assert.equal(result[1].width, 72);
			assert.equal(result[1].trailingCut, 36);
			assert.equal(result[1].leadingCut, 0);
			assert(!result[1].bold);
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
			var lines = textTools.buildLines(mixedTextArray, 72+36);
			assert.equal(lines.length, 6);
		});
	});
});
