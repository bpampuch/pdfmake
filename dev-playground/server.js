
var http = require('http');
var express = require('express');
var path = require('path');
var _ = require('lodash');
var bodyParser = require('body-parser');

var pdfMakePrinter = require('../src/printer');

var app = express();

var rootDir = path.resolve(path.dirname(module.uri));

app.use(express.static(rootDir + '/dev-playground/public/'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

function createPdfBinary(pdfDoc, callback) {

  var fontDescriptors = {
    Roboto: {
      normal: 'examples/fonts/Roboto-Regular.ttf',
      bold: 'examples/fonts/Roboto-Medium.ttf',
      italics: 'examples/fonts/Roboto-Italic.ttf',
      bolditalics: 'examples/fonts/Roboto-Italic.ttf'
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

  createPdfBinary(req.body, function(binary) {
    res.contentType('application/pdf');
    res.send(binary);
  }, function(error) {
    res.send('ERROR:' + error);
  });

});

var server = http.createServer(app);
var port = process.env.PORT || 1234;
server.listen(port);

console.log('http server listening on %d', port);
