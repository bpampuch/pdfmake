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
			text: 'This is a page reference example. Page number of text element marked id property will be located in pageReference element. See below.\n\n'
		},
		{
			table: {
				body: [
					[{ text: 'page #', bold: true }, { text: 'title', bold: true }],
					[{ pageReference: 'header1', alignment: 'right' }, 'Header one'],
					[{ pageReference: 'subheader1', alignment: 'right' }, 'Subheader one'],
					[{ pageReference: 'subheader2', alignment: 'right' }, 'Subheader two'],
					[{ pageReference: 'subheader3', alignment: 'right' }, 'Subheader three']
				]
			}
		},
		{
			text: '\nAnd text can be referenced by textReference:\n'
		},
		{
			table: {
				body: [
					[{ text: 'page #', bold: true }, { text: 'title', bold: true }],
					[{ pageReference: 'header1', alignment: 'right' }, { textReference: 'header1' }],
					[{ pageReference: 'subheader1', alignment: 'right' }, { textReference: 'subheader1' }],
					[{ pageReference: 'subheader2', alignment: 'right' }, { textReference: 'subheader2' }],
					[{ pageReference: 'subheader3', alignment: 'right' }, { textReference: 'subheader3' }]
				]
			}
		},
		{
			text: '\nAnd all can be in inline texts:\n'
		},
		{
			text: [
				'Chapter "',
				{ textReference: 'header1' },
				'" is on page number ',
				{ pageReference: 'header1' }
			]
		},
		{
			text: [
				'Chapter "',
				{ textReference: 'subheader1' },
				'" is on page number ',
				{ pageReference: 'subheader1' }
			]
		},
		{
			text: [
				'Chapter "',
				{ textReference: 'subheader2' },
				'" is on page number ',
				{ pageReference: 'subheader2' }
			]
		},
		{
			text: [
				'Chapter "',
				{ textReference: 'subheader3' },
				'" is on page number ',
				{ pageReference: 'subheader3' }
			]
		},
		{
			text: 'This is a header, using header style',
			style: 'header',
			id: 'header1',
			pageBreak: 'before'
		},
		'Lorem ipsum dolor sit amet, consectetur adipisicing elit. Confectum ponit legam, perferendis nomine miserum, animi. Moveat nesciunt triari naturam.\n\n',
		{
			text: 'Subheader 1 - using subheader style',
			style: 'subheader',
			id: 'subheader1',
			pageBreak: 'before'
		},
		'Lorem ipsum dolor sit amet, consectetur adipisicing elit. Confectum ponit legam, perferendis nomine miserum, animi. Moveat nesciunt triari naturam posset, eveniunt specie deorsus efficiat sermone instituendarum fuisse veniat, eademque mutat debeo. Delectet plerique protervi diogenem dixerit logikh levius probabo adipiscuntur afficitur, factis magistra inprobitatem aliquo andriam obiecta, religionis, imitarentur studiis quam, clamat intereant vulgo admonitionem operis iudex stabilitas vacillare scriptum nixam, reperiri inveniri maestitiam istius eaque dissentias idcirco gravis, refert suscipiet recte sapiens oportet ipsam terentianus, perpauca sedatio aliena video.',
		'Lorem ipsum dolor sit amet, consectetur adipisicing elit. Confectum ponit legam, perferendis nomine miserum, animi. Moveat nesciunt triari naturam posset, eveniunt specie deorsus efficiat sermone instituendarum fuisse veniat, eademque mutat debeo. Delectet plerique protervi diogenem dixerit logikh levius probabo adipiscuntur afficitur, factis magistra inprobitatem aliquo andriam obiecta, religionis, imitarentur studiis quam, clamat intereant vulgo admonitionem operis iudex stabilitas vacillare scriptum nixam, reperiri inveniri maestitiam istius eaque dissentias idcirco gravis, refert suscipiet recte sapiens oportet ipsam terentianus, perpauca sedatio aliena video.',
		'Lorem ipsum dolor sit amet, consectetur adipisicing elit. Confectum ponit legam, perferendis nomine miserum, animi. Moveat nesciunt triari naturam posset, eveniunt specie deorsus efficiat sermone instituendarum fuisse veniat, eademque mutat debeo. Delectet plerique protervi diogenem dixerit logikh levius probabo adipiscuntur afficitur, factis magistra inprobitatem aliquo andriam obiecta, religionis, imitarentur studiis quam, clamat intereant vulgo admonitionem operis iudex stabilitas vacillare scriptum nixam, reperiri inveniri maestitiam istius eaque dissentias idcirco gravis, refert suscipiet recte sapiens oportet ipsam terentianus, perpauca sedatio aliena video.\n\n',
		{
			text: 'Subheader 2 - using subheader style',
			style: 'subheader',
			id: 'subheader2',
			pageBreak: 'before'
		},
		'Lorem ipsum dolor sit amet, consectetur adipisicing elit. Confectum ponit legam, perferendis nomine miserum, animi. Moveat nesciunt triari naturam posset, eveniunt specie deorsus efficiat sermone instituendarum fuisse veniat, eademque mutat debeo. Delectet plerique protervi diogenem dixerit logikh levius probabo adipiscuntur afficitur, factis magistra inprobitatem aliquo andriam obiecta, religionis, imitarentur studiis quam, clamat intereant vulgo admonitionem operis iudex stabilitas vacillare scriptum nixam, reperiri inveniri maestitiam istius eaque dissentias idcirco gravis, refert suscipiet recte sapiens oportet ipsam terentianus, perpauca sedatio aliena video.',
		'Lorem ipsum dolor sit amet, consectetur adipisicing elit. Confectum ponit legam, perferendis nomine miserum, animi. Moveat nesciunt triari naturam posset, eveniunt specie deorsus efficiat sermone instituendarum fuisse veniat, eademque mutat debeo. Delectet plerique protervi diogenem dixerit logikh levius probabo adipiscuntur afficitur, factis magistra inprobitatem aliquo andriam obiecta, religionis, imitarentur studiis quam, clamat intereant vulgo admonitionem operis iudex stabilitas vacillare scriptum nixam, reperiri inveniri maestitiam istius eaque dissentias idcirco gravis, refert suscipiet recte sapiens oportet ipsam terentianus, perpauca sedatio aliena video.\n\n',
		{
			text: 'It is possible to apply multiple styles, by passing an array. This paragraph uses two styles: quote and small. When multiple styles are provided, they are evaluated in the specified order which is important in case they define the same properties',
			style: ['quote', 'small']
		},
		{
			text: [
				{
					text: 'Subheader 3 - using inline text',
					style: 'subheader',
					id: 'subheader3',
					tocItem: true
				},
				{
					text: '; and this text not be displayed in ToC',
					italics: true
				}
			],
			pageBreak: 'before'
		},
		'Lorem ipsum dolor sit amet, consectetur adipisicing elit. Confectum ponit legam, perferendis nomine miserum, animi. Moveat nesciunt triari naturam posset, eveniunt specie deorsus efficiat sermone instituendarum fuisse veniat, eademque mutat debeo. Delectet plerique protervi diogenem dixerit logikh levius probabo adipiscuntur afficitur, factis magistra inprobitatem aliquo andriam obiecta, religionis, imitarentur studiis quam, clamat intereant vulgo admonitionem operis iudex stabilitas vacillare scriptum nixam, reperiri inveniri maestitiam istius eaque dissentias idcirco gravis, refert suscipiet recte sapiens oportet ipsam terentianus, perpauca sedatio aliena video.'
	],
	styles: {
		header: {
			fontSize: 18,
			bold: true
		},
		subheader: {
			fontSize: 15,
			bold: true
		},
		quote: {
			italics: true
		},
		small: {
			fontSize: 8
		}
	}
};

var now = new Date();
var pdfDoc = printer.createPdfKitDocument(docDefinition);
pdfDoc.pipe(fs.createWriteStream('pdfs/pageReference.pdf'));
pdfDoc.end();

console.log(new Date() - now);
