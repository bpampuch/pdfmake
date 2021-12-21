var fs = require('fs');

export const isStandardFont = (name) => {
    return name in STANDARD_FONTS;
};

export const STANDARD_FONTS = {
    Courier() {
      return fs.readFileSync(__dirname + '/data/Courier.afm', 'utf8');
    },
  
    'Courier-Bold'() {
      return fs.readFileSync(__dirname + '/data/Courier-Bold.afm', 'utf8');
    },
  
    'Courier-Oblique'() {
      return fs.readFileSync(__dirname + '/data/Courier-Oblique.afm', 'utf8');
    },
  
    'Courier-BoldOblique'() {
      return fs.readFileSync(__dirname + '/data/Courier-BoldOblique.afm', 'utf8');
    },
  
    Helvetica() {
      return fs.readFileSync(__dirname + '/data/Helvetica.afm', 'utf8');
    },
  
    'Helvetica-Bold'() {
      return fs.readFileSync(__dirname + '/data/Helvetica-Bold.afm', 'utf8');
    },
  
    'Helvetica-Oblique'() {
      return fs.readFileSync(__dirname + '/data/Helvetica-Oblique.afm', 'utf8');
    },
  
    'Helvetica-BoldOblique'() {
      return fs.readFileSync(__dirname + '/data/Helvetica-BoldOblique.afm', 'utf8');
    },
  
    'Times-Roman'() {
      return fs.readFileSync(__dirname + '/data/Times-Roman.afm', 'utf8');
    },
  
    'Times-Bold'() {
      return fs.readFileSync(__dirname + '/data/Times-Bold.afm', 'utf8');
    },
  
    'Times-Italic'() {
      return fs.readFileSync(__dirname + '/data/Times-Italic.afm', 'utf8');
    },
  
    'Times-BoldItalic'() {
      return fs.readFileSync(__dirname + '/data/Times-BoldItalic.afm', 'utf8');
    },
  
    Symbol() {
      return fs.readFileSync(__dirname + '/data/Symbol.afm', 'utf8');
    },
  
    ZapfDingbats() {
      return fs.readFileSync(__dirname + '/data/ZapfDingbats.afm', 'utf8');
    }
  
};