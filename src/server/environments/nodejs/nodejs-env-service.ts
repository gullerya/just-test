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
import Logger, { ConsoleOutput, FileOutput } from '../../logger/logger.ts';
import { config as serverConfig } from '../../server-service.ts';
import { EnvironmentBase } from '../environment-base.ts';

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
		//	Worker stdout/stderr already carries fully formatted log lines
		//	(timestamp, level, context) emitted by the session-box's own
		//	Logger. Pass them through verbatim to the file + console sinks;
		//	re-wrapping via another Logger would double-prefix every line
		//	with the drain timestamp of the parent, which is misleading —
		//	the outer timestamp reflects stdout drain, not emit time, and
		//	can lag by seconds under load.
		const consoleOutput = new ConsoleOutput();

		this.#worker = new Worker(
			new URL('../../../runner/environments/nodejs/nodejs-session-box.js', import.meta.url),
			{
				stdout: true,
				stderr: true,
				workerData: {
					sesId: this.sessionId,
					envId: this.#envConfig.id,
					origin: serverConfig.origin
				}
			}
		);
		const pipe = (sinkMethod: 'info' | 'error') => (data: Buffer) => {
			for (const line of data.toString().split(/\r?\n/)) {
				if (!line) {
					continue;
				}
				this.#consoleLogger[sinkMethod](line);
				consoleOutput[sinkMethod](line);
			}
		};
		this.#worker.stdout.on('data', pipe('info'));
		this.#worker.stderr.on('data', pipe('error'));

		this.#worker.on('error', error => {
			logger.error(error);
		});
		this.#worker.on('exit', exitCode => {
			logger.info(`worker exited with code ${exitCode}`);
			this.dispatchEvent(new CustomEvent('dismissed'));
		});
	}

	async dismiss() {
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