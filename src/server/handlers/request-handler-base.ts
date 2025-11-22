import { IncomingMessage, ServerResponse } from 'node:http';

const basePathValidator = /^[a-z-_]+$/;

export class RequestHandlerBase {
	constructor() {
		const bp = this.basePath;
		if (!bp || typeof bp !== 'string' || !basePathValidator.test(bp)) {
			throw new Error(`extending handler MUST provide basePath as a string matching '${basePathValidator}'`);
		}
	}

	get basePath(): string {
		return '';
	}

	async handle(handlerRelativePath: string, req: IncomingMessage, res: ServerResponse): Promise<void> {
		throw new Error('implementation missing');
	}
}