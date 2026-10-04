import { SUPABASE_URL, SUPABASE_KEY, HOME } from "./config.js";
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm";

let sb = createClient(SUPABASE_URL, SUPABASE_KEY);
const $ = (id) => document.getElementById(id);
const todayStr = () => new Date().toLocaleDateString("sv-SE");
const BUCKET = "wardrobe";
const EXTRACT_VERSION = "2026-09-27.1";
// 개발용: localhost에서 ?mock 을 붙이면 로그인 없이 mock.js(가짜 옷장, gitignore)로 화면만 확인
const QS = new URLSearchParams(location.search);
const MOCK = QS.has("mock") && ["localhost", "127.0.0.1"].includes(location.hostname);

// ─────────────────────────────────────────── 언어 (KO/EN)
// UI 문구는 사전, 옷 이름·메모는 DB에 두 언어로 저장된 값을 고름. 옷장·상세·탭바까지 적용(오늘·등록·구매는 v5 반영 때).
let lang = QS.get("lang") === "en" ? "en" : QS.get("lang") === "ko" ? "ko" : (localStorage.getItem("stylist.lang") || "ko");
const T = {
  tab_today: { ko: "오늘", en: "Today" }, tab_closet: { ko: "옷장", en: "Closet" }, tab_add: { ko: "등록", en: "Add" }, tab_buy: { ko: "구매", en: "Buy" },
  // 설정 · Gemini 오류
  set: {
    ko: { title: "설정", lang: "언어", key: "Gemini API 키", keyNote: "(이 기기에만 저장)", show: "보기", hide: "숨기기", model: "Gemini 모델", reload: "모델 목록 다시 불러오기", modelNote: "키를 넣으면 쓸 수 있는 모델이 목록으로 나와요.", needKeyFirst: "키를 먼저 넣어 주세요.", loading: "모델 목록을 불러오는 중…", loaded: (n) => `쓸 수 있는 모델 ${n}개예요. Flash는 빠르고 저렴하고, Pro는 느리지만 더 꼼꼼해요.`, gone: (m) => `${m}은(는) 이제 쓸 수 없어요.`, place: "날씨 위치 이름", lat: "위도", lon: "경도", geo: "현재 위치로", geoFail: "위치를 가져오지 못했어요", save: "저장", exp: "내 기록 내려받기", logout: "로그아웃" },
    en: { title: "Settings", lang: "Language", key: "Gemini API key", keyNote: "(stored on this device only)", show: "Show", hide: "Hide", model: "Gemini model", reload: "Reload model list", modelNote: "Enter your key to see the models you can use.", needKeyFirst: "Enter the key first.", loading: "Loading models…", loaded: (n) => `${n} models available. Flash is fast and cheap; Pro is slower but more careful.`, gone: (m) => `${m} is no longer available.`, place: "Weather location", lat: "Latitude", lon: "Longitude", geo: "Use current location", geoFail: "Couldn't get your location", save: "Save", exp: "Download my records", logout: "Log out" },
  },
  aiErr: {
    ko: { key: "Gemini 키가 맞지 않아요. 설정에서 키를 확인해 주세요.", model: "고른 Gemini 모델을 쓸 수 없어요. 설정에서 다른 모델을 골라 주세요.", busy: "요청이 많아 잠시 막혔어요. 1분 뒤에 다시 시도해 주세요.", down: "Gemini 쪽에 문제가 있어요. 잠시 뒤 다시 시도해 주세요." },
    en: { key: "The Gemini key was rejected. Check it in Settings.", model: "That Gemini model isn't available. Pick another in Settings.", busy: "Too many requests right now. Try again in a minute.", down: "Gemini is having trouble. Try again shortly." },
  },
  // 오늘
  tpo: { ko: { work: "출근", out: "외출", special: "특별한 날" }, en: { work: "Work", out: "Out", special: "Occasion" } },
  occ: { ko: { dinner: "근사한 저녁", interview: "면접", concert: "공연", party: "회사 파티" }, en: { dinner: "Nice dinner", interview: "Interview", concert: "Concert", party: "Office party" } },
  am: { ko: "출근 07–09시", en: "Commute 07–09" }, pm: { ko: "퇴근 17–19시", en: "Return 17–19" }, rain: { ko: "비", en: "Rain" }, noWx: { ko: "예보 없음", en: "No forecast" }, morning: { ko: "아침", en: "morning" },
  kind: { ko: { safe: "안전", vary: "변주", dare: "도전", manual: "직접" }, en: { safe: "Safe", vary: "Variation", dare: "New", manual: "Custom" } },
  slot: { ko: { outer: "아우터", top: "상의", bottom: "하의", shoes: "신발", bag: "가방", acc_earring: "귀걸이", acc_neck: "목걸이·스카프", acc_wrist: "팔찌·반지", acc_socks: "양말", acc_gloves: "장갑" }, en: { outer: "Outer", top: "Top", bottom: "Bottom", shoes: "Shoes", bag: "Bag", acc_earring: "Earrings", acc_neck: "Necklace · scarf", acc_wrist: "Bracelet · ring", acc_socks: "Socks", acc_gloves: "Gloves" } },
  noOuter: { ko: "아우터 없음", en: "No outer" }, add: { ko: "추가", en: "Add" }, none: { ko: "없음", en: "None" }, takeOff: { ko: "빼기", en: "Take off" },
  addTitle: { ko: "옷 등록", en: "Add clothes" },
  addT: {
    ko: { pick: ["사진 여러 장 고르기", "한 사진에 한 벌. 옷걸이에 걸거나 눕혀도 돼요. 라벨 사진은 그 옷 바로 뒤에 찍으면 자동으로 붙어요"], picked: (n) => `${n}장 선택 · 다시 고르기`,
      where: "어디에 입나요?", perItem: "(옷마다 나중에 바꿀 수 있어요)", now: "지금 상태", cut: "옷 사진 배경 지우기", needOne: "회사·외출 중 하나는 필요해요",
      go: "올리고 분석", going: "하는 중…", keep: "사진을 먼저 저장해요. 중간에 닫아도 이어서 할 수 있어요.", saving: (i, n) => `사진 저장 ${i} / ${n}`, reading: (i, n) => `분석 ${i} / ${n}`, cutting: (i, n) => `배경 지우는 중 ${i} / ${n}`,
      waiting: "분석 대기", unnamed: "이름 없는 옷", noPhoto: "사진을 받지 못했어요", cutFail: "이 기기에서는 배경을 지우지 못했어요. 옷은 원래 사진으로 등록됐어요.",
      pending: (n) => `분석을 기다리는 사진 ${n}장`, resume: "이어서 분석", sum: (g, l) => `옷 ${g}벌 등록${l ? ` · 라벨 ${l}장 연결` : ""}`, failed: (n) => `분석 못 한 사진 ${n}장 — 위의 "이어서 분석"을 눌러 주세요`,
      labelPrev: "라벨 연결됨", labelNext: "뒤 사진 라벨과 연결", check: "확인", labelAsk: "라벨이 이 옷의 것이 맞나요?", review: "하나씩 확인하기", foot: "소재는 라벨에서 읽고, 라벨이 없으면 \"미확인\"으로 남겨요." },
    en: { pick: ["Pick several photos", "One item per photo, hanging or flat. Shoot the label right after its garment and it pairs automatically"], picked: (n) => `${n} selected · pick again`,
      where: "Where do you wear them?", perItem: "(change per item later)", now: "Current status", cut: "Remove the background from clothes", needOne: "Pick at least one of Work / Out",
      go: "Upload & analyze", going: "Working…", keep: "Photos are saved first. You can leave and resume later.", saving: (i, n) => `Saving photo ${i} / ${n}`, reading: (i, n) => `Analyzing ${i} / ${n}`, cutting: (i, n) => `Removing background ${i} / ${n}`,
      waiting: "Waiting for analysis", unnamed: "Unnamed item", noPhoto: "Couldn't fetch the photo", cutFail: "This device couldn't remove the background. Items were added with the original photo.",
      pending: (n) => `${n} photos waiting for analysis`, resume: "Resume", sum: (g, l) => `${g} items added${l ? ` · ${l} labels paired` : ""}`, failed: (n) => `${n} photos not analyzed — tap "Resume" above`,
      labelPrev: "Label paired", labelNext: "Paired with the next label", check: "Check", labelAsk: "Does this label belong to this item?", review: "Review one by one", foot: "Material is read from the label; without one it stays \"unknown\"." },
  },
  buyTitle: { ko: "내게 맞는 한 벌일까", en: "Will this suit me?" },
  buy: {
    ko: { photo: ["상품 사진", "여러 장 가능"], page: ["상세 페이지 캡처", "치수표·혼용률을 읽어 칸에 채워요"], count: (n) => `${n}장 선택 · 다시 고르기`, reading: "치수표를 읽는 중…", noChart: "캡처에서 치수표를 찾지 못했어요. 치수를 직접 넣어 주세요.",
      size: "사이즈", measTitle: "치수 · cm", known: "(아는 것만)", autoRead: "치수표에서 읽음 · 고칠 수 있어요",
      meas: { shoulder: "어깨", chest: "가슴 단면", length: "총장", sleeve: "소매", waist: "허리 단면", hip: "힙 단면", thigh: "허벅지 단면", rise: "밑위", size: "사이즈", heel: "굽", width: "가로", height: "세로" },
      paste: "소재·설명 붙여넣기 (예: 울 80% · 원턱 · 스탠드 칼라)", color: "얼굴에 받는 색인지도 보기", judge: "판정", judging: "판정하는 중…", need: "사진, 치수, 설명 중 하나는 필요해요",
      grades: ["강력 추천", "추천", "조건부", "약함", "비추천"], conf: { high: "신뢰도 높음", medium: "신뢰도 보통", low: "신뢰도 낮음" },
      basis: { chart: (n) => `치수표 ${n}항목`, user: (n) => `직접 넣은 치수 ${n}항목`, photo: "사진" }, src: { chart: "치수표", photo: "사진", text: "설명" },
      closet: "옷장 판정", partners: "짝이 되는 옷", noPartner: "없음", similar: "비슷한 옷", none: "없음", savedFit: (n) => `저장 코디 ${n}개 중 끼울 수 있는 곳`, reset: "새로 판정하기",
      empty: ["사진 또는 치수로 시작", "나에게 맞는 이유 네 가지와, 내 옷장과 얼마나 맞물리는지 보여 줘요."], foot: "90+ 강력 추천 · 80+ 추천 · 70+ 조건부 · 60+ 약함 · 60 미만 비추천" },
    en: { photo: ["Product photos", "Several are fine"], page: ["Detail page capture", "Reads the size chart into the fields"], count: (n) => `${n} selected · pick again`, reading: "Reading the size chart…", noChart: "No size chart found in the capture. Please type the measurements.",
      size: "Size", measTitle: "Measurements · cm", known: "(only what you know)", autoRead: "Read from the size chart · editable",
      meas: { shoulder: "Shoulder", chest: "Chest ½", length: "Length", sleeve: "Sleeve", waist: "Waist ½", hip: "Hip ½", thigh: "Thigh ½", rise: "Rise", size: "Size", heel: "Heel", width: "Width", height: "Height" },
      paste: "Paste material or description (e.g. wool 80% · one tuck · stand collar)", color: "Also check the color near my face", judge: "Evaluate", judging: "Evaluating…", need: "Add a photo, a measurement or a description",
      grades: ["Strong buy", "Buy", "Conditional", "Weak", "Skip"], conf: { high: "High confidence", medium: "Medium confidence", low: "Low confidence" },
      basis: { chart: (n) => `${n} chart values`, user: (n) => `${n} typed values`, photo: "photo" }, src: { chart: "Chart", photo: "Photo", text: "Text" },
      closet: "Closet check", partners: "Pairs with", noPartner: "None", similar: "Similar items", none: "None", savedFit: (n) => `Fits into your ${n} saved outfits`, reset: "Start a new check",
      empty: ["Start with a photo or measurements", "Four reasons it suits you, plus how it meshes with your closet."], foot: "90+ Strong buy · 80+ Buy · 70+ Conditional · 60+ Weak · under 60 Skip" },
  },
  legsTitle: { ko: "다리", en: "Legs" }, legsSwap: { ko: "스타킹이나 다른 양말로 바꾸기", en: "Swap for stockings or other socks" }, legsSwapT: { ko: "덧신이나 다른 양말로 바꾸기", en: "Swap for no-show or other socks" },
  legs: {
    ko: { bare: ["맨살", "", "맨살", "bare legs"], footie: ["덧신", "", "덧신 (안 보이는 양말)", "no-show socks, ankle bare"], nude: ["스타킹", "살색 · 비침", "살색 비치는 스타킹", "sheer nude stockings"], black_sheer: ["스타킹", "검정 · 비침", "검정 비치는 스타킹", "sheer black stockings"], black_opaque: ["스타킹", "검정 · 안 비침", "검정 안 비치는 스타킹", "opaque black tights"], black_fleece: ["스타킹", "검정 · 기모", "검정 기모 스타킹", "fleece-lined black tights"] },
    en: { bare: ["Bare legs", "", "Bare legs", "bare legs"], footie: ["No-show socks", "", "No-show socks", "no-show socks, ankle bare"], nude: ["Stockings", "nude · sheer", "Sheer nude stockings", "sheer nude stockings"], black_sheer: ["Stockings", "black · sheer", "Sheer black stockings", "sheer black stockings"], black_opaque: ["Tights", "black · opaque", "Opaque black tights", "opaque black tights"], black_fleece: ["Tights", "black · fleece", "Fleece-lined black tights", "fleece-lined black tights"] },
  },
  change: { ko: "다른 옷으로 바꾸기", en: "Swap for another" }, pinMark: { ko: "고정", en: "pinned" },
  days: { ko: ["오늘", "내일"], en: ["Today", "Tomorrow"] }, edited: { ko: "직접 바꿈", en: "edited" },
  tip: { ko: "요령", en: "Tip" }, ratio: { ko: "비율 추정", en: "est. proportion" },
  wear: { ko: "이렇게 입을게요", en: "I'll wear this" }, worn: { ko: "입기로 했어요", en: "Logged" }, ban: { ko: "이 조합은 그만 보기", en: "Don't suggest again" }, redo: { ko: "전부 다시 골라 줘", en: "Pick again" },
  alts: { ko: "다른 안", en: "Alternatives" }, diff: { ko: (s) => `${s} 다름`, en: (s) => `${s} differs` }, diffN: { ko: (n) => `${n}곳 다름`, en: (n) => `${n} changes` }, diffAcc: { ko: "소품 다름", en: "accessories differ" },
  dareEmpty: { ko: ["오늘은 비워둘게요", "안 해 본 조합 중에 맞는 게 없어요"], en: ["Left empty today", "No new pairing works today"] },
  pinHint: { ko: "옆으로 밀면 교체 · 길게 누르면 고정·제외", en: "Swipe to swap · long-press to pin / pause" },
  pinned: { ko: "이 옷 고정", en: "Pinned" }, unpin: { ko: "해제", en: "Unpin" }, pinBtn: { ko: "이 옷 고정", en: "Pin this item" }, unpinBtn: { ko: "고정 해제", en: "Unpin" }, pause: { ko: "당분간 제외", en: "Pause" },
  pinning: { ko: (n) => `${n} 기준으로 다시 짜는 중`, en: (n) => `Rebuilding around ${n}` }, pinnedToast: { ko: (n) => `${n} 고정했어요`, en: (n) => `Pinned ${n}` }, unpinned: { ko: "고정을 풀었어요", en: "Unpinned" },
  swapPin: { ko: "고정한 옷이에요. 고정을 먼저 풀어 주세요.", en: "This one is pinned. Unpin it first." }, noSwap: { ko: "바꿀 옷이 없어요", en: "Nothing to swap in" },
  rescoring: { ko: "다시 살펴보는 중…", en: "Re-scoring…" }, rescoreFail: { ko: "다시 살펴보지 못했어요. 조합은 그대로 입을 수 있어요.", en: "Couldn't re-score." },
  redoing: { ko: "다른 조합을 짜는 중", en: "Finding other options" }, redone: { ko: "새 조합이에요", en: "New options" },
  noNew: { ko: "요 며칠 입은 것과 다른 조합을 찾지 못했어요. 잠시 뒤 다시 시도해 주세요.", en: "Couldn't find an outfit different from the last few days. Try again shortly." },
  rv: {
    ko: { title: "입어 보니 어땠어요?", ask: (d) => `${d} 코디, 어땠어요?`, write: "후기 쓰기", edit: "고치기", good: "좋았어요", ok: "그저 그랬어요", bad: "별로였어요", memo: "한 줄 메모", memoOpt: "안 써도 돼요", memoPh: "예: 오후에 더웠어요. 신발이 불편했어요.", pick: "어땠는지 하나 골라 주세요", save: "후기 저장", saved: "후기를 저장했어요", savedBad: "후기를 저장했어요. 이 조합은 다시 추천하지 않아요", log: "입은 기록", none: "아직 입은 기록이 없어요. '이렇게 입을게요'를 누르면 여기에 쌓여요.", noReview: "후기 없음", loadFail: "입은 기록을 불러오지 못했어요" },
    en: { title: "How did it go?", ask: (d) => `How was the ${d} outfit?`, write: "Add a note", edit: "Edit", good: "Liked it", ok: "So-so", bad: "Didn't like it", memo: "Short note", memoOpt: "optional", memoPh: "e.g. Too warm in the afternoon. Shoes hurt.", pick: "Pick one first", save: "Save", saved: "Saved", savedBad: "Saved. This outfit won't be suggested again", log: "Worn log", none: "Nothing logged yet. Outfits you choose to wear show up here.", noReview: "No note", loadFail: "Couldn't load the log" },
  },
  wearToast: { ko: "입기로 기록했어요", en: "Logged as worn" }, unwearToast: { ko: "입기로 한 것을 취소했어요", en: "Unmarked" }, banToast: { ko: "이 조합은 다시 추천하지 않아요", en: "Won't suggest this again" },
  making: { ko: ["오늘 코디 준비 중", (n) => `옷 ${n}개로 조합을 짜고 있어요.`], en: ["Getting today ready", (n) => `Building from ${n} items.`] },
  cant: { ko: "아직 추천할 수 없어요", en: "Can't suggest yet" }, retry: { ko: "다시 시도", en: "Try again" }, allGone: { ko: "오늘 추천을 모두 뺐어요", en: "All picks dismissed" },
  lack: { ko: (s) => `${s}이(가) 부족해요. 옷장에서 '입는 곳' 표시를 확인해 주세요.`, en: (s) => `Missing: ${s}. Check where each item is worn.` },
  noProfile: { ko: "내 체형 기준을 불러오지 못했어요. 잠시 뒤 다시 시도해 주세요.", en: "Couldn't load your fit profile. Try again shortly." },
  noCombo: { ko: "맞는 조합을 만들지 못했어요. 다시 시도해 주세요.", en: "Couldn't build an outfit. Try again." },
  needKey: { ko: ["추천을 받으려면 키가 필요해요", "설정에 Gemini 키를 넣으면 오늘 코디를 짜 드려요.", "설정 열기"], en: ["A key is needed for suggestions", "Add your Gemini key in Settings.", "Open settings"] },
  emptyCloset: { ko: ["옷장이 비어 있어요", "등록 탭에서 옷을 올리면 여기서 오늘 코디를 제안해요."], en: ["Your closet is empty", "Add clothes in the Add tab."] },
  gap: { ko: ["옷장에 답이 부족해요", "격식 있는 구두가 빠졌어요. 구매 탭에서 후보를 살펴보세요.", "구매 탭으로"], en: ["Your closet falls short", "No dress shoes in this look. Check a candidate in Buy.", "Go to Buy"] },
  closet: { ko: "옷장", en: "Closet" }, searchPh: { ko: "이름·색·브랜드", en: "Name, color, brand" },
  cats: { ko: { all: "전체", top: "상의", bottom: "하의", outer: "아우터", dress: "원피스", shoes: "신발", bag: "가방", acc: "액세서리" }, en: { all: "All", top: "Tops", bottom: "Bottoms", outer: "Outer", dress: "Dresses", shoes: "Shoes", bag: "Bags", acc: "Accessories" } },
  accTypes: { ko: { earring: "귀걸이", necklace: "목걸이", bracelet: "팔찌", ring: "반지", scarf: "스카프", socks: "양말", hair: "헤어핀", gloves: "장갑", belt: "벨트", hat: "모자" }, en: { earring: "Earrings", necklace: "Necklaces", bracelet: "Bracelets", ring: "Rings", scarf: "Scarves", socks: "Socks", hair: "Hair clips", gloves: "Gloves", belt: "Belts", hat: "Hats" } },
  filters: { ko: { active: "입는 중", work: "회사", out: "외출", parked: "제외·보관" }, en: { active: "Active", work: "Work", out: "Out", parked: "Paused · Stored" } },
  queue: { ko: (n) => `확인할 것이 있는 옷 ${n}`, en: (n) => `${n} to check` },
  structIn: { ko: "구조", en: "Overview" }, wlCount: { ko: (n) => `${n}번`, en: (n) => `${n} days` }, wlIn: { ko: "입은 기록", en: "Worn log" },
  struct: {
    ko: { title: "옷장 구조", all: "전체", work: "회사", out: "외출", bySeason: "계절마다 몇 벌", bySeasonD: "계절이 겹치는 옷은 양쪽에 셈", total: "전체", colors: "색", clothesN: (n) => `옷 <span class="n">${n}</span>벌`,
      even: "계절마다 고르게 있어요", who: { all: "", work: "출근 ", out: "외출 " }, frac: ["3분의 1", "절반", "3분의 2"],
      head: (thin, who, fat, frac) => `${thin} ${who}옷이 가장 적어요 — ${fat}의 ${frac}쯤`, shown: "만 보는 중" },
    en: { title: "Closet overview", all: "All", work: "Work", out: "Out", bySeason: "By season", bySeasonD: "Counted in every season it fits", total: "All", colors: "Colors", clothesN: (n) => `<span class="n">${n}</span> garments`,
      even: "Every season is well covered", who: { all: "", work: "work ", out: "going-out " }, frac: ["a third", "half", "two-thirds"],
      head: (thin, who, fat, frac) => `${thin} ${who}clothes are thinnest — about ${frac} of ${fat}`, shown: "" },
  },
  color: {
    ko: { btn: "색 정해서 골라 줘", title: "어떤 색으로 입을까요", sub: "두 개까지 고를 수 있어요", pick: "색을 골라 주세요", go: (w) => `${w} 골라 줘`, tag: (w) => `${w} 고른 코디`, off: "색 지정 풀기",
      making: (w) => `${w} 고르는 중`, none: (n) => `오늘 입을 수 있는 ${n} 옷이 없어요.`, fail: "고른 색으로 맞는 조합을 만들지 못했어요. 다른 색으로 해 보세요." },
    en: { btn: "Pick by color", title: "Which color today?", sub: "Choose up to two", pick: "Choose a color", go: (w) => `Go with ${w}`, tag: (w) => `Built around ${w}`, off: "Clear color",
      making: (w) => `Building around ${w}`, none: (n) => `Nothing in ${n} fits today.`, fail: "Couldn't build an outfit in that color. Try another." },
  },
  fams: {
    ko: { white: "화이트·아이보리", beige: "베이지·카멜", brown: "브라운", gray: "그레이", black: "블랙", navy: "네이비", blue: "블루", green: "그린·카키", yellow: "옐로", pink: "핑크·코랄", red: "레드·버건디", purple: "보라" },
    en: { white: "White · ivory", beige: "Beige · camel", brown: "Brown", gray: "Gray", black: "Black", navy: "Navy", blue: "Blue", green: "Green · khaki", yellow: "Yellow", pink: "Pink · coral", red: "Red · burgundy", purple: "Purple" },
  },
  work: { ko: "회사", en: "Work" }, out: { ko: "외출", en: "Out" },
  st: { ko: { active: "입는 중", paused: "당분간 제외", stored: "보관" }, en: { active: "Active", paused: "Paused", stored: "Stored" } },
  stLong: { ko: { active: "입는 중", paused: "당분간 제외 · 세탁·수선", stored: "보관 · 계절" }, en: { active: "Active", paused: "Paused · laundry / repair", stored: "Stored · off-season" } },
  stateBtn: { ko: "상태 바꾸기", en: "Change status" },
  statusToast: { ko: (n, s) => `${n} · ${s}`, en: (n, s) => `${n} · ${s}` },
  emptyT: { ko: "해당하는 옷이 없어요", en: "Nothing here" }, emptyD: { ko: "위의 조건을 바꿔 보세요.", en: "Try a different filter." },
  undo: { ko: "실행 취소", en: "Undo" }, saved: { ko: "저장했어요", en: "Saved" }, removed: { ko: "옷장에서 뺐어요", en: "Removed from closet" }, saveFail: { ko: "저장하지 못했어요: ", en: "Couldn't save: " },
  back: { ko: "뒤로", en: "Back" }, review: { ko: "확인", en: "Check" }, later: { ko: "다음에", en: "Later" }, remove: { ko: "옷장에서 빼기", en: "Remove" }, save: { ko: "저장", en: "Save" }, saveNext: { ko: "저장하고 다음", en: "Save & next" },
  howTo: { ko: "이렇게 입어요", en: "How to wear it" }, asks: { ko: "확인이 필요해요", en: "Needs checking" },
  estimate: { ko: "추정", en: "estimate" }, guess: { ko: "추정:", en: "Looks like:" }, unknown: { ko: "미확인", en: "Unknown" },
  shot: { ko: { main: "옷", extra: "추가", label: "라벨" }, en: { main: "Item", extra: "More", label: "Label" } },
  legend: { ko: { user: "직접 확인", est: "추정", label: "라벨", def: "기본값", unknown: "미확인" }, en: { user: "Confirmed", est: "Estimate", label: "Label", def: "Default", unknown: "Unknown" } },
  fields: {
    ko: { layer_role: "입는 방식", name: "이름", brand: "브랜드", category: "카테고리", subtype: "종류", color_name: "색", pattern: "무늬", length: "기장", length_cm: "총장", sleeve: "소매", neckline: "목선", silhouette: "실루엣", acc_type: "종류 구분", metal: "금속 색", heel_cm: "굽 높이", material: "소재", season: "계절", warmth: "두께", rain: "비 오는 날", rainOn: "입어도 돼요", recommend: "추천", size_label: "사이즈", fit_note: "핏 메모", condition_note: "상태 메모", formality: "입는 곳", status: "상태" },
    en: { layer_role: "Worn as", name: "Name", brand: "Brand", category: "Category", subtype: "Type", color_name: "Color", pattern: "Pattern", length: "Length", length_cm: "Total length", sleeve: "Sleeve", neckline: "Neckline", silhouette: "Silhouette", acc_type: "Kind", metal: "Metal", heel_cm: "Heel", material: "Material", season: "Season", warmth: "Weight", rain: "Rainy days", rainOn: "OK in rain", recommend: "Suggest", size_label: "Size", fit_note: "Fit note", condition_note: "Condition", formality: "Worn at", status: "Status" },
  },
  opts: {
    ko: {
      category: { top: "상의", bottom: "하의", outer: "아우터", dress: "원피스", shoes: "신발", bag: "가방", acc: "액세서리" },
      pattern: { solid: "무지", stripe: "스트라이프", check: "체크", print: "프린트", other: "기타" },
      length: { crop: "짧음", regular: "보통", long: "긺" },
      sleeve: { long: "긴소매", three_quarter: "7부", short: "반소매", cap: "캡 소매", sleeveless: "민소매" },
      silhouette: { slim: "슬림", straight: "일자", oversized: "넉넉함", aline: "A라인", hline: "H라인", wide: "와이드", flare: "플레어" },
      neckline: { crew: "라운드", v: "브이", collar: "칼라", turtle: "터틀", boat: "보트", square: "스퀘어", none: "해당 없음" },
      acc_type: { earring: "귀걸이", necklace: "목걸이", bracelet: "팔찌", ring: "반지", scarf: "스카프", socks: "양말", hair: "헤어핀", gloves: "장갑", belt: "벨트", hat: "모자" },
      layer_role: { base: "상의로만", mid: "상의로도, 걸쳐서도", outer: "걸쳐서만" },
      metal: { gold: "골드", rose_gold: "로즈골드", silver: "실버" },
      warmth: { 1: "1 · 한여름", 2: "2 · 얇음", 3: "3 · 보통", 4: "4 · 두꺼움", 5: "5 · 한겨울" },
      recommend: { auto: "평소처럼", on_request: "요청할 때만", special_only: "특별한 날만", never: "추천 안 함" },
      season: { spring: "봄", summer: "여름", autumn: "가을", winter: "겨울" },
    },
    en: {
      category: { top: "Top", bottom: "Bottom", outer: "Outer", dress: "Dress", shoes: "Shoes", bag: "Bag", acc: "Accessory" },
      pattern: { solid: "Plain", stripe: "Stripe", check: "Check", print: "Print", other: "Other" },
      length: { crop: "Short", regular: "Regular", long: "Long" },
      sleeve: { long: "Long", three_quarter: "3/4", short: "Short", cap: "Cap", sleeveless: "Sleeveless" },
      silhouette: { slim: "Slim", straight: "Straight", oversized: "Roomy", aline: "A-line", hline: "H-line", wide: "Wide", flare: "Flare" },
      neckline: { crew: "Crew", v: "V-neck", collar: "Collar", turtle: "Turtle", boat: "Boat", square: "Square", none: "N/A" },
      acc_type: { earring: "Earrings", necklace: "Necklace", bracelet: "Bracelet", ring: "Ring", scarf: "Scarf", socks: "Socks", hair: "Hair clip", gloves: "Gloves", belt: "Belt", hat: "Hat" },
      layer_role: { base: "As a top only", mid: "Top or layer", outer: "As a layer only" },
      metal: { gold: "Gold", rose_gold: "Rose gold", silver: "Silver" },
      warmth: { 1: "1 · midsummer", 2: "2 · light", 3: "3 · medium", 4: "4 · thick", 5: "5 · midwinter" },
      recommend: { auto: "As usual", on_request: "Only when asked", special_only: "Special days only", never: "Never" },
      season: { spring: "Spring", summer: "Summer", autumn: "Autumn", winter: "Winter" },
    },
  },
};
const t = (k) => { const v = T[k]; return v ? (v[lang] ?? v.ko) : k; };
function applyLang() {
  document.documentElement.lang = lang;
  document.querySelectorAll("[data-t]").forEach((el) => (el.textContent = t(el.dataset.t)));
  document.querySelectorAll(".lang button").forEach((b) => b.classList.toggle("on", b.dataset.l === lang));
}
function setLang(l) {
  lang = l === "en" ? "en" : "ko"; localStorage.setItem("stylist.lang", lang); applyLang();
  if (!$("tab-closet").hidden) renderCloset();
  if (!$("tab-today").hidden) renderToday();
  if (!$("tab-judge").hidden) renderBuy();
  if (!$("tab-add").hidden) renderAdd();
}

// ─────────────────────────────────────────── 고정 프로필 (본인 전용)
// 체형·컬러·핏 기준은 코드에 두지 않는다(공개 저장소). 로그인 후 DB의 profile 표에서 읽는다 — migrations/003_profile.sql
let PROFILE = "";
async function loadProfile() {
  if (MOCK) { PROFILE = "CLIENT PROFILE: (mock)"; return; }
  const { data, error } = await sb.from("profile").select("profile_text").maybeSingle();
  PROFILE = (!error && data?.profile_text) || "";
}

const CAT_KO = { top: "상의", bottom: "하의", outer: "아우터", shoes: "신발", dress: "원피스", bag: "가방", acc: "액세서리" };
const ATTR_FIELDS = [
  ["category", "카테고리", ["top", "bottom", "outer", "shoes", "dress", "bag", "acc"], (v) => CAT_KO[v] || v],
  ["subtype", "종류", null],
  ["color_name", "색", null],
  ["pattern", "무늬", ["solid", "stripe", "check", "print", "other"], (v) => ({ solid: "무지", stripe: "스트라이프", check: "체크", print: "프린트", other: "기타" })[v] || v],
  ["length", "기장", ["crop", "regular", "long"], (v) => ({ crop: "크롭", regular: "일반", long: "롱" })[v] || v],
  ["silhouette", "실루엣", ["slim", "straight", "oversized", "aline", "hline", "wide", "flare"], (v) => ({ slim: "슬림", straight: "스트레이트", oversized: "오버", aline: "A라인", hline: "H라인", wide: "와이드", flare: "플레어" })[v] || v],
  ["neckline", "목선", ["crew", "v", "collar", "turtle", "boat", "square", "none"], (v) => ({ crew: "라운드", v: "브이", collar: "카라", turtle: "터틀", boat: "보트", square: "스퀘어", none: "해당 없음" })[v] || v],
  ["material", "소재", null],
  ["warmth", "보온", ["1", "2", "3", "4", "5"], (v) => `${v}/5`],
];

// ─────────────────────────────────────────── 상태
let me = null;
let items = [];            // 옷 (photo url 포함)
let urlCache = new Map();  // storage path → signed url
let tpo = "work";
let weather = null;        // { tmin, tmax, tnow, rain, code, day }
let rec = null;            // 오늘 추천 { outfits:[{kind,items:[id],score,gauge_top,reason}], main:0 }
let addQueue = [];         // 등록 대기 File[]
let addLabel = null;

const settings = {
  get() { try { return JSON.parse(localStorage.getItem("stylist.settings")) || {}; } catch { return {}; } },
  set(patch) { localStorage.setItem("stylist.settings", JSON.stringify({ ...this.get(), ...patch })); },
  get key() { return localStorage.getItem("stylist.gemini") || ""; },
  set key(v) { v ? localStorage.setItem("stylist.gemini", v) : localStorage.removeItem("stylist.gemini"); },
  get model() { return this.get().model || DEFAULT_MODEL; },
  get home() { return this.get().home || HOME; },
};

// ─────────────────────────────────────────── 공통 UI
// toast(문구) · toast(문구, 4000) · toast(문구, 실행취소함수)
function toast(msg, opt = 2400) {
  const el = $("toast"); const undo = typeof opt === "function" ? opt : null;
  el.textContent = msg; el.hidden = false;
  if (undo) {
    const b = document.createElement("button"); b.type = "button"; b.textContent = t("undo");
    b.onclick = () => { el.hidden = true; clearTimeout(el._h); undo(); };
    el.appendChild(b);
  }
  clearTimeout(el._h); el._h = setTimeout(() => (el.hidden = true), undo ? 5000 : opt);
}
// cls "page" = 화면 전체를 쓰는 상세 화면(닫기 버튼은 화면 안의 뒤로 버튼)
function openModal(html, cls = "") {
  const m = $("modal"); m.className = cls; m.scrollTop = 0;
  m.innerHTML = (cls === "page" ? "" : `<button class="modal-x" type="button" aria-label="닫기"><svg class="i"><use href="#i-x"/></svg></button>`) + html;
  const x = m.querySelector(".modal-x"); if (x) x.onclick = closeModal;
  $("modal-back").onclick = cls === "page" ? null : closeModal;
  $("modal-wrap").hidden = false;
}
function closeModal() { $("modal-wrap").hidden = true; $("modal").innerHTML = ""; }
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function showTab(name) {
  document.querySelectorAll(".tab").forEach((t) => (t.hidden = t.id !== `tab-${name}`));
  document.querySelectorAll("#tabbar button").forEach((b) => b.classList.toggle("on", b.dataset.tab === name));
  window.scrollTo(0, 0);
  if (name === "today") renderToday();
  if (name === "closet") renderCloset();
  if (name === "judge") renderBuy();
  if (name === "add") renderAdd();
}
document.querySelectorAll("#tabbar button").forEach((b) => (b.onclick = () => showTab(b.dataset.tab)));

// ─────────────────────────────────────────── 인증
$("login-form").onsubmit = async (e) => {
  e.preventDefault();
  $("login-err").hidden = true; $("login-btn").disabled = true;
  const { error } = await sb.auth.signInWithPassword({ email: $("login-email").value.trim(), password: $("login-pw").value });
  $("login-btn").disabled = false;
  if (error) { $("login-err").textContent = "로그인 실패: " + error.message; $("login-err").hidden = false; return; }
  boot();
};
async function boot() {
  applyLang();
  if (MOCK) {
    const mock = await import("./mock.js");
    sb = mock.sb; me = { email: "mock@localhost", id: "mock" };
    $("screen-auth").hidden = true; $("app").hidden = false;
    await loadItems();
    return showTab(QS.get("tab") || "closet");
  }
  const { data: { session } } = await sb.auth.getSession();
  if (!session) { $("screen-auth").hidden = false; $("app").hidden = true; return; }
  const { data: member } = await sb.from("allowed_users").select("*").maybeSingle();
  if (!member) { await sb.auth.signOut(); $("login-err").textContent = "허용된 사용자가 아닙니다."; $("login-err").hidden = false; $("screen-auth").hidden = false; return; }
  me = { email: session.user.email, id: session.user.id };
  $("screen-auth").hidden = true; $("app").hidden = false;
  await Promise.all([loadItems(), loadProfile()]);
  // Gemini 키가 없으면 추천을 만들 수 없으니 옷장부터 보여 줌
  showTab(settings.key ? "today" : "closet");
}
sb.auth.onAuthStateChange((ev) => { if (ev === "SIGNED_OUT") location.reload(); });

// ─────────────────────────────────────────── 데이터
async function loadItems() {
  const { data, error } = await sb.from("items").select("*").is("deleted_at", null).order("created_at", { ascending: false });
  if (error) { toast("옷장 불러오기 실패: " + error.message); return; }
  // 분류 번호(W01…) 순으로: 종류별로 찍은 순서라 비슷한 옷끼리 모임. 앱에서 추가한 옷은 맨 앞.
  const ord = (i) => { const m = /^W(\d+)$/.exec(i.import_id || ""); return m ? Number(m[1]) : -1; };
  // 분석을 기다리는 사진(등록 중 끊긴 것)은 옷장·추천에 넣지 않음
  pendingRows = (data || []).filter(isPending);
  items = (data || []).filter((r) => !isPending(r)).sort((a, b) => ord(a) - ord(b));
  await signUrls(items.flatMap((i) => [i.thumb_path, i.cut_path]).filter(Boolean));
}
async function signUrls(paths) {
  const need = paths.filter((p) => !urlCache.has(p));
  if (!need.length) return;
  const { data } = await sb.storage.from(BUCKET).createSignedUrls(need, 3600 * 6);
  (data || []).forEach((r) => r.signedUrl && urlCache.set(r.path, r.signedUrl));
}
// 목록·추천에는 배경을 지운 사진(있으면), 옷 상세에는 원래 사진
const thumbOf = (it) => urlCache.get(it.cut_path) || urlCache.get(it.thumb_path) || "";
const byId = (id) => items.find((i) => i.id === id);
const isParked = (it) => it.status !== "active";
const label = (k, v) => { const f = ATTR_FIELDS.find((x) => x[0] === k); return f && f[3] ? f[3](v) : v; };

// ─────────────────────────────────────────── Gemini
async function gemini(parts, { json = true, schema = null, model = settings.model } = {}) {
  const key = settings.key;
  if (!key) { openSettings(); throw new Error(t("needKey")[0]); }
  const body = { contents: [{ role: "user", parts }], generationConfig: {} };
  if (json) body.generationConfig.responseMimeType = "application/json";
  if (schema) body.generationConfig.responseSchema = schema;
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": key }, body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(friendlyAiError(res.status, await res.text().catch(() => "")));
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("") || "";
  if (!json) return text;
  try { return JSON.parse(text); } catch { const m = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/); if (m) return JSON.parse(m[0]); throw new Error("응답이 JSON이 아님"); }
}
async function blobToInline(blob) {
  const b64 = await new Promise((ok, no) => { const r = new FileReader(); r.onload = () => ok(r.result.split(",")[1]); r.onerror = no; r.readAsDataURL(blob); });
  return { inlineData: { mimeType: blob.type || "image/jpeg", data: b64 } };
}

// ─────────────────────────────────────────── 이미지 축소
async function resize(file, max, quality) {
  const bmp = await createImageBitmap(file);
  const s = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * s); c.height = Math.round(bmp.height * s);
  c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
  bmp.close?.();
  return await new Promise((ok) => c.toBlob(ok, "image/jpeg", quality));
}

// ─────────────────────────────────────────── 등록 (v5)
// 사진 여러 장(라벨이 섞여 있어도 됨) → ① 사진부터 저장(분석 대기 행) → ② 한 장씩 분석 → 라벨은 앞(없으면 뒤) 옷에 붙임.
// 중간에 닫아도 분석 대기 행이 남아 "이어서 분석"으로 계속한다. 삭제 권한이 없어 라벨 행은 deleted_at으로 치움.
const PENDING = "pending";
const CUT_CATS = ["top", "bottom", "dress", "outer"];
const EXTRACT_PROMPT = `You catalog ONE photo for a personal wardrobe app. The item may hang on a door, lie on a bed or be held in a hand — ignore the background.
First decide "kind": "label" if the photo is a care/brand label or tag shot close-up, otherwise "garment".

If kind is "label", return JSON {"kind":"label","label_text":"text as printed, shortened","material":"fiber composition in Korean, e.g. 울 80% 나일론 20%" or null,"material_en":English or null,"brand":string|null,"size_label":string|null}.

If kind is "garment", return JSON:
{"kind":"garment",
 "name": short Korean name, color + one feature + type (e.g. "네이비 스트라이프 셔츠"), "name_en": same in English,
 "category": "top"|"bottom"|"outer"|"shoes"|"dress"|"bag"|"acc",
 "subtype": Korean type (셔츠/블라우스/티셔츠/니트/가디건/재킷/코트/슬랙스/데님/스커트/원피스/스니커즈/로퍼/부츠 …), "subtype_en": English,
 "color_name": Korean, "color_name_en": English, "color_hex": "#rrggbb" dominant, "color_tone": "warm"|"cool"|"neutral",
 "pattern": "solid"|"stripe"|"check"|"print"|"other",
 "length": "crop"|"regular"|"long"|null, "sleeve": "long"|"three_quarter"|"short"|"cap"|"sleeveless"|null,
 "silhouette": "slim"|"straight"|"oversized"|"aline"|"hline"|"wide"|"flare"|null,
 "neckline": "crew"|"v"|"collar"|"turtle"|"boat"|"square"|"none"|null,
 "layer_role": "base"|"mid"|"outer"  (tops: a cardigan or overshirt that can be worn alone OR over another top is "mid"; one only thrown over is "outer"; everything else "base"),
 "acc_type": "earring"|"necklace"|"bracelet"|"ring"|"scarf"|"socks"|"hair"|"gloves"|"belt"|"hat"|null (category acc only),
 "metal": "gold"|"rose_gold"|"silver"|null (jewellery only), "heel_cm": number|null (shoes only, estimate),
 "design_lines": array from ["front_button","wrap","asymmetric_hem","center_slit","center_seam","pleats","ruffle","flounce","tiered","belted","double_breasted","collarless"],
 "tuck": "none"|"one"|"two"|"pintuck"|null (trousers only),
 "skirt_type": "wrap"|"pencil"|"bias"|"aline"|"pleated"|"mermaid"|"flounced"|"tiered"|"tulle"|"other"|null (skirts only),
 "collar_type": "collarless_v"|"pointed_lapel"|"stand"|"small_lapel"|"shawl_round"|"wide_lapel"|"hood"|"crew"|"other"|null,
 "coat_type": "trench_single"|"trench_double"|"duster"|"cocoon"|"box"|"puffer"|"parka"|"peacoat"|"other"|null (coats only),
 "material_guess": Korean guess like "울 혼방", "material_guess_en": English, "material_confidence": "high"|"medium"|"low",
 "season": array of "spring"|"summer"|"autumn"|"winter" (when it is comfortable worn on its own), "warmth": 1-5 thickness (null for bags and accessories),
 "rain": boolean (fine in rain),
 "styling_note_ko": 2-3 short plain Korean sentences (해요체) on how she wears it; one idea per sentence; no jargon, no body-type labels or ratios,
 "styling_note_en": the same in plain English,
 "questions": Korean array of things you could not see and she should confirm (may be empty)}
Judge only what is visible. Never invent a brand.`;

const add = { files: [], work: true, out: true, status: "active", cut: true, running: false, step: "", done: 0, total: 0, summary: null, error: "" };
let pendingRows = [];
const AT = (k) => t("addT")[k];
const isPending = (r) => r.extraction_version === PENDING;

function renderAdd() {
  const a = add; const body = $("add-body"); const s = a.summary;
  body.innerHTML = `
    ${pendingRows.length && !a.running ? `<div class="ad-resume"><span>${AT("pending")(pendingRows.length)}</span><button id="ad-resume">${icon("i-refresh", "i xs")} ${AT("resume")}</button></div>` : ""}
    <label class="drop ${a.files.length ? "has" : ""}" id="ad-drop"><input type="file" id="ad-files" accept="image/*" multiple hidden ${a.running ? "disabled" : ""}>${icon("i-cam")}<b>${a.files.length ? AT("picked")(a.files.length) : AT("pick")[0]}</b><span>${AT("pick")[1]}</span></label>
    ${a.files.length ? `<div class="ad-prev">${a.files.map((f) => `<img src="${esc(f.url)}" alt="">`).join("")}</div>` : ""}
    <span class="by-lbl">${AT("where")} <span class="faint">${AT("perItem")}</span></span>
    <div class="ad-opts"><button data-aw="work" class="${a.work ? "on" : ""}">${t("tpo").work}</button><button data-aw="out" class="${a.out ? "on" : ""}">${t("tpo").out}</button></div>
    <span class="by-lbl">${AT("now")}</span>
    <div class="ad-opts">${["active", "paused", "stored"].map((k) => `<button data-as="${k}" class="${a.status === k ? "on" : ""}">${t("st")[k]}</button>`).join("")}</div>
    <label class="switch"><input type="checkbox" id="ad-cut" ${a.cut ? "checked" : ""}> ${AT("cut")}</label>
    <button class="btn pri big" id="ad-go" ${a.files.length && !a.running ? "" : "disabled"}>${a.running ? AT("going") : AT("go")}</button>
    ${a.running ? `<div class="ad-prog"><b>${esc(a.step)}</b><div class="pb"><i style="width:${a.total ? Math.round((a.done / a.total) * 100) : 0}%"></i></div><span>${AT("keep")}</span></div>` : ""}
    ${a.error ? `<p class="by-note warn">${esc(a.error)}</p>` : ""}
    ${s ? `<div class="ad-sum"><b>${AT("sum")(s.items.length, s.labels)}</b>${s.failed ? `<span class="warn">${AT("failed")(s.failed)}</span>` : ""}
      ${s.items.map((r) => `<button class="ad-row" data-ai="${r.id}"><img src="${esc(thumbOf(r))}" alt=""><span class="tx"><b>${esc(nameOf(r))}</b><span>${t("cats")[r.category]}${r.label_path ? " · " + (r._labelNext ? AT("labelNext") : AT("labelPrev")) : ""}</span></span>${r._labelNext ? `<span class="ask">${AT("check")}</span>` : icon("i-chev", "i s go")}</button>`).join("")}
      <button class="btn line" id="ad-review">${AT("review")}</button></div>` : ""}
    <p class="tiny faint by-foot">${AT("foot")}</p>`;
  $("ad-files").onchange = (e) => { if (!e.target.files.length) return; a.files = [...e.target.files].map((f) => ({ file: f, url: URL.createObjectURL(f) })); a.summary = null; a.error = ""; renderAdd(); };
  body.querySelectorAll("[data-aw]").forEach((x) => (x.onclick = () => { const k = x.dataset.aw; if (a[k] && !a[k === "work" ? "out" : "work"]) return toast(AT("needOne")); a[k] = !a[k]; renderAdd(); }));
  body.querySelectorAll("[data-as]").forEach((x) => (x.onclick = () => { a.status = x.dataset.as; renderAdd(); }));
  body.querySelectorAll("[data-ai]").forEach((x) => (x.onclick = () => { const it = byId(x.dataset.ai); if (it) openReview(it); }));
  $("ad-cut").onchange = (e) => { a.cut = e.target.checked; };
  $("ad-go").onclick = () => runAdd(true);
  const rs = $("ad-resume"); if (rs) rs.onclick = () => runAdd(false);
  const rv = $("ad-review"); if (rv) rv.onclick = () => { showTab("closet"); const q = items.filter((i) => !i.reviewed_at); if (q.length) openReview(q[0], q); };
}
const addStep = (msg, done) => { add.step = msg; if (done != null) add.done = done; if (!$("tab-add").hidden) renderAdd(); };
const putFile = async (path, blob, type = "image/jpeg") => { const { error } = await sb.storage.from(BUCKET).upload(path, blob, { contentType: type, upsert: true }); if (error) throw new Error(error.message); };

async function runAdd(withNew) {
  const a = add; if (a.running) return;
  if (!MOCK && !settings.key) return openSettings();
  a.running = true; a.error = ""; a.summary = null;
  const blobs = new Map();                       // 이번에 올린 사진은 다시 내려받지 않음
  try {
    // ① 사진부터 저장
    if (withNew && a.files.length) {
      const batch = Date.now(); a.total = a.files.length * 2; a.done = 0;
      for (let i = 0; i < a.files.length; i++) {
        addStep(AT("saving")(i + 1, a.files.length), i);
        const f = a.files[i].file; const id = crypto.randomUUID(); const base = `${me.id}/${id}`;
        const [orig, thumb] = [await resizeUp(f, 1600, 0.86), await resizeUp(f, 800, 0.8)];
        await putFile(`${base}/orig.jpg`, orig); await putFile(`${base}/thumb.jpg`, thumb);
        const row = { id, owner: me.id, name: AT("waiting"), category: "top", status: a.status, formality_work: a.work, formality_out: a.out,
          attr_src: { formality_work: "default", formality_out: "default", status: "default" }, photo_path: `${base}/orig.jpg`, thumb_path: `${base}/thumb.jpg`,
          extraction: { batch, idx: i, cut: a.cut }, extraction_version: PENDING };
        const { error } = await sb.from("items").insert(row);
        if (error) throw new Error(error.message);
        blobs.set(id, thumb); pendingRows.push(row);
      }
      a.files = [];
    }
    // ② 한 장씩 분석
    const todo = [...pendingRows].sort((x, y) => (x.extraction?.batch - y.extraction?.batch) || (x.extraction?.idx - y.extraction?.idx));
    a.total = todo.length * (withNew ? 2 : 1); const off = withNew ? todo.length : 0;
    const made = []; let labels = 0, failed = 0, waitLabel = null, cutOk = true;
    for (let i = 0; i < todo.length; i++) {
      const row = todo[i]; addStep(AT("reading")(i + 1, todo.length), off + i);
      try {
        const thumb = blobs.get(row.id) || (await sb.storage.from(BUCKET).download(row.thumb_path)).data;
        if (!thumb) throw new Error(AT("noPhoto"));
        const r = await askAI("extract", { idx: row.extraction?.idx ?? i, name: row.thumb_path }, [{ text: EXTRACT_PROMPT }, await blobToInline(thumb)]);
        if (r.kind === "label") {
          const prev = made[made.length - 1]; const near = prev && prev._batch === row.extraction?.batch && prev._idx === (row.extraction?.idx ?? 0) - 1 && !prev.label_path ? prev : null;
          const lab = { row, r };
          if (near) { await attachLabel(near, lab, false); labels++; } else { if (waitLabel) await dropRow(waitLabel.row); waitLabel = lab; }
          continue;
        }
        const it = await saveGarment(row, r);
        made.push(it);
        if (waitLabel && waitLabel.row.extraction?.batch === row.extraction?.batch) { await attachLabel(it, waitLabel, true); labels++; waitLabel = null; }
        if (cutOk && row.extraction?.cut !== false && CUT_CATS.includes(it.category)) {
          addStep(AT("cutting")(i + 1, todo.length));
          try { await cutOne(it, thumb); } catch (e) { cutOk = false; a.error = AT("cutFail"); }
        }
      } catch (e) { failed++; a.error = e.message; if (/API|키|key|429|모델/i.test(e.message)) break; }
    }
    if (waitLabel) await dropRow(waitLabel.row);
    await loadItems();
    a.summary = { items: made.map((m) => Object.assign(byId(m.id) || m, { _labelNext: m._labelNext })), labels, failed: pendingRows.length };
  } catch (e) { a.error = e.message; await loadItems().catch(() => {}); }
  a.running = false; a.step = "";
  if (!$("tab-add").hidden) renderAdd();
}
// EXIF 회전을 반영해 줄임
async function resizeUp(file, max, quality) {
  const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
  const s = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas"); c.width = Math.round(bmp.width * s); c.height = Math.round(bmp.height * s);
  c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height); bmp.close?.();
  return await new Promise((ok, no) => c.toBlob((b) => (b ? ok(b) : no(new Error("사진 변환 실패"))), "image/jpeg", quality));
}
const oneOf = (v, list) => (list.includes(v) ? v : null);
async function saveGarment(row, r) {
  const cat = oneOf(r.category, OPT.category) || "top"; const wear = !["bag", "acc"].includes(cat);
  const src = { ...row.attr_src }; ["category", "subtype", "color_name", "pattern", "length", "sleeve", "silhouette", "neckline", "layer_role", "season", "warmth", "acc_type", "metal", "heel_cm"].forEach((k) => (src[k] = "model"));
  src.material = "unknown";
  const patch = {
    name: String(r.name || `${r.color_name || ""} ${r.subtype || ""}`).trim() || AT("unnamed"), name_en: r.name_en || null,
    category: cat, subtype: r.subtype || null, subtype_en: r.subtype_en || null,
    color_name: r.color_name || null, color_name_en: r.color_name_en || null, color_hex: /^#[0-9a-f]{6}$/i.test(r.color_hex || "") ? r.color_hex : null, color_tone: oneOf(r.color_tone, ["warm", "cool", "neutral"]),
    pattern: oneOf(r.pattern, OPT.pattern), length: oneOf(r.length, OPT.length) || null, sleeve: oneOf(r.sleeve, OPT.sleeve) || null,
    silhouette: oneOf(r.silhouette, OPT.silhouette) || null, neckline: oneOf(r.neckline, OPT.neckline) || null,
    layer_role: cat === "outer" ? "outer" : wear ? oneOf(r.layer_role, OPT.layer_role) || "base" : null,
    acc_type: cat === "acc" ? oneOf(r.acc_type, ACC_TYPES) : null, metal: oneOf(r.metal, ["gold", "rose_gold", "silver"]), heel_cm: cat === "shoes" && Number(r.heel_cm) >= 0 ? Number(r.heel_cm) : null,
    design_lines: (Array.isArray(r.design_lines) ? r.design_lines : []).filter((d) => d && d !== "none"), tuck: r.tuck || null, skirt_type: r.skirt_type || null, collar_type: r.collar_type || null, coat_type: r.coat_type || null,
    material: null, material_guess: r.material_guess || null, material_guess_en: r.material_guess_en || null, material_confidence: oneOf(r.material_confidence, ["high", "medium", "low"]),
    season: (Array.isArray(r.season) ? r.season : []).filter((s) => SEASONS.includes(s)), warmth: wear ? Math.min(5, Math.max(1, Math.round(Number(r.warmth) || 3))) : null,
    rain: !!r.rain, recommend: cat === "acc" && r.acc_type === "hair" ? "on_request" : "auto",
    styling_note_ko: r.styling_note_ko || null, styling_note_en: r.styling_note_en || null, notes: r.styling_note_ko || null,
    questions: (Array.isArray(r.questions) ? r.questions : []).filter(Boolean).slice(0, 5),
    attr_src: src, extraction: { ...r, batch: row.extraction?.batch, idx: row.extraction?.idx }, extraction_version: EXTRACT_VERSION, reviewed_at: null,
  };
  const { error } = await sb.from("items").update(patch).eq("id", row.id);
  if (error) throw new Error(error.message);
  pendingRows = pendingRows.filter((p) => p.id !== row.id);
  return { ...row, ...patch, _batch: row.extraction?.batch, _idx: row.extraction?.idx ?? 0 };
}
// 라벨 사진을 옷에 붙이고, 라벨 행은 치움. next = 뒤 사진과 연결(확인 필요)
async function attachLabel(it, lab, next) {
  const { row, r } = lab; const src = { ...it.attr_src };
  const patch = { label_path: row.photo_path, label_text: r.label_text || null };
  if (r.material) { patch.material = r.material; patch.material_en = r.material_en || null; src.material = "label"; }
  if (r.brand) { patch.brand = r.brand; src.brand = "label"; }
  if (r.size_label) { patch.size_label = r.size_label; src.size_label = "label"; }
  patch.attr_src = src;
  if (next) patch.questions = [...(it.questions || []), AT("labelAsk")];
  const { error } = await sb.from("items").update(patch).eq("id", it.id);
  if (error) throw new Error(error.message);
  Object.assign(it, patch, { _labelNext: next, _idx: next ? it._idx : row.extraction?.idx ?? it._idx });
  await dropRow(row);
}
async function dropRow(row) {
  await sb.from("items").update({ deleted_at: new Date().toISOString(), extraction_version: "label" }).eq("id", row.id);
  pendingRows = pendingRows.filter((p) => p.id !== row.id);
}
// 배경 지우기(기기 안에서). 투명한 가장자리를 잘라 WebP로.
let bgLib = null;
async function cutOne(it, thumb) {
  if (MOCK) return;
  bgLib ||= await import("https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.6.0/+esm");
  const png = await Promise.race([bgLib.removeBackground(thumb, { output: { format: "image/png" } }), new Promise((_, no) => setTimeout(() => no(new Error("timeout")), 90000))]);
  const bmp = await createImageBitmap(png);
  const c = document.createElement("canvas"); c.width = bmp.width; c.height = bmp.height;
  const g = c.getContext("2d", { willReadFrequently: true }); g.drawImage(bmp, 0, 0); bmp.close?.();
  const d = g.getImageData(0, 0, c.width, c.height).data;
  let x0 = c.width, y0 = c.height, x1 = -1, y1 = -1, n = 0;
  for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) if (d[(y * c.width + x) * 4 + 3] > 24) { n++; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  const share = n / (c.width * c.height);
  if (x1 < 0 || share < 0.03 || share > 0.92) return;                  // 옷을 못 찾았거나 배경이 안 지워짐 → 원래 사진 그대로
  const pad = Math.round(Math.max(x1 - x0, y1 - y0) * 0.03);
  x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad); x1 = Math.min(c.width - 1, x1 + pad); y1 = Math.min(c.height - 1, y1 + pad);
  const o = document.createElement("canvas"); o.width = x1 - x0 + 1; o.height = y1 - y0 + 1;
  o.getContext("2d").drawImage(c, x0, y0, o.width, o.height, 0, 0, o.width, o.height);
  let blob = await new Promise((ok) => o.toBlob(ok, "image/webp", 0.86));
  if (!blob || blob.type !== "image/webp") blob = await new Promise((ok) => o.toBlob(ok, "image/png"));   // 사파리는 WebP로 저장하지 못함
  if (!blob) return;
  const path = it.thumb_path.replace(/[^/]+$/, blob.type === "image/webp" ? "cut.webp" : "cut.png");
  await putFile(path, blob, blob.type);
  await sb.from("items").update({ cut_path: path }).eq("id", it.id);
}

// ─────────────────────────────────────────── 옷장
let clCat = "all", clFilter = "active", clQuery = "", clSub = "all";
let clDrill = null;   // 구조 화면에서 누른 조건 { scope, season?, fam? }
const CATS = ["all", "top", "bottom", "outer", "dress", "shoes", "bag", "acc"];
const ACC_TYPES = ["earring", "necklace", "bracelet", "ring", "scarf", "socks", "hair", "gloves", "belt", "hat"];
const nameOf = (i) => (lang === "en" && i.name_en) ? i.name_en : i.name;
const pick = (i, k) => (lang === "en" && i[k + "_en"]) ? i[k + "_en"] : i[k];

function drawClosetHead() {
  $("cl-title").textContent = t("closet");
  $("cl-search").placeholder = t("searchPh");
  $("cl-cat").innerHTML = CATS.map((k) => `<button data-cat="${k}" class="${clCat === k ? "on" : ""}">${t("cats")[k]}</button>`).join("");
  // 구조 화면에서 들어온 경우: 상태 칩 대신 걸러 보는 조건 하나(× 로 해제)
  $("cl-filter").innerHTML = clDrill
    ? `<button data-drill-x class="chip on">${esc(drillLabel())}${icon("i-x", "i xs b")}</button>`
    : ["active", "work", "out", "parked"].map((k) => `<button data-f="${k}" class="chip ${clFilter === k ? "on" : ""}">${t("filters")[k]}</button>`).join("");
  // 입은 기록 줄: 가장 최근에 입은 코디의 썸네일 + 날짜 (기록은 처음 한 번만 불러옴)
  if (!wearsLoaded) { wearsLoaded = true; loadWears().then(() => { if (!$("tab-closet").hidden) drawClosetHead(); }); }
  const lastW = wears.filter((r) => r.worn_on <= todayStr())[0];
  $("cl-log").querySelector(".th").innerHTML = lastW ? coreOf(lastW.items).slice(0, 4).map((i) => `<img src="${esc(thumbOf(i))}" alt="">`).join("") + `<span>${esc(dayLabel(lastW.worn_on).replace(/ \S+요일$/, ""))}</span>` : "";
  const cl = clothesOf(items);
  $("cl-struct").hidden = cl.length < 10;
  $("cl-struct").querySelector(".strip").innerHTML = byFam(cl).map((i) => `<i style="background:${esc(i.color_hex || "#999")}"></i>`).join("");
  const sub = $("cl-sub");
  if (clCat === "acc") {
    const have = ACC_TYPES.filter((a) => items.some((i) => i.category === "acc" && i.acc_type === a));
    sub.hidden = have.length < 2;
    sub.innerHTML = ["all", ...have].map((k) => `<button data-sub="${k}" class="chip ${clSub === k ? "on" : ""}">${k === "all" ? t("cats").all : t("accTypes")[k]}</button>`).join("");
  } else { sub.hidden = true; sub.innerHTML = ""; }
}
$("cl-cat").onclick = (e) => { const b = e.target.closest("button"); if (!b) return; clCat = b.dataset.cat; clSub = "all"; renderCloset(); };
$("cl-sub").onclick = (e) => { const b = e.target.closest("button"); if (!b) return; clSub = b.dataset.sub; renderCloset(); };
$("cl-filter").onclick = (e) => { const b = e.target.closest("button"); if (!b) return; if (b.hasAttribute("data-drill-x")) clDrill = null; else clFilter = b.dataset.f; renderCloset(); };
$("cl-struct").onclick = () => openStructure();
$("cl-log").onclick = () => openWearLog();
$("cl-search-btn").onclick = () => { const s = $("cl-search"); s.hidden = !s.hidden; if (!s.hidden) s.focus(); else { s.value = ""; clQuery = ""; renderCloset(); } };
$("cl-search").oninput = (e) => { clQuery = e.target.value.trim().toLowerCase(); renderCloset(); };
$("cl-queue").onclick = () => { const q = items.filter((i) => !i.reviewed_at); if (q.length) openReview(q[0], q); };
document.querySelectorAll("#tab-closet .lang button").forEach((b) => (b.onclick = () => setLang(b.dataset.l)));

function closetList() {
  let list = items.filter((i) => clCat === "all" || i.category === clCat);
  if (clCat === "acc" && clSub !== "all") list = list.filter((i) => i.acc_type === clSub);
  const F = { active: (i) => i.status === "active", work: (i) => i.formality_work && i.status === "active", out: (i) => i.formality_out && i.status === "active", parked: (i) => i.status !== "active" };
  if (clDrill) {
    list = list.filter(SCOPE[clDrill.scope]);
    if (clDrill.season) list = list.filter((i) => (i.season || []).includes(clDrill.season));
    if (clDrill.fam) list = clothesOf(list).filter((i) => famOf(i) === clDrill.fam);
  } else list = list.filter(F[clFilter]);
  if (clQuery) list = list.filter((i) => [i.name, i.name_en, i.color_name, i.color_name_en, i.subtype, i.subtype_en, i.brand, i.import_id].filter(Boolean).join(" ").toLowerCase().includes(clQuery));
  return list;
}
function renderCloset() {
  drawClosetHead();
  const q = items.filter((i) => !i.reviewed_at);
  $("cl-queue").hidden = !q.length;
  $("cl-queue").querySelector("span").textContent = t("queue")(q.length);
  $("cl-count").textContent = items.length;
  const list = closetList();
  $("cl-grid").innerHTML = list.map((i) => {
    const fm = [i.formality_work && t("work"), i.formality_out && t("out")].filter(Boolean).join(" · ");
    const st = i.status !== "active" ? `<em>${t("st")[i.status]}</em>${fm ? " · " : ""}` : "";
    const src = thumbOf(i);
    return `<div class="tile ${i.status === "stored" ? "stored" : ""}">
      <button class="more" data-more="${i.id}" aria-label="${t("stateBtn")}"><svg class="i xs b"><use href="#i-more"/></svg></button>
      <button class="ph" data-open="${i.id}" aria-label="${esc(nameOf(i))}">${src ? `<img src="${esc(src)}" alt="" loading="lazy">` : `<svg class="i"><use href="#${i.category === "bag" ? "i-bag" : "i-gem"}"/></svg>`}</button>
      <b>${!i.reviewed_at ? "<i></i>" : ""}${esc(nameOf(i))}</b>
      <span class="fm">${st}${fm}</span>
    </div>`;
  }).join("") || `<div class="empty" style="grid-column:1/-1"><b>${t("emptyT")}</b>${t("emptyD")}</div>`;
  $("cl-grid").querySelectorAll("[data-open]").forEach((b) => (b.onclick = () => openReview(byId(b.dataset.open))));
  $("cl-grid").querySelectorAll("[data-more]").forEach((b) => (b.onclick = (e) => { e.stopPropagation(); openStatusPop(b, byId(b.dataset.more)); }));
}
async function setStatus(it, next) {
  const prev = it.status; if (prev === next) return;
  it.status = next; renderCloset();
  const { error } = await sb.from("items").update({ status: next }).eq("id", it.id);
  if (error) { it.status = prev; renderCloset(); return toast(t("saveFail") + error.message); }
  rec = null;
  toast(t("statusToast")(nameOf(it), t("st")[next]), async () => {
    it.status = prev; renderCloset();
    const r = await sb.from("items").update({ status: prev }).eq("id", it.id);
    if (r.error) toast(t("saveFail") + r.error.message);
  });
}
function openStatusPop(anchor, it) {
  document.querySelectorAll(".pop").forEach((p) => p.remove());
  const pop = document.createElement("div"); pop.className = "pop";
  pop.innerHTML = ["active", "paused", "stored"].map((k) => `<button data-s="${k}" class="${it.status === k ? "on" : ""}">${it.status === k ? `<svg class="i xs b"><use href="#i-check"/></svg>` : `<span style="width:13px"></span>`}${t("stLong")[k]}</button>`).join("");
  anchor.closest(".tile").appendChild(pop);
  pop.querySelectorAll("button").forEach((b) => (b.onclick = (e) => { e.stopPropagation(); pop.remove(); setStatus(it, b.dataset.s); }));
  setTimeout(() => document.addEventListener("click", () => pop.remove(), { once: true }), 0);
}

// ─────────────────────────────────────────── 옷장 구조 (계절별 개수 · 색 계열)
// 상태와 상관없이 가진 옷 전부를 셈(계절 보관 중인 옷이 빠지면 그 계절이 얇아 보이므로). 숫자는 앱이 계산, Gemini 안 씀.
const SCOPE = { all: () => true, work: (i) => i.formality_work, out: (i) => i.formality_out };
const CLOTHES = ["top", "bottom", "outer", "dress"];
const clothesOf = (L) => L.filter((i) => CLOTHES.includes(i.category));
// 색 계열: 저장된 색 이름의 첫 부분("다크 네이비 · 차콜" → "다크 네이비")을 위에서부터 맞춰 봄. 순서가 중요(모카 베이지 → 베이지, 블루 그레이 → 블루)
const FAMS = [
  ["black", /^(블랙|올 블랙|차콜 블랙)/], ["purple", /라벤더|라일락|퍼플|보라|플럼/], ["navy", /네이비|인디고/],
  ["blue", /블루|데님|스카이|코발트|틸|터쿼이즈/], ["pink", /핑크|코랄|피치|살구|블러시|로즈 베이지/], ["red", /버건디|레드|크림슨|오렌지/],
  ["yellow", /옐로|머스터드/], ["beige", /베이지|카멜|오트밀|그레이지|토프|누드|샌드|탄/], ["brown", /브라운|모카|초콜릿|토터스|체스트넛/],
  ["green", /카키|그린|민트|세이지|올리브|연둣/], ["gray", /그레이|차콜|회색|멜란지/], ["white", /화이트|아이보리|크림|오프/],
];
const FAM_ORDER = ["white", "beige", "brown", "gray", "black", "navy", "blue", "green", "yellow", "pink", "red", "purple"];
function famOf(i) {
  const s = (i.color_name || "").split(/ · |바탕/)[0].trim();
  for (const [k, re] of FAMS) if (re.test(s)) return k;
  const c = rgbOf(i); if (!c) return "gray";
  const [r, g, b] = c.map((v) => v / 255), mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
  return mx - mn < .12 ? (l < .2 ? "black" : l > .85 ? "white" : "gray") : "gray";
}
const lumOf = (i) => { const c = rgbOf(i); return c ? .299 * c[0] + .587 * c[1] + .114 * c[2] : 0; };
const byFam = (L) => [...L].sort((a, b) => FAM_ORDER.indexOf(famOf(a)) - FAM_ORDER.indexOf(famOf(b)) || lumOf(b) - lumOf(a));
const ST_CATS = ["top", "bottom", "dress", "outer", "shoes"];
const ST_LOW = .6;   // 그 종류에서 가장 많은 계절의 60% 미만이면 표에 표시(사용자 확인 2026-10-04)
let stScope = "all";

function drillLabel() {
  const d = clDrill, S = t("opts").season, X = t("struct");
  const parts = [d.season && S[d.season], d.fam && t("fams")[d.fam], d.scope !== "all" && X[d.scope]].filter(Boolean);
  return parts.join(" · ") + X.shown;
}
function openStructure() {
  const X = t("struct"), S = t("opts").season, C = t("cats");
  const L = items.filter(SCOPE[stScope]);
  const cnt = (cat, s) => L.filter((i) => i.category === cat && (!s || (i.season || []).includes(s))).length;
  const skip = (cat, s) => cat === "outer" && s === "summer";   // 여름 아우터는 적은 게 정상
  const fits = (cat) => SEASONS.filter((s) => !skip(cat, s));
  const best = (cat) => fits(cat).reduce((a, s) => (cnt(cat, s) > cnt(cat, a) ? s : a));
  const low = (cat, s) => !skip(cat, s) && cnt(cat, s) < cnt(cat, best(cat)) * ST_LOW;
  // 가장 얇은 계절 = 상의+하의+신발 합이 가장 작은 계절
  const tot = SEASONS.map((s) => [s, ["top", "bottom", "shoes"].reduce((a, c) => a + cnt(c, s), 0)]);
  const thin = tot.reduce((a, x) => (x[1] < a[1] ? x : a)), fat = tot.reduce((a, x) => (x[1] > a[1] ? x : a));
  const ratio = fat[1] ? thin[1] / fat[1] : 1;
  const gaps = ratio < .8 ? ST_CATS.filter((c) => !skip(c, thin[0])).map((c) => ({ c, n: cnt(c, thin[0]), b: cnt(c, best(c)), bs: best(c) }))
    .filter((g) => g.b && g.n < g.b * .75).sort((a, b) => a.n / a.b - b.n / b.b).slice(0, 3) : [];
  const head = ratio < .8 ? X.head(S[thin[0]], X.who[stScope], S[fat[0]], X.frac[ratio < .4 ? 0 : ratio < .6 ? 1 : 2]) : X.even;
  const cl = clothesOf(L);
  const groups = FAM_ORDER.map((k) => [k, cl.filter((i) => famOf(i) === k)]).filter(([, g]) => g.length).sort((a, b) => b[1].length - a[1].length);
  const unit = groups.length ? 100 / groups[0][1].length : 0;
  const sw = (i, w) => `<i style="background:${esc(i.color_hex || "#999")}${w ? `;width:calc(${w}% - 1px)` : ""}"></i>`;
  openModal(`
    <div class="page-head"><button class="back" id="st-back" aria-label="${t("back")}">${icon("i-back")}</button><div class="h1">${X.title}</div></div>
    <div class="st">
      <div class="segc full" id="st-scope">${["all", "work", "out"].map((k) => `<button data-sc="${k}" class="${stScope === k ? "on" : ""}">${X[k]}</button>`).join("")}</div>
      <p class="st-head">${esc(head)}</p>
      ${gaps.length ? `<div class="st-gaps">${gaps.map((g) => `<button data-c="${g.c}" data-s="${thin[0]}"><i class="dot"></i><span>${S[thin[0]]} ${C[g.c]} <b class="n">${g.n}</b> <small>· ${S[g.bs]} <span class="n">${g.b}</span></small></span>${icon("i-chev", "i s")}</button>`).join("")}</div>` : ""}
      <section><h3>${X.bySeason} <small>${X.bySeasonD}</small></h3>
        <table class="st-tbl"><thead><tr><th></th>${SEASONS.map((s) => `<th>${S[s]}</th>`).join("")}<th>${X.total}</th></tr></thead>
        <tbody>${ST_CATS.map((c) => `<tr><td>${C[c]}</td>${SEASONS.map((s) => `<td><button data-c="${c}" data-s="${s}" class="${low(c, s) ? "low" : ""}">${cnt(c, s)}</button></td>`).join("")}<td class="tot n">${cnt(c)}</td></tr>`).join("")}</tbody></table>
      </section>
      ${cl.length ? `<section><h3>${X.colors} <small>${X.clothesN(cl.length)}</small></h3>
        <div class="st-sig">${byFam(cl).map((i) => sw(i)).join("")}</div>
        <div class="st-fams">${groups.map(([k, g]) => `<button data-fam="${k}"><span class="nm">${t("fams")[k]}</span><span class="bar">${byFam(g).map((i) => sw(i, unit)).join("")}</span><b class="n">${g.length}</b></button>`).join("")}</div>
      </section>` : ""}
    </div>`, "page");
  const m = $("modal");
  m.querySelector("#st-back").onclick = closeModal;
  m.querySelectorAll("[data-sc]").forEach((b) => (b.onclick = () => { stScope = b.dataset.sc; openStructure(); }));
  const go = (drill, cat) => { clDrill = { scope: stScope, ...drill }; clCat = cat; clSub = "all"; clQuery = ""; $("cl-search").value = ""; $("cl-search").hidden = true; closeModal(); renderCloset(); window.scrollTo(0, 0); };
  m.querySelectorAll("[data-c]").forEach((b) => (b.onclick = () => go({ season: b.dataset.s }, b.dataset.c)));
  m.querySelectorAll("[data-fam]").forEach((b) => (b.onclick = () => go({ fam: b.dataset.fam }, "all")));
}

// ─────────────────────────────────────────── 옷 상세 · 확인·수정
const OPT = {
  category: ["top", "bottom", "outer", "dress", "shoes", "bag", "acc"],
  pattern: ["solid", "stripe", "check", "print", "other"],
  length: ["", "crop", "regular", "long"],
  sleeve: ["", "long", "three_quarter", "short", "cap", "sleeveless"],
  silhouette: ["", "slim", "straight", "oversized", "aline", "hline", "wide", "flare"],
  neckline: ["", "crew", "v", "collar", "turtle", "boat", "square", "none"],
  acc_type: ["", ...ACC_TYPES],
  metal: ["", "gold", "rose_gold", "silver"],
  layer_role: ["base", "mid", "outer"],
  warmth: ["", "1", "2", "3", "4", "5"],
  recommend: ["auto", "on_request", "special_only", "never"],
};
const SEASONS = ["spring", "summer", "autumn", "winter"];
// 카테고리별로 보여줄 칸
function fieldsFor(cat) {
  const base = ["brand", "category", "subtype", "color_name"];
  if (cat === "acc") return [...base, "acc_type", "metal", "material", "season", "recommend", "fit_note"];
  if (cat === "bag") return [...base, "pattern", "material", "season", "fit_note"];
  if (cat === "shoes") return [...base, "heel_cm", "material", "season", "warmth", "rain", "fit_note"];
  const wear = [...base, "pattern", "length", "length_cm"];
  if (cat !== "bottom") wear.push("sleeve", "neckline");
  if (cat === "top") wear.splice(2, 0, "layer_role");
  return [...wear, "silhouette", "material", "season", "warmth", "rain", "size_label", "fit_note", "condition_note"];
}
async function openReview(it, queue = null) {
  const draft = { ...it, season: [...(it.season || [])] }; const src = { ...(it.attr_src || {}) }; const touched = new Set();
  const idx = queue ? queue.indexOf(it) : -1;
  const F = t("fields"), O = t("opts");
  const dot = (k, def = "claude") => `<i class="src ${src[k] || def}"></i>`;
  const optLabel = (k, o) => o === "" ? "—" : (O[k] && O[k][o]) || o;
  const row = (k) => {
    if (k === "season") return `<div class="fr"><div class="l">${dot("season")}${F.season}</div><div class="cbs">${SEASONS.map((s) => `<button type="button" class="cb ${draft.season.includes(s) ? "on" : ""}" data-season="${s}">${O.season[s]}</button>`).join("")}</div></div>`;
    if (k === "rain") return `<div class="fr"><div class="l">${dot("rain", "default")}${F.rain}</div><div class="cbs"><button type="button" class="cb ${draft.rain ? "on" : ""}" data-cb="rain">${F.rainOn}</button></div></div>`;
    if (k === "length_cm" || k === "heel_cm") return `<div class="fr"><div class="l">${dot(k)}${F[k]}</div><div class="v"><input type="number" inputmode="decimal" step="0.5" min="0" max="200" data-k="${k}" value="${draft[k] ?? ""}" placeholder="—"><span class="unit">cm${src[k] === "user" ? "" : " · " + t("estimate")}</span></div></div>`;
    if (OPT[k]) return `<div class="fr"><div class="l">${dot(k)}${F[k]}</div><div class="v"><select data-k="${k}">${OPT[k].map((o) => `<option value="${o}" ${String(draft[k] ?? "") === o ? "selected" : ""}>${esc(optLabel(k, o))}</option>`).join("")}</select></div></div>`;
    const sw = k === "color_name" && draft.color_hex ? `<span class="sw" style="background:${esc(draft.color_hex)}"></span>` : "";
    const val = k === "material" ? (draft.material || "") : (pick(draft, k) || "");
    const ph = k === "material" && !draft.material ? (draft.material_guess ? t("guess") + " " + (pick(draft, "material_guess") || "") : t("unknown")) : "";
    const ek = (lang === "en" && draft[k + "_en"] != null && ["subtype", "color_name", "material"].includes(k)) ? k + "_en" : k;
    return `<div class="fr"><div class="l">${dot(k === "material" ? "material" : k, k === "brand" || k.endsWith("_note") || k === "size_label" ? "default" : "claude")}${F[k]}</div><div class="v">${sw}<input type="text" data-k="${ek}" value="${esc(val)}" placeholder="${esc(ph)}"></div></div>`;
  };
  const shots = [["thumb", it.thumb_path, t("shot").main], ...(it.extra_paths || []).map((p, i) => ["x" + i, p, t("shot").extra]), ...(it.label_path ? [["label", it.label_path, t("shot").label]] : [])];
  await signUrls(shots.map((s) => s[1]).filter(Boolean));
  const url = (p) => urlCache.get(p) || "";
  const note = lang === "en" ? (it.styling_note_en || it.styling_note_ko) : (it.styling_note_ko || it.notes);
  const asks = (it.questions || []).filter(Boolean);
  const nk = lang === "en" && it.name_en != null ? "name_en" : "name";
  openModal(`
    <div class="page-head"><button class="back" id="rv-back" aria-label="${t("back")}"><svg class="i"><use href="#i-back"/></svg></button>
      <div class="h1">${queue ? `${t("review")} <small class="n">${idx + 1}<span class="faint">/${queue.length}</span></small>` : esc(nameOf(it))}</div></div>
    <div class="photo"><img id="rv-img" src="${esc(url(it.thumb_path))}" alt=""></div>
    ${shots.length > 1 ? `<div class="shots">${shots.map(([k, p, lb], i) => `<button type="button" data-shot="${esc(p)}" class="${i === 0 ? "on" : ""}"><img src="${esc(url(p))}" alt="" loading="lazy">${lb}</button>`).join("")}</div>` : ""}
    ${note ? `<div class="note"><b>${t("howTo")}</b>${esc(note)}</div>` : ""}
    ${asks.length && lang === "ko" ? `<div class="ask-box"><b>${t("asks")}</b><ul>${asks.map((a) => `<li>${esc(a)}</li>`).join("")}</ul></div>` : ""}
    <div class="legend"><span><i class="src user"></i>${t("legend").user}</span><span><i class="src claude"></i>${t("legend").est}</span><span><i class="src label"></i>${t("legend").label}</span><span><i class="src default"></i>${t("legend").def}</span><span><i class="src unknown"></i>${t("legend").unknown}</span></div>
    <div class="form">
      <div class="fr"><div class="l">${dot("name")}${F.name}</div><div class="v"><input type="text" data-k="${nk}" value="${esc(nameOf(draft))}"></div></div>
      ${fieldsFor(draft.category).map(row).join("")}
      <div class="fr"><div class="l">${dot("formality", "default")}${F.formality}</div><div class="cbs">
        <button type="button" class="cb ${draft.formality_work ? "on" : ""}" data-cb="formality_work">${t("work")}</button>
        <button type="button" class="cb ${draft.formality_out ? "on" : ""}" data-cb="formality_out">${t("out")}</button></div></div>
      <div class="fr" style="border:0"><div class="l">${dot("status", "default")}${F.status}</div><div class="mini" data-mini="status">
        ${["active", "paused", "stored"].map((k) => `<button type="button" class="${draft.status === k ? "on" : ""}" data-v="${k}">${t("st")[k]}</button>`).join("")}</div></div>
    </div>
    <div class="modal-row">
      ${queue ? `<button class="btn txt" id="rv-skip">${t("later")}</button>` : `<button class="btn txt" id="rv-del">${t("remove")}</button>`}
      <button class="btn pri" id="rv-save" style="flex:1"><svg class="i s b"><use href="#i-check"/></svg>${queue ? t("saveNext") : t("save")}</button>
    </div>
    <p class="tiny faint" style="margin-top:12px;text-align:center">${esc(it.import_id || "")}${it.label_text && lang === "ko" ? " · " + esc(it.label_text) : ""}</p>`, "page");
  const m = $("modal");
  const mark = (k, el) => { src[k] = "user"; touched.add(k); const d = el.closest(".fr")?.querySelector(".src"); if (d) d.className = "src user"; };
  m.querySelectorAll("[data-shot]").forEach((b) => (b.onclick = () => { m.querySelector("#rv-img").src = url(b.dataset.shot); m.querySelectorAll("[data-shot]").forEach((x) => x.classList.toggle("on", x === b)); }));
  m.querySelectorAll("[data-k]").forEach((el) => el.addEventListener("change", () => {
    const k = el.dataset.k; let v = el.value;
    if (el.type === "number") v = v === "" ? null : Number(v);
    else if (el.tagName === "SELECT" && v === "") v = null;
    else if (k === "warmth") v = v === "" ? null : Number(v);
    else v = v.trim() === "" ? null : v.trim();
    draft[k] = k === "warmth" && v != null ? Number(v) : v;
    mark(k.replace(/_en$/, ""), el);
    if (k === "category") { Object.assign(it, { category: v }); }
  }));
  m.querySelectorAll("[data-season]").forEach((b) => (b.onclick = () => { const s = b.dataset.season; draft.season = draft.season.includes(s) ? draft.season.filter((x) => x !== s) : SEASONS.filter((x) => x === s || draft.season.includes(x)); b.classList.toggle("on", draft.season.includes(s)); mark("season", b); }));
  m.querySelectorAll("[data-cb]").forEach((b) => (b.onclick = () => { const k = b.dataset.cb; draft[k] = !draft[k]; b.classList.toggle("on", draft[k]); mark(k.startsWith("formality") ? "formality" : k, b); touched.add(k); }));
  m.querySelectorAll("[data-mini] button").forEach((b) => (b.onclick = () => { draft.status = b.dataset.v; touched.add("status"); b.parentElement.querySelectorAll("button").forEach((x) => x.classList.toggle("on", x === b)); }));
  const close = () => { closeModal(); renderCloset(); };
  const next = () => { if (queue) { const rest = queue.filter((q) => q.id !== it.id && !byId(q.id)?.reviewed_at); if (rest.length) return openReview(rest[0], rest); } close(); };
  m.querySelector("#rv-back").onclick = close;
  m.querySelector("#rv-save").onclick = async () => {
    const EDIT = ["name", "name_en", "brand", "category", "subtype", "subtype_en", "color_name", "color_name_en", "pattern", "length", "length_cm", "sleeve", "silhouette", "neckline", "acc_type", "metal", "layer_role", "heel_cm", "material", "material_en", "season", "warmth", "rain", "recommend", "size_label", "fit_note", "condition_note", "formality_work", "formality_out", "status"];
    const patch = {};
    EDIT.forEach((k) => { if (touched.has(k) || touched.has(k.replace(/_en$/, "")) && k in draft) patch[k] = draft[k] ?? null; });
    if (patch.name === null) delete patch.name;
    if ("rain" in patch) patch.rain = !!patch.rain;
    if ("recommend" in patch && !patch.recommend) patch.recommend = "auto";
    patch.attr_src = src; patch.reviewed_at = new Date().toISOString();
    if (queue || asksAnswered(it, touched)) patch.questions = queue ? [] : (it.questions || []).filter((a) => !answered(a, touched));
    const { error } = await sb.from("items").update(patch).eq("id", it.id);
    if (error) return toast(t("saveFail") + error.message);
    Object.assign(it, patch); rec = null; toast(t("saved")); next();
  };
  const skip = m.querySelector("#rv-skip"); if (skip) skip.onclick = next;
  const del = m.querySelector("#rv-del"); if (del) del.onclick = async () => {
    const at = new Date().toISOString();
    const { error } = await sb.from("items").update({ deleted_at: at }).eq("id", it.id);
    if (error) return toast(t("saveFail") + error.message);
    const pos = items.indexOf(it); items = items.filter((x) => x.id !== it.id); rec = null; close();
    toast(t("removed"), async () => {
      const r = await sb.from("items").update({ deleted_at: null }).eq("id", it.id);
      if (r.error) return toast(t("saveFail") + r.error.message);
      items.splice(Math.max(0, pos), 0, it); renderCloset();
    });
  };
}
// 질문이 어느 칸에 대한 것인지(기장·브랜드·소재·회사) 보고, 그 칸을 고쳤으면 질문을 지움
const answered = (q, touched) => (/실측|총장|기장/.test(q) && touched.has("length_cm")) || (/브랜드/.test(q) && touched.has("brand")) || (/소재/.test(q) && touched.has("material")) || (/회사/.test(q) && touched.has("formality_work"));
const asksAnswered = (it, touched) => (it.questions || []).some((q) => answered(q, touched));

// ─────────────────────────────────────────── 날씨 (Open-Meteo, 무키) — 출근 07–09시 · 퇴근 17–19시 두 창
const WX_TXT = (c) => {
  const k = c === 0 ? 0 : c <= 2 ? 1 : c === 3 ? 2 : c <= 49 ? 3 : c <= 67 ? 4 : c <= 77 ? 5 : c <= 82 ? 6 : c <= 86 ? 5 : 7;
  return (lang === "en" ? ["Clear", "Partly cloudy", "Overcast", "Fog", "Rain", "Snow", "Showers", "Thunderstorm"] : ["맑음", "구름 조금", "흐림", "안개", "비", "눈", "소나기", "뇌우"])[k];
};
async function loadWeather() {
  const { lat, lon } = settings.home;
  const day = targetDay();
  const cached = settings.get().wx;
  if (cached && cached.day === day && cached.hi != null && Date.now() - cached.at < 3 * 3600e3) { weather = cached; return; }
  if (MOCK) { weather = { day, at: Date.now(), am: Number(QS.get("am") ?? 16), pm: Number(QS.get("pm") ?? 23), lo: Number(QS.get("am") ?? 16) - 3, hi: Number(QS.get("pm") ?? 23) + 1, rain: Number(QS.get("rain") ?? 10), code: 2 }; return; }
  try {
    const u = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,precipitation_probability&daily=weather_code,temperature_2m_min,temperature_2m_max&timezone=auto&forecast_days=2`;
    const d = await (await fetch(u)).json();
    const hrs = d.hourly.time.map((tm, i) => ({ h: Number(tm.slice(11, 13)), day: tm.slice(0, 10), temp: d.hourly.temperature_2m[i], p: d.hourly.precipitation_probability[i] })).filter((h) => h.day === day);
    const win = (a, b) => hrs.filter((h) => h.h >= a && h.h <= b);
    const avg = (l) => Math.round(l.reduce((s, h) => s + h.temp, 0) / l.length);
    const am = win(7, 9), pm = win(17, 19);
    if (!am.length || !pm.length) throw new Error("no hours");
    const di = Math.max(0, d.daily.time.indexOf(day));
    // 화면은 다른 날씨 앱처럼 하루 최저/최고, 추천 계산은 출퇴근 두 창(am·pm)
    weather = { day, at: Date.now(), am: avg(am), pm: avg(pm), lo: Math.round(d.daily.temperature_2m_min[di]), hi: Math.round(d.daily.temperature_2m_max[di]), rain: Math.max(...win(7, 19).map((h) => h.p ?? 0)), code: d.daily.weather_code[di] };
    settings.set({ wx: weather });
  } catch { weather = null; }
}

// ─────────────────────────────────────────── 오늘 (추천)
// 슬롯: 필수 = 아우터(아침 17° 미만)·상의·하의·신발 (원피스 = 상의+하의). 선택 = 가방 + 액세서리 묶음.
const ACC_GROUP = { earring: "earring", necklace: "neck", scarf: "neck", bracelet: "wrist", ring: "wrist", socks: "socks", gloves: "gloves", hair: "hair", belt: "belt", hat: "hat" };
// 입는 방식(layer_role): base = 상의로만 · outer = 걸쳐서만(가디건이어도 겉옷 자리) · mid = 둘 다(그날 조합에 따라 자리가 정해짐)
const isFlex = (i) => i.category === "top" && i.layer_role === "mid";
const slotOf = (i) => i.category === "dress" ? "top" : i.category === "acc" ? "acc_" + (ACC_GROUP[i.acc_type] || "etc") : (i.category === "top" && i.layer_role === "outer") ? "outer" : i.category;
// 한 조합 안에서 각 옷의 자리. 상의가 둘이고 겉옷이 없으면 "둘 다" 옷이 겉옷 자리로 간다.
function roles(ids) {
  const its = [...new Set(ids)].map(byId).filter(Boolean); const m = new Map(its.map((i) => [i.id, slotOf(i)]));
  const tops = its.filter((i) => m.get(i.id) === "top"); const hasOuter = its.some((i) => m.get(i.id) === "outer");
  if (tops.length === 2 && !hasOuter) { const f = [...tops].reverse().find(isFlex); if (f) m.set(f.id, "outer"); }
  return m;
}
const slotIn = (ids, i) => roles(ids).get(i.id) || slotOf(i);
const CORE = ["outer", "top", "bottom", "shoes"];
const EXTRA = ["bag", "acc_earring", "acc_neck", "acc_wrist", "acc_socks", "acc_gloves"];
const OCCS = ["dinner", "interview", "concert", "party"];
const BARE_WRIST = ["short", "sleeveless", "three_quarter", "cap"];
const sid = (i) => i.import_id || i.id.slice(0, 8);
let occ = settings.get().occ || "dinner";
const needOuter = () => !!weather && weather.am < 17;
const isCold = () => !!weather && weather.am <= 8;
// 날짜: 오늘 또는 내일(밤에 내일 옷을 미리 준비). 저녁 8시가 지나면 내일부터 보여 줌.
let dayOff = new Date().getHours() >= 20 ? 1 : 0;
const targetDate = () => { const d = new Date(); d.setDate(d.getDate() + dayOff); return d; };
const targetDay = () => targetDate().toLocaleDateString("sv-SE");
const recKeyOf = (day) => `stylist.rec.${day}.${tpo}${tpo === "special" ? "." + occ : ""}`;
// 색 정해서 고르기: 그날 그 상황에만. 색을 고른 추천은 따로 저장해서 ×를 누르면 평소 추천이 그대로 돌아온다.
const colorKey = () => `stylist.color.${targetDay()}.${tpo}${tpo === "special" ? "." + occ : ""}`;
const colorsNow = () => { try { return (localStorage.getItem(colorKey()) || "").split(",").filter((k) => FAM_ORDER.includes(k)); } catch { return []; } };
const setColors = (ks) => { try { ks.length ? localStorage.setItem(colorKey(), ks.join(",")) : localStorage.removeItem(colorKey()); } catch {} };
const recKey = () => { const c = colorsNow(); return recKeyOf(targetDay()) + (c.length ? ".c-" + c.join("-") : ""); };
const famNames = (ks) => ks.map((k) => t("fams")[k]).join(" + ");
const withRo = (w) => { if (lang === "en") return w; const c = w.charCodeAt(w.length - 1) - 0xac00, j = c >= 0 && c < 11172 ? c % 28 : 0; return w + (j && j !== 8 ? "으로" : "로"); };
const colorHit = (o, keys) => keys.every((k) => CORE.some((s) => { const i = itemIn(o, s); return i && famOf(i) === k; }));

function candidates() {
  return items.filter((i) => {
    if (i.status !== "active" || i.recommend === "never" || i.recommend === "on_request") return false;
    if (i.recommend === "special_only" && tpo !== "special") return false;
    if (tpo === "work" && !i.formality_work) return false;
    if (tpo === "out" && !i.formality_out) return false;
    const s = slotOf(i);
    if (s === "acc_hair" || s === "acc_etc" || s === "acc_belt" || s === "acc_hat") return false;
    if (s === "acc_gloves" && !isCold()) return false;
    if (weather && i.warmth != null && CORE.includes(s)) {
      if (weather.pm >= 24 && i.warmth >= 4) return false;
      if (weather.am <= 8 && i.warmth <= 1) return false;
    }
    return true;
  });
}
const pool = (slot, curId) => candidates().filter((i) => (slotOf(i) === slot || (slot === "outer" && isFlex(i))) && i.id !== curId);
const itemIn = (o, slot) => { const r = roles(o.items); return o.items.map(byId).find((i) => i && r.get(i.id) === slot); };
const comboKey = (ids) => ids.map(byId).filter((i) => i && CORE.includes(slotOf(i))).map((i) => i.id).sort().join("|");

// 다리: 양말 · 스타킹 · 맨살 중 하나. 양말은 옷장의 옷, 스타킹은 사진 없이 종류만(가진 것 네 가지).
// 치마·원피스에 양말이 없으면 아침 기온으로 스타킹을 고른다. 직접 고른 값(o.legs)이 있으면 그대로.
const HOSE = ["nude", "black_sheer", "black_opaque", "black_fleece"];
const shoeKind = (i) => { const s = i ? [i.subtype, i.subtype_en, i.name, i.name_en].filter(Boolean).join(" ") : ""; return /샌들|sandal|슬리퍼|slide|플립|flip/i.test(s) ? "open" : /뮬|mule|슬링백|sling/i.test(s) ? "mule" : "closed"; };
const isSkirt = (b) => !!b && ((!!b.skirt_type && b.skirt_type !== "none") || /스커트|치마|skirt/i.test([b.subtype, b.subtype_en, b.name].filter(Boolean).join(" ")));
const showsLeg = (o) => itemIn(o, "top")?.category === "dress" || isSkirt(itemIn(o, "bottom"));
const rgbOf = (i) => { const m = /^#?([0-9a-f]{6})$/i.exec(i?.color_hex || ""); if (!m) return null; const n = parseInt(m[1], 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
const colorGap = (a, b) => { const x = rgbOf(a), y = rgbOf(b); return x && y ? Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]) : 999; };
const isDark = (i) => { const m = /^#?([0-9a-f]{6})$/i.exec(i?.color_hex || ""); if (!m) return false; const n = parseInt(m[1], 16); return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255 < 0.3; };
// 덧신(신으면 안 보이는 양말)은 옷장에 등록하지 않고 종류만. 부츠가 아닌 막힌 신발에만.
const lowShoe = (i) => !!i && shoeKind(i) === "closed" && !/부츠|boot|워커/i.test([i.subtype, i.subtype_en, i.name, i.name_en].filter(Boolean).join(" "));
const ankleCut = (b) => !!b && !isSkirt(b) && (b.length === "crop" || (b.length_cm != null && b.length_cm <= 88));
// 발목 길이 바지 + 로퍼·스니커즈 + 아침 17° 이상이면 양말 대신 덧신
const footieAuto = (shoes, bottom) => lowShoe(shoes) && ankleCut(bottom) && !!weather && weather.am >= 17;
function legsOf(o) {
  if (itemIn(o, "acc_socks")) return "socks";
  const shoes = itemIn(o, "shoes"); const am = weather ? weather.am : 16;
  const pick = o.legs && o.legs !== "socks" && !(o.legs === "footie" && !lowShoe(shoes)) ? o.legs : null;
  if (!showsLeg(o)) return pick === "footie" || footieAuto(shoes, itemIn(o, "bottom")) ? "footie" : null;   // 바지: 덧신 아니면 양말 칸 그대로
  if (pick) return pick;
  if (shoeKind(shoes) === "open") return "bare";
  if (am >= 20) return lowShoe(shoes) ? "footie" : "bare";
  if (am <= 4) return "black_fleece";
  if (am <= 11) return "black_opaque";
  if (tpo === "special" && occ === "interview") return "nude";
  return isDark(shoes) && isDark(itemIn(o, "bottom") || itemIn(o, "top")) ? "black_sheer" : "nude";
}

// 액세서리 규칙(룰북 §4)은 모델에 맡기지 않고 앱이 강제한다.
function fixAccessories(ids, legs) {
  const its = [...new Set(ids)].map(byId).filter(Boolean);
  const core = its.filter((i) => !slotOf(i).startsWith("acc_"));
  let acc = its.filter((i) => slotOf(i).startsWith("acc_") && candidates().includes(i));
  const seen = new Set(); acc = acc.filter((a) => { const g = slotOf(a); if (seen.has(g)) return false; seen.add(g); return true; });
  const rl = roles(core.map((i) => i.id));
  const body = core.find((i) => rl.get(i.id) === "top");
  const dress = body?.category === "dress";
  const bare = !!body && BARE_WRIST.includes(body.sleeve);
  const get = (g) => acc.find((a) => slotOf(a) === g);
  const drop = (g) => { acc = acc.filter((a) => slotOf(a) !== g); };
  const interview = tpo === "special" && occ === "interview";
  const shoesIt = core.find((i) => slotOf(i) === "shoes"); const bottomIt = core.find((i) => rl.get(i.id) === "bottom");
  if (shoeKind(shoesIt) !== "closed") drop("acc_socks");   // 샌들·뮬에는 양말 없음
  else if (legs && legs !== "socks") drop("acc_socks");    // 직접 고른 덧신·스타킹·맨살
  else if (legs !== "socks" && footieAuto(shoesIt, bottomIt)) drop("acc_socks");   // 덧신 신는 날
  else if (shoesIt && bottomIt && !isSkirt(bottomIt) && !get("acc_socks")) {               // 바지 + 막힌 신발이면 양말은 꼭 (바지 색에 가까운 것)
    const sk = pool("acc_socks").sort((a, b) => colorGap(a, bottomIt) - colorGap(b, bottomIt))[0];
    if (sk) acc.push(sk);
  }
  const plainFirst = (l) => [...l].sort((a, b) => (a.pattern === "solid" ? 0 : 1) - (b.pattern === "solid" ? 0 : 1));
  if (bare) {                                   // 손목이 보이면 팔찌는 꼭
    const w = get("acc_wrist");
    if (!w || w.acc_type !== "bracelet") {
      const ear = get("acc_earring");
      let br = pool("acc_wrist").filter((i) => i.acc_type === "bracelet");
      if (interview) br = plainFirst(br);
      const day = new Date().getDate();
      const same = br.filter((b) => ear && b.metal && b.metal === ear.metal);
      const pickB = same[0] || br[br.length ? day % br.length : 0];
      if (pickB) { drop("acc_wrist"); acc.push(pickB); }
    }
  }
  const needEar = () => { if (!get("acc_earring")) { const e = plainFirst(pool("acc_earring"))[0]; if (e) acc.push(e); } };
  if (interview) { drop("acc_neck"); needEar(); if (!bare) drop("acc_wrist"); }
  else if (dress) {                             // 원피스: 하나만. 손목이 보이면 귀걸이 + 팔찌
    if (bare) { needEar(); drop("acc_neck"); }
    else { const keep = get("acc_earring") || get("acc_neck") || get("acc_wrist"); ["acc_earring", "acc_neck", "acc_wrist"].forEach((g) => { if (!keep || slotOf(keep) !== g) drop(g); }); }
  }
  return [...core.map((i) => i.id), ...acc.map((i) => i.id)];
}

function validOutfit(o) {
  const its = o.items.map(byId);
  if (its.some((i) => !i || i.status !== "active")) return false;
  const rl = roles(o.items); const slots = its.map((i) => rl.get(i.id));
  if (new Set(slots).size !== slots.length) return false;          // 같은 칸에 둘
  const has = (s) => slots.includes(s);
  const dress = its.some((i) => i.category === "dress");
  if (!has("top") || !has("shoes")) return false;
  if (dress ? has("bottom") : !has("bottom")) return false;
  if (needOuter() && !has("outer") && pool("outer").length) return false;
  // 가디건(둘 다)을 상의로 입고 그 위에 겉옷을 또 입는 조합은 추운 날에만
  if (!isCold() && has("outer") && its.some((i) => isFlex(i) && rl.get(i.id) === "top")) return false;
  if (rec?.pin && !o.items.includes(rec.pin)) return false;
  return true;
}
const coreDiff = (a, b) => CORE.filter((s) => (itemIn(a, s)?.id || null) !== (itemIn(b, s)?.id || null));
// 반복 금지: 앞뒤 5일 안에 "입을게요"로 기록한 옷 중 상의·하의(원피스 포함)는 후보에서 뺀다. 아우터·신발은 겹쳐도 된다.
// "입을게요"를 누르지 않은 추천은 입지 않은 것으로 본다. "전부 다시 골라 줘"로 본 조합과는 2칸 이상 달라야 한다(tooClose).
const REPEAT_DAYS = 5;
const tooClose = (o, ids) => coreDiff(o, { items: ids }).length < 2;
function takenNear(logRows) {
  const T = targetDay(); const near = (day) => day !== T && Math.abs(new Date(day) - new Date(T)) / 864e5 <= REPEAT_DAYS;
  const out = (logRows || []).filter((r) => near(r.worn_on)).map((r) => r.items || []);
  // 방금 누른 "입을게요"는 5초 뒤에 기록되므로, 그 사이에는 표시해 둔 값을 쓴다
  const [day, ...ids] = String(settings.get().worn || "").split("|");
  if (day && ids.length && near(day)) out.push(ids);
  return out.filter((ids) => ids.some(byId));
}
function wornTopsBottoms() {
  const out = new Set();
  takenNear(wears).forEach((ids) => { const r = roles(ids); ids.forEach((id) => { const s = r.get(id); if (s === "top" || s === "bottom") out.add(id); }); });
  return out;
}

const TPO_EN = { work: "office day (relaxed dress code; Operations role, mostly seated)", out: "weekend outing", special: "special occasion" };
const OCC_EN = {
  dinner: "a nice dinner: a dress or a top with sheen, gold accessories; shoes set the formality (sneakers lose points); the outer comes off on arrival",
  interview: "a job interview: neat vertical lines (tie blouse or shirt with one-tuck slacks or a below-knee skirt), minimal pattern, base colors, closed-toe shoes",
  concert: "a concert: long sitting, so comfortable bottoms; lift the register with the top or a scarf; dark hall, so a light base color near the face",
  party: "an office party: the safe work outfit plus ONE thing with sheen or one accessory",
};
const STYLE_RULES = `
HOW TO WRITE (very important — the client reads this tired, on a phone):
- reason_ko: 2 short sentences in plain, warm Korean (해요체). Sentence 1 = what this outfit does for how she looks. Sentence 2 = why it suits today's weather or occasion.
- tip_ko: ONE short action she can do (e.g. "블라우스는 앞자락만 바지에 넣어요").
- One idea per sentence. No jargon: never write body-type labels, ratios like 3:7, BEST, 완충, 톤온톤, 실루엣, 세로선. Say instead "다리가 길어 보여요", "얼굴에 잘 받아요", "어깨가 넓어 보여서 하체가 덜 도드라져요", "골드 귀걸이를 해요".
- Tentative tone ("~해 보여요"). Never "예쁘다".
- reason_en / tip_en: the same content in plain English.`;
// 코디 이유·요령의 정확성 규칙 (2026-09-28, 사용자 승인) — 추천과 다시 평가에만 씀
const OUTFIT_RULES = `
ACCURACY OF THE REASON AND TIP (check every sentence against the items before you answer):
- Credit an effect only to the item that really produces it. Shoulders look squarer because of a jacket's shoulder line or structure. A tie, a V-neck or a long necklace draws a line down the middle of the chest; it does nothing for the shoulders.
- Write "다리가 길어 보여요" ONLY when this outfit has a concrete cause: a high waistline that stays visible (top tucked or cropped), bottom and shoes close in color, or shoes that continue the leg. Never write it when light or bulky shoes sit under dark trousers.
- You cannot see her wearing it. Do not state warmth or comfort as fact; say which piece covers the morning temperature and, if the afternoon is much warmer, that it can come off.
- Tip, in this order of priority:
  1. If a piece near the face (top, upper part of a dress, scarf, an outer worn closed) is in a color her profile lists to avoid, the tip is how to soften it: gold earrings, a camel or oatmeal scarf, or an ivory layer inside. Prefer adding such a piece from the candidates to the outfit itself.
  2. If the outer is long enough to cover the hip (length "long", or clearly longer than her best short-outer length), the tip is to wear it open so the waistline shows.
  3. Otherwise any one styling action.
  When both 1 and 2 apply, the tip may be two short sentences, one for each. Otherwise keep it to one.`;

function candLine(i) {
  const d = (i.design_lines || []).filter((x) => x && x !== "none").join("/");
  return [sid(i), isFlex(i) ? "top|outer" : slotOf(i), i.name, i.subtype, `${i.color_name || ""}(${i.color_tone || "?"})`, i.pattern, i.length_cm ? `${i.length}·${i.length_cm}cm` : i.length, i.sleeve && `소매 ${i.sleeve}`, i.silhouette, i.neckline && `목선 ${i.neckline}`, i.warmth != null && `두께 ${i.warmth}`, i.heel_cm != null && `굽 ${i.heel_cm}cm`, i.metal, i.material || i.material_guess, d && `디자인 ${d}`, i.tuck && `${i.tuck}-tuck`, i.skirt_type, i.collar_type && `카라 ${i.collar_type}`, i.rain && "비OK", i.fit_note, i.condition_note, `최근 ${i.last_worn_on || "기록 없음"}`, i.styling_note_ko || i.notes].filter(Boolean).join(" | ");
}
async function askStylist(kind, payload, prompt) {
  if (MOCK) { const m = await import("./mock.js"); return m.ai(kind, payload); }
  return gemini([{ text: prompt }]);
}
async function recommend({ pin = null, avoid = [] } = {}) {
  const worn = wornTopsBottoms();
  const cand = candidates().filter((i) => !worn.has(i.id) || i.id === pin?.id);
  const have = (c) => cand.some((i) => slotOf(i) === c);
  const lack = ["top", "shoes"].filter((c) => !have(c)); if (!have("bottom") && !cand.some((i) => i.category === "dress")) lack.push("bottom");
  if (lack.length) return { error: t("lack")(lack.map((s) => t("slot")[s]).join("·")) };
  const colors = colorsNow();
  const inColor = (k) => cand.filter((i) => CORE.includes(slotOf(i)) && famOf(i) === k);
  const noCol = colors.find((k) => !inColor(k).length);
  if (noCol) return { error: t("color").none(t("fams")[noCol]) };
  if (!PROFILE) await loadProfile();
  if (!PROFILE) return { error: t("noProfile") };
  const [{ data: recentWear }, { data: banned }, { data: saved }, { data: rated }] = await Promise.all([
    sb.from("wear_log").select("*").gte("worn_on", new Date(Date.now() - 14 * 864e5).toLocaleDateString("sv-SE")),
    sb.from("outfits").select("items").eq("banned", true),
    sb.from("outfits").select("items").eq("saved", true),
    sb.from("wear_log").select("*").not("rating", "is", null).order("worn_on", { ascending: false }).limit(40),   // 후기 칸이 아직 없으면 빈 값
  ]);
  const reviews = live(rated).filter((r) => r.rating);
  const short = (rows) => (rows || []).map((r) => (r.items || []).map((x) => { const it = byId(x); return it ? sid(it) : null; }).filter(Boolean));
  const known = new Set([...live(recentWear), ...(saved || [])].map((r) => comboKey(r.items || [])));
  const bannedKeys = new Set([...(banned || []), ...reviews.filter((r) => r.rating === "bad")].map((r) => comboKey(r.items || [])));
  const taken = [...avoid];
  const takenKeys = new Set([...takenNear(live(recentWear)), ...avoid].map(comboKey));
  const coreSids = (ids) => ids.map(byId).filter((i) => i && CORE.includes(slotOf(i))).map(sid);
  const taste = (saved || []).filter((r) => !takenKeys.has(comboKey(r.items || [])));
  const wx =weather ? `${dayOff ? "Tomorrow" : "Today"} (${targetDay()}) in ${settings.home.name}: commute 07–09h ${weather.am}°C, return 17–19h ${weather.pm}°C, rain up to ${weather.rain}%.` : "Weather forecast unavailable.";
  const colorRule = colors.length ? `COLOR OF THE DAY — she chose ${colors.map((k) => T.fams.en[k]).join(" and ")}. EVERY outfit (safe, vary and dare) must have ${colors.length > 1 ? "each of these colors" : "this color"} in at least one of outer / top / bottom (or dress) / shoes; outfits without it are discarded. Make it the color the outfit is built around and say so in sentence 1 of the reason. Candidates in ${colors.length > 1 ? "these colors" : "this color"}: ${colors.map((k) => `${T.fams.en[k]}: ${inColor(k).map(sid).join(", ")}`).join("; ")}. If a chosen color is one her profile says to avoid near the face, put it on the bottom, shoes or an outer worn open — not on the top.` : "";
  const ask = (no) => askStylist("recommend", { cand, pin, avoid: no.map(coreSids), tpo, occ, needOuter: needOuter(), sid, slotOf, colors, famOf }, `${PROFILE}
${STYLE_RULES}
${OUTFIT_RULES}

You are the client's personal stylist. Build outfits ONLY from the candidate list (use the id in the first column exactly).
Occasion: ${tpo === "special" ? OCC_EN[occ] : TPO_EN[tpo]}. ${wx}
Each outfit = one top, one bottom, one shoes${needOuter() ? ", one outer (morning is under 17°C)" : ", outer only if useful"}. A dress (slot "top", category dress) replaces top+bottom: then include NO bottom.
Items marked top|outer (cardigans) can be worn EITHER as the top OR thrown on over another top as the outer. When one is the outer, list it together with a separate top and do NOT add another outer. ${isCold() ? "It is cold, so a top|outer item may also go under a coat." : "NEVER combine a top|outer item with a blazer, jacket or coat today — such outfits are discarded."} Items in slot outer are never the only top.
Optional: one bag, and accessories — at most one per group: acc_earring, acc_neck (necklace or scarf), acc_wrist (bracelet or ring), acc_socks${isCold() ? ", acc_gloves" : ""}. One eye-catching piece per outfit; match metal colors.
Legs: with trousers and closed shoes ALWAYS include one acc_socks item that suits the trousers and shoes${weather && weather.am >= 17 ? " — except ankle-length trousers with loafers or sneakers, where she wears no-show socks: leave socks out" : ""}. With a skirt or dress, include acc_socks ONLY when visible socks suit the shoes (sneakers, loafers, ankle boots); otherwise leave socks out — the app adds stockings, no-show socks or bare legs by temperature. Never socks with sandals or mules.
${weather && weather.rain >= 40 ? "Rain is likely: avoid suede, light canvas and sandals; prefer items marked 비OK; avoid floor-length hems." : ""}
${pin ? `MUST include item ${sid(pin)} (${pin.name}) in every outfit.` : ""}
${colorRule}
Priority: her own signals (saved outfits, swaps) > weather and occasion > the body and color rules. Rules only rank; they never forbid.
Saved combinations (her taste: the "safe" card follows this style, but is a fresh outfit, not a copy): ${JSON.stringify(short(taste).slice(0, 30))}.
Never output these banned combinations: ${JSON.stringify(short(banned))}.
${reviews.length ? `Her own reviews after wearing — the strongest signal, notes are in Korean. "bad": never return that combination and avoid what the note complains about. "good": build on what worked. ${JSON.stringify(reviews.map((r) => ({ items: coreSids(r.items || []), rating: r.rating, note: r.note ? String(r.note).slice(0, 200) : undefined })))}.` : ""}
Tops, bottoms and dresses she wore in the last few days are already left out of the candidates; outers and shoes may repeat.
${no.length ? `These outfits were just shown to her. EVERY outfit you return must differ from EACH of them in at least TWO of outer/top/bottom/shoes: ${JSON.stringify(no.map(coreSids))}.` : ""}

Return JSON only:
{"outfits":[
 {"kind":"safe","items":["id",...],"score":0-100,"top":44-56,"reason_ko":"","reason_en":"","tip_ko":"","tip_en":""},
 {"kind":"vary", ...},
 {"kind":"dare", ...}
]}
safe = her proven formula. vary = the safe outfit with EXACTLY ONE of outer/top/bottom/shoes changed. dare = at least TWO of those changed, a pairing she has not worn; if nothing passes the rules, use null for dare.
score = structure 60 (length, proportion, shoulder, hip balance, collar) + color near the face 20 + occasion and weather 20. Similar outfits must score within ±3. top = estimated upper-body share of visual weight in % (50 is the target).

Candidates (id | slot | name | type | color(tone) | pattern | length | ... | how she wears it):
${cand.map(candLine).join("\n")}`);
  const bySid = new Map(cand.map((i) => [sid(i), i.id]));
  const norm = (o) => o && ({ kind: o.kind, score: Number(o.score) || null, top: Math.min(60, Math.max(40, Number(o.top ?? o.gauge_top) || 50)),
    reason: { ko: o.reason_ko || o.reason || "", en: o.reason_en || "" }, tip: { ko: o.tip_ko || "", en: o.tip_en || "" },
    items: [...new Set((o.items || []).map((s) => bySid.get(String(s).trim())).filter(Boolean))] });
  rec = { outfits: [], main: 0, pin: pin?.id || null };               // validOutfit이 핀을 보도록 먼저 둠
  // 모델이 반복 금지를 어기면 앱이 버리고, 버린 조합을 알려 주며 한 번 더 묻는다.
  let list = [], repeated = [];
  for (let n = 0; n < 2 && !list.some(Boolean); n++) {
    const out = await ask([...taken, ...repeated]);
    const ok = (out.outfits || []).map(norm).map((o) => o && { ...o, items: fixAccessories(o.items) }).map((o) => (o && validOutfit(o) && !bannedKeys.has(comboKey(o.items)) && colorHit(o, colors) ? o : null));
    list = ok.map((o) => (o && !taken.some((ids) => tooClose(o, ids)) ? o : null));
    repeated = ok.filter((o, i) => o && !list[i]).map((o) => o.items);
  }
  const safe = list.find((o) => o && o.kind === "safe") || list.find(Boolean);
  if (!safe) return { error: colors.length && !repeated.length ? t("color").fail : t(repeated.length ? "noNew" : "noCombo") };
  safe.kind = "safe";
  // 변주 = 안전과 정확히 1칸 차이, 도전 = 2칸 이상 + 해 본 적 없는 조합. 어기면 그 카드는 비움.
  const vary = list.find((o) => o && o !== safe && coreDiff(o, safe).length === 1) || null;
  const dare = list.find((o) => o && o !== safe && o !== vary && coreDiff(o, safe).length >= 2 && !known.has(comboKey(o.items))) || null;
  if (vary) vary.kind = "vary"; if (dare) dare.kind = "dare";
  return { outfits: [safe, vary, dare], main: 0, pin: pin?.id || null, avoid, colors, made: Date.now() };
}

async function renderToday() {
  const body = $("td-body");
  if (!weather || weather.day !== targetDay()) await loadWeather();
  await loadWears();
  if (!items.length) { body.innerHTML = headHtml() + `<div class="empty"><b>${t("emptyCloset")[0]}</b>${t("emptyCloset")[1]}</div>`; return bindHead(); }
  if (!rec) {
    try { rec = JSON.parse(localStorage.getItem(recKey())); } catch {}
    if (rec && !(rec.outfits || []).some((o) => o && o.items.every(byId))) rec = null;
    // 저장해 둔 추천에도 지금의 액세서리 규칙을 적용 (직접 바꾼 조합은 그대로)
    if (rec) rec.outfits.forEach((o) => { if (o && !o.edited && o.items.every(byId)) o.items = fixAccessories(o.items); });
    // 저장해 둔 추천이 요 며칠 입은 상의·하의를 쓰면 새로 고른다 (직접 바꿨거나 이미 입기로 한 건 그대로)
    const main = rec?.outfits?.[rec.main]; const worn = wornTopsBottoms();
    if (main && !main.edited && !isWorn(main) && main.items.some((id) => worn.has(id) && id !== rec.pin)) rec = null;
  }
  if (!rec) {
    if (!MOCK && !settings.key) { body.innerHTML = headHtml() + `<div class="empty"><b>${t("needKey")[0]}</b>${t("needKey")[1]}<button class="btn line" data-settings style="margin-top:12px">${t("needKey")[2]}</button></div>`; bindHead(); return; }
    body.innerHTML = headHtml() + `<div class="empty"><b>${t("making")[0]}</b>${t("making")[1](candidates().length)}</div>`; bindHead();
    const want = recKey();
    let r; try { r = await recommend(); } catch (e) { r = { error: e.message }; }
    if (want !== recKey()) return;                                   // 기다리는 사이 다른 탭으로 바꿈
    if (r.error) { rec = null; body.innerHTML = headHtml() + `<div class="empty"><b>${t("cant")}</b>${esc(r.error)}<button class="btn line" id="td-retry" style="margin-top:12px">${t("retry")}</button><button class="btn line" data-settings style="margin-top:8px">${t("needKey")[2]}</button></div>`; bindHead(); $("td-retry").onclick = () => renderToday(); return; }
    rec = r; persistRec();
  }
  drawRec();
}
function persistRec() { localStorage.setItem(recKey(), JSON.stringify(rec)); }

// 착용 후기: 입은 날부터 쓸 수 있고, 오늘 화면의 입기 버튼 아래와 "입은 기록"에서 보고 고친다.
let wears = [], wearsLoaded = false;
const RV = (k) => t("rv")[k];
const dayLabel = (s) => { const d = new Date(s + "T12:00:00"); return lang === "en" ? d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" }) : `${d.getMonth() + 1}월 ${d.getDate()}일 ${"일월화수목금토"[d.getDay()]}요일`; };
const coreOf = (ids) => (ids || []).map(byId).filter((i) => i && CORE.includes(slotOf(i)));
async function loadWears() {
  const { data } = await sb.from("wear_log").select("*").gte("worn_on", new Date(Date.now() - 14 * 864e5).toLocaleDateString("sv-SE")).order("worn_on", { ascending: false });
  wears = live(data);
}
// 아직 안 쓴 후기(오늘 + 지난 사흘)는 날짜를 붙여 물어본다. 이미 쓴 오늘 후기는 오늘 화면에만 — 내일 코디의 후기로 보이지 않게.
function reviewLines() {
  const today = todayStr();
  const rows = wears.filter((r) => (r.rating ? r.worn_on === today && dayOff === 0 : r.worn_on <= today && (new Date(today) - new Date(r.worn_on)) / 864e5 <= 3));
  return rows.map((r) => `<button class="rv" data-rv="${r.id}"><span>${r.rating ? `<b>${RV(r.rating)}</b>${r.note ? " · " + esc(r.note) : ""}` : RV("ask")(dayLabel(r.worn_on))}</span><em>${r.rating ? RV("edit") : RV("write")}</em></button>`).join("");
}
function openWearReview(row, after) {
  let rating = row.rating || null;
  openModal(`<h2>${RV("title")}</h2><p class="muted small">${dayLabel(row.worn_on)}</p>
    <div class="rv-th">${coreOf(row.items).map((i) => `<img src="${esc(thumbOf(i))}" alt="${esc(nameOf(i))}">`).join("")}</div>
    <div class="chips" id="rv-rate">${["good", "ok", "bad"].map((k) => `<button type="button" class="chip ${rating === k ? "on" : ""}" data-r="${k}">${RV(k)}</button>`).join("")}</div>
    <label class="field">${RV("memo")} <span class="muted">${RV("memoOpt")}</span><textarea id="rv-note" rows="3" maxlength="300" placeholder="${esc(RV("memoPh"))}">${esc(row.note || "")}</textarea></label>
    <button class="btn pri big" id="rv-save">${RV("save")}</button>`);
  $("rv-rate").querySelectorAll("[data-r]").forEach((b) => (b.onclick = () => { rating = b.dataset.r; $("rv-rate").querySelectorAll("[data-r]").forEach((x) => x.classList.toggle("on", x === b)); }));
  $("rv-save").onclick = async () => {
    if (!rating) return toast(RV("pick"));
    const patch = { rating, note: $("rv-note").value.trim() || null, reviewed_at: new Date().toISOString() };
    $("rv-save").disabled = true;
    const { error } = await sb.from("wear_log").update(patch).eq("id", row.id);
    if (error) { $("rv-save").disabled = false; return toast(t("saveFail") + error.message, 4000); }
    Object.assign(row, patch); const mine = wears.find((w) => w.id === row.id); if (mine) Object.assign(mine, patch);
    closeModal(); toast(RV(rating === "bad" ? "savedBad" : "saved"));
    if (after) after(); else if (!$("tab-today").hidden && rec) drawRec();
  };
}
// 입은 기록: 날마다 한 장(2×2 옷 + 가방·액세서리 + 다리 칸 + 후기). 옷장 머리말과 오늘 화면 두 곳에서 열고, 코디 추천과는 상관없이 바로 뜬다.
// 기온은 그날 실제 최저/최고(Open-Meteo, 최근 92일), 출근·외출과 다리 칸은 함께 저장된 코디(outfits)에서 읽는다.
let pastWx = null;
async function loadPastTemps() {
  if (pastWx) return pastWx;
  if (MOCK) return (pastWx = new Proxy({}, { get: (_, d) => typeof d === "string" && /^\d{4}-/.test(d) ? { lo: 8 + (Number(d.slice(-2)) % 5), hi: 15 + (Number(d.slice(-2)) % 4) } : undefined }));
  try {
    const { lat, lon } = settings.home;
    const d = await (await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_min,temperature_2m_max&timezone=auto&past_days=92&forecast_days=1`)).json();
    pastWx = {}; d.daily.time.forEach((day, i) => { pastWx[day] = { lo: Math.round(d.daily.temperature_2m_min[i]), hi: Math.round(d.daily.temperature_2m_max[i]) }; });
  } catch { pastWx = {}; }
  return pastWx;
}
async function openWearLog() {
  const { data, error } = await sb.from("wear_log").select("*").order("worn_on", { ascending: false }).limit(60);
  if (error) return toast(RV("loadFail"));
  const rows = live(data).filter((r) => r.worn_on <= todayStr());
  const oids = [...new Set(rows.map((r) => r.outfit_id).filter(Boolean))];
  const [{ data: outs }, wx] = await Promise.all([oids.length ? sb.from("outfits").select("id, tpo, gauge").in("id", oids) : Promise.resolve({ data: [] }), loadPastTemps()]);
  const ofit = new Map((outs || []).map((o) => [o.id, o]));
  await signUrls(rows.flatMap((r) => (r.items || []).map(byId).filter(Boolean).flatMap((i) => [i.thumb_path, i.cut_path])).filter(Boolean));
  const tpoName = (o) => !o ? "" : o.tpo === "formal" ? t("occ")[o.gauge?.occ] || t("tpo").special : t("tpo")[o.tpo] || "";
  const month = (d) => lang === "en" ? new Date(d + "T12:00:00").toLocaleDateString("en-GB", { month: "long" }) : `${Number(d.slice(5, 7))}월`;
  const card = (r) => {
    const o = ofit.get(r.outfit_id); const set = { items: (r.items || []).filter(byId) };
    const dress = itemIn(set, "top")?.category === "dress";
    const cellsOf = ["outer", "top", ...(dress ? [] : ["bottom"]), "shoes"].map((s) => itemIn(set, s)).filter(Boolean);
    const extras = EXTRA.map((s) => itemIn(set, s)).filter(Boolean);
    const lg = o?.gauge?.legs && o.gauge.legs !== "socks" ? t("legs")[o.gauge.legs]?.[2] : "";
    const w = wx[r.worn_on]; const tp = tpoName(o);
    return `<button class="wcard" data-w="${r.id}">
      <div class="hd"><b>${dayLabel(r.worn_on).replace(/(\d+)/g, '<span class="n">$1</span>')}${tp ? " · " + esc(tp) : ""}</b>${w ? `<span class="wt n">${w.lo}°<small>/</small>${w.hi}°</span>` : ""}</div>
      <div class="sheet2">${cellsOf.map((i) => { const cut = i.cut_path && urlCache.get(i.cut_path); return `<div><div class="ph">${thumbOf(i) ? `<img class="${cut ? "cut" : "raw"}" src="${esc(thumbOf(i))}" alt="" loading="lazy">` : ""}</div><div class="nm">${esc(nameOf(i))}</div></div>`; }).join("")}</div>
      ${extras.length || lg ? `<div class="wacc">${extras.map((i) => `<img src="${esc(thumbOf(i))}" alt="${esc(nameOf(i))}" loading="lazy">`).join("")}${lg ? `<span class="legs">${esc(lg)}</span>` : ""}</div>` : ""}
      ${r.rating ? `<div class="wrv"><span class="r ${r.rating}">${RV(r.rating)}</span>${r.note ? `<span class="m">${esc(r.note)}</span>` : ""}</div>` : `<div class="wrv ask">${RV("write")}</div>`}
    </button>`;
  };
  let html = "", last = "";
  rows.forEach((r) => { const m = r.worn_on.slice(0, 7); if (m !== last) { html += `<p class="wmonth">${month(r.worn_on)}</p>`; last = m; } html += card(r); });
  openModal(`<div class="page-head"><button class="back" id="wl-back" aria-label="${t("back")}">${icon("i-back")}</button><div class="h1">${RV("log")}</div>${rows.length ? `<span class="wl-n">${t("wlCount")(rows.length)}</span>` : ""}</div>
    ${rows.length ? `<div class="wlog">${html}</div>` : `<p class="muted small" style="padding:16px 0">${RV("none")}</p>`}`, "page");
  $("wl-back").onclick = closeModal;
  $("modal").querySelectorAll("[data-w]").forEach((b) => (b.onclick = () => openWearReview(rows.find((r) => String(r.id) === b.dataset.w), () => { if (!$("tab-today").hidden && rec) drawRec(); openWearLog(); })));
}
function headHtml() {
  const d = targetDate();
  const date = lang === "en" ? d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" }) : `<b>${d.getMonth() + 1}</b>월 <b>${d.getDate()}</b>일 ${"일월화수목금토"[d.getDay()]}요일`;
  const wx = weather
    ? `<span class="t" title="${t("am")} ${weather.am}° · ${t("pm")} ${weather.pm}°">${weather.lo}°<small>/</small>${weather.hi}°</span> · ${WX_TXT(weather.code)} · ${t("rain")} <b>${weather.rain}%</b>`
    : t("noWx");
  const days = `<div class="dayseg">${[0, 1].map((k) => `<button data-day="${k}" class="${dayOff === k ? "on" : ""}">${t("days")[k]}</button>`).join("")}</div>`;
  return `<div class="top">${days}<button class="icon-btn gear" data-settings aria-label="${t("set").title}">${icon("i-gear")}</button></div>
    <div class="when"><div class="date">${date}</div><div class="wx">${wx}</div></div>
    <div class="segc full" id="td-tpo">${["work", "out", "special"].map((k) => `<button data-tpo="${k}" class="${tpo === k ? "on" : ""}">${t("tpo")[k]}</button>`).join("")}</div>
    ${tpo === "special" ? `<div class="occ">${OCCS.map((o) => `<button data-occ="${o}" class="${occ === o ? "on" : ""}">${t("occ")[o]}</button>`).join("")}</div>` : ""}`;
}
function bindHead() {
  const b = $("td-body");
  b.querySelectorAll("[data-tpo]").forEach((x) => (x.onclick = () => { if (tpo === x.dataset.tpo) return; tpo = x.dataset.tpo; rec = null; renderToday(); }));
  b.querySelectorAll("[data-occ]").forEach((x) => (x.onclick = () => { if (occ === x.dataset.occ) return; occ = x.dataset.occ; settings.set({ occ }); rec = null; renderToday(); }));
  b.querySelectorAll("[data-l]").forEach((x) => (x.onclick = () => setLang(x.dataset.l)));
  b.querySelectorAll("[data-day]").forEach((x) => (x.onclick = () => { const k = Number(x.dataset.day); if (k === dayOff) return; dayOff = k; rec = null; weather = null; renderToday(); }));
}
const LX = (v) => (v && typeof v === "object" ? (lang === "en" && v.en ? v.en : v.ko) : v) || "";
const icon = (id, cls = "i") => `<svg class="${cls}"><use href="#${id}"/></svg>`;

function slotCell(o, s, span) {
  const it = itemIn(o, s);
  if (!it) return `<div class="cell ${span ? "span" : ""}"><div class="slot empty-slot" data-slot="${s}"><span>${t("noOuter")}${weather ? ` · ${t("morning")} ${weather.am}°` : ""}</span><button data-add="${s}">${icon("i-plus", "i xs b")}${t("add")}</button></div><span class="k">${t("slot")[s]}</span></div>`;
  const pinned = rec.pin === it.id;
  const hue = !pinned && (rec.colors || []).includes(famOf(it)) ? t("fams")[famOf(it)] : "";   // 고른 색이 들어간 칸
  // 배경을 지운 사진은 여백을 두고, 원래 사진은 칸을 꽉 채움
  return `<div class="cell ${span ? "span" : ""}"><div class="slot photo" data-slot="${s}" data-id="${it.id}" role="button" tabindex="0" aria-label="${esc(nameOf(it))}"><div class="track"><img class="${it.cut_path && urlCache.get(it.cut_path) ? "cut" : "raw"}" src="${esc(thumbOf(it))}" alt=""></div></div><span class="k ${pinned || hue ? "pin" : ""}">${t("slot")[s]}${pinned ? " · " + t("pinMark") : hue ? " · " + hue : ""}</span><span class="nm">${esc(nameOf(it))}</span></div>`;
}
function cells(o) {
  const dress = itemIn(o, "top")?.category === "dress"; const list = [];
  if (needOuter() || itemIn(o, "outer")) list.push("outer");
  list.push("top"); if (!dress) list.push("bottom"); list.push("shoes");
  return list.map((s, i) => slotCell(o, s, list.length % 2 === 1 && i === list.length - 1)).join("");
}
function extrasHtml(o) {
  const shown = EXTRA.filter((s) => itemIn(o, s) || s === "bag" || (s !== "acc_gloves" && pool(s).length));
  return `<div class="extras">${shown.map((s) => {
    const it = itemIn(o, s); const ic = icon(s === "bag" ? "i-bag" : "i-gem", "i s");
    const lg = s === "acc_socks" ? legsOf(o) : null;
    if (lg && lg !== "socks") return `<button class="x legs" data-legs aria-label="${t("legs")[lg][2]}"><span class="ph lg-${lg}"></span><span class="k">${t("legs")[lg][0]}</span>${t("legs")[lg][1] ? `<span class="k2">${t("legs")[lg][1]}</span>` : ""}</button>`;
    const kind = it ? t("accTypes")[it.acc_type] || t("slot")[s] : t("slot")[s].split("·")[0].trim();
    if (!it) return `<button class="x none" data-xslot="${s}" aria-label="${t("slot")[s]} ${t("add")}"><span class="ph">${icon("i-plus", "i s")}</span><span class="k">${kind}</span></button>`;
    return `<button class="x" data-xslot="${s}" data-id="${it.id}" aria-label="${esc(nameOf(it))}"><span class="ph">${thumbOf(it) ? `<img src="${esc(thumbOf(it))}" alt="">` : ic}</span><span class="k ${rec.pin === it.id ? "pin" : ""}">${kind}</span></button>`;
  }).join("")}</div>`;
}
function drawRec() {
  const body = $("td-body");
  if (rec.main == null || !rec.outfits[rec.main]) rec.main = rec.outfits.findIndex(Boolean);
  const main = rec.outfits[rec.main]; const K = t("kind");
  if (!main) { body.innerHTML = headHtml() + `<div class="empty"><b>${t("allGone")}</b><button class="btn line" id="td-redo" style="margin-top:12px">${t("redo")}</button></div>`; bindHead(); $("td-redo").onclick = redo; return; }
  const alts = rec.outfits.map((o, i) => [o, i]).filter(([o, i]) => i !== rec.main && (o || i === 2));
  const wornKey = isWorn(main);
  const lackShoes = tpo === "special" && occ === "dinner" && itemIn(main, "shoes") && /sneaker|스니커|운동화/i.test((itemIn(main, "shoes").subtype || "") + (itemIn(main, "shoes").subtype_en || ""));
  const C = t("color"); const cols = rec.colors || [];
  const dot = (k) => { const i = byFam(clothesOf(items).filter((x) => famOf(x) === k))[0]; return `<i style="background:${esc(i?.color_hex || "#999")}"></i>`; };
  body.innerHTML = `${headHtml()}
    ${cols.length ? `<div class="ctag"><span class="sw">${cols.map(dot).join("")}</span>${esc(C.tag(withRo(famNames(cols))))}<button id="td-color-x" aria-label="${C.off}">${icon("i-x", "i xs b")}</button></div>` : ""}
    <div class="stage"><div class="stack" id="stack">${cells(main)}</div></div>
    ${extrasHtml(main)}
    <div class="acts"><button class="btn pri big ${wornKey ? "done" : ""}" id="td-wear" aria-pressed="${wornKey}" ${wornRow(main)?.rating ? "disabled" : ""}>${icon("i-check", "i s b")}${wornKey ? t("worn") : t("wear")}</button></div>
    ${reviewLines()}
    ${main.edited && main.tag ? `<div class="meta"><span>${t("edited")} · ${esc(LX(main.tag))}</span></div>` : ""}
    <div class="why">${esc(LX(main.reason))}</div>
    ${LX(main.tip) ? `<div class="why tipline">${esc(LX(main.tip))}</div>` : ""}
    <div class="alts"><h4>${t("alts")}</h4>${alts.map(([o, i]) => {
      if (!o) return `<div class="alt blank"><div class="th"><span class="ph"></span></div><div class="tx"><b>${K.dare} · ${t("dareEmpty")[0]}</b><span>${t("dareEmpty")[1]}</span></div></div>`;
      const d = coreDiff(o, main); const its = d.map((s) => itemIn(o, s)).filter(Boolean).slice(0, 3);
      const what = d.length >= 3 ? t("diffN")(d.length) : d.length ? t("diff")(d.map((s) => t("slot")[s]).join("·")) : t("diffAcc");
      return `<button class="alt" data-alt="${i}"><div class="th">${(its.length ? its : [itemIn(o, "top")]).map((x) => `<img src="${esc(thumbOf(x))}" alt="">`).join("")}</div><div class="tx"><b>${K[o.kind] || K.safe}${o.edited ? " · " + t("edited") : ""} · ${what}</b><span>${its.slice(0, 2).map((x) => esc(nameOf(x))).join(" · ")}${its.length > 2 ? " …" : ""}</span></div>${icon("i-chev", "i s go")}</button>`;
    }).join("")}</div>
    <button class="btn colorbtn" id="td-color"><span class="dots">${["red", "beige", "navy"].map(dot).join("")}</span>${C.btn}</button>
    <div class="tr"><button class="btn txt" id="td-redo">${t("redo")}</button><button class="btn txt" id="td-ban">${t("ban")}</button><button class="btn txt" id="td-log">${RV("log")}</button></div>
    ${lackShoes ? `<div class="gap"><b>${t("gap")[0]}</b><br>${t("gap")[1]}<br><button id="td-buy">${t("gap")[2]} ${icon("i-chev", "i xs")}</button></div>` : ""}`;
  bindHead();
  body.querySelectorAll("[data-alt]").forEach((b) => (b.onclick = () => { rec.main = Number(b.dataset.alt); persistRec(); drawRec(); window.scrollTo(0, 0); }));
  body.querySelectorAll(".slot.photo[data-slot]").forEach(bindGesture);
  body.querySelectorAll(".slot.photo[data-slot]").forEach((el) => (el.onkeydown = (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openItemSheet(el.dataset.slot, byId(el.dataset.id)); } }));
  body.querySelectorAll("[data-legs]").forEach((b) => (b.onclick = () => pickLegs()));
  body.querySelectorAll("[data-add]").forEach((b) => (b.onclick = () => swapTo(b.dataset.add, pool(b.dataset.add)[0])));
  body.querySelectorAll("[data-xslot]").forEach((b) => (b.onclick = () => (b.dataset.id ? openItemSheet(b.dataset.xslot, byId(b.dataset.id)) : pickExtra(b.dataset.xslot))));
  $("td-wear").onclick = wearMain; $("td-ban").onclick = banMain; $("td-redo").onclick = redo; $("td-log").onclick = openWearLog;
  $("td-color").onclick = openColorPick; const cx = $("td-color-x"); if (cx) cx.onclick = () => { setColors([]); rec = null; renderToday(); };
  body.querySelectorAll("[data-rv]").forEach((b) => (b.onclick = () => openWearReview(wears.find((w) => String(w.id) === b.dataset.rv))));
  const tb = $("td-buy"); if (tb) tb.onclick = () => showTab("judge");
}

// 옆으로 밀기 = 그 옷만 교체 (1:1 추적, 놓는 속도로 확정) · 누르기 = 크게 보기(바꾸기·고정·제외는 그 안에)
function bindGesture(el) {
  const s = el.dataset.slot; const track = el.querySelector(".track");
  let x0 = 0, y0 = 0, dx = 0, dy = 0, t0 = 0, on = false;
  el.addEventListener("pointerdown", (e) => { x0 = e.clientX; y0 = e.clientY; dx = dy = 0; t0 = performance.now(); on = true; el.setPointerCapture(e.pointerId); track.style.transition = "none"; });
  el.addEventListener("pointermove", (e) => { if (!on) return; dx = e.clientX - x0; dy = e.clientY - y0; if (Math.abs(dx) > 8) track.style.transform = `translateX(${dx * 0.9}px)`; });
  const end = (e) => { if (!on) return; on = false;
    const ms = performance.now() - t0; const vel = dx / Math.max(1, ms); const commit = Math.abs(dx) > 70 || Math.abs(vel) > 0.45;
    track.style.transition = "transform 220ms var(--ease-out)";
    if (e.type === "pointerup" && Math.abs(dx) < 8 && Math.abs(dy) < 8 && ms < 600) { track.style.transform = ""; return openItemSheet(s, byId(el.dataset.id)); }
    if (e.type !== "pointerup" || !commit) { track.style.transform = ""; return; }
    track.style.transform = `translateX(${dx < 0 ? -110 : 110}%)`; setTimeout(() => swap(s, dx < 0 ? 1 : -1), 150); };
  el.addEventListener("pointerup", end); el.addEventListener("pointercancel", end);
}
// 사진을 누르면: 원래 사진 크게 + 입는 법 + 바꾸기 · 고정 · 제외
function openItemSheet(s, it) {
  if (!it) return;
  const note = lang === "en" ? (it.styling_note_en || it.styling_note_ko) : (it.styling_note_ko || it.notes);
  const src = urlCache.get(it.thumb_path) || thumbOf(it); const pinned = rec.pin === it.id; const extra = !CORE.includes(s);
  openModal(`<div class="sheet-ph"><img src="${esc(src)}" alt=""></div>
    <p class="sheet-k">${t("slot")[s]}${it.brand ? " · " + esc(it.brand) : ""}</p>
    <h2 class="sheet-nm">${esc(nameOf(it))}</h2>
    ${note ? `<p class="sheet-note"><b>${t("howTo")}</b>${esc(note)}</p>` : ""}
    <button class="btn pri big" data-sh="swap">${t("change")}</button>
    <div class="modal-row sheet-row"><button class="btn line" data-sh="pin">${icon("i-pin", "i xs")}${pinned ? t("unpinBtn") : t("pinBtn")}</button>${extra ? `<button class="btn line" data-sh="off">${t("takeOff")}</button>` : `<button class="btn line" data-sh="pause">${icon("i-ban", "i xs")}${t("pause")}</button>`}</div>`, "sheet");
  const on = (k, fn) => { const b = $("modal").querySelector(`[data-sh="${k}"]`); if (b) b.onclick = () => { closeModal(); fn(); }; };
  on("swap", () => pickExtra(s)); on("pin", () => togglePin(it.id)); on("pause", () => pauseFromToday(it));
  on("off", () => { const main = rec.outfits[rec.main]; main.items = main.items.filter((id) => id !== it.id); main.edited = true; persistRec(); drawRec(); });
  if (s === "acc_socks") { const b = $("modal").querySelector('[data-sh="swap"]'); b.textContent = t(showsLeg(rec.outfits[rec.main]) ? "legsSwap" : "legsSwapT"); b.onclick = () => { closeModal(); pickLegs(); }; }
}
// 밀어서 나오는 순서 = 어울리는 순: 처음 추천된 옷 → 다른 안(변주·도전)에 나온 옷 → 처음 옷과 색이 가까운 순.
// 순서는 그 칸에서 처음 밀 때 한 번 정해 두고(main.swipe), 왼쪽으로 밀면 다음, 오른쪽으로 밀면 이전.
function swipeOrder(main, s, cur) {
  const saved = main.swipe?.[s];
  if (saved && (!cur || saved.includes(cur.id))) return saved;
  const alt = new Set(rec.outfits.filter((o) => o && o !== main).map((o) => itemIn(o, s)?.id).filter(Boolean));
  const rest = pool(s, cur?.id).map((x, n) => ({ x, n })).sort((a, b) => (alt.has(b.x.id) - alt.has(a.x.id)) || (colorGap(a.x, cur) - colorGap(b.x, cur)) || (a.n - b.n));
  const order = [...(cur ? [cur.id] : []), ...rest.map((r) => r.x.id)];
  main.swipe = { ...main.swipe, [s]: order };
  return order;
}
function swap(s, dir) {
  const main = rec.outfits[rec.main]; const cur = itemIn(main, s);
  if (cur && cur.id === rec.pin) { drawRec(); return toast(t("swapPin")); }
  const ok = new Set(pool(s, cur?.id).filter((x) => !main.items.includes(x.id)).map((x) => x.id));
  const order = swipeOrder(main, s, cur).filter((id) => ok.has(id) || id === cur?.id);
  if (!ok.size) { drawRec(); return toast(t("noSwap")); }
  const at = cur ? order.indexOf(cur.id) : -1;
  swapTo(s, byId(order[(at + (dir > 0 ? 1 : -1) + order.length * 2) % order.length]));
}
async function swapTo(s, next) {
  if (!next) return toast(t("noSwap"));
  const main = rec.outfits[rec.main]; const prev = itemIn(main, s);
  let ids = main.items.filter((id) => id !== prev?.id).concat(next.id);
  if (next.category === "dress") ids = ids.filter((id) => slotOf(byId(id)) !== "bottom");
  else if (s === "top" && !ids.some((id) => slotOf(byId(id)) === "bottom")) { const b = pool("bottom")[0]; if (b) ids.push(b.id); }
  // 상의였던 "둘 다" 옷이 겉옷 자리로 가서 상의가 비면 상의를 채움
  if (!ids.some((id) => slotIn(ids, byId(id)) === "top")) { const tp = pool("top").find((x) => !ids.includes(x.id) && !isFlex(x)); if (tp) ids.push(tp.id); }
  main.items = CORE.includes(s) ? fixAccessories(ids, main.legs) : ids;
  main.edited = true; main.tag = { ko: `${prev ? prev.name : t("none")} → ${next.name}`, en: `${prev ? nameOfEn(prev) : "None"} → ${nameOfEn(next)}` };
  if (!CORE.includes(s)) { persistRec(); return drawRec(); }        // 가방·액세서리는 다시 평가하지 않음
  main.score = null; main.reason = { ko: t("rescoring"), en: "Re-scoring…" }; main.tip = { ko: "", en: "" };
  persistRec(); drawRec();
  if (prev) sb.from("feedback").insert({ owner: me.id, kind: "swap", from_item: prev.id, to_item: next.id, context: { tpo, occ: tpo === "special" ? occ : null, day: targetDay(), slot: s } }).then(() => {});
  const key = comboKey(main.items);
  try {
    const its = main.items.map(byId).filter(Boolean);
    const r = await askStylist("score", { items: its }, `${PROFILE}\n${STYLE_RULES}\n${OUTFIT_RULES}\nOccasion: ${tpo === "special" ? OCC_EN[occ] : TPO_EN[tpo]}. ${weather ? `Commute ${weather.am}°C, return ${weather.pm}°C, rain ${weather.rain}%.` : ""}\nLegs: ${legsOf(main) && legsOf(main) !== "socks" ? t("legs")[legsOf(main)][3] : "socks or trousers"}. Score this outfit she put together herself. Items:\n${its.map(candLine).join("\n")}\nReturn JSON {"score":0-100,"top":44-56,"reason_ko":"","reason_en":"","tip_ko":"","tip_en":""}`);
    if (comboKey(main.items) !== key) return;
    Object.assign(main, { score: Number(r.score) || null, top: Math.min(60, Math.max(40, Number(r.top) || 50)), reason: { ko: r.reason_ko || "", en: r.reason_en || "" }, tip: { ko: r.tip_ko || "", en: r.tip_en || "" } });
  } catch (e) { main.reason = { ko: t("rescoreFail"), en: "Couldn't re-score." }; }
  persistRec(); if (!$("tab-today").hidden) drawRec();
}
const nameOfEn = (i) => i.name_en || i.name;
function pickLegs() {
  const main = rec.outfits[rec.main]; const cur = legsOf(main); const L = t("legs");
  const shoes = itemIn(main, "shoes"); const socks = shoeKind(shoes) === "closed" ? pool("acc_socks") : [];
  const foot = lowShoe(shoes) ? ["footie"] : [];
  const kinds = showsLeg(main) ? ["bare", ...foot, ...HOSE] : foot;          // 바지: 덧신 또는 양말
  openModal(`<h2>${t("legsTitle")}</h2><div class="list">${kinds.map((k) => `<button data-legs-k="${k}" class="${cur === k ? "on" : ""}"><span class="ph lg-${k}"></span><span>${L[k][2]}</span>${cur === k ? icon("i-check", "i s b") : ""}</button>`).join("")}${socks.map((i) => `<button data-id="${i.id}"><img src="${esc(thumbOf(i))}" alt="" loading="lazy"><span>${esc(nameOf(i))}</span></button>`).join("")}</div>`);
  $("modal").querySelectorAll("[data-legs-k]").forEach((b) => (b.onclick = () => { closeModal(); main.legs = b.dataset.legsK; main.items = main.items.filter((id) => slotOf(byId(id)) !== "acc_socks"); main.edited = true; persistRec(); drawRec(); }));
  $("modal").querySelectorAll("[data-id]").forEach((b) => (b.onclick = () => { closeModal(); main.legs = "socks"; swapTo("acc_socks", byId(b.dataset.id)); }));
}
function pickExtra(s) {
  const main = rec.outfits[rec.main]; const cur = itemIn(main, s); const pl = pool(s);
  openModal(`<h2>${t("slot")[s]}</h2><div class="list">${cur && !CORE.includes(s) ? `<button data-id="">${icon("i-x", "i s")}<span>${t("takeOff")}</span></button>` : ""}${pl.map((i) => `<button data-id="${i.id}" class="${cur?.id === i.id ? "on" : ""}"><img src="${esc(thumbOf(i))}" alt="" loading="lazy"><span>${esc(nameOf(i))}</span>${cur?.id === i.id ? icon("i-check", "i s b") : ""}</button>`).join("") || `<p class="muted small" style="padding:16px 0">${t("noSwap")}</p>`}</div>`);
  $("modal").querySelectorAll("[data-id]").forEach((b) => (b.onclick = () => {
    closeModal();
    if (!b.dataset.id) { main.items = main.items.filter((id) => id !== cur.id); main.edited = true; persistRec(); drawRec(); return s === "acc_socks" && showsLeg(main) ? pickLegs() : undefined; }
    if (cur && cur.id === rec.pin) return toast(t("swapPin"));
    if (b.dataset.id !== cur?.id) swapTo(s, byId(b.dataset.id));
  }));
}
async function regen(opts, waitMsg) {
  $("td-body").innerHTML = headHtml() + `<div class="empty"><b>${waitMsg}</b></div>`; bindHead();
  const want = recKey(); const old = rec;
  let r; try { r = await recommend(opts); } catch (e) { r = { error: e.message }; }
  if (want !== recKey()) return false;
  if (r.error) { rec = old; toast(r.error, 4000); if (rec) { persistRec(); drawRec(); } else renderToday(); return false; }
  rec = r; persistRec(); drawRec(); return true;
}
async function togglePin(id) {
  const it = byId(id); if (!it) return;
  if (rec.pin === id) { rec.pin = null; persistRec(); drawRec(); return toast(t("unpinned")); }
  const ok = await regen({ pin: it }, t("pinning")(nameOf(it)));
  if (ok) { toast(t("pinnedToast")(nameOf(it))); sb.from("feedback").insert({ owner: me.id, kind: "pin", to_item: it.id, context: { tpo, day: targetDay() } }).then(() => {}); }
}
async function redo() {
  // "다른 조합"은 차단 목록을 지우지 않는다. 지금 보던 조합만 피해서 다시 짠다.
  const avoid = [...(rec?.avoid || []), ...(rec?.outfits || []).filter(Boolean).map((o) => o.items)];   // 오늘 이미 본 조합은 계속 쌓임
  const pin = rec?.pin ? byId(rec.pin) : null;
  localStorage.removeItem(recKey());
  if (!rec) return renderToday();
  if (await regen({ pin, avoid }, t("redoing"))) toast(t("redone"));
}
// 색 정해서 고르기: 오늘 날씨·상황에 입을 수 있는 옷(겉옷·상의·하의·원피스·신발)이 있는 색만 고를 수 있음. 1~2개.
function openColorPick() {
  const C = t("color"); const worn = wornTopsBottoms();
  const cand = candidates().filter((i) => CORE.includes(slotOf(i)) && !worn.has(i.id));
  const fams = FAM_ORDER.map((k) => ({ k, n: cand.filter((i) => famOf(i) === k), all: clothesOf(items).concat(items.filter((i) => i.category === "shoes")).filter((i) => famOf(i) === k) })).filter((f) => f.all.length);
  let sel = colorsNow().filter((k) => fams.some((f) => f.k === k && f.n.length));
  const sw = (L) => { const s = byFam(L); return [s[0], s[Math.floor(s.length / 2)], s[s.length - 1]].filter(Boolean).map((i) => `<i style="background:${esc(i.color_hex || "#999")}"></i>`).join(""); };
  const draw = () => {
    openModal(`<h2>${C.title}</h2><p class="muted small">${C.sub}</p>
      <div class="cfams">${fams.map((f) => `<button data-ck="${f.k}" class="${sel.includes(f.k) ? "on" : ""}" ${f.n.length ? "" : "disabled"}><span class="sw">${sw(f.n.length ? f.n : f.all)}</span><span class="nm">${t("fams")[f.k]}</span><b class="n">${f.n.length}</b></button>`).join("")}</div>
      <button class="btn pri big" id="cp-go" ${sel.length ? "" : "disabled"}>${sel.length ? esc(C.go(withRo(famNames(sel)))) : C.pick}</button>`, "sheet");
    $("modal").querySelectorAll("[data-ck]").forEach((b) => (b.onclick = () => { const k = b.dataset.ck; sel = sel.includes(k) ? sel.filter((x) => x !== k) : [...sel, k].slice(-2); draw(); }));
    $("cp-go").onclick = () => { closeModal(); startColors(sel); };
  };
  draw();
}
async function startColors(keys) {
  const old = rec, oldColors = colorsNow();
  setColors(keys);
  let cached = null; try { cached = JSON.parse(localStorage.getItem(recKey())); } catch {}
  if (cached && (cached.outfits || []).some((o) => o && o.items.every(byId))) { rec = cached; drawRec(); return window.scrollTo(0, 0); }
  $("td-body").innerHTML = headHtml() + `<div class="empty"><b>${esc(t("color").making(withRo(famNames(keys))))}</b></div>`; bindHead(); window.scrollTo(0, 0);
  const want = recKey();
  let r; try { r = await recommend(); } catch (e) { r = { error: e.message }; }
  if (want !== recKey()) return;
  if (r.error) { setColors(oldColors); rec = old; toast(r.error, 4000); return rec ? drawRec() : renderToday(); }
  rec = r; persistRec(); drawRec();
}
async function pauseFromToday(it) {
  const prev = it.status; it.status = "paused";
  const { error } = await sb.from("items").update({ status: "paused" }).eq("id", it.id);
  if (error) { it.status = prev; return toast(t("saveFail") + error.message); }
  const snap = JSON.stringify(rec);
  // 제외된 옷은 같은 칸의 다른 옷으로 대체. 필수 칸을 못 채우면 그 안은 비우고, 아우터는 빈 칸으로 둠.
  rec.outfits = rec.outfits.map((o) => {
    if (!o || !o.items.includes(it.id)) return o;
    const s = slotOf(it); const alt = pool(s).find((x) => !o.items.includes(x.id));
    const ids = o.items.filter((id) => id !== it.id);
    if (alt) return { ...o, items: fixAccessories([...ids, alt.id], o.legs) };
    return CORE.includes(s) && s !== "outer" ? null : { ...o, items: ids };
  });
  if (rec.pin === it.id) rec.pin = null;
  persistRec(); drawRec();
  toast(t("statusToast")(nameOf(it), t("st").paused), async () => {
    it.status = prev; rec = JSON.parse(snap); persistRec(); drawRec();
    const r = await sb.from("items").update({ status: prev }).eq("id", it.id); if (r.error) toast(t("saveFail") + r.error.message);
  });
}
// 삭제 권한이 없으므로, 실행 취소 시간이 지난 뒤에 기록한다.
function later(fn, ms = 5000) { const h = setTimeout(fn, ms); return () => clearTimeout(h); }
// 입기 버튼은 껐다 켰다 할 수 있다. 삭제 권한이 없어서 취소한 기록은 source = "cancelled"로 남기고 어디서도 읽지 않는다.
const live = (rows) => (rows || []).filter((r) => r.source !== "cancelled");
const wornRow = (main) => wears.find((r) => r.worn_on === targetDay() && comboKey(r.items || []) === comboKey(main.items));
const isWorn = (main) => settings.get().worn === targetDay() + "|" + comboKey(main.items) || !!wornRow(main);
let pendingWear = null;
async function unwearMain() {
  const main = rec.outfits[rec.main]; const row = wornRow(main);
  if (row?.rating) return;                                          // 후기까지 쓴 기록은 실제로 입은 것이라 되돌리지 않는다
  if (pendingWear) { pendingWear(); pendingWear = null; }
  if (settings.get().worn === targetDay() + "|" + comboKey(main.items)) settings.set({ worn: null });
  if (row) {
    const { error } = await sb.from("wear_log").update({ source: "cancelled" }).eq("id", row.id);
    if (error) return toast(t("saveFail") + error.message, 4000);
    if (row.outfit_id) await sb.from("outfits").update({ saved: false }).eq("id", row.outfit_id);
    // 마지막 착용일을 그 전 기록으로 되돌림
    const { data } = await sb.from("wear_log").select("*").order("worn_on", { ascending: false }).limit(200);
    const rest = live(data).filter((r) => r.id !== row.id);
    for (const id of row.items || []) {
      const it = byId(id); if (!it || it.last_worn_on !== row.worn_on) continue;
      const last = rest.find((r) => (r.items || []).includes(id))?.worn_on || null;
      await sb.from("items").update({ last_worn_on: last }).eq("id", id); it.last_worn_on = last;
    }
    await loadWears();
  }
  if (!$("tab-today").hidden && rec) drawRec();
  toast(t("unwearToast"));
}
function wearMain() {
  const main = rec.outfits[rec.main];
  if (isWorn(main)) return unwearMain();
  const day = targetDay(); const ids = [...main.items]; const mark = day + "|" + comboKey(ids);
  const prev = settings.get().worn; settings.set({ worn: mark }); drawRec();
  const cancel = pendingWear = later(async () => {
    pendingWear = null;
    const { data: o, error } = await sb.from("outfits").insert({ owner: me.id, tpo: tpo === "special" ? "formal" : tpo, kind: main.kind, items: ids, score: main.score, reason: LX(main.reason), gauge: { top: main.top, occ: tpo === "special" ? occ : null, legs: legsOf(main) }, saved: true }).select().single();
    if (error) { settings.set({ worn: prev }); if (!$("tab-today").hidden) drawRec(); return toast(t("saveFail") + error.message); }
    await sb.from("wear_log").insert({ owner: me.id, worn_on: day, outfit_id: o?.id ?? null, items: ids, source: "recommendation" });
    await sb.from("items").update({ last_worn_on: day }).in("id", ids);
    ids.forEach((id) => { const it = byId(id); if (it) it.last_worn_on = day; });
    await loadWears(); if (!$("tab-today").hidden && rec) drawRec();   // 후기 줄이 바로 나타나게
  });
  toast(t("wearToast"), () => { cancel(); pendingWear = null; settings.set({ worn: prev }); drawRec(); });
}
function banMain() {
  const main = rec.outfits[rec.main]; const snap = JSON.stringify(rec); const ids = [...main.items];
  rec.outfits[rec.main] = null; rec.main = rec.outfits.findIndex(Boolean); persistRec(); drawRec();
  const cancel = later(async () => {
    await sb.from("outfits").insert({ owner: me.id, tpo: tpo === "special" ? "formal" : tpo, kind: main.kind, items: ids, score: main.score, reason: LX(main.reason), banned: true });
    await sb.from("feedback").insert({ owner: me.id, kind: "ban", context: { items: ids, tpo } });
  });
  toast(t("banToast"), () => { cancel(); rec = JSON.parse(snap); persistRec(); drawRec(); });
}

if (MOCK) window.__app = { fixAccessories, validOutfit, candidates, slotOf, swapTo, get items() { return items; }, get rec() { return rec; }, set weather(w) { weather = w; }, set tpo(v) { tpo = v; }, set occ(v) { occ = v; } };

// ─────────────────────────────────────────── 구매 (v5: 상품 사진 + 상세 페이지 캡처 → 치수 칸 → 판정 + 옷장 판정)
// 숫자 칸이 최종 근거. 캡처에서 읽은 값은 카멜색으로 채우고, 사용자가 고치면 보통 색으로 돌아간다.
const MEAS = {
  top: ["shoulder", "chest", "length", "sleeve"], outer: ["shoulder", "chest", "length", "sleeve"],
  bottom: ["waist", "hip", "thigh", "rise", "length"], dress: ["shoulder", "chest", "waist", "length"],
  shoes: ["size", "heel"], bag: ["width", "height"], acc: ["length"],
};
const MEAS_EN = { shoulder: "shoulder width", chest: "chest half-width (flat)", length: "total length", sleeve: "sleeve length", waist: "waist half-width (flat)", hip: "hip half-width (flat)", thigh: "thigh half-width (flat)", rise: "rise", size: "shoe size (mm)", heel: "heel height", width: "width", height: "height" };
const buy = { cat: "top", photos: [], shots: [], vals: {}, auto: {}, sizes: [], size: null, desc: "", color: false, reading: false, judging: false, result: null, error: "" };
const BT = (k) => t("buy")[k];
const gradeOf = (n) => BT("grades")[n >= 90 ? 0 : n >= 80 ? 1 : n >= 70 ? 2 : n >= 60 ? 3 : 4];
async function askAI(kind, payload, parts) {
  if (MOCK) { const m = await import("./mock.js"); return m.ai(kind, payload); }
  return gemini(parts);
}
const thumbsOf = (list) => list.map((f) => `<img src="${esc(f.url)}" alt="">`).join("");
const keepFiles = (files, max) => [...files].slice(0, max).map((f) => ({ file: f, url: URL.createObjectURL(f) }));

function renderBuy() {
  const b = buy; const M = BT("meas"); const r = b.result;
  $("buy-body").innerHTML = `
    <div class="segc scroll" id="by-cat">${Object.keys(MEAS).map((k) => `<button data-bc="${k}" class="${b.cat === k ? "on" : ""}">${t("cats")[k]}</button>`).join("")}</div>
    <div class="by-two">
      <label class="by-drop ${b.photos.length ? "has" : ""}"><input type="file" id="by-photos" accept="image/*" multiple hidden>${b.photos.length ? `<span class="th">${thumbsOf(b.photos)}</span>` : icon("i-cam", "i s")}<b>${BT("photo")[0]}</b><span>${b.photos.length ? BT("count")(b.photos.length) : BT("photo")[1]}</span></label>
      <label class="by-drop ${b.shots.length ? "has" : ""}"><input type="file" id="by-shots" accept="image/*" multiple hidden>${b.shots.length ? `<span class="th">${thumbsOf(b.shots)}</span>` : icon("i-tag", "i s")}<b>${BT("page")[0]}</b><span>${b.reading ? BT("reading") : b.shots.length ? BT("count")(b.shots.length) : BT("page")[1]}</span></label>
    </div>
    ${b.error ? `<p class="by-note warn">${esc(b.error)}</p>` : ""}
    ${b.sizes.length > 1 ? `<span class="by-lbl">${BT("size")}</span><div class="occ" id="by-sizes">${b.sizes.map((s, i) => `<button data-bs="${i}" class="${b.size === i ? "on" : ""}">${esc(s.size)}</button>`).join("")}</div>` : ""}
    <span class="by-lbl">${BT("measTitle")} <span class="faint">${BT("known")}</span>${Object.keys(b.auto).length ? `<span class="camel">${BT("autoRead")}</span>` : ""}</span>
    <div class="by-nums">${MEAS[b.cat].map((k) => `<label>${M[k]}<input type="number" inputmode="decimal" step="0.5" data-bm="${k}" class="${b.auto[k] ? "auto" : ""}" value="${esc(b.vals[k] ?? "")}"></label>`).join("")}</div>
    <textarea id="by-desc" rows="2" placeholder="${BT("paste")}">${esc(b.desc)}</textarea>
    <label class="switch"><input type="checkbox" id="by-color" ${b.color ? "checked" : ""}> ${BT("color")}</label>
    <button class="btn pri big" id="by-go" ${b.judging || b.reading ? "disabled" : ""}>${b.judging ? BT("judging") : BT("judge")}</button>
    ${r ? `
      <div class="by-verdict"><span class="w">${gradeOf(r.score)}</span><span class="n">${r.score}</span><span class="c">${BT("conf")[r.confidence] || ""}${r.basis ? " · " + esc(r.basis) : ""}</span></div>
      <div class="by-ev">${r.evidence.map((e) => `<div><span>${BT("src")[e.src] || BT("src").photo}</span><p>${esc(LX(e.text))}</p></div>`).join("")}</div>
      ${LX(r.color) ? `<p class="by-note camel">${esc(LX(r.color))}</p>` : ""}
      <h3 class="by-h">${BT("closet")}</h3>
      <div class="by-kv"><span>${BT("partners")}</span><b>${r.partners.length ? r.partners.map(([s, n]) => `${t("slot")[s]} <i>${n}</i>`).join(" · ") : BT("noPartner")}</b></div>
      <div class="by-kv"><span>${BT("similar")}</span><b>${r.similar.length ? `<i>${r.similar.length}</i> · ${esc(r.similar.slice(0, 2).map(nameOf).join(", "))}${r.similar.length > 2 ? " …" : ""}` : BT("none")}</b></div>
      ${r.similar.length ? `<div class="by-sim">${r.similar.slice(0, 6).map((i) => `<button data-sim="${i.id}" aria-label="${esc(nameOf(i))}"><img src="${esc(thumbOf(i))}" alt=""></button>`).join("")}</div>` : ""}
      ${r.savedAll ? `<div class="by-kv last"><span>${BT("savedFit")(r.savedAll)}</span><b><i class="big">${r.savedFit}</i></b></div>` : `<div class="by-kv last"></div>`}
      <button class="btn txt" id="by-reset">${BT("reset")}</button>`
    : `<div class="empty"><b>${BT("empty")[0]}</b>${BT("empty")[1]}</div>`}
    <p class="tiny faint by-foot">${BT("foot")}</p>`;
  const body = $("buy-body");
  body.querySelectorAll("[data-bc]").forEach((x) => (x.onclick = () => { if (b.cat === x.dataset.bc) return; b.cat = x.dataset.bc; b.result = null; if (b.size != null) fillSize(b.size); renderBuy(); }));
  body.querySelectorAll("[data-bm]").forEach((x) => (x.oninput = () => { b.vals[x.dataset.bm] = x.value; delete b.auto[x.dataset.bm]; x.classList.remove("auto"); }));
  body.querySelectorAll("[data-bs]").forEach((x) => (x.onclick = () => { fillSize(Number(x.dataset.bs)); renderBuy(); }));
  body.querySelectorAll("[data-sim]").forEach((x) => (x.onclick = () => openReview(byId(x.dataset.sim))));
  $("by-desc").oninput = (e) => { b.desc = e.target.value; };
  $("by-color").onchange = (e) => { b.color = e.target.checked; };
  $("by-photos").onchange = (e) => { if (!e.target.files.length) return; b.photos = keepFiles(e.target.files, 4); b.result = null; renderBuy(); };
  $("by-shots").onchange = (e) => { if (!e.target.files.length) return; b.shots = keepFiles(e.target.files, 3); b.result = null; readChart(); };
  $("by-go").onclick = judgeBuy;
  const rs = $("by-reset"); if (rs) rs.onclick = () => { Object.assign(buy, { photos: [], shots: [], vals: {}, auto: {}, sizes: [], size: null, desc: "", result: null, error: "" }); renderBuy(); window.scrollTo(0, 0); };
}
// 고른 사이즈의 치수를 칸에 채움. 사용자가 직접 넣은 값은 덮어쓰지 않음.
function fillSize(i) {
  const b = buy; const s = b.sizes[i]; if (!s) return;
  b.size = i;
  Object.keys(b.auto).forEach((k) => { delete b.vals[k]; }); b.auto = {};
  MEAS[b.cat].forEach((k) => { const v = Number(s.values?.[k]); if (v > 0 && (b.vals[k] == null || b.vals[k] === "")) { b.vals[k] = String(v); b.auto[k] = true; } });
}
async function readChart() {
  const b = buy; b.reading = true; b.error = ""; renderBuy();
  try {
    const parts = [{ text: `Read this shop detail-page capture (size chart, fabric composition). Do not guess: use null for anything not printed.
Units: centimetres (shoe size in mm). "단면" values are flat half-widths — keep them as printed. If the chart gives a full circumference for chest, waist, hip or thigh, halve it.
Return JSON: {"category":"top"|"bottom"|"outer"|"dress"|"shoes"|"bag"|"acc"|null,
"sizes":[{"size":"label as printed (S, M, 55, 36 …)","values":{${Object.entries(MEAS_EN).map(([k, v]) => `"${k}": ${v}`).join(", ")}}}],
"material":"composition as printed, e.g. 울 80% 나일론 20%" or null,
"notes":"short Korean list of design facts stated on the page (tuck, collar, lining, stretch)" or null}` }];
    for (const s of b.shots) parts.push(await blobToInline(await resize(s.file, 1600, 0.85)));
    const r = await askAI("chart", { cat: b.cat }, parts);
    b.sizes = (r.sizes || []).filter((s) => s && s.values && Object.values(s.values).some((v) => Number(v) > 0)).map((s) => ({ size: String(s.size || "—"), values: s.values }));
    if (r.category && MEAS[r.category]) b.cat = r.category;
    const extra = [r.material, r.notes].filter(Boolean).join(" · ");
    if (extra && !b.desc.includes(extra)) b.desc = [b.desc, extra].filter(Boolean).join("\n");
    if (b.sizes.length) fillSize(0); else b.error = BT("noChart");
  } catch (e) { b.error = e.message; }
  b.reading = false; renderBuy();
}
async function judgeBuy() {
  const b = buy; const M = BT("meas");
  const vals = MEAS[b.cat].filter((k) => Number(b.vals[k]) > 0).map((k) => [k, Number(b.vals[k]), b.auto[k] ? "chart" : "user"]);
  if (!vals.length && !b.photos.length && !b.desc.trim()) return toast(BT("need"));
  if (!MOCK && !PROFILE) { await loadProfile(); if (!PROFILE) return toast(t("noProfile")); }
  b.judging = true; b.error = ""; b.result = null; renderBuy();
  try {
    const parts = [{ text: `${PROFILE}
${STYLE_RULES}

You are a conservative stylist judging ONE item she is thinking of buying. Category: ${b.cat}${b.size != null && b.sizes[b.size] ? `, size ${b.sizes[b.size].size}` : ""}.
Measurements in cm (the final evidence — anchor to these first, then the photos): ${vals.length ? vals.map(([k, v, s]) => `${MEAS_EN[k]} ${v} (${s === "chart" ? "from size chart" : "typed by her"})`).join("; ") : "none given"}.
Description: ${b.desc.trim() || "none"}.
Personal color: ${b.color ? "EVALUATE it and include color_ko/color_en" : "do NOT evaluate; color_ko and color_en must be null"}.
Score 0-100: 90+ strong buy, 80+ buy, 70+ conditional, 60+ weak, under 60 do not buy. With few measurements, lower the confidence, not the score.
Return JSON: {"score":0-100,"confidence":"high"|"medium"|"low",
"evidence":[exactly 4 of {"src":"chart"|"photo"|"text","ko":"one short plain Korean sentence; when src is chart, name the number","en":"same in English"}],
"color_ko":string|null,"color_en":string|null,
"subtype":"Korean type (블라우스, 슬랙스 …)","color_name":"Korean color name","color_tone":"warm"|"cool"|"neutral",
"formality_work":boolean,"formality_out":boolean,"season":["spring"|"summer"|"autumn"|"winter"]}
In evidence sentences you MAY state measurements, but keep the wording plain.` }];
    for (const p of b.photos) parts.push(await blobToInline(await resize(p.file, 1200, 0.85)));
    const r = await askAI("judge", { cat: b.cat, vals, color: b.color }, parts);
    const score = Math.max(0, Math.min(100, Math.round(Number(r.score) || 0)));
    // 옷장 판정: 짝이 되는 옷(격식도·계절 일치) · 비슷한 옷 · 저장 코디 중 끼울 수 있는 곳. 곱셈 조합 수는 쓰지 않음.
    const slot = b.cat === "dress" ? "top" : b.cat;
    const seasons = Array.isArray(r.season) ? r.season : [];
    const fits = (i) => i.status === "active" && ((r.formality_work && i.formality_work) || (r.formality_out && i.formality_out) || (!r.formality_work && !r.formality_out))
      && (!seasons.length || !(i.season || []).length || i.season.some((s) => seasons.includes(s)));
    const pSlots = { top: ["bottom", "shoes", "outer"], bottom: ["top", "shoes", "outer"], outer: ["top", "bottom", "shoes"], shoes: ["top", "bottom"], dress: ["shoes", "outer"], bag: ["top", "shoes"], acc: [] }[b.cat];
    const partners = pSlots.map((s) => [s, items.filter((i) => slotOf(i) === s && i.category !== "acc" && fits(i)).length]);
    const similar = items.filter((i) => i.status !== "stored" && i.category === b.cat && ((r.subtype && i.subtype === r.subtype) || (r.color_name && i.color_name === r.color_name)) && (b.cat !== "acc" || (r.subtype && i.subtype === r.subtype)));
    const { data: saved } = await sb.from("outfits").select("items").eq("saved", true);
    const live = (saved || []).filter((o) => (o.items || []).some(byId));
    const savedFit = live.filter((o) => { const its = o.items.map(byId).filter(Boolean); const same = its.find((i) => (b.cat === "dress" ? i.category === "dress" : slotOf(i) === slot && i.category !== "dress")); return b.cat === "dress" ? !!same : !!same && its.filter((i) => i !== same).every(fits); }).length;
    const nChart = vals.filter((v) => v[2] === "chart").length, nUser = vals.length - nChart;
    const basis = [nChart && BT("basis").chart(nChart), nUser && BT("basis").user(nUser), b.photos.length && BT("basis").photo].filter(Boolean).join(" + ");
    b.result = { score, confidence: ["high", "medium", "low"].includes(r.confidence) ? r.confidence : "medium", basis,
      evidence: (r.evidence || []).slice(0, 4).map((e) => ({ src: e.src, text: { ko: e.ko || "", en: e.en || "" } })).filter((e) => e.text.ko),
      color: b.color ? { ko: r.color_ko || "", en: r.color_en || "" } : null, partners, similar, savedFit, savedAll: live.length };
    const input = [t("cats")[b.cat], vals.map(([k, v]) => `${M[k]} ${v}`).join(", "), b.desc.trim()].filter(Boolean).join(" · ");
    sb.from("judgements").insert({ owner: me.id, input, score, confidence: b.result.confidence, analysis: b.result.evidence.map((e) => e.text.ko), color_impact: b.result.color?.ko || null, color_mode: b.color, similar_count: similar.length, combo_count: savedFit }).then(() => {});
  } catch (e) { b.error = e.message; }
  b.judging = false; renderBuy();
  if (b.result) $("by-go").scrollIntoView({ block: "start", behavior: "smooth" });
}

// ─────────────────────────────────────────── 설정
const DEFAULT_MODEL = "gemini-3.8-flash";
const API = "https://generativelanguage.googleapis.com";
// 이 키로 쓸 수 있는 모델 목록 (글을 만드는 Gemini만)
async function fetchModels(key) {
  const r = await fetch(`${API}/v1beta/models?pageSize=200`, { headers: { "x-goog-api-key": key } });
  if (!r.ok) throw new Error(friendlyAiError(r.status, await r.text().catch(() => "")));
  const data = await r.json();
  return (data.models || [])
    .filter((m) => (m.supportedGenerationMethods || []).includes("generateContent"))
    .map((m) => m.name.replace("models/", ""))
    .filter((n) => n.startsWith("gemini") && !/embedding|image|tts|live|audio|robotics|computer-use/.test(n))
    .sort().reverse();
}
// 가장 새로운 정식 Flash (gemini-X.Y-flash)
function newestFlash(models) {
  const stable = models.map((n) => ({ n, m: n.match(/^gemini-(\d+)(?:\.(\d+))?-flash$/) })).filter((x) => x.m)
    .sort((a, b) => (+b.m[1] - +a.m[1]) || ((+b.m[2] || 0) - (+a.m[2] || 0)));
  return stable[0]?.n || models.find((n) => /flash/.test(n)) || models[0] || DEFAULT_MODEL;
}
function friendlyAiError(status, msg) {
  const S = t("aiErr");
  if ((status === 400 && /API key/i.test(msg)) || status === 401 || status === 403) return S.key;
  if (status === 404) return S.model;
  if (status === 429) return S.busy;
  if (status >= 500) return S.down;
  return `Gemini ${status}: ${String(msg).replace(/\s+/g, " ").slice(0, 140)}`;
}
function openSettings() {
  const h = settings.home; const S = t("set");
  openModal(`<h2>${S.title}</h2>
    <label class="field">${S.key} <span class="muted">${S.keyNote}</span>
      <span class="field-row"><input type="password" id="st-key" value="${esc(settings.key)}" autocomplete="off" autocapitalize="off" spellcheck="false"><button type="button" class="btn line mini-btn" id="st-show">${S.show}</button></span></label>
    <label class="field">${S.model}
      <span class="field-row"><select id="st-model"><option value="${esc(settings.model)}">${esc(settings.model)}</option></select><button type="button" class="btn line mini-btn" id="st-models" aria-label="${S.reload}"><svg class="i s"><use href="#i-refresh"/></svg></button></span></label>
    <p class="muted small" id="st-model-msg">${S.modelNote}</p>
    <div class="field">${S.lang}<div class="lang" id="st-lang">${["ko", "en"].map((l) => `<button type="button" data-l="${l}" class="${lang === l ? "on" : ""}">${l === "ko" ? "한국어" : "English"}</button>`).join("")}</div></div>
    <label class="field">${S.place}<input type="text" id="st-name" value="${esc(h.name)}"></label>
    <div class="modal-row"><label class="field" style="flex:1;margin:0">${S.lat}<input type="text" id="st-lat" inputmode="decimal" value="${h.lat}"></label><label class="field" style="flex:1;margin:0">${S.lon}<input type="text" id="st-lon" inputmode="decimal" value="${h.lon}"></label></div>
    <button class="btn ghost" id="st-geo">${S.geo}</button>
    <button class="btn pri big" id="st-save">${S.save}</button>
    <div class="modal-row"><button class="btn txt" id="st-export">${S.exp}</button><button class="btn txt" id="st-logout">${S.logout}</button></div>
    <p class="muted small" style="margin-top:10px">${esc(me?.email || "")} · v2.3</p>`);
  const sel = $("st-model"), msg = $("st-model-msg");
  let loadedFor = null;
  const loadModels = async () => {
    const key = $("st-key").value.trim();
    if (!key) { msg.textContent = S.needKeyFirst; return; }
    msg.textContent = S.loading; $("st-models").disabled = true;
    try {
      const models = await fetchModels(key); loadedFor = key;
      const saved = settings.get().model;
      const cur = settings.get().modelPicked && models.includes(saved) ? saved : newestFlash(models);
      sel.innerHTML = models.map((m) => `<option value="${esc(m)}" ${m === cur ? "selected" : ""}>${esc(m)}</option>`).join("");
      msg.textContent = (saved && !models.includes(saved) ? S.gone(saved) + " " : "") + S.loaded(models.length);
    } catch (e) { msg.textContent = e.message; }
    $("st-models").disabled = false;
  };
  $("st-lang").querySelectorAll("[data-l]").forEach((b) => (b.onclick = () => { if (b.dataset.l === lang) return; closeModal(); setLang(b.dataset.l); openSettings(); }));
  $("st-models").onclick = loadModels;
  $("st-key").addEventListener("change", loadModels);
  $("st-show").onclick = () => { const k = $("st-key"); const on = k.type === "password"; k.type = on ? "text" : "password"; $("st-show").textContent = on ? S.hide : S.show; };
  sel.onchange = () => { sel.dataset.picked = "1"; };
  if (settings.key) loadModels();
  $("st-geo").onclick = () => navigator.geolocation?.getCurrentPosition((p) => { $("st-lat").value = p.coords.latitude.toFixed(4); $("st-lon").value = p.coords.longitude.toFixed(4); }, () => toast(S.geoFail));
  $("st-save").onclick = () => {
    settings.key = $("st-key").value.trim();
    settings.set({ model: sel.value || DEFAULT_MODEL, modelPicked: !!sel.dataset.picked || !!settings.get().modelPicked, home: { name: $("st-name").value.trim() || HOME.name, lat: Number($("st-lat").value) || HOME.lat, lon: Number($("st-lon").value) || HOME.lon }, wx: null });
    weather = null; rec = null; closeModal(); toast(t("saved"));
    if (!$("tab-today").hidden) renderToday();
  };
  $("st-logout").onclick = () => sb.auth.signOut();
  $("st-export").onclick = async () => {
    const [o, w, f] = await Promise.all([sb.from("outfits").select("*"), sb.from("wear_log").select("*"), sb.from("feedback").select("*")]);
    const blob = new Blob([JSON.stringify({ exported_at: new Date().toISOString(), items, outfits: o.data, wear_log: w.data, feedback: f.data }, null, 2)], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `stylist-${todayStr()}.json`; a.click();
  };
}
document.addEventListener("click", (e) => { if (e.target.closest("[data-settings]")) openSettings(); });

// ─────────────────────────────────────────── 시작
boot();
if ("serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register("sw.js").catch(() => {});
