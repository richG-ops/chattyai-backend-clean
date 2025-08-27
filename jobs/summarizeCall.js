const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { getDb } = require('../db-config');
const { newId } = require('../lib/id');

function redact(str) {
	if (!str) return str;
	return String(str).replace(/(\+?\d{0,})(\d{4})$/, '***$2');
}

async function downloadRecording(recordingUrl, callSid, recordingSid) {
	const url = recordingUrl.endsWith('.mp3') ? recordingUrl : `${recordingUrl}.mp3`;
	const outPath = path.join('/tmp', `${recordingSid}.mp3`);
	const auth = {
		username: process.env.TWILIO_ACCOUNT_SID || '',
		password: process.env.TWILIO_AUTH_TOKEN || '',
	};
	const response = await axios.get(url, { responseType: 'stream', auth });
	await new Promise((resolve, reject) => {
		const ws = fs.createWriteStream(outPath);
		response.data.pipe(ws);
		ws.on('finish', resolve);
		ws.on('error', reject);
	});
	return outPath;
}

async function transcribe(tmpPath) {
	const OpenAI = require('openai');
	const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
	const transcript = await openai.audio.transcriptions.create({
		file: fs.createReadStream(tmpPath),
		model: 'whisper-1',
	});
	return transcript?.text || '';
}

async function summarize(transcript) {
	const OpenAI = require('openai');
	const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
	const sys = `You are an assistant that writes brief, actionable call notes.
Output STRICT JSON with keys: summary (2-5 sentences), sentiment (positive|neutral|negative), classification { interested: boolean, call_back_at?: ISO, not_interested?: boolean, issues?: string[] }.`;
	const user = `Transcript:\n"""${transcript.substring(0, 8000)}"""`;
	const resp = await openai.chat.completions.create({
		model: 'gpt-4o-mini',
		messages: [
			{ role: 'system', content: sys },
			{ role: 'user', content: user },
		],
		temperature: 0.2,
	});
	const content = resp.choices?.[0]?.message?.content || '{}';
	try { return JSON.parse(content); } catch { return { summary: '', sentiment: 'neutral', classification: {} }; }
}

async function handler(job) {
	const { callSid, recordingSid, recordingUrl, from, to, tenantId } = job.data || {};
	const db = getDb();
	const context = { callSid, recordingSid, from: redact(from), to: redact(to) };
	try {
		const tmpPath = await downloadRecording(recordingUrl, callSid, recordingSid);
		const transcript = await transcribe(tmpPath);
		const summary = await summarize(transcript);

		// Find call id
		const call = await db('calls').where({ call_sid: callSid }).first();
		if (!call) throw new Error('call_not_found');

		// Insert summary (one per call)
		const existing = await db('call_summaries').where({ call_id: call.id }).first();
		if (!existing) {
			await db('call_summaries').insert({
				id: newId(),
				call_id: call.id,
				transcript: transcript || null,
				summary: summary.summary || '',
				sentiment: summary.sentiment || 'neutral',
				classification: JSON.stringify(summary.classification || {}),
			});
		}
		try { fs.unlinkSync(tmpPath); } catch {}
		return { ok: true };
	} catch (err) {
		console.error('summarizeCall error:', err.message, context);
		if (global.Sentry) global.Sentry.captureException(err, { tags: { job: 'summarize_call' }, extra: context });
		throw err;
	}
}

module.exports = { handler };


