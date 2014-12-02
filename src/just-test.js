(function (options) {
	'use strict';

	var out, suites = [], suitesQueue = Promise.resolve(), DEFAULT_TEST_TTL = 5000, RUNNING = '#bbf', PASSED = '#4f2', FAILED = '#f77', SKIPPED = '#aaa';

	if (typeof options !== 'object') { options = {}; }
	if (typeof options.namespace !== 'object') {
		if (typeof window.Utils !== 'object') Object.defineProperty(window, 'Utils', { value: {} });
		options.namespace = window.Utils;
	}

	function TestCase(id, description, async, ttl, skip, func) {
		var status = 'idle', message, duration, beg, end, view;

		(function createView() {
			var tmp;
			view = document.createElement('div');
			view.style.cssText = 'position:relative;height:20px;margin:10px 5px 0px;font:17px Tahoma;color:#fff';

			tmp = document.createElement('div');
			tmp.classList.add('description');
			tmp.style.cssText = 'position:absolute;left:30px;width:150px;overflow:hidden;white-space:nowrap';
			tmp.textContent = description;
			view.appendChild(tmp);

			tmp = document.createElement('div');
			tmp.classList.add('status');
			tmp.style.cssText = 'position:absolute;right:0px';
			tmp.textContent = status;
			view.appendChild(tmp);
		})();

		function run() {
			var internalPromise, timeoutWatcher;
			status = 'running';
			beg = performance.now();
			view.querySelector('.status').textContent = status;
			view.querySelector('.status').style.color = RUNNING;
			function finalize(res, msg, settle) {
				timeoutWatcher && clearInterval(timeoutWatcher);
				end = performance.now();
				message = msg;
				status = res;
				duration = end - beg;

				view.querySelector('.status').textContent = status;
				view.querySelector('.status').style.color = status === 'passed' ? PASSED : (status === 'skipped' ? SKIPPED : FAILED);

				settle && settle();
			}
			if (skip) {
				finalize('skipped', '');
				return Promise.resolve();
			} else {
				internalPromise = new Promise(function (resolve, reject) {
					if (!async) {
						timeoutWatcher = setTimeout(function () {
							reject('timeout');
						}, ttl);
					}
					func(resolve, reject);
				});
				return new Promise(function (resolve) {
					internalPromise.then(function (msg) {
						finalize('passed', msg, resolve);
					}, function (msg) {
						finalize('failed', msg, resolve);
					});
				});
			}
		}

		Object.defineProperties(this, {
			id: { value: id },
			status: { get: function () { return status; } },
			message: { get: function () { return message; } },
			duration: { get: function () { return duration; } },
			async: { value: async },
			run: { value: run },
			view: { get: function () { return view; } }
		});
	}

	function TestSuite(description) {
		var id = suites.length, cases = [], passed = 0, failed = 0, skipped = 0, status = 'idle', suitePromise, view, tmp;
		suites.push(this);

		(function createView() {
			view = document.createElement('div');
			view.style.cssText = 'position:relative;width:100%;height:auto;margin-bottom:10px;padding-bottom:5px;border-bottom:1px solid #ccc';

			tmp = document.createElement('div');
			tmp.classList.add('header');
			tmp.style.cssText = 'position:relative;height:30px;margin:0px 5px;color:#fff';
			view.appendChild(tmp);

			tmp = document.createElement('div');
			tmp.classList.add('description');
			tmp.style.cssText = 'position:absolute';
			tmp.textContent = 'Suite ' + id + ': ' + description;
			view.querySelector('.header').appendChild(tmp);

			tmp = document.createElement('div');
			tmp.classList.add('counters');
			tmp.style.cssText = 'position:absolute;top:0px;left:400px;font-family:monospace';
			tmp.innerHTML = '<span class="passed" style="color:' + PASSED + '">0</span> | <span class="failed" style="color:' + FAILED + '">0</span> | <span class="skipped" style="color:' + SKIPPED + '">0</span> of <span class="total">0</span>';
			view.querySelector('.header').appendChild(tmp);

			tmp = document.createElement('div');
			tmp.classList.add('status');
			tmp.style.cssText = 'position:absolute;right:0px;top:0px';
			tmp.textContent = status;
			view.querySelector('.header').appendChild(tmp);
		})();

		function updateCounters() {
			view.querySelector('.passed').textContent = passed;
			view.querySelector('.failed').textContent = failed;
			view.querySelector('.skipped').textContent = skipped;
		}

		function createCase(options, executor) {
			if (typeof options === 'function') { executor = options; } else if (typeof executor !== 'function') { throw new Error('test function must be a last of not more than two parameters'); }
			cases.push(new TestCase(
				cases.length,
				options.description || 'test ' + (cases.length + 1),
				typeof options.async === 'boolean' ? options.async : false,
				typeof options.ttl === 'number' ? options.ttl : DEFAULT_TEST_TTL,
				typeof options.skip === 'boolean' ? options.skip : false,
				executor
			));
			return cases.slice(-1)[0];
		}

		function run() {
			view.querySelector('.status').textContent = status;
			view.querySelector('.total').textContent = cases.length;
			out.appendChild(view);

			suitesQueue = suitesQueue.then(function () {
				return new Promise(function (resolve, reject) {
					var asyncFlow = Promise.resolve();

					status = 'running';
					view.querySelector('.status').textContent = status;
					view.querySelector('.status').style.color = RUNNING;

					if (!cases.length) { throw new Error('empty suite can not be run'); }
					(function iterate(index) {
						var testCase, tmpPromise;
						if (index === cases.length) {
							asyncFlow.then(function () {
								if (failed > 0) {
									status = 'failed';
									view.querySelector('.status').textContent = status;
									view.querySelector('.status').style.color = status === 'passed' ? PASSED : FAILED;
								} else {
									status = 'passed';
									view.querySelector('.status').textContent = status;
									view.querySelector('.status').style.color = status === 'passed' ? PASSED : FAILED;
								}
								resolve();
							}, function () {
								status = 'failed';
								view.querySelector('.status').textContent = status;
								view.querySelector('.status').style.color = status === 'passed' ? PASSED : FAILED;
								resolve();
							});
						} else {
							testCase = cases[index++];
							view.appendChild(testCase.view);
							tmpPromise = testCase.run();
							tmpPromise.then(function () {
								if (testCase.status === 'passed') passed++;
								else if (testCase.status === 'failed') failed++;
								else if (testCase.status === 'skipped') skipped++;
								updateCounters();
								!testCase.async && iterate(index);
							}, function () {
								if (testCase.status === 'passed') passed++;
								else if (testCase.status === 'failed') failed++;
								else if (testCase.status === 'skipped') skipped++;
								updateCounters();
								!testCase.async && iterate(index);
							});
							if (testCase.async) {
								asyncFlow = Promise.all([asyncFlow, tmpPromise]);
								iterate(index);
							}
						}
					})(0);
				});
			});
		}

		Object.defineProperties(this, {
			id: { get: function () { return id; } },
			createCase: { value: createCase },
			run: { value: run }
		});
	}

	function buildOut() {
		var root, tmp;
		root = document.createElement('div');
		root.id = 'JustTestOut';
		root.style.cssText = 'position:fixed;top:50px;bottom:50px;right:50px;width:800px;background-color:#555;opacity:.7;border:2px solid #555;border-top-left-radius:7px;border-top-right-radius:7px';

		tmp = document.createElement('div');
		tmp.id = 'JustTestOutTitle';
		tmp.style.cssText = 'position:absolute;top:0px;left:0px;width:100%;height:40px;padding:0px 5px;font:28px Tahoma;border-bottom:3px solid #fff;color:#fff;cursor:default;box-sizing:border-box';
		tmp.textContent = 'JustTest';
		root.appendChild(tmp);

		tmp = document.createElement('div');
		tmp.style.cssText = 'position:absolute;right:32px;top:5px;font:22px monospace;cursor:default';
		tmp.textContent = '\u25b2';
		tmp.onclick = function () {
			console.info('collapse and turn this sign to expand');
		}
		root.querySelector('#JustTestOutTitle').appendChild(tmp);

		tmp = document.createElement('div');
		tmp.style.cssText = 'position:absolute;right:9px;top:0px;font:28px monospace;cursor:default';
		tmp.textContent = '\u00d7';
		tmp.onclick = function () {
			console.info('at this point handle any shutting down of the running tasks if any');
			document.body.removeChild(root);
		}
		root.querySelector('#JustTestOutTitle').appendChild(tmp);

		out = document.createElement('div');
		out.style.cssText = 'position:absolute;top:40px;bottom:0px;width:100%;overflow-x:hidden;overflow-y:scroll';
		root.appendChild(out);

		document.body.appendChild(root);
	}

	buildOut();
	Object.defineProperty(options.namespace, 'JustTest', { value: {} });
	Object.defineProperties(options.namespace.JustTest, {
		createSuite: {
			value: function (description) {
				suites.push(new TestSuite(description));
				return suites.slice(-1)[0];
			}
		}
	});
})((typeof arguments === 'object' ? arguments[0] : undefined));