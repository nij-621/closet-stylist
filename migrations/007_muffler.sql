-- Stylist 007_muffler.sql — 액세서리 종류에 목도리(muffler) 추가.
-- 목도리는 목걸이·스카프 칸과 따로 추천함(밖에서 코트 위에 하고 실내에서 품). 앱의 "목도리 고르기"가 스카프 중 일부를 muffler로 옮김.
-- Supabase SQL Editor에서 한 번 실행. 여러 번 실행해도 안전.
alter table public.items drop constraint if exists items_acc_type_chk;
alter table public.items add constraint items_acc_type_chk
  check (acc_type is null or acc_type in ('earring','necklace','ring','bracelet','scarf','muffler','socks','hair','gloves','belt','hat'));
