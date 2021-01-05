/**
 * Surrogate and partial implementaion of [XMLSerializer]{@link https://developer.mozilla.org/en-US/docs/Web/API/XMLSerializer}
 */
export default class XMLSerializerImpl {
	/**
	 * See {@link https://developer.mozilla.org/en-US/docs/Web/API/XMLSerializer/serializeToString}
	 */
	serializeToString(rootNode) {
		if (!rootNode) {
			throw new TypeError(`'rootNode' MUST be either Node or Attr; got '${rootNode}'`);
		}

		let tmpNode = rootNode.documentElement ? rootNode.documentElement : rootNode;

		let textContent = '';
		for (const child of tmpNode.childNodes) {
			textContent += (this.serializeToString(child));
		}

		return this._serializeNode(tmpNode.nodeName, tmpNode.attributes, textContent);
	}

	_serializeNode(nodeName, attributes, textContent) {
		return `<${nodeName}${this._serializeAttributes(attributes)}${textContent ? ` ${textContent}</${nodeName}>` : '/>'}`
	}

	_serializeAttributes(attributes) {
		let result = '';
		if (attributes.length) {
			result = ` ${attributes.map(a => `${a.name}="${a.value}"`).join(' ')}`;
		}
		return result;
	}
}