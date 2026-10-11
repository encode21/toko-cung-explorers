/** Run with GAME_CORE_PGLITE=/absolute/path/to/@electric-sql/pglite/dist/index.js if not installed locally. */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const { PGlite } = await import(process.env.GAME_CORE_PGLITE || "@electric-sql/pglite");
const db = new PGlite();
await db.exec(
  `CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role; CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY,email text,raw_user_meta_data jsonb); CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$; GRANT USAGE ON SCHEMA auth TO authenticated;`,
);
await db.exec(
  await readFile(
    new URL("../supabase/migrations/20261005120000_explorers_full_schema.sql", import.meta.url),
    "utf8",
  ),
);
await db.exec(
  await readFile(
    new URL("../supabase/migrations/20261008120000_profile_write_validation.sql", import.meta.url),
    "utf8",
  ),
);
const existing = crypto.randomUUID();
await db.query(
  "INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES($1,'existing@example.test','{}')",
  [existing],
);
await db.query(
  "UPDATE profiles SET display_name='Existing Player',avatar='{\"hair\":\"hijab\"}' WHERE id=$1",
  [existing],
);
const originalProfile = (await db.query("SELECT * FROM profiles WHERE id=$1", [existing])).rows[0];
await db.exec(
  await readFile(
    new URL("../supabase/migrations/20261010120000_game_core_v1.sql", import.meta.url),
    "utf8",
  ),
);
assert.deepEqual(
  (await db.query("SELECT * FROM profiles WHERE id=$1", [existing])).rows[0],
  originalProfile,
);
const player = crypto.randomUUID(),
  other = crypto.randomUUID();
await db.query("INSERT INTO auth.users(id) VALUES($1),($2)", [player, other]);
async function command(action, input = {}, events = [], id = crypto.randomUUID(), user = player) {
  const r = await db.query("SELECT game_core_command($1,$2,$3,$4,$5) AS s", [
    user,
    action,
    id,
    JSON.stringify(input),
    events,
  ]);
  return r.rows[0].s;
}
async function age(run, seconds = 100) {
  await db.query(
    `UPDATE player_quest_progress SET accepted_at=now()-make_interval(secs=>$2),last_action_at=now()-interval '3 seconds' WHERE id=$1`,
    [run, seconds],
  );
}
async function pose(position) {
  // Local test fixture only: backdate position telemetry to allow travel without sleeps.
  await db.query(
    `UPDATE game_player_presence SET updated_at=now()-interval '20 seconds' WHERE player_id=$1`,
    [player],
  );
  return command("pose", { position });
}
async function finish(s) {
  let run = s.active;
  await age(run.id);
  const quest = s.quests.find((q) => q.id === run.quest_id);
  for (let i = 0; i < quest.objectives.length; i++) {
    const o = quest.objectives[i];
    await pose([o.position[0], o.position[1] + 0.83, o.position[2]]);
    for (let n = 0; n < o.required; n++) {
      await age(run.id);
      s = await command("objective", { runId: run.id, revision: run.revision, objective: i });
      run = s.active;
    }
  }
  return command("complete", { runId: run.id, revision: run.revision });
}
let s = await command("read");
assert.equal(s.profile.xp, 0);
assert.equal(s.wallet.current_balance, 0);
assert.equal(s.quests.length, 5);
assert.equal(s.quests.find((q) => q.id === "store-rush").available, false);
assert.ok(!JSON.stringify(s).includes("total_budget"));
await command("pose", { position: [0, 0.83, 12] });
await assert.rejects(command("pose", { position: [100, 0.83, 100] }));
s = await command("accept", { questId: "intro" });
await age(s.active.id);
await assert.rejects(command("objective", { runId: s.active.id, revision: 0, objective: 1 }));
await assert.rejects(command("objective", { runId: s.active.id, revision: 0, objective: 0 }));
await assert.rejects(command("complete", { runId: s.active.id, revision: 0 }));
s = await finish(s);
assert.equal(s.profile.xp, 100);
assert.equal(s.wallet.current_balance, 0);
const intro = s.history[0];
s = await command("complete", { runId: intro.id, revision: 0 });
assert.equal(s.profile.xp, 100);
await assert.rejects(command("accept", { questId: "intro" }));
await assert.rejects(command("accept", { questId: "store-rush" }));
s = await command("accept", { questId: "store-rush" }, ["STORE_RUSH"]);
s = await finish(s);
assert.equal(s.wallet.current_balance, 250);
assert.equal(s.ledger.length, 1);
await assert.rejects(command("accept", { questId: "store-rush" }, ["STORE_RUSH"]));
await db.query(
  `UPDATE player_quest_progress SET completed_at=((now() AT TIME ZONE 'Asia/Jakarta')::date-1)::timestamp AT TIME ZONE 'Asia/Jakarta' WHERE player_id=$1 AND quest_id='store-rush'`,
  [player],
);
s = await command("accept", { questId: "store-rush" }, ["STORE_RUSH"]);
assert.equal(s.active.quest_id, "store-rush");
s = await command("cancel", { runId: s.active.id, revision: s.active.revision });
// Cap fixture: 9,500 today plus a configured 1,000 Point reward yields only 500.
await db.query("UPDATE point_wallet SET earned_today=9500 WHERE player_id=$1", [player]);
await db.exec(
  `UPDATE game_quests SET rewards=jsonb_set(rewards,'{point}','1000') WHERE id='easter-egg'`,
);
s = await command("accept", { questId: "easter-egg" });
s = await finish(s);
assert.equal(s.wallet.earned_today, 10000);
assert.equal(s.history[0].point_awarded, 500);
assert.equal(s.profile.level, 2);
assert.equal(s.profile.xp, 500);
const completion = s.history[0],
  balance = s.wallet.current_balance;
for (let i = 0; i < 3; i++)
  s = await command("complete", { runId: completion.id, revision: completion.revision });
assert.equal(s.wallet.current_balance, balance);
assert.equal(s.profile.xp, 500);
s = await command("accept", { questId: "supplier-run" });
s = await finish(s);
assert.equal(s.history[0].point_awarded, 0);
assert.equal(s.history[0].xp_awarded, 300);
assert.equal(s.profile.xp, 800);
// WIB reset is server calendar day, independent of browser/DB session timezone.
await db.query(
  `UPDATE point_wallet SET day=(now() AT TIME ZONE 'Asia/Jakarta')::date-1 WHERE player_id=$1`,
  [player],
);
await db.exec(`SET TIME ZONE 'America/Los_Angeles'`);
s = await command("read");
assert.equal(s.wallet.earned_today, 0);
await db.exec(`UPDATE game_campaigns SET distributed=total_budget-50 WHERE id='owner-v1'`);
s = await command("accept", { questId: "warehouse" }, ["WAREHOUSE_RUSH"]);
s = await finish(s);
assert.equal(s.history[0].point_awarded, 50);
assert.equal(s.history[0].xp_awarded, 200);
const treasury = (await db.query("SELECT remaining FROM game_campaigns")).rows[0];
assert.equal(treasury.remaining, 0);
const privateState = await command("read", {}, [], crypto.randomUUID(), other);
assert.equal(privateState.wallet.current_balance, 0);
assert.equal(privateState.ledger.length, 0);
// Replayed objective with same receipt must not increment twice; stale revisions fail.
s = await command("accept", { questId: "store-rush" }, ["STORE_RUSH"]);
await age(s.active.id);
await pose([4.8, 0.83, 2.3]);
const key = crypto.randomUUID(),
  input = { runId: s.active.id, revision: 0, objective: 0 };
s = await command("objective", input, [], key);
assert.equal(s.active.progress[0], 1);
s = await command("objective", input, [], key);
assert.equal(s.active.progress[0], 1);
await assert.rejects(command("objective", input));
await assert.rejects(db.exec("UPDATE point_ledger SET amount=1"));
await assert.rejects(db.exec("DELETE FROM point_ledger"));
await db.exec("SET ROLE authenticated");
for (const sql of [
  "SELECT * FROM point_wallet",
  "SELECT * FROM point_ledger",
  "SELECT * FROM game_campaigns",
  `SELECT game_core_command('${player}','read',gen_random_uuid(),'{}','{}')`,
  `UPDATE player_game_profile SET xp=999999`,
])
  await assert.rejects(db.exec(sql));
await db.exec("RESET ROLE");
console.log(
  "PASS: migration, XP/levels, ledger, partial daily cap, XP at cap, WIB reset/repeat, treasury truncation, idempotency, one-time policy, objective order/proximity/speed, stale revision, private state, denied client writes/RPC, immutable ledger.",
);
await db.close();
