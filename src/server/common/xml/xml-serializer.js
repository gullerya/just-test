import NodeImpl from './node.js';

/**
 * Surrogate and partial implementaion of [XMLSerializer]{@link https://developer.mozilla.org/en-US/docs/Web/API/XMLSerializer}
 */
const VALID_NODE_TYPES = [
	NodeImpl.DOCUMENT_TYPE_NODE,
	NodeImpl.DOCUMENT_NODE,
	NodeImpl.DOCUMENT_FRAGMENT_NODE,
	NodeImpl.ELEMENT_NODE,
	NodeImpl.COMMENT_NODE,
	NodeImpl.TEXT_NODE,
	NodeImpl.PROCESSING_INSTRUCTION_NODE,
	NodeImpl.ATTRIBUTE_NODE
];

export default class XMLSerializerImpl {
	serializeToString(rootNode) {
		if (!rootNode || !VALID_NODE_TYPES.includes(rootNode.nodeType)) {
			throw new TypeError(`valid 'rootNode' MUST be provided; got '${rootNode}'`);
		}

		let tmpNode = rootNode.documentElement ? rootNode.documentElement : rootNode;

		let textContent = '';
		for (const child of tmpNode.childNodes) {
			textContent += (this.serializeToString(child));
		}

		return this._serializeNode(tmpNode.nodeName, tmpNode.attributes, textContent);
	}

	_serializeNode(nodeName, attributes, textContent) {
		return `<${nodeName}${this._serializeAttributes(attributes)}${textContent ? `>${textContent}</${nodeName}>` : '/>'}`;
	}

	_serializeAttributes(attributes) {
		let result = '';
		if (attributes.length) {
			result = ` ${attributes.map(a => `${a.name}="${a.value}"`).join(' ')}`;
		}
		return result;
	}
}