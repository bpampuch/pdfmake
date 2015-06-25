/* jslint node: true */
/* jslint browser: true */
/* global BlobBuilder */
'use strict';

var PdfPrinter = require('../printer');
var saveAs = require('../../libs/fileSaver');

var defaultClientFonts = {
	Roboto: {
		normal: 'Roboto-Regular.ttf',
		bold: 'Roboto-Medium.ttf',
		italics: 'Roboto-Italic.ttf',
		bolditalics: 'Roboto-Italic.ttf'
	}
};

function Document(docDefinition, fonts, vfs) {
	this.docDefinition = docDefinition;
	this.fonts = fonts || defaultClientFonts;
	this.vfs = vfs;
}

Document.prototype._createDoc = function(options, callback) {
	var printer = new PdfPrinter(this.fonts);
	printer.fs.bindFS(this.vfs);

	var doc = printer.createPdfKitDocument(this.docDefinition, options);
	var chunks = [];
	var result;

	doc.on('data', function(chunk) {
		chunks.push(chunk);
	});
	doc.on('end', function() {
		result = Buffer.concat(chunks);
		callback(result, doc._pdfMakePages);
	});
	doc.end();
};

Document.prototype._getPages = function(options, cb){
  if (!cb) throw 'getBuffer is an async method and needs a callback argument';
  this._createDoc(options, function(ignoreBuffer, pages){
    cb(pages);
  });
};

Document.prototype.open = function(message) {
	// we have to open the window immediately and store the reference
	// otherwise popup blockers will stop us
	var win = window.open('', '_blank');

	try {
		this.getDataUrl(function(result) {
			win.location.href = result;
		});
	} catch(e) {
		win.close();
		throw e;
	}
};


Document.prototype.print = function() {
  this.getDataUrl(function(dataUrl) {
    var iFrame = document.createElement('iframe');
    iFrame.style.position = 'absolute';
    iFrame.style.left = '-99999px';
    iFrame.src = dataUrl;
    iFrame.onload = function() {
      function removeIFrame(){
        document.body.removeChild(iFrame);
        document.removeEventListener('click', removeIFrame);
      }
      document.addEventListener('click', removeIFrame, false);
    };

    document.body.appendChild(iFrame);
  }, { autoPrint: true });
};

Document.prototype.download = function(defaultFileName, cb) {
   if(typeof defaultFileName === "function") {
      cb = defaultFileName;
      defaultFileName = null;
   }

   defaultFileName = defaultFileName || 'file.pdf';
   this.getBuffer(function (result) {
       var blob;
       try {
           blob = new Blob([result], { type: 'application/pdf' });
       }
       catch (e) {
           // Old browser which can't handle it without making it an byte array (ie10) 
           if (e.name == "InvalidStateError") {
               var byteArray = new Uint8Array(result);
               blob = new Blob([byteArray.buffer], { type: 'application/pdf' });
           }
       }
       if (blob) {
           saveAs(blob, defaultFileName);
       }
       else {
           throw 'Could not generate blob';
       }
       if (typeof cb === "function") {
           cb();
       }
   });
};

Document.prototype.getBase64 = function(cb, options) {
	if (!cb) throw 'getBase64 is an async method and needs a callback argument';
	this._createDoc(options, function(buffer) {
		cb(buffer.toString('base64'));
	});
};

Document.prototype.getDataUrl = function(cb, options) {
	if (!cb) throw 'getDataUrl is an async method and needs a callback argument';
	this._createDoc(options, function(buffer) {
		cb('data:application/pdf;base64,' + buffer.toString('base64'));
	});
};

Document.prototype.getBuffer = function(cb, options) {
	if (!cb) throw 'getBuffer is an async method and needs a callback argument';
	this._createDoc(options, function(buffer){
    cb(buffer);
  });
};

module.exports = {
	createPdf: function(docDefinition) {
		return new Document(docDefinition, window.pdfMake.fonts, window.pdfMake.vfs);
	}
};
