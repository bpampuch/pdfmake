/**
 * Includes checkboxes and radio group forms
 */
const ExtendedAcroFormMixin = {

	extendedFormAnnotation(name, type, x, y, w, h, options = {}, appearanceId) {
		let resolvedType = type == 'radioChild' ? null : type; 
		let fieldDict = this._fieldDict(name, resolvedType, options);

		//TODO adobe acrobat doesn't like 0 font size
		Object.assign(fieldDict, {
			DR: this.page.resources,
			DA: new String(`/${this._font.id} ${options.fontSize || this._fontSize} Tf 0 g`),
		});

		if (fieldDict.fontSize) {
			delete fieldDict.fontSize;
		}

		fieldDict.Subtype = 'Widget';

		if (fieldDict.F === undefined) {
			fieldDict.F = 4; 
		} 
		
		if ((type == 'checkbox' || type == 'radioChild') && appearanceId) {
			this.createAppearances(x, y, w, h, fieldDict, type, appearanceId);
		}
		
		this.annotate(x, y, w, h, fieldDict);

		let annotRef = this.page.annotations[this.page.annotations.length - 1];
		return this._addToParent(annotRef);

	},

	createAppearances(x, y, w, h, options = {}, type, appearanceId) {
		const dimentions = [x, y, w, h];

		if (type == 'radioChild') { //radio field
			delete options.T;
		}

		if (options.selected) {
			options.AS = appearanceId;
			options.V = appearanceId;

		} else {
			options.AS = "Off";
			options.V = "Off";
		}
		
		delete options.selected;
		delete options.fontSize;

		let resolvedType;
		switch (type) {
			case 'radioChild':
				resolvedType = 'RadioButton';
				break;
			case 'checkbox':
				resolvedType = 'Checkbox';
				break;
			default:
				break;
		}

		const CA = Appearance[resolvedType].getCA();
		const AP = Appearance[resolvedType].createAppearance(this, appearanceId, dimentions);

		Object.assign(options, {MK: {CA}, AP});

		return options;
	},

	_createAppearanceField(dimentions, stream) {
		const appr = this.ref({
			Type: 'XObject',
			Subtype: 'Form',
			FormType: 1,
			BBox: dimentions,
			Resources: this.page.resources
		});

		appr.end(stream);

		return appr;
	},

	_getParentRadioField(parentName) {
		const ref = this._getParent(parentName);
		let groupRef;

		if (ref == null) { 
			groupRef = this.formField(parentName, {
				FT: 'Btn',
				Ff: 32768, //TODO
				F: 4,
				T: new String(parentName),
				Kids: [],
			});
		} else {
			groupRef = ref;
		}
		
		if (groupRef == null) {
			throw new Error(`Unable to create parent: ${parentName}`);
		}
			
		return groupRef;
	},

	_getParent(parentName) {
		return this._root.data.AcroForm.data.Fields.filter(ref => ref.data.T != null && ref.data.T == parentName)[0];
	},

	formRadioButton(name, x, y, w, h, options = {}) {
		if (options.parentId == null) {
			throw new Error(`Unable to find key 'parentId' for radio form field: ${name}`);
		}

		const parentName = options.parentId;

		options.Parent = this._getParentRadioField(parentName);

		if (options.selected) { 
			this._getParent(parentName).data.V = name;
		}
		
		delete options.parentId;

		return this.extendedFormAnnotation(name, 'radioChild', x, y, w, h, options, name);
	},

	formCheckbox(name, x, y, w, h, options = {}) {
		return this.extendedFormAnnotation(name, 'checkbox', x, y, w, h, options, "On");
	},

	formText(name, x, y, w, h, options = {}) {
		return this.extendedFormAnnotation(name, 'text', x, y, w, h, options);
	},

	formPushButton(name, x, y, w, h, options = {}) {
		return this.extendedFormAnnotation(name, 'pushButton', x, y, w, h, options);
	},

	formCombo(name, x, y, w, h, options = {}) {
		return this.extendedFormAnnotation(name, 'combo', x, y, w, h, options);
	},

	formList(name, x, y, w, h, options = {}) {
		return this.extendedFormAnnotation(name, 'list', x, y, w, h, options);
	},

	addFontToAcroFormDict() {
		this._acroform.fonts[this._font.id] = this._font.ref();
	}
};

//TODO doc definition to customise this
const Appearance = {
	Checkbox: {
		createAppearance(pdfDocument, appearanceId, dimentions) {
			const APStream =  this.getTrueAPStream(pdfDocument);
			return {
				N: {
					[appearanceId]: pdfDocument._createAppearanceField(dimentions, APStream),
					"Off": pdfDocument._createAppearanceField(dimentions, APStream)
				},
				//R
				D: {
					[appearanceId]: pdfDocument._createAppearanceField(dimentions, APStream),
					"Off": pdfDocument._createAppearanceField(dimentions, APStream)
				}
			};
		},
		getTrueAPStream(pdfDocument) {
			return `
q
0 0 1 rg
BT
	/${pdfDocument._font.id} ${pdfDocument._fontSize} Tf
	0 0 Td
	(${this.getCA()}) Tj
ET
Q`;
		},
		getCA() {
			return new String(3);
		}
	},
	RadioButton: {
		createAppearance(pdfDocument, appearanceId, dimentions) {
			const APStream =  this.getTrueAPStream(pdfDocument);
			return {
				N: {
					[appearanceId]: pdfDocument._createAppearanceField(dimentions, APStream),
					"Off": pdfDocument._createAppearanceField(dimentions, APStream)
				},
				//R
				D: {
					[appearanceId]: pdfDocument._createAppearanceField(dimentions, APStream),
					"Off": pdfDocument._createAppearanceField(dimentions, APStream)
				}
			};
		},
		getTrueAPStream(pdfDocument) {
			return `
q
0 0 1 rg
BT
	/${pdfDocument._font.id} ${pdfDocument._fontSize} Tf
	0 0 Td
	(${this.getCA()}) Tj
ET
Q`;
		},
		getCA() {
			return new String(8);
		}
	}
};

export default ExtendedAcroFormMixin;
