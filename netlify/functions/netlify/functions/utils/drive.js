const { google } = require('googleapis');

// Reads the service account JSON key from the GOOGLE_SERVICE_ACCOUNT_KEY
// environment variable (set in Netlify: Site configuration > Environment
// variables — paste the *entire* contents of the downloaded key file).
function getDriveClient() {
  const rawKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!rawKey) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY environment variable is not set.');
  }

  let credentials;
  try {
    credentials = JSON.parse(rawKey);
  } catch (err) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY is not valid JSON. Paste the full key file contents.');
  }

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
  });

  return google.drive({ version: 'v3', auth });
}

// Direct-viewable image URL for a Drive file. Requires the file (or its
// parent folder) to be shared as "Anyone with the link — Viewer".
function directImageUrl(fileId) {
  return `https://drive.google.com/uc?export=view&id=${fileId}`;
}

function thumbnailUrl(fileId, size = 800) {
  return `https://drive.google.com/thumbnail?id=${fileId}&sz=w${size}`;
}

module.exports = { getDriveClient, directImageUrl, thumbnailUrl };
