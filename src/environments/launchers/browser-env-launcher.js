export default function launch(envConfig) {
	if (!envConfig || !envConfig.browser) {
		throw new Error(`env configuration expected to have browser set to some value; got ${JSON.stringify(envConfig)}`);
	}
	//	launch browser
	//	return Promise;
	return Promise.reject('not yet implemented');
}