const
	os = require('os'),
	util = require('util'),
	{ performance } = require('perf_hooks'),
	puppeteer = require('puppeteer'),
	configurer = require('./configurer'),
	localServer = require('./local-server'),
	coverageToLcov = require('./coverage-to-lcov'),
	fsExtra = require('fs-extra');

let
	testResults = {};

//	configuration
const conf = configurer.configuration;

//	main flow runs here, IIF used allow async/await
(async () => {
	const testsUrl = conf.server.local
		? localServer.launch(conf.server.port) + conf.tests.url
		: conf.server.remoteUrl + conf.tests.url;

	console.info('JustTest: tests (AUT) URL resolved to "' + testsUrl + '", launching browsing env...');
	const browser = await puppeteer.launch(), browserDetails = await browser.userAgent();
	console.info('JustTest: ... browsing env launched; details (taken by "userAgent") as following');
	console.info(util.inspect(browserDetails, false, null, true));

	console.info(os.EOL);
	console.info('JustTest: navigating to tests (AUT) URL...');
	const page = await browser.newPage();
	console.info('JustTest: ... tests (AUT) page opened, we are in bussiness :)');

	if (!conf.coverage.skip) {
		await page.coverage.startJSCoverage();
	}

	await page.goto(testsUrl);

	//	wait till all of the tests settled (no running classes), TODO: configurable timeout
	await waitTestsToFinish(page, 0);

	//	analyze test results, create report
	await processTestResults(page);

	if (conf.coverage.skip) {
		return;
	}

	//	analyze coverage, create report
	const
		jsCoverage = await page.coverage.stopJSCoverage(),
		coverageData = {
			tests: [{
				testName: 'anonymous.anonymous',
				coverage: {
					files: []
				}
			}]
		};
	for (const entry of jsCoverage) {
		if (!sourceRelevant()) {
			continue;
		}

		let fileCoverage = {
			path: entry.url.replace('http://localhost:' + port, ''),
			lines: {},
			ranges: []
		};

		//	existing ranges are a COVERED sections
		//	ranges' in-between parts are a NON-COVERED sections
		let positionInCode = 0,
			currentLine = 1;
		entry.ranges.forEach(range => {
			fileCoverage.ranges.push(range);

			//	handle missed section
			if (range.start > positionInCode) {
				let missedCode = entry.text.substring(positionInCode, range.start);
				if (missedCode.indexOf(os.EOL) >= 0) {
					let missedLines = missedCode.split(os.EOL);
					missedLines.forEach(line => {
						if (!/^\s*$/.test(line) && (!fileCoverage.lines[currentLine] || !fileCoverage.lines[currentLine].hits)) {
							fileCoverage.lines[currentLine] = { hits: 0 };
						}
						currentLine++;
					});
					currentLine--;
				} else {
					if (!fileCoverage.lines[currentLine] && !/^\s*$/.test(missedCode)) {
						fileCoverage.lines[currentLine] = { hits: 0 };
					}
				}
			}

			//	handle covered section
			let hitCode = entry.text.substring(range.start, range.end);
			if (hitCode.indexOf(os.EOL) >= 0) {
				let hitLines = hitCode.split(os.EOL);
				if (hitLines[0] === '') {
					hitLines.shift();
					currentLine++;
				}
				hitLines.forEach(line => {
					if (!/^\s*$/.test(line)) {
						fileCoverage.lines[currentLine] = { hits: 1 };
					}
					currentLine++;
				});
				currentLine--;
			} else {
				fileCoverage.lines[currentLine].hits++;
			}

			positionInCode = range.end;
		});
		coverageData.tests[0].coverage.files.push(fileCoverage);
	}
	let lcovReport = coverageToLcov.convert(coverageData);
	fsExtra.outputFileSync(__dirname + '/../reports/coverage.lcov', lcovReport);

	await browser.close();
})()
	.then(() => {
		localServer.stop();
		console.info('test suite/s DONE');
		process.exit(testResults.failed ? 1 : 0);
	})
	.catch(error => {
		localServer.stop();
		console.error('test suite/s run DONE (with error)', error);
		process.exit(1);
	});

async function waitTestsToFinish(page) {
	let started = performance.now(),
		testsDone;

	console.info('waiting for tests to finish...');
	do {
		const elems = await page.$$('just-test-view');
		if (elems.length) {
			testsDone = await (await elems[0].getProperty('done')).jsonValue();
		}
	} while (!testsDone);

	if (testsDone) {
		console.info('tests done in ' + (performance.now() - started) + 'ms');
	} else {
		console.error('timed out after ' + (performance.now() - started) + 'ms');
	}
}

async function processTestResults(page) {
	const jt = (await page.$$('just-test-view'))[0];
	testResults.passed = await (await jt.getProperty('passed')).jsonValue();
	testResults.failed = await (await jt.getProperty('failed')).jsonValue();
	testResults.skipped = await (await jt.getProperty('skipped')).jsonValue();

	console.info('passed: ' + testResults.passed);
	console.info('failed: ' + testResults.failed);
	console.info('skipped: ' + testResults.skipped);
}
