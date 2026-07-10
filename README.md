<div align="center">

![단어 챌린지 · 자모 워들](docs/screenshots/og-image.png)

# 단어 챌린지 · 자모 워들 (Jamo Wordle) ᕕ( ᐛ )ᕗ

**한글 자음·모음 낱자를 맞추는 워들 게임**

React (Vite) · Firebase (Hosting · Firestore · Anonymous Auth)

</div>

---

## ✨ 특징

- **한글 자모 분리 플레이** — 완성형 한글을 초/중/종성 낱자로 분해해 맞춘다.
  - 예) `녹차` → `ㄴ ㅗ ㄱ ㅊ ㅏ` (5칸)
  - **쌍자음 규칙**: `ㄲ·ㄸ·ㅃ·ㅆ·ㅉ`은 기본 자음 2칸으로 입력 (예) `토끼` → `ㅌ ㅗ ㄱ ㄱ ㅣ`
  - 겹받침(`ㄳ·ㄵ·ㄺ`…)도 구성 자음으로 분해
- **판정 시스템** — 🟩 자모O·위치O / 🟨 자모O·위치X / ⬛ 자모X (중복 자모 정확 처리)
- **가상 키보드** — 자모 전용 키보드에 판정색 실시간 반영 + 프레스 피드백(스케일·틱사운드·진동) + 물리 키보드(두벌식) 지원
- **5 / 6 / 7칸 모드** — 인트로에서 바로 선택(단계적 해금 없음), 시간요소 없이 시도 횟수만으로 승패 판정. 7칸 마스터는 큐레이션된 116개 후보 단어 기반
- **레벨 & 랭킹 시스템** — 참여·칸수 난이도·승리에 따라 XP 획득, 칭호(새싹→도전자→숙련자→고수→마스터)와 정답률 등급(브론즈~다이아몬드) 부여
  - 실시간 익명 랭킹 — 로그인 없이 닉네임만으로 등록, Firestore `onSnapshot` 실시간 Top 30
  - 정렬: XP(레벨) desc → 참여 횟수 desc, **영구 누적**(주간 리셋 없음)
- **🏅 업적(배지)** — 연승·누적 판수·모드별 첫 클리어·정확도·레벨·연속 출석 등 17종, 프로필에서 확인
- **🛍 상점 & 인벤토리** — 승리 시 포인트 적립 → 마스코트 코스메틱 스킨 6종(고양이·유령·로봇·외계인·판다·닌자) 구매 후 장착, 헤더/결과 화면에 즉시 반영
- **📅 출석 체크** — KST 기준 하루 1회 체크인 시 XP 보너스, 연속 출석일에 따른 업적
- **🚪 커스텀 방** — 원하는 단어로 방을 만들어 링크 공유, 친구와 같은 문제로 겨루기(방당·닉네임당 1회 제출)
- **💬 단어 제안** — 다음 시즌 후보 단어를 유저가 직접 제안
- **📅 데일리 챌린지** — KST 날짜 기준 모두 같은 '오늘의 단어', **닉네임당 하루 1회**(문서ID 잠금), 데일리 전용 랭킹 + 다음 챌린지 카운트다운. 이미 참여했으면 랭킹 열람만.
- **📋 결과 공유** — 정답 노출 없이 이모지 판정 그리드(🟩🟨⬛) 복사/공유 (Web Share API)
- **💡 힌트** — 스테이지당 1회, 다음 칸 정답 자모 공개 (+30초 페널티)
- **📊 개인 통계 & 인사이트** — 플레이/승률/연속(스트릭)/시도 횟수 분포, **오답노트**(최근 실패 단어), **헷갈린 자모 TOP 5**(자모별 오답률) — 전부 localStorage
- **🎮 게임필** — 타일 리빌 플립 애니메이션, 레벨업 전용 연출(LevelUpOverlay), 포인트 획득(+N 🪙) 플로팅, `prefers-reduced-motion` 대응
- **🔊 사운드 & 햅틱** — WebAudio 신시사이저로 즉석 생성한 효과음(오디오 파일 0바이트) + 진동, 헤더/인트로에서 토글
- **🌙 라이트 / 다크 테마** — `prefers-color-scheme` 자동 감지 + 수동 토글, localStorage에 유지
- **📖 사전 검증** — 실제 국어사전 기반 약 5.7만 단어로 제출 단어 검사, 없는 단어는 행 초기화
- **📱 PWA** — 설치형 앱(홈화면 추가), 서비스워커 오프라인 앱셸, 마스코트 앱 아이콘
- **모바일 완벽 대응** — 반응형 레이아웃, safe-area, 동적 뷰포트, 터치 최적화, 두벌식 키보드
- **치팅 방지** — 정답을 상태에 평문으로 두지 않고 난독화해 개발자 도구 훔쳐보기 차단

## 🛠 기술 스택

| 구분 | 사용 |
|------|------|
| 프레임워크 | React 18 + Vite 5 |
| 백엔드 | Firebase Firestore · Anonymous Auth · Hosting |
| 스타일 | CSS Modules (터미널 네온 테마) |
| 폰트 | JetBrains Mono(Nerd Font 대체) + Gothic A1 |

## 🚀 실행

```bash
# 1) 의존성 설치
npm install

# 2) 개발 서버
npm run dev            # http://localhost:5173

# 3) 프로덕션 빌드
npm run build          # → dist/

# 4) 로컬 미리보기
npm run preview
```

### 환경변수 (선택)

`.env.example`를 복사해 `.env`를 만들면 Firebase 설정을 덮어쓸 수 있다.
(웹 config는 비밀이 아니며, 미설정 시 `src/firebase.js`의 기본값으로 동작한다.)

```bash
cp .env.example .env
```

## ☁️ 배포 (Firebase Hosting)

```bash
# 최초 1회: Firebase CLI 로그인
npm i -g firebase-tools
firebase login

# 빌드 + 호스팅 배포
npm run deploy         # = vite build && firebase deploy --only hosting

# 보안 규칙 + 랭킹 인덱스 배포
firebase deploy --only firestore
```

### 🔄 자동 배포 (CI/CD · GitHub Actions)

`main` 브랜치에 푸시하면 `.github/workflows/deploy.yml`가 **빌드 후 Firebase Hosting(live)에 자동 배포**한다.

**최초 1회 설정 — GitHub 시크릿 등록:**
1. Firebase Console → ⚙️ 프로젝트 설정 → **서비스 계정** → **새 비공개 키 생성** → JSON 다운로드
2. GitHub 저장소 → Settings → Secrets and variables → **Actions** → New repository secret
   - 이름: `FIREBASE_SERVICE_ACCOUNT`
   - 값: 다운로드한 JSON 전체 붙여넣기
3. 이후 `git push` 하면 자동 빌드·배포 (시크릿 미설정 시 배포 단계는 자동 스킵)

> ⚠️ **콘솔 필수 설정 2가지**
> 1. **Authentication → 로그인 방법 → 익명(Anonymous) 사용 설정** (랭킹 등록에 필요)
> 2. 랭킹 정렬용 **복합 인덱스**가 필요하다. `firebase deploy --only firestore:indexes`로 배포하거나,
>    최초 실행 시 브라우저 콘솔에 찍히는 "인덱스 생성" 링크를 클릭하면 자동 생성된다.

## 📁 구조

```
src/
├─ main.jsx                 # 엔트리(테마 초기화 + 시즌 리셋 실행 후 마운트)
├─ App.jsx                  # 화면 조립(인트로/게임/결과/상점/프로필/방 모달)
├─ firebase.js              # Firebase 초기화 + 익명 로그인
├─ hooks/
│  └─ useWordleGame.js      # 게임 상태·규칙·모드 전환
├─ utils/
│  ├─ hangul.js             # 자모 분해 + 워들 판정 (핵심 로직)
│  ├─ secret.js             # 정답 난독화(anti-peek)
│  ├─ format.js             # 순위 포맷
│  ├─ daily.js              # KST 날짜 키
│  ├─ share.js              # 결과 공유 텍스트
│  ├─ level.js              # XP·레벨·칭호·정답률 등급 공식
│  ├─ achievements.js       # 업적(배지) 판정 (localStorage)
│  ├─ checkin.js            # 출석 체크 판정 유틸
│  ├─ stats.js              # 개인 통계 + 오답노트 + 자모 통계 (localStorage)
│  ├─ sound.js              # WebAudio SFX 신시사이저 + 진동
│  ├─ theme.js              # 라이트/다크 테마 전환
│  └─ seasonReset.js        # 시즌 전환 시 로컬 기록 1회 초기화
├─ constants/
│  ├─ words.js              # 단어 풀(5/6/7칸, 길이·키보드 자동 검증)
│  ├─ guessDict.js          # 사전 검증용 전체 단어 목록
│  └─ shop.js               # 상점 카탈로그 + 스킨 매핑
├─ services/
│  ├─ ranking.js            # 데일리 챌린지 랭킹 제출/구독
│  ├─ players.js            # 레벨·XP·포인트·상점·출석 (Firestore)
│  ├─ rooms.js              # 커스텀 방 생성/제출
│  └─ suggestions.js        # 유저 단어 제안 제출
├─ components/              # Board · Keyboard · Leaderboard · DailyBoard · RoomBoard
│                            # Modal · Mascot · IntroScreen · ConfettiBurst · LevelUpOverlay
│                            # Shop · Profile · XpBar · CreateRoomModal · SuggestWordModal · InstallBanner
└─ styles/                  # CSS Modules
```

## 🔒 치팅 방지에 대하여

순수 클라이언트 게임은 판정을 위해 브라우저가 정답을 알아야 하므로 **완벽 차단은 서버 판정(Cloud Functions)**이 필요하다.
본 프로젝트는 정답을 상태에 **난독화(XOR+Base64)**해 보관하고 판정 순간에만 잠깐 복호화하므로,
React DevTools·콘솔에서 정답을 평문으로 훔쳐보는 캐주얼 치팅을 효과적으로 차단한다.
더 강한 보증이 필요하면 서버 판정 API로 확장하면 된다.

---

<div align="center">
made with 💚 by <b>Hyunwoo</b> · Hyun-woo Bae (Jeju, KR)
</div>
