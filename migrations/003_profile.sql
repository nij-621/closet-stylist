-- Stylist 003_profile.sql — 체형·컬러·핏 기준을 코드가 아니라 DB에 둔다(저장소가 공개이므로).
-- 표만 만든다. 내용은 저장소에 올리지 않는 별도 파일(private/)로 넣는다.
create table if not exists public.profile (
  owner        uuid primary key default auth.uid(),
  profile_text text not null,                 -- 추천·구매 판정 프롬프트 앞에 붙는 글 (치수·컬러·핏 기준·룰북)
  updated_at   timestamptz not null default now()
);
alter table public.profile enable row level security;
drop policy if exists profile_sel on public.profile;
drop policy if exists profile_ins on public.profile;
drop policy if exists profile_upd on public.profile;
create policy profile_sel on public.profile for select to authenticated using (public.is_member() and owner = auth.uid());
create policy profile_ins on public.profile for insert to authenticated with check (public.is_member() and owner = auth.uid());
create policy profile_upd on public.profile for update to authenticated using (public.is_member() and owner = auth.uid()) with check (public.is_member() and owner = auth.uid());
grant select, insert, update on public.profile to authenticated;
revoke all on public.profile from anon;
