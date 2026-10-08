import { isNumber } from './helpers/variableType';

const groupDecorations = (line, pdfDocument) => {
	let groups = [];
	let currentGroup = null;
	for (let i = 0, l = line.inlines.length; i < l; i++) {
		let inline = line.inlines[i];
		let decoration = inline.decoration;
		if (!decoration) {
			currentGroup = null;
			continue;
		}
		if (!Array.isArray(decoration)) {
			decoration = [decoration];
		}
		let color = pdfDocument.resolveColor(pdfDocument.resolveColor(inline.decorationColor, inline.color), 'black');
		let style = inline.decorationStyle || 'solid';
		let thickness = isNumber(inline.decorationThickness) ? inline.decorationThickness : null;
		for (let ii = 0, ll = decoration.length; ii < ll; ii++) {
			let decorationItem = decoration[ii];
			if (!currentGroup || decorationItem !== currentGroup.decoration ||
				style !== currentGroup.decorationStyle || color !== currentGroup.decorationColor ||
				thickness !== currentGroup.decorationThickness) {

				currentGroup = {
					line: line,
					decoration: decorationItem,
					decorationColor: color,
					decorationStyle: style,
					decorationThickness: thickness,
					inlines: [inline]
				};
				groups.push(currentGroup);
			} else {
				currentGroup.inlines.push(inline);
			}
		}
	}

	return groups;
};

class TextDecorator {

	constructor(pdfDocument) {
		this.pdfDocument = pdfDocument;
	}

	drawBackground(line, x, y) {
		let height = line.getHeight();
		for (let i = 0, l = line.inlines.length; i < l; i++) {
			let inline = line.inlines[i];

			let color = this.pdfDocument.resolveColor(inline.background, undefined);
			if (!color) {
				continue;
			}

			let patternColor = this.pdfDocument.providePattern(inline.background);
			if (patternColor !== null) {
				color = patternColor;
			}

			let top = y;
			let inlineHeight = height;
			if (inline.baseline !== undefined) {
				// lineHeightMode 'css': the background covers the content area of the font, not the whole line box
				top = y + line.getAscenderHeight() - inline.font.ascender / 1000 * inline.fontSize;
				inlineHeight = inline.naturalHeight;
			}

			let justifyShift = (inline.justifyShift || 0);
			let rectX = x + inline.x - justifyShift;
			let rectWidth = inline.width + justifyShift;

			let lineStart = x + Math.min(0, line.inlines[0].leadingIndent || 0);
			if (line.leadingCut > 0 && rectX < lineStart) {
				// Clip the background of trimmed whitespace at the line start,
				// keeping any negative leading indent used by the visible text.
				rectWidth = rectX + rectWidth - lineStart;
				rectX = lineStart;
				if (rectWidth <= 0) {
					continue;
				}
			}

			this.pdfDocument.fillColor(color)
				.rect(rectX, top, rectWidth, inlineHeight)
				.fill();
		}
	}

	drawDecorations(line, x, y) {
		let groups = groupDecorations(line, this.pdfDocument);
		for (let i = 0, l = groups.length; i < l; i++) {
			this._drawDecoration(groups[i], x, y);
		}
	}

	_drawDecoration(group, x, y) {
		const maxInline = () => {
			let max = 0;
			for (let i = 0, l = group.inlines.length; i < l; i++) {
				let inline = group.inlines[i];
				max = inline.fontSize > group.inlines[max].fontSize ? i : max;
			}
			return group.inlines[max];
		};

		const width = () => {
			let sum = 0;
			for (let i = 0, l = group.inlines.length; i < l; i++) {
				let justifyShift = (group.inlines[i].justifyShift || 0);
				sum += group.inlines[i].width + justifyShift;
			}
			return sum;
		};

		let firstInline = group.inlines[0];
		let biggerInline = maxInline();
		let totalWidth = width();
		let lineAscent = group.line.getAscenderHeight();
		let ascent = biggerInline.font.ascender / 1000 * biggerInline.fontSize;
		let height = biggerInline.naturalHeight !== undefined ? biggerInline.naturalHeight : biggerInline.height;
		let descent = height - ascent;

		let lw = isNumber(group.decorationThickness)
			? group.decorationThickness
			: 0.5 + Math.floor(Math.max(biggerInline.fontSize - 8, 0) / 2) * 0.12;

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
				throw new Error(`Unknown decoration : ${group.decoration}`);
		}

		if (group.inlines[0].sup) {
			y -= group.inlines[0].fontSize * 0.75;
		}
		if (group.inlines[0].sub) {
			y += group.inlines[0].fontSize * 0.35;
		}

		this.pdfDocument.save();

		if (group.decorationStyle === 'double') {
			let gap = Math.max(0.5, lw, biggerInline.fontSize * 0.15);
			this.pdfDocument.fillColor(group.decorationColor)
				.rect(x + firstInline.x, y - lw / 2, totalWidth, lw / 2).fill()
				.rect(x + firstInline.x, y + gap - lw / 2, totalWidth, lw / 2).fill();
		} else if (group.decorationStyle === 'dashed') {
			let nbDashes = Math.ceil(totalWidth / (3.96 + 2.84));
			let rdx = x + firstInline.x;
			this.pdfDocument.rect(rdx, y, totalWidth, lw).clip();
			this.pdfDocument.fillColor(group.decorationColor);
			for (let i = 0; i < nbDashes; i++) {
				this.pdfDocument.rect(rdx, y - lw / 2, 3.96, lw).fill();
				rdx += 3.96 + 2.84;
			}
		} else if (group.decorationStyle === 'dotted') {
			let nbDots = Math.ceil(totalWidth / (lw * 3));
			let rx = x + firstInline.x;
			this.pdfDocument.rect(rx, y, totalWidth, lw).clip();
			this.pdfDocument.fillColor(group.decorationColor);
			for (let i = 0; i < nbDots; i++) {
				this.pdfDocument.rect(rx, y - lw / 2, lw, lw).fill();
				rx += (lw * 3);
			}
		} else if (group.decorationStyle === 'wavy') {
			let sh = 0.7, sv = 1;
			let nbWaves = Math.ceil(totalWidth / (sh * 2)) + 1;
			let rwx = x + firstInline.x - 1;
			this.pdfDocument.rect(x + firstInline.x, y - sv, totalWidth, 2 * sv).clip();
			this.pdfDocument.lineWidth(lw / 3);
			this.pdfDocument.moveTo(rwx, y);
			for (let i = 0; i < nbWaves; i++) {
				this.pdfDocument.bezierCurveTo(rwx + sh, y - sv, rwx + sh * 2, y - sv, rwx + sh * 3, y)
					.bezierCurveTo(rwx + sh * 4, y + sv, rwx + sh * 5, y + sv, rwx + sh * 6, y);
				rwx += sh * 6;
			}
			this.pdfDocument.stroke(group.decorationColor);
		} else {
			this.pdfDocument.fillColor(group.decorationColor)
				.rect(x + firstInline.x, y - lw / 2, totalWidth, lw)
				.fill();
		}
		this.pdfDocument.restore();
	}
}

export default TextDecorator;
