# Cung Underground Club V1

Original club geometry and eight original dances integrate with the existing R3F/Rapier world, BaseAvatarV2 skeleton, private Supabase world channel and Laravel gateway. No second multiplayer engine, external music playback, purchased assets, profile-role grants, or audio proxy is introduced.

## Play

The signed entrance is on the shop-side pedestrian route at `(10.4, 0, 3.8)`. Approach and choose **Masuk Cung Underground**. Each existing CHANNEL-01/02/03 has one shared basement club. Entering moves the existing rigidbody to CLUB_SPAWN; it does not replace the avatar or change its canonical scale. Exit at the doorway behind the spawn.

Use **Dance** for Bounce, Step, Disco, Wave, Shuffle, Sway, Robot or Salsa. Movement/jump cancels the dance. **Sync** copies another dancer's animation ID, group ID and server start timestamp. Everyone joining the same dancer shares phase, without streaming bone transforms. Members can leave a group independently. The group can continue if its original leader leaves.

Approach the DJ booth and choose **Apply DJ**. V1 automatically accepts any authenticated club member for a room-scoped DJ session job. This uses the existing `dj` identity definition, but does **not** change account roles or grant `entertainment-control` outside this room. FIFO waiting DJs take over when the booth is free. The active DJ can transfer to another waiting DJ or leave the session. An active DJ badge is derived from the authoritative club snapshot.

All members can view Now Playing and request catalog tracks. Only the active DJ sees booth controls. Server authorization independently protects playback, moderation, reordering, transfer and lighting. Requests are catalog-only (no URLs/free text), limited to two pending per account and one every 15 seconds; exit/re-entry cannot reset this cooldown. The DJ accepts/rejects requests and orders accepted tracks using up/down controls. Queue/request capacity is 30 each. Playback is deliberately silent using MockMusicProvider.

## Authority and transport

- `POST /api/world/club` is protected by the existing WorldAccount middleware and account throttle. The authenticated BFF forwards the `club` operation; browser credentials are unchanged.
- `WorldClub` serializes room mutations with a database row lock. Every command checks active channel ownership and expiry. The stored snapshot includes `roomId`, `provider`, `mediaId`, `playbackStatus`, `startedAt`, `positionSeconds`, `queueVersion`, `activeDjId`, lighting, members, requests and queue.
- Mutating clients publish a `club_changed` invalidation over the existing private world channel **after** a successful authoritative response. Receivers never apply broadcast state; they fetch the backend. Invalidations are coalesced and rate limited locally. A 3-second reconciliation poll covers lost notifications, refresh, late joins and abrupt publisher departure.
- Realtime disconnect stops heartbeats and commands. Club membership/control expires after 20 seconds without a heartbeat. The next read/mutation reaps expired/inactive channel connections and promotes the next live waiting DJ, normally within 23 seconds while another member is connected. With no observers, cleanup happens on the next request; expired ownership cannot authorize control.
- Client snapshots reject older revisions/timestamps and mismatched rooms; generation checks discard responses after room changes. Reconnection fetches the current snapshot. If membership expired, the player returns to the entrance and can enter again.
- Playback position is an anchor plus elapsed server time. Midpoint RTT estimates align local clocks. Pause captures position; resume resets the time anchor. Finished mock tracks advance on the next reconciliation request. Queue versions reject stale moderation/playback operations with 409.
- Dance IDs and start timestamps live in the same authoritative snapshot. Existing position replication remains unchanged. Client movement suppresses the local dance immediately and sends one stop command; remote movement also suppresses the displayed dance until state catches up.

V1 retains the world's existing client-controlled movement model. Club membership and DJ authority are server checked; walking proximity to the entrance/booth is a client interaction affordance, not a new authoritative movement/anti-cheat service. No rewards or premium permissions depend on proximity.

## World Editor

Six categories are registered in the existing editor/backend: CLUB_ENTRANCE, DJ_BOOTH, DANCE_ZONE, MUSIC_SCREEN, CLUB_SPAWN and LIGHT_CONTROLLER. Seven stable default IDs include separate `club_entrance` and `club_exit`. Mark exits with the `club-exit` tag. Published saves retain IDs, use existing optimistic revisions and audit records, and persist to `world_targets`.

Entity position, rotation, scale, enabled state and dance-zone radius drive runtime visuals. Spawn and entrance targets drive teleport destinations; booth proximity drives the console affordance. The basement shell remains at y=-14 with x ±12 / z ±11 bounds: place interior entities within it. This version provides one club per world channel, not arbitrary additional rooms when duplicating an entity. World registry changes load when entering the world, consistent with existing editor behavior.

Geometry/furniture/floor tiles use StyledBatch instancing and shared materials. Four animated light beams use unlit translucent geometry, with no shadow maps or post-processing; the existing low-quality flag reduces segments. The existing avatar distance tiers remain active. Outdoor scene/NPC rendering is unmounted while inside; club/outdoor remote avatars and interactions are separated by floor height. No per-frame network skeleton packets are sent.

## YouTube adapter — enabled (allowlisted)

`YouTubeMusicProvider` mounts the official visible IFrame Player in a persistent club HUD panel (≥200×200). `YOUTUBE_ENABLED` is true. Catalog ids map to allowlisted video ids only (no free-text URLs). Current set: `cung-underground-set` → `_MmGd4-wEco`. Non-YouTube catalog ids remain silent mock timing tracks.

Compliance notes retained:

1. Visible official player with YouTube controls/branding; not covered by the 3D canvas; destroyed on room exit; not used as audio-only/background playback.
2. Official IFrame API + page origin only — no extract/download/proxy of audio/video.
3. Autoplay-blocked requires an explicit local gesture (“Ketuk untuk memutar musik”) without advancing the authoritative room queue. Embedding failures stay local; DJ uses Next to skip.
4. Seek alignment is best-effort (±2.5s slack); client buffer/ad/error state is separate from room playback.
5. Operator must still confirm music/public-performance rights for the allowlisted video(s).

References: [official IFrame API](https://developers.google.com/youtube/iframe_api_reference), [embedded-player requirements](https://developers.google.com/youtube/terms/required-minimum-functionality), [developer policies](https://developers.google.com/youtube/terms/developer-policies).

## Rollout and verification

Deploy Laravel with `2026_10_13_010000_create_world_clubs.php` after the world-target migration, then run `php artisan migrate` through the normal deployment process. It creates one room row per configured channel and seeds seven editor entities. Deploy the client afterward. No new secrets or realtime policies are needed. No live migration/deployment was performed by this implementation.

Automated checks:

```sh
# Laravel repository
php artisan test --filter='WorldClubTest|WorldTargetsTest|WorldContentTest'
# Explorers repository
node --experimental-strip-types --test tests/club.test.mjs tests/avatar-rig.test.mjs
npm run build
# Optional Playwright install (outside production dependencies); Chrome required
PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs node scripts/check-club-browser.mjs
```

The browser harness uses the actual club scene, avatar renderer, Rapier controller and HUD, with a mock API. It verifies floor contact, movement cancellation, group sync, DJ requests/playback/lighting and desktop/390px mobile layouts. Screenshots are under `docs/qa/club/`. It is not a live Supabase or device performance benchmark.

Before release, use two authenticated accounts on the deployed private channel: enter together; see each other's motion and dances; sync a group; apply/queue two DJs; moderate/reorder requests; change lighting; join/reconnect mid-song; close the active DJ tab and verify promotion after lease expiry; switch world channels and check isolation. Test touch movement and jump on an actual phone. These live-service/device checks remain outstanding.
