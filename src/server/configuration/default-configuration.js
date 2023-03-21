export default Object.freeze({
	ssl: false,
	hostname: 'localhost',
	port: 3000,
	handlers: [
		'./handlers/api-request-handler.js',
		'./handlers/aut-request-handler.js',
		'./handlers/core-request-handler.js',
		'./handlers/libs-request-handler.js',
		'./handlers/tests-request-handler.js',
		'./handlers/ui-request-handler.js'
	]
});