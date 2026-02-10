/**
 * Example demonstrating snaking columns with different columnGap values.
 * This shows how the gap between columns affects layout.
 */

var pdfmake = require('../js/index');
var Roboto = require('../fonts/Roboto');

pdfmake.addFonts(Roboto);

var loremIpsum = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. ';
var mediumText = loremIpsum.repeat(24);

var docDefinition = {
	content: [
		{ text: 'Snaking Columns with Different Column Gaps', style: 'header' },
		' ',

		{ text: 'Example 1: No Gap (columnGap: 0)', style: 'subheader' },
		{ text: 'Columns are adjacent with no space between them.', style: 'description' },
		' ',

		{
			columns: [
				{ text: mediumText, fontSize: 10 },
				{ text: '', width: '*' }
			],
			columnGap: 0,
			snakingColumns: true
		},

		{ text: 'Example 2: Small Gap (columnGap: 10)', style: 'subheader', pageBreak: 'before' },
		{ text: 'A minimal 10pt gap between columns.', style: 'description' },
		' ',

		{
			columns: [
				{ text: mediumText, fontSize: 10 },
				{ text: '', width: '*' }
			],
			columnGap: 10,
			snakingColumns: true
		},

		{ text: 'Example 3: Default Gap (columnGap: 30)', style: 'subheader', pageBreak: 'before' },
		{ text: 'Standard 30pt gap - good for readability.', style: 'description' },
		' ',

		{
			columns: [
				{ text: mediumText, fontSize: 10 },
				{ text: '', width: '*' }
			],
			columnGap: 30,
			snakingColumns: true
		},

		{ text: 'Example 4: Large Gap (columnGap: 60)', style: 'subheader', pageBreak: 'before' },
		{ text: 'A wide 60pt gap creates strong visual separation.', style: 'description' },
		' ',

		{
			columns: [
				{ text: mediumText, fontSize: 10 },
				{ text: '', width: '*' }
			],
			columnGap: 60,
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

var now = new Date();

var pdf = pdfmake.createPdf(docDefinition);
pdf.write('pdfs/snaking_columns_gap.pdf').then(() => {
	console.log(new Date() - now);
}, err => {
	console.error(err);
});
