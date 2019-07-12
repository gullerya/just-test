import './libs/data-tier-list/data-tier-list.min.js';

const
	template = document.createElement('template');

template.innerHTML = `
	<style>
		:host {
			position: fixed;
			direction: ltr;
			top: 30px;
			left: 30px;
			width: 800px;
			height: 800px;
			background-color: #000;
			color: #fff;
			opacity: .7;
			font-size: 20px;
			font-family: Tahoma;
			overflow: hidden;
			user-select: none;
			cursor: default;
			transition: width .2s, height .2s;
			z-index: 99999;
			display: flex;
			flex-direction: column;
		}

		:host(.minimized) {
			width: 180px;
			height: 35px;
		}

		:host .header {
			padding: 6px;
			display: flex;
			flex-direction: row;
			align-items: center;
		}

		:host .counter, .status {
			flex-basis: 70px;
			font-family: Courier;
			font-weight: bold;
			text-align: right;
		}

		:host .counter.passed {
			color: green;
		}

		:host .counter.failed {
			color: red;
		}

		:host .counter.skipped {
			color: gray;
		}

		:host .status {
			flex-basis: 50px;
		}

		:host .title {
			flex: 1;
		}

		:host .test-view {
			margin-left: 20px;
			font-size: 90%;
			overflow: hidden;
		}

		:host .error {
			height: 0px;
			margin-left: 20px;
			transition: height 100ms;
			overflow-x: hidden;
			overflow-y: auto;
			font-family: Courier;
		}

		:host > .header {
			flex: 0 0 36px;
			font-size: 120%;
			border-bottom: 1px solid #ccc;
		}

		:host > .content {
			flex: 1;
		}

		:host > .content > .suite-view > .header {
			background-color: #1a1a1a;
		}
	</style>

	<div class="header">
		<span class="title">JustTest</span>
		<span class="counter passed" data-tie="justTestSuites:passed"></span>
		<span class="counter failed" data-tie="justTestSuites:failed"></span>
		<span class="counter skipped" data-tie="justTestSuites:skipped"></span>
	</div>
	<div class="content">
		<template is="data-tier-item-template" data-tie="justTestSuites:suites => items">
			<div class="suite-view">
				<div class="header">
					<span class="title" data-tie="item:name"></span>
					<span class="counter passed" data-tie="item:passed"></span>
					<span class="counter failed" data-tie="item:failed"></span>
					<span class="counter skipped" data-tie="item:skipped"></span>
				</div>
				<div class="suite-tests">
					<template is="data-tier-item-template" data-tie="item:tests => items">
						<div class="test-view">
							<div class="header">
								<span class="title" data-tie="item:name"></span>
								<span class="duration" data-tie="item:duration"></span>
								<span class="status" data-tie="item:status"></span>
							</div>
							<div class="error" data-tie="item:message => innerHTML"></div>
						</div>
					</template>
				</div>
			</div>
		</template>
	</div>
`;

customElements.define('just-test-view', class extends HTMLElement {
	constructor() {
		super();
		this
			.attachShadow({ mode: 'open' })
			.appendChild(template.content.cloneNode(true));

		this.shadowRoot.querySelector('.header').addEventListener('click', () => this.classList.toggle('minimized'));
	}
});