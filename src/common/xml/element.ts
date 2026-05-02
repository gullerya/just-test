import NodeImpl from './node.ts';

/**
* Surrogate and partial implementation of [Element]{@link https://developer.mozilla.org/en-US/docs/Web/API/Element}
*/
export default class ElementImpl extends NodeImpl {
	#attributes: Record<string, string>;

	constructor(nodeName, ownerDocument = null) {
		super(nodeName, NodeImpl.ELEMENT_NODE, ownerDocument);
		this.#attributes = {};
	}

	setAttribute(attrName, attrValue) {
		if (!attrName || typeof attrName !== 'string') {
			throw new TypeError(`'attrName' MUST be a non-empty string; got '${attrName}'`);
		}
		if (attrValue === undefined) {
			throw new TypeError(`'attrValue' MUST be provided; got '${attrValue}' (attrName is '${attrName}')`);
		}
		this.#attributes[attrName] = attrValue === null ? 'null' : attrValue.toString();
	}

	getAttribute(attrName) {
		if (!attrName || typeof attrName !== 'string') {
			throw new TypeError(`'attrName' MUST be a non-empty string; got '${attrName}'`);
		}
		return this.#attributes[attrName];
	}

	hasAttributes() {
		return Object.keys(this.#attributes).length > 0;
	}

	hasAttribute(attrName) {
		if (!attrName || typeof attrName !== 'string') {
			throw new TypeError(`'attrName' MUST be a non-empty string; got '${attrName}'`);
		}
		return attrName in this.#attributes;
	}

	get attributes() {
		return Object.entries(this.#attributes).map(([k, v]) => { return { name: k, value: v }; });
	}
}