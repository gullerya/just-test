import fs from 'fs';
import os from 'os';

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
		if (options.cleanStart) {
			fs.truncateSync(this.currentLog);
		}
		this._writer();
	}

	debug(arg) {
		this.buffer.push(arg);
	}

	info(arg) {
		this.buffer.push(arg);
	}

	warn(arg) {
		this.buffer.push(arg);

	}

	error(arg) {
		this.buffer.push(arg);
	}

	_writer() {
		if (this.buffer.length) {
			const lines = this.buffer.splice(0);
			fs.appendFileSync(
				this.currentLog,
				(lines.join(os.EOL) + os.EOL).replace(/\u001B\[\d+m/g, ''),
				this.writeOptions
			);
			this.buffer.splice(0);
		}
		setTimeout(() => this._writer(), 50);
	}

	_errorHandler(e) {
		if (e) {
			process.emitWarning(`failed to output to 'FileOutput'`);
			process.emitWarning(e);
		}
	}
}