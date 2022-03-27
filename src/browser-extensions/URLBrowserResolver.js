'use strict';

// Internet Explorer polyfills
if (typeof window !== 'undefined' && !window.Promise) {
	require('core-js/features/promise');
}
require('core-js/es/object/values');

var fetchUrl = function (url, headers) {
	return new Promise(function (resolve, reject) {
		var xhr = new XMLHttpRequest();
		xhr.open('GET', url, true);
		for (var headerName in headers) {
			xhr.setRequestHeader(headerName, headers[headerName]);
		}
		xhr.responseType = 'arraybuffer';

		xhr.onreadystatechange = function () {
			if (xhr.readyState !== 4) {
				return;
			}

			var ok = xhr.status >= 200 && xhr.status < 300;
			if (!ok) {
				setTimeout(function () {
					reject(new TypeError('Failed to fetch (url: "' + url + '")'));
				}, 0);
			}
		};

		xhr.onload = function () {
			var ok = xhr.status >= 200 && xhr.status < 300;
			if (ok) {
				resolve(xhr.response);
			}
		};

		xhr.onerror = function () {
			setTimeout(function () {
				reject(new TypeError('Network request failed (url: "' + url + '")'));
			}, 0);
		};

		xhr.ontimeout = function () {
			setTimeout(function () {
				reject(new TypeError('Network request failed (url: "' + url + '")'));
			}, 0);
		};

		xhr.send();
	});
};

function URLBrowserResolver(fs) {
	this.fs = fs;
	this.resolving = {};
}

URLBrowserResolver.prototype.resolve = function (url, headers) {
	if (!this.resolving[url]) {
		var _this = this;
		this.resolving[url] = new Promise(function (resolve, reject) {
			if (url.toLowerCase().indexOf('https://') === 0 || url.toLowerCase().indexOf('http://') === 0) {
				fetchUrl(url, headers).then(function (buffer) {
					_this.fs.writeFileSync(url, buffer);
					resolve();
				}, function (result) {
					reject(result);
				});
			} else {
				// cannot be resolved
				resolve();
			}
		});
	}

	return this.resolving[url];
}

URLBrowserResolver.prototype.resolved = function () {
	var _this = this;
	return new Promise(function (resolve, reject) {
		Promise.all(Object.values(_this.resolving)).then(function () {
			resolve();
		}, function (result) {
			reject(result);
		});
	});
}

module.exports = URLBrowserResolver;
