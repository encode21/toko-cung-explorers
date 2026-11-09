# Mini-game alun-alun

Original local festival activities at the new Pasar square, around `(104, 35)`. Reuses the existing stage, World channel lease, account gateway, player/camera, touch surface, chat HUD and OutdoorBatch. No added dependency. No World Point, XP, campaign, daily cap or redeem changes: rewards are permanent collectible badges only.

## Schedule and play

In `/world-admin`, use **MINI_GAME**. Select **Benar atau Salah**, **Balap Karung**, or **Tangkap Ayam**, set start/end in WIB, enable and save. One schedule per type follows the existing revision/audit workflow; saving replaces that schedule and ends its old round. Existing NATIONAL_DAY decoration schedules remain independent.

Each room has its own lobby of 2–8 distinct accounts. Come to the square and choose **Gabung ronde**. The second player starts an 8-second countdown. A departure below two resets the countdown; fewer than two connected participants during a game cancels the round without a badge. Results stay for 15 seconds, then a fresh lobby opens while the schedule is active. A disabled, replaced or expired event stops its round. Scheduled/active events appear in chat and HUD; announcements deduplicate by event ID. After dismissing a notice, approach the arena and use **F / Gabung** to join or replay; the notice reopens for a participant.

- **Benar atau Salah:** walk with WASD/joystick to the green **B / Benar** zone (west) or peach **S / Salah** zone (east). Five randomized backend questions, 8 seconds each. The last position received before the deadline determines the answer; the center gap/outside/missing answer eliminates the player. Move early enough for the one-second heartbeat. Wrong players may spectate. Last survivor or surviving highest score wins; no survivor means no winner.
- **Balap Karung:** Space or the existing touch jump/context **Lompat** button. Twelve accepted hops over a 24 m track; at least 700 ms between hops, 60-second limit. The server owns progress, the client animates the sack and hop. First to 12 wins; on timeout highest positive score wins, ties share the badge. Normal movement resumes after ending/leaving.
- **Tangkap Ayam:** enter the fenced arena through the stage-side gate. Walk toward an available chicken, press F or **Tangkap**. Server checks proximity (1.8 m), cooldown and exclusive capture. Five slowly wandering chickens respawn after 5 seconds; highest positive score after 40 seconds wins, including ties.

**Keluar ronde** always leaves voluntarily. Vehicle/carry/flight participants must finish that interaction first. Normal mobility becomes unavailable while participating. Finishing/disconnection restores ordinary player physics. A late or stale action cannot join a different round.

Winner badges: **Cermat Alun-alun**, **Lompat Juara**, **Sahabat Ayam**. The result names the saved badge; the HUD shows the collection count (hover for names). Each account can earn each badge once, across rooms and replays. The database stores the first awarding round; repeated polls cannot duplicate it. No badge purchase/economy path is introduced.

## Contract and authority

`worldRequest("minigames", ...)` → authenticated `POST /api/world/minigames`:

- Actions: `read`, `join`, `leave`, `jump`, `catch`. Fields: room, owned connectionId, three-component position; roundId required for mutations; chicken ID for catch.
- Response: serverNow, schedule, round (phase/deadline, scores, eliminated/left flags, winners, public current prompt/chicken poses), own badges. Account IDs, player positions, question order and future/correct answers are omitted. The resolved answer is revealed only after its deadline.
- The existing channel row lock serializes actions per room, including simultaneous captures. Active channel lease and account ownership are checked. A 12-second missing heartbeat marks a participant absent. Reconnect/new connection must wait for a new lobby after a running-round departure.
- Clients poll at 1 Hz near the square/while participating and every 5 seconds elsewhere. Actions replace recent polls to avoid redundant traffic. Five-second stale authority stops local race anchoring. The existing broadcast channel still carries ordinary avatar presence; mini-game score/lifecycle authority is entirely HTTP/server-owned.
- Rounds advance lazily on commands/reads, using server time, without a scheduler or realtime-host dependency. Empty rooms are settled on the next request. One JSON state per room retains only the current/latest round; badges are durable. No round-history analytics or background cleanup service is added.
- Arena meshes and fence colliders mount only within 55 m. Static details use OutdoorBatch; at most five chicken models animate. Existing district streaming still controls terrain/roads.

## Trust limits

**None of these games is currently approved for Point payouts.** The quiz validates its answer on the server but trusts reported player coordinates; a modified client can teleport to the correct side or memorize the bank. Chicken range also uses client-reported positions. Sack progress is server-counted and rate-limited, but requests can be automated and first-arrival timing favors lower latency. Multiple legitimate accounts can collude. Badges deliberately carry no cash value. Enabling Point would require further movement/participation anti-abuse controls plus the existing campaign-funded, capped, idempotent award path; this feature does not call it.

## Files and rollout

Frontend: `src/game/minigames/{model,store,MinigameArena}`, `MinigamesHud` and owned CSS; additive gateway/channel lifecycle; Player/RemotePlayers, mobility availability, keyboard/context controls and `OutdoorNeighborhood`. Tests reuse the existing two-player world fixture. Backend: `WorldMinigames`, `WorldContent::TYPES/saveEvent`, admin view, account route, additive `2026_11_09_170000_create_world_minigames`, `WorldMinigamesTest`, local-only fixture router.

1. Merge map expansion, then vehicles, then this stacked branch in each repository. Vehicle migration/services are prerequisites.
2. Deploy backend and run the additive mini-game migration in the intended environment. It adds `world_minigame_rooms` and `world_minigame_badges`; it neither seeds an active event nor alters wallet tables.
3. Publish frontend, then configure MINI_GAME from `/world-admin`. All clients should use the matching build. Start with badge-only playtesting.
4. To stop, disable MINI_GAME and wait for clients to refresh. Roll back frontend first; preserve badge tables. The migration intentionally refuses destructive rollback.

No production DB command, migration or deployment was run for this work.

## Verification

- TypeScript and Vite build pass.
- Backend World suite: 147 tests / 1,209 assertions (disposable SQLite, no production settings).
- `WORLD_QA_BACKEND=/path/to/toko-cung node scripts/check-minigames-browser.mjs`: two 844×390 touch tabs exercise real Player/Rapier/HUD and Laravel domain services through a disposable local fixture. All three games pass lobby → countdown → score → saved badge; race tests keyboard and real touch input; quiz tests ordinary walking; a disconnect cancels a running round. Screenshots/report: `docs/qa/minigames/`.
- QA accelerates countdown/question/end deadlines through a **test-only** clock route. Gameplay inputs are real browser inputs; identities, temporary DB and presence transport are synthetic. QA-only placement chooses quiz sides/chicken proximity; server tests separately reject invalid zones/range and duplicate captures.
- Physical mid-range phones, production account transport/realtime, high latency/load, and full-session performance remain unverified. The map benchmark in `map-expansion.md` is a desktop fixture measurement, not an FPS claim for a populated mini-game.
