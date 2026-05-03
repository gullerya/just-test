//	Env-neutral structured logger. Formats each record into a string at
//	the moment of emission (timestamp + level + context + payload) and
//	fans it out to every configured output. Outputs are duck-typed:
//	anything exposing `debug/info/warn/error(string)` methods qualifies —
//	`globalThis.console` does, out of the box.

export { LOG_LEVELS };

const LOG_LEVELS = Object.freeze({
	ERROR: 40,
	WARN: 50,
	INFO: 60,
	DEBUG: 70
});

type LogMethod = 'debug' | 'info' | 'warn' | 'error';

interface LogOutput {
	debug(message: string): void;
	info(message: string): void;
	warn(message: string): void;
	error(message: string): void;
}

interface LoggerOptions {
	context: string;
	outputs?: LogOutput[];
	level?: number;
}

const DEFAULT_OUTPUTS: LogOutput[] = [globalThis.console];
const DEFAULT_LEVEL = LOG_LEVELS.INFO;
const CONTEXTS_REGISTRAR: Record<string, boolean> = {};

class LoggingConfiguration {
	context: string;
	outputs: LogOutput[];
	level: number;

	constructor(configuration: LoggerOptions) {
		if (!configuration || typeof configuration !== 'object') {
			throw new Error(`configuration object required; received '${configuration}'`);
		}
		if (configuration.context in CONTEXTS_REGISTRAR) {
			throw new Error(`logging context '${configuration.context}' already registered`);
		}
		if (configuration.outputs !== undefined && !Array.isArray(configuration.outputs)) {
			throw new Error(`logging outputs if/when provided MUST be and array, got '${configuration.outputs}'`);
		}
		this.context = configuration.context;
		this.outputs = configuration.outputs ?? DEFAULT_OUTPUTS;
		this.level = configuration.level ?? DEFAULT_LEVEL;
		CONTEXTS_REGISTRAR[this.context] = true;
	}
}

export default class Logger {
	#config: LoggingConfiguration;

	constructor(configuration: LoggerOptions) {
		this.#config = new LoggingConfiguration(configuration);
	}

	set level(level: number) {
		if (!level || typeof level !== 'number' || !Object.values(LOG_LEVELS).some(v => v === level)) {
			throw new Error(`level argument MUST be one of '${Object.values(LOG_LEVELS)}', got '${level}'`);
		}
		this.#config.level = level;
	}

	get level(): number {
		return this.#config.level;
	}

	debug(...args: unknown[]): void {
		if (this.level < LOG_LEVELS.DEBUG) { return; }
		this.#emit('debug', this.#format(args, 'DBG'));
	}

	info(...args: unknown[]): void {
		if (this.level < LOG_LEVELS.INFO) { return; }
		this.#emit('info', this.#format(args, 'INF'));
	}

	warn(...args: unknown[]): void {
		if (this.level < LOG_LEVELS.WARN) { return; }
		this.#emit('warn', this.#format(args, 'WRN'));
	}

	error(...args: unknown[]): void {
		if (this.level < LOG_LEVELS.ERROR) { return; }
		this.#emit('error', this.#format(args, 'ERR'));
	}

	get dir() { return this.info; }
	get log() { return this.info; }
	get warning() { return this.warn; }

	#format(args: unknown[], level: string): string[] {
		const result: string[] = [];
		const prefix = `${new Date().toISOString()} ${level} [${this.#config.context}] -`;
		for (const arg of args) {
			if (typeof arg === 'string') {
				result.push(`${prefix} ${arg}`);
			} else if (arg instanceof Error) {
				const header = `${arg.name}: ${arg.message}`;
				result.push(`${prefix} ${header}`);
				if (arg.stack) {
					//	V8 prepends `${name}: ${message}` to `stack`;
					//	SpiderMonkey / JavaScriptCore do not. Normalize so
					//	the emitted stack line is self-describing across engines.
					const stack = arg.stack.startsWith(header) ? arg.stack : `${header}\n${arg.stack}`;
					result.push(stack);
				}
			} else {
				result.push(prefix);
				result.push(formatValue(arg));
			}
		}
		return result;
	}

	#emit(method: LogMethod, messages: string[]): void {
		for (const output of this.#config.outputs) {
			for (const message of messages) {
				output[method](message);
			}
		}
	}
}

function formatValue(value: unknown): string {
	const seen = new WeakSet();
	return JSON.stringify(
		value,
		(_key, v) => {
			if (typeof v === 'bigint') {
				return v.toString();
			}
			if (typeof v === 'symbol') {
				return v.toString();
			}
			if (typeof v === 'function') {
				return `[Function: ${v.name || 'anonymous'}]`;
			}
			if (typeof v === 'undefined') {
				return '[undefined]';
			}
			if (v !== null && typeof v === 'object') {
				if (seen.has(v)) {
					return '[Circular]';
				}
				seen.add(v);
			}
			return v;
		},
		2
	);
}
