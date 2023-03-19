export {
	getSessionMetadata,
	reportSessionResult
};

async function getSessionMetadata(sesId, envId, serverOrigin) {
	const getSessionConfigUrl = `${serverOrigin}/api/v1/sessions/${sesId}/environments/${envId}/config`;
	const getSessionTestUrls = `${serverOrigin}/api/v1/sessions/${sesId}/environments/${envId}/test-file-paths`;
	const [config, testPaths] = await Promise.all([
		(await fetch(getSessionConfigUrl)).json(),
		(await fetch(getSessionTestUrls)).json()
	]);
	config.testPaths = testPaths;
	config.sessionId = sesId;
	return config;
}

async function reportSessionResult(sesId, envId, serverOrigin, result) {
	const postSessionResultUrl = `${serverOrigin}/api/v1/sessions/${sesId}/environments/${envId}/result`;
	const reportSessionResponse = await fetch(postSessionResultUrl, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(result)
	});
	if (reportSessionResponse.status !== 201) {
		console.error(`failed to report session result, status: ${reportSessionResponse.status}`);
	}
}
