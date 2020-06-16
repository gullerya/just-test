import fsExtra from 'fs-extra';
import { performance } from 'perf_hooks';
import Logger from '../logging/logger.js';

const logger = new Logger('JustTest [tester]'),


export default class BrowserService {
	constructor(config) {
		this[CONFIG_KEY] = buildConfig(configuration);

	}
}