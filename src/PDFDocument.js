import PDFKit from '@foliojs-fork/pdfkit';

const typeName = (bold, italics) => {
	let type = 'normal';
	if (bold && italics) {
		type = 'bolditalics';
	} else if (bold) {
		type = 'bold';
	} else if (italics) {
		type = 'italics';
	}
	return type;
};

class PDFDocument extends PDFKit {
	constructor(fonts = {}, images = {}, patterns = {}, attachments = {}, options = {}, virtualfs = null) {
		super(options);

		this.fonts = {};
		this.fontCache = {};
		for (let font in fonts) {
			if (fonts.hasOwnProperty(font)) {
				let fontDef = fonts[font];

				this.fonts[font] = {
					normal: fontDef.normal,
					bold: fontDef.bold,
					italics: fontDef.italics,
					bolditalics: fontDef.bolditalics
				};
			}
		}

		this.patterns = {};
		for (let pattern in patterns) {
			if (patterns.hasOwnProperty(pattern)) {
				let patternDef = patterns[pattern];
				this.patterns[pattern] = this.pattern(patternDef.boundingBox, patternDef.xStep, patternDef.yStep, patternDef.pattern, patternDef.colored);
			}
		}


		this.images = images;
		this.attachments = attachments;
		this.virtualfs = virtualfs;
	}

	getFontType(bold, italics) {
		return typeName(bold, italics);
	}

	getFontFile(familyName, bold, italics) {
		let type = this.getFontType(bold, italics);
		if (!this.fonts[familyName] || !this.fonts[familyName][type]) {
			return null;
		}

		return this.fonts[familyName][type];
	}

	provideFont(familyName, bold, italics) {
		let type = this.getFontType(bold, italics);
		if (this.getFontFile(familyName, bold, italics) === null) {
			throw new Error(`Font '${familyName}' in style '${type}' is not defined in the font section of the document definition.`);
		}

		this.fontCache[familyName] = this.fontCache[familyName] || {};

		if (!this.fontCache[familyName][type]) {
			let def = this.fonts[familyName][type];
			if (!Array.isArray(def)) {
				def = [def];
			}

			if (this.virtualfs && this.virtualfs.existsSync(def[0])) {
				def[0] = this.virtualfs.readFileSync(def[0]);
			}

			this.fontCache[familyName][type] = this.font(...def)._font;
		}

		return this.fontCache[familyName][type];
	}

	provideImage(src) {
		const realImageSrc = src => {
			let image = this.images[src];

			if (!image) {
				return src;
			}

			if (this.virtualfs && this.virtualfs.existsSync(image)) {
				return this.virtualfs.readFileSync(image);
			}

			let index = image.indexOf('base64,');
			if (index < 0) {
				return this.images[src];
			}

			return Buffer.from(image.substring(index + 7), 'base64');
		};

		if (this._imageRegistry[src]) {
			return this._imageRegistry[src];
		}

		let image;

		try {
			image = this.openImage(realImageSrc(src));
			if (!image) {
				throw new Error('No image');
			}
		} catch (error) {
			throw new Error(`Invalid image: ${error.toString()}\nImages dictionary should contain dataURL entries (or local file paths in node.js)`);
		}

		image.embed(this);
		this._imageRegistry[src] = image;

		return image;
	}

	/**
	 * @param {Array} color pdfmake format: [<pattern name>, <color>]
	 * @returns {Array} pdfkit format: [<pattern object>, <color>]
	 */
	providePattern(color) {
		if (Array.isArray(color) && color.length === 2) {
			return [this.patterns[color[0]], color[1]];
		}

		return null;
	}

	provideAttachment(src) {
		const checkRequired = obj => {
			if (!obj) {
				throw new Error('No attachment');
			}
			if (!obj.src) {
				throw new Error('The "src" key is required for attachments');
			}

			return obj;
		};

		if (typeof src === 'object') {
			return checkRequired(src);
		}

		let attachment = checkRequired(this.attachments[src]);

		if (this.virtualfs && this.virtualfs.existsSync(attachment.src)) {
			return this.virtualfs.readFileSync(attachment.src);
		}

		return attachment;
	}

	setOpenActionAsPrint() {
		let printActionRef = this.ref({
			Type: 'Action',
			S: 'Named',
			N: 'Print'
		});
		this._root.data.OpenAction = printActionRef;
		printActionRef.end();
	}
}

export default PDFDocument;
