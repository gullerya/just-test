import * as os from 'node:os';
import * as fs from 'node:fs/promises';
import * as process from 'node:process';
import * as path from 'node:path';
import { start, stop } from './server/cli.ts';
import { xUnitReporter } from './testing/testing-service.ts';
import { collectTargetSources, lcovReporter } from './coverage/coverage-service.ts';
import { buildJTFileCov } from './coverage/model/model-utils.ts';
import { normalizeCoverageUrl } from './coverage/model/url-utils.ts';
import { getTestId } from './common/interop-utils.ts';
import { Session } from './testing/model/session.ts';
import { OrchestratorClient } from './server/orchestrator-client.ts';

if (process.argv[1] && process.argv[1].endsWith('local-runner.js')) {
	go();
}

const SESSION_STATUS_POLL_INTERVAL = 137;
const SESSION_WAIT_TIMEOUT_MS = 30 * 60 * 1000;

async function go() {
	const startTime = globalThis.performance.now();
	const clArguments = parseCLArgs(process.argv);
	console.info(`Starting local run...`);
	console.info(`${'='.repeat(64)}${os.EOL}`);

	let server;
	let sessionResult;
	let endedWithFailure = false;
	try {
		//	TODO: spawn out the server in a separate process
		server = await start();

		// long running async operation
		sessionResult = await executeSession(server.baseUrl, clArguments);
		endedWithFailure = !sessionResult.summary.success;
	} catch (error) {
		console.error(os.EOL);
		console.error(error);
		console.error(os.EOL);
		endedWithFailure = true;
	} finally {
		if (server && server.isRunning) {
			await stop();
		}

		const duration = ((globalThis.performance.now() - startTime) / 1000).toFixed(1);

		console.info(`${os.EOL}${'='.repeat(64)}`);
		console.info(`... local run finished${os.EOL}`);
		if (sessionResult) {
			console.info('TESTS SUMMARY');
			console.info('=============');
			console.info(`TOTAL: ${sessionResult.total}`);
			console.info(`PASS: ${sessionResult.pass}`);
			console.info(`FAIL: ${sessionResult.fail}`);
			console.info(`ERROR: ${sessionResult.error}`);
			console.info(`SKIP: ${sessionResult.skip}${os.EOL}`);
			console.info(`SESSION SUMMARY: ${endedWithFailure
				? `FAILURE (${sessionResult.summary.failReason})`
				: 'SUCCESS'} (${duration}s)${os.EOL}`);
			if (sessionResult.errors && sessionResult.errors.length > 0) {
				console.info('SESSION ERRORS');
				console.info('==============');
				sessionResult.errors.forEach(e => console.info(`- ${JSON.stringify(e)}`));
				console.info(os.EOL);
			}
			process.exit(endedWithFailure ? 1 : 0);
		} else {
			console.info(`SESSION SUMMARY: FAILURE (${duration}s), see errors in the log above${os.EOL}`);
			process.exit(1);
		}
	}
}

function parseCLArgs(args): Record<string, string> {
	const result = {} as Record<string, string>;
	if (Array.isArray(args)) {
		for (let i = 0; i < args.length; i++) {
			if (args[i].includes('=')) {
				const [key, val] = args[i].split('=');
				if (key in result) {
					throw new Error(`duplicate key '${key}'`);
				}
				result[key] = val;
			}
		}
	}
	return result;
}

async function executeSession(serverBaseUrl, clArguments: Record<string, string>) {
	const config: any = await readConfigAndMergeWithCLArguments(clArguments);
	const client = new OrchestratorClient(serverBaseUrl);
	const { sessionId } = await client.createSession(config);
	const sessionResult: Session & { summary: any } = (await waitSessionEnd(client, sessionId)) as any;

	//	test report
	const reportText = xUnitReporter.report(sessionResult);
	await fs.writeFile('reports/results.xml', reportText, { encoding: 'utf-8' });

	//	coverage report
	const testCoverages = sessionResult.suites
		.flatMap(s => s.tests.map(t => ({ suiteName: s.name, test: t })))
		.map(({ suiteName, test: t }) => {
			return t && t.lastRun && t.lastRun.coverage
				? {
					testId: getTestId(suiteName, t.name),
					coverage: t.lastRun.coverage
				}
				: null;
		})
		.filter(Boolean);

	//	iframe/worker modes can't attribute coverage per-test, so the
	//	session-box collapses it onto `session.coverage`; emit it as a
	//	synthetic `__session__` lcov record
	const sessionCoverage = (sessionResult as any).coverage;
	if (Array.isArray(sessionCoverage) && sessionCoverage.length) {
		testCoverages.push({ testId: '__session__', coverage: sessionCoverage });
	}

	const targetSources = await collectTargetSources(config.environments[0].coverage);
	const coveredUrls = new Set(
		testCoverages
			.flatMap(tc => tc.coverage)
			.map(fc => normalizeCoverageUrl(fc.url))
	);
	const fileCoverages = await Promise.all(
		targetSources
			.filter(ts => !coveredUrls.has(normalizeCoverageUrl(ts)))
			.map(ts => buildJTFileCov(ts, false))
	);
	const covContent = lcovReporter.convert({ testCoverages, fileCoverages } as any);
	await fs.rm('reports/coverage.lcov', { force: true, recursive: true });
	if (covContent) {
		await fs.mkdir('reports', { recursive: true });
		await fs.writeFile('reports/coverage.lcov', covContent, { encoding: 'utf-8' });
	}

	//	analysis
	sessionResult.summary = {
		success: true,
		failReason: null
	};
	const maxFail = config.environments[0].tests.maxFail;
	const maxSkip = config.environments[0].tests.maxSkip;
	if ((sessionResult.fail + sessionResult.error) > maxFail) {
		sessionResult.summary.success = false;
		sessionResult.summary.failReason = `failing due to too many failures/errors; max allowed: ${maxFail}, found: ${sessionResult.fail + sessionResult.error}`;
	} else if (sessionResult.skip > maxSkip) {
		sessionResult.summary.success = false;
		sessionResult.summary.failReason = `failing due to too many skips; max allowed: ${maxSkip}, found: ${sessionResult.skip}`;
	}

	return sessionResult;
}

//	TODO: this is done in the cli as well, refactor to avoid code duplication
async function readConfigAndMergeWithCLArguments(clArguments: Record<string, string>): Promise<object> {
	if (!clArguments || !clArguments.config_file || typeof clArguments.config_file !== 'string') {
		throw new Error(`invalid config_file argument (${clArguments?.config_file})`);
	}

	const configPath = path.resolve(process.cwd(), clArguments.config_file);
	const config = await import(configPath);

	if (clArguments.files) {
		return applyFilesOverride(config.default, clArguments.files);
	}
	return config.default;
}

//	`files=<pattern>` is a strict override: replaces `tests.include` with
//	the given single entry (either a concrete path or a glob, matched by
//	the same library used for `tests.include`) and clears `tests.exclude`
//	on every environment. The user is opting out of guardrail excludes
//	to run exactly what they asked for.
export function applyFilesOverride(config: any, filesPattern: string): object {
	if (!filesPattern || typeof filesPattern !== 'string') {
		throw new Error(`'files' argument MUST be a non-empty string, got '${filesPattern}'`);
	}
	if (!config || typeof config !== 'object' || !Array.isArray(config.environments)) {
		throw new Error(`config MUST have an 'environments' array to apply files override`);
	}
	const next = {
		...config,
		environments: config.environments.map((env: any) => ({
			...env,
			tests: {
				...(env.tests ?? {}),
				include: [filesPattern],
				exclude: []
			}
		}))
	};
	return next;
}

async function waitSessionEnd(client: OrchestratorClient, sessionId: string): Promise<Session> {
	const deadline = Date.now() + SESSION_WAIT_TIMEOUT_MS;

	return new Promise((resolve, reject) => {
		const p = async () => {
			if (Date.now() > deadline) {
				reject(new Error(`session '${sessionId}' result poll timed out after ${SESSION_WAIT_TIMEOUT_MS}ms`));
				return;
			}
			const poll = await client.pollSessionResult(sessionId);
			if (poll.ready) {
				resolve(poll.result);
			} else {
				setTimeout(() => p().catch(reject), SESSION_STATUS_POLL_INTERVAL);
			}
		};
		p().catch(reject);
	});
}