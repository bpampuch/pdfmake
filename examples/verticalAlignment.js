var pdfmake = require('../js/index'); // only during development, otherwise use the following line
//var pdfmake = require('pdfmake');

var Roboto = require('../fonts/Roboto');
pdfmake.addFonts(Roboto);

// or you can define the font manually:
/*
pdfmake.addFonts({
	Roboto: {
		normal: '../fonts/Roboto/Roboto-Regular.ttf',
		bold: '../fonts/Roboto/Roboto-Medium.ttf',
		italics: '../fonts/Roboto/Roboto-Italic.ttf',
		bolditalics: '../fonts/Roboto/Roboto-MediumItalic.ttf'
	}
});
*/

var docDefinition = {
	content: [
		{
			table: {
				body: [
					['Column 1', 'Column 2', 'Column 3'],
					[
						'One value goes here One value goes here One value goes here One value goes here One value goes here One value goes here One value goes here \nOne value goes here',
						{ text: "Middle\ntext", verticalAlignment: "middle" },
						{ text: "Bottom", verticalAlignment: "bottom" }
					]
				]
			}
		},
		'',
		{
			table: {
				body: [
					['Column 1', 'Column 2', 'Column 3'],
					[
						'One value goes here One value goes here One value goes here One value goes here One value goes here One value goes here One value goes here \nOne value goes here',
						{ text: "Middle\ntext", verticalAlignment: "middle", colSpan: 2 },
						''
					]
				]
			}
		},
		'',
		{
			table: {
				body: [
					['Column 1', 'Column 2', 'Column 3'],
					[
						'One value goes here One value goes here One value goes here One value goes here One value goes here One value goes here One value goes here \nOne value goes here',
						{ text: "Bottom\ntext", verticalAlignment: "bottom", colSpan: 2 },
						''
					]
				]
			}
		},
		'',
		{
			table: {
				body: [
					['Column 1', 'Column 2', 'Column 3'],
					[
						'One value goes here One value goes here One value goes here One value goes here One value goes here One value goes here One value goes here \nOne value goes here',
						{ text: "Center\n(rowSpan)", verticalAlignment: "middle", colSpan: 2, rowSpan: 2 },
						''
					],
					['Column A1', '', ''],
				]
			}
		},
		'',
		{
			table: {
				body: [
					['Column 1', 'Column 2', 'Column 3'],
					[
						'One value goes here One value goes here One value goes here One value goes here One value goes here One value goes here One value goes here \nOne value goes here',
						{ text: "Bottom\n(rowSpan)", verticalAlignment: "bottom", colSpan: 2, rowSpan: 2 },
						''
					],
					['Column A1', '', ''],
				]
			}
		},
		{ text: '', pageBreak: 'after' },
		'',
		{

			table: {
				body: [
					['Column 1', 'Column 2', 'Column 3'],
					[
						{ text: "Middle\ntext", verticalAlignment: "middle", colSpan: 2 },
						'',
						'One value goes here One value goes \nhere\n One\n value goes here One value goes here One value goes here One value goes here One value goes here \nOne value goes here',
					]
				]
			}
		},
		'',
		{
			table: {
				body: [
					['Column 1', 'Column 2', 'Column 3'],
					[
						{ text: "Bottom\ntext", verticalAlignment: "bottom", colSpan: 2 },
						'',
						'One value goes here One value goes \nhere\n One\n value goes here One value goes here One value goes here One value goes here One value goes here \nOne value goes here',
					]
				]
			}
		},
		'',
		{
			table: {
				body: [
					['Column 1', 'Column 2', 'Column 3'],
					[
						'One value goes here One value goes here One value goes here One value goes here One value goes here One value goes here One value goes here \nOne value goes here',
						{ text: "Middle 3 \n(rowSpan)", verticalAlignment: "middle", colSpan: 2, rowSpan: 3 },
						''
					],
					['Column A1', '', ''],
					['Column B1', '', ''],
				]
			}
		},
		'',
		{
			table: {
				body: [
					['Column 1', 'Column 2', 'Column 3'],
					[
						'One value goes here One value goes here One value goes here One value goes here One value goes here One value goes here One value goes here \nOne value goes here',
						{ text: "Bottom 3 \n(rowSpan)", verticalAlignment: "bottom", colSpan: 2, rowSpan: 3 },
						''
					],
					['Column A1', '', ''],
					['Column B1', '', ''],
				]
			}
		},

		{ text: 'dontBreakRows:', pageBreak: 'after' },

		{
			table: {
				dontBreakRows: true,
				body: [
					['Column 1', 'Column 2', 'Column 3'],
					[
						'One value goes here One value goes here One value goes here One value goes here One value goes here One value goes here One value goes here \nOne value goes here',
						{ text: "Middle\ntext", verticalAlignment: "middle" },
						{ text: "Bottom", verticalAlignment: "bottom" }
					]
				]
			}
		},
		'',
		{
			table: {
				dontBreakRows: true,
				body: [
					['Column 1', 'Column 2', 'Column 3'],
					[
						'One value goes here One value goes here One value goes here One value goes here One value goes here One value goes here One value goes here \nOne value goes here',
						{ text: "Middle\ntext", verticalAlignment: "middle", colSpan: 2 },
						''
					]
				]
			}
		},
		'',
		{
			table: {
				dontBreakRows: true,
				body: [
					['Column 1', 'Column 2', 'Column 3'],
					[
						'One value goes here One value goes here One value goes here One value goes here One value goes here One value goes here One value goes here \nOne value goes here',
						{ text: "Bottom\ntext", verticalAlignment: "bottom", colSpan: 2 },
						''
					]
				]
			}
		},
		'',
		{
			table: {
				dontBreakRows: true,
				body: [
					['Column 1', 'Column 2', 'Column 3'],
					[
						'One value goes here One value goes here One value goes here One value goes here One value goes here One value goes here One value goes here \nOne value goes here',
						{ text: "Center\n(rowSpan)", verticalAlignment: "middle", colSpan: 2, rowSpan: 2 },
						''
					],
					['Column A1', '', ''],
				]
			}
		},
		'',
		{
			table: {
				dontBreakRows: true,
				body: [
					['Column 1', 'Column 2', 'Column 3'],
					[
						'One value goes here One value goes here One value goes here One value goes here One value goes here One value goes here One value goes here \nOne value goes here',
						{ text: "Bottom\n(rowSpan)", verticalAlignment: "bottom", colSpan: 2, rowSpan: 2 },
						''
					],
					['Column A1', '', ''],
				]
			}
		},
		{ text: '', pageBreak: 'after' },
		'',
		{
			table: {
				dontBreakRows: true,
				body: [
					['Column 1', 'Column 2', 'Column 3'],
					[
						{ text: "Middle\ntext", verticalAlignment: "middle", colSpan: 2 },
						'',
						'One value goes here One value goes \nhere\n One\n value goes here One value goes here One value goes here One value goes here One value goes here \nOne value goes here',
					]
				]
			}
		},
		'',
		{

			table: {
				dontBreakRows: true,
				body: [
					['Column 1', 'Column 2', 'Column 3'],
					[
						{ text: "Bottom\ntext", verticalAlignment: "bottom", colSpan: 2 },
						'',
						'One value goes here One value goes \nhere\n One\n value goes here One value goes here One value goes here One value goes here One value goes here \nOne value goes here',
					]
				]
			}
		},
		'',
		{
			table: {
				dontBreakRows: true,
				body: [
					['Column 1', 'Column 2', 'Column 3'],
					[
						'One value goes here One value goes here One value goes here One value goes here One value goes here One value goes here One value goes here \nOne value goes here',
						{ text: "Middle 3 \n(rowSpan)", verticalAlignment: "middle", colSpan: 2, rowSpan: 3 },
						''
					],
					['Column A1', '', ''],
					['Column B1', '', ''],
				]
			}
		},
		'',
		{
			table: {
				dontBreakRows: true,
				body: [
					['Column 1', 'Column 2', 'Column 3'],
					[
						'One value goes here One value goes here One value goes here One value goes here One value goes here One value goes here One value goes here \nOne value goes here',
						{ text: "Bottom 3 \n(rowSpan)", verticalAlignment: "bottom", colSpan: 2, rowSpan: 3 },
						''
					],
					['Column A1', '', ''],
					['Column B1', '', ''],
				]
			}
		},
	]
};

var now = new Date();

var pdf = pdfmake.createPdf(docDefinition);
pdf.write('pdfs/verticalAlignment.pdf').then(() => {
	console.log(new Date() - now);
}, err => {
	console.error(err);
});
