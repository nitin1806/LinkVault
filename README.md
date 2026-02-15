# LinkVault

This is a full stack web application that allows users to upload text or files and share them securely with others using a generated link. Access to the uploaded content must be restricted strictly to users who possess the link, similar to link-based access in systems like Google Drive, Pastebin and TinyURL.

Users can:
- upload text or files
- protect links with passwords
- enforce one-time view or max-view limits
- set custom expiry dates
- create an account to manage their links from a dashboard

The stack is:
- `frontend`: React + Vite + Tailwind CSS
- `backend`: Node.js + Express + MongoDB (Mongoose)

## Features

- Share text or file content with short IDs (`/:shareId`)
- Password-protected access (`?password=...`)
- Expiration by date/time
- One-time-view auto-expiry
- Max views auto-expiry
- Manual delete endpoint
- Auth (register/login with JWT)
- User dashboard for viewing created links and toggling active/deactivated status (except expired)
- Background cleanup job (every minute) to mark expired links and remove uploaded files

## How It Works

1. Client uploads content to `POST /api/upload`.
2. Server stores metadata in MongoDB and returns a generated `shareId`.
3. Recipient opens `/<shareId>` on frontend, which fetches `GET /api/content/:id`.
4. Server enforces status checks, expiry checks, password checks, and view limits.
5. Expired/consumed links are soft-deleted in DB (`status: expired`) so dashboard history remains.

## Project Structure

```text
LinkVault/
├── backend/
│   ├── config/db.js
│   ├── controllers/
│   │   ├── authController.js
│   │   └── uploadController.js
│   ├── middleware/auth.js
│   ├── models/
│   │   ├── Upload.js
│   │   └── User.js
│   ├── routes/apiRoutes.js
│   ├── uploads/
│   └── server.js
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Home.jsx
│   │   │   └── ViewContent.jsx
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   └── vite.config.js
└── README.md
```

## Prerequisites

- Node.js 18+ recommended
- npm
- MongoDB running locally or remotely

## Environment Variables

Create `backend/.env`:

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/linkvault
JWT_SECRET=replace_with_a_secure_secret
```

Notes:
- `JWT_SECRET` has a code fallback, but you should set it explicitly in production.
- `FIREBASE_BUCKET_URL` exists in a utility file, but Firebase storage is not used by current upload flow.

## Local Development

Run backend:

```bash
cd backend
npm install
npm run dev
```

Run backend in production mode:

```bash
cd backend
npm start
```

Run frontend (new terminal):

```bash
cd frontend
npm install
npm run dev
```

Open:
- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:5000/api`

## API Overview

Auth:
- `POST /api/auth/register`
- `POST /api/auth/login`

Content:
- `POST /api/upload` (multipart/form-data; optional Bearer token)
- `GET /api/content/:id`
- `DELETE /api/content/:id`

Dashboard (requires Bearer token):
- `GET /api/dashboard/links`
- `PUT /api/dashboard/links/:id/toggle`

## Upload Request Fields

`POST /api/upload` accepts:
- `text` (string) OR `file` 
- `userExpiry` (datetime string, optional)
- `password` (string, optional)
- `oneTimeView` (`true/false`, optional)
- `maxViews` (number, optional)

If no expiry is provided, backend defaults to 10 minutes.

## Data Models

`User`:
- `userId`, `email`, `password`, `createdAt`

`Upload`:
- `shareId`, `type`, `content`, `originalName`, `expireAt`, `createdAt`
- `password`, `oneTimeView`, `views`, `maxViews`
- `creator`, `status` (`active|deactivated|expired`)

## Known Notes

- Frontend API base URL is hardcoded to `http://localhost:5000/api` in `frontend/src/pages/Home.jsx` and `frontend/src/pages/ViewContent.jsx`.
- `DELETE /api/content/:id` does not require authentication in current code.
- Empty component files exist in `frontend/src/components/` and are currently unused.
