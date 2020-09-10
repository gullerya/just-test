import os from 'os';
import process from 'process';
import fsExtra from 'fs-extra';

process.stdout.write('cleaning "bin"...');
fsExtra.emptyDirSync('./bin');
process.stdout.write('\t\t\t\t\x1B[32mOK\x1B[0m' + os.EOL);

process.stdout.write('deleting "src/libs"...');
fsExtra.removeSync('./src/libs');
process.stdout.write('\t\t\t\t\x1B[32mOK\x1B[0m' + os.EOL);

process.stdout.write('creating "src/libs"...');
fsExtra.mkdirSync('./src/libs');
process.stdout.write('\t\t\t\t\x1B[32mOK\x1B[0m' + os.EOL);

process.stdout.write('installing "data-tier" into "src/libs"...');
//fsExtra.copySync('./node_modules/data-tier/dist', './src/libs/data-tier');
process.stdout.write('\t\x1B[32mOK\x1B[0m' + os.EOL);

process.stdout.write('installing "data-tier-list" into "src/libs"...');
//fsExtra.copySync('./node_modules/data-tier-list/dist', './src/libs/data-tier-list');
process.stdout.write('\t\x1B[32mOK\x1B[0m' + os.EOL);

process.stdout.write('installing "rich-component" into "src/libs"...');
//fsExtra.copySync('./node_modules/rich-component/dist', './src/libs/rich-component');
process.stdout.write('\t\x1B[32mOK\x1B[0m' + os.EOL);

process.stdout.write('copying "src" to "bin"...');
fsExtra.copySync('./src', './bin');
process.stdout.write('\t\t\t\x1B[32mOK\x1B[0m' + os.EOL);

process.stdout.write('\x1B[32mALL DONE\x1B[0m' + os.EOL);