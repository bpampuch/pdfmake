/* jslint node: true */
'use strict';

var Line = require('./line');
var pack = require('./helpers').pack;
var offsetVector = require('./helpers').offsetVector;

/**
* Creates an instance of ElementWriter - a line/vector writer, which adds
* elements to current page and sets their positions based on the context
*/
function ElementWriter(context, tracker) {
	this.setContext(context);
	this.tracker = tracker || { emit: function() { } };
}

ElementWriter.prototype.setContext = function(context) {
	this.context = context;
};

ElementWriter.prototype.addLine = function(line, dontUpdateContextPosition) {
	var height = line.getHeight();
	var context = this.context;
	var page = context.getCurrentPage();

	if (context.availableHeight < height || !page) {
		return false;
	}

	line.x = context.x + (line.x || 0);
	line.y = context.y + (line.y || 0);

	this.alignLine(line);

	page.lines.push(line);
	this.tracker.emit('lineAdded', line);

	if (!dontUpdateContextPosition) context.moveDown(height);

	return true;
};

ElementWriter.prototype.alignLine = function(line) {
	var width = this.context.availableWidth;
	var lineWidth = line.getWidth();

	var alignment = line.inlines && line.inlines.length > 0 && line.inlines[0].alignment;

	var offset = 0;
	switch(alignment) {
		case 'right':
			offset = width - lineWidth;
			break;
		case 'center':
			offset = (width - lineWidth) / 2;
			break;
	}

	if (offset) {
		line.x = (line.x || 0) + offset;
	}

	if (alignment === 'justify' &&
		!line.newLineForced &&
		!line.lastLineInParagraph &&
		line.inlines.length > 1) {
		var additionalSpacing = (width - lineWidth) / (line.inlines.length - 1);

		for(var i = 1, l = line.inlines.length; i < l; i++) {
			offset = i * additionalSpacing;

			line.inlines[i].x += offset;
		}
	}
};

ElementWriter.prototype.addImage = function(image) {
	var context = this.context;
	var page = context.getCurrentPage();

	if (context.availableHeight < image._height || !page) {
		return false;
	}

	image.x = context.x + (image.x || 0);
	image.y = context.y;

	this.alignImage(image);

	page.images.push(image);

	context.moveDown(image._height);

	return true;
};

ElementWriter.prototype.alignImage = function(image) {
	var width = this.context.availableWidth;
	var imageWidth = image._minWidth;
	var offset = 0;

	switch(image._alignment) {
		case 'right':
			offset = width - imageWidth;
			break;
		case 'center':
			offset = (width - imageWidth) / 2;
			break;
	}

	if (offset) {
		image.x = (image.x || 0) + offset;
	}
};

ElementWriter.prototype.addVector = function(vector) {
	var context = this.context;
	var page = context.getCurrentPage();

	if (page) {
		offsetVector(vector, context.x, context.y);
		page.vectors.push(vector);

		return true;
	}
};


function cloneLine(line) {
	var result = new Line(line.maxWidth);

	for(var key in line) {
		if (line.hasOwnProperty(key)) {
			result[key] = line[key];
		}
	}

	return result;
}

ElementWriter.prototype.addFragment = function(block, isRepeatable) {
	var ctx = this.context;
	var page = ctx.getCurrentPage();

	if (block.height > ctx.availableHeight) return false;

	block.lines.forEach(function(line) {
		var l = cloneLine(line);

		l.x = (l.x || 0) + (isRepeatable ? block.xOffset : ctx.x);
		l.y = (l.y || 0) + ctx.y;

		page.lines.push(l);
	});

	block.vectors.forEach(function(vector) {
		var v = pack(vector);

		offsetVector(v, isRepeatable ? block.xOffset : ctx.x, ctx.y);
		page.vectors.push(v);
	});

	block.images.forEach(function(image) {
		var img = pack(image);

		img.x = (img.x || 0) + (isRepeatable ? block.xOffset : ctx.x);
		img.y = (img.y || 0) + ctx.y;

		page.images.push(img);
	});

	ctx.moveDown(block.height);

	return true;
};

module.exports = ElementWriter;
