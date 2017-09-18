/* jslint node: true */
'use strict';

function ImageMeasure(pdfKitDoc, imageDictionary) {
	this.pdfKitDoc = pdfKitDoc;
	this.imageDictionary = imageDictionary || {};
}

ImageMeasure.prototype.measureImage = function (src) {
	var image, label;
	var that = this;

  // check if buffer is a PNG
  if (Buffer.isBuffer(src) && src[0] === 0x89 && src[1] === 0x50 && src[2] === 0x4E && src[3] === 0x47) {
    // read PNG dimension directly from IHDR
    return {width: src.readIntBE(16, 4), height: src.readIntBE(20, 4)};
  }

  // check if buffer is a JPG
  if (Buffer.isBuffer(src) && src[0] === 0xff && src[1] === 0xd8) {
    var i = 2;
    while (i < src.length - 7) {
      // Search JPG SOF
      if (src[i] === 255) {
        if (src[i+1] === 192 || src[i+1] === 193 || src[i+1] === 194) {
          // read JPG dimension directly from SOF
          return {width: src.readUInt16BE(i+7), height: src.readUInt16BE(i+5)};
        }
      }
      ++i;
    }
  }
  throw new Error('Invalid image format');
};

module.exports = ImageMeasure;
