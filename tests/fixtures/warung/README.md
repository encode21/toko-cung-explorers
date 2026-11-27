# Warung native-browser preview

From the repository root, run `node scripts/serve-warung-preview.mjs`, then open
`http://127.0.0.1:4224/?state=waiting` in the native browser. The script never launches
a browser. `--build-check` checks the module graph without opening a server.

- `waiting`: three patient customers. Press **Layani** to start the real timer.
- `serve`: two requested items already active; the production timer runs immediately.
- `retry`: press **Layani**, pick the requested items and submit. The first request
  fails before saving. Retry succeeds and updates stock/cash exactly once.
- `story`: Teh Euis asks for credit for two Teh gelas and three Mi instan. The
  arrived customer stays at the counter so both decision buttons can be checked.
- `story-long`: the same credit request with nine product lines, for checking
  long content, scroll affordances, and visible actions on short landscape screens.
- `story-retry`: the first **Kasih utang** or **Belum bisa** request fails before
  saving; retry succeeds. Acceptance removes stock and records a debt; rejection
  leaves stock unchanged. The pending event clears only after success.
- `story-delivery`: the same story card beside an active delivery summary. Two
  orders total **3 dus**, with the next arrival initially **1:35** away. Useful
  for checking that delivery status leaves both story decisions visible.
- `delivery`: two delivery orders totaling **3 dus**, arriving after 95 and 140
  seconds. The production countdown polls the local transport; each arrival
  moves only its own goods into stock and clears only that order.
- `delivery-arrived`: both truck orders are already due. The production polling
  reads the local snapshot, receives their goods once, and clears the summary.
- `delivery-carrying`: **3 dus** already carried inside the owner's warung.
  **Taruh dus** receives both orders, increases rack stock, and clears the prompt.
- `delivery-retry`: the same carried boxes, but the first **Taruh dus** fails
  before receiving anything; the next attempt succeeds exactly once.
- `decor`: opens the standalone **Dekorasi** panel. The owner has Rp248.500,
  an unequipped Cat mint, and an equipped Poster promo. Check Dinding, Kanopi,
  Lantai, and Hiasan; purchase an available item, equip it, restore a default,
  and remove/reapply the poster. Higher-level pieces remain locked.
- `decor-low-cash`: the same panel with Rp5.000, so unowned paid pieces cannot be
  purchased while owned/default pieces can still be equipped or removed.
- `decor-retry`: the first valid decor purchase fails without deducting cash or
  granting ownership. Retry succeeds; buying still requires a separate equip
  action and owned pieces never charge a second time.
- `decor-placement`: level 2 with three posters, two plants, and a dining table
  owned and equipped at their original locations. In **Hiasan**, select a piece
  and drag it or use the position controls. Moves stay on their supported
  surface, clear of shelves, the counter, the customer path, and other pieces.
  A saved position survives closing/reopening the panel, reading the snapshot,
  and leaving/revisiting the owner's warung during the same fixture session.
  **Lantai** shows the chosen floor in the empty shop shell.
- `decor-place-retry`: the same placement setup, but the first valid placement
  save fails before changing the layout. The previous position remains saved;
  retrying succeeds without charging cash. Invalid moves do not consume the
  simulated connection failure.
- `empty`: empty stock, followed by the normal empty-stock visitor flow.
- `closed` / `sealed`: shop unavailable because of hours or unpaid rent.
- `visitor` / `worker`: another owner's shop. Use **Belanja** / **Part-time** in the
  real HUD. Worker customers use the real queue generator.
- `community`: standalone Komunitas panel with synthetic neighboring warungs, offline
  popular warungs, and weekly standings. Add `&tab=juara` to open Papan juara.
  The owner's warung is included in the transport data so exclusion can be checked.
  Visits use the selected warung ID and move the fixture camera to that room.
- `community-empty`: empty directory and leaderboard.
- `community-error`: the first directory load fails; **Coba lagi** succeeds.
- `community-visit-retry`: the first visit fails; the second visit succeeds.
- `store`: real StoreInterior and Shelf/RetailShelf at the original store positions,
  viewed toward the sembako shelf; add `&view=instant` for the instant-food shelf.
  This visual fixture excludes the city and WarungHud, and places the player inside the store.
- Add `&controls=1` for a small test-only **Ulangi skenario** button. Reloading or
  pressing **Alt+Shift+R** resets all state. Exiting shows a fixture-only return button.
- Add `&pace=slow` to scale only 1000ms intervals to 10000ms for native visual QA.
  The tab title is marked **SLOW FIXTURE**. Default timing is unchanged.

The fixture renders real WarungScene, WarungHud, Physics, GameViewport and the
production noon lighting/environment. Camera offsets import the shared counter-view
constants; visitor mode frames the counter from the entrance at the in-game arrival angle. The full player movement
controller and multiplayer transport are intentionally not mounted, so movement
locking and multiplayer must still be checked in the actual world.

All names, stock, money and requests are test-only. Vite aliases the world API and
realtime module; the in-memory client supports only warung read/serve/work/visit/buy
plus management, validated decor placement, story-event decisions, delivery,
directory, leaderboard, and empty lot reads. Placement support is explicitly
advertised by the local snapshot. The fixture keeps its simulated server state
in memory; a full browser reload or scenario reset intentionally starts fresh.
Any other operation throws locally. It does
not read environment files or sign in to a real account. Asset files may still load
normally from the local preview or the game's existing font source.

Run `node scripts/check-warung-fixture-transactions.mjs` for local transaction
checks covering all four decor categories, ownership, cash/level guards,
purchase retry, extra removal, arrival polling, and unload retry. The checks use
an isolated in-memory clock and never call the live game or open a browser.

Run `node scripts/check-warung-decor-placement.mjs` for placement and geometry
checks: original positions, an unobstructed floor preview, finite coordinates,
surface and boundary rules, furniture/customer-route/decor collisions, unknown
or mismatched instances, owned/equipped guards, atomic save failure, retry,
idempotency, independent reads, owner revisits, and saved geometry positions.
These checks use the real shared validator and room geometry with the isolated
fixture transport; they never contact the live game or open a browser.

With the fixture server running, use `node scripts/check-warung-decor-preview.mjs`
to verify that selecting checkerboard, wood, and cream floors redraws the actual
canvas without moving the camera or purchasing/equipping a product. It checks
desktop and landscape phone sizes in Chrome. `WARUNG_PREVIEW_URL` can select a
different local fixture port; `PLAYWRIGHT_MODULE` can point to a Playwright module
when it is provided by an external runtime.
