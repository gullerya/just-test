import fs from 'fs';
import FileCov from '../../../common/models/coverage/file-cov.js';
import LineCov from '../../../common/models/coverage/line-cov.js';
import RangeCov from '../../../common/models/coverage/range-cov.js';

export default convert;

function convert(scriptCoverage) {
	if (!scriptCoverage ||
		!Array.isArray(scriptCoverage.functions) ||
		!scriptCoverage.url || typeof scriptCoverage.url !== 'string') {
		throw new Error(`invalid script coverage ${scriptCoverage}`);
	}

	const result = new FileCov(scriptCoverage.url);

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
	let comment = false,
		indexPos = 0,
		linePos = 1;
	//	all lines but last
	for (const eolPos of eolPoses) {
		const lineText = text.substring(indexPos, eolPos.index);
		let loc = true;
		if (eolPos.index === indexPos) {
			loc = false;		//	empty line
		}
		if (lineText.match(/\s*\/\//)) {
			loc = false;		//	comment staring with `//`
		}
		if (lineText.match(/\/\*\*/)) {
			comment = true;
		}
		if (lineText.match(/\*\//)) {
			comment = false;
			loc = false;
		}
		if (loc && !comment) {
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