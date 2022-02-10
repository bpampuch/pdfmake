'use strict';

var assert = require('assert');

var FontProvider = require('../src/fontProvider');

describe('FontProvider', function () {
	var fontProvider, fontDefinitions, pdfDoc;

	beforeEach(function () {
		fontDefinitions = {};
		pdfDoc = {};
		fontProvider = new FontProvider(fontDefinitions, pdfDoc);
	});

	describe('provideFont', function () {

		it('throws error when given font not present', function () {
			assert.throws(function () {
				fontProvider.provideFont('Arial', true, false);
			}, function (error) {
				assert.equal(error.message, 'Font \'Arial\' in style \'bold\' is not defined in the font section of the document definition.');
				return true;
			});
		});

	});
});
