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


function mixedSizes(decoration, sizes) {
	return {
		text: sizes.map(size => ({ text: size + ' pt ', fontSize: size })),
		decoration: decoration,
		decorationColor: '#2563eb',
		margin: [0, 4, 0, 14]
	};
}

function mixedThicknesses(decoration) {
	return {
		text: [
			{ text: 'Thin (1 pt) ', decorationThickness: 1 },
			{ text: 'Thick (3 pt) ', decorationThickness: 3 },
			{ text: 'Thin (1 pt)', decorationThickness: 1 }
		],
		fontSize: 22,
		decoration: decoration,
		decorationColor: '#2563eb',
		margin: [0, 6, 0, 24]
	};
}

var content = [
	{ text: 'Text decoration fixes', style: 'title' },
	{ text: '1. Largest font in a decoration group', style: 'heading' },
	{
		text: 'The decoration uses the largest font in each group, regardless of the order of the text fragments. Compare the position and thickness in each pair below.',
		style: 'description'
	}
];

['underline', 'overline', 'lineThrough'].forEach(function (decoration) {
	content.push(
		{ text: decoration, style: 'heading' },
		{ text: 'Largest font first', style: 'label' },
		mixedSizes(decoration, [30, 20, 10]),
		{ text: 'Largest font last', style: 'label' },
		mixedSizes(decoration, [10, 20, 30])
	);
});

content.push(
	{ text: '2. Different decoration thicknesses', style: 'title', pageBreak: 'before' },
	{
		text: 'Adjacent fragments have the same font, decoration style and color. Only decorationThickness changes. Each fragment should retain its own thickness instead of inheriting the first one.',
		style: 'description'
	}
);

['underline', 'overline', 'lineThrough'].forEach(function (decoration) {
	content.push({ text: decoration, style: 'heading' }, mixedThicknesses(decoration));
});

content.push(
	{ text: 'Explicit thickness and automatic thickness', style: 'heading' },
	{
		text: [
			{ text: 'Explicit 3 pt ', decorationThickness: 3 },
			{ text: 'Automatic ', decorationThickness: null },
			{ text: 'Explicit 1 pt', decorationThickness: 1 }
		],
		fontSize: 22,
		decoration: 'underline',
		decorationColor: '#2563eb'
	},
	{ text: '3. Wavy decorations and clipping', style: 'title', pageBreak: 'before' },
	{
		text: 'Identical samples appear near the top, middle and bottom of the page. The wave clipping height is always 2 pt (1 pt above and below its center), independent of the vertical position. Its width follows the decorated text.',
		style: 'description'
	}
);

[150, 380, 640].forEach(function (y) {
	content.push({
		absolutePosition: { x: 48, y: y },
		stack: [
			{ text: 'Sample at y = ' + y + ' pt', style: 'label', margin: [0, 0, 0, 8] },
			{
				text: [
					{ text: 'Underline', decoration: 'underline' },
					'    ',
					{ text: 'Overline', decoration: 'overline' },
					'    ',
					{ text: 'Strike', decoration: 'lineThrough' }
				],
				fontSize: 22,
				decorationStyle: 'wavy',
				decorationColor: '#2563eb',
				decorationThickness: 2
			}
		]
	});
});

var docDefinition = {
	pageSize: 'A4',
	pageMargins: [48, 45, 48, 45],
	defaultStyle: { fontSize: 11, color: '#1f2937' },
	styles: {
		title: { fontSize: 22, bold: true, margin: [0, 0, 0, 16] },
		heading: { fontSize: 14, bold: true, margin: [0, 10, 0, 6] },
		description: { lineHeight: 1.3, margin: [0, 0, 0, 16] },
		label: { fontSize: 10, color: '#64748b' }
	},
	content: content,
	footer: (currentPage, pageCount) => ({ text: currentPage + ' / ' + pageCount, alignment: 'center', fontSize: 9 })
};

var now = new Date();
var pdf = pdfmake.createPdf(docDefinition);
pdf.write('pdfs/textDecorations_fixes.pdf').then(() => {
	console.log(new Date() - now);
}, err => {
	console.error(err);
});
