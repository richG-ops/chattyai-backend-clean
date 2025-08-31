const { z } = require('zod');

const availabilityQuery = z.object({
	from: z.string().optional(),
	to: z.string().optional(),
});

const bookBody = z.object({
	startISO: z.string(),
	endISO: z.string().optional(),
	title: z.string().optional(),
	customer: z.object({
		name: z.string().optional(),
		phone: z.string().optional(),
		email: z.string().optional(),
	}).optional(),
});

module.exports = { availabilityQuery, bookBody };


