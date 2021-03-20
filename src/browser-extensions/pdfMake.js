const isBrowserSupported = () => {
	if ((typeof window === 'undefined') || (typeof window.navigator === 'undefined')) {
		// Enviroment is not browser.
		return true;
	}

	// Internet Explorer 10 and older is not supported.
	return window.navigator.userAgent.indexOf("MSIE") === -1;
};

if (!isBrowserSupported()) {
	module.exports = require('./fakeIndex').default;
} else {
	module.exports = require('./index').default;
}
