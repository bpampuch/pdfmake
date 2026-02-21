async function fetchUrl(url, headers = {}) {
	try {
		const response = await fetch(url, { headers });
		if (!response.ok) {
			throw new Error(`Failed to fetch (status code: ${response.status}, url: "${url}")`);
		}
		return await response.arrayBuffer();
	} catch (error) {
		throw new Error(`Network request failed (url: "${url}", error: ${error.message})`, { cause: error });
	}
}

class URLResolver {
	constructor(fs) {
		this.fs = fs;
		this.resolving = {};
	}

	resolve(url, headers = {}) {
		const resolveUrlInternal = async () => {
			if (url.toLowerCase().startsWith('https://') || url.toLowerCase().startsWith('http://')) {
				if (this.fs.existsSync(url)) {
					return; // url was downloaded earlier
				}
				const buffer = await fetchUrl(url, headers);
				this.fs.writeFileSync(url, buffer);
			}
			// else cannot be resolved
		};

		if (!this.resolving[url]) {
			this.resolving[url] = resolveUrlInternal();
		}
		return this.resolving[url];
	}

	resolved() {
		return Promise.all(Object.values(this.resolving));
	}

}

export default URLResolver;
