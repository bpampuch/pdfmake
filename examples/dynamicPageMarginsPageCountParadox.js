var pdfmake = require('../js/index'); // only during development, otherwise use the following line
//var pdfmake = require('pdfmake');

var Roboto = require('../fonts/Roboto');
pdfmake.addFonts(Roboto);

var marginCalls = [];
var lines = [];

for (var i = 0; i < 5; i++) {
	lines.push('Line ' + i + ' with some text to fill the page and change pagination.');
}

var docDefinition = {
	pageSize: 'A7',
	content: lines,
	pageMargins: function (currentPage, pageCount) {
		marginCalls.push({ currentPage: currentPage, pageCount: pageCount });

		// This is intentionally paradoxical: changing margins based on the assumed
		// total page count can change pagination, which changes pageCount again.
		if (pageCount % 2 === 1) {
			return { left: 40, bottom: 40, right: 40, top: 140 };
		}

		return { left: 40, bottom: 40, right: 40, top: 40 };
	}
};

var now = new Date();

var pdf = pdfmake.createPdf(docDefinition);
pdf.write('pdfs/dynamicPageMarginsPageCountParadox.pdf').then(function () {
	console.log(new Date() - now);
	console.log('pageMargins callback calls:', marginCalls.length);
	console.log(JSON.stringify(marginCalls, null, 2));
}, function (err) {
	console.error(err);
});
