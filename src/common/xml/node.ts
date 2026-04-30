/**
* Surrogate and partial implementation of [Node]{@link https://developer.mozilla.org/en-US/docs/Web/API/Node}
*/
export default class NodeImpl {
	static ELEMENT_NODE = 1;
	static ATTRIBUTE_NODE = 2;
	static TEXT_NODE = 3;
	static CDATA_SECTION_NODE = 4;
	static ENTITY_REFERENCE_NODE = 5;
	static ENTITY_NODE = 6;
	static PROCESSING_INSTRUCTION_NODE = 7;
	static COMMENT_NODE = 8;
	static DOCUMENT_NODE = 9;
	static DOCUMENT_TYPE_NODE = 10;
	static DOCUMENT_FRAGMENT_NODE = 11;
	static NOTATION_NODE = 12;

	#childNodes: any[];
	#textContent: string;

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
		this.#childNodes = [];
		this.#textContent = '';
	}

	get childNodes() { return this.#childNodes; }

	get firstChild() { return this.#childNodes.length ? this.#childNodes[0] : null; }

	get lastChild() { return this.#childNodes.length ? this.#childNodes[this.#childNodes.length - 1] : null; }

	get textContent() { return this.#textContent; }

	set textContent(newContent) {
		this.#textContent = newContent;
		this.#childNodes.splice(0);
	}

	appendChild(child) { this.#childNodes.push(child); }
}
