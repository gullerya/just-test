import { initComponent, ComponentBase } from 'rich-component';
import stateService from '../../interactive-state-service.js';
import * as serverAPI from '/core/runner/server-api-service.js';

const TEMPLATE = document.createElement('template');
TEMPLATE.innerHTML = `
	<style>
		:host {
			padding: 0 8px;
			display: flex;
			align-items: center;
			justify-content: space-between;
			overflow: hidden;
		}

		h5 {
			font: var(--jt-font-h5);
		}
	</style>

	<h5 class="name">JustTest</h5>
	<span class="sessionId" data-tie="justTestModel:sessionId"></span>
	<span class="runtime">
		<span class="done" data-tie="justTestModel:done"></span>
		&#47;
		<span class="total" data-tie="justTestModel:total"></span>
	</span>
	<span class="counter pass" data-tie="justTestModel:passed"></span>
	<span class="counter fail" data-tie="justTestModel:failed"></span>
	<span class="counter skip" data-tie="justTestModel:skipped"></span>
	<button class="close">Report & Exit</button>
`;

initComponent('jt-header', class extends ComponentBase {
	connectedCallback() {
		this.shadowRoot.querySelector('.close').addEventListener('click', async () => {
			console.log('finalize session');
			const state = stateService.getAll();
			await serverAPI.reportSessionResult(state.sessionId, state.environmentId, location.origin, state);
			setTimeout(() => window.location.reload(), 4000);
		});
	}

	static get template() {
		return TEMPLATE;
	}
});
