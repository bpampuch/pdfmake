const fs = require('fs');

const sourceFolder = './examples/fonts/';
const vfsFilename = './build/vfs_fonts.js';
const vfsBefore = "this.pdfMake = this.pdfMake || {}; this.pdfMake.vfs = ";
const vfsAfter = ";";

var vfs = {};

var files = fs.readdirSync(sourceFolder);

files.forEach(function (file) {
  var fileBase64 = fs.readFileSync(sourceFolder + file).toString('base64');
  console.log('FILE:', file);

  vfs[file] = fileBase64;
});

const vfsFileContent = vfsBefore + JSON.stringify(vfs, null, 2) + vfsAfter;
fs.writeFileSync(vfsFilename, vfsFileContent);

console.log();
console.log('Builded ' + files.length + ' files to ' + vfsFilename + '.');
