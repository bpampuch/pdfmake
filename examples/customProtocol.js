var pdfmake = require('../js/index'); // only during development, otherwise use the following line
//var pdfmake = require('pdfmake');

var fs = require('fs').promises;
var path = require('path');

var Roboto = require('../fonts/Roboto');
pdfmake.addFonts(Roboto);

// Map application URLs to known files instead of accepting arbitrary file paths.
var assets = {
	'asset://images/sample.jpg': path.join(__dirname, 'images/sampleImage.jpg')
};

pdfmake.setUrlAccessPolicy(url => Object.prototype.hasOwnProperty.call(assets, url));
pdfmake.setLocalAccessPolicy(() => true);

// URLResolver checks the URL access policy before calling the handler.
// eslint-disable-next-line no-unused-vars
pdfmake.registerUrlProtocol('asset', async (url, headers, validateUrlAccessPolicy) => {
	// url: the requested resource URL, for example asset://images/sample.jpg.
	// headers: request headers from the resource definition; defaults to an empty object.
	// validateUrlAccessPolicy(targetUrl): checks the configured URL access policy and throws if access is denied.
	// Call it before following each redirect. It allows access when no policy is configured.
	// This local file handler does not need headers and does not follow redirects.
	var filename = assets[url];
	if (!filename) {
		throw new Error('Unknown asset: ' + url);
	}

	var data = await fs.readFile(filename);

	return {
		buffer: data,
		url: url // Return the final URL if the handler follows redirects.
	};
});

var docDefinition = {
	content: [
		{ text: 'Custom URL protocol', fontSize: 20, margin: [0, 0, 0, 12] },
		'This image is loaded from asset://images/sample.jpg using a registered protocol handler.',
		{ image: 'sample', width: 250, margin: [0, 12, 0, 0] }
	],
	images: {
		sample: { url: 'asset://images/sample.jpg', cache: true }
	}
};

var now = new Date();

var pdf = pdfmake.createPdf(docDefinition);
pdf.write('pdfs/customProtocol.pdf').then(() => {
	console.log(new Date() - now);
}, err => {
	console.error(err);
});
