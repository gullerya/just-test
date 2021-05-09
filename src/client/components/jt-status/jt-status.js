import { initComponent, ComponentBase } from 'rich-component';

const TEMPLATE = document.createElement('template');

initComponent('jt-status', class extends ComponentBase {
	set value(value) {
		this.setAttribute('type', value);
	}

	static get template() {
		return TEMPLATE;
	}
});

TEMPLATE.innerHTML = `
	<style>
		:host {
			font-size: 1.4em;
		}

		:host([type="skip"])::before {
			content: "\\2013";
			color: var(--jt-color-skip);
		}

		:host([type="wait"])::before {
			content: "\\22ef";
		}

		:host([type="runs"])::before {
			display: inline-block;
			content: "\\22ef";
			transform: rotate(18000deg);
			transition: transform 100s linear;
		}

		:host([type="pass"])::before {
			content: "\\2022";
			color: var(--jt-color-success);
		}

		:host([type="fail"])::before {
			content: "\\2022";
			color: var(--jt-color-error);
		}
	</style>
`;