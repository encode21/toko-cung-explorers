ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS username text,
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'pengunjung',
  ADD COLUMN IF NOT EXISTS bio text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS avatar jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS equipped_character text;

UPDATE public.profiles
SET username = lower(regexp_replace(coalesce(display_name,'pemain'), '[^a-zA-Z0-9]', '', 'g')) || substr(replace(id::text,'-',''),1,5)
WHERE username IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_key ON public.profiles (username);

CREATE TABLE public.character_ownership (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  character_id text NOT NULL,
  acquired_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, character_id)
);
GRANT SELECT ON public.character_ownership TO authenticated;
GRANT ALL ON public.character_ownership TO service_role;
ALTER TABLE public.character_ownership ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own characters" ON public.character_ownership
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.guard_profile_identity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.username IS NULL OR NEW.username = '' THEN
    NEW.username := lower(regexp_replace(coalesce(NEW.display_name,'pemain'), '[^a-zA-Z0-9]', '', 'g')) || substr(replace(NEW.id::text,'-',''),1,5);
  END IF;
  IF length(NEW.bio) > 140 THEN
    RAISE EXCEPTION 'Bio terlalu panjang';
  END IF;
  IF coalesce(auth.role(), '') <> 'service_role' THEN
    -- Pemain hanya boleh memilih peran publik; peran staf ditetapkan oleh backend.
    IF NEW.role NOT IN ('pengunjung','pembeli','member','tamu')
       AND (TG_OP = 'INSERT' OR NEW.role IS DISTINCT FROM OLD.role) THEN
      RAISE EXCEPTION 'Peran ini hanya bisa diberikan oleh admin';
    END IF;
    -- Karakter eksklusif hanya bisa dipakai bila dimiliki.
    IF NEW.equipped_character IS NOT NULL
       AND (TG_OP = 'INSERT' OR NEW.equipped_character IS DISTINCT FROM OLD.equipped_character)
       AND NOT EXISTS (
         SELECT 1 FROM public.character_ownership o
         WHERE o.user_id = NEW.id AND o.character_id = NEW.equipped_character
       ) THEN
      RAISE EXCEPTION 'Karakter belum dimiliki';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.guard_profile_identity() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER profiles_guard_identity
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.guard_profile_identity();