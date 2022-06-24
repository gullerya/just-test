import fs from 'node:fs';
import os from 'node:os';

//	eslint-disable-next-line no-control-regex
const FILE_OUTPUT_TEXT_CLEANER = /\u001B\[\d+m/g;

export default class FileOutput {
	constructor(baseFilePath, options = {
		cleanStart: true,
		encoding: 'utf-8'
	}) {
		if (!baseFilePath || typeof baseFilePath !== 'string') {
			throw new Error(`base file path MUST be a non-empty string; got '${baseFilePath}'`);
		}

		this.buffer = [];
		this.writeOptions = options;

		const { groups: { path } } = baseFilePath.match(/(?<path>.+)\/[^/]+/);
		if (path) {
			fs.mkdirSync(path, { recursive: true });
		}
		this.currentLog = baseFilePath;
		if (options.cleanStart && fs.existsSync(this.currentLog)) {
			fs.truncateSync(this.currentLog);
		}

		this._writer = this._writer.bind(this);
		this._writer();
	}

	debug(arg) {
		if (this._closing) return;
		this.buffer.push(arg);
	}

	info(arg) {
		if (this._closing) return;
		this.buffer.push(arg);
	}

	warn(arg) {
		if (this._closing) return;
		this.buffer.push(arg);
	}

	error(arg) {
		if (this._closing) return;
		this.buffer.push(arg);
	}

	async close(timeout = 96) {
		this._closing = true;

		await Promise.race([
			new Promise(r => setTimeout(r, timeout)),
			new Promise(r => {
				const probe = () => {
					if (!this._nextIteration) {
						r();
					} else {
						setTimeout(probe, 24);
					}
				}
				probe();
			})
		]);

		if (this._nextIteration) {
			clearTimeout(this._nextIteration);
			this._nextIteration = null;
		}
	}

	_writer() {
		if (this.buffer.length) {
			const lines = this.buffer.splice(0);
			fs.appendFileSync(
				this.currentLog,
				(lines.join(os.EOL) + os.EOL).replace(FILE_OUTPUT_TEXT_CLEANER, ''),
				this.writeOptions
			);
			this.buffer.splice(0);
		}
		if (!this._closing) {
			this._nextIteration = setTimeout(this._writer, 48);
		}
	}

	_errorHandler(e) {
		if (e) {
			process.emitWarning(`failed to output to 'FileOutput'`);
			process.emitWarning(e);
		}
	}
}