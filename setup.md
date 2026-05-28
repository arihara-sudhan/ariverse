# Ariverse Setup Guide

This project is a Next.js app (`next@16`) with Neon Postgres and Vercel Blob integrations.

## 1) Prerequisites

- Node.js 20+ (LTS recommended)
- npm 10+
- Git

Check versions:

```powershell
node -v
npm -v
git --version
```

## 2) Clone and install

```powershell
git clone <your-repo-url>
cd ariverse_
npm install
```

## 3) Configure environment variables

Create a `.env` file in the project root:

```env
VITE_YOUTUBE_API_KEY=your_youtube_api_key
BLOB_READ_WRITE_TOKEN=your_vercel_blob_token
DATABASE_URL=your_neon_database_url
ADMIN_PASSWORD=your_admin_password
ADMIN_SESSION_SECRET=replace_with_a_long_random_secret
DB_INIT_TIMEOUT_MS=12000
DB_CONNECT_TIMEOUT_MS=3500
```

Notes:

- `DATABASE_URL` should include `?sslmode=require` for Neon.
- Use a strong random `ADMIN_SESSION_SECRET` (32+ chars).
- Do not commit `.env`.

## 4) Run locally

```powershell
npm run dev
```

Open:

- http://localhost:3000

## 5) Build and run production locally

```powershell
npm run build
npm run start
```

## 6) Useful scripts

- `npm run dev` - start development server
- `npm run build` - production build
- `npm run start` - run built app
- `npm run migrate:kavithai-images` - migrate kavithai images to blob
- `npm run migrate:assets` - migrate assets to blob
- `npm run migrate:mini-project-pngs` - migrate mini project PNGs to blob
- `npm run blob:download` - download blob assets to local

## 7) Troubleshooting

- If install fails on image tooling, reinstall with:

```powershell
npm rebuild sharp
```

- If DB connection fails:
1. Verify `DATABASE_URL` is correct.
2. Confirm Neon project/network access.
3. Keep `sslmode=require` in the connection string.

