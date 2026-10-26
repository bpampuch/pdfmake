const assert = require('assert');
const pdfmake = require('../../js');
const validate = (doc, options) => pdfmake.validateDocument(doc, options);

describe('Document validation', function () {
	it('accepts 0.3.13 table alignment and rejects unsupported alignment values', function () {
		for (const tableAlignment of ['left', 'center', 'right']) {
			assert.equal(validate({ content: [{ tableAlignment, table: { body: [['x']] } }] }, { strict: true }).valid, true);
		}
		const invalid = validate({ content: [{ tableAlignment: 'justify', table: { body: [['x']] } }] });
		assert(invalid.errors.some(item => item.path === '$.content[0].tableAlignment'));
	});
	it('collects independent field errors with exact paths', function () {
		const result = validate({ content: [{ text: 'a', fontSize: 'large' }, { text: 'b', alignment: 'middle', opacity: 2 }], pageOrientation: 'sideways' });
		assert.equal(result.valid, false);
		for (const path of ['$.content[0].fontSize', '$.content[1].alignment', '$.content[1].opacity', '$.pageOrientation']) assert(result.errors.some(item => item.path === path), JSON.stringify(result));
	});
	it('supports valid nested content, table placeholders and callbacks without mutation or execution', function () {
		let called = false;
		const doc = { content: [{ text: 'heading', id: 'start' }, { columns: [{ stack: ['text', 42] }, { ul: ['a', 'b'] }, ['column paragraph', 'another']] }, { table: { body: [[{ text: 'span', colSpan: 2 }, {}], ['a', 'b']] } }, { textReference: 'start' }], header: () => { called = true; return 'header'; } };
		const before = JSON.stringify(doc);
		const result = validate(doc);
		assert.deepEqual(result.errors, []);
		assert.equal(result.valid, true);
		assert.equal(called, false);
		assert.equal(JSON.stringify(doc), before);
		assert(result.deferred.includes('$.header'));
	});
	it('reports unknown properties as warnings or strict errors', function () {
		const doc = { content: [{ text: 'x', fontSzie: 20, headlineLevel: 1 }] };
		assert.equal(validate(doc).valid, true);
		assert.equal(validate({ content: ['x'], customMetadata: { font: 'customer-data', section: 42, id: 'a' }, font: 'application-data', table: { body: [] } }).valid, true);
		assert(validate(doc).warnings.some(item => item.path === '$.content[0].fontSzie'));
		assert.equal(validate(doc, { strict: true }).valid, false);
	});
	it('checks references, styles, fonts and layout names', function () {
		const result = validate({ content: [{ text: 'a', id: 'a', style: 'missing', font: 'Missing' }, { text: 'b', id: 'a' }, { pageReference: 'unknown' }, { table: { body: [['x']] }, layout: 'missing' }] });
		for (const code of ['DUPLICATE_ID', 'STYLE_REFERENCE', 'FONT_REFERENCE', 'ID_REFERENCE', 'LAYOUT_REFERENCE']) assert(result.errors.some(item => item.code === code), code);
	});
	it('validates table shape, widths, spans, header limits and placeholders', function () {
		const result = validate({ content: [{ table: { widths: [100], headerRows: 4, body: [[{ text: 'x', colSpan: 3, rowSpan: 3 }, 'not placeholder'], ['short']] } }] });
		for (const code of ['TABLE_WIDTHS', 'TABLE_HEADERS', 'TABLE_SPAN', 'TABLE_COLUMNS', 'TABLE_SPAN_PLACEHOLDER']) assert(result.errors.some(item => item.code === code), code);
	});
	it('validates canvas, QR, page size, styles and resource descriptor shapes', function () {
		const result = validate({ content: [{ canvas: [{ type: 'rect', x: 'bad', y: 0, w: 10, h: 10 }] }, { qr: 'x', eccLevel: 'Z' }], pageSize: { width: -10, height: 'wrong' }, styles: { title: { bold: 'yes' } }, images: { photo: 42 } });
		for (const path of ['$.content[0].canvas[0].x', '$.content[1].eccLevel', '$.pageSize.height', '$.styles.title.bold', '$.images.photo']) assert(result.errors.some(item => item.path === path), JSON.stringify(result));
	});
	it('rejects cycles and accessors without running a getter', function () {
		let called = false;
		const node = { text: 'x' }; node.stack = [node];
		const doc = { content: [node] };
		Object.defineProperty(doc, 'header', { enumerable: true, get() { called = true; throw new Error('Getter executed'); } });
		const result = validate(doc);
		assert.equal(called, false);
		assert(result.errors.some(item => item.code === 'CYCLE'));
		assert(result.errors.some(item => item.code === 'ACCESSOR'));
	});
	it('enforces bounded diagnostics and depth and accepts shared non-cyclic nodes', function () {
		const shared = { text: 'x' };
		assert.equal(validate({ content: [shared, shared] }).valid, true);
		const limited = validate({ content: [{ text: 'a', fontSize: 'x' }, { text: 'b', fontSize: 'y' }] }, { maxDiagnostics: 1 });
		assert.equal(limited.valid, false);
		assert.equal(limited.errors.length, 1);
		assert.equal(limited.truncated, true);
		assert(validate({ content: [[[[['deep']]]]] }, { maxDepth: 2 }).errors.some(item => item.code === 'DEPTH'));
		assert.throws(() => validate({}, { maxDepth: 0 }), RangeError);
	});
	it('preserves negative text spacing and rejects oversized sparse arrays and nested sections', function () {
		assert.equal(validate({ content: [{ text: 'tight', characterSpacing: -1 }, {}, { table: { body: [[null, 'x']] } }] }).valid, true);
		assert(validate({ content: new Array(50001) }).errors.some(item => item.code === 'LIMIT'));
		assert(validate({ content: [{ columns: [{ section: ['bad'] }] }] }).errors.some(item => item.code === 'SECTION_LOCATION'));
		assert.equal(validate({ content: [{ stack: [{ section: ['valid'] }] }] }).valid, true);
	});
	it('offers opt-in createPdf preflight with all diagnostics on one error', function () {
		assert.throws(() => pdfmake.createPdf({ content: [{ text: 'x', fontSize: 'bad' }, { qr: 42 }] }, { validation: true }), error => error.code === 'PDFMAKE_VALIDATION_ERROR' && error.phase === 'validation' && error.diagnostics.length >= 2);
	});
});
