/**
 * Example demonstrating snaking columns with grouped content.
 * This shows how content flows from column 1 to column 2 across groups.
 */

var pdfmake = require('../js/index');
var Roboto = require('../fonts/Roboto');

pdfmake.addFonts(Roboto);

// Real planet data
var planets = [
	{ name: 'Mercury', distance: '57.9 million km', type: 'Terrestrial', moons: 0 },
	{ name: 'Venus', distance: '108.2 million km', type: 'Terrestrial', moons: 0 },
	{ name: 'Earth', distance: '149.6 million km', type: 'Terrestrial', moons: 1 },
	{ name: 'Mars', distance: '227.9 million km', type: 'Terrestrial', moons: 2 },
	{ name: 'Jupiter', distance: '778.5 million km', type: 'Gas Giant', moons: 95 },
	{ name: 'Saturn', distance: '1.434 billion km', type: 'Gas Giant', moons: 146 },
	{ name: 'Uranus', distance: '2.873 billion km', type: 'Ice Giant', moons: 27 },
	{ name: 'Neptune', distance: '4.495 billion km', type: 'Ice Giant', moons: 14 }
];

// Real star data
var stars = [
	'Sirius - Brightest star in night sky',
	'Canopus - 2nd brightest, in Carina constellation',
	'Alpha Centauri - Closest star system at 4.37 light-years',
	'Arcturus - Red giant in Boötes constellation',
	'Vega - Blue-white star in Lyra constellation',
	'Capella - Twin bright stars in Auriga',
	'Rigel - Blue supergiant in Orion',
	'Procyon - 8.39 light-years from Earth',
	'Achernar - Hot blue star in Eridanus',
	'Betelgeuse - Red supergiant in Orion',
	'Hadar - Triple star system in Centaurus',
	'Aldebaran - Red giant in Taurus constellation'
];

// Real galaxy data
var galaxies = [
	'Andromeda Galaxy - Closest major galaxy to Milky Way',
	'Triangulum Galaxy - Third largest in Local Group',
	'Large Magellanic Cloud - Satellite of Milky Way',
	'Small Magellanic Cloud - Dwarf galaxy companion',
	'Centaurus A - Giant elliptical galaxy',
	'M87 - Supergiant elliptical galaxy with black hole',
	'Sombrero Galaxy - Edge-on spiral galaxy',
	'Pinwheel Galaxy - Face-on spiral in Ursa Major',
	'Whirlpool Galaxy - Interacting spiral galaxy',
	'Black Eye Galaxy - Spiral with dark dust lane'
];

// Real nebula data
var nebulas = [
	'Orion Nebula - Brightest nebula, stellar nursery',
	'Crab Nebula - Supernova remnant from 1054 AD',
	'Eagle Nebula - Contains Pillars of Creation',
	'Ring Nebula - Planetary nebula in Lyra',
	'Horsehead Nebula - Dark nebula in Orion',
	'Cat\'s Eye Nebula - Planetary nebula with rings',
	'Helix Nebula - Closest planetary nebula to Earth',
	'Dumbbell Nebula - Planetary nebula in Vulpecula',
	'Lagoon Nebula - Emission nebula in Sagittarius',
	'Trifid Nebula - Three-lobed emission nebula',
	'Veil Nebula - Supernova remnant filaments',
	'Tarantula Nebula - Giant H II region in LMC',
	'Pillars of Creation - Star-forming region in Eagle',
	'Boomerang Nebula - Fastest-expanding nebula',
	'Saturn Nebula - Planetary nebula in Aquarius'
];

// Real moon data
var moons = [
	'Earth\'s Moon - Only natural satellite of Earth',
	'Phobos - Larger moon of Mars, decaying orbit',
	'Deimos - Smaller moon of Mars',
	'Io - Most volcanically active body in solar system',
	'Europa - Icy moon with subsurface ocean',
	'Ganymede - Largest moon in solar system',
	'Callisto - Ancient heavily cratered moon',
	'Titan - Moon of Saturn with thick atmosphere',
	'Enceladus - Saturn\'s moon with geysers',
	'Mimas - Moon with massive Herschel crater'
];

// Helper to format celestial data
function formatPlanetData(planetList) {
	var items = [];
	for (var i = 0; i < planetList.length; i++) {
		var p = planetList[i];
		items.push({
			text: (i + 1) + '. ' + p.name + ' - ' + p.type + ', ' + p.distance + ' from Sun, ' + p.moons + ' moons',
			margin: [0, 3, 0, 3]
		});
	}
	return items;
}

function formatStringList(stringList) {
	var items = [];
	for (var i = 0; i < stringList.length; i++) {
		items.push({ text: (i + 1) + '. ' + stringList[i], margin: [0, 3, 0, 3] });
	}
	return items;
}

var docDefinition = {
	content: [
		{ text: 'Snaking Columns - Grouped Content Demo', style: 'header', margin: [0, 0, 0, 10] },
		{ text: 'This demonstrates snaking columns with grouped content. Content flows from Column 1 to Column 2 on the same page.', style: 'description', margin: [0, 0, 0, 15] },

		{
			columns: [
				{
					width: '*',
					// Stack property groups content to ensure it moves together
					stack: [
							{ text: 'PLANETS', bold: true, fontSize: 14, margin: [0, 0, 0, 5] }
					].concat(formatPlanetData(planets)).concat([
						{ text: 'STARS', bold: true, fontSize: 14, margin: [0, 10, 0, 5] }
					]).concat(formatStringList(stars)).concat([
						{ text: 'GALAXIES', bold: true, fontSize: 14, margin: [0, 10, 0, 5] }
					]).concat(formatStringList(galaxies)).concat([
						{ text: 'NEBULAS', bold: true, fontSize: 14, margin: [0, 10, 0, 5] }
					]).concat(formatStringList(nebulas)).concat([
						{ text: 'MOONS', bold: true, fontSize: 14, margin: [0, 10, 0, 5] }
					]).concat(formatStringList(moons))
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

var pdf = pdfmake.createPdf(docDefinition);
pdf.write('pdfs/snaking_columns_grouped.pdf').then(function () {
	console.log('PDF saved to pdfs/snaking_columns_grouped.pdf');
});
