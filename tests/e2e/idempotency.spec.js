'use strict';
var debug = require('debug')('pdfmake');
var assert = require('assert');
var PdfPrinter = require('../../src/printer');
var fs = require('fs');

function readBytes(readStream) {
	var concat = require('concat-stream');
	return new Promise((resolve, reject) => {
		const merger = concat(bytes => {
			resolve(bytes);
		});
		readStream.on('error', error => {
			debug("error reading %s", error);
			reject(error);
		});
		readStream.pipe(merger);
		readStream.end();
	});
}

describe('End2End test: isomorphic rendering', function () {
	var fonts = {
		Roboto: {
			normal: 'tests/fonts/Roboto-Regular.ttf',
			bold: 'tests/fonts/Roboto-Medium.ttf',
			italics: 'tests/fonts/Roboto-Italic.ttf',
			bolditalics: 'tests/fonts/Roboto-MediumItalic.ttf'
		}
	};

	const expected = fs.readFileSync('tests/e2e/__TEST__/reference.pdf');
	it('renders exact same bytes if content and metadatas are the same', function (done) {
		var dd = {
			info: {
				creator: 'pdfmake',
				producer: 'pfdmake',
				creationDate: new Date('2020-01-01T00:00:00Z')
			},
			content: [
				'First paragraph',
				'Another paragraph, this time a little bit longer to make sure, this line will be divided into at least two lines'
			]
		};

		const printer = new PdfPrinter(fonts);
		const pdfDoc = printer.createPdfKitDocument(dd);
		readBytes(pdfDoc).then(actual => {
			fs.writeFileSync("tests/e2e/__TEST__/actual.pdf", actual);
			assert.equal(actual.toString(), expected.toString());
			done();
		}).catch(error => {
			done(error);
		});
	});
});
