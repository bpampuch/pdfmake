
var http = require('http');
var express = require('express');
var path = require('path');
var bodyParser = require('body-parser');

var pdfMakePrinter = require('../src/printer');

var app = express();

app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: false }));

function createPdfBinary(pdfDoc, callback) {

	var fontDescriptors = {
		Roboto: {
			normal: path.join(__dirname, '..', 'examples', '/fonts/Roboto-Regular.ttf'),
			bold: path.join(__dirname, '..', 'examples', '/fonts/Roboto-Medium.ttf'),
			italics: path.join(__dirname, '..', 'examples', '/fonts/Roboto-Italic.ttf'),
			bolditalics: path.join(__dirname, '..', 'examples', '/fonts/Roboto-MediumItalic.ttf')
		}
	};

	var printer = new pdfMakePrinter(fontDescriptors);

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

app.post('/pdf', function (req, res) {
	const dd = new Function(req.body.content + '; return dd;')();

	createPdfBinary(dd, function (binary) {
		res.contentType('application/pdf');
		res.send(binary);
	}, function (error) {
		res.send('ERROR:' + error);
	});

});

var server = http.createServer(app);
var port = process.env.PORT || 1234;
server.listen(port);

console.log('http server listening on %d', port);
