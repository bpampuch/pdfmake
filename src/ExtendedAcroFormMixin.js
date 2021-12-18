/**
 * Includes checkboxes and radio group forms
 */
const ExtendedAcroFormMixin = {

	//TODO
	// _fieldDict(name, type, options = {}) {
	// 	if (!this._acroform) {
	// 		throw new Error('Call document.initForms() method before adding form elements to document');
	// 	}

	// 	let opts = Object.assign({}, options);

	// 	if (type !== null) {
	// 		opts = this._resolveType(type, options);
	// 	}

	// 	opts = this._resolveFlags(opts);
	// 	opts = this._resolveJustify(opts);
	// 	opts = this._resolveFont(opts);
	// 	opts = this._resolveStrings(opts);
	// 	opts = this._resolveColors(opts);
	// 	opts = this._resolveFormat(opts);
	// 	opts.T = new String(name);

	// 	if (opts.parent) {
	// 		opts.Parent = opts.parent;
	// 		delete opts.parent;
	// 	}

	// 	return opts;
	// },

	createAppearance(rect) {
		return this.ref({
			Type: 'XObject',
			Subtype: 'Form',
			FormType: 1,
			BBox: rect,
			Resources: this.page.resources
		});
	},

	writeAppearance(ref, size = 12) {
		ref.end(
			`
			q
				0 0 1 rg
				BT
					/${this._font.id} ${size} tf
					0 0 Td
					(8) Tj
				ET
			Q
			`
		);
	},

	formRadiobutton(name, x, y, w, h, options = {}) {
		const rect = this._convertRect(x, y, w, h);
		const parentName = options.parentId;

		if (options == null || parentName == null) 
			throw new Error(`Options missing 'parentId'`);

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
		
		if (groupRef == null) 
			throw new Error(`Unable to create radio group`);
		
		const trueRef = this.createAppearance(rect);
		const dtrueRef = this.createAppearance(rect);
		const offRef = this.createAppearance(rect);
		const dOffRef = this.createAppearance(rect);

		const formId = name;

		const childRef = this.ref({
			Type: 'Annot',
			Subtype: 'Widget',
			Rect: rect,
			F: 4,
			AS: options.selected ? formId : 'Off',
			Parent: groupRef,
			MK: {
				CA: new String(8)
			},
			AP: {
				N: {
					[formId]: trueRef,
					Off: offRef
				},
				D: {
					[formId]: dtrueRef,
					Off: dOffRef
				}
			}
		});

		childRef.end();
		this.writeAppearance(trueRef);
		this.writeAppearance(dtrueRef);
		this.writeAppearance(offRef);
		this.writeAppearance(dOffRef);
		
		this.page.annotations.push(childRef); 
		this._root.data.AcroForm.data.Fields.push(childRef); 

		this.formRadioMap[parentName].data.Kids.push(childRef);
		if (options.selected) { 
			this.formRadioMap[parentName].data.V = formId;
		}
	},

	writeRadioForms() {
		Object.keys(this.formRadioMap).forEach(key => {
			this.formRadioMap[key].end();
		});
	},
	
	formCheckbox(name, x, y, w, h, options = {}) {
		const rect = this._convertRect(x, y, w, h);

		const trueRef = this.createAppearance(rect);
		const dtrueRef = this.createAppearance(rect);
		const offRef = this.createAppearance(rect);
		const dOffRef = this.createAppearance(rect);
		
		const checkboxRef = this.ref({
			Type: 'Annot',
			Subtype: 'Widget',
			Rect: rect,
			FT: 'Btn',
			F: 4,
			T: new String(name),
			AS: options && options.selected ? "true" : 'Off',
			V: options && options.selected ? "true" : 'Off',
			Q: 1,
			MK: {
				CA: new String(3)
			},
			AP: {
				N: {
					"true": trueRef,
					Off: offRef
				},
				D: {
					"true": dtrueRef,
					Off: dOffRef,
				}
			}
			
		});

		checkboxRef.end();
		this.writeAppearance(trueRef);
		this.writeAppearance(dtrueRef);
		this.writeAppearance(offRef);
		this.writeAppearance(dOffRef);

		//handle parents
		this.page.annotations.push(checkboxRef);
		this._root.data.AcroForm.data.Fields.push(checkboxRef); 
	}
};

export default ExtendedAcroFormMixin;
