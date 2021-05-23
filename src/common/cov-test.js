const some = 'some';

export {
	topLevel
}

function topLevel() {
	let a = 1;

	const innerLambda = () => { };

	const promise = new Promise(r => {
		r();
	});
}