# Local mini-game QA

Run from the frontend checkout:

```sh
WORLD_QA_BACKEND=/path/to/toko-cung node scripts/check-minigames-browser.mjs
```

Two Chrome headless tabs, 844×390, touch enabled, real world scene/Player/Rapier/HUD. The local PHP router boots real Laravel domain services with temporary SQLite and synthetic identities; BroadcastChannel supplies ordinary avatar presence. No production endpoint/database is used. Countdown and deadlines are accelerated with a test-only server clock; player inputs and score/reward requests use the real controls/gateway. Fixture placement moves players to test the two quiz zones/chicken approach; it is not a movement anti-cheat proof.

Evidence:
- `quiz-lobby`, `quiz-zones`, `quiz-reward`: min-two countdown, backend question, normal walking, correct-side survivor, saved badge.
- `sack-lobby`, `sack-race`, `sack-reward`: authoritative progress and two visible sacks, Space and touch Lompat, 12 hops, saved badge.
- `chicken-lobby`, `chicken-catch`, `chicken-reward`: enclosed arena, F catch, score synchronized to the second tab, saved badge.
- `disconnect-cancelled`: cancellation when the second player leaves.
- `report.json`: snapshots and empty browser-error list. Synthetic connection IDs only.

Visual review confirms no overlap with joystick/jump/action controls at this viewport. No physical-phone, real account/realtime, load or adverse-network claim.
