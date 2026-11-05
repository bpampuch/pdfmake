const assert = require('assert');
const { PassThrough } = require('stream');
const DocPreprocessor = require('../../js/DocPreprocessor').default;
const OutputDocument = require('../../js/OutputDocument').default;
const OutputDocumentServer = require('../../js/OutputDocumentServer').default;
const fs = require('fs/promises');
const os = require('os');
const path = require('path');

describe('Document diagnostics', function () {
	it('identifies the nested list node that cannot be recognized', function () {
		assert.throws(() => new DocPreprocessor().preprocessDocument([
			{ columns: [{ ul: ['Valid', { typo: 'invalid' }] }] }
		]), error => {
			assert.equal(error.code, 'PDFMAKE_INVALID_DOCUMENT');
			assert.equal(error.path, 'content[0].columns[0].ul[1]');
			assert.ok(error.message.includes('Unrecognized document structure'));
			return true;
		});
	});
	it('reports malformed tables before low-level measurement errors', function () {
		const processor = new DocPreprocessor();
		assert.throws(() => processor.preprocessDocument([{ table: { body: [] } }]), /table.body must be a non-empty/);
		assert.throws(() => processor.preprocessDocument([{ table: { body: [['A', 'B'], ['C']] } }]), error => {
			assert.equal(error.path, 'content[0].table.body[1]');
			assert.ok(error.message.includes('expected 2 cells'));
			return true;
		});
		assert.doesNotThrow(() => processor.preprocessDocument([{ table: { body: [[{ text: 'Span', colSpan: 2 }, {}], ['A', 'B']] } }]));
		assert.throws(() => processor.preprocessDocument([{ table: { body: [['A', undefined]] } }]), error => error.path === 'content[0].table.body[0][1]');
	});

	it('returns actionable diagnostics through the public asynchronous output API', async function () {
		const pdfmake = require('../../js/index');
		const urlPolicy = pdfmake.urlAccessPolicy;
		const localPolicy = pdfmake.localAccessPolicy;
		pdfmake.setUrlAccessPolicy(() => false);
		pdfmake.setLocalAccessPolicy(() => false);
		try {
			await assert.rejects(pdfmake.createPdf({ content: [{ stack: [{ unknown: 'node' }] }] }).getBuffer(), error => {
				assert.equal(error.code, 'PDFMAKE_INVALID_DOCUMENT');
				assert.equal(error.path, 'content[0].stack[0]');
				assert.equal(error.phase, 'preprocess');
				return true;
			});
		} finally {
			pdfmake.setUrlAccessPolicy(urlPolicy);
			pdfmake.setLocalAccessPolicy(localPolicy);
		}
	});
	it('rejects prematurely closed output instead of leaving the Promise pending', async function () {
		const stream = new PassThrough();
		stream.end = function () { this.destroy(); };
		await assert.rejects(new OutputDocument(Promise.resolve(stream)).getBuffer(), /closed before completion/);
	});
	it('reports an already destroyed output stream', async function () {
		const stream = new PassThrough();
		stream.destroy();
		await assert.rejects(new OutputDocument(Promise.resolve(stream)).getBuffer(), /destroyed before/);
	});

	it('rejects a prematurely closed file output and cleans up the destination stream', async function () {
		const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'pdfmake-diagnostics-'));
		try {
			const stream = new PassThrough();
			stream.end = function () { this.destroy(); };
			await assert.rejects(new OutputDocumentServer(Promise.resolve(stream)).write(path.join(temp, 'failed.pdf')), error => error.code === 'ERR_STREAM_PREMATURE_CLOSE');
			const throwingStream = new PassThrough();
			throwingStream.end = function () { throw new Error('Synchronous finalization failure'); };
			await assert.rejects(new OutputDocumentServer(Promise.resolve(throwingStream)).write(path.join(temp, 'thrown.pdf')), /Synchronous finalization failure/);
		} finally {
			await fs.rm(temp, { recursive: true, force: true });
		}
	});
});
