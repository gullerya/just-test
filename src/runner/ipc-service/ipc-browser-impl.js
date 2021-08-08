export {
	sendMessage,
	waitMessage,
	addEventListener
}

function sendMessage(port, message) {
	port.postMessage(message);
}

async function waitMessage(port, messageType, messageId, timeout) {
	return Promise.race([
		new Promise((_, r) => setTimeout(() => r(`waiting for message ${messageId} timed out ${timeout}ms`), timeout)),
		new Promise(r => {
			port.addEventListener('message', message => {
				if (message && message.data && message.data.type === messageType && message.data.mid === messageId) {
					r(message.data);
				}
			}, false);
		})
	]);
}

function addEventListener(port, hander) {
	port.addEventListener('message', hander);
}