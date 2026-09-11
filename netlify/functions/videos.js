const { getDriveClient, thumbnailUrl } = require('./utils/drive');

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

exports.handler = async function () {
  try {
    const rootId = process.env.VIDEOS_ROOT_FOLDER_ID;
    if (!rootId) throw new Error('VIDEOS_ROOT_FOLDER_ID environment variable is not set.');

    const drive = getDriveClient();

    const foldersRes = await drive.files.list({
      q: `'${rootId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
      fields: 'files(id, name)',
      orderBy: 'name',
    });

    const albums = [];
    for (const folder of foldersRes.data.files) {
      const meta = await readMeta(drive, folder.id).catch(() => ({}));

      let coverUrl = null;
      if (meta.cover) {
        const imagesRes = await drive.files.list({
          q: `'${folder.id}' in parents and mimeType contains 'image/' and trashed = false`,
          fields: 'files(id, name)',
        });
        const wanted = meta.cover.trim().toLowerCase();
        const match = imagesRes.data.files.find((f) => f.name.toLowerCase() === wanted);
        if (match) coverUrl = thumbnailUrl(match.id, 600);
      }

      albums.push({
        id: folder.id,
        title: meta.title || folder.name,
        locked: !!meta.locked,
        count: Array.isArray(meta.videos) ? meta.videos.length : 0,
        cover: coverUrl,
      });
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=60' },
      body: JSON.stringify({ albums }),
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
