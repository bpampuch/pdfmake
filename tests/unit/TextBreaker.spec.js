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

		it.skip('should support no line break if is text inlines and is space on begin', function () {
			var arrayText = [
				{ text: 'First line', noWrap: true },
				{ text: ' Second line', noWrap: true }
			];

			// TODO: Fix a test.

			var result = textBreaker.getBreaks(arrayText);
			assert.equal(result.length, 2);
			assert.equal(result[0].noNewLine, undefined);
			assert.equal(result[1].noNewLine, undefined);
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

	});

});
