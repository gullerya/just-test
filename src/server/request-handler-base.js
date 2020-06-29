export class RequestHandlerBase {
	constructor() {
		const basePath = this.basePath;
		if (!basePath || typeof basePath !== 'string' || !basePath.length || !basePath.startsWith('/') || basePath.endsWith('/')) {
			throw new Error(`extending handler MUST provide basePath as a non-null and non-empty starting starting with '/' and NOT ending with '/'`);
		}
	}

	get basePath() {
		return null;
	}

	async handle(req, res) {
		res.writeHead(500, { 'Content-Type': 'text/plain' });
		res.end('server handler not yet implemented', 'utf-8');
		return true;
	}
}