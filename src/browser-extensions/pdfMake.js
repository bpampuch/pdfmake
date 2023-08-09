const isBrowserSupported = () => {
	if ((typeof window === 'undefined') || (typeof window.navigator === 'undefined')) {
		// Enviroment is not browser.
		return true;
	}

	// Internet Explorer 10 and older is not supported.
	return window.navigator.userAgent.indexOf("MSIE") === -1;
};

if (!isBrowserSupported()) {
	throw new Error('pdfmake: Internet Explorer 10 and older is not supported. Upgrade to version 11 or use modern browser.');
}

module.exports = require('./index').default;
