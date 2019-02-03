import WillCall = require('will-call');

const call = new WillCall();

export default call;

process.on('exit', () => {
	const uncalled = call.check();
	if (uncalled.length === 0) {
		return;
	}

	const msg = uncalled
		.map(x =>
			`Expected "${x.name}" to be called ${x.expected} time(s), was ${x.actual}`
			+ `\n    ${x.stack.split('\n')[0].trim()}`
		)
		.join('\n');

	if (uncalled.length === 1) {
		throw new Error(msg);
	}

	process.stderr.write('Not all functions were called before exit.');
	process.stderr.write('\n' + msg + '\n');
	process.exitCode = 1;
});
