import os from 'os';
import process from 'process';
import fsExtra from 'fs-extra';

process.stdout.write('cleaning "bin"...');
fsExtra.emptyDirSync('./bin');
process.stdout.write('\t\t\t\t\x1B[32mOK\x1B[0m' + os.EOL);

process.stdout.write('copying "src" to "bin"...');
fsExtra.copySync('./src', './bin');
process.stdout.write('\t\t\t\x1B[32mOK\x1B[0m' + os.EOL);

process.stdout.write('\x1B[32mALL DONE\x1B[0m' + os.EOL);