# Treasure of Code

Treasure of Code is a full-stack, horror-themed coding treasure hunt for
competitive programming events. Players log in, choose an available quest,
solve progressively unlocked riddles, and reach the treasure vault. Event
keepers manage players, quests, questions, rankings, and live activity from a
separate admin control room.

## Live deployment
<https://treasure-of-code.vercel.app/>

The deployed player interface does not expose public leaderboard links. Quest
rankings remain available to authorized administrators through the admin
control room.

## Highlights

### Player experience

- CEREBRO-inspired haunted visual theme with responsive player screens.
- Player login and session recovery.
- Quest lobby with scheduled quest states:
  - available
  - upcoming
  - live
  - ended
- Quest selection and replay protection within a player session.
- Club-branded entry passkey gate before a quest can be unlocked.
- Map-based progression through locked and solved checkpoints.
- Riddle and coding-challenge flow with server-side answer validation.
- Countdown timer with automatic submission when the quest expires.
- Progress recovery after refresh or reconnect.
- Live quest presence and progress updates using Socket.IO.
- Dedicated result screen for completed, expired, and disqualified attempts.
- Haunted celebration sound when the player successfully finds the treasure.

### Admin control room

Administrators can manage:

- Dashboard overview and event activity
- Registered players
- Quests and quest schedules
- Questions and answer validation data
- Quest rankings and participant details
- Event statistics

Invigilators receive restricted access to the dashboard and player-management
sections.

## Tech stack

- React 19
- Vite
- Express 5
- MongoDB
- Socket.IO
- JWT-based admin authentication
- `eslint` for linting
- Vercel-compatible frontend deployment

## Project structure

```text
.
├── src/
│   ├── App.jsx                 # Player application state and game flow
│   ├── AppRouter.jsx           # Player and ranking route handling
│   ├── components/             # Player UI, quest map, riddles, and results
│   ├── admin/                  # Admin entry point and control-room UI
│   ├── Controllers/            # Game and admin request handlers
│   ├── routes/                 # Express API route definitions
│   ├── services/               # Frontend API clients
│   └── utils/                  # Shared timing and sound helpers
├── public/                     # Logos, icons, and Halloween artwork
├── data/                       # Seed and default data
├── scripts/                    # Seeding, migration, and verification scripts
├── server.js                   # Express and Socket.IO server
├── admin.html                  # Admin Vite entry point
└── vercel.json                 # Vercel SPA rewrites
```

## Requirements

- Node.js 20 or newer
- npm
- MongoDB database

## Local setup

1. Clone the repository and enter the project directory.

   ```bash
   git clone https://github.com/devdave17/TreasureHunt.git
   cd TreasureHunt
   ```

2. Install dependencies.

   ```bash
   npm install
   ```

3. Create a local environment file.

   ```bash
   copy .env.example .env
   ```

   On macOS or Linux, use:

   ```bash
   cp .env.example .env
   ```

4. Set the values in `.env`. Never commit this file or real credentials.

   ```env
   PORT=5001
   MONGO_URI=mongodb+srv://<username>:<password>@<cluster>/<database>
   MONGO_DB_NAME=treasurehunt
   ADMIN_API_TOKEN=<admin_api_token>
   ADMIN_USERNAME=<admin_username>
   ADMIN_PASSWORD=<admin_password>
   INVIGILATOR_USERNAME=<invigilator_username>
   INVIGILATOR_PASSWORD=<invigilator_password>
   PLAYER_MASTER_PASSWORD=<player_master_password>
   VITE_API_BASE_URL=http://localhost:5001
   ```

5. Start the backend:

   ```bash
   node server.js
   ```

6. In another terminal, start the Vite frontend:

   ```bash
   npm run dev
   ```

7. Open:

   - Player app: <http://localhost:5173/>
   - Admin app: <http://localhost:5173/admin.html>

The backend checks MongoDB connectivity during startup. If the database is
unavailable, the server exits with an error instead of running in a broken
state.

## Available commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite development server |
| `npm run build` | Create the production frontend bundle |
| `npm run preview` | Preview the production bundle locally |
| `npm run lint` | Run ESLint across the project |
| `node server.js` | Start the Express and Socket.IO backend |

## 400-player load test

The k6 scenario in
[`load-tests/college-event-400-vu.js`](load-tests/college-event-400-vu.js)
simulates 400 players logging in from one NAT IP, loading the quest, and
submitting an answer. Run it only against a disposable/staging database with
dedicated test users:

```bash
k6 run load-tests/college-event-400-vu.js \
  -e BASE_URL=https://staging-api.example.com \
  -e QUEST_ID=<quest-id> \
  -e QUESTION_ID=<question-id> \
  -e TEST_PASSWORD=<test-password> \
  -e TEST_EMAIL_PREFIX=loadtest-player
```

Create 400 registered emails matching
`loadtest-player1@loadtest.invalid` through
`loadtest-player400@loadtest.invalid` before the run. The default player-login
limit is 500 requests per IP per minute, configurable with
`PLAYER_LOGIN_RATE_LIMIT_MAX`. After authentication, answer validation is
limited per authenticated player (30 requests per minute), not per IP, so a
shared college Wi-Fi address does not combine the players' answer budgets.
The test must report zero `429` responses, p95 answer latency below 1.5s, and
p99 below 3s before the event is considered ready.

## Deployment

### Frontend on Vercel

Configure the Vercel project with:

- Framework preset: **Vite**
- Build command: `npm run build`
- Output directory: `dist`
- `VITE_API_BASE_URL`: the public URL of the deployed backend

The `vercel.json` rewrites preserve direct navigation to `/admin` and player
routes.

### Backend

Deploy the Node/Express server to a service that supports a long-running
process and WebSocket connections, such as Render or another Node hosting
provider. Configure:

- `PORT`
- `MONGO_URI` or `MONGODB_URI`
- `MONGO_DB_NAME` or `MONGODB_DB`
- `ADMIN_API_TOKEN`
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`
- `INVIGILATOR_USERNAME`
- `INVIGILATOR_PASSWORD`
- `PLAYER_MASTER_PASSWORD`
- `PLAYER_LOGIN_RATE_LIMIT_MAX` (optional; defaults to `500`)

After deployment, set the Vercel frontend's `VITE_API_BASE_URL` to the backend
URL and redeploy the frontend.

## Security notes

- Do not commit `.env`, database connection strings, passwords, or API tokens.
- Admin endpoints are protected by authentication middleware.
- Admin credentials and player master credentials must be configured through
  environment variables.
- Keep the backend and frontend deployment URLs configured separately.
- Use HTTPS in production so login tokens and gameplay requests are encrypted.

## Development notes

- The player ranking screen and ranking API are retained for authorized
  administrative use; player-facing quest cards do not link to public rankings.
- Quest completion uses a short browser-generated haunted chime, so no audio
  package or external audio request is required.
- Halloween artwork and redesign implementation notes are documented in
  [`docs/HALLOWEEN_REDESIGN.md`](docs/HALLOWEEN_REDESIGN.md).
- The isolated UI preview can be opened during development at:
  `http://localhost:5173/scripts/halloween-preview.html`

## License

This repository is maintained for the Treasure of Code event by CEREBRO and
Coding Club, IIIT Vadodara. Add the event's official license here if the
project is distributed outside the organizing team.
