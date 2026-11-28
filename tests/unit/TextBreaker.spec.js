const assert = require('assert');

const TextBreaker = require('../../js/TextBreaker').default;
const StyleContextStack = require('../../js/StyleContextStack').default;

describe('TextBreaker', function () {

	var textBreaker = new TextBreaker();

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
		{ text: 'Imię: ', bold: true },
		'Jan   ',
		{ text: '   Nazwisko:', bold: true },
		{ text: ' Nowak\nDodatkowe informacje:', bold: true }
	];

	var mixedTextArrayWithUnknownStyleDefinitions = [
		{ text: 'Imię: ', bold: true },
		'Jan   ',
		{ text: '   Nazwisko:', bold: true },
		{ text: ' Nowak\nDodatkowe informacje:', bold: true, unknownStyle: 123 }
	];

	var styleStackNoWrap = new StyleContextStack({}, { noWrap: true });
	var styleStackWrap = new StyleContextStack({}, { noWrap: false });
	var styleStackWordBreakBreakAll = new StyleContextStack({}, { wordBreak: 'break-all' });

	describe('getBreaks', function () {

		it('should do basic splitting', function () {
			var result = textBreaker.getBreaks(sampleText);
			assert.equal(result.length, 8);
		});

		it('should not set lineEnd on inlines if there are no new-lines', function () {
			var result = textBreaker.getBreaks(sampleText);

			result.forEach(function (item) {
				assert.notEqual(item.lineEnd, true);
			});
		});

		it('should split into lines if there are new-line chars', function () {
			var result = textBreaker.getBreaks(sampleText2);
			assert.equal(result.length, 14);
		});

		it('should mark a newline after the last word as a hard break', function () {
			var result = textBreaker.getBreaks('First second\n');
			assert.deepEqual(result, [{ text: 'First ' }, { text: 'second', lineEnd: true }]);
		});

		it('should split properly when adjacent newlines appear', function () {
			var result = textBreaker.getBreaks(sampleText2);
			assert.equal(result[9].text.length, 0);
			assert.equal(result[9].lineEnd, true);
		});

		it('should support whitespace-only lines', function () {
			var result = textBreaker.getBreaks(sampleText2);
			assert.equal(result[6].text, ' ');
			assert.equal(result[6].lineEnd, true);
		});

		it('should split ZERO WIDTH SPACE character', function () {
			var result = textBreaker.getBreaks('first line\u200Bsecond line\u200Bthird line');
			assert.equal(result.length, 6);
		});

		it('should split basic Chinese text', function () {
			var result = textBreaker.getBreaks('起来！不愿做奴隶的人们！');
			assert.equal(result.length, 10);
		});

		it('should split Chinese text into lines if there are new-line chars', function () {
			var result = textBreaker.getBreaks('中华民族到了最危险的时候，\n每个人被迫着发出最后的吼声。\n起来！起来！起来！');
			assert.equal(result.length, 31);
		});

		it('should split an array of inline texts', function () {
			var arrayText = [
				{ text: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. ' },
				{ text: 'Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.' }
			];
			var result = textBreaker.getBreaks(arrayText);
			assert.equal(result.length, 52);
		});

		it('should support wordBreak break-all', function () {
			var result = textBreaker.getBreaks(sampleText, styleStackWordBreakBreakAll);
			assert.equal(result.length, 76);
		});

		it('should preserve supplementary Unicode characters with wordBreak break-all', function () {
			var result = textBreaker.getBreaks('A\u{1f600}\u{10400}B', styleStackWordBreakBreakAll);
			assert.deepEqual(result.map(item => item.text), ['A', '\u{1f600}', '\u{10400}', 'B']);
		});

		['\u{1f600}', '\u{10400}'].forEach(function (character) {
			[false, true].forEach(function (emptyFragment) {
				it('should preserve a split supplementary character with break-all, character=' + character + ', emptyFragment=' + emptyFragment, function () {
					var input = [{ text: 'A' + character[0], bold: true }];
					if (emptyFragment) {
						input.push({ text: '', fontSize: 24 });
					}
					input.push({ text: character[1] + 'B', italics: true });
					var result = textBreaker.getBreaks(input, styleStackWordBreakBreakAll);

					assert.equal(result.map(item => item.text).join(''), 'A' + character + 'B');
					assert.deepEqual(result.filter(item => item.text), [
						{ text: 'A', bold: true },
						{ text: character, bold: true },
						{ text: 'B', italics: true }
					]);
					if (emptyFragment) {
						assert.equal(result.find(item => item.fontSize === 24).text, '');
					}
				});
			});
		});

		['\n', '\r', '\r\n'].forEach(function (newline) {
			it('should preserve hard breaks with break-all for ' + JSON.stringify(newline), function () {
				var result = textBreaker.getBreaks('A' + newline + newline + '\u{1f600}' + newline, styleStackWordBreakBreakAll);
				assert.deepEqual(result, [
					{ text: 'A' },
					{ text: '', lineEnd: true },
					{ text: '', lineEnd: true },
					{ text: '\u{1f600}' },
					{ text: '', lineEnd: true }
				]);
			});
		});

		it('should support keep noWrap from style', function () {
			var result = textBreaker.getBreaks([{ text: 'very long text' }], styleStackNoWrap);
			assert.equal(result.length, 1);
		});

		it('should support disable noWrap in text', function () {
			var result = textBreaker.getBreaks([{ text: 'very long text', noWrap: false }], styleStackNoWrap);
			assert.equal(result.length, 3);
		});

		it('should support enable noWrap in text', function () {
			var result = textBreaker.getBreaks([{ text: 'very long text', noWrap: true }], styleStackWrap);
			assert.equal(result.length, 1);
		});

		it('should support not line break if is text inlines', function () {
			var arrayText = [
				{ text: 'Celestial Circle—' },
				{ text: 'The Faithful Ally' },
				{ text: ', ' },
				{ text: 'Gift of Knowledge' },
			];
			var result = textBreaker.getBreaks(arrayText);
			assert.equal(result.length, 10);
			assert.equal(result[5].text, 'Ally');
			assert.equal(result[5].noNewLine, true);
		});

		it('should support not line break if is text inlines as one word', function () {
			var arrayText = [
				{ text: 're' },
				{ text: 'mark' },
				{ text: 'able' }
			];
			var result = textBreaker.getBreaks(arrayText);
			assert.equal(result.length, 3);
			assert.equal(result[0].noNewLine, true);
			assert.equal(result[1].noNewLine, true);
		});

		it('should support line break if is text inlines and is new line on end', function () {
			var arrayText = [
				{ text: 'First line.\n' },
				{ text: 'Second line.' }
			];
			var result = textBreaker.getBreaks(arrayText);
			assert.equal(result.length, 4);
			assert.equal(result[1].lineEnd, true);
			assert.equal(result[1].noNewLine, undefined);
		});

		it('should support line break if is text inlines and is new line on begin', function () {
			var arrayText = [
				{ text: 'First line.' },
				{ text: '\nSecond line.' }
			];
			var result = textBreaker.getBreaks(arrayText);
			assert.equal(result.length, 5);
			assert.equal(result[1].noNewLine, true);
			assert.equal(result[2].lineEnd, true);
			assert.equal(result[2].noNewLine, undefined);
		});

		it('should support line break with noWrap', function () {
			var arrayText = [
				{ text: 'First line', noWrap: true },
				{ text: 'second line', noWrap: true }
			];

			var result = textBreaker.getBreaks(arrayText);
			assert.equal(result.length, 2);
			assert.equal(result[0].noNewLine, true);
			assert.equal(result[1].noNewLine, undefined);
		});

		it('should keep noWrap inlines together when the next inline begins with a space', function () {
			var arrayText = [
				{ text: 'First line', noWrap: true },
				{ text: ' Second line', noWrap: true }
			];

			var result = textBreaker.getBreaks(arrayText);
			assert.deepEqual(result, [
				{ text: 'First line', noWrap: true, noNewLine: true },
				{ text: ' Second line', noWrap: true }
			]);
		});

		it('should support plain strings', function () {
			var result = textBreaker.getBreaks(plainText);
			assert.equal(result.length, 6);
		});

		it('should support plain strings with new-lines', function () {
			var result = textBreaker.getBreaks(plainText);
			assert(result[3].lineEnd);
		});

		it('should support an array of plain strings', function () {
			var result = textBreaker.getBreaks(plainTextArray);
			assert.equal(result.length, 8);
		});

		it('should support an array of plain strings with new-lines', function () {
			var result = textBreaker.getBreaks(plainTextArray);
			assert.equal(result[5].lineEnd, true);
		});

		it('should support arrays with style definition', function () {
			var result = textBreaker.getBreaks(mixedTextArray);

			assert.equal(result.length, 8);
		});

		it('should keep style definitions after splitting new-lines', function () {
			var result = textBreaker.getBreaks(mixedTextArray);

			[0, 2, 3, 4, 5, 6].forEach(function (i) {
				assert.equal(result[i].bold, true);
			});

			assert(!result[1].bold);
		});

		it('should keep unknown style fields after splitting new-lines', function () {
			var result = textBreaker.getBreaks(mixedTextArrayWithUnknownStyleDefinitions);
			assert.equal(result.length, 8);
			assert.equal(result[5].unknownStyle, 123);
			assert.equal(result[6].unknownStyle, 123);
		});

		it('should preserve styles and prohibit breaks across empty fragments before a word joiner', function () {
			var result = textBreaker.getBreaks([
				{ text: 'AB', bold: true }, '', { text: '', fontSize: 24 }, '\uFEFFCD'
			]);

			assert.deepEqual(result.map(token => token.text), ['AB', '', '', '\uFEFFCD']);
			assert.equal(result[0].bold, true);
			assert.equal(result[2].fontSize, 24);
			result.slice(0, -1).forEach(token => assert.equal(token.noNewLine, true));
		});

		it('should preserve separate CR and LF breaks and their styles across fragments', function () {
			var result = textBreaker.getBreaks([
				{ text: 'A\r', bold: true }, { text: '\nB', italics: true }
			]);

			assert.deepEqual(result, [
				{ text: 'A', lineEnd: true, bold: true },
				{ text: '', lineEnd: true, italics: true },
				{ text: 'B', italics: true }
			]);
		});

		[
			{ text: ['A\r\nB'], normalized: ['A\nB'] },
			{ text: ['A\r', '\nB'], normalized: ['A\n', '\nB'] },
			{ text: ['A\r', '', '\nB'], normalized: ['A\n', '', '\nB'] },
			{ text: ['A\r', '\r\nB'], normalized: ['A\n', '\nB'] },
			{ text: ['A\r', '\r', '\nB'], normalized: ['A\n', '\n', '\nB'] },
			{ text: ['A\r\r', '\nB'], normalized: ['A\n\n', '\nB'] },
			{ text: ['A\r', '\n\nB'], normalized: ['A\n', '\n\nB'] },
			{ text: ['A\r', '\n', '\nB'], normalized: ['A\n', '\n', '\nB'] },
			{ text: ['A\r', 'B'], normalized: ['A\n', 'B'] }
		].forEach(function (testCase) {
			[styleStackWrap, styleStackNoWrap, styleStackWordBreakBreakAll].forEach(function (styleStack, mode) {
				it('should normalize CR and CRLF within each fragment, text=' + JSON.stringify(testCase.text) + ', mode=' + mode, function () {
					var input = testCase.text.map((text, index) => ({ text: text, color: index % 2 ? 'blue' : 'red' }));
					var normalized = testCase.normalized.map((text, index) => ({ text: text, color: index % 2 ? 'blue' : 'red' }));

					assert.deepEqual(textBreaker.getBreaks(input, styleStack), textBreaker.getBreaks(normalized, styleStack));
					assert.deepEqual(input.map(item => item.text), testCase.text);
				});
			});
		});

		it('should apply noWrap and break-all only to their original fragments', function () {
			var result = textBreaker.getBreaks([
				{ text: 'AB CD', noWrap: true }, { text: ' EF', wordBreak: 'break-all' }, ' GH'
			]);

			assert.deepEqual(result, [
				{ text: 'AB CD', noWrap: true, noNewLine: true },
				{ text: ' ', wordBreak: 'break-all' },
				{ text: 'E', wordBreak: 'break-all' },
				{ text: 'F', wordBreak: 'break-all' },
				{ text: ' ' },
				{ text: 'GH' }
			]);
		});

		['\n', '\r', '\r\n'].forEach(function (separator) {
			it('should preserve hard breaks and empty lines with noWrap for ' + JSON.stringify(separator), function () {
				var result = textBreaker.getBreaks('AB CD' + separator + separator + 'EF GH' + separator, styleStackNoWrap);

				assert.deepEqual(result, [
					{ text: 'AB CD', lineEnd: true },
					{ text: '', lineEnd: true },
					{ text: 'EF GH', lineEnd: true }
				]);
			});
		});

		it('should not wrap between adjacent styled noWrap fragments', function () {
			var result = textBreaker.getBreaks([{ text: 'AB ', bold: true }, '', { text: 'CD', italics: true }], styleStackNoWrap);

			assert.deepEqual(result, [
				{ text: 'AB ', bold: true, noNewLine: true },
				{ text: '', noNewLine: true },
				{ text: 'CD', italics: true }
			]);
		});

	});

});
