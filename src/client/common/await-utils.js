export {
	waitNextTask,
	waitMillis,
}

function waitNextTask() {
	return new Promise(resolve => setTimeout(resolve, 0));
}

function waitMillis(millis) {
	return new Promise(resolve => setTimeout(resolve, millis));
}