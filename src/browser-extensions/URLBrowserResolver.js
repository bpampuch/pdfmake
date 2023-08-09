const fetchUrl = (url, headers = {}) => {
	return new Promise((resolve, reject) => {
		const xhr = new XMLHttpRequest();
		xhr.open('GET', url, true);
		for (let headerName in headers) {
			xhr.setRequestHeader(headerName, headers[headerName]);
		}
		xhr.responseType = 'arraybuffer';

		xhr.onreadystatechange = () => {
			if (xhr.readyState !== 4) {
				return;
			}

			const ok = xhr.status >= 200 && xhr.status < 300;
			if (!ok) {
				setTimeout(() => {
					reject(new TypeError(`Failed to fetch (url: "${url}")`));
				}, 0);
			}
		};

		xhr.onload = () => {
			const ok = xhr.status >= 200 && xhr.status < 300;
			if (ok) {
				resolve(xhr.response);
			}
		};

		xhr.onerror = () => {
			setTimeout(() => {
				reject(new TypeError(`Network request failed (url: "${url}")`));
			}, 0);
		};

		xhr.ontimeout = () => {
			setTimeout(() => {
				reject(new TypeError(`Network request failed (url: "${url}")`));
			}, 0);
		};

		xhr.send();
	});
};

class URLBrowserResolver {
	constructor(fs) {
		this.fs = fs;
		this.resolving = {};
	}

	resolve(url, headers = {}) {
		if (!this.resolving[url]) {
			this.resolving[url] = new Promise((resolve, reject) => {
				if (url.toLowerCase().indexOf('https://') === 0 || url.toLowerCase().indexOf('http://') === 0) {
					fetchUrl(url, headers).then(buffer => {
						this.fs.writeFileSync(url, buffer);
						resolve();
					}, result => {
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

	resolved() {
		return new Promise((resolve, reject) => {
			Promise.all(Object.values(this.resolving)).then(() => {
				resolve();
			}, result => {
				reject(result);
			});
		});
	}

}

export default URLBrowserResolver;
