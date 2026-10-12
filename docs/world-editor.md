# World Dev Mode / Visual World Editor

The editor is an authoring layer over the existing outdoor world. Enter a channel, then use PLAYER / DEBUG / EDITOR. The CMS **Open World Editor** link requests Editor Mode after the authenticated account enters a channel. Dungeon interiors retain their existing scene implementation.

## Rollout

1. Deploy the Laravel backend and run `php artisan migrate`. Migration `2026_10_12_230000_create_world_targets` adds the registry, optimistic revision counter, editor permissions and trusted NPC pose table. Existing outdoor objectives are converted to stable IDs without changing their positions or reward rules. Legacy dungeon objectives remain compatible.
2. Configure Laravel `WORLD_EDITOR_URL=https://<world-host>/world?mode=editor` and refresh cached configuration. The default is the local development URL.
3. Administrators are identified using the canonical backend `users.role = admin`. For another game account, grant `WORLD_EDITOR` with `php artisan world:editor <user-id>`; revoke with `--revoke`. This is independent of cosmetic/profile roles. No browser API can grant the permission.
4. Deploy the world client. Its existing authenticated server gateway forwards `targets` (GET) and `save-targets` (PUT); no new browser credentials are needed.

## Authoring

Select a creation tool, then click terrain, a floor or an object. A Three.js raycast captures the intersection. Drag the transform gizmo to move/rotate/scale. Orbit with left drag, pan with right drag and zoom with the wheel. The inspector permits numeric fine-tuning (rotation in radians). IDs are immutable; duplication creates a new ID.

The registry searches names, IDs, categories and tags. Editor markers cover POI, WORLD_OBJECT, NPC, CLUE, TRIGGER, TELEPORT, SPAWN and DUNGEON. Trigger cylinders show the quest proximity radius in world metres and its 3.6 m vertical range; decorative marker scaling does not change the radius. Set radius in the inspector. Rapier collider visualization, runtime entity IDs and coordinates are separate toggles.

Save publishes the complete registry transactionally with a revision check and audit entry. A stale save returns 409; unsaved changes remain available. Reload explicitly discards a draft after confirmation. Undo/redo retains up to 100 edits; after saving, undo becomes a new draft to save. Deletion/deactivation is rejected while a quest or accepted run references the ID.

**Use as Quest Target** saves any outstanding draft and opens the CMS create form with the selected target. The CMS fetches the same registry and offers objective type, searchable target, label and required count. Raw JSON remains under **Advanced / Developer** with an explicit Apply JSON action. Legacy objectives are preserved until a target is selected. Quest definitions persist `targetId`; positions/radii are resolved for client projections and authoritative completion checks. Accepted runs keep their reward rules while target placement stays live.

## NPCs and other categories

An NPC target without an external `entityId` creates a stationary avatar in the published world. Clicking an existing moving NPC captures its entity ID automatically; its quest marker and proximity UI follow the live client actor. The server resolves moving NPCs by entity ID from `world_entity_poses`, never from a browser-provided target coordinate. A trusted simulation adapter must update `{entity_id, position: {x,y,z}, updated_at}` at least every ten seconds. The current ambient NPC simulation is browser-local and has no trusted pose publisher: bound moving-NPC reward checks intentionally fail closed until that adapter is connected. Stationary authored NPC quests work without it.

TELEPORT, SPAWN and DUNGEON records are authoring targets. They do not independently create teleport destinations, change player spawn rules or instantiate new dungeon layouts. Those remain owned by the existing runtime systems. Published target updates are loaded when entering the world; quest projections refresh through existing quest synchronization.

## Verification

- Laravel focused suite: `php artisan test --filter='WorldTargetsTest|WorldContentTest'` — 12 passing tests covering persistence, migration, reference integrity, optimistic conflicts, permissions, forged-role rejection, live accepted-quest resolution and NPC pose freshness.
- Browser harness with actual R3F and editor components, flat terrain, mocked API: click placement, transform drag, gizmo modes, duplicate/delete, undo/redo, save/reload and Player Mode visibility passed without browser errors. Screenshot: `docs/qa/world-editor/editor.png`. This does not replace a deployed authentication/backend smoke test.
- Production Vite build passes. TypeScript reports five existing possibly-undefined `line` errors in `src/ui/dialogue/DungeonDialogueOverlay.tsx`; no editor errors.
- Broader backend quest/dungeon run: 25 pass, one dungeon reward assertion fails (`WorldDungeonV2Test`, expects wallet 0, receives 1950). That test does not install the target migration and exercises legacy objectives.

The migration and deployment have not been applied to a live database.

## Cung Underground entities

Club V1 adds CLUB_ENTRANCE, DJ_BOOTH, DANCE_ZONE, MUSIC_SCREEN, CLUB_SPAWN and LIGHT_CONTROLLER to this same registry. Their visuals and interactions consume saved transforms; stable IDs and the existing revision/audit flow are retained. See [club authoring and rollout](./underground-club.md) for the basement bounds, exit tag, migration and verification details.
