export function isString(variable) {
	return typeof variable === 'string' || variable instanceof String;
}

export function isNumber(variable) {
	return typeof variable === 'number' || variable instanceof Number;
}

export function isBoolean(variable) {
	return typeof variable === 'boolean';
}

export function isArray(variable) {
	return Array.isArray(variable);
}

export function isFunction(variable) {
	return typeof variable === 'function';
}

export function isObject(variable) {
	return variable !== null && typeof variable === 'object';
}

export function isNull(variable) {
	return variable === null;
}

export function isUndefined(variable) {
	return variable === undefined;
}

export function pack(...args) {
	var result = {};

	for (var i = 0, l = args.length; i < l; i++) {
		var obj = args[i];

		if (obj) {
			for (var key in obj) {
				if (obj.hasOwnProperty(key)) {
					result[key] = obj[key];
				}
			}
		}
	}

	return result;
}

export function offsetVector(vector, x, y) {
	switch (vector.type) {
		case 'ellipse':
		case 'rect':
			vector.x += x;
			vector.y += y;
			break;
		case 'line':
			vector.x1 += x;
			vector.x2 += x;
			vector.y1 += y;
			vector.y2 += y;
			break;
		case 'polyline':
			for (var i = 0, l = vector.points.length; i < l; i++) {
				vector.points[i].x += x;
				vector.points[i].y += y;
			}
			break;
	}
}

export function fontStringify(key, val) {
	if (key === 'font') {
		return 'font';
	}
	return val;
}
