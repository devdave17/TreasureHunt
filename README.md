# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is enabled on this template. See [this documentation](https://react.dev/learn/react-compiler) for more information.

Note: This will impact Vite dev & build performances.

## Admin Panel Security

Admin APIs are protected by a token middleware. Route name alone is not security.

1. Copy `.env.example` to `.env`
2. Set values for `ADMIN_API_TOKEN`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`, and `PLAYER_MASTER_PASSWORD`
3. Start backend: `node server.js`
4. Start frontend: `npm run dev`
5. Open admin UI at `/admin.html`
6. Login with `ADMIN_USERNAME` and `ADMIN_PASSWORD`

Without a valid token, `/admin/*` APIs return `401 Unauthorized`.

## Deployment Notes

For Render, set the backend env vars `MONGO_URI` or `MONGODB_URI`, `MONGO_DB_NAME` or `MONGODB_DB`, `ADMIN_API_TOKEN`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`, and `PLAYER_MASTER_PASSWORD`.

For Vercel, set `VITE_API_BASE_URL` to the Render backend URL so the frontend talks to the deployed API instead of `localhost`.

This repo uses a separate admin entrypoint, so direct navigation to `/admin` is rewritten to `/admin.html` through `vercel.json`.

## Bulk Insert Users

You can insert multiple users in one request.

### 1) JSON Body Bulk Import

POST `/admin/users/bulk`

Payload example:

```json
{
	"users": [
		{ "email": "a@example.com", "name": "A", "level": 1 },
		{ "email": "b@example.com", "name": "B", "level": 2 }
	]
}
```

### 2) Seed From File

POST `/admin/users/seed`

This imports users from `data/defaultUsers.json`.

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
