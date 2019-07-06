'use strict';

var isArray = require('./helpers').isArray;

function groupDecorations(line) {
	var groups = [], currentGroup = null;
	for (var i = 0, l = line.inlines.length; i < l; i++) {
		var inline = line.inlines[i];
		var decoration = inline.decoration;
		if (!decoration) {
			currentGroup = null;
			continue;
		}
		if (!isArray(decoration)) {
			decoration = [decoration];
		}
		var color = inline.decorationColor || inline.color || 'black';
		var style = inline.decorationStyle || 'solid';
		for (var ii = 0, ll = decoration.length; ii < ll; ii++) {
			var decorationItem = decoration[ii];
			if (!currentGroup || decorationItem !== currentGroup.decoration ||
				style !== currentGroup.decorationStyle || color !== currentGroup.decorationColor) {

				currentGroup = {
					line: line,
					decoration: decorationItem,
					decorationColor: color,
					decorationStyle: style,
					inlines: [inline]
				};
				groups.push(currentGroup);
			} else {
				currentGroup.inlines.push(inline);
			}
		}
	}

	return groups;
}

function drawDecoration(group, x, y, pdfKitDoc) {
	function maxInline() {
		var max = 0;
		for (var i = 0, l = group.inlines.length; i < l; i++) {
			var inline = group.inlines[i];
			max = inline.fontSize > max ? i : max;
		}
		return group.inlines[max];
	}
	function width() {
		var sum = 0;
		for (var i = 0, l = group.inlines.length; i < l; i++) {
			var justifyShift = (group.inlines[i].justifyShift || 0);
			sum += group.inlines[i].width + justifyShift;
		}
		return sum;
	}
	var firstInline = group.inlines[0],
		biggerInline = maxInline(),
		totalWidth = width(),
		lineAscent = group.line.getAscenderHeight(),
		ascent = biggerInline.font.ascender / 1000 * biggerInline.fontSize,
		height = biggerInline.height,
		descent = height - ascent;

	var lw = 0.5 + Math.floor(Math.max(biggerInline.fontSize - 8, 0) / 2) * 0.12;

	switch (group.decoration) {
		case 'underline':
			y += lineAscent + descent * 0.45;
			break;
		case 'overline':
			y += lineAscent - (ascent * 0.85);
			break;
		case 'lineThrough':
			y += lineAscent - (ascent * 0.25);
			break;
		default:
			throw 'Unkown decoration : ' + group.decoration;
	}
	pdfKitDoc.save();

	if (group.decorationStyle === 'double') {
		var gap = Math.max(0.5, lw * 2);
		pdfKitDoc.fillColor(group.decorationColor)
			.rect(x + firstInline.x, y - lw / 2, totalWidth, lw / 2).fill()
			.rect(x + firstInline.x, y + gap - lw / 2, totalWidth, lw / 2).fill();
	} else if (group.decorationStyle === 'dashed') {
		var nbDashes = Math.ceil(totalWidth / (3.96 + 2.84));
		var rdx = x + firstInline.x;
		pdfKitDoc.rect(rdx, y, totalWidth, lw).clip();
		pdfKitDoc.fillColor(group.decorationColor);
		for (var i = 0; i < nbDashes; i++) {
			pdfKitDoc.rect(rdx, y - lw / 2, 3.96, lw).fill();
			rdx += 3.96 + 2.84;
		}
	} else if (group.decorationStyle === 'dotted') {
		var nbDots = Math.ceil(totalWidth / (lw * 3));
		var rx = x + firstInline.x;
		pdfKitDoc.rect(rx, y, totalWidth, lw).clip();
		pdfKitDoc.fillColor(group.decorationColor);
		for (var ii = 0; ii < nbDots; ii++) {
			pdfKitDoc.rect(rx, y - lw / 2, lw, lw).fill();
			rx += (lw * 3);
		}
	} else if (group.decorationStyle === 'wavy') {
		var sh = 0.7, sv = 1;
		var nbWaves = Math.ceil(totalWidth / (sh * 2)) + 1;
		var rwx = x + firstInline.x - 1;
		pdfKitDoc.rect(x + firstInline.x, y - sv, totalWidth, y + sv).clip();
		pdfKitDoc.lineWidth(0.24);
		pdfKitDoc.moveTo(rwx, y);
		for (var iii = 0; iii < nbWaves; iii++) {
			pdfKitDoc.bezierCurveTo(rwx + sh, y - sv, rwx + sh * 2, y - sv, rwx + sh * 3, y)
				.bezierCurveTo(rwx + sh * 4, y + sv, rwx + sh * 5, y + sv, rwx + sh * 6, y);
			rwx += sh * 6;
		}
		pdfKitDoc.stroke(group.decorationColor);
	} else {
		pdfKitDoc.fillColor(group.decorationColor)
			.rect(x + firstInline.x, y - lw / 2, totalWidth, lw)
			.fill();
	}
	pdfKitDoc.restore();
}

function drawDecorations(line, x, y, pdfKitDoc) {
	var groups = groupDecorations(line);
	for (var i = 0, l = groups.length; i < l; i++) {
		drawDecoration(groups[i], x, y, pdfKitDoc);
	}
}

function drawBackground(line, x, y, pdfKitDoc) {
	var height = line.getHeight();
	for (var i = 0, l = line.inlines.length; i < l; i++) {
		var inline = line.inlines[i];
		if (!inline.background) {
			continue;
		}
		var justifyShift = (inline.justifyShift || 0);
		pdfKitDoc.fillColor(inline.background)
			.rect(x + inline.x - justifyShift, y, inline.width + justifyShift, height)
			.fill();
	}
}

module.exports = {
	drawBackground: drawBackground,
	drawDecorations: drawDecorations
};
