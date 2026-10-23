'use strict';

const assert = require('assert');
const { EventEmitter } = require('events');
const OutputDocument = require('../../js/OutputDocument').default;

describe('OutputDocument', function () {
	let stream;
	let output;
	let endCalls;
	const content = Buffer.from('PDF content');
	const consumedError = /PDF stream has already been consumed/;

	beforeEach(function () {
		// Match the browser stream API without Node's readableEnded property.
		stream = new EventEmitter();
		endCalls = 0;
		stream.end = () => {
			endCalls++;
			stream.emit('data', content);
			stream.emit('end');
		};
		output = new OutputDocument(Promise.resolve(stream));
	});

	it('should return the same unread stream on repeated calls', async function () {
		assert.strictEqual(await output.getStream(), stream);
		assert.strictEqual(await output.getStream(), stream);
	});

	['getBuffer', 'getBase64', 'getDataUrl'].forEach(function (method) {
		it('should reject getStream after ' + method + ' has consumed the stream', async function () {
			await output[method]();

			await assert.rejects(output.getStream(), consumedError);
		});
	});

	it('should keep returning the buffered output after getStream rejects', async function () {
		const buffer = await output.getBuffer();
		await assert.rejects(output.getStream(), consumedError);

		assert.strictEqual(await output.getBuffer(), buffer);
		assert.deepStrictEqual(buffer, content);
		assert.equal(await output.getBase64(), content.toString('base64'));
		assert.equal(await output.getDataUrl(), 'data:application/pdf;base64,' + content.toString('base64'));
		assert.equal(endCalls, 1);
	});

	it('should reject getStream after the caller has consumed the stream directly', async function () {
		const readable = await output.getStream();
		readable.on('data', () => {});
		readable.end();

		await assert.rejects(output.getStream(), consumedError);
	});

	it('should preserve document creation errors', async function () {
		const error = new Error('Document creation failed');
		output = new OutputDocument(Promise.reject(error));

		await assert.rejects(output.getStream(), error);
		await assert.rejects(output.getBuffer(), error);
	});
});
