# Shared Toko Cung account — implementation and rollout

Laravel is now the active identity, profile, progression, quest and World Point authority. World's TanStack Start server is a same-origin gateway (BFF); Supabase remains the realtime transport. This supersedes the Supabase financial authority described in the original Game Core V1 notes.

## Discovery and boundaries

The existing App uses `tymon/jwt-auth` and `App\CustomUser` subjects formatted as `users.id_phone_number`. Product clarification: the active App experience does not require PIN. Legacy PIN endpoints and `user_pins` exist in the backend but are not the game credential source. Sanctum is installed but is not the customer login flow. The existing SQL `users.id` is a signed integer. World requires a game-scoped JWT with a current credential version and resolves its signed subject against an active, non-deleted `platform=mobile` account; new World customers register directly into the same `users` table, while existing accounts require ownership verification before attaching a game PIN. No client account ID is accepted. Staff web SSO is a separate flow.

Previously World used Supabase email/password accounts and `profiles`, with a random multiplayer connection ID. Guest landing remains public; persistent gameplay requires login. Existing Supabase data has not been deleted or automatically matched to App users. Remote World production data could not be audited in this workspace; do not assume it is empty.

App loyalty (`point_user`, `point_loyalty`, membership, vouchers/promotions) has different semantics. World Point has its own ledger and wallet linked to the same user. No existing loyalty, checkout, order, payment, or App login endpoint was replaced. World has no checkout or redemption endpoint.

## Auth and API

1. **New customer:** choose **Baru di World? Daftar**, supply player name, phone and a new six-digit game PIN with confirmation. `/api/world/register` creates one canonical App-compatible `users` row plus a separate hashed game credential. No App download or activation code is required for a previously unused phone. The new account starts as an active mobile customer with the same default membership (3) as App registration.
2. **Existing customer:** choose **Punya akun App? Buat PIN game**, or submit registration with an existing phone and continue into the verification form. Click **Kirim kode ke notifikasi App**. A six-digit, five-minute code goes only to the existing account's registered FCM device. Enter it and choose a game PIN. This links the same user ID; it never replaces or duplicates their App account.
3. **Return visits:** `/api/world/login` checks the phone and game PIN in `world_credentials`; legacy `user_pins` is untouched. World gateway then fetches `/api/world/me` and hydrates identity, avatar, owned items, wallet and quests before channel selection.
4. JWT is in a host-only HttpOnly cookie: production `__Host-tc_world`, Secure, SameSite=Lax, Path=/. Game sessions explicitly expire after 60 minutes (`world.session_minutes`), even if the App JWT TTL is unlimited. Game JWT has `world_scope=game` and a credential version; ordinary legacy App JWTs cannot bypass game enrollment. No account token enters localStorage, browser state or URLs.
5. BFF requests require exact Origin plus TanStack Start CSRF protection. Laravel 401 clears local account/profile/game/channel state and returns to login. Logout clears the cookie and blacklists the current JWT when existing blacklist support is enabled.
6. **Lupa PIN game?** sends a recovery code through the same push route. `/api/world/pin/reset` changes only the game hash and credential version. Previous game sessions fail on their next request; UUID, profile, XP, quests and wallet remain unchanged. If Laravel is unreachable, local logout cannot guarantee immediate upstream revocation.

The account is shared, while the game PIN is separate. There is no automatic App-to-browser SSO or copying of App PINs. Future App wallet access should use a properly authenticated bridge to the shared services. Existing App auth/commerce APIs were not replaced.

### Push verification and recovery

`POST /api/world/pin/request` takes phone and `purpose=setup|reset`. `WorldPinDelivery` uses the existing Kreait/Firebase configuration and `users.fcm_token`, including the App's Android notification channel and APNs sound. It sends a notification directly and does not write the secret into notification history or application logs. A token shared by multiple users is rejected. Codes never appear in HTTP responses. Push delivery is to a registered App **device**, not SMS delivery to the phone number.

Set the existing server-only `FIREBASE_CREDENTIALS` for the correct App Firebase project. Existing users must have a current device token and notification access. If none exists, the UI explains how to open the App/register a device or recover through support; it never falsely reports a delivered code. SMS/WhatsApp fallback is not implemented. A new World-only customer without an App device can use operator-assisted recovery after ownership verification.

Push codes expire in five minutes, are single-use and account/purpose-bound, and are stored as HMAC digests using APP_KEY. Resend cooldown is 60 seconds, with three sends per 15 minutes per phone. Redemption/login allow five attempts per five minutes per phone. Replacements invalidate earlier codes; delivery failures invalidate the issued code. Credential changes and consumption are transactional under the user lock. Codes are not accepted as game PINs. Setup cannot overwrite a PIN; use recovery instead.

For support or local fixtures **only**, an operator can issue a 15-minute high-entropy fallback code after verifying the owner:

```sh
php artisan world:pin-code          # existing account's first game PIN
php artisan world:pin-code --reset  # recovery of an existing game PIN
```

This is not required for new-customer signup. Never publish these codes or PINs in logs/tickets. Registration uses a unique phone fingerprint on game credentials to roll back competing World signups atomically. The legacy App registration implementation has no shared phone-uniqueness constraint in the checked-in schema; simultaneous legacy App/World registrations still need a coordinated App-side uniqueness rollout. New-user phone entry is intentionally frictionless and does not certify phone ownership; verification is still required before taking over an existing account or introducing phone-sensitive redemption.

Authenticated routes under `/api/world`: `state`, `me`, `profile` (GET/PATCH), `progression`, `wallet`, `rewards`, `quests`, `quests/command`, `profiles/{publicUUID}`, `connections/{connectionUUID}/profile`, `channels`, `channels/join`, `channels/leave`, `logout`. Registration, login, `pin/request`, and code redemption (`pin/setup`, `pin/reset`) are the unauthenticated World APIs; code redemption still requires the one-time ownership proof. The `state` endpoint returns the normalized event projection managed in Laravel; World uses the same authenticated BFF as quests.

Private snapshots contain the caller's wallet and progress. Public profile responses contain only World display fields, avatar, level/title and public UUID. They omit phone, email, address, internal account ID, wallet and reward history. Avatar edits use revision checks and the existing single appearance draft. Staff roles and collectible ownership remain server-authoritative.

## Financial authority and persistence

The additive Laravel migration `2026_10_10_120000_create_world_account_game_tables.php` creates `world_profiles`, `world_point_wallets`, `world_point_ledger`, `world_campaigns`, `world_quests`, `world_quest_progress`, `world_action_receipts`, `world_player_presence`, `world_channels` and `world_channel_connections`. Profiles initialize lazily with a stable public UUID and zero XP/Point. No phone/address/payment fields are copied into these tables. A second additive migration, `2026_10_10_140000_create_world_game_credentials.php`, creates `world_credentials` (one PIN hash and session version per existing user) and `world_pin_challenges` (one-time setup/recovery audit). A third additive migration, `2026_10_10_150000_add_world_registration_key.php`, adds the unique registration fingerprint. These migrations do not read or modify legacy App PINs.

Every game mutation locks the canonical user row. Completion locks the wallet and campaign in one transaction, validates run ownership, revision, objective order, pose recency/proximity/speed, duration and repeat policy, then writes XP, completed run, wallet, treasury and unique append-only ledger entry atomically. Accepted runs snapshot their quest definition. Retries return the recorded completion reward. Profile XP/level/title are projected from the same authority.

`pointAwarded = min(pointRequested, max(0, 10000 - earnedToday), remainingAllocatedTreasury)`.

The day is the server's Asia/Jakarta calendar day across all tabs/devices/channels. Partial reward is explicit, and the remainder is not deferred. XP still accrues at the Point cap or empty treasury. Ledger has source/run, account, timestamp, amount, balance after and idempotency key; database triggers reject updates/deletes. Initial campaign allocation is 10,000,000 Point accounting configuration, not actual funding. Review and approve that budget before enabling production rewards. App can later read the same wallet through these services/endpoints; redemption remains future work.

`resources/world/quests.json` seeds the five Game Core samples only once. Maintain subsequent definitions in `/world-admin`. Reactive rewards require a currently active Laravel-managed event (or the optional trusted server feed); browser demo events cannot authorize money. Failure responses never produce local rewards. Existing pose checks constrain ordinary abuse but do not prove that a modified client physically performed an action; financial production rollout needs appropriate operational fraud controls.

## Channels and multiplayer

Laravel reserves 25 leased connection slots per channel (01–03). Stable `playerId` is the public profile UUID; `connectionId` is a fresh tab/socket identity. Switching channels changes only connection membership. Profile/game/wallet rows remain global.

Laravel issues a 90-second HS256 realtime JWT restricted to the selected private topic, with public UUID and connection ID. Browser keeps it only in memory and renews the lease every 25 seconds. Old reservations remain counted until issued JWT expiry, even after leave/switch, to avoid freeing capacity while credentials remain valid. Other players' profiles resolve through Laravel's active connection lease, not peer-supplied account IDs.

This is a server-enforced admission limit for leases, not a cryptographic limit on physical sockets: replayed realtime credentials or spoofed peer presence need transport-side enforcement for a hostile-client guarantee. Realtime simulation remains peer-driven and is not a trusted financial source. A revoked App account's already-issued transport JWT can remain usable for at most its short TTL; every financial API still checks the App account immediately.

## Local setup

Use a dedicated local database; never run test migrations against the App's existing remote `.env` database. Match its signed integer `users.id` FK type. Apply the new migrations after the existing customer schema is present:

```sh
php artisan migrate --path=database/migrations/2026_10_10_120000_create_world_account_game_tables.php
php artisan migrate --path=database/migrations/2026_10_10_140000_create_world_game_credentials.php
php artisan migrate --path=database/migrations/2026_10_10_150000_add_world_registration_key.php
php artisan migrate --path=database/migrations/2026_10_10_170000_create_world_event_controls.php
php artisan serve --host=127.0.0.1 --port=8091
```

Laravel `.env`: retain existing JWT configuration; set `WORLD_REALTIME_JWT_SECRET` to the realtime project's supported HS256 signing secret and optionally `WORLD_REALTIME_ISSUER`. Set `WORLD_REACTIVE_URL` / `WORLD_REACTIVE_TOKEN` only for a trusted feed. Keep all keys server-only.

World `.env`: `TOKO_CUNG_API_URL=http://127.0.0.1:8091`, `WORLD_ORIGIN=http://localhost:8080` (must exactly match the browser origin), existing public `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY`, optional approved `VITE_TOKO_CUNG_APP_URL`. Run `npm run dev`. No App JWT or realtime signing secret belongs in a `VITE_` variable.

## Production cutover and legacy data

1. Back up both databases and inventory old Supabase accounts/profiles, owned cosmetics, roles, progression and ledger. Freeze legacy reward writes during reconciliation. Deployment must not silently abandon meaningful old balances.
2. If old profiles exist, require proof of both old World ownership and the target App account. Do not match solely by display name/email or accept a client-provided ID. An audited one-to-one import must resolve collisions, preserve appearance/ownership provenance, reconcile financial history and daily earnings, and mark source rows as migrated. That import is intentionally not implemented without verified production data. Keep the legacy release available until this prerequisite is resolved.
3. Apply all four additive Laravel migrations with deployment credentials on the approved database. Review campaign allocation, JWT TTL/blacklist, trusted reactive source and cache backend. Existing game sessions must log in again and enroll a game PIN through the new flow; do not copy `user_pins`. Configure Firebase and smoke-test push receipt on Android/iOS, plus operator recovery for unavailable devices, before rollout. Do not run wholesale migrations casually on the commerce DB. Financial migration rollback deliberately refuses destructive table drops; rollback should disable traffic while retaining data.
4. Supabase: provision a supported HS256 signing configuration matching Laravel, apply `20261010130000_laravel_identity_realtime.sql` (safe to rerun and also supported without the legacy Game Core RPC), disable public realtime channels, and inspect existing `realtime.messages` policies for permissive rules that could bypass the new topic check. This migration revokes the old financial command from `service_role`; privileged database administration still exists. Do not deploy both financial authorities concurrently.
5. World server: `TOKO_CUNG_API_URL=https://<actual-approved-laravel-host>` and `WORLD_ORIGIN=https://world.tokocung.com`; preserve public Supabase project config. The actual API hostname comes from deployment operations, not an invented default. HTTPS is mandatory in production. The World server needs outbound connectivity to Laravel. No parent-domain cookie is needed. Existing Laravel non-credentialed CORS stays unchanged: browsers call their own World origin, so do not enable wildcard credentialed CORS.
6. Deploy matching backend, private realtime configuration and World build together. Smoke-test actual project JWT acceptance, expiry/renewal, topic isolation, 25th/26th admission, two-account profile sync and logout. Local transport fixtures do not prove the hosted Supabase configuration. World excludes the App global device/IP limiter and instead uses authenticated account limits (180 requests/minute, reward commands 90/minute). Login has a 60/minute IP ceiling plus five attempts per normalized phone per five minutes. Existing commerce limiters are unchanged. Monitor gateway login capacity and provision edge protection without trusting arbitrary forwarded headers.

No live migration, signing configuration, deployment, account import or git push was performed by this implementation.

## Verification

- Laravel: 20 World feature tests / 131 assertions (plus 5 existing loyalty tests / 10 assertions) for existing login, invalid/inactive/expired auth, authorization, profile persistence/revision/ownership, private projection, cap, XP, repeat, WIB reset, treasury, quest checks, channel capacity and immutable ledger. Game-PIN tests cover first setup, App PIN isolation, confirmation, account/purpose/expiry binding, code rotation/replay, old session rejection after reset, rate limits CLI account constraints, new-customer signup, existing-account push verification, delivery failure, cooldown, and explicit expiry when App JWT TTL is unlimited.
- Isolated real MySQL: migration + concurrent same-run completions produce one ledger/XP award; two users competing for treasury cannot overspend; trigger rejects ledger mutation. All credential migrations, concurrent activation (one success/one rejected replay), and concurrent new-customer signup (one canonical account) are also tested. `scripts/check-world-concurrency.php` creates/drops only a random local `world_test_*` database and requires `pcntl`.
- World: TypeScript, changed-file lint, production build; browser against actual local BFF + Laravel + isolated SQLite, with signed local realtime fixture: phone/PIN login, HttpOnly/no browser JWT storage, saved avatar after refresh and on another account, channel switch, same-cookie second tab, logout/second-tab rejection and mobile invalid login.
- Browser reward persistence: two tabs complete a ready-objective fixture through the actual BFF/Laravel API; one 500 Point ledger and total XP350, restored after refresh. The fixture pre-populates validated objective progress only in the isolated test database; objective validation is covered by backend tests.
- `scripts/check-account-realtime.mjs`: isolated PostgreSQL/PGlite verifies legacy RPC revocation and private realtime policy allow/deny. Set `GAME_CORE_PGLITE` to an installed PGlite module path to run.

### Game-PIN browser QA

Local QA uses actual BFF/Laravel and isolated SQLite, with fixture-only push delivery and a signed realtime fixture. It covers code-free mobile signup, channel entry, cookie persistence, logout/login, existing-phone redirect into push verification, same-account enrollment, recovery and old-device session rejection. Real Firebase delivery and hosted Supabase remain deployment smoke tests; no production PIN, notification or database was changed.

On older Laravel dependencies with PHP 8.4, disable `display_errors` for HTTP workers so vendor deprecation output cannot corrupt API JSON (keep diagnostics in server logs). This is an environment compatibility setting, not a reason to show raw API internals in the game UI.

## Quest/event management and realtime troubleshooting — 2026-10-10

Apply the additive `170000_create_world_event_controls` migration on the intended database before deploying this release. It creates `world_control`, `world_events`, and `world_content_audit`; it does not reseed or replace player progress. No live database was migrated during implementation.

Log in to the existing Laravel admin panel, then open `/world-admin` (Utilities → World Quest & Event). Admins can create/edit/disable quests, rewards, repeat policies, prerequisites, objective coordinates and schedules. Objective/metadata editing is currently a validated JSON editor. Accepted runs retain their original definitions. Point caps and campaign treasury still apply; editing a quest does not allocate new treasury. Revision checks reject stale edits and audit records retain the admin, before/after content and time.

Schedule one activation per supported event type: STORE_RUSH, WAREHOUSE_RUSH, COURIER_PICKUP. Set start/end in WIB, intensity, parcel tier and courier. Saving replaces that type's schedule and creates a fresh activation ID; this can start a new pickup trip. The three visual behavior types remain implemented in the game; adding a new behavior still requires code. Content, activation and rewards no longer require a frontend rebuild. LIVE is the default, polls every 45 seconds, and never falls back to demo data. `VITE_REACTIVE_WORLD_SOURCE=MOCK` explicitly enables development-only demonstrations; OFF disables visuals. Leave it unset or LIVE for Laravel content.

The current project URL/signature check passed, but a direct private join to `world:CHANNEL-01` returned `Unauthorized: You do not have permissions to read from this Channel topic`. Apply `supabase/migrations/20261010130000_laravel_identity_realtime.sql` using the intended Supabase project's SQL Editor, then reconnect. A correct URL alone does not install channel policies. Hosted authorization remains pending until that SQL is applied. Never expose the JWT secret in VITE variables. Restart Vite after changing project environment variables; clear Laravel config cache after server configuration changes.

The client now broadcasts only while the channel is joined and connected, and displays connection status/retry in the HUD. Vehicles await a connected traffic host; `window.trafficDebug()` includes safe connection/room diagnostics. Localhost development also unregisters only leftover UpUp service workers and reloads once. If the old worker prevents the application from loading at all, unregister that worker under browser DevTools → Application → Service Workers, then reload. The `data-scribe-recorder-ready` hydration difference identifies browser extension DOM modification; disable that extension on localhost to verify. Three.js/Rapier deprecation and font lookup messages are separate from the confirmed channel authorization failure.

Validation for this update: 30 Laravel tests / 176 assertions (World, admin, PIN and existing loyalty), authenticated event projection, admin-only mutation/rendering, scheduled activation, stale edit rejection, accepted-run reward preservation; TypeScript, changed-file ESLint and production build; reactive world/mission/spawn and traffic/protocol checks; isolated PostgreSQL policy allow/deny and repeat application without the legacy RPC. No real Firebase notification, hosted policy update or production database change was performed.
