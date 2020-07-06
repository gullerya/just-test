export class RequestHandlerBase {
	constructor() {
		const bup = this.basePath;
		if (bup !== '/') {
			if (!bup || typeof bup !== 'string' || !bup.length || !bup.startsWith('/') || bup.endsWith('/')) {
				throw new Error('extending handler MUST provide basePath as a non-null and non-empty string starting starting with "/" and NOT ending with "/"');
			}
		}
	}

	get basePath() {
		return null;
	}

	async handle(handlerRelativePath, req, res) {
		throw new Error('implementation missing');
	}
}