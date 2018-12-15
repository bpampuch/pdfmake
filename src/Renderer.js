import { isUndefined } from './helpers/variableType';
import TextInlines from './TextInlines';
import TextDecorator from './TextDecorator';

class Renderer {

	constructor(pdfDocument, progressCallback) {
		this.pdfDocument = pdfDocument;
		this.progressCallback = progressCallback;
	}

	renderPages(pages) {
		let totalItems = 0;
		var renderedItems = 0;
		if (this.progressCallback) {
			pages.forEach((page) => {
				totalItems += page.items.length;
			});
		}

		//this.pdfDocument._pdfMakePages = pages; // TODO: Why?
		this.pdfDocument.addPage();

		for (let i = 0; i < pages.length; i++) {
			if (i > 0) {
				this._updatePageOrientationInOptions(pages[i]);
				this.pdfDocument.addPage(this.pdfDocument.options);
			}

			let page = pages[i];
			for (let ii = 0, il = page.items.length; ii < il; ii++) {
				let item = page.items[ii];
				switch (item.type) {
					case 'line':
						this.renderLine(item.item, item.item.x, item.item.y);
						break;

					case 'image':
						this.renderImage(item.item, item.item.x, item.item.y);
						break;

					case 'vector':
						this.renderVector(item.item);
						break;

					default:
						throw `Item type '${item.type}' not supported.`;
				}

				renderedItems++;

				if (this.progressCallback) {
					this.progressCallback(renderedItems / totalItems);
				}
			}
		}
	}

	renderLine(line, x, y) {
		const preparePageNodeRefLine = (_pageNodeRef, inline) => {
			let newWidth;
			let diffWidth;
			let textInlines = new TextInlines(this.pdfDocument);

			if (isUndefined(_pageNodeRef.positions)) {
				throw 'Page reference id not found';
			}

			let pageNumber = _pageNodeRef.positions[0].pageNumber.toString();

			inline.text = pageNumber;
			inline.linkToPage = pageNumber;
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
		};

		if (line._pageNodeRef) {
			preparePageNodeRefLine(line._pageNodeRef, line.inlines[0]);
		}

		x = x || 0;
		y = y || 0;

		let lineHeight = line.getHeight();
		let ascenderHeight = line.getAscenderHeight();
		let descent = lineHeight - ascenderHeight;

		let textDecorator = new TextDecorator(this.pdfDocument);
		textDecorator.drawBackground(line, x, y);

		// TODO: line.optimizeInlines();
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

	renderImage(image, x, y) {
		this.pdfDocument.opacity(image.opacity || 1);
		this.pdfDocument.image(image.image, image.x, image.y, { width: image._width, height: image._height });
		if (image.link) {
			this.pdfDocument.link(image.x, image.y, image._width, image._height, image.link);
		}
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

		switch (vector.type) {
			case 'ellipse':
				this.pdfDocument.ellipse(vector.x, vector.y, vector.r1, vector.r2);
				break;

			case 'rect':
				if (vector.r) {
					this.pdfDocument.roundedRect(vector.x, vector.y, vector.w, vector.h, vector.r);
				} else {
					this.pdfDocument.rect(vector.x, vector.y, vector.w, vector.h);
				}

				if (vector.linearGradient) {
					let gradient = this.pdfDocument.linearGradient(vector.x, vector.y, vector.x + vector.w, vector.y);
					let step = 1 / (vector.linearGradient.length - 1);

					for (let i = 0; i < vector.linearGradient.length; i++) {
						gradient.stop(i * step, vector.linearGradient[i]);
					}

					vector.color = gradient;
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
