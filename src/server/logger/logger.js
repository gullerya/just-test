import util from 'util';
import ConsoleOutput from './outputs/console-output.js';
import FileOutput from './outputs/file-output.js';

export {
	ConsoleOutput,
	FileOutput,
	LOG_LEVELS
}

const LOG_LEVELS = Object.freeze({
	ERROR: 40,
	WARN: 50,
	INFO: 60,
	DEBUG: 70
});

const
	CONFIGURATION_KEY = Symbol('configuration.key'),
	PROCCESS_ARGUMENTS_KEY = Symbol('process.arguments.key'),
	OUTPUT_KEY = Symbol('output.key'),
	DEFAULT_CONFIG = Object.freeze({
		context: 'Default',
		outputs: [new ConsoleOutput(), new FileOutput('./reports/logs/just-test-server.log')],
		level: LOG_LEVELS.INFO
	}),
	CONTEXTS_REGISTRAR = {};

class LoggingConfiguration {
	constructor(configuration) {
		if (!configuration || typeof configuration !== 'object') {
			throw new Error(`configuration object required; received '${configuration}'`);
		}
		Object.assign(this, DEFAULT_CONFIG, configuration);
		if (this.context in CONTEXTS_REGISTRAR) {
			throw new Error(`logging context '${this.context}' already registered`);
		} else {
			CONTEXTS_REGISTRAR[this.context] = true;
		}
	}
}

export default class Logger {
	constructor(configuration) {
		this[CONFIGURATION_KEY] = new LoggingConfiguration(configuration);
	}

	set level(level) {
		if (!level || typeof level !== 'number' || !Object.values(LOG_LEVELS).some(v => v === level)) {
			throw new Error(`level argument MUST be one of '${Object.values(LOG_LEVELS)}', got '${level}'`);
		}
		this[CONFIGURATION_KEY].level = level;
	}

	get level() {
		return this[CONFIGURATION_KEY].level;
	}

	//	effective for verbosity = debug, info, warn, error
	debug() {
		if (this.level < LOG_LEVELS.DEBUG) return;

		const args = this[PROCCESS_ARGUMENTS_KEY](arguments, 'DBG');
		this[OUTPUT_KEY]('debug', args);
	}

	//	effective for verbosity = info, warn, error
	info() {
		if (this.level < LOG_LEVELS.INFO) return;

		const args = this[PROCCESS_ARGUMENTS_KEY](arguments, 'INF');
		this[OUTPUT_KEY]('info', args);
	}

	//	effective for verbosity = warn, error
	warn() {
		if (this.level < LOG_LEVELS.WARN) return;

		const args = this[PROCCESS_ARGUMENTS_KEY](arguments, 'WRN');
		this[OUTPUT_KEY]('warn', args);
	}

	//	effective for verbosity = error
	error() {
		if (this.level < LOG_LEVELS.ERROR) return;

		const args = this[PROCCESS_ARGUMENTS_KEY](arguments, 'ERR');
		this[OUTPUT_KEY]('error', args);
	}

	[PROCCESS_ARGUMENTS_KEY](args, level) {
		let result = [];
		for (const arg of args) {
			if (typeof arg === 'object') {
				result.push(
					`${new Date().toISOString()} ${level} [${this[CONFIGURATION_KEY].context}] -`,
					util.inspect(arg, false, null, true)
				);
			} else {
				result.push(
					`${new Date().toISOString()} ${level} [${this[CONFIGURATION_KEY].context}] - ${arg}`
				);
			}
		}
		return result;
	}

	[OUTPUT_KEY](method, args) {
		for (const output of this[CONFIGURATION_KEY].outputs) {
			for (const arg of args) {
				output[method](arg);
			}
		}
	}
}