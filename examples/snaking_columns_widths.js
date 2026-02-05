/**
 * Example demonstrating snaking columns with different widths.
 * This shows how content flows between columns of varying sizes.
 */

var pdfmake = require('../js/index');
var Roboto = require('../fonts/Roboto');

pdfmake.addFonts(Roboto);

var loremIpsum = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. ';
var longText = loremIpsum.repeat(15);
// Longer text specifically for Example 2 to ensure overflow and snaking behavior
var longerText = loremIpsum.repeat(42); //normal demonstration amount (reverted)

var docDefinition = {
	content: [
		{ text: 'Snaking Columns with Different Widths', style: 'header' },
		' ',

		{ text: 'Example 1: Narrow Left Column (200pt) + Wide Right Column (*)', style: 'subheader' },
		{ text: 'Content starts in the narrow column and overflows to the wider column.', style: 'description' },
		' ',

		{
			columns: [
				{ text: longText, width: 200, fontSize: 10 },
				{ text: '', width: '*' }
			],
			columnGap: 30,
			snakingColumns: true
		},

		{ text: 'Example 2: Wide Left Column (350pt) + Narrow Right Column (*)', style: 'subheader', pageBreak: 'before' },
		{ text: 'Content starts in the wide column and overflows to the remaining space.', style: 'description' },
		' ',

		{
			columns: [
				{ text: longerText, width: 350, fontSize: 10 },
				{ text: '', width: '*' }
			],
			columnGap: 30,
			snakingColumns: true
		},

		{ text: 'Example 3: Three Columns with Mixed Widths', style: 'subheader', pageBreak: 'before' },
		{ text: 'Content flows through three columns: 150pt, *, and 100pt.', style: 'description' },
		' ',

		{
			columns: [
				{ text: longText, width: 150, fontSize: 9 },
				{ text: '', width: '*' },
				{ text: '', width: 100 }
			],
			columnGap: 20,
			snakingColumns: true
		}
	],
	styles: {
		header: {
			fontSize: 18,
			bold: true,
			marginBottom: 10
		},
		subheader: {
			fontSize: 14,
			bold: true,
			marginTop: 10,
			marginBottom: 5
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
pdf.write('pdfs/snaking_columns_widths.pdf').then(function () {
	console.log('PDF saved to pdfs/snaking_columns_widths.pdf');
});
