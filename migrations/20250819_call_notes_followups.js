/**
 * Migration: Add call notes and followups tables
 */

exports.up = async function(knex) {
	// calls
	const hasCalls = await knex.schema.hasTable('calls');
	if (!hasCalls) {
		await knex.schema.createTable('calls', (t) => {
			t.uuid('id').primary();
			t.uuid('tenant_id').notNullable();
			t.text('call_sid').notNullable().unique();
			t.text('from_number');
			t.text('to_number');
			t.timestamp('started_at', { useTz: true }).defaultTo(knex.fn.now());
			t.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
		});
	}

	// call_recordings
	const hasRecordings = await knex.schema.hasTable('call_recordings');
	if (!hasRecordings) {
		await knex.schema.createTable('call_recordings', (t) => {
			t.uuid('id').primary();
			t.uuid('call_id').references('id').inTable('calls').onDelete('CASCADE');
			t.text('recording_sid').notNullable().unique();
			t.text('media_url');
			t.integer('duration_seconds');
			t.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
		});
	}

	// call_summaries
	const hasSummaries = await knex.schema.hasTable('call_summaries');
	if (!hasSummaries) {
		await knex.schema.createTable('call_summaries', (t) => {
			t.uuid('id').primary();
			t.uuid('call_id').references('id').inTable('calls').onDelete('CASCADE');
			t.text('transcript');
			t.text('summary');
			t.text('sentiment');
			t.jsonb('classification');
			t.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
		});
	}

	// followups
	const hasFollowups = await knex.schema.hasTable('followups');
	if (!hasFollowups) {
		await knex.schema.createTable('followups', (t) => {
			t.uuid('id').primary();
			t.uuid('tenant_id').notNullable();
			t.uuid('call_id').references('id').inTable('calls').onDelete('SET NULL');
			t.timestamp('when_at', { useTz: true }).notNullable();
			t.text('title');
			t.text('contact_name');
			t.text('contact_phone');
			t.text('contact_email');
			t.text('created_event_id');
			t.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
		});
	}
};

exports.down = async function(knex) {
	// Drop in reverse order
	const dropIfExists = (table) => knex.schema.hasTable(table).then((exists) => exists && knex.schema.dropTable(table));
	await dropIfExists('followups');
	await dropIfExists('call_summaries');
	await dropIfExists('call_recordings');
	await dropIfExists('calls');
};


