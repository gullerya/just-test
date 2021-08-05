export {
	extensionsMap,
	findMimeType
}

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

function findMimeType(filePath, fallback) {
	let result = null;
	const extension = extractExtension(filePath);
	result = extensionsMap[extension];
	if (!result && fallback) {
		result = fallback;
	}
	return result || null;
}

function extractExtension(filePath) {
	const i = filePath.lastIndexOf('.');
	if (i > 0) {
		return filePath.substring(i + 1);
	} else {
		return '';
	}
}