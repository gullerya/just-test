const
	CONTEXT_KEY = Symbol('context.key'),
	PROCCESS_ARGUMENTS_KEY = Symbol('process.arguments.key'),
	OUTPUT_KEY = Symbol('output.key');

class LoggingContext {
	constructor(context) {
		if (!context) {
			throw new Error(`context argument required; received '${context}'`);
		}
		this.outputs = [];
		this.prefix = context;
		this.outputs.push(console);
	}
}

export default class Logger {
	constructor(context) {
		this[CONTEXT_KEY] = new LoggingContext(context);
	}

	debug() {
		const args = this[PROCCESS_ARGUMENTS_KEY](arguments, 'DEBUG');
		this[OUTPUT_KEY]('debug', args);
	}

	error() {
		const args = this[PROCCESS_ARGUMENTS_KEY](arguments, 'ERROR');
		this[OUTPUT_KEY]('error', args);
	}

	info() {
		const args = this[PROCCESS_ARGUMENTS_KEY](arguments, 'INFO');
		this[OUTPUT_KEY]('info', args);
	}

	log() {
		const args = this[PROCCESS_ARGUMENTS_KEY](arguments, 'LOG');
		this[OUTPUT_KEY]('log', args);
	}

	warn() {
		const args = this[PROCCESS_ARGUMENTS_KEY](arguments, 'WARN');
		this[OUTPUT_KEY]('warn', args);
	}

	[PROCCESS_ARGUMENTS_KEY](args, method) {
		let result = [];
		if (args.length) {
			result = Array.from(args).slice();
			result[0] = `${this[CONTEXT_KEY].prefix} - ${method} - ${result[0]}`;
		}
		return result;
	}

	[OUTPUT_KEY](method, args) {
		if (method && args && args.length) {
			this[CONTEXT_KEY].outputs.forEach(output => {
				try {
					output[method].apply(output, args);
				} catch (e) {
					console.error(`failed to output to ${output}`, e);
				}
			});
		}
	}
}