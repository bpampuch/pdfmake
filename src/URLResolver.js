const fetchUrl = (url, headers = {}) => {
	return fetch(url, { headers }).then(
		response => {
			if (!response.ok) {
				throw new TypeError(`Failed to fetch (status code: ${response.status}, url: "${url}")`);
			}
			return response.arrayBuffer();
		},
		() => {
			throw new TypeError(`Network request failed (url: "${url}")`);
		}
	);
};

class URLResolver {
	constructor(fs) {
		this.fs = fs;
		this.resolving = {};
	}

	resolve(url, headers = {}) {
		if (!this.resolving[url]) {
			this.resolving[url] = new Promise((resolve, reject) => {
				if (url.toLowerCase().indexOf('https://') === 0 || url.toLowerCase().indexOf('http://') === 0) {
					if (this.fs.existsSync(url)) {
						// url was downloaded earlier
						resolve();
					} else {
						fetchUrl(url, headers).then(buffer => {
							this.fs.writeFileSync(url, buffer);
							resolve();
						}, result => {
							reject(result);
						});
					}
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

export default URLResolver;
