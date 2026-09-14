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

function findByName(files, name) {
  if (!name) return null;
  const wanted = name.trim().toLowerCase();
  const match = files.find((f) => f.name.toLowerCase() === wanted);
  return match ? match.id : null;
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

    // Drive only returns one page of results at a time (up to 1000 with
    // pageSize set), so we loop with pageToken until every photo in the
    // folder has been collected -- otherwise albums over the page limit
    // get silently cut off.
    let allFiles = [];
    let pageToken = null;
    do {
      const photosRes = await drive.files.list({
        q: `'${albumId}' in parents and mimeType contains 'image/' and trashed = false`,
        fields: 'nextPageToken, files(id, name)',
        orderBy: 'name',
        pageSize: 1000,
        pageToken: pageToken || undefined,
      });
      allFiles = allFiles.concat(photosRes.data.files || []);
      pageToken = photosRes.data.nextPageToken || null;
    } while (pageToken);

    const photos = allFiles.map((f) => ({
      id: f.id,
      name: f.name,
      thumb: thumbnailUrl(f.id, 600),
      full: directImageUrl(f.id),
    }));

    let bannerId = findByName(allFiles, meta.banner);
    if (!bannerId) bannerId = findByName(allFiles, meta.cover);
    if (!bannerId && allFiles[0]) bannerId = allFiles[0].id;

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: meta.title || null,
        date: meta.date || null,
        banner: bannerId ? thumbnailUrl(bannerId, 1600) : null,
        photos,
      }),
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
