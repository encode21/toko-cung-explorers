/** Isolated SQL policy test; no Supabase project or credentials are used. */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const { PGlite } = await import(process.env.GAME_CORE_PGLITE || "@electric-sql/pglite");
const db = new PGlite();
try {
  await db.exec(`
    CREATE ROLE authenticated; CREATE ROLE service_role; CREATE SCHEMA auth; CREATE SCHEMA realtime;
    CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql AS $$SELECT current_setting('test.claims')::jsonb$$;
    CREATE FUNCTION realtime.topic() RETURNS text LANGUAGE sql AS $$SELECT current_setting('test.topic')$$;
    CREATE TABLE realtime.messages(id int); ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;
    GRANT USAGE ON SCHEMA realtime,auth TO authenticated;
    GRANT SELECT,INSERT ON realtime.messages TO authenticated;
    CREATE FUNCTION public.game_core_command(uuid,text,uuid,jsonb,text[]) RETURNS void LANGUAGE sql AS $$SELECT$$;
    REVOKE ALL ON FUNCTION public.game_core_command(uuid,text,uuid,jsonb,text[]) FROM PUBLIC;
    GRANT EXECUTE ON FUNCTION public.game_core_command(uuid,text,uuid,jsonb,text[]) TO service_role;
  `);
  await db.exec(
    await readFile(
      new URL(
        "../supabase/migrations/20261010130000_laravel_identity_realtime.sql",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  const privilege = await db.query(
    "SELECT has_function_privilege('service_role','public.game_core_command(uuid,text,uuid,jsonb,text[])','execute') AS allowed",
  );
  assert.equal(privilege.rows[0].allowed, false);
  await db.exec(
    `SET ROLE authenticated; SET test.claims='{"world_realtime":true,"world_channel":"CHANNEL-01"}'; SET test.topic='world:CHANNEL-01'; INSERT INTO realtime.messages VALUES (1);`,
  );
  assert.equal((await db.query("SELECT * FROM realtime.messages")).rows.length, 1);
  await db.exec("SET test.topic='world:CHANNEL-02'");
  assert.equal((await db.query("SELECT * FROM realtime.messages")).rows.length, 0);
  await assert.rejects(db.exec("INSERT INTO realtime.messages VALUES (2)"), /row-level security/);
  await db.exec(
    `SET test.topic='world:CHANNEL-01'; SET test.claims='{"world_channel":"CHANNEL-01"}';`,
  );
  assert.equal((await db.query("SELECT * FROM realtime.messages")).rows.length, 0);
  await assert.rejects(db.exec("INSERT INTO realtime.messages VALUES (3)"), /row-level security/);
  await db.exec("RESET ROLE; DROP FUNCTION public.game_core_command(uuid,text,uuid,jsonb,text[])");
  const migration = await readFile(
    new URL("../supabase/migrations/20261010130000_laravel_identity_realtime.sql", import.meta.url),
    "utf8",
  );
  await db.exec(migration);
  await db.exec(migration);
  console.log(
    "PASS legacy reward RPC retired; channel-scoped realtime SELECT/INSERT missing-claim denial; rerunnable on a fresh realtime project",
  );
} finally {
  await db.close();
}
