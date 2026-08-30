/*eslint no-unused-vars: ["error", {"args": "none"}]*/

var pdfmake = require('../js/index'); // only during development, otherwise use the following line
//var pdfmake = require('pdfmake');

var Roboto = require('../fonts/Roboto');
pdfmake.addFonts(Roboto);

pdfmake.setUrlAccessPolicy((url) => {
	// this can be used to restrict allowed domains
	return url.startsWith('https://');
});

var loremIpsum = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. ';

var docDefinition = {
	// Stable usage: page-local rules based on currentPage do not feed pagination
	// back into the callback, so layout converges naturally.
	pageMargins: function(currentPage, pageCount, pageSize) {
		return {
			left: (currentPage % 2 === 0) ? 80 : 40,
			top: 40,
			right: (currentPage % 2 === 0) ? 40 : 80,
			bottom: 40
		};
	},
	content: [
		{ text: loremIpsum.repeat(42) },
		'',
		'Table:',
		{
			table: {
				body: [
					[{ text: 'Header 1', style: 'tableHeader' }, { text: 'Header 2', style: 'tableHeader' }, { text: 'Header 3', style: 'tableHeader' }],
					[
						loremIpsum.repeat(4),
						loremIpsum.repeat(4),
						loremIpsum.repeat(4),
					]
				]
			}
		},
		'',
		'Table width headerRows:',
		{
			table: {
				headerRows: 1,
				body: [
					[{ text: 'Header 1', style: 'tableHeader' }, { text: 'Header 2', style: 'tableHeader' }, { text: 'Header 3', style: 'tableHeader' }],
					[
						loremIpsum.repeat(6),
						loremIpsum.repeat(6),
						loremIpsum.repeat(6),
					]
				]
			}
		}
	]
};

var now = new Date();

var pdf = pdfmake.createPdf(docDefinition);
pdf.write('pdfs/dynamicPageMargins.pdf').then(() => {
	console.log(new Date() - now);
}, err => {
	console.error(err);
});
