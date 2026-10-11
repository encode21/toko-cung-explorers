BEGIN;
-- Laravel is the only active wallet authority. Preserve old financial/profile rows for audited migration.
DO $$ BEGIN
  IF to_regprocedure('public.game_core_command(uuid,text,uuid,jsonb,text[])') IS NOT NULL THEN
    REVOKE EXECUTE ON FUNCTION public.game_core_command(uuid,text,uuid,jsonb,text[]) FROM service_role;
  END IF;
END $$;
-- New World clients use private topics and short-lived channel-scoped JWTs minted by Laravel.
-- Disable public realtime channels in Supabase project settings during rollout.
DROP POLICY IF EXISTS world_laravel_receive ON realtime.messages;
CREATE POLICY world_laravel_receive ON realtime.messages FOR SELECT TO authenticated
USING ((auth.jwt()->>'world_realtime') = 'true' AND realtime.topic() = 'world:' || (auth.jwt()->>'world_channel'));
DROP POLICY IF EXISTS world_laravel_send ON realtime.messages;
CREATE POLICY world_laravel_send ON realtime.messages FOR INSERT TO authenticated
WITH CHECK ((auth.jwt()->>'world_realtime') = 'true' AND realtime.topic() = 'world:' || (auth.jwt()->>'world_channel'));
COMMIT;
