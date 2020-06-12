export default class RequestHandlerBase {
	handle(req, res) {
		res.writeHead(500, { 'Content-Type': 'text/plain' });
		res.end('server handler not yet implemented', 'utf-8');
	}
}