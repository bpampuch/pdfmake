'use strict';

var assert = require('assert');
var sinon = require('sinon');
var rewire = require('rewire');

function freshTextToolsModule() {
	delete require.cache[require.resolve('../../src/textTools')];
	return rewire('../../src/textTools');
}

describe('FlowAccount TextTools enhancements', function () {
	it('selects substitute font when default font misses glyphs', function () {
		var TextTools = freshTextToolsModule();
		var fakeFontkit = {
			openSync: sinon.stub().callsFake(function (path) {
				function makeFont(hasThaiGlyphs) {
					return {
						glyphsForString: function (text) {
							return text.split('').map(function (ch) {
								var isThai = /[\u0E00-\u0E7F]/.test(ch);
								var missing = isThai && !hasThaiGlyphs;
								return { id: missing ? 0 : 100 };
							});
						}
					};
				}

				if (path === 'roboto.ttf') {
					return makeFont(false);
				}
				if (path === 'thai.ttf') {
					return makeFont(true);
				}
				return null;
			})
		};

		TextTools.__set__('fontkit', fakeFontkit);
		TextTools.__set__('fontCacheName', '');
		TextTools.__set__('fontCache', null);
		TextTools.__set__('fontSubstituteCache', {});
		TextTools.__set__('defaultFont', 'Roboto');

		var provideFontSpy = sinon.spy(function () {
			return {
				widthOfString: function (text, size) {
					return text.length * size;
				},
				lineHeight: function (size) {
					return size;
				},
				ascender: 750,
				descender: -250
			};
		});

		var fontProvider = {
			fonts: {
				Roboto: { normal: 'roboto.ttf' },
				NotoSansThai: { normal: 'thai.ttf' }
			},
			provideFont: provideFontSpy
		};

		var textTools = new TextTools(fontProvider);

		textTools.buildInlines('สวัสดี');

		assert(provideFontSpy.called, 'font provider invoked');
		assert.strictEqual(provideFontSpy.firstCall.args[0], 'NotoSansThai', 'fallback font selected for Thai glyphs');
		assert.strictEqual(provideFontSpy.calledWith('Roboto'), false, 'default font skipped when glyphs missing');
	});

	it('keeps tokenizer exception terms intact', function () {
		var TextTools = freshTextToolsModule();
		var splitWords = TextTools.__get__('splitWords');

		var words = splitWords('(Thailand)');

		assert.strictEqual(words.length, 1, 'exception word remains single token');
		assert.strictEqual(words[0].text, '(Thailand)', 'token text preserved');
		assert.strictEqual(Boolean(words[0].lineEnd), false, 'exception token does not set lineEnd');
	});

	it('preserves explicit spaces when tokenizing Thai text', function () {
		var TextTools = freshTextToolsModule();
		var splitWords = TextTools.__get__('splitWords');

		var words = splitWords('สวัสดี ครับ');
		var tokens = words.map(function (item) { return item.text; });

		assert(tokens.indexOf(' ') > -1, 'space token retained between Thai words');
	});
});
