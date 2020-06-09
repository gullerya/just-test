export default class FileCov {
	constructor(path, text) {
		this.path = path;
		this.text = text;
		this.lines = [];
		this.ranges = [];
	}
}