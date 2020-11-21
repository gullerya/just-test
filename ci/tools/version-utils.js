/**
 * acceptible params:
 * -v | --version followed by:
 * 		x.y.z - validate the new version and bump to 'x.y.z'
 * 		patch - extract the old version and auto bump to 'x.y.{z + 1}'
 * 		minor - extract the old version and auto bump to 'x.{y + 1}.0'
 * 		major - extract the old version and auto bump to '{x + 1}.0.0'
 * -s | --snapshot followed by:
 * 		x.y.z - validate the new version and bump to 'x.y.z-snapshot'
 * 		patch - extract the old version and auto bump to 'x.y.{z + 1}-snapshot'
 * 		minor - extract the old version and auto bump to 'x.{y + 1}.0-snapshot'
 * 		major - extract the old version and auto bump to '{x + 1}.0.0-snapshot'
 */

import fs from 'fs';

const args = translateCLArguments(process.argv);
console.log(`params: ${JSON.stringify(args)}`);
main(args);
console.log('done');

function main() {
	let snapshot;
	let paramValue;
	if ((paramValue = args['-v'] || args['--version'])) {
		snapshot = false;
	} else if ((paramValue = args['-s'] || args['--snapshot'])) {
		snapshot = true;
	} else {
		console.log('no relevant params found');
		return;
	}
	const [oldPlain, oldParsed] = getCurrentPackageVersion();
	let newPlain, newParsed;
	if (paramValue === 'major') {
		newParsed = [oldParsed[0] + 1, 0, 0];
	} else if (paramValue === 'minor') {
		newParsed = [oldParsed[0], oldParsed[1] + 1, 0];
	} else if (paramValue === 'patch') {
		newParsed = [oldParsed[0], oldParsed[1], oldParsed[2] + 1];
	} else {
		newParsed = parseAndValidate(paramValue);
		validateAgainstExisting(newParsed, snapshot, oldParsed, oldPlain.endsWith('snapshot'));
	}

	newPlain = newParsed.join('.') + (snapshot ? '-snapshot' : '');
	console.log(`updating from ${oldPlain} to ${newPlain}`);
	updatePackageVersion(newPlain, oldPlain);
}

function translateCLArguments(input) {
	const result = {};
	for (let i = 2, l = input.length; i < l; i++) {
		if (input[i] && input[i].startsWith('-')) {
			const effectiveKey = input[i];
			if (effectiveKey in result) {
				throw new Error(`duplicate param '${effectiveKey}'`);
			}
			result[effectiveKey] = input[++i];
		}
	}
	return result;
}

function parseAndValidate(targetVersion) {
	if (!targetVersion) {
		throw new Error(`target version unspecified`);
	}
	const parts = targetVersion.split('.');
	if (parts.length !== 3) {
		throw new Error(`expected tripartite sem-ver format, but got '${parts}'`);
	}
	const semVers = parts.map((p, i) => {
		const sv = parseInt(p, 10);
		if (isNaN(sv)) {
			throw new Error(`part number ${i} (zero based index) of the target version is NaN ('${p}')`);
		}
		return sv;
	});
	return semVers;
}

function getCurrentPackageVersion() {
	const packageJson = readPackageJson();
	const packageVersion = JSON.parse(packageJson).version;
	return [packageVersion, packageVersion.split('.').map(v => parseInt(v, 10))];
}

function validateAgainstExisting(newVer, newSnapshot, oldVer, oldSnapshot) {
	const compareMark = newVer.reduce((mark, nv, i) => {
		if (mark === 0) {
			mark = nv > oldVer[i] ? 1 : (nv < oldVer[i] ? -1 : 0);
		}
		return mark;
	}, 0);

	if (compareMark === 0 && !(oldSnapshot && !newSnapshot)) {
		throw new Error(`new version (${newVer}) and old version (${oldVer}) are equal`);
	} else if (compareMark < 0) {
		throw new Error(`new version (${newVer}) is lower than old version (${oldVer})`);
	}
}

function updatePackageVersion(newVer, oldVer) {
	const packageJson = readPackageJson();
	const updatedContent = packageJson.replace(oldVer, newVer);
	writePackageJson(updatedContent);
}

function readPackageJson() {
	return fs.readFileSync('package.json', { encoding: 'utf-8' });
}

function writePackageJson(content) {
	return fs.writeFileSync('package.json', content, { encoding: 'utf-8' });
}