export {
	perfReady
}

let perfReady;

if (globalThis.performance) {
	perfReady = Promise.resolve(globalThis.performance);
} else {
	perfReady = import('perf_hooks').then(m => m.performance);
}