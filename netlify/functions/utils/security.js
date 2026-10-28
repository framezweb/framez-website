const crypto = require('crypto');
const { getStore, connectLambda } = require('@netlify/blobs');

// Compares two secrets without leaking, through timing, how many characters matched.
function safeEqual(a, b) {
  const x = crypto.createHash('sha256').update(String(a)).digest();
  const y = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(x, y);
}

// ---- Wrong-password limiter for locked albums (per visitor + per album) ----
const MAX_TRIES = 8;                    // wrong tries allowed...
const WINDOW_MS = 15 * 60 * 1000;       // ...every 15 minutes

function clientIp(event) {
  const h = event.headers || {};
  return String(h['x-nf-client-connection-ip'] || h['x-forwarded-for'] || 'unknown')
    .split(',')[0].trim().replace(/[^0-9a-fA-F:.]/g, '_');
}
function failKey(event, scope) {
  return ('fail-' + String(scope).replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 80) + '-' + clientIp(event)).slice(0, 180);
}
function limiterStore(event) {
  connectLambda(event);
  return getStore('framez-limits');
}

// If the limiter itself has a problem we let the visitor through (and log it),
// so a storage hiccup can never lock real clients out of their photos.
async function isBlocked(event, scope) {
  try {
    const store = limiterStore(event);
    const f = await store.get(failKey(event, scope), { type: 'json' });
    return !!f && f.n >= MAX_TRIES && Date.now() - f.t < WINDOW_MS;
  } catch (e) { console.error('limiter read failed:', e.message); return false; }
}
async function recordFail(event, scope) {
  try {
    const store = limiterStore(event);
    const key = failKey(event, scope);
    const f = (await store.get(key, { type: 'json' })) || { n: 0, t: 0 };
    f.n = (Date.now() - f.t > WINDOW_MS ? 0 : f.n) + 1;
    f.t = Date.now();
    await store.setJSON(key, f);
  } catch (e) { console.error('limiter write failed:', e.message); }
}

const TOO_MANY = {
  statusCode: 429,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ error: 'Too many wrong tries. Please wait 15 minutes and try again.', tooMany: true }),
};

module.exports = { safeEqual, isBlocked, recordFail, TOO_MANY };
