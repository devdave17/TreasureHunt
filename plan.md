# Treasure of Code — Halloween & Horror Frontend Redesign

Status: all frontend implementation phases completed on 25 October 2026. Build and lint pass. Responsive and interaction verification uses isolated sample data; live contest and administrative writes were not performed. See `docs/HALLOWEEN_REDESIGN.md` for evidence and verification limits.

## Goal and working approach

Make a major visual redesign of the entire frontend: a distinctly Halloween, haunted coding treasure hunt with atmospheric animation, surprising supernatural details, and polished interactions. A visitor should recognize the theme immediately. This includes composition, artwork, typography, navigation, forms, cards, tables, dialogs, and responsive layouts—not only a colour change.

Latest user instruction: complete the entire plan at once. All player and admin phases have therefore been implemented in one integrated pass, beginning with the landing page and question page. This checklist records the completed implementation and review coverage.

The latest user instructions take precedence over the attached brief where they differ: use CEREBRO, add the exact organizer line, use the October date, and remove the question-page image.

## Project findings

- React 19 + Vite 8; Tailwind is available alongside existing CSS. Reuse the existing stack without adding a heavy animation library.
- `src/App.jsx` owns the player flow and gameplay state. Player screens are mounted as sections and activated by screen state; effect lifecycles must account for hidden screens.
- `src/AppRouter.jsx` handles the separate leaderboard URLs.
- Player components: `LandingScreen`, `StartScreen`, `QuestScreen`, `MapScreen`, `RiddleScreen`, `RankingScreen`, and `WinnerScreen`.
- Existing presentation is spread across individual page stylesheets, `HauntGame.css`, `HauntMap.css`, `HauntMotion.css`, `App.css`, and `index.css`. Scope changes carefully to avoid unintended changes to pages awaiting redesign.
- `useHauntNavigation.js` already provides transitions and reduced-motion handling; extend the existing approach where appropriate.
- The landing page currently uses shrine artwork, four generic instruction cards, the April date, CBT wording, and CELEBRO branding.
- The question page currently gives substantial space to an archive image and title. Its existing data already includes riddle text, problem statement, and input key.
- The admin application has its own entry point and management screens in `src/admin/`.
- `treasure-of-code.html` is a standalone HTML implementation outside the configured Vite entry points. Audit its role and keep branding consistent without treating it as the primary React frontend. Also inspect `public/ranking.html` for compatibility with the active ranking flow.

## Non-negotiable functional boundaries

- Preserve routes, APIs, authentication, authorization, button actions, quest selection, schedules, timers, progression, leaderboard calculations, and database schema.
- Preserve input-key generation/assignment and backend answer validation exactly as implemented.
- Do not introduce an online compiler. Participants write and execute code in their own environment and submit its output.
- Do not alter answer normalization or validation while restyling the answer form.
- Never fabricate quest availability, scores, player information, countdowns, or success states for visual effect.
- Changing the landing-page event date does not change backend quest schedules.
- Preserve build/deployment configuration and existing admin operations.

## Visual system

### Palette and typography

- Near-black purple base: `#0B0612`.
- Layered plum/violet surfaces and purple glow for depth.
- Pumpkin orange primary accent: `#FF7A1A`.
- Gold highlights for treasure and important landmarks.
- Toxic green secondary code/live accent: `#7CFF4F`.
- Bone-white readable text; restrained blood-red for danger and ended states.
- Define reusable CSS variables for colours, surfaces, borders, spacing, shadows, typography, and motion.
- Use a horror/gothic display face sparingly for major headings, readable body typography, and monospace for input keys, code, timers, and quest identifiers. Reuse appropriate existing fonts and keep extra font weight small.
- Keep official organization marks recognizable; inspect image assets for baked-in incorrect branding and replace affected artwork where necessary.

### Halloween and coding identity

- Haunted mansion/gates, large moon, crooked bare trees, graveyard silhouettes, pumpkins carved with `</>`, candlelight, and cobweb details.
- Haunted terminal motifs: `> summoning your next quest..._`, faint `0xDEAD`, `null`, `404`, braces, and semicolons.
- Original lightweight SVG/CSS artwork where practical; optimized raster artwork only where it materially improves the scene. No copyrighted characters.
- Use a consistent story across screens: gateway → entry chamber → cursed quest collection → haunted trail → challenge chamber → treasure vault.

## Animation and surprise design

The redesign should feel alive and noticeably more horror-themed. Build a reusable decorative effects layer, with the strongest effects on the landing page and lobby and quieter treatment while participants solve questions.

| Effect | Placement and intended behaviour |
| --- | --- |
| Drifting fog, moon glow, floating embers | Layered background atmosphere on the landing page and lobby; sparse and slower on mobile. |
| Bats crossing the moon | Occasional brief silhouette movement, with cooldowns rather than continuous distraction. |
| Watching eyes | Small eyes appear in a dark tree or mansion window, blink, and vanish; never cover content. |
| Hanging spider | A spider descends from a code brace or card cobweb on hover/focus, then retreats. |
| Haunted windows | A silhouette appears briefly behind a window; soft changes in window light, without rapid flashing. |
| Ghost surprise | A small ghost carrying a semicolon briefly emerges from an interactive pumpkin or haunted prop. Support keyboard and touch activation. |
| Hidden `boo` easter egg | A harmless ghost reveal on non-gameplay screens. Ignore typing in inputs, textareas, editable regions, and forms; rate-limit triggers. |
| Cursor lantern | Soft orange light follows a fine pointer on atmospheric pages; disabled on touch and when effects are reduced. |
| Haunted cards | Cobweb corners, subtle hover lift, selected rune/seal, live lantern glow, and tombstone treatment for ended quests. |
| Doorway transition | A brief fog/door/ghost transition for voluntary navigation; do not delay a timer, submission, forced exit, or backend state change. |
| Treasure reveal | Brief gold particles and opening-vault treatment after actual completion. |

Implementation rules:

- Provide an accessible effects toggle. Respect `prefers-reduced-motion`; disable ambient movement, cursor effects, surprise animations, and smooth scrolling when motion is reduced, with static atmospheric fallbacks.
- Avoid strobing, rapid lightning, loud jump scares, or effects that hide instructions. Surprise comes from brief apparitions and environmental changes.
- Decorative layers must not intercept clicks, steal focus, move form fields, announce themselves to screen readers, or obscure the timer.
- Do not trigger surprise effects while entering an answer, reading a timed challenge, or using admin forms.
- Pause timers/listeners/animation loops for inactive screens and hidden browser tabs; clean them up on unmount. Do not tie effects to gameplay timers.
- Prefer transform/opacity animation; limit layers, large blur filters, and particle counts. Target smooth 60fps and approximately 500 KB or less of additional compressed visual assets, measuring actual output.
- Optional ambient audio is a later enhancement, off by default and started only through an explicit sound toggle. No autoplay or surprise audio.
- Document effect intensity, frequency, asset locations, and CSS variables so they can be adjusted easily.

## Phase 1 — Landing page and shared foundation

Primary files: `src/components/LandingScreen.jsx`, `LandingScreen.css`, `HauntMotion.css`, and `index.html`. Introduce only the shared primitives needed for this page initially; migrate other pages as their phases begin.

### Exact content requirements

- [x] Replace CELEBRO/Celebro with **CEREBRO**. The CELEBRO label in the supplied How to Play draft is superseded by the user's explicit correction.
- [x] Show **31 OCTOBER 2026**. The year is retained from the existing event date; the requested new day/month is 31 October.
- [x] Remove **HALLOWEEN TECH CODING CONTEST**.
- [x] Add the exact centered line **Conducted By COUT<<MASTERS;** beneath the main title, rendered as text so the angle brackets display correctly.
- [x] Remove **CBT FORMAT**.
- [x] Retain **OPEN TO ALL**.
- [x] Preserve the Coding Club, IIIT Vadodara attribution.
- [x] Correct page title, metadata, visible branding, footer, and accessible image descriptions; audit remaining project-wide instances as part of the final pass.

### Layout and interaction

- [x] Build a new haunted hero composition rather than retaining the shrine as the main visual identity.
- [x] Keep **Treasure of Code** as the dominant title, with the organizer line centered beneath it.
- [x] Retain a clear Enter the Hunt action wired to the existing login flow.
- [x] Highlight top-right **Player Login** with a prominent orange treatment and **How to Play** with a purple/gold outlined treatment. Both need visible hover/focus states and generous mobile tap targets.
- [x] Keep the How to Play anchor working and ensure any sticky header does not cover its heading.
- [x] Add the first atmospheric and surprise effects from the effects catalogue, with mobile and reduced-motion variants.

### How to Play — required seven steps

Latest visual revision: use seven numbered acts in a continuous scroll narrative, with a pinned apparition, direct step navigation, and process illustrations. The user explicitly replaced the earlier card/grid direction. Preserve the complete meaning of the supplied instructions while keeping the displayed copy concise.

1. **ENTER THE GAME** — Log in to your account and enter the mysterious world of Treasure of Code.
2. **GET YOUR INPUT KEY** — At the beginning of the game, receive an input key. Use it as instructed in the question to solve the coding challenge.
3. **WRITE AND RUN YOUR CODE** — Write your solution in your own coding environment. Use the provided input key, execute the program, and obtain the output.
4. **SUBMIT THE OUTPUT** — Enter your program's output in the website's designated submission field. Check the output before submitting.
5. **UNLOCK THE NEXT QUESTION** — The system validates your output. Only the correct required output unlocks the next question. If incorrect, review your code and retry according to event rules.
6. **REPEAT UNTIL THE END** — Use the input key provided for each applicable challenge, solve it, run your code, and submit the correct output. Repeat until the final challenge.
7. **REACH THE TREASURE** — Complete the challenges, track your progress on the leaderboard, and compete for the ultimate treasure.

Highlight the sequence visually:

**Input Key → Write Code → Execute → Submit Output → Unlock Next Question → Repeat**

- [x] Add a compact Important Reminder panel covering question-specific key instructions, local code execution, output submission, correct-output-only unlocking, repetition through all challenges, and official event rules.
- [x] Use a continuous desktop descent with a sticky visual rail, and an ordered mobile narrative with sticky step navigation. Do not use cards or grids in How to Play. Make the sequence understandable without animation or colour.
- [x] Replace the current four-card guide and its “Four steps” heading completely.
- [x] Avoid introducing new ranking claims or promises about eligibility/authentication beyond the requested event copy and existing rules.

Completion checkpoint: verify landing layout and navigation, all exact copy changes, the seven steps and reminder panel, effects controls, keyboard access, and mobile presentation. Included in the final integrated review, per the latest instruction.

## Phase 2 — Question page (next priority)

Primary files: `src/components/RiddleScreen.jsx` and its styles in `HauntGame.css`; extract scoped question styles if needed to avoid affecting results and other screens.

- [x] Remove the archive illustration from this page. Do not remove shared assets still used elsewhere.
- [x] Make **Riddle Text**, **Problem Statement**, and **Answer Box** the main elements, with explicit headings and strong visual hierarchy.
- [x] Move the question title into a compact header with checkpoint/difficulty/solved status. It must not compete with the question content.
- [x] Place **Input Key** clearly beside or below the problem statement, preserving its actual value and formatting.
- [x] Use readable line lengths, spacing, code blocks, and overflow behaviour for lengthy problem content.
- [x] Make the answer field prominent and label the action **Submit Output**. Explain the distinction between the supplied input key and the program output being submitted.
- [x] Preserve answer processing, existing validation, loading/disabled behaviour, errors, solved state, and map navigation.
- [x] Keep timer and navigation visible without crowding the working area.
- [x] Mobile reading order: Riddle Text → Problem Statement → Input Key → Answer Box.
- [x] Keep horror styling in the frame, colours, and subtle static details; no surprise interruptions during solving or submission.

Completion checkpoint: check long questions, input-key formatting, empty/incorrect output, pending submission, solved state, timer visibility, and mobile usability without changing backend behaviour.

## Phase 3 — Player login

Primary files: `src/components/StartScreen.jsx` and `StartScreen.css`.

- [x] Redesign as the haunted entry chamber with a clear, accessible form and prominent login action.
- [x] Theme labels, inputs, password visibility controls if present, help text, errors, and loading state consistently.
- [x] Keep atmospheric motion outside the form; no effects triggered by credential typing.
- [x] Preserve the exact authentication flow and back navigation.

## Phase 4 — Quest lobby

Primary files: `src/components/QuestScreen.jsx` and `QuestScreen.css`.

- [x] Replace the shrine banner with a haunted mansion/moon/fog scene.
- [x] Use the attached brief's **ENTER IF YOU DARE.** heading and supporting copy: “Choose a quest. Follow the clues. Claim the treasure... before the clock claims you.”
- [x] Add a brief haunted terminal line and stronger environmental surprises outside the quest controls.
- [x] Restyle navigation and profile chip while retaining the real participant name, profile details, and logout action.
- [x] Make quest cards feel like haunted artifacts with orange/purple borders, cobwebs, and code details.
- [x] Clearly distinguish live, available, upcoming, selected, and ended states using labels and icons as well as colour.
- [x] Use green lantern glow for live quests, an orange Chosen seal for selected quests, and desaturated tombstone details for ended quests.
- [x] Preserve Select, Start Quest, View Schedule, profile, lock notices, and per-quest leaderboard behaviour.
- [x] Theme schedule dialogs, loading, empty, and error states.
- [x] Use real schedule data for countdowns, with explicit labels; do not add a fictional global event clock.
- [x] Where themed wording is used, preserve plain meaning—for example, “Hall of the Haunted · Leaderboard.” Keep duration and schedule information immediately understandable.

## Phase 5 — Quest map

Primary files: `src/components/MapScreen.jsx`, `HauntMap.css`, and relevant shared game styles.

- [x] Redesign the path as a haunted trail through graveyard gates and cursed checkpoints.
- [x] Distinguish current, locked, and solved nodes through icons, labels, and styling.
- [x] Apply a restrained lantern glow to the current checkpoint and brief feedback after real progression.
- [x] Preserve dynamic question counts, checkpoint access rules, solved-question review, player counts, and exit behaviour.
- [x] Maintain a readable desktop route and clear mobile progression.

## Phase 6 — Leaderboard

Primary files: `src/components/RankingScreen.jsx`, `RankingScreen.css`; inspect `public/ranking.html` compatibility.

- [x] Restyle as the Hall of the Haunted, retaining a visible Leaderboard label.
- [x] Use a themed podium/top-rank treatment while keeping all rankings and metrics readable.
- [x] Preserve existing columns, ranking rules, refresh behaviour, quest context, and URLs.
- [x] Handle long participant names, ties, empty/loading/error states, and mobile table overflow.
- [x] Keep animated decoration outside the data table.

## Phase 7 — Results and shared player UI

Primary files: `src/components/WinnerScreen.jsx`, `Timer.jsx`, `HauntDialog.jsx`, and relevant presentation markup/styles in `src/App.jsx`.

- [x] Create a treasure-vault completion design with a brief celebratory reveal.
- [x] Provide distinct and accurate timeout and disqualification treatments; do not show success effects for these outcomes.
- [x] Preserve participant details, solved counts, elapsed time, result status, and exit/restart actions.
- [x] Unify timer, notices, replay warning, exit confirmation, block notice, and any remaining shared dialogs.
- [x] Keep focus management, Escape behaviour, disabled states, and error announcements accessible.

## Phase 8 — Admin frontend, one screen at a time

Primary files: `src/admin/Admin.jsx`, `admin.css`, and `src/admin/components/`.

Apply the same visual identity with restrained motion so the entire project is coherent while administrative work remains clear. Review each screen individually in this order:

1. [x] Admin login.
2. [x] Shared layout and sidebar.
3. [x] Dashboard.
4. [x] Quests management.
5. [x] Questions management.
6. [x] Users management.
7. [x] Rankings.
8. [x] Statistics.

Use consistent forms, tables, badges, dialogs, and responsive navigation. Preserve every existing CRUD action, role restriction, import flow, and confirmation. Do not add surprise effects around administrative controls.

## Validation for every page

- [x] Check representative mobile, tablet, and desktop widths, including narrow screens and long content.
- [x] Check readable contrast (WCAG AA), visible keyboard focus, logical tab order, semantic headings, labels, and touch targets.
- [x] Check reduced motion and the effects toggle; ensure disabled effects leave a complete usable design.
- [x] Verify existing navigation and relevant functional states without modifying real contest data for testing.
- [x] Run the production build and relevant lint checks. Record pre-existing failures separately from regressions introduced by this work.
- [x] Use targeted interaction checks where functionality could be affected; do not add tests that only mirror cosmetic implementation.
- [x] Inspect actual rendered layouts and the browser console; report any checks blocked by missing services or credentials.
- [x] Measure added asset size and inspect animation responsiveness; simplify effects if necessary.
- [x] Include the completed page and any verification limitations in the final integrated review.

## Final integration pass

- [x] Audit CEREBRO branding across React screens, metadata, HTML entry points, standalone HTML, accessible labels, and visible image assets.
- [x] Confirm the October date and requested landing copy, with no unintended changes to quest timing.
- [x] Verify player-screen navigation, question/result states, and leaderboard access using isolated fixtures; verify the real landing/login UI without starting a live contest attempt.
- [x] Verify admin navigation and management-interface states with isolated fixtures; preserve existing action callbacks without issuing live mutations.
- [x] Check cross-page CSS, overlay stacking, hidden-screen animations, timer positioning, and all reduced-motion overrides.
- [x] Confirm no backend/API/schema/authentication/validation/ranking changes were introduced.
- [x] Document visual variables, effects controls, surprise cooldowns, artwork sources, and how to adjust copy and presentation of existing timers.

## First implementation deliverable

Completed scope: all eight implementation phases, the exact landing content corrections, the complete seven-step guide, content-first question page, all player screens, the full admin frontend, controlled surprises, original SVG artwork, compatibility styling, and an isolated design-preview tool. The latest instruction supersedes the earlier page-by-page approval checkpoints. Optional ambient audio remains outside the required implementation. The subsequently requested victory soundtrack is implemented in the treasure reward below.


## Completion evidence

- Production build and ESLint pass.
- Player and admin layouts checked at 320, 768, and 1440 CSS pixels, with representative 390-pixel visual checks.
- Empty/incorrect/pending/solved question states, map locks, quest schedules/selection, participant dialogs, result outcomes, and effects persistence verified with isolated sample data.
- Narrow title clipping, long-code overflow, and narrow admin-select overflow were found and fixed during review.
- No backend, service/API, schema, dependency, or deployment-configuration changes.
- See `docs/HALLOWEEN_REDESIGN.md` for control locations, original artwork provenance, contrast checks, and the explicit limits of frontend-only verification.


## Latest requested visual revision — completed

- [x] Restore the supplied COUT Masters logos in the landing, player entry points, answer footer, and administrative branding. Verify the actual images load.
- [x] Replace the novel-like display/body typography with distressed horror type, condensed headings, and readable sans-serif copy.
- [x] Add stronger CSS texture, blood-moon lighting, chromatic scratches, shadow figures, claw marks, perspective pop-outs, and navigation apparitions.
- [x] React to player button/link clicks without delaying their existing actions. Add peripheral scroll encounters, a cooldown, and reduced-motion/effects-off support.
- [x] Replace the How to Play cards/grid with the Seven Seals continuous scroll sequence, while retaining all seven required steps and reminders.
- [x] Rebuild the answer page as a forensic clue/problem workspace and framed output console with a separate input-key tray. Preserve submission processing.
- [x] Recheck original logo loading, 320/390/768/1440 layouts, scroll-step tracking, motion controls, answer states, build, and lint.

## Treasure opening and supplied victory music — completed

- [x] Add an interactive opening chest to successful quest completion, with a hinged lid, golden light, coins, rising treasure, and a finite particle burst.
- [x] Automatically start the opening animation and supplied `public/win_audio.mpeg` when successful results appear. Remove the initial Open button; retain replay/mute and a truthful browser-autoplay fallback.
- [x] Mount the reward only while successful results are active; pause sound when the tab hides and stop/reset it on exit. Keep timeout and disqualification silent.
- [x] Preserve all recorded results, answer validation, progression, schedules, and backend code.
- [x] Provide static completed artwork with motion off, readable audio-error feedback, and mobile layouts.
- [x] Check playback through the end of the supplied track, replay/mute, exit cleanup, distinct result outcomes, 320/390/768/1440 layouts, build, and lint.

- [x] Fix first-play audio by preparing Web Audio during answer submission before asynchronous validation. Add an isolated final-answer regression flow and keep player preview navigation in the same document.
