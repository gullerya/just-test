import fs from 'fs';
import FileCov from '../../../common/models/coverage/file-cov.js';
import LineCov from '../../../common/models/coverage/line-cov.js';
import RangeCov from '../../../common/models/coverage/range-cov.js';

export default convert;

function convert(scriptUrl, scriptCoverage) {
	if (!scriptUrl || typeof scriptUrl !== 'string') {
		throw new Error(`invalid script URL '${scriptUrl}'`);
	}
	if (!scriptCoverage || !Array.isArray(scriptCoverage.functions)) {
		throw new Error(`invalid script coverage ${scriptCoverage}`);
	}

	const result = new FileCov(scriptUrl);

	buildBaseSet(result);

	for (const fCov of scriptCoverage.functions) {
		//	add up to functions coverage
		//	TODO

		//	add up to ranges coverage
		for (const rCov of fCov.ranges) {
			const jtr = new RangeCov(rCov.startOffset, rCov.endOffset, rCov.count);
			result.addRangeCov(jtr);
		}
	}

	return result;
}

function buildBaseSet(fileCov) {
	//	get the source text
	const text = fs.readFileSync(fileCov.url, { encoding: 'utf-8' });
	fileCov.addRangeCov(new RangeCov(0, text.length, 1));

	//	setup lines from source
	const eolPoses = text.matchAll(/[\r\n]{1,2}/gm);
	let indexPos = 0,
		linePos = 1;
	//	all lines but last
	for (const eolPos of eolPoses) {
		const skip = false;
		if (eolPos.index === indexPos) {
			skip = true;	//	empty line
		}
		if (text.substring(eolPos + eolPos[0].length).match(/\s*\/\//)) {
			skip = true;	//	comment staring with `//`
		}
		if (!skip) {
			fileCov.lines.push(new LineCov(linePos, indexPos, eolPos.index));
		}
		indexPos = eolPos.index + eolPos[0].length;
		linePos++;
	}
	//	last line
	if (text.length > indexPos) {
		fileCov.lines.push(new LineCov(linePos, indexPos, text.length));
	}
}