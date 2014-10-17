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

var ct = [];
var lorem = '{"uqr":1,"tp":1,"cid":"4907740","iref":"2333","idt":"20141031","ddt":"20141031","due":"11250","vat":"2250","pt":"BG","acc":"999 9999"} ';


ct.push({ qr: lorem });

ct.push('\n')
ct.push({ text: '{ fit:80 } : '+lorem, fontSize: 12 })
ct.push('\n')
ct.push({ qr: { value: lorem, fit: 90 }, alignment: 'right' });




  
var docDefinition = {
    content: ct
}

var pdfDoc = printer.createPdfKitDocument(docDefinition);
pdfDoc.pipe(fs.createWriteStream(mp('./pdfs/qrCode.pdf')));
pdfDoc.end();
