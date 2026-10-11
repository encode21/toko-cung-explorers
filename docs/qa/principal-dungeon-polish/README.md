# Dungeon presentation QA — 2026-10-12

Actual React/Three scene, World BaseAvatarV2 assets and Laravel services. Synthetic accounts, isolated SQLite, local BroadcastChannel adapter. Portrait 390×844 touch emulation and desktop 1365×900.

Verified compact/expanded tracker, contextual NPC interaction, role/name labels, no normal-play Dungeon DEV, confirmation hiding interaction, and exit. A deliberately delayed pose response left the action enabled; a click queued and completed once. Desktop separately verified the expanded controls and avatar presentation.

Fixtures position players for visual coverage; production realtime and physical-device testing are not implied. Independent PHP regressions verify submitted click positions, rejected teleport attempts and migration recovery. Isolated MySQL utf8mb4 reproduced 1071 and passed fresh/retried migration with retained badge data.
