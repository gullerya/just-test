export {
	getSessionMetadata,
	postSessionDone
}

async function getSessionMetadata(sesId, envId, serverOrigin) {
	const [config, testPaths] = await Promise.all([
		(await fetch(`${serverOrigin}/api/v1/sessions/${sesId}/environments/${envId}/config`)).json(),
		(await fetch(`${serverOrigin}/api/v1/sessions/${sesId}/environments/${envId}/test-file-paths`)).json()
	]);
	config.testPaths = testPaths;
	config.sessionId = sesId;
	return config;
}

async function postSessionDone(sesId, envId) {
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