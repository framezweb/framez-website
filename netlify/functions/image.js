const { getDriveClient } = require('./utils/drive');
const { safeEqual, isBlocked, recordFail, TOO_MANY } = require('./utils/security');

// Serves a resized Drive photo through your own site, with caching, so
// previews don't depend on Google's thumbnail links.
// Usage: /api/image?id=FILE_ID&w=600[&album=ALBUM_ID&password=PASS]

async function readMeta(drive, folderId) {
  const res = await drive.files.list({
    q: `'${folderId}' in parents and name = '_meta.json' and trashed = false`,
    fields: 'files(id)',
  });
  if (!res.data.files.length) return {};
  const fileId = res.data.files[0].id;
  const content = await drive.files.get({ fileId, alt: 'media' }, { responseType: 'json' });
  return content.data || {};
}

exports.handler = async function (event) {
  try {
    const q = event.queryStringParameters || {};
    const id = q.id;
    const albumId = /^[A-Za-z0-9_-]*$/.test(q.album || '') ? (q.album || '') : '';
    const password = q.password || '';
    let width = parseInt(q.w, 10) || 600;
    if (width < 100) width = 100;
    if (width > 2000) width = 2000;

    if (!id || !/^[A-Za-z0-9_-]+$/.test(id)) {
      return { statusCode: 400, body: 'Missing or bad image id.' };
    }

    const drive = getDriveClient();

    // If this photo belongs to a locked album, only serve it with the right password.
    if (albumId) {
      const meta = await readMeta(drive, albumId);
      if (meta.locked) {
        if (password && (await isBlocked(event, albumId))) return TOO_MANY;
        if (!meta.password || !password || !safeEqual(password, meta.password)) {
          if (password) await recordFail(event, albumId);
          return { statusCode: 401, body: 'This album is locked.' };
        }
      }
    }

    // Ask Drive for its thumbnail link using the service account, then download it.
    const info = await drive.files.get({ fileId: id, fields: 'thumbnailLink,mimeType' });
    let thumb = info.data.thumbnailLink;
    let buffer;
    let contentType = 'image/jpeg';

    if (thumb) {
      thumb = thumb.replace(/=s\d+$/, '=w' + width);
      const r = await fetch(thumb);
      if (!r.ok) throw new Error('Thumbnail fetch failed: ' + r.status);
      buffer = Buffer.from(await r.arrayBuffer());
      contentType = r.headers.get('content-type') || 'image/jpeg';
    } else {
      const r = await drive.files.get({ fileId: id, alt: 'media' }, { responseType: 'arraybuffer' });
      buffer = Buffer.from(r.data);
      contentType = info.data.mimeType || 'image/jpeg';
    }

    // Netlify functions can return about 6 MB; stay safely under it.
    if (buffer.length > 5 * 1024 * 1024) {
      return { statusCode: 413, body: 'Image too large.' };
    }

    const locked = !!albumId && !!password;
    return {
      statusCode: 200,
      isBase64Encoded: true,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': locked ? 'private, max-age=86400' : 'public, max-age=604800, s-maxage=604800',
        ...(locked ? {} : { 'Netlify-CDN-Cache-Control': 'public, s-maxage=604800, stale-while-revalidate=86400' }),
      },
      body: buffer.toString('base64'),
    };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: 'Image error.' };
  }
};
