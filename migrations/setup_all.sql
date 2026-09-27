-- Stylist 001_init.sql — Supabase SQL Editor에 전체를 붙여넣고 Run.
-- 1인용. 화이트리스트(allowed_users) + RLS. DELETE 권한은 주지 않고 soft delete(deleted_at)만 사용.

-- ============================================================
-- 1. 허용 사용자 (가입 차단 + 화이트리스트)
-- ============================================================
create table if not exists public.allowed_users (
  email text primary key
);
insert into public.allowed_users (email) values ('YOUR_EMAIL@example.com') on conflict do nothing;

create or replace function public.is_member()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.allowed_users a where lower(a.email) = lower(coalesce(auth.jwt()->>'email','')));
$$;

-- ============================================================
-- 2. 옷
-- ============================================================
create table if not exists public.items (
  id                 uuid primary key default gen_random_uuid(),
  owner              uuid not null default auth.uid(),
  created_at         timestamptz not null default now(),
  deleted_at         timestamptz,
  name               text not null,
  category           text not null check (category in ('top','bottom','outer','shoes','dress','bag','acc')),
  subtype            text,
  color_name         text,
  color_hex          text,
  color_tone         text,                     -- warm | cool | neutral
  pattern            text,                     -- solid | stripe | check | print | other
  length             text,                     -- crop | regular | long
  silhouette         text,                     -- slim | straight | oversized | aline | hline | wide | flare
  neckline           text,                     -- crew | v | collar | turtle | boat | square | none
  layer_role         text,                     -- base | mid | outer
  material           text,                     -- 확정 소재 (라벨 또는 사용자)
  material_guess     text,                     -- 모델 추정
  season             text[] not null default '{}',
  warmth             int not null default 3 check (warmth between 1 and 5),
  formality_work     boolean not null default false,
  formality_out      boolean not null default true,
  notes              text,
  attr_src           jsonb not null default '{}'::jsonb,   -- 속성별 출처: user | model | label | unknown
  status             text not null default 'active' check (status in ('active','paused','stored')),
  photo_path         text not null,            -- storage: wardrobe/<uid>/<id>/orig.jpg (긴 변 1600)
  thumb_path         text not null,            -- .../thumb.jpg (긴 변 800)
  label_path         text,                     -- .../label.jpg
  extraction         jsonb,                    -- Gemini 원 응답
  extraction_version text,
  reviewed_at        timestamptz,              -- null = 검수 대기
  last_worn_on       date                      -- 확인된 마지막 착용일 (없음 ≠ 미착용)
);
create index if not exists items_owner_idx on public.items(owner) where deleted_at is null;

-- ============================================================
-- 3. 코디 · 착용 · 피드백 · 판정
-- ============================================================
create table if not exists public.outfits (
  id         uuid primary key default gen_random_uuid(),
  owner      uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  tpo        text not null check (tpo in ('work','out','travel','formal')),
  kind       text not null,                    -- safe | vary | dare | manual
  items      uuid[] not null,
  score      int,
  gauge      jsonb,
  reason     text,
  saved      boolean not null default false,   -- 입음으로 확정된 성공 코디
  banned     boolean not null default false    -- 다시 추천하지 않음
);

create table if not exists public.wear_log (
  id         uuid primary key default gen_random_uuid(),
  owner      uuid not null default auth.uid(),
  worn_on    date not null,
  outfit_id  uuid references public.outfits(id),
  items      uuid[] not null,
  source     text not null default 'recommendation'   -- recommendation | saved | manual
);
create index if not exists wear_log_day_idx on public.wear_log(worn_on desc);

create table if not exists public.feedback (
  id         uuid primary key default gen_random_uuid(),
  owner      uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  kind       text not null check (kind in ('swap','ban','pin')),
  outfit_id  uuid references public.outfits(id),
  from_item  uuid references public.items(id),
  to_item    uuid references public.items(id),
  context    jsonb
);

create table if not exists public.judgements (
  id            uuid primary key default gen_random_uuid(),
  owner         uuid not null default auth.uid(),
  created_at    timestamptz not null default now(),
  input         text,
  score         int,
  confidence    text,
  analysis      jsonb,
  color_impact  text,
  color_mode    boolean,
  similar_count int,
  combo_count   int
);

-- ============================================================
-- 4. RLS + 권한 (DELETE 없음)
-- ============================================================
alter table public.allowed_users enable row level security;
alter table public.items         enable row level security;
alter table public.outfits       enable row level security;
alter table public.wear_log      enable row level security;
alter table public.feedback      enable row level security;
alter table public.judgements    enable row level security;

create policy allowed_users_sel on public.allowed_users for select to authenticated using (public.is_member());

do $$ declare t text; begin
  foreach t in array array['items','outfits','wear_log','feedback','judgements'] loop
    execute format('drop policy if exists %I_sel on public.%I', t, t);
    execute format('drop policy if exists %I_ins on public.%I', t, t);
    execute format('drop policy if exists %I_upd on public.%I', t, t);
    execute format('create policy %I_sel on public.%I for select to authenticated using (public.is_member() and owner = auth.uid())', t, t);
    execute format('create policy %I_ins on public.%I for insert to authenticated with check (public.is_member() and owner = auth.uid())', t, t);
    execute format('create policy %I_upd on public.%I for update to authenticated using (public.is_member() and owner = auth.uid()) with check (public.is_member() and owner = auth.uid())', t, t);
  end loop;
end $$;

grant usage on schema public to authenticated;
grant select on public.allowed_users to authenticated;
grant select, insert, update on public.items, public.outfits, public.wear_log, public.feedback, public.judgements to authenticated;
grant execute on function public.is_member() to authenticated;
revoke all on all tables in schema public from anon;

-- ============================================================
-- 5. Storage: 비공개 버킷 wardrobe. 경로 = <uid>/<item id>/{orig,thumb,label}.jpg
-- ============================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('wardrobe', 'wardrobe', false, 8388608, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

drop policy if exists wardrobe_sel on storage.objects;
drop policy if exists wardrobe_ins on storage.objects;
drop policy if exists wardrobe_upd on storage.objects;
create policy wardrobe_sel on storage.objects for select to authenticated
  using (bucket_id = 'wardrobe' and public.is_member() and (storage.foldername(name))[1] = auth.uid()::text);
create policy wardrobe_ins on storage.objects for insert to authenticated
  with check (bucket_id = 'wardrobe' and public.is_member() and (storage.foldername(name))[1] = auth.uid()::text);
create policy wardrobe_upd on storage.objects for update to authenticated
  using (bucket_id = 'wardrobe' and public.is_member() and (storage.foldername(name))[1] = auth.uid()::text);

-- ===== 002 =====
-- Stylist 002_import_fields.sql — 001_init.sql 다음에 SQL Editor에서 전체 붙여넣고 Run.
-- 2026-09-27 분류(import.json v claude-2026-09-27.3, 247점)에서 생긴 칸을 items에 추가.
-- 여러 번 실행해도 안전(if not exists).

alter table public.items
  add column if not exists import_id           text,          -- W01 … W247 (적재 중복 방지)
  add column if not exists name_en             text,
  add column if not exists subtype_en          text,
  add column if not exists color_name_en       text,
  add column if not exists material_en         text,
  add column if not exists material_guess_en   text,
  add column if not exists material_confidence text,          -- high | medium | low
  add column if not exists styling_note_ko     text,
  add column if not exists styling_note_en     text,
  add column if not exists brand               text,
  add column if not exists size_label          text,
  add column if not exists label_text          text,
  add column if not exists length_cm           numeric,       -- 어깨선~밑단(하의는 허리~밑단). 추정 또는 실측
  add column if not exists sleeve              text,          -- long | short | three_quarter | sleeveless | cap
  add column if not exists heel_cm             numeric,       -- 신발 굽·밑창(깔창 포함)
  add column if not exists acc_type            text,          -- earring | necklace | ring | bracelet | scarf | socks | hair | gloves | belt | hat
  add column if not exists metal               text,          -- gold | rose_gold | silver
  add column if not exists design_lines        text[] not null default '{}',
  add column if not exists tuck                text,
  add column if not exists skirt_type          text,
  add column if not exists collar_type         text,
  add column if not exists coat_type           text,
  add column if not exists extra_paths         text[] not null default '{}',   -- 추가 사진(신발 위·옆 등)
  add column if not exists fit_note            text,          -- "살짝 작음" 등
  add column if not exists condition_note      text,          -- "많이 낡음" 등
  add column if not exists same_as             text,          -- 같은 옷 다른 색의 import_id
  add column if not exists rain                boolean not null default false,  -- 우천용
  add column if not exists recommend           text not null default 'auto',
  add column if not exists uncertain           text[] not null default '{}',
  add column if not exists questions           text[] not null default '{}';

-- 추천 포함 방식: auto(평소) · never(매일 끼는 웨딩밴드) · special_only(결혼반지) · on_request(헤어핀)
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'items_recommend_chk') then
    alter table public.items add constraint items_recommend_chk
      check (recommend in ('auto','never','special_only','on_request'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'items_sleeve_chk') then
    alter table public.items add constraint items_sleeve_chk
      check (sleeve is null or sleeve in ('long','short','three_quarter','sleeveless','cap'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'items_acc_type_chk') then
    alter table public.items add constraint items_acc_type_chk
      check (acc_type is null or acc_type in ('earring','necklace','ring','bracelet','scarf','socks','hair','gloves','belt','hat'));
  end if;
end $$;

-- 가방·액세서리는 보온 값이 없음 → null 허용 (check는 null이면 통과)
alter table public.items alter column warmth drop not null;
alter table public.items alter column warmth drop default;

-- 같은 옷을 두 번 적재하지 않게
create unique index if not exists items_owner_import_idx
  on public.items(owner, import_id) where import_id is not null;
