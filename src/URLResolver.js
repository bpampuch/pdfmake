
const MAX_REDIRECTS = 30;

/**
 * @param {string} url
 * @param {object} headers
 * @param {(url: string) => void} validateUrlAccessPolicy
 * @returns {Promise<{buffer: ArrayBuffer, url: string}>}
 */
export async function fetchUrl(url, headers = {}, validateUrlAccessPolicy) {
	for (let i = 0; i <= MAX_REDIRECTS; i++) {
		validateUrlAccessPolicy(url);

		try {
			let response = await fetch(url, { headers, redirect: 'manual' });

			// redirect url
			if (response.status >= 300 && response.status < 400) {
				let location = response.headers.get('location');
				if (!location) {
					throw new Error('Redirect response missing Location header');
				}
				url = new URL(location, url).href;
				continue;
			}

			// browsers do not support redirect: 'manual'
			if (response.type === 'opaqueredirect') {
				response = await fetch(url, { headers });
			}

			if (!response.ok) {
				throw new Error(`Failed to fetch (status code: ${response.status})`);
			}

			// validate access policy on redirected url (in browsers, only the final URL is validated)
			const finalUrl = response.redirected ? response.url : url;
			validateUrlAccessPolicy(finalUrl);

			return { buffer: await response.arrayBuffer(), url: finalUrl };

		} catch (error) {
			throw new Error(`Network request failed (url: "${url}", error: ${error.message})`, {cause: error});
		}
	}

	throw new Error(`Network request failed (url: "${url}", error: Too many redirects)`);
}

export const defaultUrlProtocols = new Map([['http', fetchUrl], ['https', fetchUrl]]);

class URLResolver {
	constructor(fs, sharedFs, concurrency, urlProtocols) {
		if (!Number.isInteger(concurrency) || concurrency < 1) {
			throw new Error("Parameter 'concurrency' must be a positive integer.");
		}

		this.fs = fs;
		this.sharedFs = sharedFs;
		this.resolving = {};
		this.urlAccessPolicy = undefined;
		this.validateUrlAccessPolicy = this.validateUrlAccessPolicy.bind(this);
		this.urlProtocols = new Map(urlProtocols);
		this.concurrency = concurrency;
		this.activeDownloads = 0;
		this.queue = [];
	}

	/**
	 * @param {(url: string) => boolean} callback
	 */
	setUrlAccessPolicy(callback) {
		this.urlAccessPolicy = callback;
	}

	/**
	 * @param {string} url
	 */
	validateUrlAccessPolicy(url) {
		if ((typeof this.urlAccessPolicy !== 'undefined') && (this.urlAccessPolicy(url) !== true)) {
			throw new Error(`Access to URL denied by resource access policy: ${url}`);
		}
	}

	resolve(url, headers = {}, cache = false) {
		if (typeof url !== 'string') {
			return Promise.resolve();
		}

		const key = JSON.stringify([url, cache === true]);
		const resolveUrlInternal = async () => {
			const protocol = /^([a-z][a-z\d+.-]*):/i.exec(url);
			const handler = protocol && this.urlProtocols.get(protocol[1].toLowerCase());
			if (handler) {
				if (this.fs.existsSync(url)) {
					if ((cache === true) && !this.sharedFs.existsSync(url)) {
						this.fs.unlinkSync(url);
					} else {
						return; // url was downloaded earlier
					}
				}

				this.validateUrlAccessPolicy(url);

				const response = await handler(url, headers, this.validateUrlAccessPolicy);

				if (!response || typeof response !== 'object') {
					throw new Error(`Invalid protocol handler response (url: "${url}"): Object with buffer and url expected.`);
				}
				if (!(response.buffer instanceof ArrayBuffer) && !(response.buffer instanceof Uint8Array)) {
					throw new Error(`Invalid protocol handler response (url: "${url}"): 'buffer' must be an ArrayBuffer or Uint8Array.`);
				}
				if (typeof response.url !== 'string' || response.url.trim().length === 0) {
					throw new Error(`Invalid protocol handler response (url: "${url}"): 'url' must be a non-empty string.`);
				}

				this.validateUrlAccessPolicy(response.url);

				const target = cache === true ? this.sharedFs : this.fs;
				target.writeFileSync(url, response.buffer);
			}
			// else cannot be resolved
		};

		if (!this.resolving[key]) {
			this.resolving[key] = new Promise((resolve, reject) => {
				this.queue.push({ run: resolveUrlInternal, resolve, reject });
			});
			this.processQueue();
		}
		return this.resolving[key];
	}

	processQueue() {
		while (this.activeDownloads < this.concurrency && this.queue.length > 0) {
			const task = this.queue.shift();
			this.activeDownloads++;
			task.run().then(task.resolve, task.reject).finally(() => {
				this.activeDownloads--;
				this.processQueue();
			});
		}
	}

	resolved() {
		return Promise.all(Object.values(this.resolving));
	}

}

export default URLResolver;
