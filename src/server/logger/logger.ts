import util from 'node:util';
import ConsoleOutput from './outputs/console-output.ts';
import FileOutput from './outputs/file-output.ts';

export {
	ConsoleOutput,
	FileOutput,
	LOG_LEVELS
};

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
		context: 'default',
		outputs: [new ConsoleOutput()],
		level: LOG_LEVELS.INFO
	}),
	CONTEXTS_REGISTRAR: Record<string, boolean> = {};

class LoggingConfiguration {
	[key: string]: any;

	constructor(configuration) {
		if (!configuration || typeof configuration !== 'object') {
			throw new Error(`configuration object required; received '${configuration}'`);
		}
		if (configuration.context in CONTEXTS_REGISTRAR) {
			throw new Error(`logging context '${configuration.context}' already registered`);
		}
		if (configuration.outputs !== undefined && !Array.isArray(configuration.outputs)) {
			throw new Error(`logging outputs if/when provided MUST be and array, got '${configuration.outputs}'`);
		}
		Object.assign(this, DEFAULT_CONFIG, configuration);
		CONTEXTS_REGISTRAR[this.context] = true;
	}
}

export default class Logger {
	[key: string | symbol]: any;

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
	debug(...args: any[]) {
		if (this.level < LOG_LEVELS.DEBUG) return;

		const processed = this[PROCCESS_ARGUMENTS_KEY](args, 'DBG');
		this[OUTPUT_KEY]('debug', processed);
	}

	//	effective for verbosity = info, warn, error
	info(...args: any[]) {
		if (this.level < LOG_LEVELS.INFO) return;

		const processed = this[PROCCESS_ARGUMENTS_KEY](args, 'INF');
		this[OUTPUT_KEY]('info', processed);
	}

	//	effective for verbosity = warn, error
	warn(...args: any[]) {
		if (this.level < LOG_LEVELS.WARN) return;

		const processed = this[PROCCESS_ARGUMENTS_KEY](args, 'WRN');
		this[OUTPUT_KEY]('warn', processed);
	}

	//	effective for verbosity = error
	error(...args: any[]) {
		if (this.level < LOG_LEVELS.ERROR) return;

		const processed = this[PROCCESS_ARGUMENTS_KEY](args, 'ERR');
		this[OUTPUT_KEY]('error', processed);
	}

	//	aliases
	get dir() { return this.info; }
	get log() { return this.info; }
	get warning() { return this.warn; }

	[PROCCESS_ARGUMENTS_KEY](args, level) {
		let result: string[] = [];
		for (const arg of args) {
			if (typeof arg === 'object') {
				result.push(
					`${new Date().toISOString()} ${level} [${this[CONFIGURATION_KEY].context}] -`,
					util.inspect(arg, false, Infinity, true)
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
