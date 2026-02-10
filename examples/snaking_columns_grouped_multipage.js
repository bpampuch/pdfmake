/**
 * Example demonstrating snaking columns with grouped content across MULTIPLE PAGES.
 * This tests that content properly snakes across columns and pages.
 */

var pdfmake = require('../js/index');
var Roboto = require('../fonts/Roboto');

pdfmake.addFonts(Roboto);

// Generate named items to span multiple pages
function generateNamedItems(names, count, fallbackBuilder) {
	var items = [];
	for (var i = 0; i < count; i++) {
		var name = names[i] || fallbackBuilder(i + 1);
		// Wrap in unbreakable stack to prevent splitting across columns
		items.push({
			stack: [
				{ text: (i + 1) + '. ' + name, margin: [0, 4, 0, 4] }
			],
			unbreakable: true
		});
	}
	return items;
}

var planetNames = [
	'Mercury',
	'Venus',
	'Earth',
	'Mars',
	'Jupiter',
	'Saturn',
	'Uranus',
	'Neptune',
	'Pluto',
	'Ceres',
	'Eris',
	'Haumea',
	'Makemake',
	'Kepler-22b',
	'Kepler-62f',
	'Kepler-452b',
	'Kepler-186f',
	'Kepler-700 d',
	'Kepler-700 e',
	'TRAPPIST-1e',
	'TRAPPIST-1f',
	'TRAPPIST-1g',
	'Proxima Centauri b',
	'Ross 128 b',
	'LHS 1140 b',
	'GJ 1214 b',
	'GJ 667 Cc',
	'55 Cancri e',
	'HD 209458 b',
	'WASP-12 b',
	'K2-18 b',
	'K2-18 c',
	'Kepler-442b',
	'Kepler-1649c',
	'Kepler-438b',
	'Kepler-69c',
	'Kepler-452c (fictional)',
	'Gliese 581 d',
	'Gliese 581 g (candidate)',
	'Tau Ceti e',
	'Tau Ceti f',
	'HD 40307 g',
	'Wolf 1061 c',
	'Kapteyn b',
	'Kepler-1632b',
	'Kepler-1652b',
	'Kepler-1654b',
	'Kepler-1700b',
	'Kepler-1872b',
	'Kepler-1909b',
	'Kepler-442c (fictional)',
	'Kepler-452d (fictional)',
	'Aurora Prime (fictional)',
	'Nova Terra (fictional)',
	'Helios VII (fictional)',
	'Vespera (fictional)',
	'Tycho IX (fictional)',
	'Orbitalis (fictional)'
];

var deepSpaceObjects = [
	'Andromeda Galaxy (M31)',
	'Triangulum Galaxy (M33)',
	'Whirlpool Galaxy (M51)',
	'Sombrero Galaxy (M104)',
	'Pinwheel Galaxy (M101)',
	'Black Eye Galaxy (M64)',
	'Orion Nebula (M42)',
	'Lagoon Nebula (M8)',
	'Trifid Nebula (M20)',
	'Eagle Nebula (M16)',
	'Ring Nebula (M57)',
	'Dumbbell Nebula (M27)',
	'Crab Nebula (M1)',
	'Veil Nebula',
	'Rosette Nebula',
	'Carina Nebula',
	'Helix Nebula (NGC 7293)',
	'Horsehead Nebula',
	'Cat\'s Eye Nebula (NGC 6543)',
	'Centaurus A (NGC 5128)',
	'M87 (Virgo A)',
	'Large Magellanic Cloud',
	'Small Magellanic Cloud',
	'Omega Centauri',
	'Pleiades (M45)',
	'Beehive Cluster (M44)',
	'Lagoon Cluster (NGC 6530)',
	'Jewel Box Cluster (NGC 4755)',
	'Vernal Cluster',
	'Barnard 33',
	'Tarantula Nebula (30 Doradus)',
	'Sagittarius A* region',
	'Perseus Double Cluster',
	'North America Nebula (NGC 7000)',
	'California Nebula (NGC 1499)',
	'Flame Nebula (NGC 2024)',
	'Soul Nebula (IC 1848)',
	'Heart Nebula (IC 1805)',
	'Bode\'s Galaxy (M81)',
	'Cigar Galaxy (M82)'
];

var docDefinition = {
	content: [
		{ text: 'Snaking Columns - Multi-Page Grouped Demo', style: 'header', margin: [0, 0, 0, 10] },
		{ text: 'Content snakes from Col 1 to Col 2 on Page 1, then to Col 1 on Page 2, etc.', style: 'description', margin: [0, 0, 0, 15] },

		// First columns group: Planetary Systems only
		{
			columns: [
				{
					// Stack property ensures grouped content moves together
					stack: [
						{ text: 'PLANETARY SYSTEMS', bold: true, fontSize: 14, margin: [0, 0, 0, 5] }
					].concat(generateNamedItems(planetNames, 60, function (index) {
						return 'Kepler-' + (2000 + index) + 'b';
					})),
					width: '*'
				},
				{ text: '', width: '*' }
			],
			columnGap: 30,
			snakingColumns: true
		},

		// Start Deep Space Objects on next page and use snaking columns there as well
		{
			pageBreak: 'before',
			columns: [
				{
					stack: [
						{ text: 'DEEP SPACE OBJECTS', bold: true, fontSize: 14, margin: [0, 0, 0, 5] }
					].concat(generateNamedItems(deepSpaceObjects, 40, function (index) {
						return 'NGC ' + (1000 + index);
					})),
					width: '*'
				},
				{ text: '', width: '*' }
			],
			columnGap: 30,
			snakingColumns: true
		}
	],
	styles: {
		header: {
			fontSize: 18,
			bold: true
		},
		description: {
			fontSize: 10,
			italics: true,
			color: '#666'
		}
	}
};

var now = new Date();

var pdf = pdfmake.createPdf(docDefinition);
pdf.write('pdfs/snaking_columns_grouped_multipage.pdf').then(() => {
	console.log(new Date() - now);
}, err => {
	console.error(err);
});
