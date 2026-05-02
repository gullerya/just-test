import NodeImpl from './node.ts';
import ElementImpl from './element.ts';

/**
* Surrogate and partial implementation of [Document]{@link https://developer.mozilla.org/en-US/docs/Web/API/Document}
*/
export default class DocumentImpl extends NodeImpl {
	#namespaceURI: string | null;

	constructor(namespaceURI, qualifiedNameStr = null, documentType = null) {
		super('#document', NodeImpl.DOCUMENT_NODE, null);
		this.#namespaceURI = namespaceURI;

		Object.defineProperty(this, 'doctype', { value: documentType });
		Object.defineProperty(this, 'documentElement', {
			value: qualifiedNameStr
				? new ElementImpl(qualifiedNameStr, this)
				: null
		});
	}

	createElement(tagName) {
		return new ElementImpl(tagName);
	}
}
