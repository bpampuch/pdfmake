var fonts = {
	Roboto: {
		normal: 'fonts/Roboto-Regular.ttf',
		bold: 'fonts/Roboto-Medium.ttf',
		italics: 'fonts/Roboto-Italic.ttf',
		bolditalics: 'fonts/Roboto-Italic.ttf'
	}
};

var PdfPrinter = require('../src/printer');
var printer = new PdfPrinter(fonts);


var desc = [{
	table: {
		widths: 'auto',
		body: []
	}
}];

for(var i = 0; i < 47; i++) {
	desc[0].table.body.push(['a', 'b', 'c']);
}

//desc[0].table.body.push(['a\nb\nc', 'a\nb\nc', 'a\nb\nc']);


var docDefinition = {

	content: [
		// desc[0],
		{ stack: [
				'Tables',
				{ text: 'This file will eventually be replaced. It\'s here for testing purpose', fontSize: 11, bold: false }
			],
			style: 'header'
		},
		{
			table: {
				// cellBorder: 1,
				// headerCellBorder: [ 0, 0, 0, 2 ],
				//oddRowCellBorder:
				//evenRowCellBorder
				// tableBorder: { lineWidth: 1, dash: { length: 3, space: 2 } },

				headerRows: 1,
				// keepWithHeaderRows: 1,
				widths: [ '*', '*', 'auto', 'auto' ],
				body:
				[
					[ 'Header 1', 'H2', 'Header\nwith\nlines', { text: 'bigger header', style: 'bigger' } ],
					[ 'Column 1', 'Column 2', 'Column 3', 'Column 4' ],
					[ 'A text in the first column', 'Text in the second one', 'Other things go here', 'or here' ],
					[ { ol: [
					'subitem 1',
					'subitem 2',
					'subitem 3 - Lorem ipsum dolor sit amet, consectetur adipisicing elit. Malit profecta versatur nomine ocurreret multavit',
					'subitem 3 - Lorem ipsum dolor sit amet, consectetur adipisicing elit. Malit profecta versatur nomine ocurreret multavit',
					'subitem 3 - Lorem ipsum dolor sit amet, consectetur adipisicing elit. Malit profecta versatur nomine ocurreret multavit',
					{ ul: [
						'subitem 3 - Lorem ipsum dolor sit amet, consectetur adipisicing elit. Malit profecta versatur nomine ocurreret multavit',
						'subitem 3 - Lorem ipsum dolor sit amet, consectetur adipisicing elit. Malit profecta versatur nomine ocurreret multavit',
						'subitem 3 - Lorem ipsum dolor sit amet, consectetur adipisicing elit. Malit profecta versatur nomine ocurreret multavit',
						'subitem 3 - Lorem ipsum dolor sit amet, consectetur adipisicing elit. Malit profecta versatur nomine ocurreret multavit',
						'subitem 3 - Lorem ipsum dolor sit amet, consectetur adipisicing elit. Malit profecta versatur nomine ocurreret multavit',
						'subitem 3 - Lorem ipsum dolor sit amet, consectetur adipisicing elit. Malit profecta versatur nomine ocurreret multavit',
						'subitem 3 - Lorem ipsum dolor sit amet, consectetur adipisicing elit. Malit profecta versatur nomine ocurreret multavit',
						'subitem 3 - Lorem ipsum dolor sit amet, consectetur adipisicing elit. Malit profecta versatur nomine ocurreret multavit',
						] },

					'subitem 3 - Lorem ipsum dolor sit amet, consectetur adipisicing elit. Malit profecta versatur nomine ocurreret multavit',
					'subitem 3 - Lorem ipsum dolor sit amet, consectetur adipisicing elit. Malit profecta versatur nomine ocurreret multavit',
					'subitem 3 - Lorem ipsum dolor sit amet, consectetur adipisicing elit. Malit profecta versatur nomine ocurreret multavit',
					'subitem 3 - Lorem ipsum dolor sit amet, consectetur adipisicing elit. Malit profecta versatur nomine ocurreret multavit',
					'subitem 4',
					'subitem 5',
					]}, 'Text in the second one', 'Other things go here', { ol: [
					'subitem 1',
					'subitem 2',
					'subitem 3 - Lorem ipsum dolor sit amet, consectetur adipisicing elit. Malit profecta versatur nomine ocurreret multavit',
					'subitem 3 - Lorem ipsum dolor sit amet, consectetur adipisicing elit. Malit profecta versatur nomine ocurreret multavit',
					'subitem 3 - Lorem ipsum dolor sit amet, consectetur adipisicing elit. Malit profecta versatur nomine ocurreret multavit',
					{ ul: [
						'subitem 3 - Lorem ipsum dolor sit amet, consectetur adipisicing elit. Malit profecta versatur nomine ocurreret multavit',
						'subitem 3 - Lorem ipsum dolor sit amet, consectetur adipisicing elit. Malit profecta versatur nomine ocurreret multavit',
						'subitem 3 - Lorem ipsum dolor sit amet, consectetur adipisicing elit. Malit profecta versatur nomine ocurreret multavit',
						'subitem 3 - Lorem ipsum dolor sit amet, consectetur adipisicing elit. Malit profecta versatur nomine ocurreret multavit',
						'subitem 3 - Lorem ipsum dolor sit amet, consectetur adipisicing elit. Malit profecta versatur nomine ocurreret multavit',
						'subitem 3 - Lorem ipsum dolor sit amet, consectetur adipisicing elit. Malit profecta versatur nomine ocurreret multavit',
						'subitem 3 - Lorem ipsum dolor sit amet, consectetur adipisicing elit. Malit profecta versatur nomine ocurreret multavit',
						'subitem 3 - Lorem ipsum dolor sit amet, consectetur adipisicing elit. Malit profecta versatur nomine ocurreret multavit',
						] },

					'subitem 3 - Lorem ipsum dolor sit amet, consectetur adipisicing elit. Malit profecta versatur nomine ocurreret multavit',
					'subitem 3 - Lorem ipsum dolor sit amet, consectetur adipisicing elit. Malit profecta versatur nomine ocurreret multavit',
					'subitem 3 - Lorem ipsum dolor sit amet, consectetur adipisicing elit. Malit profecta versatur nomine ocurreret multavit',
					'subitem 3 - Lorem ipsum dolor sit amet, consectetur adipisicing elit. Malit profecta versatur nomine ocurreret multavit',
					'subitem 4',
					'subitem 5',
					]} ],
					[ 'A text in the fir hj kjh kjh kjh kjh st column', 'Text in the second one', 'Other things go here', 'or here' ],
					[ 'A text in the first column', 'Text in the second one', 'Other things go here', 'or here' ],
					[ 'A text in the first column', 'Text in the second one', 'Other things go here', 'or here' ],
					[ 'A text in the first column', 'Text in the second one', 'Other things go here', 'or here' ],
					[ 'A text in the first column', 'Text in the second one', 'Other things go here', 'or here' ],
					[ 'A text in the first column', 'Text in the second one', 'Other things go here', 'or here' ],
					[ 'A text in the first column', 'Text in the second one', 'Other things go here', 'or here' ],
					[ 'A text in the first column', 'Text in the second one', 'Other things go here', 'or here' ],
					[ 'A text in the first column', 'Text in the second one', 'Other things go here', 'or here' ],
					[ 'A text in the first column', 'Text in the second one', 'Other things go here', 'or here' ],
					[ 'A text in the first column', 'Text in the second one', 'Other things go here', 'or here' ],
					[ 'A text in the first column', 'Text in the second one', 'Other things go here', 'or here' ],
					[ 'A text in the first column', 'Text in the second one', 'Other things go here', 'or here' ],
					[ 'A text in the first column', 'Text in the second one', 'Other things go here', 'or here' ],
					[ 'A text in the first column', 'Text in the second one', 'Other things go here', 'or here' ],
					[ 'A text in the first column', 'Text in the second one', 'Other things go here', 'or here' ],
					[ 'A text in the first column', 'Text in the second one', 'Other things go here', 'or here' ],
					[ 'A text in the first column', 'Text in the second one', 'Other things go here', 'or here' ],
					[ 'A text in the first column', 'Text in the second one', 'Other things go here', 'or here' ],
					[ 'A text in the first column', 'Text in the second one', 'Other things go here', 'or here' ],
					[ 'A text in the first column', 'Text in the second one', 'Other things go here', 'or here' ],
					[ 'A text in the first column', 'Text in the second one', 'Other things go here', 'or here' ],
					[ 'A text in the first column', 'Text in the second one', 'Other things go here', 'or here' ],
					[ 'A text in the first column', 'Text in the second one', 'Other things go here', 'or here' ],
					[ 'A text in the first column', 'Text in the second one', 'Other things go here', 'or here' ],
					[ 'A text in the first column', 'Text in the second one', 'Other things go here', 'or here' ],
					[ 'A text in the first column', 'Text in the second one', 'Other things go here', 'or here' ],
					[ 'A text in the first column', 'Text in the second one', 'Other things go here', 'or here' ],
					[ 'A text in the first column', 'Text in the second one', 'Other things go here', 'or here' ],
					[ 'A text in the first column', 'Text in the second one', 'Other things go here', 'or here' ],
				]
			}
		}
	],
	styles: {
		header: {
			fontSize: 18,
			bold: true,
			margin: [0, 0, 0, 40]
		},
		bigger: {
			fontSize: 15,
		}
	},
	defaultStyle: {
		// alignment: 'justify'
	}
};

var pdfDoc = printer.createPdfKitDocument(docDefinition);
pdfDoc.write('pdfs/tables.pdf');
