var path = require("path");

function mp(relFontPath) {
    return path.resolve(__dirname, relFontPath)
}

var fonts = {
	Roboto: {
		normal: mp('./fonts/Roboto-Regular.ttf'),
		bold:  mp('./fonts/Roboto-Medium.ttf'),
		italics:  mp('./fonts/Roboto-Italic.ttf'),
		bolditalics:  mp('./fonts/Roboto-Italic.ttf')
	}
};

var PdfPrinter = require('../src/printer');
var printer = new PdfPrinter(fonts);
var fs = require('fs');

var greeting = 'Can you see me';
var url = 'http://pdfmake.org';
var longText = 'The amount of data that can be stored in the QR code symbol depends on the datatype (mode, or input character set), version (1, …, 40, indicating the overall dimensions of the symbol), and error correction level. The maximum storage capacities occur for 40-L symbols (version 40, error correction level L):'


function header(text) {
  return { text: text, margins: [ 0,0,0, 8 ] }
}

var docDefinition = {
  pageMargins: [10, 10, 10, 10],
  content: [
    header(greeting),
    { qr: greeting },
    '\n',
    
    header(url),
    { qr: url },
    '\n',
    
    header('A very long text (' + longText.length + ' chars)'),
    { qr: longText },
    '\n',
    header('same long text with fit = 100 and alignment = right'),
    { qr: longText, fit: 150, alignment: 'right' },
  ]
}

var pdfDoc = printer.createPdfKitDocument(docDefinition);
pdfDoc.pipe(fs.createWriteStream(mp('./pdfs/qrCode.pdf')));
pdfDoc.end();
