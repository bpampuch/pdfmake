/**
 * Example demonstrating keepWithHeaderRows inside snaking columns.
 * A table with headerRows: 1 and keepWithHeaderRows: 2 flows across
 * two snaking columns. The header row plus the next two data rows are
 * kept together — if there isn't enough space for all three, the engine
 * moves to the next column (or page) before rendering them.
 */

var pdfmake = require('../js/index');
var Roboto = require('../fonts/Roboto');

pdfmake.addFonts(Roboto);

// Build a table with a header row and 180 data rows
var tableBody = [];

// Header row
tableBody.push([
	{ text: 'ID', bold: true, fillColor: '#548235', color: '#ffffff', alignment: 'center' },
	{ text: 'Item Description', bold: true, fillColor: '#548235', color: '#ffffff' },
	{ text: 'Qty', bold: true, fillColor: '#548235', color: '#ffffff', alignment: 'center' }
]);

for (var i = 1; i <= 180; i++) {
	var qty = ((i * 7) % 50) + 1;
	var fillColor = i % 2 === 0 ? '#E2EFDA' : null;
	var itemText = 'Item description for row ' + i;
	if (i % 7 === 0) {
		itemText += '\n(extra details to increase row height)';
	}
	tableBody.push([
		{ text: String(i), alignment: 'center', fillColor: fillColor },
		{ text: itemText, fillColor: fillColor },
		{ text: String(qty), alignment: 'center', fillColor: fillColor }
	]);
}

var docDefinition = {
	content: [
		{ text: 'Snaking Columns with keepWithHeaderRows', style: 'header' },
		{
			text: 'This example demonstrates keepWithHeaderRows inside snaking columns. ' +
				'Compared with the baseline headerRows example, this one uses variable/taller rows so the effect is visible. ' +
				'When there is not enough room for the header plus kept rows, flow moves earlier to the next column/page.',
			style: 'description'
		},
		' ',

		{
			columns: [
				{
					table: {
						headerRows: 1,
						keepWithHeaderRows: 2,
						heights: function (rowIndex) {
							if (rowIndex === 0) return 24;
							return rowIndex % 7 === 0 ? 30 : 20;
						},
						widths: [30, '*', 30],
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
		{ text: 'This text appears after the snaking columns.', style: 'description' }
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
pdf.write('pdfs/snaking_columns_table_keepWithHeaderRows.pdf').then(() => {
	console.log(new Date() - now);
}, err => {
	console.error(err);
});
