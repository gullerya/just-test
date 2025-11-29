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
		const stacklines = data.stack.split('\n|\r\n');
		for (const line of stacklines) {
			const text = line;
			const lib =
				text.indexOf('node_modules') >= 0 ||
				text.indexOf('/core/') >= 0 ||
				text.indexOf('/libs/') >= 0 ||
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