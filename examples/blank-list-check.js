var fs = require('fs');
var path = require('path');
var pdfmake = require('../js/index'); // only during development, otherwise use the following line
// var pdfmake = require('pdfmake');
var Roboto = require('../fonts/Roboto');
pdfmake.addFonts(Roboto);
var docDefinition = {
	content: [
		{ text: 'Ordered list with an empty item:', margin: [0, 0, 0, 12] },
		{
			ol: [
				'First item',
				'Second item',
				'',
				'Fourth item'
			]
		},
		{ text: 'Unordered list with an empty item:', margin: [0, 16, 0, 12] },
		{
			ul: [
				'First bullet',
				'',
				'Third bullet'
			]
		}
	]
};
var outputDir = path.join(__dirname, 'pdfs');
if (!fs.existsSync(outputDir)) {
	fs.mkdirSync(outputDir, { recursive: true });
}
var outputPath = path.join(outputDir, 'blank-list-gap.pdf');
pdfmake.createPdf(docDefinition).write(outputPath).then(() => {
	console.log('PDF written to ' + outputPath);
}, err => {
	console.error(err);
});
