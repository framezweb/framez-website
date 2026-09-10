const { getDriveClient, directImageUrl, thumbnailUrl } = require('./utils/drive');

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

async function findByName(drive, folderId, name) {
  if (!name) return null;
  const res = await drive.files.list({
    q: `'${folderId}' in parents and mimeType contains 'image/' and trashed = false and name = '${name.replace(/'/g, "\\'")}'`,
    fields: 'files(id)',
    pageSize: 1,
  });
  return res.data.files[0] ? res.data.files[0].id : null;
}

exports.handler = async function (event) {
  try {
    const albumId = event.queryStringParameters && event.queryStringParameters.id;
    const suppliedPassword = (event.queryStringParameters && event.queryStringParameters.password) || '';
    if (!albumId) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing album id.' }) };
    }

    const drive = getDriveClient();
    const meta = await readMeta(drive, albumId);

    // The password itself is stored only in the private _meta.json file in
    // Drive and never sent to the browser — only this pass/fail result is.
    if (meta.locked) {
      if (!meta.password || suppliedPassword !== meta.password) {
        return {
          statusCode: 401,
          body: JSON.stringify({ error: 'This album is locked.', locked: true }),
        };
      }
    }

    const photosRes = await drive.files.list({
      q: `'${albumId}' in parents and mimeType contains 'image/' and trashed = false`,
      fields: 'files(id, name)',
      orderBy: 'name',
    });

    const photos = photosRes.data.files.map((f) => ({
      id: f.id,
      name: f.name,
      thumb: thumbnailUrl(f.id, 600),
      full: directImageUrl(f.id),
    }));

    let bannerId = await findByName(drive, albumId, meta.banner);
    if (!bannerId) bannerId = await findByName(drive, albumId, meta.cover);
    if (!bannerId && photosRes.data.files[0]) bannerId = photosRes.data.files[0].id;

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: meta.title || null,
        date: meta.date || null,
        banner: bannerId ? directImageUrl(bannerId) : null,
        photos,
      }),
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
