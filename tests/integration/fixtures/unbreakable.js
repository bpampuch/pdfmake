'use strict';

var image = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAwAAAAGAQMAAADNIO3CAAAAA1BMVEUAAN7GEcIJAAAAAWJLR0QAiAUdSAAAAAlwSFlzAAALEwAACxMBAJqcGAAAAAd0SU1FB98DBREbA3IZ3d8AAAALSURBVAjXY2BABwAAEgAB74lUpAAAAABJRU5ErkJggg==';
var jpeg = 'data:image/jpeg;base64,' + require('fs').readFileSync(require('path').join(__dirname, '../../../examples/images/sampleImage.jpg')).toString('base64');

var elementTypes = ['text', 'ul', 'ol', 'columns', 'table', 'spans', 'image', 'jpeg', 'cover', 'svg', 'canvas', 'pattern', 'qr', 'attachment', 'references', 'toc', 'positioned', 'absolute', 'mixed'];
// Test elements individually in basic layouts; use mixed content in additional contexts.
var individualTypes = elementTypes.filter(type => type !== 'mixed');
var modes = {
	short: individualTypes,
	'short-table': individualTypes,
	stack: individualTypes,
	table: individualTypes,
	'table-header': ['text', 'table', 'spans'],
	nested: ['text', 'mixed'],
	'nested-table': ['table', 'spans', 'mixed'],
	columns: ['text', 'table', 'absolute'],
	snaking: ['text', 'table', 'mixed'],
	section: ['table', 'mixed'],
	callback: ['text', 'spans', 'references'],
	margins: ['table', 'positioned', 'absolute'],
	landscape: ['spans', 'absolute'],
	watermark: ['mixed']
};

function element(type, prefix) {
	switch (type) {
		case 'text':
			return { text: [
				{ text: prefix, bold: true, color: '#123456', background: '#eeeeee', decoration: 'underline' },
				{ text: ' link', link: 'https://example.com/', italics: true },
				{ text: '2', sup: true }, { text: '3', sub: true }
			], alignment: 'center', margin: [2, 3, 4, 5] };
		case 'ul':
			return { ul: [prefix, { ul: ['nested', 'bullet'], type: 'square' }], color: '#336699' };
		case 'ol':
			return { ol: [prefix, { ol: ['nested', 'number'], type: 'lower-alpha' }], start: 3 };
		case 'columns':
			return { columns: [{ width: 50, text: prefix }, { stack: [{ text: 'right' }, { text: 'column' }] }], columnGap: 8 };
		case 'table':
			return { table: { widths: [50, '*'], headerRows: 1, body: [
				[{ text: prefix, colSpan: 2, fillColor: '#ddeeff' }, {}],
				[{ text: 'span', rowSpan: 2, verticalAlignment: 'middle' }, 'right'],
				[{}, 'bottom']
			] } };
		case 'spans':
			return { table: { widths: ['*', '*'], body: [
				[{ text: Array.from({ length: 35 }, (_, index) => prefix + '-' + index).join('\n'), rowSpan: 3, fillColor: '#eeeeff' }, { text: 'top', verticalAlignment: 'bottom' }],
				[{}, 'middle'], [{}, 'bottom']
			] } };
		case 'image':
			return { image: image, fit: [36, 24], alignment: 'right', link: 'https://example.com/' };
		case 'cover':
			return { image: image, cover: { width: 36, height: 24, valign: 'bottom', align: 'right' } };
		case 'jpeg':
			return { image: jpeg, fit: [36, 24], opacity: 0.7 };
		case 'svg':
			return { svg: '<svg xmlns="http://www.w3.org/2000/svg" width="50" height="24"><rect width="48" height="22" fill="#339966"/><circle cx="12" cy="12" r="8" fill="#ffcc00"/></svg>', width: 50, alignment: 'center' };
		case 'canvas':
			return { canvas: [
				{ type: 'rect', x: 0, y: 0, w: 45, h: 22, color: '#99ccff' },
				{ type: 'line', x1: 0, y1: 0, x2: 45, y2: 22, lineColor: '#cc0000' },
				{ type: 'ellipse', x: 22, y: 11, r1: 6, r2: 4, color: '#00aa00' },
				{ type: 'polyline', points: [{ x: 1, y: 21 }, { x: 10, y: 8 }, { x: 20, y: 21 }], lineColor: '#000099' }
			], alignment: 'center' };
		case 'qr':
			return { qr: prefix, fit: 46, foreground: '#123456', background: '#eeeeee' };
		case 'pattern':
			return { stack: [{ text: prefix, background: ['stripe', '#eeeeee'] }, { canvas: [
				{ type: 'rect', x: 0, y: 0, w: 40, h: 20, color: ['stripe', '#ccffcc'], fillOpacity: 0.7 }
			] }] };
		case 'attachment':
			return { attachment: { src: 'data:text/plain;base64,SGVsbG8=', name: prefix + '.txt' }, icon: 'Paperclip', width: 12, height: 18 };
		case 'references':
			return { stack: [
				{ text: prefix, id: prefix, tocItem: true, outline: true },
				{ text: 'jump', linkToDestination: prefix },
				{ textReference: prefix }, { pageReference: prefix }
			] };
		case 'positioned':
			return { stack: [
				{ text: prefix, relativePosition: { x: 5, y: 2 } },
				{ text: 'flow', margin: [0, 16, 0, 0] }
			] };
		case 'absolute':
			// Keep overlays below the outer table's top border, whose paint order differs with dontBreakRows.
			return { stack: ['text', 'image', 'cover', 'svg', 'canvas', 'qr', 'attachment', 'table'].map((type, index) => ({
				...element(type, prefix + '-' + type), absolutePosition: { x: 45 + index * 8, y: 80 + index * 12 }
			})).concat([{ text: 'flow' }]) };
		case 'toc':
			return { stack: [
				{ toc: { id: prefix, title: { text: 'Contents' } } },
				{ text: prefix, id: prefix + '-target', tocItem: prefix }
			] };
		case 'mixed':
			return { stack: elementTypes.filter(type => type !== 'mixed').map(type => element(type, prefix + '-' + type)) };
		default:
			throw new Error('Unknown element type: ' + type);
	}
}

function document(type, mode, reference) {
	var short = mode === 'short' || mode === 'short-table';
	var payload = [element(type, 'first')];
	if (!short) {
		payload.push({ text: Array.from({ length: 60 }, (_, index) => 'filler-' + index).join('\n') });
	}
	payload.push(element(type, 'last'));
	var block = { stack: payload };
	if (mode === 'table' || mode === 'short-table' || mode === 'table-header' || mode === 'nested-table') {
		if (mode === 'nested-table') {
			block.unbreakable = !reference;
		}
		block = { table: { dontBreakRows: !reference, widths: ['*'], body: [[block]] } };
		if (mode === 'table-header') {
			block.table.headerRows = 1;
			block.table.body.unshift([{ text: 'table-header' }]);
			if (reference) {
				block.table.body[1][0].pageBreak = 'before';
			}
		}
	} else if (mode === 'nested') {
		block = { unbreakable: !reference, stack: [{ unbreakable: !reference, stack: payload }] };
	} else {
		block.unbreakable = !reference;
	}
	if (reference && !short && mode !== 'table-header') {
		block.pageBreak = 'before';
	}
	if (mode === 'margins') {
		block.margin = [7, 9, 11, 13];
	}
	var content = [{ text: 'before' }, block, { text: 'after' }];
	if (mode === 'columns' || mode === 'snaking') {
		content = [{ columns: [{ stack: content }, { text: 'other-column' }], columnGap: 10, snakingColumns: mode === 'snaking' }];
	}
	if (mode === 'section') {
		content = [{ section: [{ text: 'first-section' }] }, { section: content, pageSize: 'A6', pageOrientation: 'landscape', pageMargins: 40 }];
	}
	return {
		pageSize: short ? 'A1' : 'A6',
		pageOrientation: mode === 'landscape' ? 'landscape' : 'portrait',
		content: content,
		patterns: { stripe: { boundingBox: [0, 0, 4, 4], xStep: 4, yStep: 4, pattern: '0.5 w 0 0 m 4 4 l S' } },
		watermark: mode === 'watermark' ? { text: 'DRAFT', fontSize: 22, opacity: 0.08 } : undefined,
		pageBreakBefore: mode === 'callback' ? (node, nodes) => node.text === 'after' && nodes.getPreviousNodesOnPage().length > 0 : undefined,
		header: currentPage => ({ text: 'header-' + currentPage, fontSize: 8 }),
		footer: (currentPage, pageCount) => ({ text: 'footer-' + currentPage + '-' + pageCount, fontSize: 8 }),
		background: () => ({ canvas: [{ type: 'rect', x: 1, y: 1, w: 8, h: 8, color: '#dddddd' }] })
	};
}

module.exports = { elementTypes: elementTypes, modes: modes, element: element, document: document };
