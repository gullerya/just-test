import NodeImpl from './node.js';

/**
* Surrogate and partial implementation of [Element]{@link https://developer.mozilla.org/en-US/docs/Web/API/Element}
*/
export default class ElementImpl extends NodeImpl {
	constructor(nodeName, ownerDocument) {
		super(nodeName, NodeImpl.ELEMENT_NODE, ownerDocument);
		this._attributes = {};
	}

	setAttribute(attrName, attrValue) {
		if (!attrName || typeof attrName !== 'string') {
			throw new TypeError(`'attrName' MUST be a non-empty string; got '${attrName}'`);
		}
		if (attrValue === undefined) {
			throw new TypeError(`'attrValue' MUST be provided`);
		}
		this._attributes[attrName] = attrValue === null ? 'null' : attrValue.toString();
	}

	getAttribute(attrName) {
		if (!attrName || typeof attrName !== 'string') {
			throw new TypeError(`'attrName' MUST be a non-empty string; got '${attrName}'`);
		}
		return this._attributes[attrName];
	}

	hasAttributes() {
		return Object.keys(this._attributes).length > 0;
	}

	hasAttribute(attrName) {
		if (!attrName || typeof attrName !== 'string') {
			throw new TypeError(`'attrName' MUST be a non-empty string; got '${attrName}'`);
		}
		return attrName in this._attributes;
	}

	get attributes() {
		return Object.entries(this._attributes).map(([k, v]) => { return { name: k, value: v }; });
	}
}