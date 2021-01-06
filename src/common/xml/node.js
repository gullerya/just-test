/**
* Surrogate and partial implementation of [Node]{@link https://developer.mozilla.org/en-US/docs/Web/API/Node}
*/
export default class NodeImpl {
	constructor(nodeName, nodeType, ownerDocument = null) {
		if (!nodeName || typeof nodeName !== 'string') {
			throw new TypeError(`'nodeName' MUST be a valid tag name; got '${nodeName}'`);
		}
		if (typeof nodeType !== 'number' || nodeType < 1 || nodeType > 12) {
			throw new TypeError(`'nodeType' MUST be a number in a valid range; got '${nodeType}'`);
		}

		Object.defineProperty(this, 'ownerDocument', { value: ownerDocument });
		Object.defineProperty(this, 'nodeName', { value: nodeName });
		Object.defineProperty(this, 'nodeType', { value: nodeType });
		this._childNodes = [];
		this._textContent = '';
	}

	get childNodes() { return this._childNodes; }

	get firstChild() { return this._childNodes.length ? this.childNodes[0] : null; }

	get lastChild() { return this.childNodes.length ? this.childNodes[this._childNodes.length - 1] : null; }

	get textContent() { return this._textContent; }

	set textContent(newContent) {
		this._textContent = newContent;
		this._childNodes.splice(0);
	}

	appendChild(child) { this._childNodes.push(child); }
}

NodeImpl.ELEMENT_NODE = 1;
NodeImpl.ATTRIBUTE_NODE = 2;
NodeImpl.TEXT_NODE = 3;
NodeImpl.CDATA_SECTION_NODE = 4;
NodeImpl.ENTITY_REFERENCE_NODE = 5;
NodeImpl.ENTITY_NODE = 6;
NodeImpl.PROCESSING_INSTRUCTION_NODE = 7;
NodeImpl.COMMENT_NODE = 8;
NodeImpl.DOCUMENT_NODE = 9;
NodeImpl.DOCUMENT_TYPE_NODE = 10;
NodeImpl.DOCUMENT_FRAGMENT_NODE = 11;
NodeImpl.NOTATION_NODE = 12;