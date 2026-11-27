'use strict';

var assert = require('assert');
var PdfMake = require('../../js/index').constructor;

describe('Integration test: attachments in static headers and footers', function () {
	['header', 'footer'].forEach(function (location) {
		[false, true].forEach(function (section) {
			['static-buffer', 'dynamic-buffer', 'static-data'].forEach(function (mode) {
				it('embeds ' + mode + ' in ' + (section ? 'section ' : '') + location + ' on every page', async function () {
					var pdfmake = new PdfMake();
					pdfmake.addFonts({ Roboto: { normal: 'fonts/Roboto/Roboto-Regular.ttf' } });
					pdfmake.setLocalAccessPolicy(() => true);
					pdfmake.setUrlAccessPolicy(() => false);
					var payload = Buffer.from([0, 1, 2, 10, 13, 72, 101, 108, 108, 111, 255]);
					function makeAttachment() {
						return {
							attachment: { src: mode === 'static-data' ? 'data:application/octet-stream;base64,' + payload.toString('base64') : Buffer.from(payload), name: 'hello.bin' },
							icon: 'Paperclip', width: 12, height: 18
						};
					}
					var repeatable = mode === 'dynamic-buffer' ? () => makeAttachment() : makeAttachment();
					var content = [{ text: 'P1' }, { text: 'P2', pageBreak: 'before' }, { text: 'P3', pageBreak: 'before' }];
					var definition = { pageSize: 'A6', compress: false };
					if (section) {
						definition.content = [{ section: content, [location]: repeatable }];
					} else {
						definition.content = content;
						definition[location] = repeatable;
					}
					var buffer = await pdfmake.createPdf(definition).getBuffer();
					var pdf = buffer.toString('latin1');
					assert.equal((pdf.match(/\/Type \/Page\b/g) || []).length, 3);
					assert.equal((pdf.match(/\/Subtype \/FileAttachment\b/g) || []).length, 3);
					var embedded = Array.from(pdf.matchAll(/<<(?:(?!>>)[\s\S])*\/Type \/EmbeddedFile\b(?:(?!>>\s*stream)[\s\S])*?>>\s*stream\r?\n([\s\S]*?)\r?\nendstream/g), match => Buffer.from(match[1], 'latin1'));
					assert(embedded.length > 0);
					embedded.forEach(data => assert.deepEqual(data, payload));
					if (mode === 'static-buffer') {
						assert(Buffer.isBuffer(repeatable.attachment.src));
						assert.deepEqual(repeatable.attachment.src, payload);
						assert.equal(repeatable.x, undefined);
						assert.equal(repeatable.y, undefined);
					}
				});
			});
		});
	});
});
