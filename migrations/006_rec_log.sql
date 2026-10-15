-- Stylist 006_rec_log.sql — 추천 기록. 추천을 받을 때마다 한 줄(안전·변주·도전 세 안).
-- "입을게요"로 고른 것(wear_log)과 별개로, 추천이 한쪽으로 쏠리는지 보려는 용도.
-- Supabase SQL Editor에서 한 번 실행. 여러 번 실행해도 안전. DELETE 권한 없음.
create table if not exists public.rec_log (
  id         uuid primary key default gen_random_uuid(),
  owner      uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  day        date not null,                 -- 추천한 날(오늘/내일)
  tpo        text not null,                 -- work | out | special | travel
  occ        text,                          -- 특별한 날 종류
  trigger    text not null,                 -- start | redo | pin | color
  pin        uuid,
  colors     text[],
  weather    jsonb,                         -- { am, pm, lo, hi, rain }
  outfits    jsonb not null                 -- [{ kind, items: [uuid], score }, ...] 빈 안은 null
);
create index if not exists rec_log_day_idx on public.rec_log(day desc);

alter table public.rec_log enable row level security;
drop policy if exists rec_log_sel on public.rec_log;
drop policy if exists rec_log_ins on public.rec_log;
create policy rec_log_sel on public.rec_log for select to authenticated using (public.is_member() and owner = auth.uid());
create policy rec_log_ins on public.rec_log for insert to authenticated with check (public.is_member() and owner = auth.uid());
grant select, insert on public.rec_log to authenticated;
