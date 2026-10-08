# Mobile, profile and traffic stabilization

Implemented without changing the approved map, road geometry, NPC population, player controller or HUD regions. No Event Engine was added.

## Mobile

The world root previously followed the layout viewport, which can extend beneath mobile browser chrome or the keyboard. `useWorldViewport` now measures VisualViewport on resize/scroll, coalesces changes with requestAnimationFrame, and supplies one usable rectangle to the existing canvas and HUD. CSS retains vh/dvh fallbacks and includes safe-area spacing. The dock and touch controls share a clearance variable; short viewports put interaction/jump controls beside each other. Touch movement resets on blur/viewport resize. Renderer identity is preserved.

## Profiles

Previously saves did not verify a returned database row, and broad writes could overwrite unrelated profile fields. Profile saves now serialize partial updates, require a matching `updated_at`, and commit the canonical returned row only after acknowledgement. Errors remain visible with retry/reload controls. The local appearance draft remains the only avatar preview source. The world entry name uses the same acknowledged save path; the older unchecked name-writing helper was removed.

Presence and `player_profile_updated` messages invalidate remote profile data. Peers read canonical profiles from Supabase rather than trusting broadcast roles or collectibles. Microsecond timestamp comparisons reject older reads. Fresh presence includes pose, animation and account metadata; joining/reconnecting requests snapshots and reloads profiles. Remote avatar roots retain stable keys/ref callbacks during appearance patches.

**Apply `supabase/migrations/20261008120000_profile_write_validation.sql` before production rollout.** It validates profile fields, protects assigned roles, verifies equipped-character ownership, revokes client ownership grants, and supplies monotonic revisions. It was tested locally but NOT applied to the connected Supabase project: no administrative database connection was available. Existing data/ownership grants are not retroactively audited by this migration.

## Vehicles

Previously missing snapshots could cause followers to simulate independently, and mobile omitted a shared vehicle. All clients now mount the same four stable vehicle entities (including the inactive delivery entity). One elected connected/visible peer runs movement, spawn clearance and the stuck watchdog. Followers only reconstruct route progress from snapshots; missing authority hides them instead of starting local simulation. Delivery NPC calls that change truck state run only on the traffic host.

Snapshots include route, progress, speed, active state, lifecycle state, host generation and sequence. Normal rate is 8 Hz, with rate-limited transition updates and forced join snapshots. Extrapolation is capped at 200 ms. Large differences/respawns snap; small differences interpolate without wrapping across route endpoints. Retired generations and old sequences are ignored. Handoff adopts the last snapshot and rechecks spawn clearance.

Authority is the earliest-joined visible peer, not a dedicated server. This fits the existing Supabase Realtime architecture, but is not a trusted anti-cheat simulation or a consensus protocol under network partitions. Presence convergence/live transport behavior still needs staging QA.

## Validation performed

- `npx tsc --noEmit`: passed.
- ESLint on all changed TypeScript/TSX plus the new protocol check: passed.
- `npm run build`: passed.
- `node scripts/check-state-protocol.mjs`: passed malformed/duplicate snapshots, respawn correction, microsecond revision ordering and avatar rehydration.
- `node scripts/check-road-network.mjs`: passed existing road geometry, vehicle routes, clearance and watchdog checks.
- PostgreSQL via temporary PGlite instance: applied the base schema and new migration; verified persisted writes, revision changes, stale-write rejection, avatar validation, staff-role denial, ownership-grant denial and equipping an owned character.
- Two headless Chrome tabs rendering the actual world/controllers/HUD with a local Supabase API fixture (shared local persistence + BroadcastChannel): profile save, remote name/appearance patch, save failure, refresh, reconnect, matching vehicle IDs/routes/approximate positions, authority handoff, forced blocked recovery, shared despawn/respawn and stale-snapshot rejection passed. No browser exceptions.
- Mobile Chrome emulation at 390×844, 390×650, 844×390 and 390×400: dock and touch controls inside the usable viewport, non-overlapping dock/joystick/jump, all dock buttons ≥44 px, correct canvas size and unchanged canvas node. Screenshots inspected.

The browser fixture substitutes authentication/database/realtime transport; it is not a live Supabase end-to-end test. Resize emulation is not verification of physical iOS Safari, iOS Chrome or Android browser chrome/keyboard behavior. Those device checks and live authenticated two-user QA remain deployment follow-ups.

Local screenshots/test harness logs are in `/tmp/toko-time-qa/stabilization-*`; temporary browser fixtures are in `/tmp/toko-stabilization-fixture`. These local artifacts are not required at runtime.

## Changed files

Mobile:
- `src/hooks/use-world-viewport.ts` (new)
- `src/styles.css`
- `src/routes/__root.tsx`
- `src/routes/_authenticated/world.tsx`
- `src/ui/OverlayShell.tsx`
- `src/ui/hud/ActionDock.tsx`
- `src/ui/hud/HudSheet.tsx`
- `src/ui/hud/MobileControls.tsx`

Profile/network:
- `src/auth/useSession.ts`
- `src/identity/profile-store.ts`
- `src/identity/profile-data.ts` (new)
- `src/net/profile-sync.ts` (new)
- `src/net/net-store.ts`
- `src/net/useWorldChannel.ts`
- `src/ui/GameUi.tsx`
- `src/ui/profile/ProfilePanel.tsx`
- `src/game/net/RemotePlayers.tsx`
- `supabase/migrations/20261008120000_profile_write_validation.sql` (new)

Traffic:
- `src/game/traffic/TrafficSystem.tsx`
- `src/game/traffic/traffic-sync.ts`
- `src/game/traffic/traffic-protocol.ts` (new)
- `src/game/simulation/NakamaOps.tsx`

Validation/documentation:
- `scripts/check-state-protocol.mjs` (new)
- `docs/stabilization-qa.md` (new)
