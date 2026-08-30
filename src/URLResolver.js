
const MAX_REDIRECTS = 30;

/**
 * @param {string} url
 * @param {object} headers
 * @param {(url: string) => boolean} urlAccessPolicy
 * @returns {Promise<Response>}
 */
async function fetchUrl(url, headers = {}, urlAccessPolicy) {
	for (let i = 0; i <= MAX_REDIRECTS; i++) {
		if ((typeof urlAccessPolicy !== 'undefined') && (urlAccessPolicy(url) !== true)) {
			throw new Error(`Access to URL denied by resource access policy: ${url}`);
		}

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
				response = await fetch(url, {headers});
			}

			if (!response.ok) {
				throw new Error(`Failed to fetch (status code: ${response.status})`);
			}

			return response;

		} catch (error) {
			throw new Error(`Network request failed (url: "${url}", error: ${error.message})`, {cause: error});
		}
	}

	throw new Error(`Network request failed (url: "${url}", error: Too many redirects)`);
}

class URLResolver {
	constructor(fs) {
		this.fs = fs;
		this.resolving = {};
		this.urlAccessPolicy = undefined;
	}

	/**
	 * @param {(url: string) => boolean} callback
	 */
	setUrlAccessPolicy(callback) {
		this.urlAccessPolicy = callback;
	}

	resolve(url, headers = {}) {
		const resolveUrlInternal = async () => {
			if (url.toLowerCase().startsWith('https://') || url.toLowerCase().startsWith('http://')) {
				if (this.fs.existsSync(url)) {
					return; // url was downloaded earlier
				}

				const response = await fetchUrl(url, headers, this.urlAccessPolicy);

				// validate access policy on redirected url (in browsers, only the final URL is validated)
				if (response.redirected) {
					if ((typeof this.urlAccessPolicy !== 'undefined') && (this.urlAccessPolicy(response.url) !== true)) {
						throw new Error(`Access to URL denied by resource access policy: ${response.url}`);
					}
				}

				const buffer = await response.arrayBuffer();
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
