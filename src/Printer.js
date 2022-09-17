import PDFDocument from './PDFDocument';
import LayoutBuilder from './LayoutBuilder';
import SVGMeasure from './SVGMeasure';
import { normalizePageSize, normalizePageMargin } from './PageSize';
import { tableLayouts } from './tableLayouts';
import Renderer from './Renderer';
import { isNumber, isValue } from './helpers/variableType';

/**
 * Printer which turns document definition into a pdf
 *
 * @example
 * var fontDescriptors = {
 *	Roboto: {
 *		normal: 'fonts/Roboto-Regular.ttf',
 *		bold: 'fonts/Roboto-Medium.ttf',
 *		italics: 'fonts/Roboto-Italic.ttf',
 *		bolditalics: 'fonts/Roboto-MediumItalic.ttf'
 *	}
 * };
 *
 * var printer = new PdfPrinter(fontDescriptors);
 */
class PdfPrinter {

	/**
	 * @param {object} fontDescriptors font definition dictionary
	 * @param {object} virtualfs
	 * @param {object} urlResolver
	 */
	constructor(fontDescriptors, virtualfs = null, urlResolver = null) {
		this.fontDescriptors = fontDescriptors;
		this.virtualfs = virtualfs;
		this.urlResolver = urlResolver;
	}

	/**
	 * Executes layout engine for the specified document and renders it into a pdfkit document
	 * ready to be saved.
	 *
	 * @param {object} docDefinition
	 * @param {object} options
	 * @returns {Promise<PDFDocument>} resolved promise return a pdfkit document
	 */
	createPdfKitDocument(docDefinition, options = {}) {
		return new Promise((resolve, reject) => {
			this.resolveUrls(docDefinition).then(() => {
				try {
					docDefinition.version = docDefinition.version || '1.3';
					docDefinition.compress = typeof docDefinition.compress === 'boolean' ? docDefinition.compress : true;
					docDefinition.images = docDefinition.images || {};
					docDefinition.attachments = docDefinition.attachments || {};
					docDefinition.pageMargins = isValue(docDefinition.pageMargins) ? docDefinition.pageMargins : 40;
					docDefinition.patterns = docDefinition.patterns || {};

					let pageSize = normalizePageSize(docDefinition.pageSize, docDefinition.pageOrientation);

					let pdfOptions = {
						size: [pageSize.width, pageSize.height],
						pdfVersion: docDefinition.version,
						compress: docDefinition.compress,
						userPassword: docDefinition.userPassword,
						ownerPassword: docDefinition.ownerPassword,
						permissions: docDefinition.permissions,
						fontLayoutCache: typeof options.fontLayoutCache === 'boolean' ? options.fontLayoutCache : true,
						bufferPages: options.bufferPages || false,
						autoFirstPage: false,
						info: createMetadata(docDefinition),
						font: null
					};

					this.pdfKitDoc = new PDFDocument(this.fontDescriptors, docDefinition.images, docDefinition.patterns, docDefinition.attachments, pdfOptions, this.virtualfs);
					embedFiles(docDefinition, this.pdfKitDoc);

					const builder = new LayoutBuilder(pageSize, normalizePageMargin(docDefinition.pageMargins), new SVGMeasure());

					builder.registerTableLayouts(tableLayouts);
					if (options.tableLayouts) {
						builder.registerTableLayouts(options.tableLayouts);
					}

					let pages = builder.layoutDocument(docDefinition.content, this.pdfKitDoc, docDefinition.styles || {}, docDefinition.defaultStyle || { fontSize: 12, font: 'Roboto' }, docDefinition.background, docDefinition.header, docDefinition.footer, docDefinition.watermark, docDefinition.pageBreakBefore);
					let maxNumberPages = docDefinition.maxPagesNumber || -1;
					if (isNumber(maxNumberPages) && maxNumberPages > -1) {
						pages = pages.slice(0, maxNumberPages);
					}

					// if pageSize.height is set to Infinity, calculate the actual height of the page that
					// was laid out using the height of each of the items in the page.
					if (pageSize.height === Infinity) {
						let pageHeight = calculatePageHeight(pages, docDefinition.pageMargins);
						this.pdfKitDoc.options.size = [pageSize.width, pageHeight];
					}

					const renderer = new Renderer(this.pdfKitDoc, options.progressCallback);
					renderer.renderPages(pages);

					resolve(this.pdfKitDoc);
				} catch (e) {
					reject(e);
				}
			}, result => {
				reject(result);
			});
		});
	}

	/**
	 * @param {object} docDefinition
	 * @returns {Promise}
	 */
	resolveUrls(docDefinition) {
		const getExtendedUrl = url => {
			if (typeof url === 'object') {
				return { url: url.url, headers: url.headers };
			}

			return { url: url, headers: {} };
		};

		return new Promise((resolve, reject) => {
			if (this.urlResolver === null) {
				resolve();
			}

			for (let font in this.fontDescriptors) {
				if (this.fontDescriptors.hasOwnProperty(font)) {
					if (this.fontDescriptors[font].normal) {
						if (Array.isArray(this.fontDescriptors[font].normal)) { // TrueType Collection
							let url = getExtendedUrl(this.fontDescriptors[font].normal[0]);
							this.urlResolver.resolve(url.url, url.headers);
							this.fontDescriptors[font].normal[0] = url.url;
						} else {
							let url = getExtendedUrl(this.fontDescriptors[font].normal);
							this.urlResolver.resolve(url.url, url.headers);
							this.fontDescriptors[font].normal = url.url;
						}
					}
					if (this.fontDescriptors[font].bold) {
						if (Array.isArray(this.fontDescriptors[font].bold)) { // TrueType Collection
							let url = getExtendedUrl(this.fontDescriptors[font].bold[0]);
							this.urlResolver.resolve(url.url, url.headers);
							this.fontDescriptors[font].bold[0] = url.url;
						} else {
							let url = getExtendedUrl(this.fontDescriptors[font].bold);
							this.urlResolver.resolve(url.url, url.headers);
							this.fontDescriptors[font].bold = url.url;
						}
					}
					if (this.fontDescriptors[font].italics) {
						if (Array.isArray(this.fontDescriptors[font].italics)) { // TrueType Collection
							let url = getExtendedUrl(this.fontDescriptors[font].italics[0]);
							this.urlResolver.resolve(url.url, url.headers);
							this.fontDescriptors[font].italics[0] = url.url;
						} else {
							let url = getExtendedUrl(this.fontDescriptors[font].italics);
							this.urlResolver.resolve(url.url, url.headers);
							this.fontDescriptors[font].italics = url.url;
						}
					}
					if (this.fontDescriptors[font].bolditalics) {
						if (Array.isArray(this.fontDescriptors[font].bolditalics)) { // TrueType Collection
							let url = getExtendedUrl(this.fontDescriptors[font].bolditalics[0]);
							this.urlResolver.resolve(url.url, url.headers);
							this.fontDescriptors[font].bolditalics[0] = url.url;
						} else {
							let url = getExtendedUrl(this.fontDescriptors[font].bolditalics);
							this.urlResolver.resolve(url.url, url.headers);
							this.fontDescriptors[font].bolditalics = url.url;
						}
					}
				}
			}

			if (docDefinition.images) {
				for (let image in docDefinition.images) {
					if (docDefinition.images.hasOwnProperty(image)) {
						let url = getExtendedUrl(docDefinition.images[image]);
						this.urlResolver.resolve(url.url, url.headers);
						docDefinition.images[image] = url.url;
					}
				}
			}

			if (docDefinition.attachments) {
				for (let attachment in docDefinition.attachments) {
					if (docDefinition.attachments.hasOwnProperty(attachment) && docDefinition.attachments[attachment].src) {
						let url = getExtendedUrl(docDefinition.attachments[attachment].src);
						this.urlResolver.resolve(url.url, url.headers);
						docDefinition.attachments[attachment].src = url.url;
					}
				}
			}

			if (docDefinition.files) {
				for (let file in docDefinition.files) {
					if (docDefinition.files.hasOwnProperty(file) && docDefinition.files[file].src) {
						let url = getExtendedUrl(docDefinition.files[file].src);
						this.urlResolver.resolve(url.url, url.headers);
						docDefinition.files[file].src = url.url;
					}
				}
			}

			this.urlResolver.resolved().then(() => {
				resolve();
			}, result => {
				reject(result);
			});
		});
	}
}

function createMetadata(docDefinition) {
	// PDF standard has these properties reserved: Title, Author, Subject, Keywords,
	// Creator, Producer, CreationDate, ModDate, Trapped.
	// To keep the pdfmake api consistent, the info field are defined lowercase.
	// Custom properties don't contain a space.
	function standardizePropertyKey(key) {
		let standardProperties = ['Title', 'Author', 'Subject', 'Keywords',
			'Creator', 'Producer', 'CreationDate', 'ModDate', 'Trapped'];
		let standardizedKey = key.charAt(0).toUpperCase() + key.slice(1);
		if (standardProperties.includes(standardizedKey)) {
			return standardizedKey;
		}

		return key.replace(/\s+/g, '');
	}

	let info = {
		Producer: 'pdfmake',
		Creator: 'pdfmake'
	};

	if (docDefinition.info) {
		for (let key in docDefinition.info) {
			let value = docDefinition.info[key];
			if (value) {
				key = standardizePropertyKey(key);
				info[key] = value;
			}
		}
	}
	return info;
}

function embedFiles(docDefinition, pdfKitDoc) {
	if (docDefinition.files) {
		for (const key in docDefinition.files) {
			const file = docDefinition.files[key];

			if (!file.src) return;

			if (pdfKitDoc.virtualfs && pdfKitDoc.virtualfs.existsSync(file.src)) {
				file.src = pdfKitDoc.virtualfs.readFileSync(file.src);
			}

			file.name = file.name || key;
			pdfKitDoc.file(file.src, file);
		}
	}
}

function calculatePageHeight(pages, margins) {
	function getItemHeight(item) {
		if (typeof item.item.getHeight === 'function') {
			return item.item.getHeight();
		} else if (item.item._height) {
			return item.item._height;
		} else if (item.type === 'vector') {
			if (typeof item.item.y1 !== 'undefined') {
				return item.item.y1 > item.item.y2 ? item.item.y1 : item.item.y2;
			} else {
				return item.item.h;
			}
		} else {
			// TODO: add support for next item types
			return 0;
		}
	}

	function getBottomPosition(item) {
		let top = item.item.y || 0;
		let height = getItemHeight(item);
		return top + height;
	}

	let fixedMargins = normalizePageMargin(margins || 40);
	let height = fixedMargins.top;

	pages.forEach(page => {
		page.items.forEach(item => {
			let bottomPosition = getBottomPosition(item);
			if (bottomPosition > height) {
				height = bottomPosition;
			}
		});
	});

	height += fixedMargins.bottom;

	return height;
}

export default PdfPrinter;
