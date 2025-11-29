export default Object.freeze({
	ssl: false,
	hostname: 'localhost',
	port: 3000,
	handlers: [
		'./handlers/api-request-handler.ts',
		'./handlers/core-request-handler.ts',
		'./handlers/libs-request-handler.ts',
		'./handlers/static-request-handler.ts',
		'./handlers/ui-request-handler.ts'
	]
});