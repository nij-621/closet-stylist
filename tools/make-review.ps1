# 검수표 생성: 사진 폴더의 import.json + 사진 → 같은 폴더에 review.html (썸네일 내장, 단일 파일)
# 실행: powershell -ExecutionPolicy Bypass -File make-review.ps1 -Folder "<사진 폴더>"
# 이 파일은 UTF-8 BOM으로 저장할 것 (PowerShell 5.1이 한국어를 읽으려면 BOM 필요)
param([Parameter(Mandatory = $true)][string]$Folder, [int]$Thumb = 420)
Add-Type -AssemblyName System.Drawing
$json = Get-Content -Raw -Encoding UTF8 (Join-Path $Folder "import.json") | ConvertFrom-Json
$enc = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
$ep = New-Object System.Drawing.Imaging.EncoderParameters 1
$ep.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter ([System.Drawing.Imaging.Encoder]::Quality, [long]72)

function Thumb([string]$file, [int]$max) {
  if (-not $file) { return "" }
  $p = Join-Path $Folder $file; if (-not (Test-Path $p)) { return "" }
  $img = [System.Drawing.Image]::FromFile($p)
  $prop = $img.PropertyItems | Where-Object { $_.Id -eq 0x0112 }
  $o = if ($prop) { $prop.Value[0] } else { 1 }
  if ($o -eq 6) { $img.RotateFlip([System.Drawing.RotateFlipType]::Rotate90FlipNone) } elseif ($o -eq 8) { $img.RotateFlip([System.Drawing.RotateFlipType]::Rotate270FlipNone) } elseif ($o -eq 3) { $img.RotateFlip([System.Drawing.RotateFlipType]::Rotate180FlipNone) }
  $s = [Math]::Min($max / $img.Width, $max / $img.Height); $w = [int]($img.Width * $s); $h = [int]($img.Height * $s)
  $bmp = New-Object System.Drawing.Bitmap $w, $h
  $g = [System.Drawing.Graphics]::FromImage($bmp); $g.InterpolationMode = 'HighQualityBicubic'; $g.DrawImage($img, 0, 0, $w, $h)
  $ms = New-Object System.IO.MemoryStream; $bmp.Save($ms, $enc, $ep)
  $b64 = [Convert]::ToBase64String($ms.ToArray()); $ms.Dispose(); $g.Dispose(); $bmp.Dispose(); $img.Dispose()
  return "data:image/jpeg;base64,$b64"
}
function Esc($s) { if ($null -eq $s) { return "" }; return [System.Net.WebUtility]::HtmlEncode([string]$s) }
function KE($v) { if ($null -eq $v) { return "—" }; if ($v -is [string]) { return (Esc $v) }; return (Esc $v.ko) + " <span class=en>" + (Esc $v.en) + "</span>" }
function Src($src, $k) { $s = $src.$k; if (-not $s) { $s = "claude" }; return "<i class='src $s' title='$s'></i>" }

$KO = @{ category = "카테고리"; subtype = "종류"; color_name = "색"; pattern = "무늬"; length = "기장"; silhouette = "실루엣"; neckline = "목선"; design_lines = "디자인"; material = "소재"; season = "계절"; brand = "브랜드" }
$CAT = @{ top = "상의"; bottom = "하의"; outer = "아우터"; shoes = "신발"; dress = "원피스"; bag = "가방"; acc = "액세서리" }

$rows = foreach ($it in $json.items) {
  $src = $it.attr_src
  $design = Esc (@($it.design_lines) -join ", ")
  if ($it.tuck) { $design += " · 턱 " + (Esc $it.tuck) }
  if ($it.skirt_type) { $design += " · " + (Esc $it.skirt_type) }
  if ($it.collar_type) { $design += " · 칼라 " + (Esc $it.collar_type) }
  $mat = if ($it.material) { KE $it.material } else { "<span class=unk>미확인</span> · 추정: " + (KE $it.material_guess) }
  $brand = Esc $it.brand; if ($it.size_label) { $brand += " · " + (Esc $it.size_label) }
  $fields = @(
    @("category", (Src $src "category") + (Esc $CAT[$it.category]) + " <span class=en>" + (Esc $it.category) + "</span>"),
    @("subtype", (Src $src "subtype") + (KE $it.subtype)),
    @("color_name", (Src $src "color_name") + "<span class=sw style='background:" + (Esc $it.color_hex) + "'></span>" + (KE $it.color_name) + " · " + (Esc $it.color_tone)),
    @("pattern", (Src $src "pattern") + (Esc $it.pattern)),
    @("length", (Src $src "length") + (Esc $it.length) + $(if ($it.length_cm) { " · 약 <b class=cm>" + (Esc $it.length_cm) + "</b>cm" } else { "" }) + $(if ($it.sleeve) { " · 소매 " + (Esc $it.sleeve) } else { "" }) + $(if ($null -ne $it.heel_cm) { "굽 약 <b class=cm>" + (Esc $it.heel_cm) + "</b>cm" } else { "" }) + $(if ($it.acc_type) { (Esc $it.acc_type) + $(if ($it.metal) { " · " + (Esc $it.metal) } else { "" }) } else { "" })),
    @("silhouette", (Src $src "silhouette") + (Esc $it.silhouette)),
    @("neckline", (Src $src "neckline") + (Esc $it.neckline)),
    @("design_lines", (Src $src "design_lines") + $design),
    @("material", (Src $src "material") + $mat),
    @("season", (Src $src "season") + (Esc (@($it.season) -join " · ")) + " · 보온 " + (Esc $it.warmth) + "/5"),
    @("brand", $brand)
  )
  $fh = ""
  # 배열 리터럴 안에서는 ','가 '+'보다 먼저 묶여 값이 $f[1..n]으로 흩어짐 → 첫 요소 뒤를 전부 이어 붙임
  foreach ($f in $fields) { $fh += "<div class=fr><span class=l>" + (Esc $KO[$f[0]]) + "</span><span class=v>" + (($f | Select-Object -Skip 1) -join "") + "</span></div>" }
  $q = ""
  if (@($it.questions).Count) { $q = "<div class=q><b>확인 필요</b><ul>"; foreach ($x in $it.questions) { $q += "<li>" + (Esc $x) + "</li>" }; $q += "</ul></div>" }
  $lbl = if ($it.label_photo) { "<div class=lbl><img src='" + (Thumb $it.label_photo 360) + "'><div><b>라벨 → 이 옷에 연결</b><span>" + (Esc $it.label_photo) + "</span><p>" + (Esc $it.label_text) + "</p></div></div>" } else { "<div class='lbl none'>라벨 없음 · 소재 미확인</div>" }
  foreach ($x in @($it.extra_photos)) { if ($x) { $lbl += "<div class=lbl><img src='" + (Thumb $x 360) + "'><div><b>추가 사진</b><span>" + (Esc $x) + "</span></div></div>" } }
  $fmParts = @(); if ($it.formality_work) { $fmParts += "회사" }; if ($it.formality_out) { $fmParts += "외출" }
  $fm = "<span class=chip>" + ($fmParts -join " · ") + " <i class='src default'></i>기본값</span> <span class=chip>" + (Esc $it.status) + "</span>"
  "<section class=item id='" + $it.id + "'><div class=ph><img src='" + (Thumb $it.photo $Thumb) + "'><span class=id>" + $it.id + "</span></div><div class=body><h2>" + (Esc $it.name.ko) + " <span class=en>" + (Esc $it.name.en) + "</span></h2><div class=meta>" + $fm + " · <span class=file>" + (Esc $it.photo) + "</span></div><div class=form>" + $fh + "</div>" + $lbl + "<div class=note><b>스타일링 메모</b><p>" + (Esc $it.styling_note.ko) + "</p><p class=en>" + (Esc $it.styling_note.en) + "</p></div>" + $q + "</div></section>"
}
$n = @($json.items).Count; $nl = @($json.items | Where-Object { $_.label_photo }).Count; $nq = @($json.items | Where-Object { @($_.questions).Count -gt 0 }).Count
$body = $rows -join "`n"
$html = @"
<!doctype html><html lang=ko><head><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1"><title>검수표 · ${n}벌</title>
<link href="https://fonts.googleapis.com/css2?family=Archivo+Narrow:wght@500;600&display=swap" rel=stylesheet>
<style>
:root{--paper:#fbfaf7;--ink:#171512;--ink2:#6b655c;--ink3:#857d72;--line:#e6e1d8;--well:#f4f1eb;--camel:#a9743f;--camel-soft:#f3eadc;--warn:#8f3b2b}
*{box-sizing:border-box;margin:0;padding:0}body{font:15px/1.5 -apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo",Pretendard,"Malgun Gothic",sans-serif;background:var(--paper);color:var(--ink);padding:24px 16px 60px;max-width:960px;margin:auto}
h1{font-size:22px;font-weight:600}.sum{color:var(--ink2);font-size:13.5px;margin:4px 0 18px}.sum b{font-family:"Archivo Narrow";font-size:17px;font-weight:600;color:var(--ink)}
.legend{display:flex;gap:14px;font-size:12px;color:var(--ink2);margin-bottom:18px;flex-wrap:wrap}.legend span{display:inline-flex;gap:5px;align-items:center}
.src{width:8px;height:8px;border-radius:50%;background:var(--ink3);display:inline-block;margin-right:6px;flex:none}.src.label{background:var(--ink)}.src.default{background:transparent;border:1.5px solid var(--ink3)}.src.unknown{background:var(--warn)}
.item{display:grid;grid-template-columns:300px 1fr;gap:20px;padding:20px 0;border-top:1px solid var(--line)}@media(max-width:700px){.item{grid-template-columns:1fr}}
.ph{position:relative;background:var(--well);border-radius:8px;overflow:hidden;align-self:start}.ph img{width:100%;display:block}.ph .id{position:absolute;top:8px;left:8px;font-family:"Archivo Narrow";font-weight:600;background:var(--paper);padding:2px 8px;border-radius:6px}
h2{font-size:18px;font-weight:600}.en{color:var(--ink3);font-weight:400;font-size:.92em}.meta{font-size:12.5px;color:var(--ink2);margin:4px 0 10px}.chip{border:1px solid var(--line);border-radius:999px;padding:2px 9px;font-size:12px}.file{font-family:"Archivo Narrow"}
.form{border-top:1px solid var(--line)}.fr{display:flex;gap:10px;padding:6px 0;border-bottom:1px solid var(--line);font-size:13.5px}.fr .l{width:80px;flex:none;color:var(--ink2);font-weight:500}.fr .v{flex:1;display:flex;align-items:center;flex-wrap:wrap;gap:4px}
.sw{width:14px;height:14px;border-radius:4px;border:1px solid var(--line);display:inline-block;margin-right:4px}.unk{color:var(--warn);font-weight:600}.cm{font-family:"Archivo Narrow";font-weight:600}
.lbl{display:flex;gap:12px;margin-top:12px;padding:10px;border:1px solid var(--line);border-radius:8px;font-size:12.5px;align-items:flex-start}.lbl img{width:110px;border-radius:6px;flex:none}.lbl b{display:block;font-weight:600}.lbl span{color:var(--ink3);font-family:"Archivo Narrow"}.lbl p{margin-top:4px;color:var(--ink2)}.lbl.none{color:var(--ink3);border-style:dashed}
.note{margin-top:12px;font-size:14px}.note b{display:block;font-size:12.5px;color:var(--camel);font-weight:600;margin-bottom:2px}.note p.en{margin-top:4px;font-size:13px}
.q{margin-top:12px;padding:10px 12px;border:1px solid var(--camel);border-radius:8px;font-size:13.5px;background:var(--camel-soft)}.q b{color:var(--camel);display:block;margin-bottom:4px}.q ul{padding-left:18px}
</style></head><body>
<h1>검수표 · $(Esc $json.folder)</h1>
<div class=sum><b>$n</b>벌 · 라벨 연결 <b>$nl</b> · 확인 필요 <b>$nq</b> · 분류 $(Esc $json.version) · 기본값: 회사·외출·입는 중</div>
<div class=legend><span><i class="src"></i>Claude 판독</span><span><i class="src label"></i>라벨</span><span><i class="src default"></i>기본값</span><span><i class="src unknown"></i>미확인</span></div>
$body
</body></html>
"@
[System.IO.File]::WriteAllText((Join-Path $Folder "review.html"), $html, (New-Object System.Text.UTF8Encoding $false))
"review.html: $n items, $nl labels, $nq with questions"
