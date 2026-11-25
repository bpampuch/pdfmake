'use strict';

var assert = require('assert');

var Printer = require('../../js/Printer').default;
var virtualfs = require('../../js/virtual-fs').default;
var URLResolver = require('../../js/URLResolver').default;
var defaultUrlProtocols = require('../../js/URLResolver').defaultUrlProtocols;

var SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><rect width="20" height="20" fill="#888"/></svg>';

async function render(docDefinition) {
	var fonts = { Roboto: { normal: 'fonts/Roboto/Roboto-Regular.ttf', bold: 'fonts/Roboto/Roboto-Medium.ttf' } };
	var printer = new Printer(fonts, virtualfs, new URLResolver(virtualfs, undefined, 5, defaultUrlProtocols));
	var doc = await printer.createPdfKitDocument(Object.assign({ compress: false }, docDefinition));
	var chunks = [];
	return new Promise(function (resolve, reject) {
		doc.on('data', function (chunk) { chunks.push(chunk); });
		doc.on('end', function () { resolve(Buffer.concat(chunks).toString('latin1')); });
		doc.on('error', reject);
		doc.end();
	});
}

function count(text, pattern) {
	return (text.match(pattern) || []).length;
}

describe('StructureTagger', function () {
	var content = [
		{ text: 'Title', role: 'H1', bold: true },
		{ text: 'A paragraph with a ', role: 'P' },
		{ text: [{ text: 'link', link: 'https://example.com' }] },
		{ svg: SVG, width: 20, alt: 'A grey square' },
		{ canvas: [{ type: 'line', x1: 0, y1: 0, x2: 100, y2: 0 }] },
		{ text: 'Page footer text', role: 'Artifact' }
	];

	it('should build a structure tree from roles, alt texts and links when tagged', async function () {
		var pdf = await render({ tagged: true, content: content });

		assert.ok(/\/StructTreeRoot/.test(pdf), 'has a structure tree');
		assert.equal(count(pdf, /\/S \/Document/g), 1);
		assert.equal(count(pdf, /\/S \/H1/g), 1);
		assert.ok(count(pdf, /\/S \/P\b/g) >= 2, 'paragraphs get P by default');
		assert.ok(/\/S \/Figure[\s\S]*?\/Alt \(A grey square\)/.test(pdf) || /\/Alt \(A grey square\)[\s\S]*?\/S \/Figure/.test(pdf), 'figure has alt text');
		assert.equal(count(pdf, /\/S \/Link/g), 1);
		assert.ok(/\/StructParent \d+/.test(pdf), 'link annotation points to its element');
		assert.ok(/\/Contents \(https:\/\/example\.com\)/.test(pdf), 'link has a description');
		assert.ok(count(pdf, /\/Artifact BMC/g) >= 2, 'vector and artifact text are artifacts');
		assert.ok(/\/H1 <<\s*\/MCID 0\s*>> BDC/.test(pdf), 'heading text is marked content');
	});

	it('should keep the lines of one node in one structure element', async function () {
		var long = new Array(60).join('word ');
		var pdf = await render({ tagged: true, content: [{ text: long, role: 'P' }] });

		assert.equal(count(pdf, /\/S \/P\b/g), 1);
		assert.ok(count(pdf, /\/P <<\s*\/MCID \d+\s*>> BDC/g) > 1, 'several lines');
	});

	it('should not mark content when the document is not tagged', async function () {
		var pdf = await render({ content: content });

		assert.equal(count(pdf, /BDC|BMC/g), 0);
		assert.equal(count(pdf, /\/S \/H1/g), 0);
	});
});
