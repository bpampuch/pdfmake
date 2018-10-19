
var http = require('http');
var express = require('express');
var path = require('path');
var bodyParser = require('body-parser');

var pdfMakePrinter = require('../src/printer');

var app = express();

app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: false }));

async function createPdfBinary(pdfDoc, callback) {

	var fontDescriptors = {
		Roboto: {
			normal: path.join(__dirname, '..', 'examples', '/fonts/Roboto-Regular.ttf'),
			bold: path.join(__dirname, '..', 'examples', '/fonts/Roboto-Medium.ttf'),
			italics: path.join(__dirname, '..', 'examples', '/fonts/Roboto-Italic.ttf'),
			bolditalics: path.join(__dirname, '..', 'examples', '/fonts/Roboto-MediumItalic.ttf')
		}
	};

	var printer = new pdfMakePrinter(fontDescriptors);

	// Resolve remote images (http/https) before creating the pdfKit document
	if (typeof printer.createPdfKitDocumentAsync === 'function') {
		try {
			await printer.resolveRemoteImages(pdfDoc);
		} catch (err) { /* eslint-disable-line no-unused-vars */ }
	}

	var doc = printer.createPdfKitDocument(pdfDoc);

	var chunks = [];
	var result;

	doc.on('data', function (chunk) {
		chunks.push(chunk);
	});
	doc.on('end', function () {
		result = Buffer.concat(chunks);
		callback('data:application/pdf;base64,' + result.toString('base64'));
	});
	doc.end();

}

app.post('/pdf', async function (req, res) {
	const dd = new Function(req.body.content + '; return dd;')();
	try {
		await createPdfBinary(dd, function (binary) {
		res.contentType('application/pdf');
		res.send(binary);
		});
	} catch (error) {
		res.status(500).send('ERROR:' + error);
	}

});

var server = http.createServer(app);
var port = process.env.PORT || 1234;
server.listen(port);

console.log('http server listening on %d', port);
