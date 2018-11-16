'use strict';

const isArray = require('./helpers').isArray;

function groupDecorations(line) {
	const groups = [];
	let currentGroup = null;
	for (let i = 0, l = line.inlines.length; i < l; i++) {
		const inline = line.inlines[i];
		let decoration = inline.decoration;
		if (!decoration) {
			currentGroup = null;
			continue;
		}
		if (!isArray(decoration)) {
			decoration = [decoration];
		}
		const color = inline.decorationColor || inline.color || 'black';
		const style = inline.decorationStyle || 'solid';
		for (let ii = 0, ll = decoration.length; ii < ll; ii++) {
			const decorationItem = decoration[ii];
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
		let max = 0;
		for (let i = 0, l = group.inlines.length; i < l; i++) {
			const inline = group.inlines[i];
			max = inline.fontSize > max ? i : max;
		}
		return group.inlines[max];
	}
	function width() {
		let sum = 0;
		for (let i = 0, l = group.inlines.length; i < l; i++) {
			const justifyShift = (group.inlines[i].justifyShift || 0);
			sum += group.inlines[i].width + justifyShift;
		}
		return sum;
	}
	const firstInline = group.inlines[0],
		biggerInline = maxInline(),
		totalWidth = width(),
		lineAscent = group.line.getAscenderHeight(),
		ascent = biggerInline.font.ascender / 1000 * biggerInline.fontSize,
		height = biggerInline.height,
		descent = height - ascent;

	const lw = 0.5 + Math.floor(Math.max(biggerInline.fontSize - 8, 0) / 2) * 0.12;

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
		const gap = Math.max(0.5, lw * 2);
		pdfKitDoc.fillColor(group.decorationColor)
			.rect(x + firstInline.x, y - lw / 2, totalWidth, lw / 2).fill()
			.rect(x + firstInline.x, y + gap - lw / 2, totalWidth, lw / 2).fill();
	} else if (group.decorationStyle === 'dashed') {
		const nbDashes = Math.ceil(totalWidth / (3.96 + 2.84));
		const rdx = x + firstInline.x;
		pdfKitDoc.rect(rdx, y, totalWidth, lw).clip();
		pdfKitDoc.fillColor(group.decorationColor);
		for (let i = 0; i < nbDashes; i++) {
			pdfKitDoc.rect(rdx, y - lw / 2, 3.96, lw).fill();
			rdx += 3.96 + 2.84;
		}
	} else if (group.decorationStyle === 'dotted') {
		const nbDots = Math.ceil(totalWidth / (lw * 3));
		const rx = x + firstInline.x;
		pdfKitDoc.rect(rx, y, totalWidth, lw).clip();
		pdfKitDoc.fillColor(group.decorationColor);
		for (let ii = 0; ii < nbDots; ii++) {
			pdfKitDoc.rect(rx, y - lw / 2, lw, lw).fill();
			rx += (lw * 3);
		}
	} else if (group.decorationStyle === 'wavy') {
		const sh = 0.7, sv = 1;
		const nbWaves = Math.ceil(totalWidth / (sh * 2)) + 1;
		const rwx = x + firstInline.x - 1;
		pdfKitDoc.rect(x + firstInline.x, y - sv, totalWidth, y + sv).clip();
		pdfKitDoc.lineWidth(0.24);
		pdfKitDoc.moveTo(rwx, y);
		for (let iii = 0; iii < nbWaves; iii++) {
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
	const groups = groupDecorations(line);
	for (let i = 0, l = groups.length; i < l; i++) {
		drawDecoration(groups[i], x, y, pdfKitDoc);
	}
}

function drawBackground(line, x, y, pdfKitDoc) {
	const height = line.getHeight();
	for (let i = 0, l = line.inlines.length; i < l; i++) {
		const inline = line.inlines[i];
		if (!inline.background) {
			continue;
		}
		const justifyShift = (inline.justifyShift || 0);
		pdfKitDoc.fillColor(inline.background)
			.rect(x + inline.x - justifyShift, y, inline.width + justifyShift, height)
			.fill();
	}
}

module.exports = {
	drawBackground: drawBackground,
	drawDecorations: drawDecorations
};