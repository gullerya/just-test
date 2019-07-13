const
	template = document.createElement('template');

template.innerHTML = `
	<style>
		:host {
			padding-left: 20px;
			font-size: 90%;
			overflow: hidden;
			display: flex;
			flex-direction: column;
		}

		:host > .header {
			padding: 6px;
			display: flex;
			flex-direction: row;
			align-items: center;
		}

		:host > .header > .name {
			flex: 1;
		}

		:host > .header > .status, .duration {
			font-family: Courier;
			text-align: right;
		}

		:host > .header > .duration {
			flex-basis: 99px;
			overflow: hidden;
			white-space: nowrap;
		}

		:host > .header > .status {
			flex-basis: 70px;
		}

		:host(.runs) > .header > .status {
			color: #88f;
		}

		:host(.pass) > .header > .status {
			color: #6f4;
		}

		:host(.fail) > .header > .status {
			color: #f00;
		}

		:host(.skip) > .header > .status {
			color: gray;
		}

		:host > .error {
			height: auto;
			max-height: 0px;
			margin-left: 20px;
			transition: max-height 100ms;
			overflow-x: hidden;
			overflow-y: auto;
			font-family: Courier;
			background-color: #111;
		}

		:host(.errorOpen) > .error {
			max-height: 120px;
		}

		:host .error-line {
			padding: 2px;
			font-family: Courier;
			overflow: hidden;
			white-space: nowrap;
		}
	</style>

	<div class="header">
		<span class="name"></span>
		<span class="duration"></span>
		<span class="status"></span>
	</div>
	<div class="error"></div>
`;

customElements.define('test-view', class extends HTMLElement {
	constructor() {
		super();
		this
			.attachShadow({ mode: 'open' })
			.appendChild(template.content.cloneNode(true));
		this.addEventListener('click', () => {
			this.classList.toggle('errorOpen');
		});
	}

	set test(test) {
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
		const se = this.shadowRoot.querySelector('.status');
		this.classList.remove('pass', 'fail', 'skip');
		switch (status) {
			case 'runs':
				se.textContent = 'runs';
				this.classList.add('runs');
				break;
			case 'pass':
				se.textContent = 'pass';
				this.classList.add('pass');
				break;
			case 'fail':
				se.textContent = 'fail';
				this.classList.add('fail');
				break;
			case 'skip':
				se.textContent = 'skip';
				this.classList.add('skip');
				break;
			default:
				se.textContent = '';
		}
	}

	set error(error) {
		this.shadowRoot.querySelector('.error').innerHTML = '';
		if (error && error instanceof Error) {
			const
				lines = error.stack.split(/[\r\n]/),
				df = new DocumentFragment();
			lines
				.filter(l => l.length)
				.map(l => {
					const le = document.createElement('div');
					le.classList.add('error-line');
					le.textContent = l;
					return le;
				})
				.forEach(le => df.appendChild(le));
			this.shadowRoot.querySelector('.error').appendChild(df);
		}
	}
});