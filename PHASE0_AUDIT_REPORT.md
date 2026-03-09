# PHASE 0 — FULL PROJECT AUDIT REPORT

---

## 1. Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19.2 + TypeScript, React Router 7.9, Tailwind CSS, Framer Motion |
| **Backend** | Node.js + Express 4.18, plain JS (no TypeScript compilation) |
| **Database** | MongoDB Atlas (Mongoose 7.5 ODM) |
| **Real-time** | Socket.io 4.7 (server) / 4.8 (client) |
| **Image Storage** | Cloudinary (upload_stream API) |
| **Auth** | JWT (jsonwebtoken 9), bcryptjs for hashing |
| **Build** | Create React App (react-scripts 5), Nodemon for dev |
| **Deployment** | Vercel (frontend), Render (backend) |

---

## 2. Database Schema Summary

### Collection: `users`
| Field | Type | Constraints |
|---|---|---|
| `_id` | ObjectId | PK (auto) |
| `name` | String | required, trimmed |
| `email` | String | required, **unique**, lowercase, regex-validated |
| `password` | String | required, min 6 chars, `select: false` |
| `role` | String | enum: `admin`, `auctioneer` (default: `auctioneer`) |
| `isActive` | Boolean | default: `true` |
| `accessExpiry` | Date | nullable (null = unlimited) |
| `limits.maxPlayers` | Number | nullable |
| `limits.maxTeams` | Number | nullable |
| `limits.maxAuctions` | Number | nullable |
| `usage.totalPlayers` | Number | default: 0 |
| `usage.totalTeams` | Number | default: 0 |
| `usage.totalAuctions` | Number | default: 0 |
| `lastLogin` | Date | |
| `registrationToken` | String | **unique + sparse** |
| `createdAt` | Date | auto |

**Indexes:** `email`, `role`, `isActive`, `registrationToken`

### Collection: `players`
| Field | Type | Constraints |
|---|---|---|
| `_id` | ObjectId | PK (auto) |
| `name` | String | required, trimmed |
| `regNo` | String | **not required, not unique** (schema-level) |
| `class` | String | required, trimmed |
| `position` | String | required, trimmed |
| `photoUrl` | String | required |
| `status` | String | enum: `available`, `sold`, `unsold` (default: `available`) |
| `team` | ObjectId | FK → `teams`, nullable |
| `soldAmount` | Number | default: 0 |
| `auctioneer` | ObjectId | FK → `users`, **indexed**, not required |
| `customFields` | Map<String, Mixed> | default: empty |
| `createdAt` | Date | auto |

**Indexes:** `status`, `team`, `regNo`, `{status, team}`, `{auctioneer, status}`, `{auctioneer, createdAt}`

### Collection: `teams`
| Field | Type | Constraints |
|---|---|---|
| `_id` | ObjectId | PK (auto) |
| `name` | String | required, trimmed |
| `logoUrl` | String | default: `''` |
| `totalSlots` | Number | required, min: 1 |
| `filledSlots` | Number | default: 0 |
| `budget` | Number | nullable |
| `remainingBudget` | Number | nullable |
| `players` | [ObjectId] | FK → `players` |
| `auctioneer` | ObjectId | FK → `users`, required, **indexed** |
| `createdAt` | Date | auto |

**Indexes:** `{name, auctioneer}` **unique compound**, `auctioneer`, `{auctioneer, createdAt}`, `{auctioneer, name}`

### Collection: `formconfigs`
| Field | Type | Constraints |
|---|---|---|
| `_id` | ObjectId | PK (auto) |
| `auctioneer` | ObjectId | FK → `users`, required, **indexed** |
| `sportType` | String | required, default: `general` |
| `formTitle` | String | default: `Player Registration` |
| `formDescription` | String | |
| `fields` | [FieldSchema] | embedded subdocs (fieldName, fieldLabel, fieldType, required, order, options, validation) |
| `createdAt` / `updatedAt` | Date | |

### Collection: `appconfigs`
| Field | Type | Constraints |
|---|---|---|
| `_id` | ObjectId | PK (auto) |
| `auctioneer` | ObjectId | FK → `users`, required, **unique**, **indexed** |
| `branding.title` | String | max 50 chars |
| `branding.subtitle` | String | max 100 chars |
| `branding.logoUrl` | String | |

---

## 3. How Register Number (`regNo`) Is Currently Used

- **NOT a primary key** — MongoDB `_id` (ObjectId) is the PK everywhere.
- **NOT unique at schema level** — `player.model.js` line 10: `unique: false`, `required: false`.
- **NOT a foreign key** anywhere — no collection references `regNo`.
- **Uniqueness enforced only in application code** — Controllers check for duplicate `regNo` per auctioneer before creating, but there is no database-level unique index.
- **Auto-generated** if not provided — format `P0001`, `P0002`, etc., based on scanning all existing regNos for the auctioneer and incrementing. Has a collision fallback using timestamp modulo.
- **Indexed** on `regNo` field (non-unique index for lookup performance).
- **Used for display purposes** on cards, results, and the edit modal.

---

## 4. Real-time Architecture

**Transport:** Socket.io over WebSocket (with polling fallback).

**Room-based isolation:** Each auctioneer gets a room named `auctioneer_{userId}`. On connect, the client emits `joinAuctioneer` with the user ID, and the server calls `socket.join()`.

**Events emitted by server (to auctioneer room):**

| Event | Trigger |
|---|---|
| `playerAdded` | New player registered/created |
| `playerUpdated` | Player edited, photo uploaded |
| `playerSold` | Player assigned to team |
| `playerMarkedUnsold` | Player marked unsold |
| `playerDeleted` | Player deleted |
| `playerRemovedFromTeam` | Player removed from team |
| `teamCreated` / `teamUpdated` / `teamDeleted` | Team CRUD |
| `dataReset` / `playersCleared` / `teamsCleared` | Bulk deletion |
| `bidPlaced` / `auctionStarted` | Live auction (client-to-server-to-clients relay) |

**Keep-alive mechanisms (client-side):**
- Heartbeat every 10s
- Wake Lock API for screen
- Visibility change handler for tab switches
- localStorage touch every 5s
- API ping every 45s
- Socket `pingTimeout: 300000ms`, `pingInterval: 20000ms`

**Limitation:** There is no server-side auction state machine. Bidding (`placeBid`, `startAuction`) is purely relayed — the server broadcasts what the client sends with no validation, persistence, or conflict resolution.

---

## 5. Image Handling

**Upload path:** Client → multer (memory storage, 5MB limit) → Cloudinary upload_stream → store `secure_url` in MongoDB.

**Two upload patterns:**

1. **Registration (`registerPlayer`):** Synchronous — waits for Cloudinary upload before saving player. Transformation: 600×600 limit, auto quality, WebP.

2. **Admin create (`createPlayer`):** Async background upload — saves player immediately with a placeholder URL (`via.placeholder.com`), then uploads to Cloudinary in background and emits `playerUpdated` when done.

**Team logos:** Uploaded to `team-logos/` folder on Cloudinary, 200×200 limit, eco quality, WebP.

**App logos:** Uploaded to `app-logos/` folder, 200×200 limit, auto quality.

**Deletion:** `resetAuctioneerData` in admin controller attempts to delete Cloudinary assets but references `player.photo` and `team.logo` instead of `player.photoUrl` and `team.logoUrl` — these property names are **wrong** so Cloudinary deletion always silently fails.

---

## 6. Form Builder

**Storage:** `FormConfig` document per auctioneer with embedded `fields` array. Each field has `fieldName`, `fieldLabel`, `fieldType` (text/number/select/file/textarea/date/email/tel), `required`, `options`, `order`, `validation`.

**Templates:** 4 hardcoded sport templates (cricket, football, basketball, general) defined in `formConfig.controller.js`.

**Rendering:** `PlayerRegistrationPage` fetches the form config by registration token (public endpoint), then dynamically renders form fields. Custom field values are stored in the player's `customFields` Map.

**Validation:** Server-side only checks that `name` and `photo` fields exist. No pattern/min/max validation enforcement at runtime despite the schema supporting it.

**Display settings:** Stored in localStorage per browser via `useDisplaySettings` hook. Up to 3 custom fields can be shown on auction cards, with one optional "high priority" highlight.

---

## 7. Identified Bugs

### CRITICAL

| # | Bug | File | Line(s) |
|---|---|---|---|
| **B1** | **Privilege escalation: Anyone can register as admin.** The register endpoint accepts `role` from request body: `role: role \|\| 'auctioneer'`. A malicious user can POST `{"role": "admin"}` to gain full admin access. | `backend/controllers/auth.controller.js` | 34 |
| **B2** | **Socket room join silently fails.** Backend auth response sends `id: user._id`, but `socket.ts` checks for `user._id` or `user.userId` — never `user.id`. The stored user object has `id`, not `_id`, so `joinAuctioneer` never fires and **no real-time updates are delivered**. | `frontend/src/services/socket.ts` + `backend/controllers/auth.controller.js` | socket.ts:224, auth:128 |
| **B3** | **`assignPlayer` reads `playerId` from `req.body` but it's sent as URL param.** Route is `POST /:playerId/assign`, frontend sends `playerId` in the URL, but controller destructures `{ playerId, teamId, amount } = req.body`. `playerId` will always be `undefined` from body. | `backend/controllers/player.controller.js` | 166 |
| **B4** | **CORS effectively disabled.** The `else` branch in the Express CORS middleware does `callback(null, true)` for blocked origins, annotated "Allow all for development" — this runs in production too. | `backend/server.js` | 147 |

### HIGH

| # | Bug | File | Line(s) |
|---|---|---|---|
| **B5** | **Cloudinary photo deletion uses wrong property names.** `resetAuctioneerData` checks `player.photo` and `team.logo` but the schema fields are `player.photoUrl` and `team.logoUrl`. Photos are never actually deleted from Cloudinary on reset. | `backend/controllers/admin.controller.js` | 346, 365 |
| **B6** | **`isAuctioneer` flag is `true` for admins.** `AuthContext` sets `isAuctioneer: user?.role === 'admin' \|\| user?.role === 'auctioneer'`, meaning admin users get auctioneer UI capabilities — semantically misleading and could cause authorization confusion. | `frontend/src/contexts/AuthContext.tsx` | 148 |
| **B7** | **`AuctionContext` cleanup disconnects the singleton socket.** The `useEffect` return calls `socketInstance.disconnect()`, but this destroys the shared singleton socket used by all components. On remount or HMR, the socket is dead. | `frontend/src/contexts/AuctionContext.tsx` | 87 |
| **B8** | **No limit check on player registration via public endpoint.** `registerPlayer` does not check `maxPlayers` limit. Only `createPlayer` (admin panel) checks limits. Players can register via link beyond the auctioneer's limit. | `backend/controllers/player.controller.js` | 7–115 |
| **B9** | **Hardcoded fallback JWT secret.** `JWT_SECRET = process.env.JWT_SECRET \|\| 'your-secret-key-change-this-in-production'` — if env var is missing, all tokens use a predictable secret. | `backend/middleware/auth.middleware.js` | 5 |
| **B10** | **Duplicate route handler.** Team routes register `PATCH /:teamId` twice (once with multer, once without). The second handler is unreachable. | `backend/routes/team.routes.js` | 43, 46 |

### MEDIUM

| # | Bug | File | Line(s) |
|---|---|---|---|
| **B11** | **`deleteAuctioneer` doesn't clean up FormConfig or AppConfig.** Only Players and Teams are deleted. FormConfig and AppConfig documents for that auctioneer are orphaned. | `backend/controllers/admin.controller.js` | 247–260 |
| **B12** | **User usage counters (`usage.totalPlayers`, etc.) are never updated.** The `usage` field is written at 0 on creation and never incremented. `getMe` calculates it live but never persists. The stored `usage` field is always stale. | `backend/models/user.model.js` | 51–63 |
| **B13** | **Port mismatch.** Backend `.env.example` sets `PORT=5001`, but `api.ts` defaults to `http://localhost:5000/api`. Frontend `package.json` proxy is `http://localhost:5001`. The `RegistrationLinkGenerator` defaults to port `5001` while `api.ts` defaults to `5000`. Inconsistent ports will cause connection failures. | `frontend/src/services/api.ts` + `.env.example` | |
| **B14** | **`resetAuctioneerData` resets `registrationTokenExpiry`** which doesn't exist on the User schema (only `registrationToken` exists). Sets undefined field. | `backend/controllers/admin.controller.js` | 389 |
| **B15** | **Regex wildcard in CORS list not properly escaped.** `allowedOrigin.replace('*', '.*')` works for the Socket.io handler, but the Express CORS handler does `allowedOrigin.replace('\\*', '.*')` with an escaped backslash — these use different escape patterns, causing inconsistent wildcard matching. | `backend/server.js` | 38 vs 140 |

---

## 8. Performance Risks

### Database

| Risk | Impact at Scale | Details |
|---|---|---|
| **N+1 queries in `getAllAuctioneers`** | 2 extra queries per auctioneer | For each auctioneer, `countDocuments` is called twice (players + teams). With 100 auctioneers → 200 extra queries. Should aggregate. |
| **Auto-generate regNo scans all players** | O(N) per player creation | `createPlayer` and `registerPlayer` both `find()` all players for the auctioneer, scan all regNo values to find max. At 1,000+ players, this becomes expensive. |
| **`filledSlots` calculated from array length** | Inconsistency risk | `team.filledSlots = team.players.length` is recalculated on every modification. Under concurrent requests, the array could get out of sync with the counter. |
| **No pagination** | Memory explosion | `getAllPlayers`, `getAllTeams`, `getUnsoldPlayers`, `getAllAuctioneers` all return full collections. At 1,000+ players, full JSON payloads will be large and slow. |
| **MongoDB keep-alive ping every 30s** | Unnecessary load | The admin ping keeps the connection alive but is wasteful. Mongoose already handles reconnection. |

### Frontend

| Risk | Impact at Scale |
|---|---|
| **All players/teams loaded into memory** | At 1,000+ players, React state holds all in memory. No virtualization on player grids or team lists. |
| **Celebration animations (confetti, particles)** | Heavy CSS animations and canvas-confetti on every sale. Fine for small auctions, janky at high volume. |
| **Socket listeners with debounced refetch** | Every socket event triggers a full re-fetch of all players/teams. With rapid-fire auctions, this means continuous API calls. |
| **No lazy loading of images** | All player photos loaded eagerly. 1,000+ player cards = 1,000+ image requests. |
| **In-memory cache on frontend** | 10-second TTL cache is discarded and rebuilt frequently. No stale-while-revalidate pattern. |

### Real-time

| Risk | Impact |
|---|---|
| **No server-side auction state** | Bid validation, timer enforcement, and conflict resolution are all done client-side. Two clients could sell the same player to different teams simultaneously. |
| **No transaction/atomicity on sell** | `assignPlayer` does `Promise.all([player.save(), team.save()])`. If one save fails after the other succeeds, data becomes inconsistent (player sold but team not updated, or vice versa). Should use MongoDB transactions. |
| **Socket event flood** | Every create/update/delete emits 1-3 socket events. With many concurrent users modifying data, clients receive a storm of events each triggering re-fetches. |

---

**End of Phase 0 Audit. No code changes have been made.**
