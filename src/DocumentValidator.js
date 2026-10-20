import contract from './document-schema';

const elementKeys = ['text', 'stack', 'columns', 'ul', 'ol', 'table', 'image', 'svg', 'qr', 'canvas', 'toc', 'section', 'attachment', 'pageReference', 'textReference'];
const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
const childPath = (path, key) => /^[A-Za-z_$][\w$]*$/.test(key) ? `${path}.${key}` : `${path}[${JSON.stringify(key)}]`;
const plain = value => value !== null && typeof value === 'object' && !Array.isArray(value);

/**
 * Static preflight; callbacks and resource decoding remain render checks.
 * @param {unknown} definition
 * @param {object} options
 * @param {object} context
 * @returns {object}
 */
export function validateDocument(definition, options = {}, context = {}) {
	if (!plain(options)) throw new TypeError('Validation options must be an object.');
	const max = options.maxDiagnostics === undefined ? 100 : options.maxDiagnostics;
	const depth = options.maxDepth === undefined ? 100 : options.maxDepth;
	if (!Number.isInteger(max) || max < 1 || max > 10000 || !Number.isInteger(depth) || depth < 1 || depth > 500) throw new RangeError('Validation limits must be positive integers (maxDiagnostics <= 10000, maxDepth <= 500).');
	const result = { valid: true, errors: [], warnings: [], deferred: [], truncated: false };
	const deferred = new Set();
	const diagnostics = new Set();
	const report = (path, code, message, severity = 'error') => {
		const key = `${path}:${code}`;
		if (diagnostics.has(key)) return;
		if (result.errors.length + result.warnings.length >= max) { result.truncated = true; result.valid = false; return; }
		diagnostics.add(key);
		result[severity === 'error' ? 'errors' : 'warnings'].push({ path, code, message, severity });
	};
	// Reject accessors and cyclic input before traversing the contract; never call getters.
	const ancestors = new WeakSet();
	let count = 0;
	const snapshot = (value, path, level) => {
		if (++count > 50000) { report(path, 'LIMIT', 'Document exceeds the 50000-value validation budget.'); return undefined; }
		if (level > depth) { report(path, 'DEPTH', `Document nesting exceeds ${depth}.`); return undefined; }
		if (!value || typeof value !== 'object') return value;
		if (ancestors.has(value)) { report(path, 'CYCLE', 'Circular document reference.'); return undefined; }
		if (value instanceof Date || ArrayBuffer.isView(value) || value instanceof ArrayBuffer) return value;
		const proto = Object.getPrototypeOf(value);
		if (!Array.isArray(value) && proto !== Object.prototype && proto !== null && Object.getPrototypeOf(proto) !== null) { report(path, 'OBJECT', 'Use plain data objects in document definitions.'); return undefined; }
		ancestors.add(value);
		if (Array.isArray(value) && value.length > 50000) {
			report(path, 'LIMIT', 'Array length exceeds the 50000-value validation budget.');
			ancestors.delete(value);
			return [];
		}
		const copy = Array.isArray(value) ? new Array(value.length) : Object.create(null);
		for (const key of Object.keys(value)) {
			const descriptor = Object.getOwnPropertyDescriptor(value, key);
			const next = Array.isArray(value) ? `${path}[${key}]` : childPath(path, key);
			if (!own(descriptor, 'value')) report(next, 'ACCESSOR', 'Accessors cannot be validated without executing application code.');
			else copy[key] = snapshot(descriptor.value, next, level + 1);
			if (count > 50000) break;
		}
		ancestors.delete(value);
		return copy;
	};
	let doc;
	try { doc = snapshot(definition, '$', 0); }
	catch (error) { report('$', 'OBJECT', `Unable to inspect document: ${error.message}`); }
	const nodes = contract.nodes;
	const shapes = new WeakMap();
	const inspect = (value, id, path, level = 0) => {
		if (level > depth * 10 + 20) return [{ path, code: 'DEPTH', message: 'Contract nesting limit reached.' }];
		const schema = nodes[id];
		const fail = message => [{ path, code: 'TYPE', message }];
		switch (schema.kind) {
			case 'unknown': return [];
			case 'never': return fail('This property is not supported for this element.');
			case 'literal': return value === schema.value ? [] : fail(`Expected ${JSON.stringify(schema.value)}.`);
			case 'null': return value === null ? [] : fail('Expected null.');
			case 'number': return typeof value === 'number' && Number.isFinite(value) ? [] : fail('Expected a finite number.');
			case 'string': case 'undefined': return typeof value === schema.kind ? [] : fail(`Expected ${schema.kind}.`);
			case 'function': return typeof value === 'function' ? [] : fail('Expected a function.');
			case 'opaque': {
				const valid = schema.name === 'Date' ? value instanceof Date && Number.isFinite(value.getTime()) : schema.name === 'ArrayBuffer' ? value instanceof ArrayBuffer : schema.name === 'SVGElement' ? false : ArrayBuffer.isView(value);
				return valid ? [] : fail(`Expected ${schema.name}${schema.name === 'SVGElement' ? '; prefer an SVG string for portable validation' : ''}.`);
			}
			case 'union': {
				let candidates = schema.items;
				if (plain(value)) {
					const primary = elementKeys.find(key => own(value, key));
					const matched = primary && candidates.filter(item => nodes[item].kind === 'object' && nodes[item].properties[primary] && !nodes[item].properties[primary].optional);
					if (matched && matched.length) candidates = matched;
				}
				let best;
				for (const item of candidates) {
					const errors = inspect(value, item, path, level + 1);
					if (!errors.length) return [];
					// Prefer the structurally matching branch over a scalar mismatch.
					const score = errors.reduce((sum, e) => sum + (e.path === path ? 100 : 1), 0);
					if (!best || score < best.score) best = { score, errors };
				}
				return best ? best.errors : fail('Unsupported value.');
			}
			case 'array': case 'tuple': {
				if (!Array.isArray(value)) return fail('Expected an array.');
				const errors = [];
				if (schema.kind === 'tuple' && value.length !== schema.items.length) return fail(`Expected exactly ${schema.items.length} items.`);
				for (let i = 0; i < value.length && errors.length <= max; i++) errors.push(...inspect(value[i], schema.kind === 'array' ? schema.item : schema.items[i], `${path}[${i}]`, level + 1));
				return errors;
			}
			case 'object': {
				if (!plain(value) || value instanceof Date || ArrayBuffer.isView(value)) return fail('Expected an object.');
				const errors = [];
				if (!Object.keys(schema.properties).length && schema.index === undefined && Object.keys(value).length) return fail('Expected an empty placeholder object.');
				for (const key of Object.keys(schema.properties)) {
					const p = schema.properties[key];
					if (!own(value, key)) { if (!p.optional) errors.push({ path: childPath(path, key), code: 'REQUIRED', message: 'Required property is missing.' }); }
					else errors.push(...inspect(value[key], p.type, childPath(path, key), level + 1));
					if (errors.length > max) break;
				}
				for (const key of Object.keys(value)) {
					if (own(schema.properties, key)) continue;
					if (schema.index !== undefined) errors.push(...inspect(value[key], schema.index, childPath(path, key), level + 1));
					else errors.push({ path: childPath(path, key), code: 'UNKNOWN_PROPERTY', message: `Unknown property '${key}'; check spelling or retain as custom metadata.`, severity: options.strict ? 'error' : 'warning' });
					if (errors.length > max) break;
				}
				const score = errors.reduce((sum, item) => sum + (item.path === path ? 100 : 1), 0);
				if (!shapes.has(value) || score < shapes.get(value).score) shapes.set(value, { schema, score });
				return errors;
			}
			default: return fail('Unsupported contract.');
		}
	};
	for (const item of inspect(doc, contract.entry, '$')) report(item.path, item.code, item.message, item.severity);
	const ids = new Map();
	const references = [];
	const styles = plain(doc) && plain(doc.styles) ? doc.styles : {};
	const patterns = plain(doc) && plain(doc.patterns) ? doc.patterns : {};
	const numericPositive = new Set(['fontSize', 'lineHeight', 'colSpan', 'rowSpan', 'r', 'r1', 'r2', 'eccLevel']);
	const nonNegative = new Set(['lineWidth', 'columnGap', 'headerRows', 'keepWithHeaderRows']);
	const walk = (value, path, level = 0, sectionAllowed = false) => {
		if (!value || typeof value !== 'object' || value instanceof Date || ArrayBuffer.isView(value) || level > depth) return;
		if (Array.isArray(value)) { value.forEach((item, i) => walk(item, `${path}[${i}]`, level + 1, sectionAllowed)); return; }
		const shape = shapes.get(value)?.schema;
		if (!shape) return;
		if (own(shape.properties, 'section') && own(value, 'section') && !sectionAllowed) report(path + '.section', 'SECTION_LOCATION', 'Sections are allowed only in root content and its stacks.');
		if (own(shape.properties, 'id') && typeof value.id === 'string') {
			if (ids.has(value.id)) report(childPath(path, 'id'), 'DUPLICATE_ID', `Duplicate id '${value.id}' (first at ${ids.get(value.id)}).`);
			else ids.set(value.id, path);
		}
		for (const key of Object.keys(value)) {
			const item = value[key], at = childPath(path, key);
			if (!own(shape.properties, key)) {
				if (shape.index !== undefined) walk(item, at, level + 1);
				continue;
			}
			if (typeof item === 'function') deferred.add(at);
			if (typeof item === 'number') {
				if (!Number.isFinite(item)) report(at, 'NUMBER', 'Expected a finite number.');
				if ((numericPositive.has(key) || ['width', 'height'].includes(key)) && item <= 0) report(at, 'RANGE', 'Expected a positive number.');
				if (nonNegative.has(key) && item < 0) report(at, 'RANGE', 'Expected a non-negative number.');
				if (/opacity$/i.test(key) && (item < 0 || item > 1)) report(at, 'RANGE', 'Opacity must be between 0 and 1.');
				if (['rowSpan', 'colSpan', 'headerRows', 'keepWithHeaderRows'].includes(key) && !Number.isInteger(item)) report(at, 'INTEGER', 'Expected an integer.');
			}
			if (['pageReference', 'textReference', 'linkToDestination'].includes(key) && typeof item === 'string') references.push({ id: item, path: at });
			if (key === 'style') for (const name of Array.isArray(item) ? item : [item]) if (typeof name === 'string' && !own(styles, name)) report(at, 'STYLE_REFERENCE', `Style '${name}' is not defined in styles.`);
			if (key === 'font' && typeof item === 'string' && !own(context.fonts || {}, item)) report(at, 'FONT_REFERENCE', `Font '${item}' is not registered.`);
			if (key === 'layout' && typeof item === 'string' && !['noBorders', 'headerLineOnly', 'lightHorizontalLines'].includes(item) && !own(context.tableLayouts || {}, item)) report(at, 'LAYOUT_REFERENCE', `Table layout '${item}' is not registered.`);
			if (['fillColor', 'color', 'overlayPattern'].includes(key) && Array.isArray(item) && typeof item[0] === 'string' && !own(patterns, item[0])) report(at, 'PATTERN_REFERENCE', `Pattern '${item[0]}' is not defined.`);
			if (['image', 'svg', 'attachment', 'src'].includes(key) && (typeof item === 'string' || plain(item))) deferred.add(at + ' (resource decoding/access)');
			if (['attachment', 'linkToFile'].includes(key) && typeof item === 'string' && !own(doc.attachments || {}, item)) report(at, 'ATTACHMENT_REFERENCE', `Attachment '${item}' is not defined.`);
			if (['width', 'widths'].includes(key)) {
				for (const size of Array.isArray(item) ? item : [item]) if (typeof size === 'string' && !['*', 'auto'].includes(size) && !/^(?:\d+(?:\.\d+)?|\.\d+)%$/.test(size)) report(at, 'SIZE', 'Expected a numeric width, percentage, auto or *.');
			}
			walk(item, at, level + 1, path === '$' && key === 'content' || key === 'stack' && sectionAllowed);
		}
		if (own(shape.properties, 'table') && plain(value.table)) validateTable(value.table, childPath(path, 'table'), report);
	};
	walk(doc, '$');
	for (const reference of references) if (!ids.has(reference.id)) {
		if (result.deferred.length || [...deferred].some(path => !path.includes('(resource'))) deferred.add(reference.path + ' (target may be generated dynamically)');
		else report(reference.path, 'ID_REFERENCE', `Target '${reference.id}' does not exist.`);
	}
	result.deferred = [...deferred];
	result.valid = result.valid && !result.errors.length;
	return result;
}

function validateTable(table, path, report) {
	if (!Array.isArray(table.body)) return;
	const rows = table.body;
	const width = Array.isArray(rows[0]) ? rows[0].length : 0;
	if (!rows.length || !width) report(`${path}.body`, 'TABLE_EMPTY', 'Table body requires at least one non-empty row.');
	if (Array.isArray(table.widths) && table.widths.length !== width) report(`${path}.widths`, 'TABLE_WIDTHS', `Expected ${width} column widths.`);
	if (table.headerRows > rows.length) report(`${path}.headerRows`, 'TABLE_HEADERS', 'headerRows exceeds the number of rows.');
	const covered = new Set();
	rows.forEach((row, r) => {
		if (!Array.isArray(row)) return;
		if (row.length !== width) report(`${path}.body[${r}]`, 'TABLE_COLUMNS', `Expected ${width} cells including span placeholders; received ${row.length}.`);
		row.forEach((cell, c) => {
			const at = `${path}.body[${r}][${c}]`;
			if (cell === undefined) report(at, 'TABLE_CELL', 'Undefined table cell; use an empty string or {} placeholder.');
			if (covered.has(`${r}:${c}`)) {
				if (plain(cell) && Object.keys(cell).length) report(at, 'TABLE_SPAN_PLACEHOLDER', 'A covered span cell must be an empty placeholder.');
				else if (!plain(cell) && cell !== '' && cell !== null) report(at, 'TABLE_SPAN_PLACEHOLDER', 'A covered span cell must be an empty placeholder.');
				return;
			}
			if (!plain(cell)) return;
			const rs = cell.rowSpan || 1, cs = cell.colSpan || 1;
			if (!Number.isInteger(rs) || !Number.isInteger(cs) || rs < 1 || cs < 1) return;
			if (r + rs > rows.length) report(at + '.rowSpan', 'TABLE_SPAN', 'rowSpan extends beyond the table body.');
			if (c + cs > width) report(at + '.colSpan', 'TABLE_SPAN', 'colSpan extends beyond the table width.');
			for (let y = r; y < Math.min(rows.length, r + rs); y++) for (let x = c; x < Math.min(width, c + cs); x++) if (y !== r || x !== c) {
				if (covered.has(`${y}:${x}`)) report(at, 'TABLE_SPAN_OVERLAP', 'Cell spans overlap.');
				covered.add(`${y}:${x}`);
			}
		});
	});
}

export function assertValidDocument(definition, options, context) {
	const result = validateDocument(definition, options, context);
	if (!result.valid) {
		const error = new Error('Document validation failed:\n' + result.errors.map(item => `${item.path}: ${item.message}`).join('\n') + (result.truncated ? '\nValidation limit reached.' : ''));
		error.name = 'DocumentValidationError';
		error.code = 'PDFMAKE_VALIDATION_ERROR';
		error.phase = 'validation';
		error.diagnostics = result.errors;
		throw error;
	}
	return result;
}
