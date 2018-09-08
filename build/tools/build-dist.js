'use strict';

const
	os = require('os'),
	fs = require('fs'),
	fsExtra = require('fs-extra'),
	uglifyES = require('uglify-es');

process.stdout.write('cleaning "dist"...');
fsExtra.emptyDirSync('../dist');
process.stdout.write('\t\t\t\x1B[32mOK\x1B[0m' + os.EOL);

process.stdout.write('copying "src" to "dist"...');
fsExtra.copySync('../src', '../dist');
process.stdout.write('\t\x1B[32mOK\x1B[0m' + os.EOL);

process.stdout.write('minifying...');
uglifyES.minify({'../dist/just-test.min.js': fs.readFileSync('../dist/just-test.js', {encoding: 'utf8'})});
fs.writeFileSync(
	'../dist/just-test.min.js',
	uglifyES.minify(fs.readFileSync('../dist/just-test.js', {encoding: 'utf8'})).code
);
process.stdout.write('\t\t\t\t\x1B[32mOK\x1B[0m' + os.EOL);