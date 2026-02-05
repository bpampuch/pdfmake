var pdfmake = require('../js/index');
var Roboto = require('../fonts/Roboto');

pdfmake.addFonts(Roboto);

var loremIpsum = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. ';

// Generate long text to demonstrate column overflow
var longText = loremIpsum.repeat(6);

var docDefinition = {
	content: [
		{ text: 'Snaking Columns Demo', style: 'header' },
		{ text: 'The snakingColumns: true property allows content to flow from one column to the next on the same page, similar to newspaper layouts.', style: 'description' },
		' ',

		{
			columns: [
				{ text: longText, width: '*' },
				{ text: '', width: '*' }
			],
			columnGap: 30,
			// Enable snaking behavior
			snakingColumns: true
		},

		{ text: 'Content After Snaking Columns', style: 'subheader', margin: [0, 10, 0, 5] },
		{ text: 'This text correctly appears after the snaking columns section, demonstrating that the layout engine properly tracks the bottom position of content spanning multiple columns.', style: 'description' },
		' ',

		{ text: 'Comparison: Regular Columns', style: 'subheader' },
		{ text: 'Without snakingColumns, each column is independent. Content in column 1 stays in column 1, and content in column 2 stays in column 2.', style: 'description' },
		' ',
		{
			columns: [
				{ text: loremIpsum },
				{ text: 'This is separate content in column 2. It does not receive overflow from column 1.', bold: true }
			],
			columnGap: 20
		}
	],
	styles: {
		header: {
			fontSize: 22,
			bold: true,
			marginBottom: 10
		},
		subheader: {
			fontSize: 16,
			bold: true,
			marginTop: 15,
			marginBottom: 5
		},
		description: {
			fontSize: 11,
			italics: true,
			color: '#555',
			marginBottom: 5
		}
	}
};

var pdf = pdfmake.createPdf(docDefinition);
pdf.write('pdfs/snaking_columns.pdf').then(() => {
	console.log('PDF saved to pdfs/snaking_columns.pdf');
});
