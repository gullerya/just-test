import fs from 'node:fs';
import os from 'node:os';

// eslint-disable-next-line no-control-regex
const FILE_OUTPUT_TEXT_CLEANER = /\u001B\[\d+m/g;

export default class FileOutput {
	readonly #buffer: string[] = [];
	readonly #writeOptions: any;
	readonly #currentLog: string;
	readonly #writer: () => void;
	#closing: boolean = false;
	#nextIteration: any = null;

	constructor(baseFilePath, options: any = {
		cleanStart: true,
		encoding: 'utf-8'
	}) {
		if (!baseFilePath || typeof baseFilePath !== 'string') {
			throw new Error(`base file path MUST be a non-empty string; got '${baseFilePath}'`);
		}

		this.#writeOptions = options;

		const { groups: { path } } = baseFilePath.match(/(?<path>.+)\/[^/]+/);
		if (path) {
			fs.mkdirSync(path, { recursive: true });
		}
		this.#currentLog = baseFilePath;
		if (options.cleanStart && fs.existsSync(this.#currentLog)) {
			fs.truncateSync(this.#currentLog);
		}

		this.#writer = this.#writerImpl.bind(this);
		this.#writer();
	}

	debug(arg) {
		if (this.#closing) {
			return;
		}
		this.#buffer.push(arg);
	}

	info(arg) {
		if (this.#closing) {
			return;
		}
		this.#buffer.push(arg);
	}

	warn(arg) {
		if (this.#closing) {
			return;
		}
		this.#buffer.push(arg);
	}

	error(arg) {
		if (this.#closing) {
			return;
		}
		this.#buffer.push(arg);
	}

	async close(timeout = 96) {
		this.#closing = true;

		await Promise.race([
			new Promise<void>(r => setTimeout(r, timeout)),
			new Promise<void>(r => {
				const probe = () => {
					if (!this.#nextIteration) {
						r();
					} else {
						setTimeout(probe, 24);
					}
				};
				probe();
			})
		]);

		if (this.#nextIteration) {
			clearTimeout(this.#nextIteration);
			this.#nextIteration = null;
		}
	}

	#writerImpl() {
		if (this.#buffer.length) {
			const lines = this.#buffer.splice(0);
			fs.appendFileSync(
				this.#currentLog,
				(lines.join(os.EOL) + os.EOL).replace(FILE_OUTPUT_TEXT_CLEANER, ''),
				this.#writeOptions
			);
		}
		if (!this.#closing) {
			this.#nextIteration = setTimeout(this.#writer, 48);
		}
	}
}
