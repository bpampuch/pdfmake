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
	constructor(fonts = {}, images = {}, patterns = {}, options = {}, virtualfs = null) {
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
		this.virtualfs = virtualfs;
		this.formRadioMap = {}; //key: ref
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

	setOpenActionAsPrint() {
		let printActionRef = this.ref({
			Type: 'Action',
			S: 'Named',
			N: 'Print'
		});
		this._root.data.OpenAction = printActionRef;
		printActionRef.end();
	}

	formRadiobutton(name, x, y, w, h, options) {
		const rect = this._convertRect(x, y, w, h);
		const parentName = options.parentId

		if (options == null || parentName == null) 
			throw new Error(`Options missing 'parentId'`);

		const key = Object.keys(this.formRadioMap).filter(key => key == parentName)[0]
		let groupRef;

		if (key == null) { 
			groupRef = this.ref({
				FT: 'Btn',
				Ff: 32768,
				F: 4,
				T: new String(parentName),
				Kids: [],
			})
			this.formRadioMap[parentName] = groupRef
		} else {
			groupRef = this.formRadioMap[parentName]
		}
		
		if (groupRef == null) 
			throw new Error(`Unable to create radio group`);
		
		const trueRef = this.ref({
			Type: 'XObject',
			Subtype: 'Form',
			FormType: 1,
			BBox: rect,
			Resources: {
				ProcSet: ["PDF"]
			}
		})

		const dtrueRef = this.ref({
			Type: 'XObject',
			Subtype: 'Form',
			FormType: 1,
			BBox: rect,
			Resources: {
				ProcSet: ["PDF"]
			}
		})

		const offRef = this.ref({
			Type: 'XObject',
			Subtype: 'Form',
			FormType: 1,
			BBox: rect,
			Resources: {
				ProcSet: ["PDF"]
			}
		})

		const formId = name
		// name + (children.length + 1)

		const childRef = this.ref({
			Type: 'Annot',
			Subtype: 'Widget',
			Rect: rect,
			AS: formId,
			Parent: groupRef,
			MK: {
				CA: new String(8)
			},
			AP: {
				N: {
					[formId]: trueRef,
				},
				D: {
					[formId]: dtrueRef,
					Off: offRef
				}
			}
		})

		childRef.end()
		trueRef.end()
		dtrueRef.end()
		offRef.end()

		this.page.annotations.push(childRef); 
		this._root.data.AcroForm.data.Fields.push(childRef); 

		this.formRadioMap[parentName].data.Kids.push(childRef)
		if (options.selected) { 
			this.formRadioMap[parentName].data.V = formId
		}
	}

	writeRadioForms() {
		Object.keys(this.formRadioMap).forEach(key => {
			this.formRadioMap[key].end()
		})
	}

	//handle decorations, image replacement of tick
	formCheckbox(name, x, y, w, h) {
		const rect = this._convertRect(x, y, w, h);

		const trueRef = this.ref({
			Type: 'XObject',
			Subtype: 'Form',
			FormType: 1,
			BBox: rect,
			Resources: {
				ProcSet: ["PDF"]
			}
		})

		const dtrueRef = this.ref({
			Type: 'XObject',
			Subtype: 'Form',
			FormType: 1,
			BBox: rect,
			Resources: {
				ProcSet: ["PDF"]
			}
		})

		const offRef = this.ref({
			Type: 'XObject',
			Subtype: 'Form',
			FormType: 1,
			BBox: rect,
			Resources: {
				ProcSet: ["PDF"]
			}
		})

		//spec 556
		const checkboxRef = this.ref({
			Type: 'Annot',
			Subtype: 'Widget',
			Rect: rect,
			FT: 'Btn',
			F: 4,
			T: new String(name),
			AS: "true",
			V: "true",
			Q: 1,
			MK: {
				CA: new String(3)
			},
			AP: {
				N: {
					"true": trueRef,
				},
				D: {
					"true": dtrueRef,
					Off: offRef
				}
			}
			
		})

		//handle parents

		this.page.annotations.push(checkboxRef);
		this._root.data.AcroForm.data.Fields.push(checkboxRef); 

		checkboxRef.end()
		trueRef.end()
		dtrueRef.end()
		offRef.end()
	}
}

export default PDFDocument;
