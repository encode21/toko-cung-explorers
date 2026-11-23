# Warung native-browser preview

From the repository root, run `node scripts/serve-warung-preview.mjs`, then open
`http://127.0.0.1:4224/?state=waiting` in the native browser. The script never launches
a browser. `--build-check` checks the module graph without opening a server.

- `waiting`: three patient customers. Press **Layani** to start the real timer.
- `serve`: two requested items already active; the production timer runs immediately.
- `retry`: press **Layani**, pick the requested items and submit. The first request
  fails before saving. Retry succeeds and updates stock/cash exactly once.
- `empty`: empty stock, followed by the normal empty-stock visitor flow.
- `closed` / `sealed`: shop unavailable because of hours or unpaid rent.
- `visitor` / `worker`: another owner's shop. Use **Belanja** / **Part-time** in the
  real HUD. Worker customers use the real queue generator.
- `store`: real StoreInterior and Shelf/RetailShelf at the original store positions,
  viewed toward the sembako shelf; add `&view=instant` for the instant-food shelf.
  This visual fixture excludes the city and WarungHud, and places the player inside the store.
- Add `&controls=1` for a small test-only **Ulangi skenario** button. Reloading or
  pressing **Alt+Shift+R** resets all state. Exiting shows a fixture-only return button.
- Add `&pace=slow` to scale only 1000ms intervals to 10000ms for native visual QA.
  The tab title is marked **SLOW FIXTURE**. Default timing is unchanged.

The fixture renders real WarungScene, WarungHud, Physics, GameViewport and the
production noon lighting/environment. Camera offsets import the shared counter-view
constants; visitor mode uses the existing overhead view. The full player movement
controller and multiplayer transport are intentionally not mounted, so movement
locking and multiplayer must still be checked in the actual world.

All names, stock, money and requests are test-only. Vite aliases the world API and
realtime module; the in-memory client supports only warung read/serve/work/visit/buy
and harmless empty directory/lot reads. Any other operation throws locally. It does
not read environment files or sign in to a real account. Asset files may still load
normally from the local preview or the game's existing font source.
