# Setting up CORS for Cloudflare R2

The application is failing to upload images because Cross-Origin Resource Sharing (CORS) is blocked. We tried to fix this automatically, but the available API keys do not have permission to change bucket settings.

## How to Fix Manually

1.  Log in to the **Cloudflare Dashboard**.
2.  Go to **R2** from the sidebar.
3.  Click on your bucket: **`amaplay007-assets`** (or whichever bucket name is in your `.env`).
4.  Go to the **Settings** tab.
5.  Scroll down to **CORS Policy**.
6.  Click **Add CORS Policy** (or Edit).
7.  Paste the following JSON configuration:

```json
[
  {
    "AllowedOrigins": [
      "http://localhost:3000",
      "https://www.amaplayer.com",
      "https://amaplayer.com",
      "https://*.pages.dev"
    ],
    "AllowedMethods": [
      "GET",
      "PUT",
      "POST",
      "DELETE",
      "HEAD"
    ],
    "AllowedHeaders": [
      "*"
    ],
    "ExposeHeaders": [
      "ETag"
    ],
    "MaxAgeSeconds": 3600
  }
]
```

8.  Click **Save**.

Once saved, the "Access to fetch..." error will disappear, and uploads will work immediately.
