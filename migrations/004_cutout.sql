-- Stylist 004_cutout.sql — 배경을 지운 옷 사진 경로.
-- 비어 있으면 앱은 원래 사진(thumb_path)을 보여 준다. 파일은 storage: wardrobe/<uid>/<id>/cut.webp
alter table public.items add column if not exists cut_path text;
