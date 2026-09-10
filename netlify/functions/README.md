# Framez Website

Black-and-white photography/videography site. Albums and videos are pulled live from Google Drive through Netlify Functions — nothing is hardcoded.

## 1. Google Drive folder structure

In your Framez Drive account, create two top-level folders:

- **Framez Albums** — one subfolder per photo album (e.g. "Perera Wedding")
- **Framez Videos** — one subfolder per video album (e.g. "Silva Highlight Reel")

Share BOTH top-level folders (Drive automatically shares subfolders too) with your service account's email, as **Viewer**.

Also set each **photo album** subfolder's sharing to "Anyone with the link — Viewer" so the images can actually display in a browser (the folder listing itself still only works for your service account, so random people can't browse Drive directly — they can only see photos inside an album your site links to).

## 2. Photo album folder — `_meta.json`

Inside each photo album subfolder, add a plain text file named exactly `_meta.json` (you can create this in any text editor and upload it to Drive):

```json
{
  "title": "Perera Wedding",
  "locked": true,
  "password": "silverbells24",
  "cover": "IMG_014.jpg",
  "banner": "IMG_002.jpg",
  "date": "16-08-2026"
}
```

- `locked: false` (or no `_meta.json` at all) makes it public.
- The password is only ever checked on the server — it's never sent to the browser unless it's correct.
- Just drop your photos into the same folder. They'll appear automatically, sorted by filename.
- `cover` is optional — set it to the exact filename (including extension, case-sensitive) of the photo inside that same folder you want shown as the album's thumbnail on the gallery page. Leave it out and the first photo alphabetically is used automatically, same as before.
- `banner` is optional — the exact filename of a wide/horizontal photo from that same folder to show full-width at the top of the album page itself, with the title and date over it. Leave it out and it'll use `cover` instead, or the first photo alphabetically if neither is set.
- `date` is optional — any text you want shown under the title on that banner (e.g. `"16-08-2026"`). Leave it out and no date line will show.

## 3. Video album folder — `_meta.json`

Video albums don't hold video files in Drive (Drive isn't built for streaming to visitors). Instead, upload the finished video to YouTube as **Unlisted**, then reference it here:

```json
{
  "title": "Silva Highlight Reel",
  "locked": false,
  "videos": [
    { "title": "Ceremony Highlights", "embedUrl": "https://www.youtube.com/embed/VIDEO_ID" },
    { "title": "Reception", "embedUrl": "https://www.youtube.com/embed/VIDEO_ID_2" }
  ]
}
```

To get an embed URL: on the YouTube video, click Share > Embed, and copy the URL inside `src="..."`.

## 3b. Portfolio folder

The Portfolio page is grouped into five categories, shown as plain photo grids — no albums, no locking, no password. Create a top-level folder called "Framez Portfolio," share it with the service account, then create five subfolders inside it, named **exactly**:

- Events
- School Events
- Birthday
- Graduation
- Portraits

Drop around ten of your best photos into each subfolder. The page pulls all five automatically and shows them in that order; a category with no folder (or no photos yet) is simply skipped.

## 3c. Hero background video (optional)

The homepage hero supports a looping background video. When you have a short clip ready (10–20 seconds, kept small so it loads fast), upload it into the repo at `public/assets/hero.mp4` — same "Add file → Upload files" flow you've used for everything else. The homepage checks for it automatically: if it's there, it plays behind the hero text with a dark overlay for readability; if it's missing, the hero just shows the plain background, so there's nothing to break by leaving it out for now.

## 3d. "What We Shoot" photos

The four cards on the homepage (Events / Birthday / Graduations / Portrait sessions) each show their own photo. Upload four images into the repo at `public/assets/`, using these exact file names so each one lands in the right card:

- `shoot-events.jpg` — Events card
- `shoot-birthday.jpg` — Birthday card
- `shoot-graduations.jpg` — Graduations card
- `shoot-portraits.jpg` — Portrait sessions card

Same "Add file → Upload files" flow as everything else — just make sure the file names match exactly (all lowercase, with the dashes). Until a photo is uploaded, that card just shows an empty grey box where the photo goes, so nothing breaks if you add them one at a time.

## 4. Environment variables (set in Netlify: Site configuration > Environment variables)

| Variable | Value |
|---|---|
| `GOOGLE_SERVICE_ACCOUNT_KEY` | The entire contents of the JSON key file you downloaded |
| `ALBUMS_ROOT_FOLDER_ID` | The folder ID of "Framez Albums" (the string after `/folders/` in its Drive URL) |
| `VIDEOS_ROOT_FOLDER_ID` | The folder ID of "Framez Videos" |
| `PORTFOLIO_FOLDER_ID` | The folder ID of "Framez Portfolio" |
| `PORTFOLIO_FOLDER_ID` | The folder ID of "Framez Portfolio" |

## 5. Deploying

1. Push this folder to a GitHub repo (or drag-and-drop the whole folder into Netlify's deploy screen)
2. In Netlify: "Add new site" > connect the repo (or drag-and-drop)
3. Build settings are already set in `netlify.toml` — no changes needed
4. Add the three environment variables above
5. Deploy — the contact form works automatically (it uses Netlify Forms, submissions show up under Site configuration > Forms)

## 6. Adding a new album later

1. Create a new subfolder in "Framez Albums" (or "Framez Videos")
2. Add a `_meta.json` with a title, and a password if you want it locked
3. Upload the photos (or list video embed links)
4. It appears on the live site within about a minute — no redeploy needed
