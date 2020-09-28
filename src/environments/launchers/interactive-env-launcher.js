export default function launch(envConfig) {
	if (!envConfig || !envConfig.interactive) {
		throw new Error(`env configuration expected to have interactive set to true; got ${JSON.stringify(envConfig)}`);
	}
	//	TODO: this one should be able to be resolved by manual trigger
	return new Promise(() => { });
}