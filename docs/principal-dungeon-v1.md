# Principal Dungeon V1

Implemented across `toko-cung-explorers` and the sibling Laravel `toko-cung` repository. Deployment and live Supabase verification remain pending. No production database was migrated and no changes were committed or pushed.

## Player experience

The existing `partner-4` lot (35, 35) now houses a lightweight Principal Distribution Center. Its entrance is at (35, 28). Quest Board offers **Lacak pintu dungeon**; tracking gives distance and a destination description without teleporting. Level 3 unlocks **Kiriman yang Hilang**. The compact entrance displays 400 XP and up to 1,000 Point, with locked, available, completed-today, campaign-ended, and maintenance states.

A separate, small scene contains briefing, storage, promo, dispatch, and a hidden golden object. Objectives are ordered: visit briefing → find three distinct clues → collect crate → deliver → activate terminal. The optional discovery adds 100 XP on successful completion. There is no combat, permanent inventory, or commerce flow. Mobile joystick and camera input are reused; the dungeon has its own compact HUD and confirmed abandon action.

## Authority and room architecture

- Laravel `WorldDungeon` creates random instance IDs and private `DNG-*` room IDs. The room capacity is four, configurable to at most five. Public channel listing only returns configured World channels.
- `world_dungeon_instances` pins content, shared progress, unique clue IDs, carry owner, lifecycle, party ID, creation/completion/expiry times. `world_dungeon_members` keeps fixed creation-time membership, individual quest run, original channel/position, validated pose, last-seen and leave time.
- Solo entry validates the authenticated account's active World connection, a fresh entrance pose, quest availability, level, campaign and repeat policy. IDs, party rosters, completion flags and rewards are never accepted from the browser.
- The service coordinates the existing `WorldGame` Quest Engine. It creates ordinary authoritative quest runs, uses the same objective ordering/proximity/timing validation, copies shared progress to participating runs, and pays each participant through the same reward accounting transaction. Direct normal quest commands cannot accept, advance or claim dungeon runs.
- Only fixed members may obtain dungeon realtime credentials. Room JWTs use the existing `world:<channel>` policy; there is no random public late join. Open-world traffic, reactive-world and mission transport are suspended inside the dungeon.
- Entry removes the old realtime subscription before installing the dungeon lease. Scene physics is remounted with a server-returned spawn; the player root scale and live appearance draft remain unchanged. Party spawns are separated. Carry visuals identify the actual carrier by public player ID.
- Shared objective snapshots refresh over authenticated HTTPS approximately every 2.5 seconds. Transforms and presence continue using the existing room-scoped realtime transport.

## Rewards and repeat policy

The prototype uses DAILY, measured by the existing Quest Engine in Asia/Jakarta. ONCE, REPEATABLE and CAMPAIGN_LIMITED remain available through the quest definition.

`Point awarded = max(0, min(requested, 10,000 − earned today, campaign total budget − distributed, campaign allocation − distributed))`.

1 Point remains Rp1. XP is not reduced by the Point cap. Completion receives 400 XP, or 500 XP with the optional discovery; abandonment and expiry award nothing. Wallet mutation, campaign debit, quest completion and ledger receipt are atomic. A repeated terminal request or reconnect cannot duplicate payout. Current campaign/quest eligibility is checked again before completing.

The migration seeds a dedicated prototype campaign with a 1,000,000-Point budget. Main treasury fallback is not needed. Budget values are never returned by the dungeon API.

## Campaign and template configuration

`world_campaigns` adds `dungeon_id`, `theme`, `required_level`, `repeat_policy`, `quest_ids`, and `dungeon_config` alongside existing principal/building IDs, activity dates, status and budget accounting. `resources/world/dungeon.json` seeds presentation, entrance/spawn, party size, timeout, asset slots and optional content; `dungeon-quest.json` seeds the existing quest model. At runtime, the quest definition owns objectives, base rewards, level requirement and repeat policy, avoiding a second quest authority.

`WorldDungeon::config(dungeonId)` resolves a server-owned campaign configuration. Instances pin their configuration. Future callers may select another registered dungeon; they cannot invent instances. Template types HUNT, DELIVERY, PUZZLE, COLLECTION, EXPLORATION, SEQUENCE and TIME_TRIAL are declared, with only the prototype exploration/collection/delivery sequence implemented. Asset slots cover logo, palette, signage, product props, facade, interior banners, NPC outfit and reward badge; the prototype uses primitive props and the configured palette.

## Party readiness, reconnect and return

`createParty(users, origins, partyId, dungeonId)` is a trusted backend integration point. Public V1 entry is solo; there is deliberately no browser member-list endpoint or invitation UI. Members share progress and each gets an independently capped payout. The account and instance locks serialize concurrent interactions.

A page refresh checks membership directly from the lobby. A reconnect discovers the account's existing membership, resumes a live instance, and reloads its shared progress. Expired or failed membership safely returns to World. Exit first tries the original channel under capacity locks, then another valid channel. If every channel is full it retains membership/return state and shows a retryable error. A lost exit response can recover the new World lease on the next request. Existing account quest/profile/wallet records are retained; an already active normal quest prevents starting another run.

Instances expire after 20 minutes, or after all participants stop heartbeating for a two-minute grace period. `world:dungeons-sweep` runs every minute and retains audit/return records. No reward history is deleted.

## Analytics and development tools

Pseudonymous server event rows cover dungeon_viewed, dungeon_entered, dungeon_started, objective_completed, easter_egg_found, dungeon_completed, dungeon_abandoned and dungeon_failed. Completion metadata includes duration and actual XP/Point. Internal `campaignMetrics(campaignId)` provides entrants, unique players, completion rate/time, discovery rate, distributed rewards and return-player counts; it is not a player endpoint or dashboard.

The DEV-only browser panel offers entrance teleport and instance inspection. Server fixture operations are CLI-only and reject environments other than local/testing:

```sh
php artisan world:dungeon-dev level USER_ID --level=3
php artisan world:dungeon-dev create USER_ID --connection=CONNECTION_UUID
php artisan world:dungeon-dev entrance USER_ID --connection=CONNECTION_UUID
php artisan world:dungeon-dev objective USER_ID --target=briefing
php artisan world:dungeon-dev egg USER_ID
php artisan world:dungeon-dev complete USER_ID
php artisan world:dungeon-dev reset USER_ID
php artisan world:dungeon-dev inspect USER_ID
php artisan world:dungeon-dev budget USER_ID
```

Reset only clears an active instance's objective/carry state. It does not erase completed runs, alter repeat policy or edit financial history. Forced objectives/completion use the actual quest/reward service after positioning the local fixture. Use an isolated local database for these tools.

## Rollout

1. Deploy the Laravel changes together with the existing World account/content foundation.
2. Apply `database/migrations/2026_10_10_180000_create_principal_dungeons.php` in the Laravel repository using the normal reviewed migration procedure. The migration retains financial history and intentionally has no destructive down path.
3. Keep the Laravel scheduler active for `world:dungeons-sweep`.
4. Deploy the frontend. The existing `20261010130000_laravel_identity_realtime.sql` topic-scoped policies already permit a signed dungeon room; no additional Supabase migration is needed. Public realtime channels must remain disabled as required by that existing migration.
5. Verify live Supabase room authorization, two-device presence removal/reconnect, a solo completion and a real portrait device after deployment.

## Verification

- TypeScript `tsc --noEmit`, changed-file ESLint and production build passed.
- PHP World dungeon/integration/content suite: **20 tests, 133 assertions**. Coverage includes solo completion, optional XP, the 9,500 → 10,000 Point cap, idempotency, daily repeat, level lock, objective order, distinct clues, direct API bypass denial, movement rejection, campaign disablement, abandon, reconnect, timeout/grace sweep, return response recovery, original-room fallback, outsider denial, two-participant shared progress and limited campaign budget payouts.
- Desktop browser QA ran the actual React/Three scene and HUD against the actual Laravel services with an isolated SQLite database. Two browser pages completed all objectives, shared clue progress, collected the optional discovery, received 500/1,000 Point individually plus 500 XP each, reconnected to completed state and verified one client's World return removed it from the dungeon roster. No browser exceptions.
- Portrait Chrome touch emulation at 390 × 844 verified entrance/transition, HUD bounds, joystick movement, objective interaction, abandon/cancel confirmation and original-channel return.
- Browser transport used a local BroadcastChannel realtime adapter. These browser tests do **not** prove deployed Supabase authorization or physical-device performance. Temporary fixture credentials and databases were isolated under `/tmp/toko-dungeon-qa`.

## Known limitations

- No party invitation UI or public late join; the trusted party-creation integration is prepared and tested.
- Only the Distribution Center template is rendered. Future visual templates and branded assets need their own renderers/configuration.
- Authority checks sampled movement speed, bounds, fresh proximity, order and timing; it does not run the complete Rapier simulation on the server.
- Existing short-lived realtime JWTs remain valid until expiration (normally 90 seconds). Normal clients unsubscribe immediately; instantaneous revocation of a deliberately retained old socket needs transport-side revocation support.
- Deployment/migration and live Supabase/physical-phone QA remain outstanding. Existing PHP vendor deprecation notices remain outside this change.

## Main files changed

Frontend: `src/game/dungeon/{types,store,DungeonRuntime,DungeonScene,DungeonDebug}`, `src/ui/hud/DungeonHud`, canvas/player/remote-player integration, the replacement lot, HUD/utility layout, Quest Board, World loading copy, channel transport and World API operation contracts.

Laravel: `WorldDungeon`, guarded `WorldGame`, dungeon-aware `WorldChannels`, World controller/routes, the campaign/instance migration, dungeon/quest seed JSON, sweep/development commands, scheduler registration and `WorldDungeonTest`.

## QA screenshots

- [Desktop with two participants](qa/principal-dungeon-v1/desktop.png)
- [Portrait dungeon HUD](qa/principal-dungeon-v1/mobile.png)
- [Portrait entrance](qa/principal-dungeon-v1/entrance-mobile.png)
- [Completion feedback](qa/principal-dungeon-v1/completed.png)
