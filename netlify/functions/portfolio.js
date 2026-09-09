const { getDriveClient, thumbnailUrl } = require('./utils/drive');

// Fixed display order — folder names inside "Framez Portfolio" should match these exactly.
const CATEGORY_ORDER = ['Events', 'School Events', 'Birthday', 'Graduation', 'Portraits'];

exports.handler = async function () {
  try {
    const rootId = process.env.PORTFOLIO_FOLDER_ID;
    if (!rootId) throw new Error('PORTFOLIO_FOLDER_ID environment variable is not set.');

    const drive = getDriveClient();

    // Find the category subfolders inside the portfolio root folder.
    const folderRes = await drive.files.list({
      q: `'${rootId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
      fields: 'files(id, name)',
    });

    const foldersByName = {};
    folderRes.data.files.forEach((f) => {
      foldersByName[f.name.trim().toLowerCase()] = f;
    });

    const categories = [];

    for (const name of CATEGORY_ORDER) {
      const folder = foldersByName[name.toLowerCase()];
      if (!folder) continue;

      const photoRes = await drive.files.list({
        q: `'${folder.id}' in parents and mimeType contains 'image/' and trashed = false`,
        fields: 'files(id, name)',
        orderBy: 'name',
      });

      const photos = photoRes.data.files.map((f) => ({
        id: f.id,
        name: f.name,
        thumb: thumbnailUrl(f.id, 700),
      }));

      categories.push({ name, photos });
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=60' },
      body: JSON.stringify({ categories }),
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
