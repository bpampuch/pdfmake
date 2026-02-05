/**
 * Example demonstrating SVG and wide content inside snaking columns.
 * Tests how snaking columns handle content that may be wider than the column.
 */

var pdfmake = require('../js/index');
var Roboto = require('../fonts/Roboto');

pdfmake.addFonts(Roboto);

// Generate some text content
var lines = [];
for (var i = 1; i <= 50; i++) {
	lines.push('Text line ' + i + ': Standard content that flows normally.');
}

var docDefinition = {
	content: [
		{ text: 'SVG Content in Snaking Columns', style: 'header' },
		{ text: 'This example demonstrates how SVG graphics render within snaking columns.', style: 'description' },
		' ',

		{
			columns: [
				{
					stack: [
						{ text: 'Section 1: Introduction', style: 'sectionTitle' },
						{ text: 'Below is an SVG graphic that fits within the column width.', marginBottom: 10 },

						// SVG that fits within column
						{
							svg: '<svg width="180" height="60"><rect width="180" height="60" fill="#3498db" rx="5"/><text x="90" y="35" text-anchor="middle" fill="white" font-size="14">Fitted SVG</text></svg>',
							marginBottom: 15
						},

						{ text: 'Section 2: Chart Placeholder', style: 'sectionTitle' },
						{
							svg: '<svg width="180" height="100"><rect width="180" height="100" fill="#ecf0f1" stroke="#bdc3c7" stroke-width="2"/><rect x="10" y="70" width="25" height="20" fill="#e74c3c"/><rect x="45" y="50" width="25" height="40" fill="#f39c12"/><rect x="80" y="30" width="25" height="60" fill="#2ecc71"/><rect x="115" y="20" width="25" height="70" fill="#3498db"/><rect x="150" y="40" width="25" height="50" fill="#9b59b6"/><text x="90" y="15" text-anchor="middle" fill="#34495e" font-size="10">Sample Bar Chart</text></svg>',
							marginBottom: 15
						},

						{ text: 'Section 3: Icon Row', style: 'sectionTitle' },
						{
							columns: [
								{
									svg: '<svg width="40" height="40"><circle cx="20" cy="20" r="18" fill="#e74c3c"/><text x="20" y="25" text-anchor="middle" fill="white" font-size="12">1</text></svg>',
									width: 50
								},
								{
									svg: '<svg width="40" height="40"><circle cx="20" cy="20" r="18" fill="#f39c12"/><text x="20" y="25" text-anchor="middle" fill="white" font-size="12">2</text></svg>',
									width: 50
								},
								{
									svg: '<svg width="40" height="40"><circle cx="20" cy="20" r="18" fill="#2ecc71"/><text x="20" y="25" text-anchor="middle" fill="white" font-size="12">3</text></svg>',
									width: 50
								}
							],
							columnGap: 5,
							marginBottom: 15
						},

						{ text: 'Section 4: Detailed Content', style: 'sectionTitle' },
						{ text: lines.join('\n'), fontSize: 9 },

						// More SVG content to extend the page
						{ text: 'Section 5: Status Indicators', style: 'sectionTitle', marginTop: 15 },
						{
							columns: [
								{
									svg: '<svg width="60" height="60"><circle cx="30" cy="30" r="28" fill="#27ae60"/><path d="M20 30 L27 37 L42 22" stroke="white" stroke-width="4" fill="none"/></svg>',
									width: 70
								},
								{
									svg: '<svg width="60" height="60"><circle cx="30" cy="30" r="28" fill="#f39c12"/><rect x="27" y="15" width="6" height="20" fill="white"/><circle cx="30" cy="42" r="4" fill="white"/></svg>',
									width: 70
								},
								{
									svg: '<svg width="60" height="60"><circle cx="30" cy="30" r="28" fill="#e74c3c"/><path d="M20 20 L40 40 M40 20 L20 40" stroke="white" stroke-width="4"/></svg>',
									width: 70
								}
							],
							columnGap: 10,
							marginBottom: 15
						},
						{ text: 'Success, Warning, and Error status indicators shown above.', fontSize: 9, marginBottom: 15 },

						{ text: 'Section 6: Progress Bars', style: 'sectionTitle' },
						{
							svg: '<svg width="200" height="25"><rect width="200" height="25" fill="#ecf0f1" rx="5"/><rect width="150" height="25" fill="#3498db" rx="5"/><text x="100" y="17" text-anchor="middle" fill="white" font-size="12">75%</text></svg>',
							marginBottom: 10
						},
						{
							svg: '<svg width="200" height="25"><rect width="200" height="25" fill="#ecf0f1" rx="5"/><rect width="90" height="25" fill="#2ecc71" rx="5"/><text x="100" y="17" text-anchor="middle" fill="#333" font-size="12">45%</text></svg>',
							marginBottom: 10
						},
						{
							svg: '<svg width="200" height="25"><rect width="200" height="25" fill="#ecf0f1" rx="5"/><rect width="180" height="25" fill="#e74c3c" rx="5"/><text x="100" y="17" text-anchor="middle" fill="white" font-size="12">90%</text></svg>',
							marginBottom: 15
						},

						{ text: 'Section 7: Pie Chart', style: 'sectionTitle' },
						{
							svg: '<svg width="150" height="150" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="#3498db"/><path d="M50 50 L50 10 A40 40 0 0 1 90 50 Z" fill="#e74c3c"/><path d="M50 50 L90 50 A40 40 0 0 1 50 90 Z" fill="#2ecc71"/><circle cx="50" cy="50" r="20" fill="white"/><text x="50" y="55" text-anchor="middle" fill="#333" font-size="8">Stats</text></svg>',
							marginBottom: 15
						}
					]
				},
				{ text: '' } // Empty second column for snaking
			],
			columnGap: 30,
			snakingColumns: true
		},

		{ text: 'After SVG Sections', style: 'subheader', margin: [0, 15, 0, 5] },
		{ text: 'All SVG elements rendered correctly within the snaking layout.', style: 'description' }
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
		sectionTitle: {
			fontSize: 12,
			bold: true,
			color: '#2c3e50',
			marginBottom: 8
		},
		description: {
			fontSize: 10,
			italics: true,
			color: '#666',
			marginBottom: 5
		}
	}
};

var pdf = pdfmake.createPdf(docDefinition);
pdf.write('pdfs/snaking_columns_svg.pdf').then(function () {
	console.log('PDF saved to pdfs/snaking_columns_svg.pdf');
});
