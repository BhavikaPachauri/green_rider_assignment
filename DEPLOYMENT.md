# Deployment Checklist

This repo is a monorepo:

- Backend service: `Backend`
- Vercel app: `frontend`

## Backend On Render

Create a Render Web Service from this repository.

Use these settings:

```txt
Root Directory: Backend
Build Command: npm install && npm run render-build
Start Command: npm run start
Health Check Path: /health
```

Important: use `Backend` with a capital `B`. Render runs on Linux, where folder names are case-sensitive.

Add these environment variables in Render:

```env
DATABASE_URL=mysql://USER:PASSWORD@HOST:PORT/DATABASE
JWT_ACCESS_SECRET=replace-with-a-long-random-secret
JWT_REFRESH_SECRET=replace-with-another-long-random-secret
CORS_ORIGINS=https://your-vercel-app.vercel.app
```

If your hosted MySQL provider requires SSL, also add:

```env
DATABASE_SSL=true
DATABASE_SSL_CA=optional-ca-certificate-with-\n-line-breaks
DATABASE_SSL_ALLOW_UNAUTHORIZED=false
```

Only set `DATABASE_SSL_ALLOW_UNAUTHORIZED=true` as a last resort when your database requires SSL but does not provide a CA certificate.

After Render deploys, test:

```txt
https://your-render-backend.onrender.com/health
```

## Frontend On Vercel

Create a Vercel project from this repository.

Use these settings:

```txt
Root Directory: frontend
Build Command: npm run build
```

Add this environment variable in Vercel:

```env
NEXT_PUBLIC_API_BASE_URL=https://your-render-backend.onrender.com
```

Do not include `/auth` at the end of the URL.

Correct:

```env
NEXT_PUBLIC_API_BASE_URL=https://your-render-backend.onrender.com
```

Wrong:

```env
NEXT_PUBLIC_API_BASE_URL=https://your-render-backend.onrender.com/auth
```

After changing Vercel env vars, redeploy the frontend.
