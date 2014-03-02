var assert = require('assert');

var pdfMake = require('../src/layout.js');
var PageElementWriter = pdfMake.PageElementWriter;

describe('PageElementWriter', function() {
	var man;
	var pages;
	var context;

	beforeEach(function() {
		pages = [];
		//TODO:
		context = {};

		man = new PageElementWriter({ width: 400, height: 800 }, { left: 40, right: 40, top: 60, bottom: 60 }, pages, context);
	});

	// describe('')
});
