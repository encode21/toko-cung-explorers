# Compact landscape game menus

The shared game-panel skin now uses a 36px title bar, 5–8px content padding, compact 32px tabs and filters, 34–36px actions and smaller corner radii. HUD movement controls retain their original sizing. Menu sheets fit their content instead of stretching a short list across the full available height. Profile and wardrobe retain a bounded working area; map width is capped at 580px. Scroll regions, focus handling, Escape, safe-area offsets and gameplay panel locks remain in place.

Profile now places the actual 3D avatar and identity beside progression, profile editing, customization and channel actions. Collectible characters use their equipped model. All existing role permissions, ownership and persistence are unchanged. No decorative fake equipment slots or new gameplay stats were introduced.

Design references:
- Dota 2's reduced interface footprint: https://www.dota2.com/700/hud/
- Ragnarok equipment/inventory organization: https://mobile.gnjoy.in.th/the_ragnarok/the-ragnarok-patch-update-04-07-en/

Implementation: `src/ui/game-ui/game-ui.css`, `src/ui/profile/ProfilePanel.tsx`, `src/ui/hud/HudSheet.tsx`.

Validation: TypeScript, targeted ESLint, production build; existing browser panel coverage at 667×375, 740×360, 844×390, 932×430, 1024×768 and 1280×720. Wardrobe purchase/preview/equip/save, cancel/reset, failed catalog and retry tested at four landscape sizes. Browser tests use mocked transport and desktop Chrome touch emulation; physical phones and production deployment are not verified.


## Shared game dropdowns (2026-10-13)

All remaining authored native selects now use `GameDropdown`, a Radix menu matching the wardrobe's dark/gold style: settings, principal leaderboard, club song/lighting, world editor, reactive-world debug, and avatar viewer. Options remain keyboard/touch accessible, the menu is bounded to the viewport, Escape closes only the menu, and fullscreen portals stay inside the fullscreen element. The shared component and styles live in `src/ui/game-ui/GameDropdown.tsx` and `game-dropdown.css`.

`.env` was removed from the Git index with `git rm --cached`; its local contents are retained. The existing `.gitignore` already excludes it. Example environment files remain tracked. This change does not rewrite published history.

Dropdown checks extend the existing HUD browser harness: selection, theme, viewport bounds, keyboard opening, Escape and restored focus. For focused WebKit coverage: `HUD_QA_BROWSER=webkit HUD_QA_DROPDOWN_ONLY=1 node scripts/check-game-ui-browser.mjs`. Chromium retains the full HUD suite, including CDP multitouch checks that WebKit cannot run.

Validation completed: full Chromium HUD suite and focused WebKit dropdown checks passed at all six sizes; TypeScript and production build passed. Targeted ESLint has no errors and one pre-existing EditorPanel hook warning. Screenshots: `docs/dropdown-qa/`. Physical iPhone testing was not performed.
