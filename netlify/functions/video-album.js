const { getDriveClient } = require('./utils/drive');

// Turns a normal YouTube URL (watch, youtu.be, shorts) into an embeddable
// https://www.youtube.com/embed/VIDEO_ID link. Returns null if no video ID
// could be found, so a bad/broken link can be skipped instead of breaking
// the whole album.
function toEmbedUrl(rawUrl) {
  try {
    const url = new URL(rawUrl);
    let videoId = null;

    if (url.hostname.includes('youtu.be')) {
      videoId = url.pathname.slice(1);
    } else if (url.pathname.startsWith('/shorts/')) {
      videoId = url.pathname.split('/shorts/')[1];
    } else {
      videoId = url.searchParams.get('v');
    }

    if (!videoId) return null;
    videoId = videoId.split('&')[0].split('?')[0];
    return 'https://www.youtube.com/embed/' + videoId;
  } catch (err) {
    return null;
  }
}

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

    const rawVideos = Array.isArray(meta.videos) ? meta.videos : [];
    const videos = rawVideos
      .map((v) => {
        // Support both plain URL strings and {url, title} objects in _meta.json.
        const rawUrl = typeof v === 'string' ? v : v.url;
        const title = typeof v === 'string' ? null : v.title || null;
        const embedUrl = toEmbedUrl(rawUrl);
        return embedUrl ? { embedUrl, title } : null;
      })
      .filter(Boolean);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: meta.title || null, videos }),
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
