import NodeImpl from './node.js';
import ElementImpl from './element.js';

/**
* Surrogate and partial implementation of [Document]{@link https://developer.mozilla.org/en-US/docs/Web/API/Document}
*/
export default class DocumentImpl extends NodeImpl {
	constructor(namespaceURI, qualifiedNameStr = null, documentType = null) {
		super('#document', NodeImpl.DOCUMENT_NODE, null)
		this._namespaceURI = namespaceURI;

		Object.defineProperty(this, 'doctype', { value: documentType });
		Object.defineProperty(this, 'documentElement', {
			value: qualifiedNameStr
				? new ElementImpl(qualifiedNameStr, NodeImpl.ELEMENT_NODE, this)
				: null
		});
	}

	createElement(tagName) {
		return new ElementImpl(tagName);
	}
}