import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import Logger from '../logger/logger.js';
import { RequestHandlerBase } from './request-handler-base.js';

const
	logger = new Logger('JustTest [client libs handler]'),
	require = createRequire(import.meta.url),
	CONFIG_KEY = Symbol('config.key');

export default class ClientLibsRequestHandler extends RequestHandlerBase {
	constructor(config) {
		super();
		this[CONFIG_KEY] = config;

		logger.info(`client lib resource request handler initialized; basePath: '${this.basePath}'`);
	}

	get basePath() {
		return '/libs';
	}

	async handle(handlerRelativePath, req, res) {
		const libName = this.extractLibName(handlerRelativePath);
		const libPath = handlerRelativePath.replace(libName, '');
		const libMain = require.resolve(libName);
		let filePath = libMain;
		if (libPath) {
			//	TODO: extract base folder and concat with libPath
		}

		fs.readFile(filePath, (error, content) => {
			if (!error) {
				res.writeHead(200, { 'Content-Type': 'text/javascript' }).end(content);
			} else {
				if (error.code === 'ENOENT') {
					logger.warn(`sending 404 for '${filePath}'`);
					res.writeHead(404).end();
				} else {
					logger.warn(`sending 500 for '${filePath}'`);
					res.writeHead(500).end(error.toString());
				}
			}
		});

		return true;
	};

	extractLibName(libPath) {
		let result = libPath;
		const i = libPath.indexOf('/');
		if (i > 0) {
			result = libPath.substring(0, i);
		}
		return result;
	}
}