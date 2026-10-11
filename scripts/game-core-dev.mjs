/** LOCAL ONLY. No Supabase credentials, HTTP gateway, or production imports. */
import { readFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
const { PGlite } = await import(process.env.GAME_CORE_PGLITE || "@electric-sql/pglite");
const dir = join(tmpdir(), "toko-cung-game-core-dev");
await mkdir(dir, { recursive: true });
const db = new PGlite(dir);
const user = "11111111-1111-4111-8111-111111111111";
if (
  !(await db.query("SELECT to_regclass('public.game_levels') AS table_name")).rows[0].table_name
) {
  await db.exec(
    "CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role; CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY);",
  );
  await db.exec(
    await readFile(
      new URL("../supabase/migrations/20261010120000_game_core_v1.sql", import.meta.url),
      "utf8",
    ),
  );
  await db.query("INSERT INTO auth.users VALUES($1)", [user]);
}
async function call(action, input = {}, events = []) {
  return (
    await db.query("SELECT game_core_command($1,$2,$3,$4,$5) AS s", [
      user,
      action,
      crypto.randomUUID(),
      JSON.stringify(input),
      events,
    ])
  ).rows[0].s;
}
let state = await call("read");
const [action = "inspect", arg = "0"] = process.argv.slice(2);
const amount = Number(arg);
if (
  ["grant-xp", "set-xp", "grant-point"].includes(action) &&
  (!Number.isSafeInteger(amount) || amount < 0 || amount > 10000000)
)
  throw Error("Amount must be an integer from 0 to 10,000,000");
if (action === "set-xp" || action === "grant-xp") {
  const xp = action === "set-xp" ? amount : state.profile.xp + amount;
  await db.query(
    `UPDATE player_game_profile SET xp=$2,level=(SELECT level FROM game_levels WHERE xp<=$2 ORDER BY xp DESC LIMIT 1),title=(SELECT title FROM game_levels WHERE xp<=$2 ORDER BY xp DESC LIMIT 1) WHERE player_id=$1`,
    [user, xp],
  );
} else if (action === "reset-daily") {
  await db.query(
    `UPDATE point_wallet SET day=(now() AT TIME ZONE 'Asia/Jakarta')::date-1 WHERE player_id=$1`,
    [user],
  );
} else if (action === "force-available") {
  await db.query(
    `UPDATE game_quests SET prerequisites='{}',event_type=NULL,repeat_policy='REPEATABLE',enabled=true WHERE id=$1`,
    [arg],
  );
} else if (action === "accept") {
  state = await call("accept", { questId: arg }, ["STORE_RUSH", "WAREHOUSE_RUSH"]);
} else if (action === "complete-objective" || action === "force-complete") {
  if (!state.active) throw Error("Accept a local quest first");
  const quest = state.quests.find((q) => q.id === state.active.quest_id);
  const progress = state.active.progress.map((n, i) =>
    action === "force-complete" || i === amount ? quest.objectives[i].required : n,
  );
  await db.query(
    `UPDATE player_quest_progress SET progress=$2,accepted_at=now()-interval '5 minutes' WHERE id=$1`,
    [state.active.id, JSON.stringify(progress)],
  );
  if (action === "force-complete")
    await call("complete", { runId: state.active.id, revision: state.active.revision });
} else if (action === "grant-point") {
  if (state.active) throw Error("Finish/cancel active local quest first");
  await db.query(
    `INSERT INTO game_quests(id,title,description,category,location,repeat_policy,objectives,rewards,campaign_id,min_seconds) VALUES('dev-grant','LOCAL TEST','Local fixture','WORLD','test','REPEATABLE','[{"type":"INTERACT","target":"test","required":1,"position":[0,0,12],"radius":2}]',$1,'owner-v1',0) ON CONFLICT(id) DO UPDATE SET rewards=excluded.rewards`,
    [JSON.stringify({ xp: 0, point: amount })],
  );
  state = await call("accept", { questId: "dev-grant" });
  await db.query(`UPDATE player_quest_progress SET progress='[1]' WHERE id=$1`, [state.active.id]);
  await call("complete", { runId: state.active.id, revision: 0 });
} else if (action !== "inspect")
  throw Error(
    "Commands: inspect, set-xp N, grant-xp N, grant-point N, reset-daily, force-available QUEST, accept QUEST, complete-objective INDEX, force-complete",
  );
console.log(
  JSON.stringify(
    { mode: "LOCAL ONLY — never a real wallet", database: dir, ...(await call("read")) },
    null,
    2,
  ),
);
await db.close();
