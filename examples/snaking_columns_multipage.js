var pdfmake = require('../js/index');
var Roboto = require('../fonts/Roboto');

pdfmake.addFonts(Roboto);

var loremIpsum = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. ';

// Generate text long enough to fill multiple pages (approx 25 paragraphs)
var veryLongText = loremIpsum.repeat(25);

var docDefinition = {
	content: [
		{ text: 'Multi-Page Snaking Columns Demo', style: 'header' },
		{ text: 'This example demonstrates snaking columns with 3 and 5 columns overflowing across multiple pages.', style: 'description' },
		' ',

		{ text: '3 Columns Snaking Across Pages', style: 'subheader' },
		{ text: 'Content flows: Col 1 -> Col 2 -> Col 3 -> Next Page Col 1...', style: 'small' },
		' ',

		{
			columns: [
				{ text: veryLongText, fontSize: 10, width: '*' },
				{ text: '', width: '*' },
				{ text: '', width: '*' }
			],
			columnGap: 30,
			snakingColumns: true
		},

		{ text: 'End of 3-column section', pageBreak: 'before', style: 'subheader' },

		{ text: '5 Columns Snaking Across Pages', style: 'subheader' },
		{ text: 'Content flows: Col 1 -> 2 -> 3 -> 4 -> 5 -> Next Page Col 1...', style: 'small' },
		' ',

		{
			columns: [
				{ text: veryLongText, fontSize: 8, width: '*' },
				{ text: '', width: '*' },
				{ text: '', width: '*' },
				{ text: '', width: '*' },
				{ text: '', width: '*' }
			],
			columnGap: 20,
			snakingColumns: true
		},

		{ text: '2 Columns Snaking Across Multiple Pages', pageBreak: 'before', style: 'subheader' },
		{ text: '2 columns filling ~3 pages.', style: 'small' },

		{
			columns: [
				{ text: veryLongText.repeat(2), fontSize: 12, width: '*' },
				{ text: '', width: '*' }
			],
			columnGap: 30,
			snakingColumns: true
		},

		{ text: 'A5 Page Size Snaking', pageBreak: 'before', pageSize: 'A5', style: 'subheader' },
		{ text: 'This page and subsequent ones should be A5 size.', style: 'small' },

		{
			columns: [
				{ text: veryLongText, fontSize: 10, width: '*' },
				{ text: '', width: '*' }
			],
			columnGap: 30,
			snakingColumns: true
		},

		{ text: 'Landscape Orientation', pageBreak: 'before', pageOrientation: 'landscape', style: 'subheader' },
		{ text: 'This page should be Landscape A4.', style: 'small' },

		{
			columns: [
				{ text: veryLongText, fontSize: 12, width: '*' },
				{ text: '', width: '*' },
				{ text: '', width: '*' }
			],
			columnGap: 30,
			snakingColumns: true
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
		},
		small: {
			fontSize: 9,
			color: '#777',
			marginBottom: 10
		}
	}
};

var pdf = pdfmake.createPdf(docDefinition);
pdf.write('pdfs/snaking_columns_multipage.pdf').then(() => {
	console.log('PDF saved to pdfs/snaking_columns_multipage.pdf');
});
