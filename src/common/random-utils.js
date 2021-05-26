const
	CHAR_SOURCES = Object.freeze({ numeric: '0123456789', alphaLower: 'abcdefghijklmnopqrstuvwxyz', alphaUpper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ' }),
	DEFAULT_CHAR_SOURCE = CHAR_SOURCES.alphaLower + CHAR_SOURCES.alphaUpper + CHAR_SOURCES.numeric,
	DEFAULT_RANDOM_LENGTH = 8;

let cryptoEngine;
new Promise(r => {
	if (globalThis.crypto) {
		cryptoEngine = globalThis.crypto.getRandomValues.bind(globalThis.crypto);
		r();
	} else {
		import('crypto')
			.then(c => cryptoEngine = c.randomFillSync)
			.finally(r);
	}
});

export {
	CHAR_SOURCES,
	getRandom
}

function getRandom(len = DEFAULT_RANDOM_LENGTH, charSource = DEFAULT_CHAR_SOURCE) {
	if (!len || typeof len !== 'number' || isNaN(len) || len > 128 || len < 1) {
		throw new Error(`length parameter, when provided, MUST be a number in 1-128 range; got '${len}'`);
	}
	if (!charSource || typeof charSource !== 'string') {
		throw new Error(`'charSource' MUST be a non-empty string, got '${JSON.stringify(charSource)}'`);
	}
	if (!cryptoEngine) {
		throw new Error('crypto module is not initialized; please look for previous errors');
	}

	let result = '';
	const sourceLen = charSource.length;
	const random = cryptoEngine(new Uint8Array(len));
	for (let i = 0; i < len; i++) {
		result += charSource.charAt(sourceLen * random[i] / 256);
	}
	return result;
}