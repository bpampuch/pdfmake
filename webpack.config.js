var path = require('path');

module.exports = {
  entry: './src/browser-extensions/pdfMake.js',
  output: {
    path: path.join(__dirname, './build'),
    filename: 'pdfmake.js'
  },
  resolve: {
    alias: {
      fs: path.join(__dirname, './src/browser-extensions/virtual-fs.js')
    }
  },
  module: {
    loaders: [
      { test: /\.json$/, loader: 'json' }
    ]
  }
};
