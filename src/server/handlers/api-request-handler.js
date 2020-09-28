import Logger from '../../logger/logger.js';
import { RequestHandlerBase } from './request-handler-base.js';
import { extensionsMap } from '../server-utils.js';
import { obtainEffectiveConfig } from '../../configurer.js';
import { CONSTANTS } from '../../tests/tests-service.js';

const
	logger = new Logger({ context: 'handler API' }),
	CONFIG_KEY = Symbol('config.key');

export default class ClientCoreRequestHandler extends RequestHandlerBase {
	constructor(config) {
		super();
		this[CONFIG_KEY] = config;
		logger.info(`API resource request handler initialized; basePath: '${this.basePath}'`);
	}

	get basePath() {
		return '/api';
	}

	async handle(handlerRelativePath, req, res) {
		if (handlerRelativePath.startsWith('metadata')) {
			this.handleTestsMetadata(res);
		} else if (handlerRelativePath.startsWith('resources')) {
			await this.handleTestsResources(res);
		} else {
			res.writeHead(404).end();
		}
	}

	handleTestsMetadata(res) {
		res
			.writeHead(200, { 'Content-Type': extensionsMap.json })
			.end(JSON.stringify(obtainEffectiveConfig(CONSTANTS.TESTS_METADATA)));
	}

	async handleTestsResources(res) {
		res
			.writeHead(200, { 'Content-Type': extensionsMap.json })
			.end(JSON.stringify(await obtainEffectiveConfig(CONSTANTS.TEST_RESOURCES_PROMISE)));
	}
}