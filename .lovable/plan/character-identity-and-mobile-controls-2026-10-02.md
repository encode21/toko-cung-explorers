# Character Identity and Mobile Controls

## Goal
Polish the existing character/profile foundation and make mobile movement plus camera control reliable, while preserving the current HUD layout and mobile performance work.

## Build
- Standardize profile, collection, and customization actions so primary, secondary, active, owned, locked, purchasable, saving, and disabled states are visually distinct and readable.
- Expand the role registry into a future-ready profession catalogue, separating public selectable roles from assigned or upcoming jobs such as seller, shop owner, therapist, DJ, event staff, tenant staff, host, and security.
- Add a focused role selector section showing the active role, description, availability, requirements, and clear select/active/coming-soon states; keep staff authority enforced by Lovable Cloud.
- Refine the shared low-poly chibi avatar language with smoother proportions, faces, hair, clothing silhouettes, accessories, and role presets; use the same shared avatar renderer for players and NPCs where practical, while keeping Koko Cung premium and distinctive.
- Split mobile input into independent controls: left joystick for camera-relative movement and an invisible right-side swipe zone for yaw/pitch camera look, with separate pointer IDs for true multitouch.
- Clamp and smooth third-person camera orbit, preserve indoor distance, and prevent touch gestures on HUD panels or open sheets/modals from controlling gameplay.
- Show touch controls only when the world/player controller reports ready; reset inputs whenever a blocking panel opens or the app loses focus.

## Technical details
- Keep identity, profession, appearance, and collection as separate data concepts under the existing identity modules.
- Continue treating staff roles and collectible ownership as server-authoritative; no client-side privilege escalation.
- Add a small transient input/readiness store shared by the R3F player and DOM touch controls, avoiding React updates inside the frame loop.
- Reuse the canonical player root transform and the existing lightweight avatar geometry/material approach to avoid mobile regressions.
- Preserve all current HUD regions, navigation, minimap, header, utility cluster, and interaction prompt styling.

## Verification
- Run TypeScript checks and inspect preview diagnostics.
- Verify desktop has no joystick.
- Verify mobile movement, right-side camera look, simultaneous two-thumb input, pitch limits, and controls hiding/restoring around Profile, Chat, Map, and store overlays.
- Verify profile buttons and role states at mobile and desktop sizes, plus character appearance in the live 3D world when authentication is available.
