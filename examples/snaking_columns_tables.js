/**
 * Example demonstrating product catalog with snaking columns.
 * Content flows from column 1 to column 2, then to next page.
 *
 * NOTE: Tables with snaking columns have known rendering issues due to
 * how table borders/lines are positioned. This example uses a simple
 * text-based layout that works reliably with snaking columns.
 */

var pdfmake = require('../js/index');
var Roboto = require('../fonts/Roboto');

pdfmake.addFonts(Roboto);

// Use fixed prices for consistent output
var prices = [
	19.99, 24.50, 12.75, 45.00, 8.25, 33.99, 67.50, 15.00, 29.99, 42.25,
	18.75, 55.00, 9.99, 38.50, 22.00, 71.25, 14.50, 48.99, 6.75, 31.00,
	25.99, 59.50, 11.25, 36.00, 19.75, 64.99, 13.00, 41.50, 7.99, 28.25,
	23.50, 52.75, 10.00, 34.99, 20.50, 68.25, 16.75, 44.00, 8.50, 30.99,
	26.25, 57.00, 12.50, 39.75, 21.00, 66.50, 15.25, 46.99, 9.25, 32.50
];

var pageMargins = [40, 40, 40, 40];
var columnGap = 30;
var pageWidth = 595.28; // A4 width in points
var columnWidth = (pageWidth - pageMargins[0] - pageMargins[2] - columnGap) / 2;

function buildRow(product, price, isHeader) {
	var row = {
		columns: [
			{ width: '*', text: product, style: isHeader ? 'tableHeader' : undefined },
			{ width: 60, text: price, alignment: 'right', style: isHeader ? 'tableHeader' : undefined }
		],
		columnGap: 10
	};

	var divider = {
		canvas: [
			{ type: 'line', x1: 0, y1: 0, x2: columnWidth, y2: 0, lineWidth: 0.5, lineColor: '#cccccc' }
		],
		margin: [0, 2, 0, 2]
	};

	return [row, divider];
}

var catalogStack = [];

catalogStack = catalogStack.concat(buildRow('Product', 'Price', true));

for (var i = 1; i <= 50; i++) {
	catalogStack = catalogStack.concat(buildRow('Product ' + i, '$' + prices[i - 1].toFixed(2), false));
}

var docDefinition = {
	content: [
		{ text: 'Snaking Columns with Tables - Product Catalog', style: 'header' },
		{ text: 'This catalog flows from column 1 to column 2, demonstrating snaking behavior with product data.', style: 'description' },
		' ',

		{
			columns: [
				{
					width: '*',
					stack: catalogStack
				},
				{ text: '', width: '*' }
			],
			columnGap: columnGap,
			snakingColumns: true
		},

		{ text: 'Content After Catalog', style: 'subheader', margin: [0, 10, 0, 5] },
		{ text: 'This text appears after the snaking columns.', style: 'description' }
	],
	pageMargins: pageMargins,
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
		tableHeader: {
			bold: true,
			fontSize: 11
		},
		description: {
			fontSize: 10,
			italics: true,
			color: '#666',
			marginBottom: 5
		}
	}
};

var pdf = pdfmake.createPdf(docDefinition);
pdf.write('pdfs/snaking_columns_tables.pdf').then(function () {
	console.log('PDF saved to pdfs/snaking_columns_tables.pdf');
});
