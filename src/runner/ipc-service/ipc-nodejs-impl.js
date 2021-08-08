export {
	sendMessage,
	waitMessage,
	addMessageListener
}

function sendMessage(processObject, message) {
	processObject.send(message);
}

async function waitMessage(processObject, messageType, messageId, timeout) {
	return Promise.race([
		new Promise((_, r) => setTimeout(() => r(`waiting for message ${messageId} timed out ${timeout}ms`), timeout)),
		new Promise(r => {
			processObject.on('message', message => {
				if (message && message.data && message.data.type === messageType && message.data.mid === messageId) {
					r(message.data);
				}
			}, false);
		})
	]);
}

function addMessageListener(processObject, handler) {
	processObject.on('message', handler);
}