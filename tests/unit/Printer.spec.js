var assert = require('assert');
var sinon = require('sinon');

var PDFDocument = require('../../js/PDFDocument').default;
var Printer = require('../../js/Printer').default;

describe('Printer', function () {
	var SHORT_SIDE = 1000;
	var LONG_SIDE = 2000;
	var printer;

	beforeEach(function () {
		PDFDocument.prototype.addPage = sinon.spy(PDFDocument.prototype.addPage);

		var fonts = {
			Roboto: {
				normal: 'fonts/Roboto-Regular.ttf',
				bold: 'fonts/Roboto-Medium.ttf',
				italics: 'fonts/Roboto-Italic.ttf',
				bolditalics: 'fonts/Roboto-MediumItalic.ttf'
			}
		};
		printer = new Printer(fonts);
	});

	it('should pass switched width and height to printer if page orientation changes from default portrait to landscape', function () {
		var docDefinition = {
			pageSize: { width: SHORT_SIDE, height: LONG_SIDE },
			content: [
				{
					text: 'Page 1'
				},
				{
					text: 'Page 2',
					pageBreak: 'before',
					pageOrientation: 'landscape'
				}
			]
		};
		printer.print(docDefinition);

		assert(PDFDocument.prototype.addPage.callCount === 2);

		assert.equal(PDFDocument.prototype.addPage.firstCall.args[0], undefined);
		assert.deepEqual(PDFDocument.prototype.addPage.secondCall.args[0].size, [LONG_SIDE, SHORT_SIDE]);
	});

	it('should pass switched width and height to printer if page orientation changes from portrait to landscape', function () {
		var docDefinition = {
			pageOrientation: 'portrait',
			pageSize: { width: SHORT_SIDE, height: LONG_SIDE },
			content: [
				{
					text: 'Page 1'
				},
				{
					text: 'Page 2',
					pageBreak: 'before',
					pageOrientation: 'landscape'
				}
			]
		};
		printer.print(docDefinition);

		assert(PDFDocument.prototype.addPage.callCount === 2);

		assert.equal(PDFDocument.prototype.addPage.firstCall.args[0], undefined);
		assert.deepEqual(PDFDocument.prototype.addPage.secondCall.args[0].size, [LONG_SIDE, SHORT_SIDE]);
	});

	it('should pass switched width and height to printer if page orientation changes from landscape to portrait', function () {
		var docDefinition = {
			pageOrientation: 'landscape',
			pageSize: { width: SHORT_SIDE, height: LONG_SIDE },
			content: [
				{
					text: 'Page 1'
				},
				{
					text: 'Page 2',
					pageBreak: 'before',
					pageOrientation: 'portrait'
				},
				{
					text: 'Page 3 still portrait',
					pageBreak: 'before'
				}
			]
		};
		printer.print(docDefinition);

		assert(PDFDocument.prototype.addPage.callCount === 3);

		assert.equal(PDFDocument.prototype.addPage.firstCall.args[0], undefined);
		assert.deepEqual(PDFDocument.prototype.addPage.secondCall.args[0].size, [SHORT_SIDE, LONG_SIDE]);
		assert.deepEqual(PDFDocument.prototype.addPage.thirdCall.args[0].size, [SHORT_SIDE, LONG_SIDE]);
	});

	it('should not switch width and height for printer if page orientation changes from landscape to landscape', function () {
		var docDefinition = {
			pageOrientation: 'portrait',
			pageSize: { width: SHORT_SIDE, height: LONG_SIDE },
			content: [
				{
					text: 'Page 1'
				},
				{
					text: 'Page 2',
					pageBreak: 'before',
					pageOrientation: 'landscape'
				},
				{
					text: 'Page 3 landscape again',
					pageOrientation: 'landscape',
					pageBreak: 'after'
				}
			]
		};
		printer.print(docDefinition);

		assert.equal(PDFDocument.prototype.addPage.callCount, 3);

		assert.equal(PDFDocument.prototype.addPage.firstCall.args[0], undefined);
		assert.deepEqual(PDFDocument.prototype.addPage.secondCall.args[0].size, [LONG_SIDE, SHORT_SIDE]);
		assert.deepEqual(PDFDocument.prototype.addPage.thirdCall.args[0].size, [LONG_SIDE, SHORT_SIDE]);
	});

	it('should print only the require number of pages', function () {
		var docDefinition = {
			pageSize: 'A4',
			maxPagesNumber: 1,
			content: [
				{
					text: 'Page 1'
				},
				{
					text: 'Page 2',
					pageBreak: 'before',
					pageOrientation: 'landscape'
				}]
		};

		printer.print(docDefinition);

		assert(PDFDocument.prototype.addPage.callCount === 1);
	});

	it('should print all pages when maxPagesNumber is undefined', function () {
		var docDefinition = {
			pageSize: 'A4',
			content: [
				{
					text: 'Page 1'
				},
				{
					text: 'Page 2',
					pageBreak: 'before',
					pageOrientation: 'landscape'
				},
				{
					text: 'Page 3',
					pageBreak: 'before',
				}]
		};

		printer.print(docDefinition);

		assert(PDFDocument.prototype.addPage.callCount === 3);
	});

	// TODO

});
