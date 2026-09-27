# Stylist 셋업 (1회, 사용자가 직접 하는 부분)

## 1. Supabase 프로젝트
1. https://supabase.com/dashboard → **New project** — 이름 `stylist`, 리전 **EU (Frankfurt)** (Pairfolio와 동일)
2. 생성 후 **Project Settings → API**에서 `Project URL`과 `publishable` 키를 복사 → `config.js`의 두 값 교체

## 2. 스키마 + 스토리지
1. **SQL Editor** → `migrations/001_init.sql` 전체 붙여넣기 → Run → "Success" 확인
   - 이어서 `migrations/002_import_fields.sql`도 같은 방법으로 Run (브랜드·기장·액세서리 종류 등 분류 때 생긴 칸)
   - SQL의 `YOUR_EMAIL@example.com`을 본인 로그인 이메일로 바꾼 뒤 실행
   - 비공개 버킷 `wardrobe`가 같이 생김 (Storage 메뉴에서 확인)

## 3. 가입 차단 + 사용자 생성
- **Authentication → Sign In / Providers → Email** → "Allow new users to sign up" **끄기**
- **Authentication → Users → Add user → Create new user** — 이메일 + 비밀번호, **Auto Confirm User 체크**
- 비밀번호 분실 시 같은 화면에서 Reset password (이메일 발송은 쓰지 않음)

## 4. Gemini 키
- 앱 → 판정 탭 → 톱니(설정) → API 키 붙여넣기. **이 기기 localStorage에만 저장**, 리포·서버에 없음
- MeetMemo·Recap과 같은 키 사용 가능. 기본 모델 `gemini-2.5-flash`, 설정에서 변경 가능

## 5. 로컬 테스트
```
powershell -ExecutionPolicy Bypass -File serve.ps1
```
→ http://localhost:8129 . 카메라·위치는 localhost에서도 동작. 서비스워커는 https에서만 등록됨.

## 6. 배포 (GitHub Pages)
- 리포 `nij-621/closet-stylist` → Settings → Pages → Source: **Deploy from a branch**, `main` / `/ (root)`
- main에 푸시하면 1~2분 뒤 https://nij-621.github.io/closet-stylist/ 반영
- 아이폰 Safari에서 열고 **공유 → 홈 화면에 추가**

## 백업
- 설정 → **JSON 내보내기** (옷·코디·착용·피드백). 사진 원본은 Storage 버킷에 그대로 남음
