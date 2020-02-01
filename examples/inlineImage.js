var fonts = {
  Roboto: {
    normal: 'fonts/Roboto-Regular.ttf',
    bold: 'fonts/Roboto-Medium.ttf',
    italics: 'fonts/Roboto-Italic.ttf',
    bolditalics: 'fonts/Roboto-MediumItalic.ttf'
  }
};

var pdfmake = require('../js/index');
pdfmake.setFonts(fonts);

var docDefinition = {
  content: [
    {
      text: [{ text: 'Hello ' }, { image: 'fonts/sampleImage.jpg', width: 20, height: 30 }, { text: ' World', style: 'em' }
      ]
    }],
  styles: {
    em: { bold: true }
  }
};

var now = new Date();

var pdf = pdfmake.createPdf(docDefinition);
pdf.write('pdfs/inlineImage.pdf');

console.log(new Date() - now);