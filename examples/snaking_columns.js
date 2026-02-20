var pdfmake = require('../js/index'); // only during development, otherwise use the following line
//var pdfmake = require('pdfmake');

var Roboto = require('../fonts/Roboto');
pdfmake.addFonts(Roboto);

var loremIpsum = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. ';

function generateTableBody(rowCount) {
	let tableBody = [];

	tableBody.push(['Header 1', 'Header 2', 'Header 3']);

	for (var i = 1; i <= rowCount; i++) {
		tableBody.push(['Row ' + i, 'Column 2', 'Column 3']);
	}

	return tableBody;
}

function generateLines(count) {
	var lines = [];
	for (var i = 1; i <= count; i++) {
		lines.push('Line ' + i + ': Lorem ipsum dolor sit amet.');
	}

	return lines;
}

function generateTextNodes(count) {
	var items = [];
	for (var i = 1; i <= count; i++) {
		items.push({ text: 'Item ' + i + ' - A description', margin: [0, 5, 0, 5] });
	}
	return items;
}

function generateUnbreakableCards(count) {
	var cards = [];
	for (var i = 1; i <= count; i++) {
		cards.push({
			stack: [
				{ text: 'Card ' + i, fontSize: 14, bold: true, margin: [0, 0, 0, 5] },
				{ text: 'This is a description for card ' + i + '. All content in this card stays together as an unbreakable unit.', fontSize: 10 },
				{ text: 'Status: Active', fontSize: 9, color: '#666', margin: [0, 5, 0, 0] }
			],
			margin: [0, 0, 0, 10],
			fillColor: '#f9f9f9',
			padding: 10,
			unbreakable: true // This ensures the entire card stays together
		});
	}

	return cards;
}

var docDefinition = {
	content: [
		{ text: 'Snaking Columns Demo', style: 'header' },
		{ text: 'The snakingColumns: true property allows content to flow from one column to the next on the same page, similar to newspaper layouts.', style: 'description' },
		' ',

		{
			columns: [
				{ text: loremIpsum.repeat(10), width: '*' },
				{ text: '', width: '*' }
			],
			columnGap: 30,
			// Enable snaking behavior
			snakingColumns: true
		},

		{ text: 'Content After Snaking Columns', style: 'subheader', margin: [0, 10, 0, 5] },
		{ text: 'This text correctly appears after the snaking columns section, demonstrating that the layout engine properly tracks the bottom position of content spanning multiple columns.', style: 'description' },
		' ',

		{ text: 'Comparison: Regular Columns', style: 'subheader' },
		{ text: 'Without snakingColumns, each column is independent. Content in column 1 stays in column 1, and content in column 2 stays in column 2.', style: 'description' },
		' ',
		{
			columns: [
				{ text: loremIpsum },
				{ text: 'This is separate content in column 2. It does not receive overflow from column 1.', bold: true }
			],
			columnGap: 20
		},


		{ text: 'Snaking Columns with Different Widths', style: 'header', pageBreak: 'before' },
		' ',

		{ text: 'Example 1: Narrow Left Column (200pt) + Wide Right Column (*)', style: 'subheader' },
		{ text: 'Content starts in the narrow column and overflows to the wider column.', style: 'description' },
		' ',

		{
			columns: [
				{ text: loremIpsum.repeat(15), width: 200, fontSize: 10 },
				{ text: '', width: '*' }
			],
			columnGap: 30,
			snakingColumns: true
		},

		{ text: 'Example 2: Wide Left Column (350pt) + Narrow Right Column (*)', style: 'subheader', pageBreak: 'before' },
		{ text: 'Content starts in the wide column and overflows to the remaining space.', style: 'description' },
		' ',

		{
			columns: [
				{ text: loremIpsum.repeat(42), width: 350, fontSize: 10 },
				{ text: '', width: '*' }
			],
			columnGap: 30,
			snakingColumns: true
		},

		{ text: 'Example 3: Three Columns with Mixed Widths', style: 'subheader', pageBreak: 'before' },
		{ text: 'Content flows through three columns: 150pt, *, and 100pt.', style: 'description' },
		' ',

		{
			columns: [
				{ text: loremIpsum.repeat(15), width: 150, fontSize: 9 },
				{ text: '', width: '*' },
				{ text: '', width: 100 }
			],
			columnGap: 20,
			snakingColumns: true
		},

		{ text: 'Example 4: 5 Columns Snaking Across Pages', style: 'subheader' },
		{ text: 'Content flows: Col 1 -> 2 -> 3 -> 4 -> 5 -> Next Page Col 1...', style: 'description' },
		' ',

		{
			columns: [
				{ text: loremIpsum.repeat(25), fontSize: 8, width: '*' },
				{ text: '', width: '*' },
				{ text: '', width: '*' },
				{ text: '', width: '*' },
				{ text: '', width: '*' }
			],
			columnGap: 20,
			snakingColumns: true
		},

		{ text: 'Example 5: Landscape Orientation', style: 'subheader', pageBreak: 'before', pageOrientation: 'landscape' },
		{ text: 'This page should be Landscape A4.', style: 'description' },

		{
			columns: [
				{ text: loremIpsum.repeat(25), fontSize: 12, width: '*' },
				{ text: '', width: '*' },
				{ text: '', width: '*' }
			],
			columnGap: 30,
			snakingColumns: true
		},


		{ text: 'Snaking Columns with Different Column Gaps', style: 'header', pageBreak: 'before', pageOrientation: 'portrait' },
		' ',

		{ text: 'Example 1: No Gap (columnGap: 0)', style: 'subheader' },
		{ text: 'Columns are adjacent with no space between them.', style: 'description' },
		' ',

		{
			columns: [
				{ text: loremIpsum.repeat(24), fontSize: 10 },
				{ text: '', width: '*' }
			],
			columnGap: 0,
			snakingColumns: true
		},

		{ text: 'Example 2: Small Gap (columnGap: 10)', style: 'subheader', pageBreak: 'before' },
		{ text: 'A minimal 10pt gap between columns.', style: 'description' },
		' ',

		{
			columns: [
				{ text: loremIpsum.repeat(24), fontSize: 10 },
				{ text: '', width: '*' }
			],
			columnGap: 10,
			snakingColumns: true
		},

		{ text: 'Example 3: Default Gap (columnGap: 30)', style: 'subheader', pageBreak: 'before' },
		{ text: 'Standard 30pt gap - good for readability.', style: 'description' },
		' ',

		{
			columns: [
				{ text: loremIpsum.repeat(24), fontSize: 10 },
				{ text: '', width: '*' }
			],
			columnGap: 30,
			snakingColumns: true
		},

		{ text: 'Example 4: Large Gap (columnGap: 60)', style: 'subheader', pageBreak: 'before' },
		{ text: 'A wide 60pt gap creates strong visual separation.', style: 'description' },
		' ',

		{
			columns: [
				{ text: loremIpsum.repeat(24), fontSize: 10 },
				{ text: '', width: '*' }
			],
			columnGap: 60,
			snakingColumns: true
		},


		{ text: 'Snaking Columns with Table', style: 'header', pageBreak: 'before' },
		{ text: '', style: 'description' },
		' ',

		{ text: 'Example 1: Basic table', style: 'subheader' },
		{ text: '', style: 'description' },
		' ',
		{
			columns: [
				{
					table: {
						body: generateTableBody(200)
					},
					width: '*'
				},
				{ text: '', width: '*' }
			],
			columnGap: 30,
			snakingColumns: true
		},

		{ text: 'Example 2: Table with headerRows', style: 'subheader' },
		{ text: '', style: 'description' },
		' ',
		{
			columns: [
				{
					table: {
						headerRows: 1,
						body: generateTableBody(200)
					},
					width: '*'
				},
				{ text: '', width: '*' }
			],
			columnGap: 30,
			snakingColumns: true
		},

		{ text: 'Example 3: Table with headerRows and keepWithHeaderRows', style: 'subheader' },
		{ text: '', style: 'description' },
		' ',
		{
			columns: [
				{
					table: {
						headerRows: 2,
						keepWithHeaderRows: 1,
						body: generateTableBody(200)
					},
					width: '*'
				},
				{ text: '', width: '*' }
			],
			columnGap: 30,
			snakingColumns: true
		},


		{ text: 'Nested Columns Inside Snaking Columns', style: 'header', pageBreak: 'before' },
		{ text: 'This example demonstrates nested regular columns inside a snaking layout.', style: 'description' },
		' ',

		{
			columns: [
				{
					stack: [
						// Header section with nested columns (side-by-side info)
						{ text: 'Product Overview', style: 'sectionTitle' },
						{
							columns: [
								{
									width: '50%',
									stack: [
										{ text: 'Features', bold: true, marginBottom: 5 },
										{ text: '• High performance' },
										{ text: '• Low power consumption' },
										{ text: '• Compact design' }
									]
								},
								{
									width: '50%',
									stack: [
										{ text: 'Specifications', bold: true, marginBottom: 5 },
										{ text: '• Weight: 2.5 kg' },
										{ text: '• Dimensions: 10x20x5 cm' },
										{ text: '• Voltage: 12V DC' }
									]
								}
							],
							columnGap: 10,
							marginBottom: 15
							// Note: snakingColumns NOT set - these are regular side-by-side columns
						},

						// Another nested section
						{ text: 'Technical Details', style: 'sectionTitle' },
						{
							columns: [
								{ text: 'Model: XZ-1000\nVersion: 3.2.1\nSKU: ABC123', width: '50%' },
								{ text: 'Warranty: 2 years\nSupport: 24/7\nCountry: USA', width: '50%' }
							],
							columnGap: 10,
							marginBottom: 15
						},

						// Long content that will cause snaking overflow
						{ text: 'Detailed Description', style: 'sectionTitle' },
						{ text: generateLines(80).join('\n'), fontSize: 9 }
					]
				},
				{ text: '' } // Empty second column for snaking target
			],
			columnGap: 30,
			snakingColumns: true
		},

		// Section 2: Another snaking block with nested regular columns
		{ text: '', pageBreak: 'before' },
		{ text: 'Section 2: Inventory Report', style: 'header', margin: [0, 0, 0, 10] },
		{
			columns: [
				{
					stack: [
						{ text: 'Warehouse A', style: 'sectionTitle' },
						{
							columns: [
								{ text: 'In Stock: 1,250\nPending: 340\nReserved: 85', width: '50%' },
								{ text: 'Damaged: 12\nReturns: 28\nTotal: 1,715', width: '50%' }
							],
							columnGap: 10,
							marginBottom: 15
						},
						{ text: 'Warehouse B', style: 'sectionTitle' },
						{
							columns: [
								{ text: 'In Stock: 890\nPending: 120\nReserved: 45', width: '50%' },
								{ text: 'Damaged: 5\nReturns: 15\nTotal: 1,075', width: '50%' }
							],
							columnGap: 10,
							marginBottom: 15
						},
						// Content to cause snaking
						{ text: 'Inventory Notes', style: 'sectionTitle' },
						{ text: Array.from({ length: 80 }, function (_, i) { return 'Note ' + (i + 1) + ': Inventory check completed for item batch #' + (1000 + i) + '.'; }).join('\n'), fontSize: 9 }
					]
				},
				{ text: '' }
			],
			columnGap: 30,
			snakingColumns: true
		},

		// Section 3: Third snaking block with nested snaking columns (demonstrating limitation)
		{ text: '', pageBreak: 'before' },
		{ text: 'Section 3: Multi-Region Data', style: 'header', margin: [0, 0, 0, 10] },
		{
			columns: [
				{
					stack: [
						{
							text: 'Note: Currently, nested snaking columns (snaking within snaking) have limitations. The inner columns may not snake recursively as expected due to engine complexity. This example demonstrates the current behavior.',
							fontSize: 10,
							italics: true,
							color: 'gray',
							margin: [0, 0, 0, 10]
						},
						// Inner regular columns (NOT snaking) for side-by-side layout
						{
							columns: [
								{
									width: '50%',
									text: 'Inner Column 1 (Long content to force overflow):\n' + 'Inner Line\n'.repeat(20),
									fontSize: 10
								},
								{
									width: '50%',
									text: 'Inner Column 2 (Side by side content)',
									fontSize: 10
								}
							],
							columnGap: 10,
							// NOT snakingColumns - these are regular side-by-side columns
							marginBottom: 15
						},
						{ text: 'Region: North America', style: 'sectionTitle' },
						{
							columns: [
								{
									stack: [
										{ text: 'USA: $1.2M revenue' },
										{ text: 'Canada: $450K revenue' },
										{ text: 'Mexico: $320K revenue' }
									]
								},
								{ text: 'Market share: 45%' }
							],
							columnGap: 5,
							marginBottom: 10
						},
						{ text: 'Region: Europe', style: 'sectionTitle' },
						{
							columns: [
								{
									stack: [
										{ text: 'UK: $890K revenue' },
										{ text: 'Germany: $720K revenue' },
										{ text: 'France: $580K revenue' }
									]
								},
								{ text: 'Market share: 35%' }
							],
							columnGap: 5,
							marginBottom: 10
						},
						// More content to demonstrate overflow
						{ text: 'Quarterly Breakdown', style: 'sectionTitle' },
						{ text: Array.from({ length: 100 }, function (_, i) { return 'Q' + ((i % 4) + 1) + ' FY' + (2020 + Math.floor(i / 4)) + ' Entry ' + (i + 1) + ': Revenue $' + ((Math.random() * 100).toFixed(2)) + 'K recorded.'; }).join('\n'), fontSize: 9 }
					]
				},
				{ text: '' }
			],
			columnGap: 30,
			snakingColumns: true
		},

		{ text: 'Snaking Columns Stack Text Example', style: 'header', margin: [0, 0, 0, 20], pageBreak: 'before' },
		{
			columns: [
				{
					// Stack of items to test splitting across columns
					stack: generateTextNodes(100),
					width: '*'
				},
				{ text: '', width: '*' }
			],
			columnGap: 20,
			snakingColumns: true
		},


		{ text: 'Unbreakable Cards in Snaking Columns', style: 'header', pageBreak: 'before' },
		{ text: 'Each card is marked as unbreakable, ensuring it stays together when flowing between columns.', style: 'description' },
		' ',

		{
			columns: [
				{
					stack: generateUnbreakableCards(25)
				},
				{ text: '' }
			],
			columnGap: 30,
			snakingColumns: true
		},

		{ text: 'End of Cards', style: 'subheader', margin: [0, 10, 0, 5] },
		{ text: 'All cards remained intact while flowing across columns.', style: 'description' },


		{ text: 'SVG Content in Snaking Columns', style: 'header', pageBreak: 'before' },
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
						{ text: generateLines(50).join('\n'), fontSize: 9 },

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
			bold: true,
			marginTop: 10,
			marginBottom: 5
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

var now = new Date();

var pdf = pdfmake.createPdf(docDefinition);
pdf.write('pdfs/snaking_columns.pdf').then(() => {
	console.log(new Date() - now);
}, err => {
	console.error(err);
});
