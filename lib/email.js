const DEFAULT_FROM = process.env.FROM_EMAIL || 'no-reply@chattyai.com';
let emailEnabled = !!process.env.SENDGRID_API_KEY;
let _send = async () => {};

if (emailEnabled) {
	try {
		const sgMail = require('@sendgrid/mail');
		sgMail.setApiKey(process.env.SENDGRID_API_KEY);
		_send = async ({ to, subject, text, html, from = DEFAULT_FROM, cc, bcc }) => {
			await sgMail.send({ to, from, subject, text, html, cc, bcc });
		};
	} catch (e) {
		console.error('Email adapter: @sendgrid/mail not installed; disabling email.', e.message);
		emailEnabled = false;
	}
}

async function sendEmail(msg) {
	try { await _send(msg); } catch (err) { console.error('Email send error:', err?.message || err); }
}

module.exports = { sendEmail, emailEnabled, DEFAULT_FROM };


