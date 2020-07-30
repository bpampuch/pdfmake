const fs = require('fs');
const exec = require('child_process').exec;
const log = require('fancy-log');

var errCount = 0;
var position = 0;
process.chdir('examples');

const items = fs.readdirSync('.');
const files = items.filter(file => file.substring(file.length - 3, file.length) === '.js');

files.forEach(function (file) {
  exec(`node ${file}`, function (err, stdout, stderr) {
    position++;
    log('FILE: ', file, ` (${position}/${files.length})`);
    log(stdout);

    if (stderr) {
      errCount++;
      log.error(stderr);
    } else if (err) {
      errCount++;
      log.error(err);
    }

    if (position === files.length) {
      if (errCount) {
        log.error('Errors count: ', errCount);
      }
    }
  });
});
