# LinkVault

This is a full stack web application that allows users to upload text or files and share them securely with others using a generated link. Access to the uploaded content must be restricted strictly to users who possess the link, similar to link-based access in systems like Google Drive, Pastebin and TinyURL.

## Setup Instructions

### Prerequisites

- Node.js 18+
- npm
- MongoDB instance (local or hosted)

### 1. Backend setup

```bash
cd backend
npm install
```

Create `backend/.env`: if not present

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/linkvault
JWT_SECRET=replace_with_a_long_random_secret
```

Start backend:

```bash
# development
npm run dev

# production
npm start
```

Backend runs on `http://localhost:5000`.

### 2. Frontend setup

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:5173`.

### 3. Usage flow

1. Open the frontend at `http://localhost:5173`.
2. Upload text or a file.
3. Share the generated link (`/<shareId>`).
4. Open that link to view or download content.

## API Overview

Base URL: `http://localhost:5000/api`

### Auth

- `POST /auth/register`
- Body: `{ "userId": "john123", "email": "john@example.com", "password": "secret" }`
- Response: `{ "token": "...", "userId": "john123" }`

- `POST /auth/login`
- Body: `{ "loginId": "john123_or_email", "password": "secret" }`
- Response: `{ "token": "...", "userId": "john123" }`

### Content

- `POST /upload`
- Content type: `multipart/form-data`
- Fields:
- `text` (string) or `file` (binary) is required
- `userExpiry` (ISO datetime, optional)
- `password` (string, optional)
- `oneTimeView` (`"true"` or `"false"`, optional)
- `maxViews` (number, optional)
- Auth: optional `Authorization: Bearer <token>`
- Response: `{ "success": true, "shareId": "abc123...", "expiresAt": "..." }`

- `GET /content/:id`
- Query: `?password=<value>` if link is protected
- Response includes:
- `type`, `content`, `originalName`, `createdAt`, `expireAt`
- `oneTimeView`, `views`, `maxViews`, `protected`

- `DELETE /content/:id`
- Marks content as expired/deleted (soft delete behavior)
- Current implementation does not require authentication

### Dashboard (Bearer token required)

- `GET /dashboard/links`
- Returns links created by authenticated user, including active/deactivated/expired

- `PUT /dashboard/links/:id/toggle`
- Toggles status between `active` and `deactivated`
- Expired links cannot be reactivated

## Design Decisions

- `shareId` is generated with `nanoid(10)` to avoid sequential/publicly guessable numeric IDs.
- Upload entries are soft-deleted (`status = expired`) instead of removing DB records, so dashboard history remains visible.
- File cleanup is handled in two places:
- immediate cleanup during fetch/delete for links that become invalid
- scheduled cleanup job (`node-cron`, every minute) for time-based expiry
- Authentication is JWT-based with:
- `protect` middleware for required auth routes
- `optionalAuth` middleware for guest + logged-in uploads
- Upload storage currently uses local disk (`backend/uploads`) via `multer`.
- View limiting is enforced server-side after each successful access:
- one-time links expire after first view
- `maxViews` links expire when threshold is reached

## Assumptions and Limitations

- Frontend API URL is hardcoded to `http://localhost:5000/api` in `frontend/src/pages/Home.jsx` and `frontend/src/pages/ViewContent.jsx`.
- Local file storage is used; there is no active cloud storage path in the current upload flow.
- `DELETE /api/content/:id` is unauthenticated, so anyone with the link can delete that content.
- No rate limiting or abuse protection is implemented on auth or content endpoints.
- Access control is link possession (and optional password), not ACL/user-level permissions per link.
- Expiry cleanup runs every minute, so already-expired items may exist briefly until fetched or cron executes.
- There is minimal input validation for file type/size and expiry bounds.
- Error responses are simple and not standardized under a shared error schema.
