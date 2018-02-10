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
		{text: 'Unordered list', style: 'header'},
		{
			ul: [
				'item 1',
				'item 2',
				'item 3'
			]
		},
		{text: '\n\nUnordered list with longer lines', style: 'header'},
		{
			ul: [
				'item 1',
				'Lorem ipsum dolor sit amet, consectetur adipisicing elit. Malit profecta versatur nomine ocurreret multavit',
				'item 3'
			]
		},
		{text: '\n\nOrdered list', style: 'header'},
		{
			ol: [
				'item 1',
				'item 2',
				'item 3'
			]
		},
		{text: '\n\nOrdered list with longer lines', style: 'header'},
		{
			ol: [
				'item 1',
				'Lorem ipsum dolor sit amet, consectetur adipisicing elit. Malit profecta versatur nomine ocurreret multavit',
				'item 3'
			]
		},
		{text: '\n\nOrdered list should be descending', style: 'header'},
		{
			reversed: true,
			ol: [
				'item 1',
				'item 2',
				'item 3'
			]
		},
		{text: '\n\nOrdered list with start value', style: 'header'},
		{
			start: 50,
			ol: [
				'item 1',
				'item 2',
				'item 3'
			]
		},
		{text: '\n\nOrdered list with own values', style: 'header'},
		{
			ol: [
				{text: 'item 1', counter: 10},
				{text: 'item 2', counter: 20},
				{text: 'item 3', counter: 30},
				{text: 'item 4 without own value'}
			]
		},
		{text: '\n\nNested lists (ordered)', style: 'header'},
		{
			ol: [
				'item 1',
				[
					'Lorem ipsum dolor sit amet, consectetur adipisicing elit. Malit profecta versatur nomine ocurreret multavit',
					{
						ol: [
							'subitem 1',
							'subitem 2',
							'subitem 3 - Lorem ipsum dolor sit amet, consectetur adipisicing elit. Malit profecta versatur nomine ocurreret multavit',
							'subitem 3 - Lorem ipsum dolor sit amet, consectetur adipisicing elit. Malit profecta versatur nomine ocurreret multavit',
							'subitem 3 - Lorem ipsum dolor sit amet, consectetur adipisicing elit. Malit profecta versatur nomine ocurreret multavit',
							{text: [
									'subitem 3 - Lorem ipsum dolor sit amet, consectetur adipisicing elit. Malit profecta versatur nomine ocurreret multavit',
									'subitem 3 - Lorem ipsum dolor sit amet, consectetur adipisicing elit. Malit profecta versatur nomine ocurreret multavit',
									'subitem 3 - Lorem ipsum dolor sit amet, consectetur adipisicing elit. Malit profecta versatur nomine ocurreret multavit',
									'subitem 3 - Lorem ipsum dolor sit amet, consectetur adipisicing elit. Malit profecta versatur nomine ocurreret multavit',
									'subitem 3 - Lorem ipsum dolor sit amet, consectetur adipisicing elit. Malit profecta versatur nomine ocurreret multavit',
									'subitem 3 - Lorem ipsum dolor sit amet, consectetur adipisicing elit. Malit profecta versatur nomine ocurreret multavit',
									'subitem 3 - Lorem ipsum dolor sit amet, consectetur adipisicing elit. Malit profecta versatur nomine ocurreret multavit',
									'subitem 3 - Lorem ipsum dolor sit amet, consectetur adipisicing elit. Malit profecta versatur nomine ocurreret multavit',
								]},

							'subitem 3 - Lorem ipsum dolor sit amet, consectetur adipisicing elit. Malit profecta versatur nomine ocurreret multavit',
							'subitem 3 - Lorem ipsum dolor sit amet, consectetur adipisicing elit. Malit profecta versatur nomine ocurreret multavit',
							'subitem 3 - Lorem ipsum dolor sit amet, consectetur adipisicing elit. Malit profecta versatur nomine ocurreret multavit',
							'subitem 3 - Lorem ipsum dolor sit amet, consectetur adipisicing elit. Malit profecta versatur nomine ocurreret multavit',
							'subitem 4',
							'subitem 5',
						]
					}
				],
				'item 3\nsecond line of item3'
			]
		},
		{text: '\n\nNested lists (unordered)', style: 'header'},
		{
			ol: [
				'item 1',
				'Lorem ipsum dolor sit amet, consectetur adipisicing elit. Malit profecta versatur nomine ocurreret multavit',
				{
					ul: [
						'subitem 1',
						'subitem 2',
						'subitem 3 - Lorem ipsum dolor sit amet, consectetur adipisicing elit. Malit profecta versatur nomine ocurreret multavit',
						'subitem 3 - Lorem ipsum dolor sit amet, consectetur adipisicing elit. Malit profecta versatur nomine ocurreret multavit',
						'subitem 3 - Lorem ipsum dolor sit amet, consectetur adipisicing elit. Malit profecta versatur nomine ocurreret multavit',
						{text: [
								'subitem 3 - Lorem ipsum dolor sit amet, consectetur adipisicing elit. Malit profecta versatur nomine ocurreret multavit',
								'subitem 3 - Lorem ipsum dolor sit amet, consectetur adipisicing elit. Malit profecta versatur nomine ocurreret multavit',
								'subitem 3 - Lorem ipsum dolor sit amet, consectetur adipisicing elit. Malit profecta versatur nomine ocurreret multavit',
								'subitem 3 - Lorem ipsum dolor sit amet, consectetur adipisicing elit. Malit profecta versatur nomine ocurreret multavit',
								'subitem 3 - Lorem ipsum dolor sit amet, consectetur adipisicing elit. Malit profecta versatur nomine ocurreret multavit',
								'subitem 3 - Lorem ipsum dolor sit amet, consectetur adipisicing elit. Malit profecta versatur nomine ocurreret multavit',
								'subitem 3 - Lorem ipsum dolor sit amet, consectetur adipisicing elit. Malit profecta versatur nomine ocurreret multavit',
								'subitem 3 - Lorem ipsum dolor sit amet, consectetur adipisicing elit. Malit profecta versatur nomine ocurreret multavit',
							]},

						'subitem 3 - Lorem ipsum dolor sit amet, consectetur adipisicing elit. Malit profecta versatur nomine ocurreret multavit',
						'subitem 3 - Lorem ipsum dolor sit amet, consectetur adipisicing elit. Malit profecta versatur nomine ocurreret multavit',
						'subitem 3 - Lorem ipsum dolor sit amet, consectetur adipisicing elit. Malit profecta versatur nomine ocurreret multavit',
						'subitem 3 - Lorem ipsum dolor sit amet, consectetur adipisicing elit. Malit profecta versatur nomine ocurreret multavit',
						'subitem 4',
						'subitem 5',
					]
				},
				'item 3\nsecond line of item3',
			]
		},
		{text: '\n\nUnordered lists inside columns', style: 'header'},
		{
			columns: [
				{
					ul: [
						'item 1',
						'Lorem ipsum dolor sit amet, consectetur adipisicing elit. Malit profecta versatur nomine ocurreret multavit',
					]
				},
				{
					ul: [
						'item 1',
						'Lorem ipsum dolor sit amet, consectetur adipisicing elit. Malit profecta versatur nomine ocurreret multavit',
					]
				}
			]
		},
		{text: '\n\nOrdered lists inside columns', style: 'header'},
		{
			columns: [
				{
					ol: [
						'item 1',
						'Lorem ipsum dolor sit amet, consectetur adipisicing elit. Malit profecta versatur nomine ocurreret multavit',
					]
				},
				{
					ol: [
						'item 1',
						'Lorem ipsum dolor sit amet, consectetur adipisicing elit. Malit profecta versatur nomine ocurreret multavit',
					]
				}
			]
		},
		{text: '\n\nNested lists width columns', style: 'header'},
		{
			ul: [
				'item 1',
				'Lorem ipsum dolor sit amet, consectetur adipisicing elit. Malit profecta versatur nomine ocurreret multavit',
				{
					ol: [
						[
							{
								columns: [
									'column 1',
									{
										stack: [
											'column 2',
											{
												ul: [
													'item 1',
													'item 2',
													{
														ul: [
															'item',
															'item',
															'item',
														]
													},
													'item 4',
												]
											}
										]
									},
									'column 3',
									'column 4',
								]
							},
							'subitem 1 in a vertical container',
							'subitem 2 in a vertical container',
						],
						'subitem 2',
						'subitem 3 - Lorem ipsum dolor sit amet, consectetur adipisicing elit. Malit profecta versatur nomine ocurreret multavit',
						'subitem 3 - Lorem ipsum dolor sit amet, consectetur adipisicing elit. Malit profecta versatur nomine ocurreret multavit',
						'subitem 3 - Lorem ipsum dolor sit amet, consectetur adipisicing elit. Malit profecta versatur nomine ocurreret multavit',
						{text: [
								'subitem 3 - Lorem ipsum dolor sit amet, consectetur adipisicing elit. Malit profecta versatur nomine ocurreret multavit',
								'subitem 3 - Lorem ipsum dolor sit amet, consectetur adipisicing elit. Malit profecta versatur nomine ocurreret multavit',
								'subitem 3 - Lorem ipsum dolor sit amet, consectetur adipisicing elit. Malit profecta versatur nomine ocurreret multavit',
								'subitem 3 - Lorem ipsum dolor sit amet, consectetur adipisicing elit. Malit profecta versatur nomine ocurreret multavit',
								'subitem 3 - Lorem ipsum dolor sit amet, consectetur adipisicing elit. Malit profecta versatur nomine ocurreret multavit',
								'subitem 3 - Lorem ipsum dolor sit amet, consectetur adipisicing elit. Malit profecta versatur nomine ocurreret multavit',
								'subitem 3 - Lorem ipsum dolor sit amet, consectetur adipisicing elit. Malit profecta versatur nomine ocurreret multavit',
								'subitem 3 - Lorem ipsum dolor sit amet, consectetur adipisicing elit. Malit profecta versatur nomine ocurreret multavit',
							]},

						'subitem 3 - Lorem ipsum dolor sit amet, consectetur adipisicing elit. Malit profecta versatur nomine ocurreret multavit',
						'subitem 3 - Lorem ipsum dolor sit amet, consectetur adipisicing elit. Malit profecta versatur nomine ocurreret multavit',
						'subitem 3 - Lorem ipsum dolor sit amet, consectetur adipisicing elit. Malit profecta versatur nomine ocurreret multavit',
						'subitem 3 - Lorem ipsum dolor sit amet, consectetur adipisicing elit. Malit profecta versatur nomine ocurreret multavit',
						'subitem 4',
						'subitem 5',
					]
				},
				'item 3\nsecond line of item3',
			]
		},
		{text: '\n\nUnordered list with square marker type', style: 'header'},
		{
			type: 'square',
			ul: [
				'item 1',
				'item 2',
				'item 3'
			]
		},
		{text: '\n\nUnordered list with circle marker type', style: 'header'},
		{
			type: 'circle',
			ul: [
				'item 1',
				'item 2',
				'item 3'
			]
		},
		{text: '\n\nColored unordered list', style: 'header'},
		{
			color: 'blue',
			ul: [
				'item 1',
				'item 2',
				'item 3'
			]
		},
		{text: '\n\nColored unordered list with own marker color', style: 'header'},
		{
			color: 'blue',
			markerColor: 'red',
			ul: [
				'item 1',
				'item 2',
				'item 3'
			]
		},
		{text: '\n\nColored ordered list', style: 'header'},
		{
			color: 'blue',
			ol: [
				'item 1',
				'item 2',
				'item 3'
			]
		},
		{text: '\n\nColored ordered list with own marker color', style: 'header'},
		{
			color: 'blue',
			markerColor: 'red',
			ol: [
				'item 1',
				'item 2',
				'item 3'
			]
		},
		{text: '\n\nOrdered list - type: lower-alpha', style: 'header'},
		{
			type: 'lower-alpha',
			ol: [
				'item 1',
				'item 2',
				'item 3'
			]
		},
		{text: '\n\nOrdered list - type: upper-alpha', style: 'header'},
		{
			type: 'upper-alpha',
			ol: [
				'item 1',
				'item 2',
				'item 3'
			]
		},

		{text: '\n\nOrdered list - type: upper-roman', style: 'header'},
		{
			type: 'upper-roman',
			ol: [
				'item 1',
				'item 2',
				'item 3',
				'item 4',
				'item 5'
			]
		},
		{text: '\n\nOrdered list - type: lower-roman', style: 'header'},
		{
			type: 'lower-roman',
			ol: [
				'item 1',
				'item 2',
				'item 3',
				'item 4',
				'item 5'
			]
		},
		{text: '\n\nOrdered list - type: none', style: 'header'},
		{
			type: 'none',
			ol: [
				'item 1',
				'item 2',
				'item 3'
			]
		},
		{text: '\n\nUnordered list - type: none', style: 'header'},
		{
			type: 'none',
			ul: [
				'item 1',
				'item 2',
				'item 3'
			]
		},
		{text: '\n\nOrdered list with own separator', style: 'header'},
		{
			separator: ')',
			ol: [
				'item 1',
				'item 2',
				'item 3'
			]
		},
		{text: '\n\nOrdered list with own complex separator', style: 'header'},
		{
			separator: ['(', ')'],
			ol: [
				'item 1',
				'item 2',
				'item 3'
			]
		},
		{text: '\n\nOrdered list with own items type', style: 'header'},
		{
			ol: [
				'item 1',
				{text: 'item 2', listType: 'none'},
				{text: 'item 3', listType: 'upper-roman'}
			]
		},
		{text: '\n\nUnordered list with own items type', style: 'header'},
		{
			ul: [
				'item 1',
				{text: 'item 2', listType: 'none'},
				{text: 'item 3', listType: 'circle'}
			]
		},
	],
	styles: {
		header: {
			bold: true,
			fontSize: 15
		}
	},
	defaultStyle: {
		fontSize: 12
	}
};

var now = new Date();
var pdfDoc = printer.createPdfKitDocument(docDefinition);
pdfDoc.pipe(fs.createWriteStream('pdfs/lists.pdf'));
pdfDoc.end();

console.log(new Date() - now);
