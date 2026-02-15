/**
 * Example demonstrating headerRows inside snaking columns.
 * A table with headerRows: 1 flows across two snaking columns,
 * and the header row is automatically repeated at the top of
 * each column and each new page.
 */

var pdfmake = require('../js/index');
var Roboto = require('../fonts/Roboto');

pdfmake.addFonts(Roboto);

// Build a table with a header row and 200 data rows
var tableBody = [];

// Header row
tableBody.push([
	{ text: '#', bold: true, fillColor: '#4472C4', color: '#ffffff', alignment: 'center' },
	{ text: 'Product Name', bold: true, fillColor: '#4472C4', color: '#ffffff' },
	{ text: 'Price', bold: true, fillColor: '#4472C4', color: '#ffffff', alignment: 'center' }
]);

// Fixed prices for consistent output
var prices = [
	19.99, 24.50, 12.75, 45.00, 8.25, 33.99, 67.50, 15.00, 29.99, 42.25,
	18.75, 55.00, 9.99, 38.50, 22.00, 71.25, 14.50, 48.99, 6.75, 31.00
];

for (var i = 1; i <= 200; i++) {
	var price = prices[(i - 1) % prices.length];
	var fillColor = i % 2 === 0 ? '#D9E2F3' : null;
	tableBody.push([
		{ text: String(i), alignment: 'center', fillColor: fillColor },
		{ text: 'Product ' + i, fillColor: fillColor },
		{ text: '$' + price.toFixed(2), alignment: 'center', fillColor: fillColor }
	]);
}

var docDefinition = {
	content: [
		{ text: 'Snaking Columns with Table headerRows', style: 'header' },
		{
			text: 'Baseline example: headerRows is supported inside snaking columns. ' +
				'The table header (blue row) repeats at the top of each column/page, without any keep-with-header constraint.',
			style: 'description'
		},
		' ',

		{
			columns: [
				{
					table: {
						headerRows: 1,
						widths: [30, '*', 50],
						body: tableBody
					},
					layout: 'lightHorizontalLines',
					width: '*'
				},
				{ text: '', width: '*' }
			],
			columnGap: 30,
			snakingColumns: true
		},

		{ text: 'Content After Table', style: 'subheader', margin: [0, 10, 0, 5] },
		{ text: 'This text appears after the snaking columns, confirming proper layout tracking.', style: 'description' }
	],
	pageMargins: [40, 40, 40, 40],
	styles: {
		header: {
			fontSize: 18,
			bold: true,
			marginBottom: 10
		},
		subheader: {
			fontSize: 14,
			bold: true
		},
		description: {
			fontSize: 10,
			italics: true,
			color: '#666',
			marginBottom: 5
		}
	}
};

var now = new Date();

var pdf = pdfmake.createPdf(docDefinition);
pdf.write('pdfs/snaking_columns_table_headerRows.pdf').then(() => {
	console.log(new Date() - now);
}, err => {
	console.error(err);
});
