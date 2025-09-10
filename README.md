# FantasyLab

Full-stack app (Express + MongoDB + React/Vite). This repo is prepared for:

- Backend API on Railway
- Frontend on Netlify

## 1. Backend (Railway)

1. Create new Railway project -> Deploy from GitHub repo.
2. Add a service from the `server` folder if Railway asks for root, set build command automatically (Node). Ensure Root Directory = `server`.
3. Set environment variables (Settings > Variables):
   - MONGO_URI = your Mongo connection string
   - JWT_SECRET = long random string
   - CORS_ORIGIN = https://your-netlify-site.netlify.app (no trailing slash)
4. (Optional) Set PORT if needed; Railway usually injects one.
5. Deploy. Note the public URL (e.g. https://your-api.up.railway.app).
6. Test: curl https://your-api.up.railway.app/api/health

## 2. Frontend (Netlify)

1. New Site from Git -> select repository.
2. Base directory: `web`
3. Build command: `npm run build`
4. Publish directory: `dist`
5. Environment variable: VITE_API_BASE = https://your-api.up.railway.app/api
6. Deploy.
7. Confirm CSP / network calls succeed (no blocked fonts). If API is different origin ensure netlify.toml connect-src includes Railway host.

## 3. Local Development

Backend:

```
cd server
npm install
npm run dev
```

Frontend:

```
cd web
npm install
npm run dev
```

Create `.env` files from the provided `.env.example` templates.

## 4. API Base Logic

Frontend uses: `import.meta.env.VITE_API_BASE || '/api'`.

- When hosting separately (Netlify + Railway) you MUST set VITE_API_BASE.
- When reverse-proxying behind a single domain you can omit and just proxy /api to server.

## 5. Security Headers

- API: helmet sets CSP (Google Fonts + connect-src for frontend origin).
- Frontend: `netlify.toml` adds matching CSP + security headers.
  Update the Railway host in both places when deploying.

## 6. Environment Reference

See `server/.env.example` and `web/.env.example`.

## 7. Troubleshooting

- Fonts blocked: ensure both CSP headers include fonts.googleapis.com and fonts.gstatic.com plus correct connect-src.
- 404 API calls: likely missing VITE_API_BASE on Netlify.
- CORS error: ensure CORS_ORIGIN matches exact Netlify URL (no slash at end).

## 8. Future Enhancements

- Add rate limiting (express-rate-limit).
- Add logging aggregation.
- Add automated tests.

---

Deployment ready.
