export {
	uniFetch
}

let uniFetch;
let initPromise = initFetch();
initPromise.then(r => { uniFetch = r; });

//	TODO: add here higher level REST APIs caller

async function initFetch() {
	let result;
	if (globalThis.fetch) {
		result = globalThis.fetch;
	} else {
		const http = (await import('http')).default;
		result = async (url, options) => {
			return new Promise((resolve, reject) => {
				http.request(url, options, res => {
					if (res.statusCode < 200 && res.statusCode > 299) {
						resolve({
							ok: false,
							status: res.statusCode
						});
					} else {
						let data = '';
						res.setEncoding('utf-8');
						res.on('data', chunk => data += chunk);
						res.on('end', () => {
							resolve({
								ok: true,
								status: res.statusCode,
								text: () => Promise.resolve(data),
								json: () => Promise.resolve(JSON.parse(data))
							});
						});
					}
				})
					.on('error', reject)
					.end();
			});
		};
	}
	return result;
}