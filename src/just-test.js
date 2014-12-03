﻿(function (options) {
	'use strict';

	var out, suiteIdGen = 0, suites = [], suitesQueue = Promise.resolve(), DEFAULT_TEST_TTL = 5000, RUNNING = '#bbf', PASSED = '#4f2', FAILED = '#f77', SKIPPED = '#aaa';

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
			view.style.cssText = 'position:relative;height:20px;margin:10px 5px 0px;font:17px Tahoma';

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
							reject(new Error('timeout'));
						}, ttl);
					}
					func(resolve, reject);
				});
				return new Promise(function (resolve) {
					internalPromise.then(function (msg) {
						finalize('passed', msg, resolve);
					}, function (msg) {
						console.dir(msg);
						finalize('failed', msg, resolve);
					});
				});
			}
		}

		Object.defineProperties(this, {
			id: { get: function () { return id; } },
			status: { get: function () { return status; } },
			message: { get: function () { return message; } },
			duration: { get: function () { return duration; } },
			async: { value: async },
			run: { value: run },
			view: { get: function () { return view; } }
		});
	}

	function TestSuite(id, options) {
		var id, caseIdGen = 0, name, cases = [], passed = 0, failed = 0, skipped = 0, status = 'idle', suitePromise, view, tmp;
		name = options && options.name ? options.name : 'Suite (id: ' + id + ')';
		suites.push(this);

		view = document.createElement('div');
		view.style.cssText = 'position:relative;width:100%;height:auto;margin:10px 0px 30px';

		tmp = document.createElement('div');
		tmp.classList.add('header');
		tmp.style.cssText = 'position:relative;height:26px;margin:0px 5px;border-bottom:1px solid #ccc';
		view.appendChild(tmp);

		tmp = document.createElement('div');
		tmp.classList.add('title');
		tmp.style.cssText = 'position:absolute';
		tmp.textContent = 'Suite: ' + name;
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

		out.appendChild(view);

		function updateCounters() {
			view.querySelector('.passed').textContent = passed;
			view.querySelector('.failed').textContent = failed;
			view.querySelector('.skipped').textContent = skipped;
		}

		function createCase(options, executor) {
			if (typeof options === 'function') { executor = options; } else if (typeof executor !== 'function') { throw new Error('test function must be a last of not more than two parameters'); }
			cases.push(new TestCase(
				caseIdGen++,
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
			id: { value: id },
			createCase: { value: createCase },
			run: { value: run }
		});
	}

	function Report(suites) {
		//	TODO: create report from one or many suites and generate
		//	TODO: add methods to generate outputs in json/xml formats
		Object.defineProperties(this, {
			toJSON: {
				value: function () {
					//	to be implemented
				}
			},
			toXMLJUnit: {
				value: function () {
					//	to be implemented
				}
			},
			toXMLNUnit: {
				value: function () {
					//	to be implemented
				}
			},
			toXMLTestNG: {
				value: function () {
					//	to be implemented
				}
			}
		});
	}

	function buildOut() {
		var root, tmp, offsetX, offsetY, tmpMMH, tmpMUH;
		root = document.createElement('div');
		root.id = 'JustTestOut';
		root.style.cssText = 'position:fixed;top:50px;left:350px;height:800px;width:800px;background-color:#444;color:#fff;opacity:.7;border:2px solid #444;border-radius:7px;overflow:hidden;transition: width .3s, height .3s';

		tmp = document.createElement('div');
		tmp.id = 'JustTestOutTitle';
		tmp.style.cssText = 'position:absolute;top:0px;height:40px;left:5px;right:40px;font:28px Tahoma;cursor:default;box-sizing:border-box';
		tmp.textContent = 'JustTest';
		tmp.onmousedown = function (event) {
			tmpMMH = document.onmousemove;
			tmpMUH = document.onmouseup;
			offsetX = event.offsetX;
			offsetY = event.offsetY;
			document.onmousemove = function (event) {
				var x = event.clientX - offsetX, y = event.clientY - offsetY;
				x = x < 0 ? 0 : x;
				y = y < 0 ? 0 : y;
				x = document.documentElement.clientWidth - x - 164 < 0 ? document.documentElement.clientWidth - 164 : x;
				y = document.documentElement.clientHeight - y - 39 < 0 ? document.documentElement.clientHeight - 39 : y;
				root.style.left = x + 'px';
				root.style.top = y + 'px';
				event.preventDefault();
				event.stopImmediatePropagation();
			};
			document.onmouseleave = document.onmouseup = function (event) {
				document.onmousemove = tmpMMH;
			};

		};
		root.appendChild(tmp);

		tmp = document.createElement('div');
		tmp.style.cssText = 'position:absolute;right:9px;top:3px;font:25px monospace;cursor:default';
		tmp.textContent = '\u25b2';
		tmp.onclick = function () {
			if (this.textContent === '\u25b2') {
				root.querySelector('#JustTestOutSummary').style.display = 'none';
				root.style.height = '35px';
				root.style.width = '160px';
				this.textContent = '\u25bc';
			} else {
				root.style.height = '800px';
				root.style.width = '800px';
				this.textContent = '\u25b2';
				root.querySelector('#JustTestOutSummary').style.display = 'block';
			}
		}
		root.appendChild(tmp);

		out = document.createElement('div');
		out.style.cssText = 'position:absolute;top:40px;bottom:32px;width:100%;border-top:3px solid #fff;overflow-x:hidden;overflow-y:scroll';
		root.appendChild(out);

		tmp = document.createElement('div');
		tmp.id = 'JustTestOutSummary';
		tmp.style.cssText = 'position:absolute;bottom:0px;left:0px;width:100%;height:32px;padding:0px 5px;font:22px Tahoma;border-top:3px solid #fff;cursor:default;box-sizing:border-box';
		tmp.textContent = 'Summary: ';
		root.appendChild(tmp);

		document.body.appendChild(root);
	}
	buildOut();

	Object.defineProperty(options.namespace, 'JustTest', { value: {} });
	Object.defineProperties(options.namespace.JustTest, {
		createSuite: {
			value: function (options) {
				var suite = new TestSuite(suiteIdGen++, options);
				suites.push(suite);
				return suite;
			}
		},
		createReport: {
			value: function (from) {
				var em = 'parameter must be a TestSuite object or an Array of them';
				if (!from) throw new Error(em);
				if (!Array.isArray(from)) from = [from];
				if (!from.length) throw new Error(em);
				from.forEach(function (one) {
					if (!(one instanceof TestSuite)) throw new Error(em);
				});
				return new Report(from);
			}
		},
		getSuiteById: {
			value: function (id) {
				if (typeof id === 'number') {
					suites.forEach(function (suite) {
						if (suite.id === id) return suite;
					});
				} else {
					throw new Error('id must be a number');
				}
			}
		},
		getSuiteByName: {
			value: function (name) {
				if (typeof id === 'string') {
					suites.forEach(function (suite) {
						if (suite.name === name) return suite;
					});
				} else {
					throw new Error('name must be a string');
				}
			}
		},
		getAllSuites: {
			value: function () {
				return suites.slice(0);
			}
		}
	});
})((typeof arguments === 'object' ? arguments[0] : undefined));