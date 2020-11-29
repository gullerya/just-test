import { initComponent, ComponentBase } from '/libs/rich-component/dist/rich-component.min.js';

initComponent('jt-error', class extends ComponentBase {
	set data(data) {
		if (!data || !Object.keys(data).length) {
			return;
		}
		this.shadowRoot.querySelector('.title .type').textContent = data.type;
		this.shadowRoot.querySelector('.title .message').textContent = data.message;

		let stack = '';
		for (const line of data.stackLines) {
			stack += `<div>${line}</div>`;
		}
		this.shadowRoot.querySelector('.stack').innerHTML = stack;
	}

	get defaultTieTarget() {
		return 'data';
	}

	static get htmlUrl() {
		return import.meta.url.replace(/js$/, 'htm');
	}
});