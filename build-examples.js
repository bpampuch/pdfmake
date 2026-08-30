const fs = require('fs');
const path = require('path');
const exec = require('child_process').exec;

if (require.main === module) {
	buildExamples();
} else {
	makePdfReproducible();
}

function buildExamples() {
	// Resolved before chdir(), because the child processes run in examples/.
	const preloadModule = path.resolve(__dirname, path.basename(__filename));

	var errCount = 0;
	var position = 0;
	process.chdir('examples');

	const items = fs.readdirSync('.');
	const files = items.filter(file => file.substring(file.length - 3, file.length) === '.js');

	files.forEach(function (file) {
		const env = { ...process.env, UV_THREADPOOL_SIZE: '1' };

		exec(`node --require "${preloadModule}" ${file}`, { env }, function (err, stdout, stderr) {
			position++;
			console.log('FILE: ', file, ` (${position}/${files.length})`);
			console.log(stdout);

			if (stderr) {
				errCount++;
				console.error(stderr);
			} else if (err) {
				errCount++;
				console.error(err);
			}

			if (position === files.length) {
				if (errCount) {
					console.error('Errors count: ', errCount);
					process.exitCode = 1;
				}
			}
		});
	});
}

/**
 * Implement mechanisms that allow PDf binaries to not be different if the pdf contents are same.
 */
function makePdfReproducible() {
	const pdfmake = require('./js/index');
	
	const fixedCreationDate = new Date(process.env.SOURCE_DATE_EPOCH
		? Number(process.env.SOURCE_DATE_EPOCH) * 1000
		: Date.UTC(2000, 0, 1));

	const createPdf = pdfmake.createPdf.bind(pdfmake);

	pdfmake.createPdf = function (docDefinition, options) {
		// Examples setting their own creationDate keep it; invalid arguments are
		// left for createPdf() itself to reject.
		if (docDefinition !== null && typeof docDefinition === 'object' && !docDefinition.info?.creationDate) {
			docDefinition.info = { ...docDefinition.info, creationDate: fixedCreationDate };
		}

		return createPdf(docDefinition, options);
	};
}
