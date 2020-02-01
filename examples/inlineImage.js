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
      table: {
        body: [
          ['spacing  dewudf eufe fj jffewnf i dfewi jbfe jkf uideoq ifbew jiodeqw ejdnend ifdew ',
            {
              image: 'fonts/sampleImage.jpg',
              fit: [50, 50],
            },
            ' spacing ',
            {
              image: 'fonts/sampleImage.jpg',
              fit: [50, 50],
            },
            ' spacing'],
        ]
      },
      layout: 'noBorders'
    },
  ]
};

var now = new Date();

var pdf = pdfmake.createPdf(docDefinition);
pdf.write('pdfs/inlineImage.pdf');

console.log(new Date() - now);