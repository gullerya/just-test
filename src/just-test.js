(function (options) {
	'use strict';

	var out, suites = [], DEFAULT_TEST_TTL = 5000;

	if (typeof options !== 'object') { options = {}; }
	if (typeof options.namespace !== 'object') {
		if (typeof window.Utils !== 'object') Object.defineProperty(window, 'Utils', { value: {} });
		options.namespace = window.Utils;
	}

	function TestCase(id, description, async, ttl, func) {
		var status = 'idle', message, duration, beg, end, view;

		(function createView() {
			var tmp;
			view = document.createElement('div');
			view.id = id;
			view.style.cssText = 'position:relative;height:20px;margin:10px 5px 0px;font:17px Tahoma;color:#fff';

			tmp = document.createElement('div');
			tmp.classList.add('description');
			tmp.style.cssText = 'position:absolute;left:30px;width:150px;overflow:hidden;white-space:nowrap';
			tmp.textContent = description;
			view.appendChild(tmp);

			tmp = document.createElement('div');
			tmp.classList.add('message');
			tmp.style.cssText = 'position:absolute;left:200px;width:150px;overflow:hidden;white-space:nowrap';
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
			view.querySelector('.status').style.color = '#bbf';
			function finalize(res, msg, settle) {
				timeoutWatcher && clearInterval(timeoutWatcher);
				end = performance.now();
				message = msg;
				status = res;
				duration = end - beg;

				view.querySelector('.message').textContent = message;
				view.querySelector('.status').textContent = status;
				view.querySelector('.status').style.color = status === 'passed' ? '#9f9' : '#f99';

				settle();
			}
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

		Object.defineProperties(this, {
			id: { value: id },
			status: { value: status },
			message: { value: message },
			duration: { value: duration },
			async: { value: async },
			run: { value: run },
			view: { get: function () { return view; } }
		});
	}

	function TestSuite(description) {
		var id = suites.length + 1, cases = [], status = 'idle', suitePromise, view, tmp;
		suites.push(this);

		view = document.createElement('div');
		view.id = 'testSuite_' + id;
		view.style.cssText = 'position:relative;width:100%;height:auto';

		tmp = document.createElement('div');
		tmp.className = 'suiteTitle';
		tmp.style.cssText = 'color:#fff';
		tmp.textContent = 'Suite ' + id + ': ' + description;
		view.appendChild(tmp);

		tmp = document.createElement('div');
		tmp.className = 'suiteSummary'
		tmp.style.cssText = 'position:absolute;right:0px;top:0px';
		view.querySelector('.suiteTitle').appendChild(tmp);

		out.appendChild(view);

		function createCase(options, executor) {
			if (typeof options === 'function') { executor = options; } else if (typeof executor !== 'function') { throw new Error('test function must be a last of not more than two parameters'); }
			cases.push(new TestCase(
				'testCase_' + id + '_' + (cases.length + 1),
				options.description || 'test ' + (cases.length + 1),
				typeof options.async === 'boolean' ? options.async : false,
				typeof options.ttl === 'number' ? options.ttl : DEFAULT_TEST_TTL,
				executor
			));
			return cases.slice(-1)[0];
		}

		function run() {
			var asyncFlow = Promise.resolve();

			//	TODO: handle UI stuff
			view.querySelector('.suiteSummary').textContent = 'summary goes here';

			function finalize() {
				console.log('finished the suite');
			}

			suitePromise = new Promise(function (resolve, reject) {
				if (!cases.length) { throw new Error('empty suite can not be run'); }
				(function iterate(index) {
					var testCase;
					if (index === cases.length) {
						asyncFlow.then(resolve, reject);
					} else {
						testCase = cases[index++];
						view.appendChild(testCase.view);
						if (testCase.async) {
							asyncFlow = Promise.all([asyncFlow, testCase.run()]);
							iterate(index);
						} else {
							testCase.run().then(function () {
								iterate(index);
							}, function () {
								iterate(index);
							});
						}
					}
				})(0);
			});
			suitePromise.then(finalize, finalize);
			return suitePromise;
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
		root.style.cssText = 'position:fixed;top:50px;bottom:50px;right:50px;width:800px;background-color:#555;opacity:.7;border:0px solid #555;border-top-left-radius:7px;border-top-right-radius:7px';

		tmp = document.createElement('div');
		tmp.id = 'JustTestOutTitle';
		tmp.style.cssText = 'position:absolute;top:0px;left:0px;width:100%;height:40px;padding:0px 5px;font:28px Tahoma;border-bottom:3px solid #fff;color:#fff;cursor:default;box-sizing:border-box';
		tmp.textContent = 'Just Test: reasonably simple testing util for JS (client)';
		root.appendChild(tmp);

		tmp = document.createElement('div');
		tmp.style.cssText = 'position:absolute;right:7px;top:7px;font:20px monospace;cursor:default';
		tmp.textContent = 'x';
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