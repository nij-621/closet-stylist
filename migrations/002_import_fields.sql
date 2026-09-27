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
