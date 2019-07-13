import './libs/data-tier-list/data-tier-list.min.js';
import './test-view.js';

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
			width: 280px;
			height: 48px;
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

		:host .counter.pass, .status.pass {
			color: #6f4;
		}

		:host .counter.fail, .status.fail {
			color: #f00;
		}

		:host .counter.skip, .status.skip {
			color: gray;
		}

		:host .status {
			flex-basis: 50px;
		}

		:host .name {
			flex: 1;
		}

		:host > .header {
			flex: 0 0 36px;
			font-size: 120%;
			color: #99f;
			border-bottom: 2px solid #99f;
		}

		:host > .header > .scroll-spacer {
			overflow-y: scroll;
		}

		:host > .content {
			flex: 1;
			overflow-x: hidden;
			overflow-y: scroll;
		}

		:host > .content > .suite-view {
			margin-top: 20px;
		}

		:host > .content > .suite-view > .header {
			border-bottom: 1px solid #555;
		}
	</style>

	<div class="header">
		<span class="name">JustTest</span>
		<span class="counter pass" data-tie="justTestSuites:passed"></span>
		<span class="counter fail" data-tie="justTestSuites:failed"></span>
		<span class="counter skip" data-tie="justTestSuites:skipped"></span>
		<span class="scroll-spacer"></span>
	</div>
	<div class="content">
		<template is="data-tier-item-template" data-tie="justTestSuites:suites => items">
			<div class="suite-view">
				<div class="header">
					<span class="name" data-tie="item:name"></span>
					<span class="duration" data-tie="item:duration"></span>
					<span class="counter pass" data-tie="item:passed"></span>
					<span class="counter fail" data-tie="item:failed"></span>
					<span class="counter skip" data-tie="item:skipped"></span>
				</div>
				<div class="suite-tests">
					<template is="data-tier-item-template" data-tie="item:tests => items">
						<test-view data-tie="item => test, item:status => status, item:duration => duration, item:error => error"></test-view>
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