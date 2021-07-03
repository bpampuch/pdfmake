const fs = require('fs');

const sourceFolder = './examples/fonts/';
const vfsFilename = './build/vfs_fonts.js';
const vfsBefore = "var vfs = ";
const vfsAfter = "; if (typeof this.pdfMake !== 'undefined' && typeof this.pdfMake.addVirtualFileSystem !== 'undefined') { this.pdfMake.addVirtualFileSystem(vfs); } if (typeof module !== 'undefined') { module.exports = vfs; }";

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
