import os from 'os';
import fs from 'fs';
import path from 'path';
import process from 'process';

process.stdout.write('cleaning "bin"...');
fs.rmdirSync('./bin', { recursive: true });
fs.mkdirSync('./bin', { recursive: true });
process.stdout.write('\t\t\t\t\x1B[32mOK\x1B[0m' + os.EOL);

process.stdout.write('copying "src" to "bin"...');
copyDirSync('./src', './bin');
process.stdout.write('\t\t\t\x1B[32mOK\x1B[0m' + os.EOL);

process.stdout.write('\x1B[32mBUILD DONE\x1B[0m' + os.EOL + os.EOL);

function copyDirSync(src, dst) {
	const entries = fs.readdirSync(src);
	for (const entry of entries) {
		const srcPath = path.join(src, entry);
		const dstPath = path.join(dst, entry);
		if (fs.lstatSync(srcPath).isDirectory()) {
			fs.mkdirSync(dstPath);
			copyDirSync(srcPath, dstPath);
		} else {
			fs.copyFileSync(srcPath, dstPath);
		}
	}
}