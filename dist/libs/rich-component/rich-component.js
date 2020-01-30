const
	TEMPLATE_PROPERTY = 'template',
	HTML_URL_PROPERTY = 'htmlUrl',
	LIGHT_DOM_KEY = Symbol('attach.light.dom'),
	componentHTMLs = {};

class ComponentBase extends HTMLElement {
	constructor() {
		super();
		const template = this.getTemplate();
		if (template) {
			if (this.constructor.domType === 'light') {
				this[LIGHT_DOM_KEY] = template;
			} else {
				this.attachShadow({ mode: 'open' }).appendChild(template);
			}
		} else {
			console.error(`failed to get template for ${this.localName}`);
		}
	}

	connectedCallback() {
		if (LIGHT_DOM_KEY in this) {
			this.appendChild(this[LIGHT_DOM_KEY]);
			delete this[LIGHT_DOM_KEY];
		}
	}

	getTemplate() {
		let result = null;
		const cachedTemplate = componentHTMLs[this.localName];
		if (typeof cachedTemplate === 'function') {
			const dynamicTemplate = cachedTemplate.call(this, this);
			if (dynamicTemplate && dynamicTemplate.nodeName === 'TEMPLATE') {
				result = dynamicTemplate.content.cloneNode(true);
			}
		} else {
			result = cachedTemplate.content.cloneNode(true);
		}
		return result;
	}
}

export {
	ComponentBase,
	initComponent,
	fetchTemplate
};

async function initComponent(tag, type) {
	validataTag(tag);
	validateType(tag, type);

	//	fetch and cache template if URL based
	let template;
	if (TEMPLATE_PROPERTY in type) {
		template = type[TEMPLATE_PROPERTY];
		if ((!template || template.nodeName !== 'TEMPLATE') && typeof template !== 'function') {
			throw new Error(`'${tag}' provided invalid template: ${template}`);
		}
	} else {
		const templateUrl = type[HTML_URL_PROPERTY];
		if (!templateUrl || typeof templateUrl !== 'string') {
			throw new Error(`'${tag}' provided invalid HTML URL: ${templateUrl}`);
		}

		const templateRaw = await fetchTemplate(templateUrl);
		if (!templateRaw) {
			throw new Error(`failed to init template of '${tag}' from '${templateUrl}'`)
		}

		template = document.createElement('template');
		template.innerHTML = templateRaw;
	}

	componentHTMLs[tag] = template;
	customElements.define(tag, type);
}

async function fetchTemplate(templateUrl) {
	if (!templateUrl || typeof templateUrl !== 'string') {
		throw new Error(`invalid HTML template URL: ${templateUrl}`);
	}

	let result = null;
	const htmlResponse = await fetch(templateUrl);
	if (htmlResponse.ok) {
		const htmlText = await htmlResponse.text();
		if (htmlText) {
			result = htmlText;
		} else {
			console.error(`failed to fetch HTML template from '${templateUrl}', no content`);
		}
	} else {
		console.error(`failed to fetch HTML template from '${templateUrl}', status ${htmlResponse.status}`);
	}
	return result;
}

function validataTag(tag) {
	if (!tag || typeof tag !== 'string' || !/^[a-z0-9]+(-[a-z0-9]+)*-[a-z0-9]+$/.test(tag)) {
		throw new Error(`invalid element's tag/name: ${tag}`);
	}
	if (customElements.get(tag)) {
		throw new Error(`'${tag}' element already defined`);
	}
}

function validateType(tag, Type) {
	if (!Type || !(Type.prototype instanceof ComponentBase)) {
		throw new Error(`invalid class for '${tag}'; MUST NOT be null and MUST be an instance of ComponentBase`);
	}
	if ((!(TEMPLATE_PROPERTY in Type) && !(HTML_URL_PROPERTY in Type)) ||
		(TEMPLATE_PROPERTY in Type && HTML_URL_PROPERTY in Type)) {
		throw new Error(`'${tag}' MUST implement either static getter of '${HTML_URL_PROPERTY}' property returning component's HTML path, or static getter of '${TEMPLATE_PROPERTY}' property returning a template`);
	}
}