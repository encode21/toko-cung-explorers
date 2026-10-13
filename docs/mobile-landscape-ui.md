# Player runtime: compact landscape UI

Scope: Toko Cung World player routes and runtime only. Retail checkout, the Laravel CMS, and World Editor are separate applications/interfaces. No account permissions, ownership checks, networking protocol, or quest reward rules are replaced by this UI.

## Shared system

`src/ui/game-ui` owns the landscape tokens and reusable GameButton, GameIconButton, GamePanel, GameModal, GameTabs, GameDropdown, GameTooltip, GameToast, GameDialog, GameInventoryGrid, and GameScrollArea. Defaults: 12px content, 15px titles, 44px main targets, 10px padding/radius. Comfortable mode uses 13px/16px text. This changes layout and component sizing, not a transform applied to the entire interface.

Floating sheets leave the world visible. Modal headers/close buttons and footers stay outside the scrolling content. Radix manages modal focus and nested dismissal. Portals stay within the game viewport, including fullscreen. Safe-area variables bound all panels. VisualViewport resize/scroll updates usable dimensions without remounting the session. NPC input remains in the fixed footer. Opening a panel clears gameplay input; closing it does not discard game state.

Touch portrait mode makes the existing game subtree inert and displays a rotate-device prompt. It does not conditionally remove the canvas or leave the channel. Fullscreen and optional landscape lock are requested only by an explicit button; unsupported browsers retain manual rotation.

## Click-flow audit

| Entry / nested flow                                                      | Implementation and scope                                                                                                                                                                                                                |
| ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Landing → sign-in → lobby → channel                                      | Landing and identity use a bounded two-column entry layout, two-column forms and persistent submit footer. Lobby retains compact channel cards. World Editor bypasses the landscape guard.                                              |
| HUD → profile → edit name / role                                         | Shared floating panel, compact summary and tabs. Existing server-authoritative role/save logic retained.                                                                                                                                |
| Profile → customize → face / clothes / accessories → save / reset / back | Bounded two-column designer, fixed actions, shared live appearance draft; back clears draft through the existing store.                                                                                                                 |
| Profile → collection → equip / AppBridge                                 | Inventory grid with existing ownership checks; purchases continue to the configured official app. No client-side purchase or unlock simulation.                                                                                         |
| Quest → details / history → cancel confirmation                          | Bounded list/detail columns; nested GameDialog; existing command logic.                                                                                                                                                                 |
| Active quest → clue / secret → question / answer → result                | Ground ring at player feet with a rotating directional chevron and pulsing target. Nearby quest actions appear by the right-hand controls (tap or F), independently of the collapsed tracker; bounded discovery/dialogue/reward modals. |
| Dungeon → mission board → leaderboard → filters                          | Shared modal with internal scroll; existing server commands and ranking data. Dungeon tracker remains compact.                                                                                                                          |
| Club → music → request / queue / DJ Console                              | One bounded tabbed panel; requests available on mobile; DJ eligibility still checked by existing authoritative state. Official visible video provider retained.                                                                         |
| Club → dance → move / stop / sync                                        | Compact radial selection and nearby-dancer list. Sync uses the existing club command.                                                                                                                                                   |
| Chat → nearby / world / system / players → player profile                | Scrollable messages and compact composer; nested profile modal; Escape dismisses only the top modal. Player identity resolved through the authenticated connection lookup.                                                              |
| World avatar → player profile → sync / world chat                        | Desktop click or short touch-camera-zone tap; dragging remains camera movement. No fake private-message or invite actions.                                                                                                              |
| HUD → notifications / help / secret archive                              | Shared floating sheet and scroll region.                                                                                                                                                                                                |
| Pengaturan → sound / settings                                            | Audio modal; persistent graphics, camera/analog sensitivity, UI size, tracker, diagnostics and optional fullscreen.                                                                                                                     |
| HUD → minimap / detailed map → exploration destinations                  | Minimap at far right, expanded bounded map with adjacent legend; existing travel/interact actions preserved.                                                                                                                            |
| NPC → quick questions / typed question / reply                           | Shared modal, internally scrolling transcript/options, persistent input footer and close button.                                                                                                                                        |
| Legacy product / POS / payment / success components                      | Their common OverlayShell inherits bounded modal styling. These are dormant: game-store routes shopping back to the official application; no retail flow is re-enabled.                                                                 |

Main HUD keeps a small profile, a 72px far-right minimap showing 64 meters across, and compact centered bottom navigation with horizontal icon/label. Pengaturan contains secondary utilities. A chat preview sits at the lower left above navigation, with a reserved strip outside the analog touch zone. Analog appears at the initial touch position and disappears when released; camera and movement use independent captured pointers. Pointer cancellation, blur, portrait mode, and opening panels clear input.

Graphics AUTO samples actual render timing with cooldowns, adjusting DPR, shadows and view distance. Device-level world complexity and physics timestep remain unchanged by automatic quality changes. Diagnostics show measured FPS, draw calls and triangles, not promised device performance.

## Reproducible checks

Browser fixture uses the actual UI components with mocked network responses:

```sh
PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node scripts/check-game-ui-browser.mjs
npx tsc --noEmit
npm run build
node scripts/check-quest-guidance.mjs
PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node scripts/check-entry-browser.mjs
```

`check-hud-browser.mjs` forwards to the complete UI suite. Browser viewports: 667×375, 740×360, 844×390, 932×430, 1024×768, 1280×720. The suite checks panel bounds, no page/horizontal overflow, visible close controls after content scrolling, nested profile and quest dialogs, appearance draft cancellation, inventory, audio/settings, NPC/secret/dungeon/reward panels, leaderboard, club/DJ, independent two-finger input, and portrait→landscape preservation of the mounted fixture. It also simulates VisualViewport height reduction to 180px to exercise the keyboard resize handler. Screenshots default to `/tmp/toko-hud-qa/screenshots` (override `HUD_QA_OUTPUT`).

These are Chromium browser/fixture tests, not physical-device certification. Still verify iOS Safari and Android keyboard/safe-area/fullscreen behavior, live channel reconnect, two-account dance sync, real purchase handoff and official YouTube playback with deployed credentials. Real-device FPS/thermal/battery results have not been measured. The separate entry fixture renders real landing/auth components with TanStack Router across all six viewports. It verifies landing → login → register → existing-account setup → PIN recovery → home, form validation, no default login/register scrolling, visible submit actions, and focused input visibility during a simulated 180px keyboard viewport. Authentication responses are mocked; no live accounts are created. Entry screenshots default to `/tmp/toko-entry-qa`. Lobby channel selection still requires live integration testing.

Existing standalone `check-quest-actions.mjs` and `check-state-protocol.mjs` currently fail in their loaders before assertions (unresolved alias import and `.ts.ts` resolution respectively). They are not counted as passing regression checks; no production store/protocol changes were made to work around their loaders.

Quest interaction QA also checks approach/leave radius, replacing the generic interaction control, opening discovery by touch/F, and a rendered Three.js ground marker that follows position, rotates toward the target, hides the arrow on arrival, and disappears when the run finishes. Mock state and a simple preview avatar are used; this does not certify live server reward delivery.
