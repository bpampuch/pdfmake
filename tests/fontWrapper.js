var assert = require('assert');
var _ = require('lodash');

var FontWrapper = require('../src/fontWrapper');
var PdfKit = require('pdfkit');

describe('FontWrapper', function() {
	var fontWrapper, pdfDoc;


  function getEncodedUnicodes(index, pdfDoc){
    return pdfDoc.font('Roboto (bolditalic)' + index)._font.subset.unicodes;
  }

	beforeEach(function() {
		pdfDoc = new PdfKit({ size: [ 595.28, 841.89 ], compress: false});
		fontWrapper = new FontWrapper(pdfDoc, 'examples/fonts/Roboto-Italic.ttf', 'Roboto (bolditalic)')
	});

	describe('encoding', function() {




		it('encodes text', function () {
			var encoded = fontWrapper.encode('Anna ');

      // A  n  n  a
      // 21 22 22 23 24
			assert.equal(encoded.encodedText, '2122222324');
			assert.equal(encoded.fontId, 'F1');
			assert.equal(pdfDoc._fontCount, 1);
      var encodedUnicodes = getEncodedUnicodes(0, pdfDoc);
      assert.equal(encodedUnicodes['A'.charCodeAt(0)], 33);
			assert.equal(encodedUnicodes['n'.charCodeAt(0)], 34);
			assert.equal(encodedUnicodes['a'.charCodeAt(0)], 35);
			assert.equal(encodedUnicodes[' '.charCodeAt(0)], 36);
		});

    it('encodes text and re-use characters', function () {
      fontWrapper.encode('Anna ');
      var encoded = fontWrapper.encode('na na AAA!');

      // A  n  n  a
      // 21 22 22 23 24

      // n  a     n  a     A  A  A  !
      // 22 23 24 22 23 24 21 21 21 25
      assert.equal(encoded.encodedText, '22232422232421212125');
      assert.equal(encoded.fontId, 'F1');
      assert.equal(pdfDoc._fontCount, 1);
      var encodedUnicodes = getEncodedUnicodes(0, pdfDoc);
      assert.equal(encodedUnicodes['A'.charCodeAt(0)], 33);
      assert.equal(encodedUnicodes['n'.charCodeAt(0)], 34);
      assert.equal(encodedUnicodes['a'.charCodeAt(0)], 35);
      assert.equal(encodedUnicodes[' '.charCodeAt(0)], 36);
      assert.equal(encodedUnicodes['!'.charCodeAt(0)], 37);
    });

    it('encodes in new font when old font is used', function () {
      var text = _.times(91, String.fromCharCode).join(''); // does not include a-z, includes 0-9 & A-Z
      fontWrapper.encode(text);
      var encoded = fontWrapper.encode('cannot');

      // c  a  n  n  o  t
      // 21 22 23 23 24 25
      assert.equal(encoded.encodedText, '212223232425');
      assert.equal(encoded.fontId, 'F2');
      assert.equal(pdfDoc._fontCount, 2);
      var encodedUnicodes = getEncodedUnicodes(1, pdfDoc);
      assert.equal(encodedUnicodes['c'.charCodeAt(0)], 33);
      assert.equal(encodedUnicodes['a'.charCodeAt(0)], 34);
      assert.equal(encodedUnicodes['n'.charCodeAt(0)], 35);
      assert.equal(encodedUnicodes['o'.charCodeAt(0)], 36);
      assert.equal(encodedUnicodes['t'.charCodeAt(0)], 37);
    });

    it('encodes NOT in new font when both unique character sets are equal', function () {
      var text1 = _.times(47, String.fromCharCode).join(''); // does not include a-z, includes 0-9 & A-Z
      fontWrapper.encode(text1);

      var text2 = _.times(47, String.fromCharCode).join(''); // does not include a-z, includes 0-9 & A-Z
      fontWrapper.encode(text2);

      assert.equal(pdfDoc._fontCount, 1);
      assert.equal(pdfDoc._font.id, 'F1');
      assert.equal(pdfDoc._font.name, 'Roboto-Italic');
    });

    it('use other font when it still has enough space', function () {
      var text1 = 'cannot',
          text2 = _.times(92, String.fromCharCode).join(''), // does not include a-z, includes 0-9 & A-Z
          text3 = 'This can work.';


      fontWrapper.encode(text1);
      fontWrapper.encode(text2);
      var encoded = fontWrapper.encode(text3);

      // c  a  n  n  o  t
      // 21 22 23 23 24 25

      // T  h  i  s     c  a  n     w  o  r  k  .
      // 26 27 28 29 2a 21 22 23 2a 2b 24 2c 2d 2e
      assert.equal(encoded.encodedText, '262728292a2122232a2b242c2d2e');
      assert.equal(encoded.fontId, 'F1');
      assert.equal(pdfDoc._fontCount, 2);
      var encodedUnicodes = getEncodedUnicodes(0, pdfDoc);
      assert.equal(encodedUnicodes['T'.charCodeAt(0)], 38);
      assert.equal(encodedUnicodes['h'.charCodeAt(0)], 39);
      assert.equal(encodedUnicodes['i'.charCodeAt(0)], 40);
      assert.equal(encodedUnicodes['s'.charCodeAt(0)], 41);
      assert.equal(encodedUnicodes[' '.charCodeAt(0)], 42);
    });

	});
});
