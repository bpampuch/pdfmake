const assert = require('assert');

const TextBreaker = require('../../js/textBreaker').default;

describe('TextBreaker', function () {

	var textBreaker = new TextBreaker();

	var sampleText = 'Przyklad, bez nowych linii,   ale !!!! rozne!!!konstrukcje i ..blablablabla.';
	var sampleText2 = 'Przyklad, z nowy\nmi liniami\n, \n \n  ale\n\n !!!! rozne!!!konstrukcje i ..blablablabla.';

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

		// TODO: Tests for line break in text array

	});

});
