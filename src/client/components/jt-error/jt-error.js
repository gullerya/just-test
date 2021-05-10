import { initComponent, ComponentBase } from 'rich-component';

initComponent('jt-error', class extends ComponentBase {
	set data(data) {
		if (!data || !Object.keys(data).length) {
			this.classList.add('hidden');
			return;
		}
		this.classList.remove('hidden');
		this.shadowRoot.querySelector('.title').textContent = `${data.type} - ${data.message}`;

		let df = document.createDocumentFragment();
		for (const line of data.stackLines) {
			const text = line.replace(/^\s*at\s*/, '');
			const lib =
				text.indexOf('node_modules') >= 0 ||
				text.indexOf('/ui/env-browser') >= 0 ||
				text.indexOf('new Promise') >= 0 ||
				text.indexOf('<anonymous>') >= 0;
			const tmp = document.createElement('div');
			tmp.className = `stack-line ${lib ? 'lib' : ''}`;
			tmp.appendChild(document.createTextNode(text));
			df.appendChild(tmp);
		}
		this.shadowRoot.querySelector('.stack').innerHTML = '';
		this.shadowRoot.querySelector('.stack').appendChild(df);
	}

	static get htmlUrl() {
		return import.meta.url.replace(/js$/, 'htm');
	}
});