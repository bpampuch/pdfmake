var pdfmake = require('../js/index'); // only during development, otherwise use the following line
//var pdfmake = require('pdfmake');

var Roboto = require('../fonts/Roboto');
pdfmake.addFonts(Roboto);


var ct = [];

ct.push({ text: 'Highlighted text', fontSize: 18, background: 'yellow' });
ct.push(' ');
ct.push({
	columns: [
		{ text: 'Underline decoration', decoration: 'underline' },
		{ text: 'Line Through decoration', decoration: 'lineThrough' },
		{ text: 'Overline decoration', decoration: 'overline' }
	]
});
ct.push(' ');
ct.push({
	columns: [
		{ text: 'Dashed style', decoration: 'underline', decorationStyle: 'dashed' },
		{ text: 'Dotted style', decoration: 'underline', decorationStyle: 'dotted' },
		{ text: 'Double style', decoration: 'underline', decorationStyle: 'double' },
		{ text: 'Wavy style', decoration: 'underline', decorationStyle: 'wavy' }
	]
});
ct.push(' ');
ct.push({
	columns: [
		{ text: 'Using colors', decoration: 'underline', decorationColor: 'blue' },
		{ text: 'Using colors', decoration: 'lineThrough', decorationColor: 'red' },
		{ text: 'Using colors', decoration: 'underline', decorationStyle: 'wavy', decorationColor: 'green' }
	]
});
ct.push(' ');
ct.push({
	columns: [
		{ text: 'Dashed style', decoration: 'underline', decorationStyle: 'dashed', decorationThickness: 3 },
		{ text: 'Dotted style', decoration: 'underline', decorationStyle: 'dotted', decorationThickness: 3 },
		{ text: 'Double style', decoration: 'underline', decorationStyle: 'double', decorationThickness: 3 },
		{ text: 'Wavy style', decoration: 'underline', decorationStyle: 'wavy', decorationThickness: 3 }
	]
});

ct.push('');

ct.push(
	{
		text: [
			'Some text with',
			{
				text: 'superscript ',
				sup: true,
				decoration: 'lineThrough'
			},
			'and with',
			{
				text: 'subscript',
				sub: true,
				decoration: 'lineThrough'
			},
		]
	});

ct.push('');

ct.push(
	{
		text: [
			'Some text with',
			{
				text: 'superscript ',
				sup: true,
				decoration: 'underline'
			},
			'and with',
			{
				text: 'subscript',
				sub: true,
				decoration: 'underline'
			},
		]
	});

var docDefinition = {
	content: ct
};

var now = new Date();

var pdf = pdfmake.createPdf(docDefinition);
pdf.write('pdfs/textDecorations.pdf').then(() => {
	console.log(new Date() - now);
}, err => {
	console.error(err);
});
