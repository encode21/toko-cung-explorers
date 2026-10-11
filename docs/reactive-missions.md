# Reactive Mission Layer V1

Two optional missions reuse Reactive World events and existing player interaction, HUD, audio, and world channel. Ignoring or failing a mission never changes the world event. No map, NPC, traffic, SceneTime, profile, database, inventory, or business-order redesign is involved.

## Ownership and files

- `src/game/missions/model.ts`: definitions, event-derived offers, objective reducer, proximity/cooldown validation, cancellation, expiry, and contribution accounting.
- `schema.ts`: network/checkpoint validation; `store.ts`: UI projection and analytics subscriptions.
- `runtime.ts`: elected traffic host processes action commands and replicates room session snapshots through the existing `useWorldChannel` channel. It reconciles lifecycle and isolates mission errors.
- `MissionParcel.tsx`: local temporary parcel attached to the existing player visual root.
- `src/net/useWorldChannel.ts`, `net-store.ts`: presence session identity plus mission command/result/snapshot messages; existing host election and player positions are reused.
- `src/game/player/Player.tsx`, `src/state/game-store.ts`, `src/ui/hud/ContextPanel.tsx`: mission proximity targets dispatched through the normal desktop F/mobile action; existing animations and audio cues.
- `src/ui/hud/MissionTracker.tsx`, `Hud.tsx`, `EventFeed.tsx`: compact offers/tracker/cancel confirmation, completion feedback through existing feed/toast.
- `src/game/reactive-world/ReactiveWorldDebug.tsx`: development-only force-expiry and session contribution display.
- `scripts/check-reactive-missions.mjs`: deterministic reducer regression checks.

## Player flows

An ACTIVE STORE_RUSH offers **Bantu Kasir**. Accept, approach the existing cashier front, and use F or the mobile interaction button to **Scan Barang** five times. Each valid action has a 1.1-second cooldown, scan sound, and brief checkout animation.

An ACTIVE WAREHOUSE_RUSH offers **Bantu Gudang**. Accept, approach the left parcel stack, **Ambil Paket**, walk to the central packing table, and **Taruh Paket**. Repeat three times. Picking up switches the target to the table; a second pickup is rejected. The parcel is cosmetic and movement remains enabled. Completion, cancellation, or expiry clears it. These actions never create orders, consume business stock, or increment shipped counts.

Only one mission may be active. Other offers remain visible with an explanation. COURIER_PICKUP has no mission. Each source event permits one attempt per session, including cancellation; intensity/revision changes do not grant another attempt.

Unaccepted offers disappear with their ACTIVE source event. Accepted missions get up to two minutes after source removal, bounded by source expiry plus two minutes and a fixed 15-minute maximum from acceptance. Grace never renews on reconnect. No stressful countdown is shown.

Completion grants **Kontribusi +1** once, stored with the room session. This is not permanent account XP, a currency, or an entitlement.

## Multiplayer and persistence

Each tab/account has a stable random session ID in sessionStorage, announced through existing presence. The host derives the session from roster membership; commands contain action, expected revision, and request ID, never arbitrary progress or reward. It validates mission state, action order, cooldown, objective, and proximity against existing player state. Snapshots use the elected traffic host and revision checks. New hosts continue their replicated snapshot; reconnect follows the elected host snapshot, including a fresh room that restarted while the tab was offline.

Session checkpoints survive same-tab refresh and short reconnect. Invalid or older-than-two-hour checkpoints are discarded. Each client displays only its own mission and contribution. Closing the tab, clearing browser storage, or joining an entirely new room can lose session progress. If storage is unavailable, state remains memory-only. At most 64 sessions and 64 recently finished source IDs per session are retained.

This uses the **existing peer-host MOCK trust model**, not a hardened backend authority: browser checkpoints, presence identities, and player positions are client-originated. Rewards deliberately do not affect persistent profiles or privileges. Valuable/persistent rewards would require authenticated server-side mission ownership and validation. Mission parcel rendering is local; remote peers may see the existing carry animation.

## Analytics

`onMissionSignal(listener)` from `store.ts` returns an unsubscribe function. Signals: `mission_offered`, `mission_accepted`, `mission_progress`, `mission_completed`, `mission_cancelled`, `mission_expired`. Callbacks are isolated from gameplay; no external analytics provider is added. Initial checkpoint restoration does not replay completion rewards or sounds.

## Validation

Automated reducer checks cover offers, single-active rule, wrong action, proximity, cooldown, five scans, three carry/drop cycles, duplicate rewards, cancellation, grace/expiry, checkpoint round-trip, and independent sessions.

Browser QA uses the actual scene/physics/HUD with a temporary local BroadcastChannel transport replacing Supabase: desktop keyboard scanning, warehouse carry/place, two independent clients, host handoff after refresh, restored 2/5 progress, short reconnect, cancel, mobile contextual interaction, mobile tracker/control separation, source-ended grace, and forced expiry. Production Supabase connectivity was not end-to-end tested with live accounts.

TypeScript, changed-file lint, production build, and existing reactive-world/spawn, road, traffic, protocol, audio, world-plan, and SceneTime regression scripts are the final checks. Temporary browser fixtures remain outside the repository.
