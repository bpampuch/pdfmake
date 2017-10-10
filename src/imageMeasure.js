/* jslint node: true */
'use strict';

var fs = require('fs');
var PDFImage = require('pdfkit/js/image');

function ImageMeasure(pdfKitDoc, imageDictionary) {
  this.pdfKitDoc = pdfKitDoc;
  this.imageDictionary = imageDictionary || {};
}

ImageMeasure.prototype.measureImage = function(src) {
  var that = this;
  var image = realImageSrc(src);

  if (this.pdfKitDoc._imageRegistry[src]) {
    return { width: this.pdfKitDoc._imageRegistry[src].width, height: this.pdfKitDoc._imageRegistry[src].height };
  }

  // check if buffer is a PNG
  if (Buffer.isBuffer(image) && image[0] === 0x89 && image[1] === 0x50 && image[2] === 0x4E && image[3] === 0x47) {
    // read PNG dimension directly from IHDR
    return { width: image.readIntBE(16, 4), height: image.readIntBE(20, 4) };
  }

  // check if buffer is a JPG
  if (Buffer.isBuffer(image) && image[0] === 0xff && image[1] === 0xd8) {
    var i = 4
    while (i < image.length - 8) {
      i += image.readUInt16BE(i);
      if (image[i] !== 255) {
        throw new Error('invalid image jpg format');
      }
      // Search JPG SOF
      if (image[i + 1] === 192 || image[i + 1] === 193 || image[i + 1] === 194) {
        return { width: image.readUInt16BE(i + 7), height: image.readUInt16BE(i + 5) };
      }
      i += 2;
    }
  }

  throw new Error('invalid image format, images should be in jpeg or png format');

  function realImageSrc(src) {
    // check if src is already a Buffer
    if (Buffer.isBuffer(src)) {
      return src;
    }

    // check if exist in imageDictionary
    var img = that.imageDictionary[src];
    if (img) {
      // check if dictionary contain a Buffer
      if (Buffer.isBuffer(img)) {
        return img;
      }
      // check if dictionary contain a base64 image
      var index = img.indexOf('base64,');
      if (index < 0) {
        return that.imageDictionary[src];
      }
      var realSrc = new Buffer(img.substring(index + 7), 'base64');
      // register base64 image in pdfkit
      if (!that.pdfKitDoc._imageRegistry[src]) {
        var image;
        var label = label = 'I' + (++that.pdfKitDoc._imageCount);
        try {
          image = PDFImage.open(realSrc, label);
        } catch (error) {
          throw new Error('invalid image, images dictionary should contain dataURL entries (or local file paths in node.js)');
        }
        image.embed(that.pdfKitDoc);
        that.pdfKitDoc._imageRegistry[src] = image;
      }
      return realSrc;
    }

    // check if src is a local file path
    try {
      that.imageDictionary[src] = fs.readFileSync(src);
      return that.imageDictionary[src];
    } catch(e) {
      throw new Error('invalid image, images should contain dataURL entries (or local file paths in node.js)');
    }
  }
};

module.exports = ImageMeasure;
