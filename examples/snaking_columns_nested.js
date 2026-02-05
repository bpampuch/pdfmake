/**
 * Example demonstrating nested regular columns inside snaking columns.
 * The outer columns use snakingColumns, while inner columns are standard.
 */

var pdfmake = require('../js/index');
var Roboto = require('../fonts/Roboto');

pdfmake.addFonts(Roboto);

// Generate content that will overflow to demonstrate snaking
var lines = [];
for (var i = 1; i <= 80; i++) {
	lines.push('Line ' + i + ': Lorem ipsum dolor sit amet.');
}

var docDefinition = {
	content: [
		{ text: 'Nested Columns Inside Snaking Columns', style: 'header' },
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
						{ text: lines.join('\n'), fontSize: 9 }
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

		{ text: 'End of Document', style: 'subheader', margin: [0, 15, 0, 5] },
		{ text: 'The nested columns remained side-by-side while the outer layout snaked.', style: 'description' }
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
pdf.write('pdfs/snaking_columns_nested.pdf').then(function () {
	console.log('PDF saved to pdfs/snaking_columns_nested.pdf');
});
