import DocumentImpl from './document.js';
import XMLSerializerImpl from './xml-serializer.js';

export {
	getDOMImplementation
}

/**
 * Surrogate and partial implementation of [DOMImplementation]{@link https://developer.mozilla.org/en-US/docs/Web/API/DOMImplementation}
 */
class DOMImplementationImpl {
	createDocument(namespaceURI, qualifiedNameStr, documentType) {
		return new DocumentImpl(namespaceURI, qualifiedNameStr, documentType);
	}

	createDocumentType() {
		throw new Error('not implemented');
	}

	createHTMLDocument() {
		throw new Error('not implemented');
	}

	hasFeature() {
		throw new Error('not implemented');
	}
}

const
	NATIVE_IMPLEMENTATION = Object.freeze({
		instance: globalThis.document?.implementation,
		XMLSerializer: globalThis.XMLSerializer
	}),
	SURROGATE_IMPLEMENTATION = Object.freeze({
		instance: new DOMImplementationImpl(),
		XMLSerializer: XMLSerializerImpl
	});

function getDOMImplementation(forceSurrogate = false) {
	if (forceSurrogate || !NATIVE_IMPLEMENTATION.instance) {
		return SURROGATE_IMPLEMENTATION;
	} else {
		return NATIVE_IMPLEMENTATION;
	}
}