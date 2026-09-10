const { getDriveClient } = require('./utils/drive');

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
    const albumId = event.queryStringParameters && event.queryStringParameters.id;
    const suppliedPassword = (event.queryStringParameters && event.queryStringParameters.password) || '';
    if (!albumId) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing album id.' }) };
    }

    const drive = getDriveClient();
    const meta = await readMeta(drive, albumId);

    if (meta.locked) {
      if (!meta.password || suppliedPassword !== meta.password) {
        return {
          statusCode: 401,
          body: JSON.stringify({ error: 'This video album is locked.', locked: true }),
        };
      }
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: meta.title || null, videos: meta.videos || [] }),
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
