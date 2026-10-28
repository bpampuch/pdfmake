
// Static localhost server only. Edited definitions never execute in this process.
const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const root = path.join(__dirname, 'public');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };

function createServer() {
	const docsBase = (process.env.PDFMAKE_DOCS_URL || 'https://pdfmake.github.io/docs/0.3/').replace(/\/?$/, '/');
	return http.createServer(async (req, res) => {
		if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405).end(); return; }
		try {
			const url = new URL(req.url, 'http://localhost');
			if (url.pathname === '/') { res.writeHead(302, { Location: docsBase }).end(); return; }
			if (!url.pathname.startsWith('/playground/')) {
				res.writeHead(302, { Location: new URL('.' + url.pathname, docsBase).href }).end(); return;
			}
			let file = path.resolve(root, '.' + decodeURIComponent(url.pathname.slice('/playground'.length)));
			if (file !== root && !file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
			if ((await fs.stat(file)).isDirectory()) file = path.join(file, 'index.html');
			const bytes = await fs.readFile(file);
			res.setHeader('Content-Type', (types[path.extname(file)] || 'application/octet-stream') + '; charset=utf-8');
			res.setHeader('X-Content-Type-Options', 'nosniff');
			if (path.basename(file) === 'worker.js') res.setHeader('Content-Security-Policy', "default-src 'none'; script-src 'self' 'unsafe-eval'; connect-src 'none'");
			res.writeHead(200).end(req.method === 'HEAD' ? undefined : bytes);
		} catch { res.writeHead(404).end('Not found'); }
	});
}
module.exports = { createServer };
if (require.main === module) {
	const server = createServer();
	server.listen(Number(process.env.PORT || 1234), '127.0.0.1', () => {
		console.log(`Playground: http://127.0.0.1:${server.address().port}/playground/`);
	});
}
