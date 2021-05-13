export {
	P
}

let ready;
let P = globalThis.performance ? performance : null;

if (!P) {
	ready = import('perf_hooks');
	ready.then(m => P = m.performance);
} else {
	ready = Promise.resolve(P);
}