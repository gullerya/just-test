export class RequestHandlerBase {
	constructor() {
		const bup = this.baseUrlPath;
		if (!bup || typeof bup !== 'string' || !bup.length || !bup.startsWith('/') || bup.endsWith('/')) {
			throw new Error('extending handler MUST provide baseUrlPath as a non-null and non-empty string starting starting with "/" and NOT ending with "/"');
		}
	}

	get baseUrlPath() {
		return null;
	}

	async handle(req, res) {
		res.writeHead(500, { 'Content-Type': 'text/plain' });
		res.end('server handler not yet implemented', 'utf-8');
		return true;
	}
}