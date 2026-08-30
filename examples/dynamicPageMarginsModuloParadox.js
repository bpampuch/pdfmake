var pdfmake = require('../js/index'); // only during development, otherwise use the following line
//var pdfmake = require('pdfmake');

var Roboto = require('../fonts/Roboto');
pdfmake.addFonts(Roboto);

var marginCalls = [];
var lines = [];

for (var i = 0; i < 3; i++) {
	lines.push('Line ' + i + ' with some text to fill the page and change pagination.');
}

var docDefinition = {
	pageSize: 'A7',
	content: lines,
	pageMargins: function (currentPage, pageCount) {
		marginCalls.push({ currentPage: currentPage, pageCount: pageCount });

		if (!pageCount) {
			return { left: 40, top: 40, right: 40, bottom: 40 };
		}

		// An intentionally paradoxical case with pageCount = 1 every page
		// satisfies currentPage % pageCount === 0, so the callback can flip the
		// document between one-page and two-page layouts across passes.
		if (currentPage % pageCount === 0) {
			return { left: 40, bottom: 40, right: 40, top: 140 };
		}

		return { left: 40, bottom: 40, right: 40, top: 40 };
	}
};

var now = new Date();

var pdf = pdfmake.createPdf(docDefinition);
pdf.write('pdfs/dynamicPageMarginsModuloParadox.pdf').then(function () {
	console.log(new Date() - now);
	console.log('pageMargins callback calls:', marginCalls.length);
	console.log(JSON.stringify(marginCalls, null, 2));
}, function (err) {
	console.error(err);
});
