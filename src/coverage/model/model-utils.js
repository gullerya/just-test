import FileCov from './file-cov.js';
import LineCov from './line-cov.js';
import RangeCov from './range-cov.js';

export {
	buildJTFileCov
}

async function buildJTFileCov(sourceUrl, sourceFetcher = defaultSourceFetcher) {
	if (!sourceUrl || typeof sourceUrl !== 'string') {
		throw new Error(`soure URL MUST be a non-empty string, got: '${sourceUrl}'`);
	}
	if (typeof sourceFetcher !== 'function') {
		throw new Error(`source fetcher MUST be a function, got: '${sourceFetcher}'`);
	}

	const result = new FileCov(sourceUrl);

	//	get the source text
	const text = await sourceFetcher(sourceUrl);
	result.addRangeCov(new RangeCov(0, text.length, 0));

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
			loc = false;		//	comment starting with `//`
		}
		if (lineText.match(/\/\*\*/)) {
			comment = true;
		}
		if (lineText.match(/\*\//)) {
			comment = false;
			loc = false;
		}
		if (loc && !comment) {
			result.addLineCov(new LineCov(linePos, indexPos, eolPos.index));
		}
		indexPos = eolPos.index + eolPos[0].length;
		linePos++;
	}

	//	last line
	if (text.length > indexPos) {
		result.addL
		result.addLineCov(new LineCov(linePos, indexPos, text.length));
	}

	return result;
}

let nodeJSFS = null;
async function defaultSourceFetcher(sourceUrl) {
	if (!nodeJSFS) {
		nodeJSFS = (await import('node:fs')).promises;
	}
	return nodeJSFS.readFile(sourceUrl, { encoding: 'utf-8' });
}