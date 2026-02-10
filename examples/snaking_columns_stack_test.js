var pdfmake = require('../js/index');
var Roboto = require('../fonts/Roboto');

pdfmake.addFonts(Roboto);

function generateItems(count) {
	var items = [];
	for (var i = 1; i <= count; i++) {
		items.push({ text: 'Item ' + i + ' - A description', margin: [0, 5, 0, 5] });
	}
	return items;
}

var docDefinition = {
	content: [
		{ text: 'Snaking Columns Stack Test', style: 'header', margin: [0, 0, 0, 20] },
		{
			columns: [
				{
					// Stack of items to test splitting across columns
					stack: generateItems(100),
					width: '*'
				},
				{ text: '', width: '*' }
			],
			columnGap: 20,
			snakingColumns: true
		}
	],
	styles: {
		header: {
			fontSize: 18,
			bold: true
		}
	}
};

var now = new Date();

var pdf = pdfmake.createPdf(docDefinition);
pdf.write('pdfs/snaking_columns_stack_test.pdf').then(() => {
	console.log(new Date() - now);
}, err => {
	console.error(err);
});
