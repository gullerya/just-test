/**
 * This will launch NodeJS environment, that is:
 * - spawning process/es as needed for encapsulated tests run
 * - running all tests in those processes
 * - collect results and shut down child processes
 * 
 * @param {Object} envConfig environment configuration
 * @param {string} envConfig.node in this context expected always to equal true
 */
import { Worker } from 'node:worker_threads';
import { waitInterval } from '../../../common/time-utils.js';
import Logger, { FileOutput } from '../../logger/logger.js';
import { config as serverConfig } from '../../server-service.js';
import { EnvironmentBase } from '../environment-base.js';

export default launch;

const logger = new Logger({ context: 'NodeJS env service' });

class NodeEnvImpl extends EnvironmentBase {
	#envConfig;
	#consoleLogger;
	#worker;

	/**
	 * construct browser environment for a specific session
	 * 
	 * @param {string} sessionId session ID
	 * @param {object} envConfig environment setup
	 */
	constructor(sessionId, envConfig) {
		super(sessionId);

		this.#envConfig = envConfig;
		this.#consoleLogger = null;

		Object.seal(this);
	}

	async launch() {
		logger.info(`launching 'NodeJS' environment...`);

		const versionNamed = `nodejs-${process.version.replace(/^[^0-9]+/, '')}`;
		this.#consoleLogger = new FileOutput(`./reports/logs/${versionNamed}.log`);
		const nLogger = new Logger({
			context: versionNamed,
			outputs: [this.#consoleLogger]
		});

		this.#worker = new Worker(
			new URL('../../../runner/environments/nodejs/nodejs-session-box.js', import.meta.url),
			{
				stdout: true,
				stderr: this,
				workerData: {
					sesId: this.sessionId,
					envId: this.#envConfig.id,
					origin: serverConfig.origin
				}
			}
		);
		this.#worker.stdout.on('data', data => nLogger.info(data.toString().trim()));
		this.#worker.stderr.on('data', data => nLogger.error(data.toString().trim()));

		this.#worker.on('error', error => {
			logger.error(error);
		});
		this.#worker.on('exit', exitCode => {
			logger.info(`worker exited with code ${exitCode}`);
			this.dispatchEvent(new CustomEvent('dismissed'));
		});
	}

	async dismiss() {
		await waitInterval(100);
		await this.#worker.terminate();
	}
}

/**
 * launches managed NodeJS environment and executes tests in it
 * - TODO: consider to separate auto-run
 * 
 * @param {string} sessionId 
 * @param {object} envConfig 
 * @returns environment
 */
async function launch(sessionId, envConfig) {
	if (!envConfig || !envConfig.node) {
		throw new Error(`env configuration expected to have node set to some value; got ${JSON.stringify(envConfig)}`);
	}

	const result = new NodeEnvImpl(sessionId, envConfig);
	await result.launch();
	return result;
}