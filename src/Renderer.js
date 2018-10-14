class Renderer {

	constructor(pdfDocument) {
		this.pdfDocument = pdfDocument;
	}

	renderPages(pages) {
		//this.pdfDocument._pdfMakePages = pages;
		this.pdfDocument.addPage();

		for (let i = 0; i < pages.length; i++) {
			if (i > 0) {
				updatePageOrientationInOptions(pages[i]);
				this.pdfDocument.addPage(this.pdfDocument.options);
			}

			let page = pages[i];
			for (let ii = 0, il = page.items.length; ii < il; ii++) {
				let item = page.items[ii];
				switch (item.type) {
					case 'line':
						this.renderLine(item.item, item.item.x, item.item.y);
						break;

					// TODO

					default:
						throw 'Type not implemented'// TODO
				}
			}

		}
	}

	renderLine(line, x, y) {
		x = x || 0;
		y = y || 0;

		let lineHeight = line.getHeight();
		let ascenderHeight = line.getAscenderHeight();
		let descent = lineHeight - ascenderHeight;

		// TODO: line.optimizeInlines();
		for (let i = 0, l = line.inlines.length; i < l; i++) {
			let inline = line.inlines[i];
			let shiftToBaseline = lineHeight - ((inline.font.ascender / 1000) * inline.fontSize) - descent;

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

			this.pdfDocument.fill(inline.color || 'black');

			this.pdfDocument._font = inline.font;
			this.pdfDocument.fontSize(inline.fontSize);
			this.pdfDocument.text(inline.text, x + inline.x, y + shiftToBaseline, options);

			if (inline.linkToPage) {
				let _ref = this.pdfDocument.ref({ Type: 'Action', S: 'GoTo', D: [inline.linkToPage, 0, 0] }).end();
				this.pdfDocument.annotate(x + inline.x, y + shiftToBaseline, inline.width, inline.height, { Subtype: 'Link', Dest: [inline.linkToPage - 1, 'XYZ', null, null, null] });
			}

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
