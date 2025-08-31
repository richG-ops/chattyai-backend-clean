const { createClient } = require('redis');

function getRedisUrl(fallbackEnvNames = []) {
	for (const key of fallbackEnvNames) {
		if (process.env[key]) return process.env[key];
	}
	return process.env.REDIS_URL || '';
}

function newRedisClient(opts = {}) {
	const url = getRedisUrl(opts.fallbackEnvNames || []);
	if (!url) throw new Error('REDIS_URL missing');
	const client = createClient({ url, socket: { reconnectStrategy: 1000 } });
	client.on('error', (err) => console.error('Redis error:', err));
	return client;
}

module.exports = { newRedisClient, getRedisUrl };


