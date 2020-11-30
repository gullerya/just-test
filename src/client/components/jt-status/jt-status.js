import { initComponent, ComponentBase } from '/libs/rich-component/dist/rich-component.min.js';

const TEMPLATE = document.createElement('template');

initComponent('jt-status', class extends ComponentBase {
	set value(value) {
		this.setAttribute('type', value);
	}

	get defaultTieTarget() {
		return 'value';
	}

	static get template() {
		return TEMPLATE;
	}
});

TEMPLATE.innerHTML = `
	<style>
		:host {
			font-family: monospace;
			font-size: 1.125em;
			color: #ccc;
		}

		:host([type="skip"])::before {
			content: "\\2013";
		}

		:host([type="wait"])::before {
			content: "\\22ef";
		}

		:host([type="runs"])::before {
			display: inline-block;
			color: #88f;
			content: "\\22ef";
			transform: rotate(18000deg);
			transition: transform 100s linear;
		}

		:host([type="pass"])::before {
			color: #6f4;
			content: "\\2713";
		}

		:host([type="fail"])::before {
			color: #f00;
			content: "\\2718";
		}
	</style>
`;