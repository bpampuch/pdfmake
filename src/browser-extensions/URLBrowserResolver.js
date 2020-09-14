const fetchUrl = (url, headers = {}) => {
	// return fetch(url, { headers }).then((response) => {
	// 	if (response.status !== 200) throw Error(`Failed to fetch (status code: ${response.status}, url: "${url}")`);
  //   return response.arrayBuffer();
  // }).then((buffer) => {
  //   return buffer;
  // });

	return new Promise((resolve, reject) => {
		const xhr = new XMLHttpRequest();
		xhr.open('GET', url, true);
		Object.keys(headers).map((headerName) => {
			xhr.setRequestHeader(headerName, headers[headerName]);
		});
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

	resolve(unresolvedFile) {
		let url = unresolvedFile;
		let headers = {};
		if (unresolvedFile && typeof unresolvedFile === 'object') {
			url = unresolvedFile.url;
			headers = unresolvedFile.headers || {};
		}

		if (!this.resolving[url]) {
			this.resolving[url] = new Promise((resolve, reject) => {
				if (url) {
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
