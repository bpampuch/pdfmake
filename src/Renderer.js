import TextDecorator from './TextDecorator';
import TextInlines from './TextInlines';

var getSvgToPDF = function () {
	try {
		// optional dependency to support svg nodes
		return require('svg-to-pdfkit');
	} catch (e) {
		throw new Error('Please install svg-to-pdfkit to enable svg nodes');
	}
};

const findFont = (fonts, requiredFonts, defaultFont) => {
	for (let i = 0; i < requiredFonts.length; i++) {
		let requiredFont = requiredFonts[i].toLowerCase();

		for (let font in fonts) {
			if (font.toLowerCase() === requiredFont) {
				return font;
			}
		}
	}

	return defaultFont;
};

class Renderer {
	constructor(pdfDocument, progressCallback) {
		this.pdfDocument = pdfDocument;
		this.progressCallback = progressCallback;
	}

	renderPages(pages) {
		this.pdfDocument._pdfMakePages = pages; // TODO: Why?
		this.pdfDocument.addPage();

		let totalItems = 0;
		if (this.progressCallback) {
			pages.forEach(page => {
				totalItems += page.items.length;
			});
		}

		let renderedItems = 0;

		for (let i = 0; i < pages.length; i++) {
			if (i > 0) {
				this._updatePageOrientationInOptions(pages[i]);
				this.pdfDocument.addPage(this.pdfDocument.options);
			}

			let page = pages[i];
			for (let ii = 0, il = page.items.length; ii < il; ii++) {
				let item = page.items[ii];
				switch (item.type) {
					case 'vector':
						this.renderVector(item.item);
						break;
					case 'line':
						this.renderLine(item.item, item.item.x, item.item.y);
						break;
					case 'image':
						this.renderImage(item.item);
						break;
					case 'svg':
						this.renderSVG(item.item);
						break;
					case 'beginClip':
						this.beginClip(item.item);
						break;
					case 'endClip':
						this.endClip();
						break;
				}
				renderedItems++;
				if (this.progressCallback) {
					this.progressCallback(renderedItems / totalItems);
				}
			}
			if (page.watermark) {
				this.renderWatermark(page);
			}
		}
	}

	renderLine(line, x, y) {
		function preparePageNodeRefLine(_pageNodeRef, inline) {
			let newWidth;
			let diffWidth;
			let textInlines = new TextInlines(null);

			if (_pageNodeRef.positions === undefined) {
				throw new Error('Page reference id not found');
			}

			let pageNumber = _pageNodeRef.positions[0].pageNumber.toString();

			inline.text = pageNumber;
			newWidth = textInlines.widthOfText(inline.text, inline);
			diffWidth = inline.width - newWidth;
			inline.width = newWidth;

			switch (inline.alignment) {
				case 'right':
					inline.x += diffWidth;
					break;
				case 'center':
					inline.x += diffWidth / 2;
					break;
			}
		}

		if (line._pageNodeRef) {
			preparePageNodeRefLine(line._pageNodeRef, line.inlines[0]);
		}

		x = x || 0;
		y = y || 0;

		let lineHeight = line.getHeight();
		let ascenderHeight = line.getAscenderHeight();
		let descent = lineHeight - ascenderHeight;

		const textDecorator = new TextDecorator(this.pdfDocument);

		textDecorator.drawBackground(line, x, y);

		//TODO: line.optimizeInlines();
		//TOOD: lines without differently styled inlines should be written to pdf as one stream
		for (let i = 0, l = line.inlines.length; i < l; i++) {
			let inline = line.inlines[i];
			let shiftToBaseline = lineHeight - ((inline.font.ascender / 1000) * inline.fontSize) - descent;

			if (inline._pageNodeRef) {
				preparePageNodeRefLine(inline._pageNodeRef, inline);
			}

			let options = {
				lineBreak: false,
				textWidth: inline.width,
				characterSpacing: inline.characterSpacing,
				wordCount: 1,
				link: inline.link
			};

			if (inline.linkToDestination) {
				options.goTo = inline.linkToDestination;
			}

			if (line.id && i === 0) {
				options.destination = line.id;
			}

			if (inline.fontFeatures) {
				options.features = inline.fontFeatures;
			}

			this.pdfDocument.opacity(inline.opacity || 1);
			this.pdfDocument.fill(inline.color || 'black');

			this.pdfDocument._font = inline.font;
			this.pdfDocument.fontSize(inline.fontSize);
			this.pdfDocument.text(inline.text, x + inline.x, y + shiftToBaseline, options);

			if (inline.linkToPage) {
				this.pdfDocument.ref({ Type: 'Action', S: 'GoTo', D: [inline.linkToPage, 0, 0] }).end();
				this.pdfDocument.annotate(x + inline.x, y + shiftToBaseline, inline.width, inline.height, { Subtype: 'Link', Dest: [inline.linkToPage - 1, 'XYZ', null, null, null] });
			}

		}

		textDecorator.drawDecorations(line, x, y);
	}

	renderVector(vector) {
		//TODO: pdf optimization (there's no need to write all properties everytime)
		this.pdfDocument.lineWidth(vector.lineWidth || 1);
		if (vector.dash) {
			this.pdfDocument.dash(vector.dash.length, { space: vector.dash.space || vector.dash.length, phase: vector.dash.phase || 0 });
		} else {
			this.pdfDocument.undash();
		}
		this.pdfDocument.lineJoin(vector.lineJoin || 'miter');
		this.pdfDocument.lineCap(vector.lineCap || 'butt');

		//TODO: clipping

		let gradient = null;

		switch (vector.type) {
			case 'ellipse':
				this.pdfDocument.ellipse(vector.x, vector.y, vector.r1, vector.r2);

				if (vector.linearGradient) {
					gradient = this.pdfDocument.linearGradient(vector.x - vector.r1, vector.y, vector.x + vector.r1, vector.y);
				}
				break;
			case 'rect':
				if (vector.r) {
					this.pdfDocument.roundedRect(vector.x, vector.y, vector.w, vector.h, vector.r);
				} else {
					this.pdfDocument.rect(vector.x, vector.y, vector.w, vector.h);
				}

				if (vector.linearGradient) {
					gradient = this.pdfDocument.linearGradient(vector.x, vector.y, vector.x + vector.w, vector.y);
				}
				break;
			case 'line':
				this.pdfDocument.moveTo(vector.x1, vector.y1);
				this.pdfDocument.lineTo(vector.x2, vector.y2);
				break;
			case 'polyline':
				if (vector.points.length === 0) {
					break;
				}

				this.pdfDocument.moveTo(vector.points[0].x, vector.points[0].y);
				for (let i = 1, l = vector.points.length; i < l; i++) {
					this.pdfDocument.lineTo(vector.points[i].x, vector.points[i].y);
				}

				if (vector.points.length > 1) {
					let p1 = vector.points[0];
					let pn = vector.points[vector.points.length - 1];

					if (vector.closePath || p1.x === pn.x && p1.y === pn.y) {
						this.pdfDocument.closePath();
					}
				}
				break;
			case 'path':
				this.pdfDocument.path(vector.d);
				break;
		}

		if (vector.linearGradient && gradient) {
			let step = 1 / (vector.linearGradient.length - 1);

			for (let i = 0; i < vector.linearGradient.length; i++) {
				gradient.stop(i * step, vector.linearGradient[i]);
			}

			vector.color = gradient;
		}

		if (vector.color && vector.lineColor) {
			this.pdfDocument.fillColor(vector.color, vector.fillOpacity || 1);
			this.pdfDocument.strokeColor(vector.lineColor, vector.strokeOpacity || 1);
			this.pdfDocument.fillAndStroke();
		} else if (vector.color) {
			this.pdfDocument.fillColor(vector.color, vector.fillOpacity || 1);
			this.pdfDocument.fill();
		} else {
			this.pdfDocument.strokeColor(vector.lineColor || 'black', vector.strokeOpacity || 1);
			this.pdfDocument.stroke();
		}
	}

	renderImage(image) {
		this.pdfDocument.opacity(image.opacity || 1);
		this.pdfDocument.image(image.image, image.x, image.y, { width: image._width, height: image._height });
		if (image.link) {
			this.pdfDocument.link(image.x, image.y, image._width, image._height, image.link);
		}
	}

	renderSVG(svg) {
		let options = Object.assign({ width: svg._width, height: svg._height, assumePt: true }, svg.options);
		options.fontCallback = (family, bold, italic, fontOptions) => {
			fontOptions.fauxBold = bold;
			fontOptions.fauxItalic = italic;

			let fontsFamily = family.split(',').map(f => f.trim().replace(/('|")/g, ''));
			let font = findFont(this.pdfDocument.fonts, fontsFamily, svg.font || 'Roboto');

			let fontFile = this.pdfDocument.getFontFile(font, bold, italic);
			if (fontFile === null) {
				let type = this.pdfDocument.getFontType(bold, italic);
				throw new Error(`Font '${font}' in style '${type}' is not defined in the font section of the document definition.`);
			}

			return fontFile;
		};

		getSvgToPDF()(this.pdfDocument, svg.svg, svg.x, svg.y, options);
	}

	beginClip(rect) {
		this.pdfDocument.save();
		this.pdfDocument.addContent(`${rect.x} ${rect.y} ${rect.width} ${rect.height} re`);
		this.pdfDocument.clip();
	}

	endClip() {
		this.pdfDocument.restore();
	}

	renderWatermark(page) {
		let watermark = page.watermark;

		this.pdfDocument.fill(watermark.color);
		this.pdfDocument.opacity(watermark.opacity);

		this.pdfDocument.save();

		this.pdfDocument.rotate(watermark.angle, { origin: [this.pdfDocument.page.width / 2, this.pdfDocument.page.height / 2] });

		let x = this.pdfDocument.page.width / 2 - watermark._size.size.width / 2;
		let y = this.pdfDocument.page.height / 2 - watermark._size.size.height / 2;

		this.pdfDocument._font = watermark.font;
		this.pdfDocument.fontSize(watermark.fontSize);
		this.pdfDocument.text(watermark.text, x, y, { lineBreak: false });

		this.pdfDocument.restore();
	}

	_updatePageOrientationInOptions(currentPage) {
		let previousPageOrientation = this.pdfDocument.options.size[0] > this.pdfDocument.options.size[1] ? 'landscape' : 'portrait';

		if (currentPage.pageSize.orientation !== previousPageOrientation) {
			let width = this.pdfDocument.options.size[0];
			let height = this.pdfDocument.options.size[1];
			this.pdfDocument.options.size = [height, width];
		}
	}
}

export default Renderer;
