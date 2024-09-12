export function pack(...args) {
	let result = {};

	for (let i = 0, l = args.length; i < l; i++) {
		let obj = args[i];

		if (obj) {
			for (let key in obj) {
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
			for (let i = 0, l = vector.points.length; i < l; i++) {
				vector.points[i].x += x;
				vector.points[i].y += y;
			}
			break;
	}
}

export function clone(obj) {
	// Handle null or undefined values
	if (obj === null || typeof obj !== 'object') {
		return obj;
	}

	// Handle Date
	if (obj instanceof Date) {
		return new Date(obj);
	}

	// Handle Array
	if (Array.isArray(obj)) {
		return obj.map(item => clone(item));
	}

	// Handle Functions
	if (typeof obj === 'function') {
		return obj.bind({});
	}

	// Handle Object (recursively clone properties)
	const clonedObj = {};
	for (const key in obj) {
		if (obj.hasOwnProperty(key)) {
			clonedObj[key] = clone(obj[key]);
		}
	}

	return clonedObj;
}

export function get(obj, path) {
	/**
	 * If the path is a string, convert it to an array
	 * @param {string|Array} path The path
	 * @returns {Array} The path array
	 */
	var stringToPath = function (path) {

		// If the path isn't a string, return it
		if (typeof path !== 'string') return path;

		// Create new array
		var output = [];

		// Split to an array with dot notation
		path.split('.').forEach(function (item) {

			// Split to an array with bracket notation
			item.split(/\[([^\]]+)\]/g).filter(i => i !== '').forEach(function (key) {

				// Push to the new array
				if (key.length > 0) {
					output.push(key);
				}

			});

		});

		return output;
	};

	// Get the path as an array
	path = stringToPath(path);

	// Cache the current object
	var current = obj;

	// For each item in the path, dig into the object
	for (var i = 0; i < path.length; i++) {
		current = current[path[i]];
	}

	return current;
};