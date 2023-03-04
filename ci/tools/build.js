import os from 'node:os';
import { promises as fs } from 'node:fs';

try {
	writeGreen('Starting build...');

	write('\tcleaning "bin"...');
	await fs.rm('./bin', { recursive: true, force: true });
	await fs.mkdir('./bin', { recursive: true });

	write('\tcopying "src" to "bin"...');
	await fs.cp('./src', './bin', { recursive: true });

	writeGreen(`Done${os.EOL}`);
} catch (e) {
	write(`Failed with error: ${e}`);
}

// helpers
function write(text, newLine = true) {
	process.stdout.write(`${text}${newLine ? os.EOL : ''}`);
}
function writeGreen(text, newLine = true) {
	write(`\x1B[32m${text}\x1B[0m`, newLine);
}
