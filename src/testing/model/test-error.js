export class TestError {
	constructor(name, type, message, stacktrace) {
		this.name = name;
		this.type = type;
		this.message = message;
		this.stacktrace = stacktrace;
		Object.seal(this);
	}
}