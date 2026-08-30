const fs = require('fs');
const path = require('path');
const exec = require('child_process').exec;

if (require.main === module) {
	buildExamples();
} else {
	pinCreationDate();
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
		exec(`node --require "${preloadModule}" ${file}`, function (err, stdout, stderr) {
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
				console.log('PDFs are generated with a pinned creation date, so `git status` lists exactly the');
				console.log('examples affected by your changes (pdfs/images.pdf embeds a remote image and may');
				console.log('change independently).');

				if (errCount) {
					console.error('Errors count: ', errCount);
					process.exitCode = 1;
				}
			}
		});
	});
}


function pinCreationDate() {
	const pdfmake = require('./js/index');

	// SOURCE_DATE_EPOCH (seconds since the epoch) overrides the default,
	// following the reproducible-builds.org convention.
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
