import FileCov from './file-cov.js';
import LineCov from './line-cov.js';
import RangeCov from './range-cov.js';

export {
	buildJTFileCov
}

const EMPTY_TEXT_REGEX = /^\s*$/;
const ONE_LINE_REMARK_REGEX = /^\s*\/\//;
const MUL_LINE_REMARK_OPEN_REGEX = /(?<prec>.*)\/\*/;
const MUL_LINE_REMARK_CLOSE_REGEX = /\*\/(?<post>.*)/;

async function buildJTFileCov(sourceUrl, everImported, sourceFetcher = defaultSourceFetcher) {
	if (!sourceUrl || typeof sourceUrl !== 'string') {
		throw new Error(`source URL MUST be a non-empty string, got: '${sourceUrl}'`);
	}
	if (typeof everImported !== 'boolean') {
		throw new Error(`even imported MUST be a boolean, got: '${everImported}'`);
	}
	if (typeof sourceFetcher !== 'function') {
		throw new Error(`source fetcher MUST be a function, got: '${sourceFetcher}'`);
	}

	sourceUrl = sourceUrl.split('?')[0].trim();
	const result = new FileCov(sourceUrl);

	//	get the source text
	const text = await sourceFetcher(sourceUrl);
	if (!text || EMPTY_TEXT_REGEX.test(text)) {
		return result;
	}

	result.addRangeCov(new RangeCov(0, text.length, everImported ? 1 : 0));

	//	get lines from source
	//	brackets ensure we keep the line separators as a line to correctly count line/char positions
	const lines = text.split(/(\r\n|\n)/);

	let comment = false;
	let stillTakeThisLine = false;
	let indexPos = 0;
	let linePos = 0;
	for (let i = 0, l = lines.length; i < l; i++) {
		const line = lines[i];
		linePos++;
		indexPos += line.length;
		if (!line || EMPTY_TEXT_REGEX.test(line)) {
			if (line === '\n' || line === '\r\n') {
				linePos--;
			}
			continue;
		}
		if (ONE_LINE_REMARK_REGEX.test(line)) {
			continue;
		}

		const matchOpenRemark = line.match(MUL_LINE_REMARK_OPEN_REGEX);
		if (matchOpenRemark) {
			comment = true;
			if (!EMPTY_TEXT_REGEX.test(matchOpenRemark.groups.prec)) {
				stillTakeThisLine = true;
			}
		}

		const matchCloseRemark = line.match(MUL_LINE_REMARK_CLOSE_REGEX);
		if (matchCloseRemark) {
			comment = false;
			if (EMPTY_TEXT_REGEX.test(matchCloseRemark.groups.post) && !stillTakeThisLine) {
				continue;
			}
		}

		if (!comment || stillTakeThisLine) {
			result.addLineCov(new LineCov(linePos, indexPos - line.length, indexPos));
		}
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