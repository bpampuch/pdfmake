/**
 * @param {mixed} variable
 * @returns {boolean}
 */
export function isString(variable) {
	return (typeof variable === 'string') || (variable instanceof String);
}

/**
 * @param {mixed} variable
 * @returns {boolean}
 */
export function isNumber(variable) {
	return (typeof variable === 'number') || (variable instanceof Number);
}

/**
 * @param {mixed} variable
 * @returns {boolean}
 */
export function isBoolean(variable) {
	return typeof variable === 'boolean';
}

/**
 * @param {mixed} variable
 * @returns {boolean}
 */
export function isArray(variable) {
	return Array.isArray(variable);
}

/**
 * @param {mixed} variable
 * @returns {boolean}
 */
export function isFunction(variable) {
	return typeof variable === 'function';
}

/**
 * @param {mixed} variable
 * @returns {boolean}
 */
export function isObject(variable) {
	return !isNull(variable) && !isArray(variable) && !isString(variable) && !isNumber(variable) && (typeof variable === 'object');
}

/**
 * @param {mixed} variable
 * @returns {boolean}
 */
export function isEmptyObject(variable) {
	return isObject(variable) && (Object.keys(variable).length === 0);
}

/**
 * @param {mixed} variable
 * @returns {boolean}
 */
export function isNull(variable) {
	return variable === null;
}

/**
 * @param {mixed} variable
 * @returns {boolean}
 */
export function isUndefined(variable) {
	return variable === undefined;
}

/**
 * @param {mixed} variable
 * @returns {boolean}
 */
export function isValue(variable) {
	return !isUndefined(variable) && !isNull(variable);
}
