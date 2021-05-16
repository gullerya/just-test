export {
	postSessionDone
}

async function postSessionDone(sesId, envId) {
	if (!sesId || typeof sesId !== 'string') {
		throw new Error(`invalid session ID parameter '${sesId}'`);
	}
	if (!envId || typeof envId !== 'string') {
		throw new Error(`invalid environment ID parameter '${envId}'`);
	}

	await initPromise;
	const response = await uniFetch(`/api/v1/sessions/${sesId}/environments/${envId}/done`, {
		method: 'PUT'
	});
	console.debug(response.status);
}

// internal implementation details
//
let uniFetch;
let initPromise = initFetch();
initPromise.then(r => { uniFetch = r; });

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