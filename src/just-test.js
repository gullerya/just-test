(function (options) {
	'use strict';

	var api = {}, consts = {}, utils = {}, suites = [], suitesQueue = Promise.resolve();
	var jtViewContainer, jtViewList;

	if (!options || typeof options !== 'object') { options = {}; }
	if (!options.namespace || typeof options.namespace !== 'object') {
		if (typeof window.Utils !== 'object') Object.defineProperty(window, 'Utils', { value: {} });
		options.namespace = window.Utils;
	}
	if (!('configUrl' in options)) options.configUrl = 'config.js';

	//	TODO: provide customizaton for the default values via the options
	Object.defineProperties(consts, {
		DEFAULT_SUITE_NAME: { value: 'unnamed' },
		DEFAULT_SYNC_TEST_TTL: { value: 10 * 1000 },
		DEFAULT_ASYNC_TEST_TTL: { value: 30 * 60 * 1000 },
		running: { value: '#99f' },
		passed: { value: '#6f4' },
		failed: { value: '#f55' },
		skipped: { value: '#666' }
	});

	function stringifyDuration(d) {
		if (d > 99) return (d / 1000).toFixed(1) + ' s';
		else if (d > 59900) return (d / 60000).toFixed(1) + ' m';
		else return d.toFixed(1) + ' ms';
	}

	function Assert(assertsAPI) {
		//	TODO: instead of test provide testAssertsAPI and count the asserts inside the test
		Object.defineProperties(this, {
			equal: {
				value: function (a, b) {
					if (a != b) {
						assertsAPI.failed++;
						throw new Error('Assert fail: ' + a + ' not equals ' + b);
					} else {
						assertsAPI.passed++;
					}
				}
			},
			striqual: {
				value: function (a, b) {
					if (a !== b) {
						assertsAPI.failed++;
						throw new Error('Assert fail: ' + a + ' not strictly equals ' + b);
					} else {
						assertsAPI.passed++;
					}
				}
			}
		});
	}

	function Utils(assertsAPI) {
		Object.defineProperties(this, {
			assert: { value: new Assert(assertsAPI) }
		});
	}

	function Test(options, testCode) {
		var id, name, async, skip, ttl, status = 'idle', message, startTime, beg, end, duration, view, asserts;
		id = 'id' in options ? options.id : undefined;
		name = 'name' in options ? options.name : 'not descripted';
		async = typeof options.async === 'boolean' ? options.async : false;
		skip = typeof options.skip === 'boolean' ? options.skip : false;
		ttl = typeof options.ttl === 'number' ? options.ttl : (async ? consts.DEFAULT_ASYNC_TEST_TTL : consts.DEFAULT_SYNC_TEST_TTL);

		(function createView() {
			var tmp;
			view = document.createElement('div');
			view.classList.add('testStatusView');
			view.style.cssText = 'position:relative;min-height:24px;margin:10px 5px 10px 30px;font-size:18px;overflow:hidden';

			tmp = document.createElement('div');
			tmp.classList.add('name');
			tmp.style.cssText = 'position:absolute;left:3px;width:500px;overflow:hidden;white-space:nowrap;cursor:default;text-overflow:ellipsis';
			tmp.textContent = name;
			view.appendChild(tmp);

			tmp = document.createElement('div');
			tmp.classList.add('duration');
			tmp.style.cssText = 'position:absolute;right:100px;color:#bbb;cursor:default';
			view.appendChild(tmp);

			tmp = document.createElement('div');
			tmp.classList.add('status');
			tmp.style.cssText = 'position:absolute;right:3px;cursor:default;box-sizing:border-box';
			tmp.textContent = status;
			tmp.onmouseenter = function () { if (status === 'idle' || status === 'running') return; this.style.borderBottom = '1px solid ' + this.style.color; };
			tmp.onmouseleave = function () { if (status === 'idle' || status === 'running') return; this.style.borderBottom = 'none'; };
			tmp.onclick = function () {
				var cntnt;
				if (status === 'idle' || status === 'running') return;
				if (view.querySelector('.testResult').offsetHeight > 0) {
					view.querySelector('.testResult').style.maxHeight = '0px';
				} else {
					view.querySelector('.testResult').style.maxHeight = '200px';
					if (message instanceof Error) {
						cntnt = message.stack.replace(' at ', '<br>')
						view.querySelector('.testResult').innerHTML = cntnt;
					} else {
						view.querySelector('.testResult').textContent = message ? message.toString() : '';
					}
				}
			};
			view.appendChild(tmp);

			tmp = document.createElement('div');
			tmp.classList.add('testResult');
			tmp.style.cssText = 'position:relative;margin:25px 0px 0px 40px;height:auto;max-height:0px;transition:max-height .2s;overflow-x:hidden;overflow-y:auto;font-size:12px;line-height:200%;color:' + consts.failed;
			view.appendChild(tmp);
		})();

		asserts = {
			passed: 0,
			failed: 0
		};

		function run() {
			var testPromise, timeoutWatcher;
			status = 'running';
			view.querySelector('.status').textContent = status;
			view.querySelector('.status').style.color = consts.running;
			function finalize(res, msg) {
				timeoutWatcher && clearInterval(timeoutWatcher);
				end = performance.now();
				message = msg;
				status = res;
				duration = end - beg;

				view.querySelector('.duration').textContent = stringifyDuration(duration);
				view.querySelector('.status').textContent = status;
				view.querySelector('.status').style.color = consts[status];
			}
			startTime = new Date();
			beg = performance.now();
			if (skip) {
				finalize('skipped', '');
				return Promise.resolve();
			} else {
				testPromise = new Promise(function (resolve, reject) {
					timeoutWatcher = setTimeout(function () {
						reject(new Error('Timeout, have you forgotten to call pass/fail?'));
					}, ttl);
					testCode(resolve, reject, new Utils(asserts));
				});
				testPromise.then(function (msg) { finalize('passed', msg); }, function (msg) {
					msg = msg instanceof Error ? msg : new Error(msg);
					finalize('failed', msg);
				});
				return testPromise;
			}
		}

		//	TODO: remove 'run' from public API?
		Object.defineProperties(this, {
			id: { get: function () { return id; } },
			name: { get: function () { return name; } },
			async: { get: function () { return async; } },
			skip: { get: function () { return skip; } },
			ttl: { get: function () { return ttl; } },
			run: { value: run },

			status: { get: function () { return status; } },
			message: { get: function () { return message; } },
			startTime: { get: function () { return startTime; } },
			duration: { get: function () { return duration; } },

			view: { get: function () { return view; } }
		});
	}

	function Suite(options) {
		var id, name, tests = [], passed = 0, failed = 0, skipped = 0, status = 'idle', startTime, beg, end, duration, view, tmp;
		options = typeof options === 'object' ? options : {};
		if ('id' in options) id = options.id;
		name = 'name' in options ? options.name : consts.DEFAULT_SUITE_NAME;

		view = document.createElement('div');
		view.style.cssText = 'position:relative;width:100%;height:auto;margin:10px 0px 30px';

		tmp = document.createElement('div');
		tmp.classList.add('header');
		tmp.style.cssText = 'position:relative;height:26px;margin:0px 5px;border-bottom:1px solid #ccc;cursor:default;font-weight:bold';
		view.appendChild(tmp);

		tmp = document.createElement('div');
		tmp.classList.add('title');
		tmp.style.cssText = 'position:absolute;width:340px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;cursor:default;text-overflow:ellipsis';
		tmp.textContent = name;
		view.querySelector('.header').appendChild(tmp);

		tmp = document.createElement('div');
		tmp.classList.add('counters');
		tmp.style.cssText = 'position:absolute;top:0px;left:350px;cursor:default';
		tmp.innerHTML = '<span class="passed" style="color:' + consts.passed + '">0</span> | <span class="failed" style="color:' + consts.failed + '">0</span> | <span class="skipped" style="color:' + consts.skipped + '">0</span> of <span class="total">0</span>';
		view.querySelector('.header').appendChild(tmp);

		tmp = document.createElement('div');
		tmp.classList.add('duration');
		tmp.style.cssText = 'position:absolute;right:100px';
		view.querySelector('.header').appendChild(tmp);

		tmp = document.createElement('div');
		tmp.classList.add('status');
		tmp.style.cssText = 'position:absolute;right:0px;top:0px;cursor:default';
		tmp.textContent = status;
		view.querySelector('.header').appendChild(tmp);

		function updateCounters() {
			view.querySelector('.passed').textContent = passed;
			view.querySelector('.failed').textContent = failed;
			view.querySelector('.skipped').textContent = skipped;
		}

		function addTest(options, testCode) {
			var em = 'bad parameters: must be 1 or 2 where the last one is a function', test;
			if (arguments.length < 1 || arguments.length > 2) throw new Error(em);
			if (arguments.length === 1) {
				testCode = arguments[0];
				options = {};
			}
			if (typeof testCode !== 'function') { throw new Error(em); }
			test = new Test(options, testCode);
			view.appendChild(test.view);
			tests.push(test);
		}

		function run() {
			var suitePromise;

			view.querySelector('.status').textContent = status;
			view.querySelector('.total').textContent = tests.length;
			function finalize() {
				end = performance.now();
				duration = end - beg;
				view.querySelector('.header > .duration').textContent = stringifyDuration(duration);
				if (failed > 0) {
					status = 'failed';
					view.querySelector('.status').textContent = status;
					view.querySelector('.status').style.color = consts[status];
				} else {
					status = 'passed';
					view.querySelector('.status').textContent = status;
					view.querySelector('.status').style.color = consts[status];
				}
			}

			suitePromise = new Promise(function (resolve, reject) {
				var asyncFlow = Promise.resolve();

				status = 'running';
				view.querySelector('.status').textContent = status;
				view.querySelector('.status').style.color = consts.running;

				startTime = new Date();
				beg = performance.now();

				(function iterate(index) {
					var test, testPromise;
					if (index === tests.length) {
						asyncFlow.then(function () { finalize(); resolve(); });
					} else {
						test = tests[index++];
						testPromise = test.run();
						testPromise.then(function () {
							if (test.status === 'passed') passed++;
							else if (test.status === 'failed') failed++;
							else if (test.status === 'skipped') skipped++;
							updateCounters();
							!test.async && iterate(index);
						}, function () {
							if (test.status === 'passed') passed++;
							else if (test.status === 'failed') failed++;
							else if (test.status === 'skipped') skipped++;
							updateCounters();
							!test.async && iterate(index);
						});
						if (test.async) {
							asyncFlow = asyncFlow.then(function () { return new Promise(function (r) { testPromise.then(r, r) }); });
							iterate(index);
						}
					}
				})(0);
			});

			return suitePromise;
		}

		Object.defineProperties(this, {
			id: { get: function () { return id; } },
			name: { get: function () { return name; } },

			view: { get: function () { return view; } },
			addTest: { value: addTest },
			getTests: { value: function () { return tests.slice(0); } },
			run: { value: run },

			status: { get: function () { return status; } },
			startTime: { get: function () { return startTime; } },
			duration: { get: function () { return duration; } }
		});
	}

	function minimize(button) {
		var b = jtViewContainer.querySelector('#JustTestViewToggle');
		jtViewContainer.querySelector('#JustTestViewSummary').style.display = 'none';
		jtViewContainer.style.height = '35px';
		jtViewContainer.style.width = '180px';
		b.textContent = '\u25bc';
	}

	function maximize(button) {
		var b = jtViewContainer.querySelector('#JustTestViewToggle');
		jtViewContainer.style.height = '800px';
		jtViewContainer.style.width = '800px';
		b.textContent = '\u25b2';
		jtViewContainer.querySelector('#JustTestViewSummary').style.display = 'block';
	}

	function buildView() {
		var css, tmp, startX, startY, startLeft, startTop, tmpMMH, tmpMUH;
		css = document.createElement('style');
		css.innerHTML += '.just-test-ui {' +
			'position:fixed;' +
			'top:50px;' +
			'left:350px;' +
			'height:800px;' +
			'width:800px;' +
			'background-color:#000;' +
			'color:#fff;' +
			'opacity:.7;' +
			'font:20px Courier;' +
			'border-radius:5px;' +
			'overflow:hidden;' +
			'transition: width .2s, height .2s;' +
			'z-index:99999;}; ';
		css.innerHTML += '.just-test-ui .title {' +
			'position:absolute;' +
			'font-family:Tahoma;' +
			'font-weight:bold;' +
			'cursor:default;' +
			'text-overflow:ellipsis;}; ';
		css.innerHTML += '.just-test-ui > .header {top:3px;height:40px;left:5px;right:40px;font-size:24px;box-sizing:border-box;color:#99f;};';
		document.body.appendChild(css);


















		jtViewContainer = document.createElement('div');
		jtViewContainer.className = 'just-test-ui';

		tmp = document.createElement('div');
		tmp.id = 'JustTestViewTitle';
		tmp.className = 'header title';
		//tmp.style.cssText = 'position:absolute;top:3px;height:40px;left:5px;right:40px;font:bold 24px Tahoma;cursor:default;box-sizing:border-box;color:#99f';
		tmp.textContent = 'JustTest';
		tmp.onmousedown = function (event) {
			tmpMMH = document.onmousemove;
			tmpMUH = document.onmouseup;
			startX = event.clientX;
			startY = event.clientY;
			startLeft = jtViewContainer.offsetLeft;
			startTop = jtViewContainer.offsetTop;

			document.onmousemove = function (event) {
				var top = startTop + event.clientY - startY, left = startLeft + event.clientX - startX;
				top = top < 0 ? 0 : top;
				left = left < 0 ? 0 : left;
				top = document.documentElement.clientHeight - top - 35 < 0 ? document.documentElement.clientHeight - 35 : top;
				left = document.documentElement.clientWidth - left - 180 < 0 ? document.documentElement.clientWidth - 180 : left;
				jtViewContainer.style.top = top + 'px';
				jtViewContainer.style.left = left + 'px';
				event.preventDefault();
			};
			document.onmouseleave = document.onmouseup = function (event) {
				document.onmousemove = tmpMMH;
			};

		};
		jtViewContainer.appendChild(tmp);

		tmp = document.createElement('div');
		tmp.id = 'JustTestViewToggle';
		//tmp.style.cssText = 'position:absolute;right:9px;top:3px;font:25px monospace;cursor:default';
		tmp.textContent = '\u25b2';
		tmp.onclick = function () {
			if (this.textContent === '\u25b2') { minimize(); } else { maximize(); }
		}
		jtViewContainer.appendChild(tmp);

		jtViewList = document.createElement('div');
		//jtViewList.style.cssText = 'position:absolute;top:40px;bottom:60px;width:100%;border-top:3px solid #fff;overflow-x:hidden;overflow-y:scroll';
		jtViewContainer.appendChild(jtViewList);

		tmp = document.createElement('div');
		tmp.id = 'JustTestViewSummary';
		//tmp.style.cssText = 'position:absolute;bottom:0px;left:0px;width:100%;height:60px;padding:0px 5px;font:22px Tahoma;border-top:3px solid #fff;cursor:default;box-sizing:border-box';
		tmp.textContent = 'Summary';
		jtViewContainer.appendChild(tmp);

		document.body.appendChild(jtViewContainer);
	}
	buildView();

	Object.defineProperties(api, {
		createSuite: {
			value: function (options) {
				var s = new Suite(options);
				suites.push(s);
				jtViewList.appendChild(s.view);
				return s;
			}
		},
		View: { value: {} }
	});
	Object.defineProperties(api.View, {
		minimize: { value: minimize },
		maximize: { value: maximize },
		element: { value: jtViewContainer }
	});
	Object.defineProperty(options.namespace, 'JustTest', { value: api });
})((typeof arguments === 'object' ? arguments[0] : undefined));