var pdfmake = require('../js/index'); // only during development, otherwise use the following line
//var pdfmake = require('pdfmake');

var Roboto = require('../fonts/Roboto');
pdfmake.addFonts(Roboto);

var left = 20;
var width = 130;
var top = 20;
var height = 130;
var yAxisWidth = 30;
var xAxisHeight = 30;
var tickSize = 5;

var chartLines = [];
var chartText = [];
var chart = [{ stack: chartText }, { canvas: chartLines }];

buildXAxis();
buildYAxis();

var docDefinition = {
	content: [
		{ text: 'We sometimes don\'t know the absolute position of text', margin: [10, 0, 0, 50] },
		{
			columns: [
				{ width: '50%', text: 'horizontal position is not known either' },
				{ width: '50%', stack: chart }
			]
		},
		{ text: 'We can position relative with center and right alignment', margin: [0, 50, 0, 50] },
		{
			table: {
				widths: [100, 100, 100],
				body: [
					['Column with a lot of text. Column with a lot of text. Column with a lot of text. Column with a lot of text.',
						{
							text: 'I\'m aligned center',
							style: {
								alignment: 'center',
							},
							relativePosition: {
								x: 0,
								y: 25,
							}
						},
						{
							text: 'I\'m aligned right',
							style: {
								alignment: 'right',
							},
							relativePosition: {
								x: 0,
								y: 25,
							}
						}]
				]
			}
		}
	]
};

var now = new Date();

var pdf = pdfmake.createPdf(docDefinition);
pdf.write('pdfs/relative.pdf').then(() => {
	console.log(new Date() - now);
}, err => {
	console.error(err);
});

function buildXAxis() {
	var xTicks = [
		{ t: '2016', x: 0, y: 0 },
		{ t: '2017', x: 25, y: 0 },
		{ t: '2018', x: 50, y: 0 },
		{ t: '2019', x: 75, y: 0 },
		{ t: '2020', x: 100, y: 0 }
	];

	chartLines.push(horizontalLine(left + yAxisWidth - 1, top + height - xAxisHeight, width - yAxisWidth + 1));

	xTicks.forEach(function (tick) {
		chartLines.push(verticalLine(left + yAxisWidth + tick.x - 0.5, top + height - xAxisHeight, tickSize));
		chartText.push({ text: tick.t, fontSize: 8, relativePosition: { x: left + yAxisWidth + tick.x - 9, y: top + height - xAxisHeight + tickSize + 2 } });
	});
}

function buildYAxis() {
	var yTicks = [
		{ t: '5', y: 0, x: 0 },
		{ t: '4', y: 25, x: 0 },
		{ t: '3', y: 50, x: 0 },
		{ t: '2', y: 75, x: 0 },
		{ t: '1', y: 100, x: 0 }
	];

	chartLines.push(verticalLine(left + yAxisWidth - 0.5, top - 0.5, height - xAxisHeight));

	yTicks.forEach(function (tick) {
		chartLines.push(horizontalLine(left + yAxisWidth - tickSize - 1, top + tick.y, tickSize));
		chartText.push({ text: tick.t, fontSize: 8, relativePosition: { x: left + yAxisWidth - tickSize - 8, y: top + tick.y - 5 } });
	});
}

function horizontalLine(x, y, length) {
	return { type: 'line', x1: x, y1: y, x2: x + length, y2: y };
}

function verticalLine(x, y, height) {
	return { type: 'line', x1: x, y1: y, x2: x, y2: y + height };
}
