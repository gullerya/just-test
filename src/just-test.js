(function (options) {
	'use strict';

	var out, themes = {}, suites = [], suitesQueue = Promise.resolve(), DEFAULT_TEST_TTL = 5000, RUNNING = '#bbf', PASSED = '#4f2', FAILED = '#f77', SKIPPED = '#aaa';

	themes.dark = {
		//	key value pairs of css rules and their values
	};
	themes.light = {

	};

	if (!options || typeof options !== 'object') { options = {}; }
	if (!options.namespace || typeof options.namespace !== 'object') {
		if (typeof window.Utils !== 'object') Object.defineProperty(window, 'Utils', { value: {} });
		options.namespace = window.Utils;
	}
	if (!(options.theme in themes)) options.theme = 'dark';

	//	TODO: create css rules by the selected theme and use only classes in the code below

	//	TODO: add option to customize the default behaviour
	function stringifyDuration(durMS) {
		return durMS.toFixed(2) + 'ms';
		//return (durMS / 1000).toFixed(2) + 's';
	}

	function Test(options, executor) {
		var id, description, async, skip, ttl, status = 'pending', message, duration, beg, end, view;
		id = 'id' in options ? options.id : undefined;
		description = 'description' in options ? options.description : 'not descripted';
		async = typeof options.async === 'boolean' ? options.async : false;
		skip = typeof options.skip === 'boolean' ? options.skip : false;
		ttl = typeof options.ttl === 'number' ? options.ttl : DEFAULT_TEST_TTL;

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
			tmp.classList.add('duration');
			tmp.style.cssText = 'position:absolute;right:100px;color:#bbb';
			view.appendChild(tmp);

			tmp = document.createElement('div');
			tmp.classList.add('status');
			tmp.style.cssText = 'position:absolute;right:0px';
			tmp.textContent = status;
			view.appendChild(tmp);
		})();

		function run() {
			var testPromise, timeoutWatcher;
			status = 'running';
			view.querySelector('.status').textContent = status;
			view.querySelector('.status').style.color = RUNNING;
			function finalize(res, msg) {
				timeoutWatcher && clearInterval(timeoutWatcher);
				end = performance.now();
				message = msg;
				status = res;
				duration = end - beg;

				view.querySelector('.duration').textContent = stringifyDuration(duration);
				view.querySelector('.status').textContent = status;
				view.querySelector('.status').style.color = status === 'passed' ? PASSED : (status === 'skipped' ? SKIPPED : FAILED);
			}
			beg = performance.now();
			if (skip) {
				finalize('skipped', '');
				return Promise.resolve();
			} else {
				testPromise = new Promise(function (resolve, reject) {
					if (!async) {
						timeoutWatcher = setTimeout(function () {
							reject(new Error('timeout'));
						}, ttl);
					}
					executor(resolve, reject);
				});
				testPromise.then(function (msg) {
					finalize('passed', msg);
				}, function (msg) {
					finalize('failed', msg);
				});
				return testPromise;
			}
		}

		Object.defineProperties(this, {
			id: { get: function () { return id; } },
			description: { get: function () { return description; } },
			async: { get: function () { return async; } },
			skip: { get: function () { return skip; } },
			ttl: { get: function () { return ttl; } },
			run: { value: run },

			status: { get: function () { return status; } },
			message: { get: function () { return message; } },
			started: { get: function () { return beg; } },
			duration: { get: function () { return duration; } },

			view: { get: function () { return view; } }
		});
	}

	function Suite(options) {
		var id, name, cases = [], passed = 0, failed = 0, skipped = 0, status = 'pending', duration, beg, end, view, tmp;
		if (id in options) id = options.id;
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
		tmp.style.cssText = 'position:absolute;top:0px;left:300px;font-family:monospace';
		tmp.innerHTML = '<span class="passed" style="color:' + PASSED + '">0</span> | <span class="failed" style="color:' + FAILED + '">0</span> | <span class="skipped" style="color:' + SKIPPED + '">0</span> of <span class="total">0</span>';
		view.querySelector('.header').appendChild(tmp);

		tmp = document.createElement('div');
		tmp.classList.add('duration');
		tmp.style.cssText = 'position:absolute;right:100px';
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

		function createTest(options, executor) {
			var em = 'bad parameters: must be 1 or 2 where the last one is a function', test;
			if (arguments.length < 1 || arguments.length > 2) throw new Error(em);
			if (arguments.length === 1) {
				executor = arguments[0];
				options = {};
			}
			if (typeof executor !== 'function') { throw new Error(em); }
			test = new Test(options, executor);
			view.appendChild(test.view);
			cases.push(test);
			return test;
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

					beg = performance.now();

					if (!cases.length) { throw new Error('empty suite can not be run'); }
					(function iterate(index) {
						var test, testPromise;
						if (index === cases.length) {
							asyncFlow.then(function () {

								end = performance.now();
								duration = end - beg;
								view.querySelector('.header > .duration').textContent = stringifyDuration(duration);

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
							test = cases[index++];
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
			});
		}

		Object.defineProperties(this, {
			id: { value: id },
			createTest: { value: createTest },
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
		root.style.cssText = 'position:fixed;top:50px;left:350px;height:800px;width:800px;background-color:#000;color:#fff;opacity:.7;border:2px solid #444;border-radius:7px;overflow:hidden;transition: width .3s, height .3s';

		tmp = document.createElement('div');
		tmp.id = 'JustTestOutTitle';
		tmp.style.cssText = 'position:absolute;top:0px;height:40px;left:5px;right:40px;font:28px Tahoma;cursor:default;box-sizing:border-box';
		tmp.textContent = 'JustTest';
		tmp.onmousedown = function (event) {
			tmpMMH = document.onmousemove;
			tmpMUH = document.onmouseup;
			offsetX = event.layerX;
			offsetY = event.layerY;
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
				var suite = new Suite(options);
				suites.push(suite);
				return suite;
			}
		},
		createReport: {
			value: function (from) {
				var em = 'parameter must be a Suite object or an Array of them';
				if (!from) throw new Error(em);
				if (!Array.isArray(from)) from = [from];
				if (!from.length) throw new Error(em);
				from.forEach(function (one) {
					if (!(one instanceof Suite)) throw new Error(em);
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