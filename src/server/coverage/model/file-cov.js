export default class FileCov {
	constructor(url) {
		this.path = url;
		this.lines = [];
		this.ranges = [];
		Object.seal(this);
	}
}