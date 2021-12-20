/**
 * Includes checkboxes and radio group forms
 */
const ExtendedAcroFormMixin = {

	extendedFormAnnotation(name, type, x, y, w, h, options = {}, appearanceId) {
		let fieldDict = this._fieldDict(name, type, options);

		fieldDict.Subtype = 'Widget';

		if (fieldDict.F === undefined) {
			fieldDict.F = 4; 
		} 
		
		this.createApperances(x, y, w, h, fieldDict, type, appearanceId);
		this.annotate(x, y, w, h, fieldDict);

		let annotRef = this.page.annotations[this.page.annotations.length - 1];
		return this._addToParent(annotRef);

	},

	createApperances(x, y, w, h, options = {}, type, appearanceId) {
		const fontSize = options.fontSize || this._fontSize;

		let CA;
		if (type == null) {
			CA = new String(8);
		} else {
			CA = new String(3);
		}

		const APstream = `
q
	0 0 1 rg
	BT
		/${this._font.id} ${fontSize} tf
		0 0 Td
		(${CA}) Tj
	ET
Q`
		;

		Object.assign(options, {
			MK: {
				CA
			},
			AP : {
				N: {
					[appearanceId]: this._createAppearanceField(x, y, w, h, APstream),
					"Off": this._createAppearanceField(x, y, w, h, APstream)
				},
				//R
				D: {
					[appearanceId]: this._createAppearanceField(x, y, w, h, APstream),
					"Off": this._createAppearanceField(x, y, w, h, APstream)
				}
			}
			
		});
		
		if (type == null) { //radio field
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

		return options;
	},

	_createAppearanceField(x, y, w, h, stream) {
		const appr = this.ref({
			Type: 'XObject',
			Subtype: 'Form',
			FormType: 1,
			BBox: [0, 0, w, h],
			Resources: this.page.resources
		});

		appr.end(stream);

		return appr;
	},

	_getParentRadioField(parentName) {
		const key = Object.keys(this.formRadioMap).filter(key => key == parentName)[0];
		let groupRef;

		if (key == null) { 
			groupRef = this.ref({
				FT: 'Btn',
				Ff: 32768,
				F: 4,
				T: new String(parentName),
				Kids: [],
			});
			
			this.formRadioMap[parentName] = groupRef;
		} else {
			groupRef = this.formRadioMap[parentName];
		}
		
		if (groupRef == null) {
			throw new Error(`Unable to create parent: ${parentName}`);
		}
			
		return groupRef;
	},

	writeRadioForms() {
		Object.keys(this.formRadioMap).forEach(key => {
			this.formRadioMap[key].end();
		});
	},

	formRadiobutton(name, x, y, w, h, options = {}) {
		if (options.parentId == null) {
			throw new Error(`Unable to find key 'parentId' for radio form field: ${name}`);
		}

		const parentName = options.parentId;

		options.Parent = this._getParentRadioField(parentName);

		if (options.selected) { 
			this.formRadioMap[parentName].data.V = name;
		}
		
		delete options.parentId;

		return this.extendedFormAnnotation(name, null, x, y, w, h, options, name);
	},

	formCheckbox(name, x, y, w, h, options = {}) {
		return this.extendedFormAnnotation(name, 'checkbox', x, y, w, h, options, "On");
	}
};

export default ExtendedAcroFormMixin;
