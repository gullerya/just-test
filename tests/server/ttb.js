/**
 * isolated TestBox for NodeJS environment
 * - it installs on globalThis everything the test will need to register / run
 * - it communicates via IPC test result to the session runner
 * 
 * env params: URL of the test suite
 */

globalThis.getSuite = (...args) => {
	console.log(args);
};

import('./test-server-utils.js');

process.send();