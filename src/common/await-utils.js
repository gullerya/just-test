export {
	waitNextTask,
	waitInterval,
}

function waitInterval(millis) {
	return new Promise(resolve => setTimeout(resolve, millis));
}

function waitNextTask() {
	return waitInterval(0);
}