import { initComponent, ComponentBase } from '/libs/rich-component/dist/rich-component.min.js';

const TEMPLATE = document.createElement('template');
TEMPLATE.innerHTML = `
	<style>
		:host {
			display: flex;
			align-items: center;
			overflow: hidden;
		}

		h4 {
			font: var(--jt-font-h4);
		}
	</style>

	<h4 class="name">JustTest</h4>
	<span class="sessionId" data-tie="justTestModel:sessionId"></span>
	<span class="runtime">
		<span class="done" data-tie="justTestModel:done"></span>
		&#47;
		<span class="total" data-tie="justTestModel:total"></span>
	</span>
	<span class="counter pass" data-tie="justTestModel:passed"></span>
	<span class="counter fail" data-tie="justTestModel:failed"></span>
	<span class="counter skip" data-tie="justTestModel:skipped"></span>
	<button class="close">Close</button>
`;

initComponent('jt-header', class extends ComponentBase {
	connectedCallback() {
		this.shadowRoot.querySelector('.close').addEventListener('click', () => {
			console.log('finalize session');
			window.location.reload();
		});
	}

	static get template() {
		return TEMPLATE;
	}
});
