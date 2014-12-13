(function (options) {
	'use strict';

	var api = {}, jtView, consts = {}, themes = {}, suites = [], suitesQueue = Promise.resolve();

	Object.defineProperties(consts, {
		DEFAULT_SUITE_NAME: { value: 'unnamed' },
		DEFAULT_TEST_TTL: { value: 5000 },
		RUNNING: { value: '#66f' },
		PASSED: { value: '#4f2' },
		FAILED: { value: '#f77' },
		SKIPPED: { value: '#666' }
	});

	themes.dark = {};
	themes.light = {};

	if (!options || typeof options !== 'object') { options = {}; }
	if (!options.namespace || typeof options.namespace !== 'object') {
		if (typeof window.Utils !== 'object') Object.defineProperty(window, 'Utils', { value: {} });
		options.namespace = window.Utils;
	}
	if (!(options.theme in themes)) options.theme = 'dark';
	if (!('configUrl' in options)) options.configUrl = 'config.js';

	//	TODO: create css rules by the selected theme and use only classes in the code below

	//	TODO: add option to customize the default behaviour
	function stringifyDuration(durMS) {
		return durMS.toFixed(2) + 'ms';
		//return (durMS / 1000).toFixed(2) + 's';
	}

	function Test(options, executor) {
		var id, name, async, skip, ttl, status = 'pending', message, duration, beg, end, view;
		id = 'id' in options ? options.id : undefined;
		name = 'name' in options ? options.name : 'not descripted';
		async = typeof options.async === 'boolean' ? options.async : false;
		skip = typeof options.skip === 'boolean' ? options.skip : false;
		ttl = typeof options.ttl === 'number' ? options.ttl : consts.DEFAULT_TEST_TTL;

		(function createView() {
			var tmp;
			view = document.createElement('div');
			view.style.cssText = 'position:relative;height:25px;margin:10px 5px 10px 30px;font:17px Tahoma';

			tmp = document.createElement('div');
			tmp.classList.add('name');
			tmp.style.cssText = 'position:absolute;left:0px;width:500px;overflow:hidden;white-space:nowrap;cursor:default';
			tmp.textContent = name;
			view.appendChild(tmp);

			tmp = document.createElement('div');
			tmp.classList.add('duration');
			tmp.style.cssText = 'position:absolute;right:100px;color:#bbb;cursor:default';
			view.appendChild(tmp);

			tmp = document.createElement('div');
			tmp.classList.add('status');
			tmp.style.cssText = 'position:absolute;right:0px;cursor:default';
			tmp.textContent = status;
			tmp.onclick = function () {
				console.log('Expanding result: ' + message);
			};
			view.appendChild(tmp);
		})();

		function reset() {
			//	TODO: add reset logic
		}

		function run() {
			var testPromise, timeoutWatcher;
			status = 'running';
			view.querySelector('.status').textContent = status;
			view.querySelector('.status').style.color = consts.RUNNING;
			function finalize(res, msg) {
				timeoutWatcher && clearInterval(timeoutWatcher);
				end = performance.now();
				message = msg;
				status = res;
				duration = end - beg;

				view.querySelector('.duration').textContent = stringifyDuration(duration);
				view.querySelector('.status').textContent = status;
				view.querySelector('.status').style.color = status === 'passed' ? consts.PASSED : (status === 'skipped' ? consts.SKIPPED : consts.FAILED);
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
			name: { get: function () { return name; } },
			async: { get: function () { return async; } },
			skip: { get: function () { return skip; } },
			ttl: { get: function () { return ttl; } },
			run: { value: run },
			reset: { value: reset },

			status: { get: function () { return status; } },
			message: { get: function () { return message; } },
			started: { get: function () { return beg; } },
			duration: { get: function () { return duration; } },

			view: { get: function () { return view; } }
		});
	}

	function Suite(options) {
		var id, name, visible, tests = [], passed = 0, failed = 0, skipped = 0, status = 'pending', duration, beg, end, view, tmp;
		options = typeof options === 'object' ? options : {};
		if ('id' in options) id = options.id;
		name = 'name' in options ? options.name : consts.DEFAULT_SUITE_NAME;
		visible = !(options.hidden === true);

		view = document.createElement('div');
		view.style.cssText = 'position:relative;width:100%;height:auto;margin:10px 0px 30px';

		tmp = document.createElement('div');
		tmp.classList.add('header');
		tmp.style.cssText = 'position:relative;height:26px;margin:0px 5px;border-bottom:1px solid #ccc;cursor:default';
		view.appendChild(tmp);

		tmp = document.createElement('div');
		tmp.classList.add('title');
		tmp.style.cssText = 'position:absolute;width:340px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;cursor:default';
		tmp.textContent = name;
		view.querySelector('.header').appendChild(tmp);

		tmp = document.createElement('div');
		tmp.classList.add('counters');
		tmp.style.cssText = 'position:absolute;top:0px;left:350px;font-family:monospace;cursor:default';
		tmp.innerHTML = '<span class="passed" style="color:' + consts.PASSED + '">0</span> | <span class="failed" style="color:' + consts.FAILED + '">0</span> | <span class="skipped" style="color:' + consts.SKIPPED + '">0</span> of <span class="total">0</span>';
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

		function addTest(options, executor) {
			var em = 'bad parameters: must be 1 or 2 where the last one is a function', test;
			if (arguments.length < 1 || arguments.length > 2) throw new Error(em);
			if (arguments.length === 1) {
				executor = arguments[0];
				options = {};
			}
			if (typeof executor !== 'function') { throw new Error(em); }
			test = new Test(options, executor);
			view.appendChild(test.view);
			tests.push(test);
			return test;
		}

		function reset() {
			//	TODO: reset the suite results on demand
		}

		function run() {
			view.querySelector('.status').textContent = status;
			view.querySelector('.total').textContent = tests.length;
			function finalize() {
				end = performance.now();
				duration = end - beg;
				view.querySelector('.header > .duration').textContent = stringifyDuration(duration);
				if (failed > 0) {
					status = 'failed';
					view.querySelector('.status').textContent = status;
					view.querySelector('.status').style.color = status === 'passed' ? consts.PASSED : consts.FAILED;
				} else {
					status = 'passed';
					view.querySelector('.status').textContent = status;
					view.querySelector('.status').style.color = status === 'passed' ? consts.PASSED : consts.FAILED;
				}
			}

			return new Promise(function (resolve, reject) {
				var asyncFlow = Promise.resolve();

				status = 'running';
				view.querySelector('.status').textContent = status;
				view.querySelector('.status').style.color = consts.RUNNING;

				beg = performance.now();

				if (!tests.length) { finalize(); resolve(); }
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
		}

		Object.defineProperties(this, {
			id: { get: function () { return id; } },
			name: { get: function () { return name; } },
			visible: { get: function () { return visible; } },
			view: { get: function () { return view; } },
			addTest: { value: addTest },
			reset: { value: reset },
			run: { value: run },
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

	function minimize(button) {
		var r = document.getElementById('JustTestView'), b = document.getElementById('JustTestViewToggle');
		r.querySelector('#JustTestViewSummary').style.display = 'none';
		r.style.height = '35px';
		r.style.width = '180px';
		b.textContent = '\u25bc';
	}

	function maximize(button) {
		var r = document.getElementById('JustTestView'), b = document.getElementById('JustTestViewToggle');
		r.style.height = '800px';
		r.style.width = '800px';
		b.textContent = '\u25b2';
		r.querySelector('#JustTestViewSummary').style.display = 'block';
	}

	function buildView() {
		var root, tmp, startX, startY, startLeft, startTop, tmpMMH, tmpMUH;
		root = document.createElement('div');
		root.id = 'JustTestView';
		root.style.cssText = 'position:fixed;top:50px;left:350px;height:800px;width:800px;background-color:#000;color:#fff;opacity:.7;border-radius:7px;overflow:hidden;transition: width .2s, height .2s';

		tmp = document.createElement('div');
		tmp.id = 'JustTestViewTitle';
		tmp.style.cssText = 'position:absolute;top:0px;height:40px;left:5px;right:40px;font:bold 27px Tahoma;cursor:default;box-sizing:border-box';
		tmp.textContent = 'JustTest';
		tmp.onmousedown = function (event) {
			tmpMMH = document.onmousemove;
			tmpMUH = document.onmouseup;
			startX = event.clientX;
			startY = event.clientY;
			startLeft = root.offsetLeft;
			startTop = root.offsetTop;

			document.onmousemove = function (event) {
				var top = startTop + event.clientY - startY, left = startLeft + event.clientX - startX;
				top = top < 0 ? 0 : top;
				left = left < 0 ? 0 : left;
				top = document.documentElement.clientHeight - top - 35 < 0 ? document.documentElement.clientHeight - 35 : top;
				left = document.documentElement.clientWidth - left - 180 < 0 ? document.documentElement.clientWidth - 180 : left;
				root.style.top = top + 'px';
				root.style.left = left + 'px';
				event.preventDefault();
			};
			document.onmouseleave = document.onmouseup = function (event) {
				document.onmousemove = tmpMMH;
			};

		};
		root.appendChild(tmp);

		tmp = document.createElement('div');
		tmp.id = 'JustTestViewToggle';
		tmp.style.cssText = 'position:absolute;right:9px;top:3px;font:25px monospace;cursor:default';
		tmp.textContent = '\u25b2';
		tmp.onclick = function () {
			if (this.textContent === '\u25b2') { minimize(); } else { maximize(); }
		}
		root.appendChild(tmp);

		jtView = document.createElement('div');
		jtView.style.cssText = 'position:absolute;top:40px;bottom:32px;width:100%;border-top:3px solid #fff;overflow-x:hidden;overflow-y:scroll';
		root.appendChild(jtView);

		tmp = document.createElement('div');
		tmp.id = 'JustTestViewSummary';
		tmp.style.cssText = 'position:absolute;bottom:0px;left:0px;width:100%;height:32px;padding:0px 5px;font:22px Tahoma;border-top:3px solid #fff;cursor:default;box-sizing:border-box';
		tmp.textContent = 'Summary: ';
		root.appendChild(tmp);

		document.body.appendChild(root);
	}
	buildView();

	Object.defineProperties(api, {
		View: { value: {} },
		createSuite: {
			value: function (options) {
				var s = new Suite(options);
				suites.push(s);
				s.visible && jtView.appendChild(s.view);
				return s;
			}
		}
	});
	Object.defineProperties(api.View, {
		minimize: { value: minimize },
		maximize: { value: maximize }
	});
	Object.defineProperty(options.namespace, 'JustTest', { value: api });
})((typeof arguments === 'object' ? arguments[0] : undefined));