import os from 'node:os';
import { promises as fs } from 'node:fs';
import path from 'node:path';

process.stdout.write('cleaning "bin"...');
await fs.rm('./bin', { recursive: true, force: true });
await fs.mkdir('./bin', { recursive: true });
process.stdout.write('\t\t\t\t\x1B[32mOK\x1B[0m' + os.EOL);

process.stdout.write('copying "src" to "bin"...');
await copyDir('./src', './bin');
process.stdout.write('\t\t\t\x1B[32mOK\x1B[0m' + os.EOL);

process.stdout.write('\x1B[32mBUILD DONE\x1B[0m' + os.EOL + os.EOL);

async function copyDir(src, dst) {
	const entries = await fs.readdir(src);
	for (const entry of entries) {
		const srcPath = path.join(src, entry);
		const dstPath = path.join(dst, entry);
		if ((await fs.lstat(srcPath)).isDirectory()) {
			await fs.mkdir(dstPath);
			await copyDir(srcPath, dstPath);
		} else {
			await fs.copyFile(srcPath, dstPath);
		}
	}
}