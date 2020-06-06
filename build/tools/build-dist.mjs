import os from 'os';
import fs from 'fs';
import fsExtra from 'fs-extra';
import uglifyES from 'uglify-es';

process.stdout.write('cleaning "dist"...');
fsExtra.emptyDirSync('./dist');
process.stdout.write('\t\t\t\t\x1B[32mOK\x1B[0m' + os.EOL);

process.stdout.write('deleting "src/libs"...');
fsExtra.removeSync('./src/libs');
process.stdout.write('\t\t\t\t\x1B[32mOK\x1B[0m' + os.EOL);

process.stdout.write('creating "src/libs"...');
fsExtra.mkdirSync('./src/libs');
process.stdout.write('\t\t\t\t\x1B[32mOK\x1B[0m' + os.EOL);

process.stdout.write('installing "data-tier" into libs...');
fsExtra.copySync('./node_modules/data-tier/dist', './src/libs/data-tier');
process.stdout.write('\t\t\x1B[32mOK\x1B[0m' + os.EOL);

process.stdout.write('installing "data-tier-list" into libs...');
fsExtra.copySync('./node_modules/data-tier-list/dist', './src/libs/data-tier-list');
process.stdout.write('\t\x1B[32mOK\x1B[0m' + os.EOL);

process.stdout.write('installing "rich-component" into libs...');
fsExtra.copySync('./node_modules/rich-component/dist', './src/libs/rich-component');
process.stdout.write('\t\x1B[32mOK\x1B[0m' + os.EOL);

process.stdout.write('copying "src" to "dist"...');
fsExtra.copySync('./src', './dist');
process.stdout.write('\t\t\t\x1B[32mOK\x1B[0m' + os.EOL);

process.stdout.write('minifying...');
const jtSrc = fs.readFileSync('./dist/just-test.js', { encoding: 'utf8' });
//	TODO: replace refs to minified refs
fs.writeFileSync('./dist/just-test.min.js', uglifyES.minify(jtSrc).code);
process.stdout.write('\t\t\t\t\t\x1B[32mOK\x1B[0m' + os.EOL);