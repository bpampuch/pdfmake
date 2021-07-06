/**
 * @param {any} variable
 * @returns {boolean}
 */
export function isString(variable) {
	return (typeof variable === 'string') || (variable instanceof String);
}

/**
 * @param {any} variable
 * @returns {boolean}
 */
export function isNumber(variable) {
	return (typeof variable === 'number') || (variable instanceof Number);
}

/**
 * @param {any} variable
 * @returns {boolean}
 */
export function isObject(variable) {
	return (variable !== null) && !Array.isArray(variable) && !isString(variable) && !isNumber(variable) && (typeof variable === 'object');
}

/**
 * @param {any} variable
 * @returns {boolean}
 */
export function isEmptyObject(variable) {
	return isObject(variable) && (Object.keys(variable).length === 0);
}

/**
 * @param {any} variable
 * @returns {boolean}
 */
export function isValue(variable) {
	return (variable !== undefined) && (variable !== null);
}
