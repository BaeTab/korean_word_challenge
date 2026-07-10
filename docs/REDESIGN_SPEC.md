# 자모 워들 리디자인 세부 스펙 (2026-07)

> 작성: 스펙 정의 담당. 구현은 웨이브 1→2→3 순차 진행(파일 충돌 방지).
> 각 웨이브는 빌드(`npm run build`)가 통과해야 완료로 간주한다. 커밋/배포는 웨이브 담당이 하지 않는다.

## 0. 제약 (절대 조건)

- **유료 기능 금지**: Cloud Functions·Extensions·유료 API 일절 사용 불가. 허용 스택은 기존 그대로 **Firestore + Anonymous Auth + Hosting**(무료 티어)뿐이다.
- `firestore.rules` **수정 금지** — 이번 리디자인은 전부 클라이언트 작업이며 규칙과 어긋나는 스키마 변경이 없어야 한다.
- 기존 코드 스타일 유지: 한글 주석, CSS Modules, `src/styles/index.css`의 CSS 변수 팔레트, 기존 토스트/모달 패턴 재사용.
- 터미널 네온 테마 아이덴티티는 유지한다(전면 리브랜딩 아님 — 다듬기와 확장).

## 1. 시즌 리셋 (서버 + 클라이언트)

서버 DB는 CLI로 전체 삭제한다(오케스트레이터 직접 수행). 클라이언트도 로컬 기록을 1회 초기화해
"내 기록 판수 ≠ 랭킹 판수" 불일치가 재발하지 않도록 0에서 함께 시작한다.

- 신규 파일 `src/utils/seasonReset.js`:
  - `runSeasonResetOnce()` — 가드 키 `'season-reset-2026-07'`가 localStorage에 없으면:
    `jamo-wordle-stats-v1`, `jamo-wordle-achievements-v1`, `daily-done-*`(prefix 순회 삭제),
    `notice-level-system-v1` 삭제 후 가드 키 저장. try/catch로 감싸 실패해도 앱 동작에 지장 없게.
  - `src/main.jsx`에서 `createRoot(...)` **호출 전에** 실행(App의 `useState(loadStats)`가 초기화 후 값을 읽도록).
- 공지 모달: `App.jsx`의 `NOTICE_KEY`를 `'notice-season-2026-07'`로 교체하고 문구를 시즌 리셋 안내로 갱신:
  제목 "새 시즌이 시작됐어요! 🚀", 본문에 ① 모든 기록/랭킹 초기화 ② 상점·인벤토리(스킨 6종, 장착) ③ 출석 체크 소개.

## 2. 상점 신뢰성 (P0 버그 포함)

- **[P0 버그] 장착 스킨이 마스코트에 반영되지 않음**: `equippedSkin`에는 아이템 ID(`'skin-cat'`)가 저장되는데
  `Mascot`의 `SKINS` 키는 `'cat'`이다. `src/constants/shop.js`에 매핑 헬퍼 추가:
  ```js
  /** 장착된 아이템 ID → Mascot skin 키. 'default' 또는 미보유/알 수 없는 ID면 'default'. */
  export function skinKeyOf(itemId) {
    if (!itemId || itemId === 'default') return 'default'
    return SHOP_ITEMS.find((it) => it.id === itemId)?.skin ?? 'default'
  }
  ```
  `App.jsx`의 `mySkin`을 `skinKeyOf(playerStats?.equippedSkin)`으로 교체.
- **상점 열 때 최신화**: 상점 모달을 열 때 `getPlayerStats(nickname)`를 1회 재조회해 stale 잔액/보유 목록 방지
  (실패는 무시 — 기존 상태 유지).
- **에러 메시지 세분화**: `Shop.jsx`에서 `e?.code === 'permission-denied'`이면
  "동기화 문제가 있어요 — 새로고침 후 다시 시도해 주세요"로 안내(기존 일반 실패 문구와 구분).

## 3. 게임필(Game Feel) 업그레이드

### 3-1. 레벨업 오버레이 (토스트 한 줄 → 전용 연출)
- 신규 `src/components/LevelUpOverlay.jsx` + `src/styles/LevelUpOverlay.module.css`.
- 풀스크린 고정 레이어(z-index 300): 중앙에 행복한 마스코트(현재 장착 스킨 반영) + "LEVEL UP!" + `Lv.{n}` 큰 숫자,
  `ConfettiBurst` 재사용. 배경 딤 + 네온 글로우. 2.2초 후 자동 닫힘, 클릭/탭 시 즉시 닫힘.
- `App.jsx`: 레벨업 감지 시(`next.level > prevLevel`) 토스트 대신 오버레이 표시. 새 업적 토스트는 유지하되 오버레이가 닫힌 뒤 표시.

### 3-2. 포인트 획득 플로팅
- 승리로 포인트를 얻으면 헤더 SHOP 스탯박스 위로 `+N 🪙`가 1초간 떠오르며 사라지는 연출(absolute + 애니메이션).
- `App.jsx`에 상태 하나(`pointsGain`)와 SHOP 박스 래퍼에 플로팅 span. 애니메이션 끝나면 자동 클리어.

### 3-3. 타일 리빌 플립 (웨이브 2)
- 행 제출 시 각 타일이 왼쪽부터 순차적으로 X축 플립(칸당 딜레이 ~120ms, 총 0.45s/타일)하며
  **플립 중간에 판정색이 나타나야** 한다(제출 즉시 색이 먼저 보이면 안 됨).
- `Board.jsx`가 "방금 제출된 행" 인덱스를 알아야 함 — `attempts`(제출 행 수) 변화로 마지막 제출 행에만 reveal 클래스 부여.
- `@media (prefers-reduced-motion: reduce)`에서는 플립 없이 즉시 표시.
- 기존 승리 행 바운스/흔들림 애니메이션과 충돌하지 않게 승리 바운스는 플립 종료 후 시작.

### 3-4. 키보드 프레스 피드백 (웨이브 2)
- 가상 키보드 키 `:active`에 `transform: scale(0.9)` + 밝기 상승(0.08s).
- 프레스 시 짧은 틱 사운드 + `navigator.vibrate?.(8)`(사운드 토글 ON일 때만).

## 4. 사운드 & 햅틱 (웨이브 2)

- 신규 `src/utils/sound.js` — **오디오 파일 없이 WebAudio 신시사이저로 생성**(용량 0, PWA 캐시 부담 없음).
  - 단일 `AudioContext`를 첫 사용자 제스처 시 lazy 생성. iOS 대비 resume 처리.
  - API: `playKey()`, `playSubmit()`, `playReveal(state)`, `playWin()`, `playLose()`, `playLevelUp()`, `playCoin()`,
    `isSoundOn()`, `setSoundOn(bool)`(localStorage `'jamo-sound'`, 기본 ON), `vibrate(pattern)`(토글 OFF면 무시).
  - 톤 가이드(권장값, 미세 조정 허용): key 600Hz·30ms, reveal correct 880/present 660/absent 330(80ms),
    win 아르페지오 523→659→784→1047(각 90ms), lose 220→180 하강 300ms,
    levelup 팡파레 523→698→880→1047, coin 988→1319 더블톤. 게인은 0.1 내외로 은은하게, 엔벨로프로 클릭 노이즈 방지.
- 통합 지점: 키 입력(`pressKey`/삭제), 제출, 행 리빌(타일 플립 타이밍에 맞춰 상태별 톤 1회), 승리, 패배,
  레벨업 오버레이, 구매 성공, 출석 체크 성공.
- **토글 UI**: 헤더와 인트로 화면에 🔊/🔇 작은 원형 버튼(기존 statBox/버튼 스타일 준용). 진동도 같은 토글로 제어.

## 5. 라이트 테마 (웨이브 3)

- `src/styles/index.css`에 `:root[data-theme='light']` 팔레트 추가(변수만 재정의, 컴포넌트 CSS 수정 불필요해야 함):
  `--bg #f2f5f9` · `--bg-soft #e9edf3` · `--panel #ffffff` · `--panel-2 #f0f3f8` · `--border #d3dbe5` · `--border-soft #e2e7ee`
  `--text #1b2733` · `--text-dim #5a6a7d` · `--green #0c9e6b` · `--green-soft #0a8a5d` · `--amber #d97706` · `--pink #d6336c` · `--blue #2563eb`
  판정색: `--correct #0fa870`(ink `#ffffff`) · `--present #e8a512`(ink `#3a2a00`) · `--absent #c3cdd9`(ink `#5f6f80`)
  ※ 대비 확인: 타일 텍스트/키보드가 라이트 배경에서 뚜렷해야 함. 하드코딩된 색(예: 버튼 글자 `#04241a`)이 라이트에서 깨지면 해당 부분만 변수화.
- 신규 `src/utils/theme.js`: `initTheme()`(localStorage `'jamo-theme'` → 없으면 `prefers-color-scheme`), `toggleTheme()`,
  `document.documentElement.dataset.theme` 설정. `main.jsx`에서 초기화.
- 토글 UI: 헤더·인트로에 🌙/☀️ 버튼(사운드 토글 옆).
- 마스코트/스킨 SVG는 다크 전제 색이므로 라이트에서도 식별되는지 확인만(몸통에 stroke가 있어 대체로 안전).

## 6. 통계 고도화 — 오답노트 + 자모 인사이트 (웨이브 3, 전부 localStorage)

- `src/utils/stats.js` 확장:
  - 오답노트: 키 `'jamo-wordle-wrongnote-v1'`, `[{word, slots, dateKey}]` 최신순 최대 20개.
    `recordWrongAnswer({word, slots})` export — `App.jsx` 패배 시(커스텀 방 제외) 호출.
  - 자모 통계: 키 `'jamo-wordle-jamostat-v1'`, `{ [jamo]: {c, p, a} }`(correct/present/absent 누적).
    `recordJamoStats(rows)` export — 게임 종료 시 제출된 행들의 `{jamo, state}`를 누적(App의 `grid`에서 제출 행만 전달).
- `Profile.jsx`에 섹션 2개 추가(기존 섹션 스타일 준용):
  - "📕 오답노트": 최근 실패 단어 목록(단어 + 자모 분해 병기, `decomposeWord` 재사용). 비어 있으면 "아직 없어요 — 다행이네요!".
  - "🔍 헷갈린 자모 TOP 5": 시도 5회 이상 자모 중 오답률 `(p+a)/(c+p+a)` 상위 5개를 자모·오답률%로 표시.
    표본 부족 시 "5판 이상 플레이하면 분석해드려요".

## 7. 밸런스 (변경 없음 — 명시)

XP(패배 10/15/20, 승리 30/45/60), 포인트(승리 1/2/3), 체크인 +5 XP, 스킨 가격(15~40)은 그대로.
규칙 파일과 1:1 동기화된 값이므로 이번 웨이브에서 손대지 않는다.

## 8. 구현 분담

| 웨이브 | 담당 | 범위 |
|---|---|---|
| 1 | Opus | §1 시즌리셋(클라) + §2 상점 신뢰성(P0 포함) + §3-1, §3-2 |
| 2 | Opus | §3-3, §3-4 + §4 사운드/햅틱 |
| 3 | Opus | §5 라이트 테마 + §6 통계 고도화 |
| 문서 | Sonnet | README/CHANGELOG 갱신, 커밋(한글 본문·영어 prefix·AI 서명 금지)/푸시 |
| 검증·배포 | 오케스트레이터 | DB 초기화, 빌드/브라우저 E2E(구매→장착→반영→새로고침 유지), 호스팅 배포 |

## 9. 검증 체크리스트

1. `npm run build` 통과 (각 웨이브 종료 시마다)
2. 시즌 리셋: 기존 localStorage 있는 브라우저에서 접속 → 내 기록 0판 + 새 공지 1회 노출
3. 상점 E2E: 포인트 적립 → 구매(잔액 차감) → 장착 → **헤더/결과 마스코트 즉시 변경** → 새로고침 후 유지
4. 레벨업 오버레이·포인트 플로팅·타일 플립·키 피드백 육안 확인, reduced-motion에서 플립 생략 확인
5. 사운드 토글 OFF 시 무음+무진동, ON 시 각 이벤트 SFX 확인
6. 라이트/다크 전환 시 보드·키보드·모달 전부 가독성 유지, 새로고침 후 테마 유지
7. 오답노트/자모 통계가 패배·플레이 누적 후 프로필에 표시
