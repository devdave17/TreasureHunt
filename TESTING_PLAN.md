# Treasure of Code Testing Plan

## 1. Objectives

The test suite must prove that:

- player authentication, quest scheduling, progression, scoring, answer
  validation, timeout, finalization, and reconnect recovery are correct;
- admin authentication, authorization, CRUD operations, rankings, imports, and
  invigilator restrictions are correct;
- the player and admin React applications render the right state, call the
  right APIs, and clean up timers/listeners;
- malformed input, expired quests, blocked players, duplicate submissions,
  database failures, and non-JSON server responses fail visibly and safely;
- the production build and the deployed routing/Socket.IO configuration remain
  usable.

The suite should not use live production credentials or a production database.
Use deterministic fixtures and a disposable test database.

## 1.1 College event load test

Before the event, run
[`load-tests/college-event-400-vu.js`](load-tests/college-event-400-vu.js)
against staging with 400 dedicated test users and the same deployment topology
that production will use. The scenario ramps to 400 concurrent virtual users,
logs each user in, fetches the quest questions, and submits one answer.

Validate all of the following:

- no login or answer request returns `429`;
- HTTP failure rate remains below 1%;
- answer p95 latency is below 1.5 seconds and p99 below 3 seconds;
- MongoDB CPU, connections, operation latency, and error rate remain within
  the hosting plan's limits;
- the application instance stays responsive while Socket.IO connections are
  opened and closed during the run.

`playerLoginLimiter` is intentionally IP-based because login is unauthenticated;
its default is 500 requests per IP per minute and can be overridden with
`PLAYER_LOGIN_RATE_LIMIT_MAX`. `validateAnswerLimiter` is applied after player
authentication and is keyed by `playerId`, so 400 users behind one college NAT
share the login budget but do not share the answer-submission budget. If the
login test produces `429`, stop and fix the deployment configuration before
testing answer throughput.

## 2. Recommended test stack

The repository currently has no test runner or test files. Add the following
dev dependencies in one change:

- **Vitest** for JavaScript and React unit tests.
- **React Testing Library** and `@testing-library/jest-dom` for component
  behavior and accessibility assertions.
- **Supertest** for Express route integration tests.
- **mongodb-memory-server** (or a disposable MongoDB service in CI) for
  controller and route tests that need real query behavior.
- **MSW** for frontend API tests where mocking `fetch` directly would hide
  request/response contract errors.
- **Playwright** for the small end-to-end smoke suite.

Suggested scripts:

```json
{
  "test": "vitest run",
  "test:watch": "vitest",
  "test:coverage": "vitest run --coverage",
  "test:e2e": "playwright test",
  "test:all": "npm run lint && npm run test:coverage && npm run build && npm run test:e2e"
}
```

Keep tests colocated as `*.test.js` or `*.test.jsx`, with shared fixtures in
`test/fixtures/` and test-only environment setup in `test/setup.js`.

## 3. Test layers and gates

| Layer | Scope | Dependencies | Pull request gate |
|---|---|---|---|
| Unit | Pure helpers, API clients, middleware, isolated controllers, hooks | No network; mocked DB/fetch/socket | Required |
| Component | Each React screen/component and admin interaction | RTL, fake timers, MSW | Required |
| Integration | Express routes, auth, Mongo queries, Socket.IO events | Supertest, disposable MongoDB | Required |
| End-to-end | Critical player/admin journeys in a browser | Seeded test server and browser | Required on main/release |
| Non-functional | Accessibility, responsive layout, timing, rate limits, build | Playwright, Lighthouse/axe where available | Release gate |

Use coverage thresholds as a guardrail, not as the only quality metric:

- 90% statements/lines for `src/utils`, `src/services`, middleware, and
  controllers;
- 80% branches for validation, authorization, and quest state transitions;
- 75% component lines initially, increasing after the first stable release;
- every route and every exported public function must have at least one test.

## 4. Unit-by-unit coverage matrix

### Application shell and player state

| Unit | Required tests |
|---|---|
| `src/App.jsx` | Initial session restore; login success/failure; blocked player; quest list loading/error; available/upcoming/live/ended quest states; passkey acceptance/rejection; replay protection; level unlock and completed-level recovery; question mapping; timer start, drift correction, expiry auto-submit; answer success/wrong/error; finalization; Socket.IO block/progress/disconnect handling; logout and storage cleanup. Use fake timers and mocked `gameApi`. |
| `src/AppRouter.jsx` | Default player route; ranking route parsing; missing/invalid quest id fallback; navigation without reload. |
| `src/main.jsx` | React root mounts the player app once and loads global styles. |
| `src/App.css`, `src/index.css`, `src/theme-tokens.css`, `src/horror*.css` | Build-level import smoke test; no CSS import/build failure; reduced-motion and effects-toggle selectors remain present. Visual checks are covered in the browser suite rather than logic unit tests. |

### Player components

| Unit | Required tests |
|---|---|
| `LandingScreen.jsx` | Branding/content; Start action; keyboard activation; effects toggle; no accidental navigation from decorative elements. |
| `StartScreen.jsx` | Login form validation; submit/loading/error states; passkey input behavior; accessible labels and focus. |
| `QuestScreen.jsx` | Quest cards show correct schedule state; select disabled for unavailable/ended/replayed quests; selection callback receives the correct quest. |
| `MapScreen.jsx` | Locked/current/completed level rendering; level selection rules; progress and active-player indicators; keyboard access. |
| `RiddleScreen.jsx` | Question content and answer form; empty submission; submit/loading/wrong/correct/error states; timer display; disabled state after expiry; accessible feedback. |
| `Timer.jsx` | Correct countdown formatting; ticking with fake timers; zero/expired callback once; cleanup on unmount; pause behavior for inactive tab/reduced motion where applicable. |
| `RankingScreen.jsx` | Ranking rows, score/order display, empty/loading/error states, and quest id request. |
| `WinnerScreen.jsx` | Completed/expired/disqualified variants; score and next action; audio callback only after explicit/valid completion. |
| `TreasureReveal.jsx` | Reveal only for a completed attempt; callback/action behavior; reduced-motion fallback; decorative layers do not intercept clicks. |
| `HauntDialog.jsx` | Open/close behavior; Escape; focus/ARIA dialog semantics; cleanup of listeners. |
| `DreadEntity.jsx`, `HauntSymbols.jsx`, `OfficialLogo.jsx`, `Stars.jsx` | Stable rendering with defaults and supplied class names; decorative SVG/image content is hidden from assistive technology where intended. |
| `HorrorAtmosphere.jsx` | Effects enabled/disabled from preference; `prefers-reduced-motion`; only atmospheric screens animate; storage/listener cleanup; decorative pointer-events behavior. |
| `RitualGuide.jsx` | Instructions render, close/continue actions, keyboard access, and no effect on gameplay state. |
| `HauntMotion.css`, `HauntGame.css`, `HauntMap.css`, `QuestScreen.css`, `LandingScreen.css`, `StartScreen.css`, `RankingScreen.css`, `TreasureReveal*.css` | Build smoke plus responsive browser assertions for overflow, visible controls, reduced motion, and mobile layouts. |

### Shared utilities and frontend API

| Unit | Required tests |
|---|---|
| `src/utils/questTiming.js` | Number/string/Date/Firestore-like timestamp parsing; invalid timestamp fallback; duration fallback; exact start/end boundaries; remaining seconds rounding and clamping; countdown labels at 0, under a minute, minutes, and hours; local date conversion; live/upcoming state. |
| `src/utils/useHauntNavigation.js` | Navigation callback timing; reduced-motion immediate path; cleanup when unmounted; no callback after cancellation. |
| `src/utils/victoryAudio.js` | Audio context creation only when called; successful completion; unavailable browser API/error path does not break the UI. |
| `src/services/gameApi.js` | URL encoding; HTTP methods, headers, and JSON bodies for every exported method; player token propagation; success payloads; JSON API errors; non-JSON errors; network rejection; request timestamp metadata. |
| `src/admin/api.js` | Auth/read headers and role values; all admin endpoint URLs and verbs; JSON and non-JSON error parsing; response status handling; token omission/rotation behavior. |

### Admin application

| Unit | Required tests |
|---|---|
| `src/admin/Admin.jsx` | Login success for admin and invigilator; invalid credentials; token/role persistence and restore; logout; expired/invalid session; role-based navigation and access. |
| `src/admin/main.jsx` | Admin root mounts once and loads admin styles. |
| `src/admin/components/AdminLayout.jsx` | Navigation selection; logout; role label; content outlet; responsive navigation accessibility. |
| `Sidebar.jsx` | Allowed links by role; active link; keyboard and mobile menu behavior. |
| `Dashboard.jsx` | Stats/activity loading, empty/error states, refresh behavior, and role restrictions. |
| `Users.jsx` | Pagination/search; add user validation; import results; block/unblock confirmation and status; error notifications; invigilator permissions. |
| `Quests.jsx` | Quest list/filter; create/edit/delete; schedule and duration validation; live/upcoming/ended labels; cache refresh after mutation. |
| `Questions.jsx` | Create/edit/delete; level ordering; answer/validation fields; quest association; malformed input and server errors. |
| `Rankings.jsx` | Quest selection; ranking rows; participant details; distribution data; empty/loading/error states; refresh after relevant changes. |
| `Stats.jsx` | Correct aggregate display, zero-data state, loading/error handling. |
| `admin.css`, `admin-horror.css` | Build smoke and browser checks for table overflow, dialogs, forms, contrast, and responsive admin layout. |

### Backend middleware and database boundary

| Unit | Required tests |
|---|---|
| `src/backend/middleware/adminAuth.js` | Missing token; malformed token; wrong token type/role; valid admin; valid invigilator; expired JWT; correct `req.user` population. |
| `src/backend/middleware/playerAuth.js` | Missing/invalid player token; valid token; blocked user; expired token; malformed user identity; correct status/error shape. |
| `src/backend/middleware/rateLimiters.js` | Requests below limit pass; limit returns the expected status/body; independent buckets for login/answer/progress; reset/window behavior. |
| `src/backend/database/dbConfig.js` | Environment configuration; connection reuse; `ensureReady`; missing URI and connection failure are surfaced; test cleanup closes resources. |

### Controllers and routes

| Unit | Required tests |
|---|---|
| `src/Controllers/adminAuthController.js` | Missing configuration (503); missing fields (400); admin credentials; invigilator credentials; case/whitespace normalization; invalid credentials (401); token claims/expiry; unexpected JWT failure (500). |
| `src/Controllers/gameController.js` | Login normalization and blocked-user rejection; quest schedule filtering; question ordering and public-field filtering; answer normalization strict/flexible/numeric modes; progression idempotency; level unlocking; timer start and expiry; score weighting/rounding; duplicate/final submissions; close/abandon behavior; ranking tie-breaks; level distribution; cache hit/expiry/invalidation; database failures; Socket.IO presence broadcasts. |
| `src/Controllers/adminController.js` | User normalization/add/list/search/pagination/stats; block/unblock reset and event; import defaults/invalid/duplicates; quest CRUD and schedule validation; question CRUD/order; ranking/stat aggregation; cache invalidation; database failure responses. |
| `src/routes/gameRoutes.js` | Route-to-handler mapping; public versus `playerAuth`-protected routes; rate limiter placement; parameter forwarding. |
| `src/routes/adminRoutes.js` | All routes require `adminAuth`; role restrictions are enforced for invigilators; correct verbs and handlers. |
| `server.js` | CSP/CORS/JSON middleware; `/admin/auth/login`; static frontend fallback; startup failure on unavailable DB; Socket.IO identify/join/resume/leave/disconnect room behavior; no cross-quest room leakage. Use an exported app factory in tests, or isolate startup/listen from import so tests do not bind a real port. |

### Scripts and static entry points

| Unit | Required tests |
|---|---|
| `scripts/backfillQuestSchedule.js` | Dry-run/normal mode; only missing schedules updated; invalid records reported; rerun is idempotent. |
| `scripts/backfillQuestionScores.js` | Missing score defaults; existing scores preserved; invalid records reported; rerun is idempotent. |
| `scripts/importHackerRankScores.js` | Input parsing; user/quest matching; score normalization; unmatched/duplicate rows; failure summary. |
| `scripts/seedThreeQuests.js` | Seed count/content; duplicate protection; schedule validity; safe rerun. |
| `scripts/verifySeedCounts.js` | Correct success and non-zero failure result for mismatched counts. |
| `mongo-probe.mjs`, `tmp-quest-check.mjs` | Keep as manual diagnostics; add a mocked smoke check only if they become CI entry points. |
| `admin.html`, `index.html`, `treasure-of-code.html`, `public/ranking.html` | Production build and direct-navigation smoke checks; correct asset paths; no blank page on refresh. |

## 5. Critical integration scenarios

1. **Player happy path:** login → select live quest → enter passkey → start
   level 1 → submit correct answers in order → finalize → treasure/result.
2. **Recovery path:** begin a quest → refresh/reconnect → restore progress and
   remaining server time without duplicating score or timer.
3. **Expiry path:** attempt answer at the end boundary → receive
   `QUEST_EXPIRED` → finalize once → show expired result.
4. **Integrity path:** submit a level twice, skip a level, use another user's
   id, submit after finalization, and submit while blocked; all must be
   rejected without score changes.
5. **Admin path:** admin login → create quest/question → edit schedule → view
   ranking/distribution → block/unblock a user → verify player notification.
6. **Invigilator path:** invigilator can access permitted dashboard/player
   management operations but cannot perform admin-only mutations.
7. **Realtime path:** two clients in one quest see presence/progress updates;
   leaving or disconnecting marks only the correct session abandoned.

## 6. Accessibility, compatibility, and performance checks

- Run axe checks on landing, login, quest map, riddle, result, admin dashboard,
  users, questions, and rankings.
- Test keyboard-only navigation, visible focus, dialog focus trapping, form
  labels, status announcements, and color contrast.
- Test Chromium desktop plus a mobile viewport; verify no horizontal overflow and
  all timer/submit controls remain visible.
- Verify `prefers-reduced-motion`, touch input, hidden-tab timer behavior, and
  screen-reader-hidden decorative artwork.
- Run a load-oriented smoke test for answer validation and ranking endpoints;
  verify rate limits and response times with seeded data.

## 7. Execution order

1. Add the test runner and shared environment setup.
2. Test `questTiming`, answer/score helpers, auth middleware, and API clients.
3. Test controllers with mocked database contracts, then repeat important paths
   against disposable MongoDB.
4. Test `App.jsx`, admin state, and all screens/components with RTL.
5. Add route and Socket.IO integration tests.
6. Add the seven critical browser scenarios and accessibility checks.
7. Run lint, coverage, production build, and the full test command in CI.

## 8. Definition of done

- Every unit in the matrix has a named test file or an explicit build/browser
  check where unit testing is inappropriate.
- All critical scenarios pass with deterministic fixtures.
- No test depends on production services, credentials, wall-clock timing, or
  test execution order.
- Coverage thresholds are met and uncovered branches are reviewed.
- `npm run lint`, `npm run test:all`, and the production build pass.
- Failures include actionable response/status details and do not silently fall
  back to success-shaped data.
