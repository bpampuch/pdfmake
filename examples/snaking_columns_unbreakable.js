/**
 * Example demonstrating unbreakable blocks inside snaking columns.
 * This shows how unbreakable content is preserved when flowing between columns.
 */

var pdfmake = require('../js/index');
var Roboto = require('../fonts/Roboto');

pdfmake.addFonts(Roboto);

// Generate unbreakable card blocks
var cards = [];
for (var i = 1; i <= 25; i++) {
	cards.push({
		stack: [
			{ text: 'Card ' + i, fontSize: 14, bold: true, margin: [0, 0, 0, 5] },
			{ text: 'This is a description for card ' + i + '. All content in this card stays together as an unbreakable unit.', fontSize: 10 },
			{ text: 'Status: Active', fontSize: 9, color: '#666', margin: [0, 5, 0, 0] }
		],
		margin: [0, 0, 0, 10],
		fillColor: '#f9f9f9',
		padding: 10,
		unbreakable: true // This ensures the entire card stays together
	});
}

var docDefinition = {
	content: [
		{ text: 'Unbreakable Cards in Snaking Columns', style: 'header' },
		{ text: 'Each card is marked as unbreakable, ensuring it stays together when flowing between columns.', style: 'description' },
		' ',

		{
			columns: [
				{
					stack: cards
				},
				{ text: '' }
			],
			columnGap: 30,
			snakingColumns: true
		},

		{ text: 'End of Cards', style: 'subheader', margin: [0, 10, 0, 5] },
		{ text: 'All cards remained intact while flowing across columns.', style: 'description' }
	],
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
pdf.write('pdfs/snaking_columns_unbreakable.pdf').then(() => {
	console.log(new Date() - now);
}, err => {
	console.error(err);
});
