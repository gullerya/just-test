const basePathValidator = /^[a-z]+$/;
export class RequestHandlerBase {
	constructor() {
		const bp = this.basePath;
		if (!bp || typeof bp !== 'string' || !basePathValidator.test(bp)) {
			throw new Error(`extending handler MUST provide basePath as a string matching '${basePathValidator}'`);
		}
	}

	get basePath() {
		return null;
	}

	async handle() {
		throw new Error('implementation missing');
	}
}