import * as DataTier from '/libs/data-tier/dist/data-tier.min.js';
import './components/jt-control/jt-control.js';
import './components/jt-details/jt-details.js';

start();

async function start() {
	const data = await Promise.all([
		fetch('/api/tests/metadata'),
		fetch('/api/tests/resources')
	])

	if (data[0].ok) {
		const testsMetadata = await data[0].json();
		console.log(testsMetadata);
	}

	if (data[1].ok) {
		const testsResources = await data[1].json();
		console.log(testsResources);
	}
}
