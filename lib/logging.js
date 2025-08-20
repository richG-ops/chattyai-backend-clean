const { newId } = require('./id');

function buildLogger() {
	const logLevel = process.env.LOG_LEVEL || 'info';
	
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
				const logData = { 
					level: 'info', 
					reqId: req.id, 
					method: req.method, 
					url: req.originalUrl, 
					status: res.statusCode, 
					dur 
				};
				
				// Add upstream status logging when in debug mode
				if (logLevel === 'debug' && res.locals?.upstreamStatus) {
					logData.upstreamStatus = res.locals.upstreamStatus;
				}
				
				console.log(JSON.stringify(logData));
			});
			next();
		};
	}

	return pinoHttp({
		genReqId: (req) => req.headers['x-request-id'] || newId(),
		customLogLevel: (res, err) => (err || res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info'),
		level: logLevel,
		// Add upstream status to logs when in debug mode
		serializers: logLevel === 'debug' ? {
			req: (req) => ({
				id: req.id,
				method: req.method,
				url: req.url,
				headers: req.headers
			}),
			res: (res) => ({
				statusCode: res.statusCode,
				upstreamStatus: res.locals?.upstreamStatus
			})
		} : undefined
	});
}

// Helper to set upstream status for logging
function setUpstreamStatus(res, status, operation) {
	if (!res.locals) res.locals = {};
	res.locals.upstreamStatus = { status, operation, timestamp: new Date().toISOString() };
}

module.exports = { buildLogger, setUpstreamStatus };


