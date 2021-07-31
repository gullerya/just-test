export {
	requestTestConfig,
	submitRunResult
}

async function requestTestConfig() {
	globalThis.process.send({
		type: 'readyToRun'
	});
}

async function submitRunResult(runResult) {
	return new Promise((resolve, reject) => {
		const r = globalThis.process.send(
			{
				type: 'runResult',
				runResult
			},
			null,
			{ swallowErrors: false },
			reject
		);
		if (r) {
			resolve();
		} else {
			reject();
		}
	});
}