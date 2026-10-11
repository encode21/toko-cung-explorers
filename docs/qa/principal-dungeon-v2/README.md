# Principal Dungeon V2 local QA

390×844 touch emulation and 1365×900 two-client desktop, actual React/Three scenes and Laravel services. SQLite fixtures and a BroadcastChannel realtime adapter were isolated from connected accounts/databases. Screenshots contain synthetic players only.

- Mission Board: required-level locks, campaign chapters, undiscovered secret omitted.
- Full main route: all ten objectives, both realm transfers, 650 XP once, leaderboard, return.
- Stairs: actual joystick touch events; walked from ground to stable mezzanine y≈4.83 without jumping.
- Shared instance: alternating objectives, split World/dungeon presence, individual 650 XP, reconnect and safe return.
- No browser exceptions in completed full-route and shared runs.

Live Supabase and physical-phone checks remain part of rollout. See ../../principal-dungeon-v2.md.
