-- Additive game core. Existing identity/avatar/ownership tables are untouched.
BEGIN;
CREATE TABLE public.game_levels (level integer PRIMARY KEY CHECK(level > 0), xp bigint UNIQUE NOT NULL CHECK(xp >= 0), title text NOT NULL);
INSERT INTO public.game_levels VALUES (1,0,'Pendatang'),(2,500,'Warga Cung'),(3,1200,'Nakama'),(4,2100,'Penjelajah'),(5,3200,'Juragan');
CREATE TABLE public.game_campaigns (
 id text PRIMARY KEY, principal_id text, title text NOT NULL, active_from timestamptz, active_until timestamptz,
 building_id text, status text NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT','ACTIVE','ENDED')),
 total_budget bigint NOT NULL CHECK(total_budget >= 0), allocated bigint NOT NULL DEFAULT 0 CHECK(allocated >= 0),
 distributed bigint NOT NULL DEFAULT 0 CHECK(distributed >= 0), redeemed bigint NOT NULL DEFAULT 0 CHECK(redeemed >= 0),
 remaining bigint GENERATED ALWAYS AS (total_budget-distributed) STORED,
 CHECK(distributed <= total_budget), CHECK(distributed <= allocated), CHECK(allocated <= total_budget), CHECK(redeemed <= distributed)
);
INSERT INTO public.game_campaigns(id,title,status,total_budget,allocated) VALUES ('owner-v1','World V1','ACTIVE',10000000,10000000);
CREATE TABLE public.player_game_profile (
 player_id uuid PRIMARY KEY REFERENCES auth.users(id), xp bigint NOT NULL DEFAULT 0 CHECK(xp >= 0),
 level integer NOT NULL DEFAULT 1 REFERENCES public.game_levels(level), title text NOT NULL DEFAULT 'Pendatang',
 missions_completed integer NOT NULL DEFAULT 0, lifetime_points_earned bigint NOT NULL DEFAULT 0,
 area_unlocks text[] NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.point_wallet (
 player_id uuid PRIMARY KEY REFERENCES public.player_game_profile(player_id), current_balance bigint NOT NULL DEFAULT 0 CHECK(current_balance >= 0),
 earned_today integer NOT NULL DEFAULT 0 CHECK(earned_today BETWEEN 0 AND 10000), day date NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Jakarta')::date,
 lifetime_earned bigint NOT NULL DEFAULT 0, last_updated timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.game_quests (
 id text PRIMARY KEY, title text NOT NULL, description text NOT NULL, category text NOT NULL CHECK(category IN ('WORLD','DAILY','SUPPLIER','PRINCIPAL','DUNGEON','EASTER_EGG','REACTIVE')),
 location text NOT NULL, repeat_policy text NOT NULL CHECK(repeat_policy IN ('ONCE','DAILY','REPEATABLE','CAMPAIGN_LIMITED')),
 prerequisites jsonb NOT NULL DEFAULT '{}', objectives jsonb NOT NULL CHECK(jsonb_array_length(objectives) > 0),
 rewards jsonb NOT NULL CHECK((rewards->>'xp')::integer >= 0 AND (rewards->>'point')::integer >= 0),
 active_from timestamptz, active_until timestamptz, enabled boolean NOT NULL DEFAULT true,
 event_type text, ordered boolean NOT NULL DEFAULT true, cancellable boolean NOT NULL DEFAULT true,
 min_seconds integer NOT NULL DEFAULT 10 CHECK(min_seconds >= 0), campaign_limit integer NOT NULL DEFAULT 1 CHECK(campaign_limit > 0),
 principal_id text, campaign_id text NOT NULL REFERENCES public.game_campaigns(id), building_id text, instance_id text, theme text, quest_chain text[] NOT NULL DEFAULT '{}'
);
CREATE TABLE public.player_quest_progress (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), player_id uuid NOT NULL REFERENCES public.player_game_profile(player_id), quest_id text NOT NULL REFERENCES public.game_quests(id),
 status text NOT NULL CHECK(status IN ('ACCEPTED','ACTIVE','COMPLETED','FAILED','EXPIRED','CANCELLED')),
 progress jsonb NOT NULL DEFAULT '[]', revision integer NOT NULL DEFAULT 0, accepted_at timestamptz NOT NULL DEFAULT now(),
 completed_at timestamptz, expires_at timestamptz NOT NULL DEFAULT now()+interval '30 minutes', last_action_at timestamptz,
 duration_seconds numeric, xp_awarded integer NOT NULL DEFAULT 0, point_awarded integer NOT NULL DEFAULT 0,
 reward_metadata jsonb NOT NULL DEFAULT '{}'
);
CREATE UNIQUE INDEX game_one_active ON public.player_quest_progress(player_id) WHERE status IN ('ACCEPTED','ACTIVE');
CREATE INDEX game_history ON public.player_quest_progress(player_id,quest_id,completed_at DESC);
CREATE TABLE public.point_ledger (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), player_id uuid NOT NULL REFERENCES public.player_game_profile(player_id), amount bigint NOT NULL CHECK(amount > 0),
 type text NOT NULL DEFAULT 'QUEST_REWARD', source_type text NOT NULL DEFAULT 'QUEST', source_id uuid NOT NULL UNIQUE REFERENCES public.player_quest_progress(id),
 balance_after bigint NOT NULL CHECK(balance_after >= 0), campaign_id text NOT NULL REFERENCES public.game_campaigns(id), created_at timestamptz NOT NULL DEFAULT now(), metadata jsonb NOT NULL DEFAULT '{}'
);
CREATE TABLE public.game_action_receipts (player_id uuid NOT NULL REFERENCES public.player_game_profile(player_id), request_id uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(player_id,request_id));
CREATE TABLE public.game_player_presence (player_id uuid PRIMARY KEY REFERENCES public.player_game_profile(player_id), position jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now());

-- No browser writes or browser-executable payout RPC. Only the authenticated server gateway calls it.
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['game_levels','game_campaigns','player_game_profile','point_wallet','game_quests','player_quest_progress','point_ledger','game_action_receipts','game_player_presence'] LOOP
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated',t);
  EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO service_role',t);
 END LOOP;
END $$;
CREATE FUNCTION public.game_ledger_immutable() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$ BEGIN RAISE EXCEPTION 'Point ledger is append-only'; END $$;
CREATE TRIGGER point_ledger_immutable BEFORE UPDATE OR DELETE ON public.point_ledger FOR EACH ROW EXECUTE FUNCTION public.game_ledger_immutable();
REVOKE ALL ON FUNCTION public.game_ledger_immutable() FROM PUBLIC;

CREATE FUNCTION public.game_quest_reason(p_player uuid, q public.game_quests, p_events text[]) RETURNS text LANGUAGE plpgsql STABLE SET search_path = public AS $$
DECLARE p public.player_game_profile; n integer; BEGIN
 SELECT * INTO p FROM public.player_game_profile WHERE player_id=p_player;
 IF NOT q.enabled OR (q.active_from IS NOT NULL AND now()<q.active_from) OR (q.active_until IS NOT NULL AND now()>=q.active_until) THEN RETURN 'Quest belum aktif / sudah berakhir'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.game_campaigns c WHERE c.id=q.campaign_id AND c.status='ACTIVE' AND (c.active_from IS NULL OR c.active_from<=now()) AND (c.active_until IS NULL OR c.active_until>now())) THEN RETURN 'Campaign tidak aktif'; END IF;
 IF q.event_type IS NOT NULL AND NOT q.event_type=ANY(p_events) THEN RETURN 'Menunggu event World yang terverifikasi'; END IF;
 IF p.level < coalesce((q.prerequisites->>'level')::integer,1) THEN RETURN 'Level belum mencukupi'; END IF;
 IF q.prerequisites ? 'quest' AND NOT EXISTS(SELECT 1 FROM public.player_quest_progress r WHERE r.player_id=p_player AND r.quest_id=q.prerequisites->>'quest' AND r.status='COMPLETED') THEN RETURN 'Selesaikan quest prasyarat'; END IF;
 IF q.prerequisites ? 'area' AND NOT (q.prerequisites->>'area')=ANY(p.area_unlocks) THEN RETURN 'Area belum terbuka'; END IF;
 SELECT count(*) INTO n FROM public.player_quest_progress r WHERE r.player_id=p_player AND r.quest_id=q.id AND r.status='COMPLETED' AND (q.repeat_policy<>'DAILY' OR (r.completed_at AT TIME ZONE 'Asia/Jakarta')::date=(now() AT TIME ZONE 'Asia/Jakarta')::date);
 IF (q.repeat_policy IN ('ONCE','DAILY') AND n>0) OR (q.repeat_policy='CAMPAIGN_LIMITED' AND n>=q.campaign_limit) THEN RETURN 'Batas pengulangan quest tercapai'; END IF;
 RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION public.game_quest_reason(uuid,public.game_quests,text[]) FROM PUBLIC;

CREATE FUNCTION public.game_core_snapshot(p_player uuid,p_events text[]) RETURNS jsonb LANGUAGE sql STABLE SET search_path=public AS $$
 SELECT jsonb_build_object(
  'profile',(SELECT to_jsonb(p)-'area_unlocks' FROM player_game_profile p WHERE player_id=p_player),
  'wallet',(SELECT to_jsonb(w) FROM point_wallet w WHERE player_id=p_player),
  'levels',(SELECT jsonb_agg(l ORDER BY l.level) FROM game_levels l),
  -- Explicit public projection: never include campaign treasury/financial administration fields.
  'quests',(SELECT coalesce(jsonb_agg(to_jsonb(q)||jsonb_build_object('available',game_quest_reason(p_player,q,p_events) IS NULL,'reason',game_quest_reason(p_player,q,p_events)) ORDER BY q.id),'[]') FROM game_quests q WHERE enabled),
  'active',(SELECT to_jsonb(r) FROM player_quest_progress r WHERE player_id=p_player AND status IN ('ACCEPTED','ACTIVE')),
  'history',(SELECT coalesce(jsonb_agg(r),'[]') FROM (SELECT * FROM player_quest_progress WHERE player_id=p_player AND status NOT IN ('ACCEPTED','ACTIVE') ORDER BY coalesce(completed_at,accepted_at) DESC LIMIT 30) r),
  'ledger',(SELECT coalesce(jsonb_agg(r),'[]') FROM (SELECT id,amount,balance_after,source_id,created_at FROM point_ledger WHERE player_id=p_player ORDER BY created_at DESC LIMIT 30) r)
 );
$$;
REVOKE ALL ON FUNCTION public.game_core_snapshot(uuid,text[]) FROM PUBLIC;

CREATE FUNCTION public.game_core_command(p_player uuid,p_action text,p_request uuid,p_input jsonb,p_events text[] DEFAULT '{}') RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
 p public.player_game_profile; w public.point_wallet; q public.game_quests; r public.player_quest_progress; c public.game_campaigns;
 pose public.game_player_presence; obj jsonb; pos jsonb; reason text; idx integer; count_done integer; reward integer; xp_reward integer;
 today date := (now() AT TIME ZONE 'Asia/Jakarta')::date; elapsed numeric; distance numeric; lev public.game_levels;
BEGIN
 IF p_action NOT IN ('read','pose','accept','objective','complete','cancel') OR p_request IS NULL THEN RAISE EXCEPTION 'Invalid command'; END IF;
 INSERT INTO player_game_profile(player_id) VALUES(p_player) ON CONFLICT DO NOTHING;
 SELECT * INTO p FROM player_game_profile WHERE player_id=p_player FOR UPDATE;
 INSERT INTO point_wallet(player_id) VALUES(p_player) ON CONFLICT DO NOTHING;
 UPDATE point_wallet SET earned_today=0,day=today,last_updated=now() WHERE player_id=p_player AND day<>today;
 UPDATE player_quest_progress SET status='EXPIRED',revision=revision+1 WHERE player_id=p_player AND status IN ('ACCEPTED','ACTIVE') AND expires_at<=now();
 IF p_action='read' THEN RETURN game_core_snapshot(p_player,p_events); END IF;
 IF EXISTS(SELECT 1 FROM game_action_receipts WHERE player_id=p_player AND request_id=p_request) THEN RETURN game_core_snapshot(p_player,p_events); END IF;
 IF (SELECT count(*) FROM game_action_receipts WHERE player_id=p_player AND created_at>now()-interval '1 minute')>=90 THEN RAISE EXCEPTION 'Terlalu banyak aksi. Tunggu sebentar.'; END IF;
 INSERT INTO game_action_receipts VALUES(p_player,p_request,now());
 -- Positions are untrusted telemetry. Validate plausible speed and server time; never use peer-host receipts for rewards.
 IF p_action='pose' THEN
  pos:=p_input->'position';
  IF jsonb_typeof(pos)<>'array' OR jsonb_array_length(pos)<>3 OR pos IS NULL THEN RAISE EXCEPTION 'Invalid position'; END IF;
  FOR idx IN 0..2 LOOP IF jsonb_typeof(pos->idx)<>'number' OR abs((pos->>idx)::numeric)>500 THEN RAISE EXCEPTION 'Invalid position'; END IF; END LOOP;
  SELECT * INTO pose FROM game_player_presence WHERE player_id=p_player;
  IF FOUND THEN
   elapsed:=extract(epoch FROM now()-pose.updated_at);
   distance:=sqrt(power((pos->>0)::numeric-(pose.position->>0)::numeric,2)+power((pos->>1)::numeric-(pose.position->>1)::numeric,2)+power((pos->>2)::numeric-(pose.position->>2)::numeric,2));
   IF elapsed<1 THEN RAISE EXCEPTION 'Tunggu posisi tersinkron'; END IF;
   IF distance>least(elapsed,30)*14+3 THEN RAISE EXCEPTION 'Pergerakan terlalu cepat'; END IF;
  ELSE
   IF sqrt(power((pos->>0)::numeric,2)+power((pos->>2)::numeric-12,2))>8 THEN RAISE EXCEPTION 'Mulai sesi quest dari pintu masuk World'; END IF;
  END IF;
  INSERT INTO game_player_presence VALUES(p_player,pos,now()) ON CONFLICT(player_id) DO UPDATE SET position=excluded.position,updated_at=excluded.updated_at;
 ELSIF p_action='accept' THEN
  SELECT * INTO q FROM game_quests WHERE id=p_input->>'questId';
  IF NOT FOUND THEN RAISE EXCEPTION 'Quest tidak ditemukan'; END IF;
  reason:=game_quest_reason(p_player,q,p_events);
  IF reason IS NOT NULL THEN RAISE EXCEPTION '%',reason; END IF;
  IF EXISTS(SELECT 1 FROM player_quest_progress WHERE player_id=p_player AND status IN ('ACCEPTED','ACTIVE')) THEN RAISE EXCEPTION 'Selesaikan atau batalkan quest aktif'; END IF;
  INSERT INTO player_quest_progress(player_id,quest_id,status,progress) VALUES(p_player,q.id,'ACCEPTED',(SELECT jsonb_agg(0) FROM jsonb_array_elements(q.objectives)));
 ELSE
  SELECT * INTO r FROM player_quest_progress WHERE id=(p_input->>'runId')::uuid AND player_id=p_player FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Sesi quest tidak ditemukan'; END IF;
  IF r.status='COMPLETED' AND p_action='complete' THEN RETURN game_core_snapshot(p_player,p_events); END IF;
  IF r.status NOT IN ('ACCEPTED','ACTIVE') THEN RETURN game_core_snapshot(p_player,p_events); END IF;
  IF r.revision IS DISTINCT FROM (p_input->>'revision')::integer THEN RAISE EXCEPTION 'Status berubah. Muat ulang quest.'; END IF;
  SELECT * INTO q FROM game_quests WHERE id=r.quest_id;
  IF p_action='cancel' THEN
   IF NOT q.cancellable THEN RAISE EXCEPTION 'Quest tidak dapat dibatalkan'; END IF;
   UPDATE player_quest_progress SET status='CANCELLED',revision=revision+1 WHERE id=r.id;
  ELSIF p_action='objective' THEN
   idx:=(p_input->>'objective')::integer; obj:=q.objectives->idx;
   IF idx IS NULL OR idx<0 OR obj IS NULL OR obj->>'type' NOT IN ('TALK','VISIT','INTERACT','FIND','COLLECT','DELIVER','SCAN','EXPLORE') THEN RAISE EXCEPTION 'Tujuan tidak valid'; END IF;
   IF now()-coalesce(r.last_action_at,r.accepted_at)<interval '1.1 seconds' THEN RAISE EXCEPTION 'Tunggu aksi sebelumnya'; END IF;
   IF q.ordered AND EXISTS(SELECT 1 FROM jsonb_array_elements(q.objectives) WITH ORDINALITY o(v,n) WHERE n<=idx AND coalesce((r.progress->>(n::integer-1))::integer,0)<(v->>'required')::integer) THEN RAISE EXCEPTION 'Ikuti urutan tujuan quest'; END IF;
   count_done:=coalesce((r.progress->>idx)::integer,0);
   IF count_done>=(obj->>'required')::integer THEN RAISE EXCEPTION 'Tujuan sudah selesai'; END IF;
   SELECT * INTO pose FROM game_player_presence WHERE player_id=p_player;
   IF NOT FOUND OR now()-pose.updated_at>interval '8 seconds' THEN RAISE EXCEPTION 'Menunggu posisi pemain'; END IF;
   pos:=obj->'position';
   IF abs((pose.position->>1)::numeric-0.83-(pos->>1)::numeric)>1.8 OR sqrt(power((pose.position->>0)::numeric-(pos->>0)::numeric,2)+power((pose.position->>2)::numeric-(pos->>2)::numeric,2))>(obj->>'radius')::numeric THEN RAISE EXCEPTION 'Dekati lokasi tujuan quest'; END IF;
   UPDATE player_quest_progress SET progress=jsonb_set(progress,ARRAY[idx::text],to_jsonb(count_done+1)),status='ACTIVE',last_action_at=now(),revision=revision+1 WHERE id=r.id;
  ELSIF p_action='complete' THEN
   IF EXISTS(SELECT 1 FROM jsonb_array_elements(q.objectives) WITH ORDINALITY o(v,n) WHERE coalesce((r.progress->>(n::integer-1))::integer,0)<(v->>'required')::integer) THEN RAISE EXCEPTION 'Tujuan quest belum selesai'; END IF;
   elapsed:=extract(epoch FROM now()-r.accepted_at);
   IF elapsed<q.min_seconds THEN RAISE EXCEPTION 'Quest terlalu cepat. Coba sebentar lagi.'; END IF;
   -- Lock order: player, wallet, then campaign. All payouts for a player and treasury serialize.
   SELECT * INTO w FROM point_wallet WHERE player_id=p_player FOR UPDATE;
   SELECT * INTO c FROM game_campaigns WHERE id=q.campaign_id FOR UPDATE;
   xp_reward:=(q.rewards->>'xp')::integer;
   reward:=least((q.rewards->>'point')::integer,10000-w.earned_today,c.remaining,c.allocated-c.distributed);
   IF c.status<>'ACTIVE' OR (c.active_from IS NOT NULL AND now()<c.active_from) OR (c.active_until IS NOT NULL AND now()>=c.active_until) THEN reward:=0; END IF;
   IF reward>0 THEN
    INSERT INTO point_ledger(player_id,amount,source_id,balance_after,campaign_id,metadata) VALUES(p_player,reward,r.id,w.current_balance+reward,c.id,jsonb_build_object('requested',q.rewards->'point','day',today));
    UPDATE point_wallet SET current_balance=current_balance+reward,earned_today=earned_today+reward,lifetime_earned=lifetime_earned+reward,last_updated=now() WHERE player_id=p_player;
    UPDATE game_campaigns SET distributed=distributed+reward WHERE id=c.id;
   END IF;
   SELECT * INTO lev FROM game_levels WHERE xp<=p.xp+xp_reward ORDER BY xp DESC LIMIT 1;
   UPDATE player_game_profile SET xp=xp+xp_reward,level=lev.level,title=lev.title,missions_completed=missions_completed+1,lifetime_points_earned=lifetime_points_earned+reward,updated_at=now() WHERE player_id=p_player;
   UPDATE player_quest_progress SET status='COMPLETED',completed_at=now(),duration_seconds=elapsed,xp_awarded=xp_reward,point_awarded=reward,revision=revision+1,reward_metadata=jsonb_build_object('requestedPoint',q.rewards->'point','pointLimited',reward<(q.rewards->>'point')::integer,'fastCompletionSignal',elapsed<q.min_seconds*2) WHERE id=r.id;
  END IF;
 END IF;
 RETURN game_core_snapshot(p_player,p_events);
END $$;
REVOKE ALL ON FUNCTION public.game_core_command(uuid,text,uuid,jsonb,text[]) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.game_core_command(uuid,text,uuid,jsonb,text[]) TO service_role;
INSERT INTO public.game_quests(id,title,description,category,location,repeat_policy,objectives,rewards,event_type,prerequisites,min_seconds,campaign_id) VALUES ('intro','Kenalan dengan Toko Cung World','Jelajahi toko, sapa Nakama, lalu kembali ke papan quest.','WORLD','Toko Cung','ONCE','[{"type": "VISIT", "target": "entrance", "label": "Kunjungi pintu masuk Toko Cung", "position": [0, 0, 4], "required": 1, "radius": 2.2}, {"type": "TALK", "target": "npc-nakama-warehouse", "label": "Sapa Nakama Gudang", "position": [3.4, 0, -17.5], "required": 1, "radius": 3}, {"type": "VISIT", "target": "warehouse", "label": "Jelajahi gudang", "position": [6.2, 0, -15], "required": 1, "radius": 2.2}, {"type": "INTERACT", "target": "quest-board", "label": "Kembali ke Quest Board", "position": [2.2, 0, 0.5], "required": 1, "radius": 2.2}]','{"xp": 100, "point": 0}',NULL,'{}',30,'owner-v1');
INSERT INTO public.game_quests(id,title,description,category,location,repeat_policy,objectives,rewards,event_type,prerequisites,min_seconds,campaign_id) VALUES ('store-rush','Bantu Kasir','Saat toko ramai, bantu scan 5 barang di depan kasir.','REACTIVE','Kasir','DAILY','[{"type": "SCAN", "target": "cashier", "label": "Scan barang di depan kasir", "position": [4.8, 0, 2.3], "required": 5, "radius": 2.2}]','{"xp": 150, "point": 250}','STORE_RUSH','{}',8,'owner-v1');
INSERT INTO public.game_quests(id,title,description,category,location,repeat_policy,objectives,rewards,event_type,prerequisites,min_seconds,campaign_id) VALUES ('warehouse','Bantu Gudang','Ambil dan antar 3 paket, satu per satu.','REACTIVE','Gudang','DAILY','[{"type": "COLLECT", "target": "parcel-0", "label": "Ambil paket di tumpukan kiri gudang", "position": [-7.3, 0, -14.8], "required": 1, "radius": 2.2}, {"type": "DELIVER", "target": "packing-0", "label": "Antar paket ke meja packing", "position": [-3.6, 0, -15.3], "required": 1, "radius": 2.2}, {"type": "COLLECT", "target": "parcel-1", "label": "Ambil paket di tumpukan kiri gudang", "position": [-7.3, 0, -14.8], "required": 1, "radius": 2.2}, {"type": "DELIVER", "target": "packing-1", "label": "Antar paket ke meja packing", "position": [-3.6, 0, -15.3], "required": 1, "radius": 2.2}, {"type": "COLLECT", "target": "parcel-2", "label": "Ambil paket di tumpukan kiri gudang", "position": [-7.3, 0, -14.8], "required": 1, "radius": 2.2}, {"type": "DELIVER", "target": "packing-2", "label": "Antar paket ke meja packing", "position": [-3.6, 0, -15.3], "required": 1, "radius": 2.2}]','{"xp": 200, "point": 350}','WAREHOUSE_RUSH','{}',15,'owner-v1');
INSERT INTO public.game_quests(id,title,description,category,location,repeat_policy,objectives,rewards,event_type,prerequisites,min_seconds,campaign_id) VALUES ('easter-egg','Rahasia di Sekitar Toko','Temukan tiga tanda bintang: sisi barat, depan timur, dan halaman gudang.','EASTER_EGG','Lingkungan toko','ONCE','[{"type": "FIND", "target": "clue-west", "label": "Temukan petunjuk di sisi barat", "position": [-12, 0, 7], "required": 1, "radius": 2.2}, {"type": "FIND", "target": "clue-east", "label": "Temukan petunjuk di sisi timur", "position": [13, 0, 10], "required": 1, "radius": 2.2}, {"type": "FIND", "target": "clue-yard", "label": "Temukan petunjuk di halaman gudang", "position": [12, 0, -19], "required": 1, "radius": 2.2}]','{"xp": 250, "point": 500}',NULL,'{"quest": "intro"}',35,'owner-v1');
INSERT INTO public.game_quests(id,title,description,category,location,repeat_policy,objectives,rewards,event_type,prerequisites,min_seconds,campaign_id) VALUES ('supplier-run','Supplier Run · Prototipe','Ambil peti dari pos supplier sementara di barat, lalu antar ke gudang.','SUPPLIER','Pos supplier sementara','DAILY','[{"type": "VISIT", "target": "supplier", "label": "Kunjungi pos supplier sementara", "position": [-16, 0, 9], "required": 1, "radius": 2.2}, {"type": "COLLECT", "target": "supplier-crate", "label": "Ambil peti supplier", "position": [-16, 0, 9], "required": 1, "radius": 2.2}, {"type": "DELIVER", "target": "warehouse-delivery", "label": "Antar peti ke pintu gudang", "position": [6.2, 0, -15], "required": 1, "radius": 2.2}]','{"xp": 300, "point": 750}',NULL,'{"quest": "intro"}',30,'owner-v1');
COMMIT;
