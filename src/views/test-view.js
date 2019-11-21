import { STATUSES, runTest } from '../test.js';

const
	template = document.createElement('template'),
	TEST_KEY = Symbol('test.key');

template.innerHTML = `
	<style>
		:host {
			padding-left: 20px;
			font-size: 90%;
			overflow: hidden;
			display: flex;
			flex-direction: column;
			line-height: 1.2em;
		}

		:host(:hover) {
			background-color: #111;
		}

		.header {
			padding: 6px;
			display: flex;
			align-items: center;
		}

		.header > .name {
			flex: 1;
			color: #999;
			transition: color 120ms
		}

		.header:hover > .name {
			color: #ccc;
		}

		.header > .error-type {
			padding: 0 8px;
			font-family: monospace;
			border-radius: 4px;
			color: #f00;
		}

		.header > .error-type:hover {
			background-color: #ccc;
		}

		.re-run {
			width: 1.2em;
			height: 1.2em;
			margin: 0 8px;
			display: flex;
			align-items: center;
			justify-content: center;
			font-family: monospace;
			border-radius: 4px;
			color: #999;
			opacity: 0;
			transition: opacity 120ms, color 120ms;
		}

		.re-run:hover {
			color: #ccc;
		}

		.re-run:before {
			content: "\u25b6";
		}

		:host(:not(.skip):not(.runs)) > .header:hover > .re-run {
			opacity: 1;
		}

		.header > .status, .duration {
			font-family: Courier;
			text-align: right;
		}

		.header > .duration {
			flex-basis: 99px;
			overflow: hidden;
			white-space: nowrap;
			color: #999;
			transition: color 120ms;
		}

		.header:hover > .duration {
			color: #ccc;
		}

		.header > .status {
			width: 1.2em;
			height: 1.2em;
			margin-left: 16px;
			display: flex;
			align-items: center;
			justify-content: center;
			font-family: monospace;
		}

		:host(.wait) > .header > .status::before {
			color: #ccc;
			content: "\u22ef";
		}

		:host(.runs) > .header > .status::before {
			color: #88f;
			content: "\u22ef";
		}

		:host(.runs) > .header > .status {
			transform: rotate(18000deg);
			transition: transform 100s linear;
		}

		:host(.pass) > .header > .status::before {
			color: #6f4;
			content: "\u2713";
		}

		:host(.fail) > .header > .status::before {
			color: #f00;
			content: "\u2718";
		}

		:host(.skip) > .header > .status:before {
			color: #ccc;
			content: "\u22ef";
		}

		.error {
			height: auto;
			max-height: 0px;
			transition: max-height 100ms;
			overflow-x: hidden;
			overflow-y: auto;
			font-family: Courier;
			background-color: #111;
			cursor: text;
			user-select: text;
		}

		:host(.errorOpen) > .error {
			max-height: 240px;
		}

		.error-line {
			padding: 2px 0 2px 24px;
			font-family: Courier;
			overflow: hidden;
			white-space: nowrap;
		}
	</style>

	<div class="header">
		<span class="name"></span>
		<span class="error-type"></span>
		<span class="re-run"></span>
		<span class="duration"></span>
		<span class="status"></span>
	</div>
	<div class="error"></div>
`;

customElements.define('test-view', class extends HTMLElement {
	constructor() {
		super();
		this.attachShadow({ mode: 'open' })
			.appendChild(template.content.cloneNode(true));
		this.shadowRoot.querySelector('.header > .error-type').addEventListener('click', () => {
			this.classList.toggle('errorOpen');
		});
		this.shadowRoot.querySelector('.re-run').addEventListener('click', () => {
			if (this[TEST_KEY].status !== STATUSES.RUNNING) {
				runTest(this[TEST_KEY]);
			} else {
				console.log('running');
			}
		});
	}

	set test(test) {
		this[TEST_KEY] = test;
		this.shadowRoot.querySelector('.name').textContent = test.name;
		this.status = test.status;
	}

	set duration(duration) {
		let ds = '';
		if (typeof duration === 'number') {
			if (duration > 99) ds = (duration / 1000).toFixed(1) + ' s' + String.fromCharCode(160);
			else if (duration > 59900) ds = (duration / 60000).toFixed(1) + ' m' + String.fromCharCode(160);
			else ds = duration.toFixed(1) + ' ms';
		}
		this.shadowRoot.querySelector('.duration').textContent = ds;
	}

	set status(status) {
		let newState;
		this.classList.remove('wait', 'runs', 'pass', 'fail', 'skip');
		if (status === STATUSES.QUEUED) {
			newState = 'wait';
		} else if (status === STATUSES.RUNNING) {
			newState = 'runs';
		} else if (status === STATUSES.PASSED) {
			newState = 'pass';
		} else if (status === STATUSES.FAILED || status === STATUSES.ERRORED) {
			newState = 'fail';
		} else if (status === STATUSES.SKIPPED) {
			newState = 'skip';
		}
		setTimeout(() => {
			this.classList.remove('wait', 'runs', 'pass', 'fail', 'skip');
			this.classList.add(newState);
		}, 0);
	}

	set error(error) {
		const ett = this.shadowRoot.querySelector('.error-type');
		const ee = this.shadowRoot.querySelector('.error');
		ett.textContent = '';
		ee.innerHTML = '';
		if (error) {
			if (error instanceof Error) {
				const df = new DocumentFragment();

				//	error title
				const et = document.createElement('div');
				et.textContent = error.type + ' - ' + error.message;
				df.appendChild(et);

				//	error lines
				error.stackLines
					.map(l => {
						const el = document.createElement('div');
						el.classList.add('error-line');
						el.textContent = l;
						return el;
					})
					.forEach(el => df.appendChild(el));

				ett.textContent = error.type;
				ee.appendChild(df);
			} else {
				ee.textContent = error;
			}
		}
	}
});