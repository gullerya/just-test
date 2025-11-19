export {
	extensionsMap,
	findMimeType
};

const extensionsMap = Object.freeze({
	html: 'text/html',
	htm: 'text/html',
	js: 'text/javascript',
	mjs: 'text/javascript',
	css: 'text/css',
	json: 'application/json',
	xml: 'application/xml',
	txt: 'text/plain'
});

function findMimeType(filePath: string, fallback: string = extensionsMap.txt): string {
	let result: string;
	const extension = extractExtension(filePath);
	result = extensionsMap[extension];
	if (!result && fallback) {
		result = fallback;
	}
	return result || extensionsMap.txt;
}

function extractExtension(filePath: string): string {
	let result: string = '';
	const i = filePath.lastIndexOf('.');
	if (i > 0) {
		result = filePath.substring(i + 1);
	}
	if (!(result in extensionsMap)) {
		result = '';
	}
	return result;
}