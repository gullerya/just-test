import crypto from 'crypto';

export {
	extensionsMap,
	findMimeType,
	getRandom
}

const extensionsMap = Object.freeze({
	html: 'text/html',
	js: 'text/javascript',
	css: 'text/css',
	json: 'application/json',
	xml: 'application/xml',
	txt: 'text/plain'
});

function findMimeType(filePath, fallback) {
	let result = null;
	const extension = extractExtension(filePath);
	result = extensionsMap[extension];
	if (!result && fallback) {
		result = fallback;
	}
	return result ?? null;
}

function extractExtension(filePath) {
	const i = filePath.lastIndexOf('.');
	if (i > 0) {
		return filePath.substring(i + 1);
	} else {
		return '';
	}
}

const CHARS_SOURCE = 'abcdefghijklmnopqrstuvwxyz0123456789'
function getRandom(outputLength) {
	if (!outputLength || typeof outputLength !== 'number' || outputLength < 8 || outputLength > 32) {
		throw new Error(`invalid output length parameter ${outputLength}`);
	}
	let result = '';
	const sLen = CHARS_SOURCE.length;
	const random = new Uint8Array(outputLength);
	crypto.randomFillSync(random);
	for (let i = 0; i < outputLength; i++) {
		result += CHARS_SOURCE.charAt(sLen * random[i] / 256);
	}
	return result;
}