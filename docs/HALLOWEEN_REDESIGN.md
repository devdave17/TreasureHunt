# Halloween frontend — implementation and verification

Implemented on 25 October 2026. This covers the player application, public leaderboard, administrative interface, shared dialogs, favicon/metadata, and compatibility styling for the standalone HTML pages.

## Design

The visual story moves from a haunted mansion gateway to an entry chamber, cursed quests, a graveyard trail, a quiet challenge chamber, and the treasure vault. Near-black purple surfaces, orange actions, gold treasure accents, violet decoration, and small green status lights are consistent across the application. A distressed horror-poster treatment, blood-moon lighting, original masked apparition, claw details, ink grain, and original SVG artwork replace the shrine-led presentation; the three illustrations total 10,444 bytes before compression (about 4 KB gzip combined).

The landing page restores the supplied COUT Masters logo (`/logo.png`) and club seal (`/CC-logo.png`), alongside CEREBRO branding, `31 OCTOBER 2026`, `OPEN TO ALL`, and the exact centered line `Conducted By COUT<<MASTERS;`. The removed contest tagline and CBT label are absent. Its continuous Seven Seals scroll sequence uses a sticky apparition, direct step navigation, viewport-based active-step tracking, and individual process illustrations to explain local code execution, input-key usage, output submission, correct-output validation, repeated unlocking through the final challenge, and leaderboard progress. Important reminders appear as an oath below the continuous sequence. There are no cards or grid layouts in this section.

The question page uses a forensic reading area and framed output terminal, with no decorative illustration in the working area. The real input key sits in a separate tray directly above the answer console. Riddle Text, Problem Statement, Input Key, and Answer Box define its reading order. The title is compact; the output form is alongside the content on desktop and below it on mobile. Long code blocks and tables scroll inside their panels. Mobile entry focuses the heading without opening the keyboard or scrolling past the riddle. Output normalization and the existing submission callback remain intact.

The admin interface has a new illustrated login, control-room header/sidebar, responsive navigation, dark forms and tables, themed badges, statistics cards, and participant dialogs. Management actions and role restrictions are preserved. Administrative controls do not have surprise effects.

## Change colours, copy, artwork, and effects

| Location | Purpose |
| --- | --- |
| `src/theme-tokens.css` | Shared colours, fonts, fog opacity, and ember duration. Horror display type uses Creepster, condensed headings use Barlow Condensed, body copy uses Space Grotesk, and code uses Share Tech Mono. Local sans-serif fallbacks remain available. |
| `src/horror.css` | Player surfaces, game chrome, cards, forms, question layout, map, results, leaderboard, and responsive overrides. |
| `src/horror-motion.css` | Atmospheric layers, effects controls, keyframes, doorway reveal, and motion overrides. |
| `src/components/HauntMotion.css` | Existing player entry/exit presentation. |
| `src/components/HorrorAtmosphere.jsx` | Effects preference, visibility/motion listeners, cursor lantern, ghost trigger, and cleanup. |
| `src/components/HauntSymbols.jsx` | Original pumpkin/code mark and lightweight line icons. |
| `src/components/LandingScreen.jsx` | Landing date, organizer line, restored logos, hero composition, and footer. |
| `src/components/RitualGuide.jsx` | Seven Seals narrative, input-to-output explanation, sticky step navigation, scroll tracking, and reminders. |
| `src/horror-overdrive.css` | Distressed horror art direction, logo placement, the continuous guide, and upgraded challenge console. |
| `src/horror-overdrive-motion.css` | Click claws, perspective apparition pop-outs, and navigation reveals. |
| `src/components/DreadEntity.jsx` | Original masked apparition used in the hero, guide, and reactions. |
| `src/components/OfficialLogo.jsx` | Original logo assets with a readable fallback. |
| `src/components/RiddleScreen.jsx` | Challenge layout, form labels, and submission feedback presentation. |
| `src/admin/admin-horror.css` | Administrative theme and mobile layout, imported after existing admin styles. |
| `public/halloween/*.svg` | Original mansion, graveyard, and treasure-vault illustrations. The SVG source can be edited directly. |
| `public/halloween/legacy.css` | Compatibility theme for the older standalone HTML pages. |

Intensity controls:

- The visible Effects button floats on atmospheric pages and sits after the content on working screens so it cannot cover a form. It persists its preference as `toc-horror-effects` in local storage. It disables CSS animation/transitions, cursor effects, ghost surprises, and smooth scrolling.
- Operating-system `prefers-reduced-motion` overrides animated presentation. A user cannot re-enable movement against that preference using the button.
- Adjust `--h-fog-opacity` (default `.2`) and `--h-ember-duration` (default `14s`) in the shared tokens. Mobile uses lighter fog and four embers.
- Bat visits use a 31-second CSS cycle; mobile uses 45 seconds. The two eye details use 23- and 29-second cycles. There is no rapid flashing.
- Buttons and links across the player application trigger a brief claw mark and an apparition at the screen edge. Reactions last 1.1 seconds and are rate-limited to one trigger per 200 ms. They never cancel a click, delay navigation, read form values, or change focus. On working screens the apparition is smaller and confined to the upper edge.
- Click the pumpkin or type `boo` on the landing page/lobby to summon the apparition. Keyboard triggers ignore form/editable content and modifier combinations.
- A substantial scroll on the landing page/lobby can trigger a peripheral encounter, with a 9-second cooldown. Scroll also drives restrained parallax and the guide’s active step. Scrolling remains native, without scroll hijacking.
- Ambient scroll and keyboard surprises are limited to the landing page/lobby; click reactions cover player controls. A persistent effects layer survives player screen navigation. Inactive screens pause CSS animation. Hidden tabs stop effects, and effect listeners/animation-frame work are cleaned up when the active screen changes.
- The treasure reveal is limited to actual completion presentation. Expired and disqualified outcomes do not show it.
- Ambient audio was optional in the plan and is not part of this implementation. No sound plays automatically.

Displayed countdowns and quest status continue to use `questTiming.js` and existing schedule data. The landing date is event copy only. Do not change backend schedules to adjust that label.

## Verification

Baseline and final `npm run build` and `npm run lint` pass. Build inputs, deployment configuration, dependencies, API services, backend routes/controllers/middleware, and database code have not changed.

An isolated preview at `/scripts/halloween-preview.html` renders the real components with explicit sample data. It is available only through the development server, is not a configured production entry point, and blocks network calls and management mutations. No real contest attempt was started or submitted during verification.

Checked in the browser:

- Player landing, login, lobby, empty/error states, map, long question, completion, timeout, disqualification, and leaderboard at 320, 768, and 1440 CSS pixels. Also visually inspected representative screens at 390 pixels. Fixed title clipping at 320 pixels and long code-block overflow.
- All six authenticated admin sections at 320, 768, and 1440 pixels. Fixed long quest-select options and ranking-link controls at narrow widths. Tables retain contained horizontal scrolling.
- Real landing-to-login navigation and empty player/admin login validation, without transmitting credentials.
- Empty/incorrect output feedback, pending submission disabling, solved presentation, input-key formatting, and the answer field using the isolated fixture.
- Quest selection, all four schedule states, ended schedule dialog, Escape dismissal, and map checkpoint locks.
- Player and admin participant-detail dialogs; admin details can open using the keyboard. Shared native dialogs trap focus and restore the triggering control on dismissal.
- Effects off/on behaviour, persistence after reload, ghost trigger, and motion styles stopping through the effects control.
- Built production landing and admin-login presentation, to check stylesheet ordering as well as development rendering.

Core token contrast checks: body text/background 16.77:1; muted text/raised panel 8.30:1; primary button text/orange 6.91:1; purple text/raised panel 6.52:1; gold text/panel 10.57:1. These are checks of the defined solid colour pairs, not a claim of a complete accessibility audit.

Verification limits: live authentication, actual contest answer validation/ranking updates, and admin create/update/delete operations were not exercised. Their service/controller code and existing action callbacks were preserved. The OS reduced-motion setting was not changed during testing; its CSS/media-query support was inspected, and the in-app motion-off path was exercised. Smooth animation is a design target, not a measured 60fps guarantee.

## Preview locally

Run `npm run dev`, then open the app normally. For isolated layouts and states, open:

```text
http://localhost:5173/scripts/halloween-preview.html?screen=landing
http://localhost:5173/scripts/halloween-preview.html?screen=question
http://localhost:5173/scripts/halloween-preview.html?screen=admin
```

Use the sample-data toolbar to switch screens. In the question fixture, `16` demonstrates solved presentation; other outputs demonstrate incorrect-output feedback. These fixture behaviours are separate from the real game and are never used by the application.


## Horror revision verification

The subsequent revision restores the actual original logos, removes the guide card grid completely, changes the novel-like typography to a horror/condensed/sans-serif system, and rebuilds the question’s answer console. Browser checks cover 320, 390, 768, and 1440 pixels for landing, login, lobby, long question, and leaderboard layouts. No viewport overflow or clipped headings were found. Restored logo images report non-zero natural dimensions. Step 3 navigation correctly marks the coding act as current, and the mobile sticky navigation preserves the seven-step sequence. Empty/incorrect/pending/solved output states, decorative click reactions, motion-off behaviour, and navigation continuity were rechecked with isolated fixtures. Live contest submissions remain outside this verification.
