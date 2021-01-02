export {
	reportResults
}

async function reportResults(sesId, envId, results) {
	console.log(`reporting '${sesId}':'${envId}' results...`);
	const reportSessionResponse = await fetch(`/api/v1/sessions/${sesId}/environments/${envId}/result`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(results)
	});
	if (reportSessionResponse.status === 201) {
		console.log(`... reported`);
	} else {
		console.error(`... report failed, status: ${reportSessionResponse.status}`);
	}
}