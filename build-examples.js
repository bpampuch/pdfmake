const fs = require('fs');
const exec = require('child_process').exec;

var errCount = 0;
var position = 0;
process.chdir('examples');

const items = fs.readdirSync('.');
const files = items.filter(file => file.substring(file.length - 3, file.length) === '.js');

files.forEach(function (file) {
  exec(`node ${file}`, function (err, stdout, stderr) {
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
      }
    }
  });
});
