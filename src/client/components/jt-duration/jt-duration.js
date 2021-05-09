import { initComponent, ComponentBase } from 'rich-component';

const TEMPLATE = document.createElement('template');
TEMPLATE.innerHTML = ``;

initComponent('jt-duration', class extends ComponentBase {
	set value(duration) {
		let ds = '';
		if (typeof duration === 'number') {
			if (duration > 99) ds = (duration / 1000).toFixed(1) + ' s' + String.fromCharCode(160);
			else if (duration > 59900) ds = (duration / 60000).toFixed(1) + ' m' + String.fromCharCode(160);
			else ds = duration.toFixed(1) + ' ms';
		}
		this.shadowRoot.textContent = ds;
	}

	static get template() {
		return TEMPLATE;
	}
});