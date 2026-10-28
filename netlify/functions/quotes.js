// Private storage for quotations/invoices. Needs the ADMIN_PASSWORD environment variable in Netlify.
const { getStore, connectLambda } = require('@netlify/blobs');
const { safeEqual } = require('./utils/security');

async function run(event) {
  connectLambda(event);
  // no-store: quotes and invoices must never be kept in any cache
  const json = (c, b) => ({ statusCode: c, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, body: JSON.stringify(b) });
  const pw = process.env.ADMIN_PASSWORD;
  const store = getStore('framez-docs');
  // Lock out a person after 5 wrong passwords (30 minutes)
  const ip = String((event.headers['x-nf-client-connection-ip'] || event.headers['x-forwarded-for'] || 'x')).split(',')[0].trim().replace(/[^0-9a-fA-F:.]/g, '_');
  const failKey = 'fail-' + ip, WAIT = 30 * 60 * 1000;
  const f = (await store.get(failKey, { type: 'json' })) || { n: 0, t: 0 };
  if (f.n >= 5 && Date.now() - f.t < WAIT) return json(429, { error: 'Too many wrong tries. Please try again in 30 minutes.' });
  if (!pw || !safeEqual(event.headers['x-admin-password'] || '', pw)) {
    f.n = (Date.now() - f.t > WAIT ? 0 : f.n) + 1; f.t = Date.now();
    await store.setJSON(failKey, f);
    return json(401, { error: 'Wrong password.' });
  }
  if (f.n) await store.delete(failKey);

  const q = event.queryStringParameters || {};

  if (event.httpMethod === 'GET') {
    if (q.asset === 'signature') return json(200, { data: require('./utils/signature') });
    if (q.number) {
      if (!/^\d{1,8}$/.test(q.number)) return json(400, { error: 'Bad number' });
      const d = await store.get('doc-' + q.number, { type: 'json' });
      return d ? json(200, d) : json(404, { error: 'Not found' });
    }
    const { blobs } = await store.list({ prefix: 'doc-' });
    const docs = (await Promise.all(blobs.map((b) => store.get(b.key, { type: 'json' })))).filter(Boolean);
    docs.sort((a, b) => (a.number < b.number ? 1 : -1));
    const next = String(((await store.get('counter', { type: 'json' })) || 500) + 1).padStart(5, '0');
    return json(200, { next, list: docs.map((d) => ({ number: d.number, client: d.client, event: d.forLines && d.forLines[0], date: d.date, total: d.total, invoiced: !!d.invoiced })) });
  }

  if (event.httpMethod === 'POST') {
    if ((event.body || '').length > 200000) return json(413, { error: 'Too large' });
    let doc;
    try { doc = JSON.parse(event.body).doc; } catch (e) { return json(400, { error: 'Bad data' }); }
    if (!doc || typeof doc !== 'object' || Array.isArray(doc)) return json(400, { error: 'No data' });
    const n = parseInt(doc.number, 10);
    if (!n || n < 1 || n > 9999999) return json(400, { error: 'Quote number needed' });
    doc.number = String(n).padStart(5, '0');
    await store.setJSON('doc-' + doc.number, doc);
    const c = (await store.get('counter', { type: 'json' })) || 500;
    if (n > c) await store.setJSON('counter', n);
    return json(200, { ok: true, number: doc.number });
  }
  return json(405, { error: 'Not allowed' });
}

exports.handler = async (event) => {
  try {
    return await run(event);
  } catch (err) {
    console.error(err);
    return { statusCode: 500, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, body: JSON.stringify({ error: 'Something went wrong.' }) };
  }
};
