import fs from 'fs';
import path from 'path';
import Logger from '../../logger/logger.js';
import { RequestHandlerBase } from './request-handler-base.js';
import { findMimeType, extensionsMap } from '../server-utils.js';

const
	logger = new Logger({ context: 'handler test resources' }),
	CONFIG_KEY = Symbol('config.key'),
	TEST_RESOURCES_KEY = Symbol('test.resources.key');

export default class TestResourcesRequestHandler extends RequestHandlerBase {
	constructor(config) {
		super();
		this[CONFIG_KEY] = config;
		this.postInit();
	}

	async postInit() {
		this[TEST_RESOURCES_KEY] = await testsService.readyPromise;
		logger.info(`test resource request handler initialized; basePath: '${this.basePath}', total resources: ${this[TEST_RESOURCES_KEY].length}`);
	}

	get basePath() {
		return '/tests/resources';
	}

	async handle(handlerRelativePath, req, res) {
		const contentType = findMimeType(handlerRelativePath, extensionsMap.json);
		fs.readFile(path.resolve(handlerRelativePath), (error, content) => {
			if (!error) {
				res.writeHead(200, { 'Content-Type': contentType }).end(content);
			} else {
				if (error.code === 'ENOENT') {
					logger.warn(`sending 404 for '${handlerRelativePath}'`);
					res.writeHead(404).end();
				} else {
					logger.warn(`sending 500 for '${handlerRelativePath}'`);
					res.writeHead(500).end(error.toString());
				}
			}
		});
	}
}