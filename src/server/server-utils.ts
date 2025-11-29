import Logger from '../server/logger/logger.js';

export {
	EXT_TO_MIME_MAP,
	findMimeType
};

const logger = new Logger({ context: 'server-utils' });
const EXT_TO_MIME_MAP = Object.freeze({
	html: 'text/html',
	htm: 'text/html',
	js: 'text/javascript',
	mjs: 'text/javascript',
	css: 'text/css',
	json: 'application/json',
	xml: 'application/xml',
	txt: 'text/plain'
});

function findMimeType(filePath: string, fallback: string = EXT_TO_MIME_MAP.txt): string {
	let result: string;
	const extension = extractExtension(filePath);
	result = EXT_TO_MIME_MAP[extension];
	if (!result && fallback) {
		result = fallback;
	}
	return result || EXT_TO_MIME_MAP.txt;
}

function extractExtension(filePath: string): string {
	let result: string = '';
	const i = filePath.lastIndexOf('.');
	if (i > 0) {
		result = filePath.substring(i + 1);
	} else {
		logger.warn(`extensionless path '${filePath}', falling back to the default mime type`);
		return '';
	}
	if (!(result in EXT_TO_MIME_MAP)) {
		throw new Error(`unexpected file extension '.${result}'`);
	}
	return result;
}