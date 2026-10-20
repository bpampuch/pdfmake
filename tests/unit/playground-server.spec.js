const assert = require('assert');
const http = require('http');
const { createServer } = require('../../dev-playground/server');

describe('Static development playground server', function () {
	let server;
	before(function (done) {
		server = createServer();
		server.listen(0, '127.0.0.1', done);
	});
	after(function (done) { server.close(done); });
	function request(path, method = 'GET') {
		return new Promise((resolve, reject) => {
			const req = http.request({ hostname: '127.0.0.1', port: server.address().port, path, method }, res => {
				const chunks = [];
				res.on('data', chunk => chunks.push(chunk));
				res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks).toString() }));
			});
			req.on('error', reject); req.end();
		});
	}
	it('serves the rewritten UI with no server-side evaluation endpoint', async function () {
		assert.equal((await request('/')).headers.location, process.env.PDFMAKE_DOCS_URL || 'https://pdfmake.github.io/docs/0.3/');
		assert.equal((await request('/pdf', 'POST')).status, 405);
		assert.equal((await request('/playground/worker.js', 'POST')).status, 405);
		const page = await request('/playground/');
		assert.equal(page.status, 200);
		assert.ok(page.body.includes('Document definition'));
	});
	it('restricts paths and gives workers a network-blocking policy', async function () {
		const traversal = await request('/playground/..%2f..%2fpackage.json');
		assert.equal(traversal.status, 403);
		const worker = await request('/playground/worker.js');
		assert.equal(worker.status, 200);
		assert.ok(worker.headers['content-security-policy'].includes("connect-src 'none'"));
	});
});
