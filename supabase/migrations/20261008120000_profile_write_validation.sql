-- Acknowledged profile writes retain optimistic timestamp revisions and server authority.
BEGIN;
REVOKE INSERT, UPDATE, DELETE ON public.character_ownership FROM authenticated, anon;
DROP POLICY IF EXISTS "Users can insert own character ownership" ON public.character_ownership;

CREATE OR REPLACE FUNCTION public.validate_profile_write()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE k text; v text;
BEGIN
  -- Trusted service/database maintenance may assign roles and grant ownership.
  IF current_user IN ('authenticated', 'anon') THEN
    IF NEW.id IS DISTINCT FROM auth.uid() THEN
      RAISE EXCEPTION 'Cannot edit another player profile' USING ERRCODE = '42501';
    END IF;
    IF (TG_OP = 'INSERT' OR NEW.role IS DISTINCT FROM OLD.role)
       AND NEW.role NOT IN ('pengunjung', 'pembeli', 'member', 'tamu') THEN
      RAISE EXCEPTION 'This role requires staff assignment' USING ERRCODE = '42501';
    END IF;
    IF NEW.equipped_character IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.character_ownership
      WHERE user_id = NEW.id AND character_id = NEW.equipped_character
    ) THEN
      RAISE EXCEPTION 'Character is not owned' USING ERRCODE = '42501';
    END IF;
    IF TG_OP = 'UPDATE' THEN NEW.created_at = OLD.created_at; END IF;
  END IF;
  NEW.display_name = btrim(NEW.display_name);
  IF TG_OP = 'INSERT' AND current_user NOT IN ('authenticated', 'anon') THEN
    NEW.display_name = coalesce(nullif(left(NEW.display_name,18),''), 'Pengunjung');
  END IF;
  IF char_length(NEW.display_name) NOT BETWEEN 1 AND 18 OR char_length(NEW.bio) > 140
     OR (NEW.username IS NOT NULL AND NEW.username !~ '^[a-z0-9_]{1,24}$') THEN
    RAISE EXCEPTION 'Invalid name, username or bio' USING ERRCODE = '22023';
  END IF;
  IF jsonb_typeof(NEW.avatar) IS DISTINCT FROM 'object' OR octet_length(NEW.avatar::text) > 2048 THEN
    RAISE EXCEPTION 'Invalid avatar' USING ERRCODE = '22023';
  END IF;
  FOR k, v IN SELECT key, value FROM jsonb_each_text(NEW.avatar) LOOP
    IF v IS NULL OR (CASE
      WHEN k IN ('skin','hairColor','outfitColor','pantsColor','shoesColor') THEN v !~ '^#[0-9a-fA-F]{6}$'
      WHEN k = 'hair' THEN v NOT IN ('short','spiky','bob','buns','cap','buzz','sidepart','ponytail','hijab')
      WHEN k = 'expression' THEN v NOT IN ('smile','grin','wink','calm')
      WHEN k = 'outfit' THEN v NOT IN ('casual','smart','cashier','warehouse','driver')
      WHEN k = 'accessory' THEN v NOT IN ('none','glasses','headset','scarf')
      ELSE true END) THEN
      RAISE EXCEPTION 'Invalid avatar field: %', k USING ERRCODE = '22023';
    END IF;
  END LOOP;
  -- Runs after profiles_set_updated_at; monotonic even within one transaction.
  NEW.updated_at = CASE WHEN TG_OP = 'UPDATE'
    THEN greatest(clock_timestamp(), OLD.updated_at + interval '1 microsecond')
    ELSE clock_timestamp() END;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.validate_profile_write() FROM PUBLIC;
DROP TRIGGER IF EXISTS profiles_validate_write ON public.profiles;
CREATE TRIGGER profiles_validate_write BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.validate_profile_write();
COMMIT;
