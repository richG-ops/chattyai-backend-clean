const { DateTime } = require('luxon');

function toTZ(iso, tz) {
	if (!iso) return null;
	try { return DateTime.fromISO(iso, { zone: 'utc' }).setZone(tz); }
	catch { return null; }
}

function human(iso, tz) {
	const dt = toTZ(iso, tz);
	return dt ? dt.toFormat("ccc, LLL dd • h:mm a") : '';
}

function addMinutes(iso, minutes) {
	try { return DateTime.fromISO(iso).plus({ minutes }).toISO(); }
	catch { return null; }
}

module.exports = { toTZ, human, addMinutes };


