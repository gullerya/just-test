export {
	P,
	ready
}

let ready;
let P = globalThis.performance ? performance : null;

if (!P) {
	ready = import('perf_hooks').then(m => {
		P = m.performance;
		return P;
	});
} else {
	ready = Promise.resolve(P);
}