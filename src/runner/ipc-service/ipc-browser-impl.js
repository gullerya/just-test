export {
	sendMessage,
	waitMessage
}

function sendMessage(processObject, message) {
	processObject.postMessage(message);
}

async function waitMessage(processObject, messageId, timeout) {
	return Promise.race([
		new Promise((_, r) => setTimeout(() => r(`waiting for message ${messageId} timed out ${timeout}ms`), timeout)),
		new Promise(r => {
			processObject.addEventListener('message', message => {
				if (message && message.data && message.data.mid === messageId) {
					r(message.data);
				}
			}, false);
		})
	]);
}
