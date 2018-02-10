var fonts = {
	Roboto: {
		normal: 'fonts/Roboto-Regular.ttf',
		bold: 'fonts/Roboto-Medium.ttf',
		italics: 'fonts/Roboto-Italic.ttf',
		bolditalics: 'fonts/Roboto-MediumItalic.ttf'
	}
};

var PdfPrinter = require('../src/printer');
var printer = new PdfPrinter(fonts);
var fs = require('fs');


var docDefinition = {
	content: [
		{
			text: 'This paragraph uses header style and extends the alignment property',
			style: 'header',
			alignment: 'center'
		},
		{
			text: [
				'This paragraph uses header style and overrides bold value setting it back to false.\n',
				'Header style in this example sets alignment to justify, so this paragraph should be rendered \n',
				'Lorem ipsum dolor sit amet, consectetur adipisicing elit. Malit profecta versatur nomine ocurreret multavit, officiis viveremus aeternum superstitio suspicor alia nostram, quando nostros congressus susceperant concederetur leguntur iam, vigiliae democritea tantopere causae, atilii plerumque ipsas potitur pertineant multis rem quaeri pro, legendum didicisse credere ex maluisset per videtis. Cur discordans praetereat aliae ruinae dirigentur orestem eodem, praetermittenda divinum. Collegisti, deteriora malint loquuntur officii cotidie finitas referri doleamus ambigua acute. Adhaesiones ratione beate arbitraretur detractis perdiscere, constituant hostis polyaeno. Diu concederetur.'
			],
			style: 'header',
			bold: false
		}
	],
	styles: {
		header: {
			fontSize: 18,
			bold: true,
			alignment: 'justify'
		}
	},
};

var pdfDoc = printer.createPdfKitDocument(docDefinition);
pdfDoc.pipe(fs.createWriteStream('pdfs/named_styles_with_overrides.pdf'));
pdfDoc.end();
