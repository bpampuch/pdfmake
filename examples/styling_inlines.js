var pdfmake = require('../js/index'); // only during development, otherwise use the following line
//var pdfmake = require('pdfmake');

var Roboto = require('../fonts/Roboto');
pdfmake.addFonts(Roboto);

pdfmake.setUrlAccessPolicy((url) => {
	// this can be used to restrict allowed domains
	return url.startsWith('https://');
});

// eslint-disable-next-line no-unused-vars
pdfmake.setLocalAccessPolicy((path) => {
	// this can be used to restrict access to local file system
	return true;
});


var docDefinition = {
	content: [
		{
			text: 'This is a header (whole paragraph uses the same header style)\n\n',
			style: 'header'
		},
		{
			text: [
				'It is however possible to provide an array of texts ',
				'to the paragraph (instead of a single string) and have ',
				{ text: 'a better ', fontSize: 15, bold: true },
				'control over it. \nEach inline can be ',
				{ text: 'styled ', fontSize: 20 },
				{ text: 'independently ', italics: true, fontSize: 40 },
				'then.\n\n'
			]
		},
		{ text: 'Mixing named styles and style-overrides', style: 'header' },
		{
			style: 'bigger',
			italics: false,
			text: [
				'We can also mix named-styles and style-overrides at both paragraph and inline level. ',
				'For example, this paragraph uses the "bigger" style, which changes fontSize to 15 and sets italics to true. ',
				'Texts are not italics though. It\'s because we\'ve overridden italics back to false at ',
				'the paragraph level. \n\n',
				'We can also change the style of a single inline. Let\'s use a named style called header: ',
				{ text: 'like here.\n', style: 'header' },
				'It got bigger and bold.\n\n',
				'OK, now we\'re going to mix named styles and style-overrides at the inline level. ',
				'We\'ll use header style (it makes texts bigger and bold), but we\'ll override ',
				'bold back to false: ',
				{ text: 'wow! it works!', style: 'header', bold: false },
				'\n\nMake sure to take a look into the sources to understand what\'s going on here.'
			]
		},
		{ text: 'Justified text with inline styles', style: 'header', pageBreak: 'before', margin: [0, 0, 0, 20] },
		{
			text: [
				{ bold: true, text: 'psychotomimetic' },
				{ text: ' psychotomimetic ' },
				{ bold: true, text: 'psychotomimetic' },
				{ text: ', psychotomimetic ' },
				{ bold: true, text: 'psychotomimetic' },
				{ text: ', psychotomimetic ' },
				{ bold: true, text: '52245525/2245524' },
				{ text: ', ' },
				{ bold: true, text: 'A' },
				{ text: 'ds ' },
				{ bold: true, text: 'D' },
				{ text: 'nics' },
				{ bold: true, text: 'O' },
				{ text: 'registering: ' },
				{ bold: true, text: 'psychotomimetic' },
				{ text: ', e-mail: ' },
				{ bold: true, text: 'office@example.ro' },
				{ text: ', phoneee: ' },
				{ bold: true, text: '+64822645484848' },
				{ text: ', oagee ehsjrhr ' },
				{ bold: true, text: 'noun isdn-eokiorieori' },
				{ text: ', sdkfnsdddddd ' },
				{ bold: true, text: 'psychotomimetic' },
				{ text: ', cgdgsdfsddddddddddddsf ' },
				{ bold: true, text: 'sfsdfsdd' },
				{ text: '.' }
			],
			alignment: 'justify',
			margin: [57, 0, 1, 0]
		}
	],
	styles: {
		header: {
			fontSize: 18,
			bold: true
		},
		bigger: {
			fontSize: 15,
			italics: true
		}
	}
};

var now = new Date();

var pdf = pdfmake.createPdf(docDefinition);
pdf.write('pdfs/styling_inlines.pdf').then(() => {
	console.log(new Date() - now);
}, err => {
	console.error(err);
});
