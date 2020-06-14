import { mergeConfig } from '../../configurer.js';

const
	defaultConfig = Object.freeze({
		dev: false,
		port: 3000,
		include: [
			'./'
		],
		exclude: []
	});

export default input => {
	const result = mergeConfig(defaultConfig, input);
	validate(result);
	return Object.freeze(result);
};

function validate(config) {
	if (isNaN(parseInt(config.port))) {
		throw new Error(`invalid http server port ${config.port}`);
	}
}