export {
	getSessionMetadata,
	reportSessionResult,
	postSessionDone
}

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
	console.info(`reporting '${sesId}':'${envId}' results...`);
	const postSessionResultUrl = `${serverOrigin}/api/v1/sessions/${sesId}/environments/${envId}/result`;
	const reportSessionResponse = await fetch(postSessionResultUrl, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(result)
	});
	if (reportSessionResponse.status === 201) {
		console.info(`... reported`);
	} else {
		console.error(`... report failed, status: ${reportSessionResponse.status}`);
	}
}

async function postSessionDone(sesId, envId) {
	console.warn('-=-=-=-=-=-=-=-=-=-=-=-=-=-=-');
	if (!sesId || typeof sesId !== 'string') {
		throw new Error(`invalid session ID parameter '${sesId}'`);
	}
	if (!envId || typeof envId !== 'string') {
		throw new Error(`invalid environment ID parameter '${envId}'`);
	}

	const response = await fetch(`/api/v1/sessions/${sesId}/environments/${envId}/done`, {
		method: 'PUT'
	});
	console.debug(response.status);
}