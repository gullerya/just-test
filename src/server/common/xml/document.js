import NodeImpl from './node.js';
import ElementImpl from './element.js';

/**
* Surrogate and partial implementation of [XMLDocument]{@link https://developer.mozilla.org/en-US/docs/Web/API/XMLDocument}
*/
export default class XMLDocumentImpl extends NodeImpl {
	constructor(namespaceURI, qualifiedNameStr, documentType = null) {
		super('#document', NodeImpl.DOCUMENT_NODE, null)

		if (namespaceURI === undefined) {
			throw new Error(`'namespaceURI' MUST be specified (MAY be null); got '${namespaceURI}'`);
		}
		if (!qualifiedNameStr || typeof qualifiedNameStr !== 'string') {
			throw new Error(`'qualifiedNameStr' MUST be a non-empty string; got '${qualifiedNameStr}'`);
		}

		this.qualifiedNameStr = qualifiedNameStr;
		this._documentElement = new ElementImpl(qualifiedNameStr, NodeImpl.ELEMENT_NODE, this);
	}

	/**
	 * Creates a new element with the given tag name
	 * See {@link https://developer.mozilla.org/en-US/docs/Web/API/Document/createElement}
	 */
	createElement(tagName) {
		return new ElementImpl(tagName);
	}

	get documentElement() {
		return this._documentElement;
	}
}