import PDFKit from '@foliojs-fork/pdfkit';
var fs = require('fs');
var fontkit = require('@foliojs-fork/fontkit');

//TODO: must be a better way of embedding the entire font, so that inputs can use all glyphs?
//TODO: problems reading font, when compress flag is false
export class PDFEmbeddedFont {
	constructor(document, dictionary, src, id) {
		this.document = document;
        this.src = src;
        this.dictionary = dictionary;

		if (typeof src === 'string') {
			this.font = fontkit.create(fs.readFileSync(src));
		} else if (Buffer.isBuffer(src)) {
			this.font = fontkit.create(src);
		} else {
			this.font = src;
		}
		
		this.id = id;
		this.name = this.font.postscriptName;
		this.scale = 1000 / this.font.unitsPerEm;
	
		this.unicode = {}; 
        this.widths =  [this.font.getGlyph(0).advanceWidth];
	
		this.font.characterSet.forEach(codePoint => {
			if (this.font.hasGlyphForCodePoint(codePoint)) {	
				const glyph = this.font.glyphForCodePoint(codePoint);
				this.unicode[glyph.id] = ([codePoint]);
				this.widths[glyph.id] = (glyph.advanceWidth * this.scale);
			} 
		});

		this.ascender = this.font.ascent * this.scale;
		this.descender = this.font.descent * this.scale;
		this.xHeight = this.font.xHeight * this.scale;
		this.capHeight = this.font.capHeight * this.scale;
		this.lineGap = this.font.lineGap * this.scale;
		this.bbox = this.font.bbox;
	
		if (document.options.fontLayoutCache !== false) {
			this.layoutCache = Object.create(null);
		}
	}

	layoutRun(text, features) {
		/**
		 * TODO: 
		 * handle text features e.g. ligatures and copy/paste issue e.g. fi = f when pasted, 
		 * and wierd spacing issue, setting it to false works can be overriden in the doc def.
		 */
		const run = this.font.layout(text, {liga: false,...features}); // Normalize position values
	
		for (let i = 0; i < run.positions.length; i++) {
			const position = run.positions[i];
		
			for (let key in position) {
				position[key] *= this.scale;
			}
		
			position.advanceWidth = run.glyphs[i].advanceWidth * this.scale;
		}
	
		return run;
	}
	
	layoutCached(text) {
		if (!this.layoutCache) {
			return this.layoutRun(text);
		}
	
		let cached = this.layoutCache[text];
	
		if (cached) {
			return cached;
		}
	
		const run = this.layoutRun(text);
		this.layoutCache[text] = run;
		return run;
	}
	
	layout(text, features, onlyWidth) {
		// Skip the cache if any user defined features are applied
		if (features) {
			return this.layoutRun(text, features);
		}
	
		let glyphs = onlyWidth ? null : [];
		let positions = onlyWidth ? null : [];
		let advanceWidth = 0; // Split the string by words to increase cache efficiency.
		// For this purpose, spaces and tabs are a good enough delimeter.
	
		let last = 0;
		let index = 0;
		
		while (index <= text.length) {
			var needle;
		
			if (index === text.length && last < index || (needle = text.charAt(index), [' ', '\t'].includes(needle))) {
				const run = this.layoutCached(text.slice(last, ++index));
		
				if (!onlyWidth) {
				glyphs = glyphs.concat(run.glyphs);
				positions = positions.concat(run.positions);
				}
		
				advanceWidth += run.advanceWidth;
				last = index;
			} else {
				index++;
			}
		}
		
		return {
			glyphs,
			positions,
			advanceWidth
		};
	}

	ref() {
		return this.dictionary != null ? this.dictionary : this.dictionary = this.document.ref();
	}
  
	finalize() {
		if (this.embedded || this.dictionary == null) {
			return;
		}
		
		this.embed();
		return this.embedded = true;
	}

	encode(text, features) {
		const {
			glyphs,
			positions
		} = this.layout(text, features);

		const res = [];
	
		for (let i = 0; i < glyphs.length; i++) {
			const glyph = glyphs[i];
			const gid = glyph.id;
			
			res.push(`0000${gid.toString(16)}`.slice(-4));
		}
		
		return [res, positions];
	}

	widthOfString(string, size, features) {
		const width = this.layout(string, features, true).advanceWidth;
		const scale = size / 1000;
		return width * scale;
	}

	embed() {
		const isCFF = this.font.cff != null;
		const fontFile = this.document.ref();
	
		if (isCFF) {
			fontFile.data.Subtype = 'CIDFontType0C';
		}

        fs.createReadStream(this.src)
            .on("data", function (data) {
                fontFile.write(data);
            })
            .on("end", function () {
                fontFile.end();
            });

		const familyClass = ((this.font['OS/2'] != null ? this.font['OS/2'].sFamilyClass : undefined) || 0) >> 8;
		let flags = 0;
	
		if (this.font.post.isFixedPitch) {
			flags |= 1 << 0;
		}
	
		if (1 <= familyClass && familyClass <= 7) {
			flags |= 1 << 1;
		}
	
		flags |= 1 << 2; // assume the font uses non-latin characters
	
		if (familyClass === 10) {
			flags |= 1 << 3;
		}
	
		if (this.font.head.macStyle.italic) {
			flags |= 1 << 6;
		} // generate a tag (6 uppercase letters. 17 is the char code offset from '0' to 'A'. 73 will map to 'Z')
	
		const name = this.font.postscriptName;
		
		const {
			bbox
		} = this.font;
		const descriptor = this.document.ref({
			Type: 'FontDescriptor',
			FontName: name,
			Flags: flags,
			FontBBox: [bbox.minX * this.scale, bbox.minY * this.scale, bbox.maxX * this.scale, bbox.maxY * this.scale],
			ItalicAngle: this.font.italicAngle,
			Ascent: this.ascender,
			Descent: this.descender,
			CapHeight: (this.font.capHeight || this.font.ascent) * this.scale,
			XHeight: (this.font.xHeight || 0) * this.scale,
			StemV: 0
		}); // not sure how to calculate this
	
		if (isCFF) {
			descriptor.data.FontFile3 = fontFile;
		} else {
			descriptor.data.FontFile2 = fontFile;
		}
	
		descriptor.end();
		const descendantFontData = {
			Type: 'Font',
			Subtype: 'CIDFontType0',
			BaseFont: name,
			CIDSystemInfo: {
				Registry: new String('Adobe'),
				Ordering: new String('Identity'),
				Supplement: 0
			},
			FontDescriptor: descriptor,
			W: [0, this.widths]
		};
	
		if (!isCFF) {
			descendantFontData.Subtype = 'CIDFontType2';
			descendantFontData.CIDToGIDMap = 'Identity';
		}
	
		const descendantFont = this.document.ref(descendantFontData);
		descendantFont.end();
		this.dictionary.data = {
			Type: 'Font',
			Subtype: 'Type0',
			BaseFont: name,
			Encoding: 'Identity-H',
			DescendantFonts: [descendantFont],
			ToUnicode: this.toUnicodeCmap()
		};
        
		return this.dictionary.end();
	}
  
	lineHeight(size, includeGap) {
		if (includeGap == null) {
			includeGap = false;
		}
  
		const gap = includeGap ? this.lineGap : 0;
		return (this.ascender + gap - this.descender) / 1000 * size;
	}
  
	
	toUnicodeCmap() {
		const cmap = this.document.ref();
		const characters = () => {
			let entries = "";

			const toHex = function (num) {
				return `0000${num.toString(16)}`.slice(-4);
			};
			
			for (let key of Object.keys(this.unicode)) {
				const codePoints = this.unicode[key];
				const encoded = []; // encode codePoints to utf16
			
				for (let value of codePoints) {
					if (value > 0xffff) {
						value -= 0x10000;
						encoded.push(toHex(value >>> 10 & 0x3ff | 0xd800));
						value = 0xdc00 | value & 0x3ff;
					}
			
					encoded.push(toHex(value));
				}
				const srcCode = toHex(parseInt(key));
				const dstString = encoded.join(' ');

				//i dont think this is the best way
				entries += `<${srcCode}> <${dstString}>\n`;
			}

			return entries;
		};
		
		cmap.end(`\
/CIDInit /ProcSet findresource begin
12 dict begin
begincmap
/CIDSystemInfo <<
	/Registry (Adobe)
	/Ordering (UCS)
	/Supplement 0
>> def
/CMapName /Adobe-Identity-UCS def
/CMapType 2 def
1 begincodespacerange
<0000><ffff>
endcodespacerange
1 beginbfchar
${characters()}
endbfchar
endcmap
CMapName currentdict /CMap defineresource pop
end
end\
`);

		return cmap;
	}
}
 

class ModifiedPDFKit extends PDFKit {
    constructor(options = {}){
        super(options);
    }

	formRadiobutton(name, x, y, w, h, options) {
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
		
		const trueRef = this.ref({
			Type: 'XObject',
			Subtype: 'Form',
			FormType: 1,
			BBox: rect,
		});

		const dtrueRef = this.ref({
			Type: 'XObject',
			Subtype: 'Form',
			FormType: 1,
			BBox: rect,
		});

		const offRef = this.ref({
			Type: 'XObject',
			Subtype: 'Form',
			FormType: 1,
			BBox: rect,
		});

		// const doffRef = this.ref({
		// 	Type: 'XObject',
		// 	Subtype: 'Form',
		// 	FormType: 1,
		// 	BBox: rect,
		// });

		const formId = name;

		const childRef = this.ref({
			Type: 'Annot',
			Subtype: 'Widget',
			Rect: rect,
			AS: options.selected ? formId : 'Off',
			Parent: groupRef,
			MK: {
				CA: new String(8)
			},
			AP: {
				N: {//normal state
					[formId]: trueRef,
					Off: offRef
				},
				D: {
					[formId]: dtrueRef,
					// Off: doffRef
				}
			}
		});

		childRef.end();
		trueRef.end(
			`
			q
				0 0 1 rg
				BT
					/${this._font.id} 12 tf
				 	0 0 Td
					(8) Tj
				ET
			Q
			`
		);
		dtrueRef.end(
			`
			q
				0 0 1 rg
				BT
					/${this._font.id} 12 tf
				 	0 0 Td
					(8) Tj
				ET
			Q
			`
		);
		offRef.end(
			`
			q
				0 0 1 rg
				BT
					/${this._font.id} 12 tf
					0 0 Td
					(4) Tj
				ET
			Q
			`
		);
		// doffRef.end(
			
		// );

		this.page.annotations.push(childRef); 
		this._root.data.AcroForm.data.Fields.push(childRef); 

		this.formRadioMap[parentName].data.Kids.push(childRef);
		if (options.selected) { 
			this.formRadioMap[parentName].data.V = formId;
		}
	}

	writeRadioForms() {
		Object.keys(this.formRadioMap).forEach(key => {
			this.formRadioMap[key].end();
		});
	}

	formCheckbox(name, x, y, w, h, options) {
		const rect = this._convertRect(x, y, w, h);

		const trueRef = this.ref({
			Type: 'XObject',
			Subtype: 'Form',
			FormType: 1,
			BBox: rect,
			Resources: {
				ProcSet: ["PDF"]
			}
		});

		const dtrueRef = this.ref({
			Type: 'XObject',
			Subtype: 'Form',
			FormType: 1,
			BBox: rect,
			Resources: {
				ProcSet: ["PDF"]
			}
		});

		const offRef = this.ref({
			Type: 'XObject',
			Subtype: 'Form',
			FormType: 1,
			BBox: rect,
			Resources: {
				ProcSet: ["PDF"]
			}
		});

		//spec 556
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
					
				}
			}
			
		});

		//handle parents
		this.page.annotations.push(checkboxRef);
		this._root.data.AcroForm.data.Fields.push(checkboxRef); 

		checkboxRef.end();
		trueRef.end(
			`
			q
				0 0 1 rg
				BT
					/${this._font.id} 12 tf
					0 0 Td
					(8) Tj
				ET
			Q
			`
		);
		dtrueRef.end(
			`
			q
				0 0 1 rg
				BT
			    	/${this._font.id} 12 tf
					0 0 Td
					(8) Tj
				ET
			Q
			`
		);
		offRef.end(
			`
			q
				0 0 1 rg
				BT
					/${this._font.id} 12 tf
					0 0 Td
					(4) Tj
				ET
			Q
			`
		);
	}
}

export default ModifiedPDFKit;
