const { newId } = require('./id');

function buildLogger() {
	let pinoHttp;
	try {
		pinoHttp = require('pino-http');
	} catch (e) {
		// Fallback minimal logger
		return function minimalLogger(req, res, next) {
			req.id = req.headers['x-request-id'] || newId();
			const start = Date.now();
			res.on('finish', () => {
				const dur = Date.now() - start;
				console.log(JSON.stringify({ level: 'info', reqId: req.id, method: req.method, url: req.originalUrl, status: res.statusCode, dur }));
			});
			next();
		};
	}

	return pinoHttp({
		genReqId: (req) => req.headers['x-request-id'] || newId(),
		customLogLevel: (res, err) => (err || res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info'),
	});
}

module.exports = { buildLogger };


