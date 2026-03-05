# VFX Spriter - 개발 단계 리뷰

> 작성일: 2026-03-05 | 버전: 1.0.0 | 상태: MVP 완료, 로컬 개발 중

---

## 1. 프로젝트 개요

**VFX Spriter**는 GIF/이미지 파일을 업로드하면 프레임을 자동 추출하고, 스프라이트를 감지하여 게임 엔진용 스프라이트시트를 생성하는 웹 애플리케이션입니다.

| 항목 | 내용 |
|------|------|
| 목적 | VFX 리소스의 스프라이트시트 자동 생성 및 관리 |
| 대상 사용자 | 게임 개발자 (모바일/웹 게임) |
| 출력 포맷 | 개별 프레임 PNG + 스프라이트시트 PNG + Phaser 호환 metadata.json |
| 현재 상태 | MVP 완료 — GIF 처리, 이미지 처리, AI 분석, 갤러리 기능 동작 |

---

## 2. 기술 스택 분석

### 핵심 의존성

| 패키지 | 버전 | 용도 | 평가 |
|--------|------|------|------|
| Next.js | 16.1.6 | 풀스택 프레임워크 (App Router) | 최신. `--webpack` 플래그 사용 중 |
| React | 19.2.4 | UI 라이브러리 | 최신 |
| TypeScript | 5.9.3 | 타입 시스템 | 최신 |
| Sharp | 0.34.5 | 이미지 처리 (프레임 추출, 리사이즈, 합성) | 적합. native C++ 모듈 — 배포 환경 제약 있음 |
| better-sqlite3 | 12.6.2 | 로컬 데이터베이스 | 개발에 적합. 프로덕션 확장 시 교체 필요 |
| Zustand | 5.0.11 | 클라이언트 상태관리 | 경량, 적합 |
| Tailwind CSS | 4.2.1 | 스타일링 | v4 사용 (`@tailwindcss/postcss` 분리) |
| @google/generative-ai | 0.24.1 | Gemini 2.0 Flash — AI 스프라이트 분석 | 적합. API 키 없어도 폴백 동작 |
| maxrects-packer | 2.7.3 | 빈 패킹 알고리즘 | 적합 |
| JSZip | 3.10.1 | ZIP 다운로드 생성 | 적합 |
| lucide-react | 0.576.0 | 아이콘 라이브러리 | 적합 |

### 미사용 의존성 (정리 필요)

| 패키지 | 상태 | 근거 |
|--------|------|------|
| `swr` (2.4.1) | **미사용** | 소스 어디에서도 import 없음. `page.tsx`에서 `fetch()` 직접 사용 |
| `uuid` (13.0.0) | **미사용** | `pipeline.ts:5`에서 `crypto.randomUUID()` (Node.js 내장) 사용 |
| `@types/uuid` (10.0.0) | **미사용** | uuid 패키지 미사용으로 불필요 |

---

## 3. 아키텍처 리뷰

### 데이터 흐름

```
[브라우저]
  |
  v
[Next.js App Router — SPA ('use client')]
  |
  +-- page.tsx (메인 페이지)
  |     |-- DropZone → UploadModal → POST /api/upload
  |     |-- FilterBar + GalleryGrid → GET /api/sprites
  |     |-- SpriteCard → GET /api/sprites/[id]/frames/[index]
  |     |-- DownloadModal → GET /api/sprites/[id]/download
  |
  +-- API Routes (서버)
        |
        v
  [처리 파이프라인 — pipeline.ts]
        |-- gif-processor.ts (GIF 프레임 추출)
        |-- sprite-detector.ts (알파/그리드 감지)
        |-- frame-processor.ts (정규화/썸네일/합성)
        |-- sheet-packer.ts (MaxRects/그리드 패킹)
        |-- gemini-client.ts (AI 분석)
        |-- background-remover.ts (배경 제거)
        |
        v
  [저장소]
        |-- db.ts → SQLite (data/vfx_spriter.db)
        |-- file-storage.ts → 파일시스템 (data/sprites/{uuid}/)
        |-- sprites-repo.ts → CRUD 쿼리
```

### 아키텍처 특성

| 특성 | 현재 상태 | 비고 |
|------|-----------|------|
| 구조 | 모놀리식 Next.js | API + 프론트엔드 단일 프로젝트 |
| 렌더링 | SPA (Client-Side) | `page.tsx` 전체가 `'use client'` |
| 처리 방식 | **동기식** | 업로드 요청 중 전체 파이프라인 실행 후 응답 |
| 미들웨어 | **없음** | 인증, 레이트리밋, CORS 없음 |
| 백그라운드 작업 | **없음** | 작업 큐 없이 요청 내에서 완료 |
| DB 동시성 | WAL 모드 | 읽기 동시성 OK, 쓰기 동시성 제한적 |

### 주요 관찰 사항

1. **동기식 파이프라인**: 대용량 GIF 업로드 시 API 응답이 블로킹됨. 현재는 로컬 개발이므로 문제없으나, 배포 시 타임아웃 위험
2. **Sharp 설정 분산**: `pipeline.ts:3`에서 `sharp.concurrency(1)`, `gif-processor.ts`에서 `sharp.cache(false)` — 모듈 로딩 순서에 의존
3. **싱글톤 DB**: `db.ts:8`에서 모듈 레벨 `let db` 캐싱 — 개발 중 핫 리로드 시 연결 재사용

---

## 4. 핵심 기능 구현 상태

### 4.1 GIF 업로드 & 프레임 추출

| 항목 | 상태 | 파일 |
|------|------|------|
| GIF 파일 업로드 | 완료 | `src/app/api/upload/route.ts` |
| 멀티페이지 프레임 추출 | 완료 (BUG-001 수정됨) | `src/lib/processing/gif-processor.ts` |
| FPS 자동 계산 | 완료 | `gif-processor.ts` — metadata.delay 배열에서 계산 |
| 프레임 크기 정규화 | 완료 | `src/lib/processing/frame-processor.ts` |

### 4.2 이미지 업로드 & 스프라이트 감지

| 항목 | 상태 | 파일 |
|------|------|------|
| 알파 기반 감지 (Connected Component) | 완료 | `src/lib/processing/sprite-detector.ts` |
| 그리드 기반 감지 (행/열 분석) | 완료 | `sprite-detector.ts` |
| 수동 그리드 설정 (rows/cols/padding) | 완료 | `UploadModal.tsx` → `pipeline.ts` |
| 단일 이미지 폴백 | 완료 | 감지 실패 시 이미지 전체를 1프레임으로 처리 |

### 4.3 AI 분석 (Gemini 2.0 Flash)

| 항목 | 상태 | 파일 |
|------|------|------|
| 자동 제목 생성 (snake_case) | 완료 | `src/lib/ai/gemini-client.ts` |
| 자동 태그 생성 (5~10개) | 완료 | `gemini-client.ts` |
| 카테고리 분류 | 완료 | Fire/Smoke/Electric/Magic/Explosion/Water/UI Effects/Other |
| AI 배경 제거 | 완료 | `src/lib/ai/background-remover.ts` |
| API 키 없을 때 폴백 | 완료 | 파일명 기반 제목, 코너 기반 배경 감지 |

### 4.4 스프라이트시트 생성

| 항목 | 상태 | 파일 |
|------|------|------|
| MaxRects 빈 패킹 | 완료 | `src/lib/processing/sheet-packer.ts` |
| 그리드 레이아웃 | 완료 | `sheet-packer.ts` — `ceil(sqrt(n))` 열 자동 계산 |
| Power-of-2 지원 | 완료 | GPU 텍스처 호환 |
| Phaser 호환 metadata.json | 완료 | `pipeline.ts` |

### 4.5 갤러리 & 다운로드

| 항목 | 상태 | 파일 |
|------|------|------|
| 스프라이트 목록 조회 | 완료 | `src/app/api/sprites/route.ts` |
| 카테고리 필터 | 완료 | 9개 카테고리 |
| 텍스트 검색 (제목 + 태그) | 완료 | `sprites-repo.ts` — LIKE 쿼리 |
| 정렬 (최신/이름/프레임수) | 완료 | `gallery-store.ts` |
| 캔버스 애니메이션 미리보기 | 완료 | `SpriteCard.tsx` — requestAnimationFrame 기반 |
| ZIP 다운로드 (리사이즈 옵션) | 완료 | `src/app/api/sprites/[id]/download/route.ts` |
| 개별 스프라이트 삭제 | 완료 | `src/app/api/sprites/[id]/route.ts` |

---

## 5. 코드 품질 분석

### 장점

- **모듈 분리**: processing, storage, ai, types, stores로 명확한 관심사 분리
- **타입 안전성**: 모든 데이터 구조에 TypeScript 인터페이스 정의 (`sprite.ts`, `processing.ts`)
- **에러 핸들링**: API 라우트마다 try/catch + 적절한 HTTP 상태 코드
- **AI 그레이스풀 폴백**: GEMINI_API_KEY 없이도 기본 동작 보장
- **캐시 전략**: 프레임 이미지에 `Cache-Control: immutable, max-age=31536000` 적용
- **DB 마이그레이션**: `db.ts:46~50`에서 tags 컬럼 자동 마이그레이션

### 개선 필요 사항

| 이슈 | 위치 | 설명 |
|------|------|------|
| `formatFileSize()` 중복 | `SpriteCard.tsx`, `UploadModal.tsx` | 동일 함수가 두 컴포넌트에 각각 정의됨 → 공유 유틸로 추출 필요 |
| Sharp 설정 분산 | `pipeline.ts:3`, `gif-processor.ts` | `concurrency(1)`과 `cache(false)`가 다른 파일에 분산 |
| 서버사이드 검증 부재 | `upload/route.ts` | 파일 크기/타입 검증이 클라이언트(`DropZone.tsx`)에만 존재 |
| 페이지네이션 UI 미구현 | `page.tsx` | 백엔드 `findAll()`은 pagination 지원하나 UI에 컨트롤 없음 |
| 테스트 없음 | 전체 | 유닛/통합 테스트 파일 없음 |
| .env.example 없음 | 루트 | `GEMINI_API_KEY` 환경변수 문서화 안 됨 |

---

## 6. 알려진 이슈 및 기술 부채

### 버그 이력

| ID | 제목 | 상태 | 참조 |
|----|------|------|------|
| BUG-001 | GIF 프레임 추출 — 수직 스태킹 버그 | **코드 수정 완료** / 기존 데이터 재업로드 필요 | `docs/bug-tracking.md` |

### 실수 이력 (MISTAKES.md)

| # | 실수 | 상태 |
|---|------|------|
| 1 | TailwindCSS v4 PostCSS 플러그인 분리 | 해결됨 |
| 2 | TailwindCSS v4 CSS 지시문 변경 | 해결됨 |
| 3 | Buffer → NextResponse 타입 에러 | 해결됨 (Uint8Array 래핑) |
| 4 | create-next-app 대문자 폴더명 거부 | 해결됨 (수동 구성) |
| 5 | maxrects-packer API 불일치 | 해결됨 |

### 기술 부채

- 테스트 스위트 없음 (유닛, 통합, E2E 모두)
- CI/CD 파이프라인 없음
- Git 저장소 미초기화
- 미사용 의존성 정리 필요 (`swr`, `uuid`, `@types/uuid`)
- 기존 GIF 데이터 재처리 API 필요 (BUG-001 후속)

---

## 7. 미구현 기능

| 기능 | 상태 | 복잡도 | 우선순위 | 비고 |
|------|------|--------|----------|------|
| 비디오 처리 (MP4/WebM) | 스텁 존재 | 높음 | 중 | ffmpeg 또는 @ffmpeg/ffmpeg 필요 |
| Re-process API | 미구현 | 중간 | **높음** | BUG-001 후속 — 기존 데이터 재생성 |
| 스프라이트시트 직접 다운로드 | 미구현 | 낮음 | 중 | 현재 프레임 ZIP만 지원 |
| 스프라이트 편집/업데이트 | 미구현 | 중간 | 중 | 태그/카테고리 수정 기능 |
| 벌크 업로드 | 미구현 | 중간 | 낮음 | 여러 파일 동시 업로드 |
| 페이지네이션 UI | 백엔드만 | 낮음 | 낮음 | 데이터 증가 시 필요 |
| 인증/권한 | 미구현 | 중간 | 배포 시 필수 | 현재 모든 API 공개 |
| Rate limiting | 미구현 | 낮음 | 배포 시 필수 | 업로드 엔드포인트 보호 |

---

## 8. 보안 검토

| 항목 | 현재 상태 | 위험도 | 비고 |
|------|-----------|--------|------|
| 인증/인가 | 없음 | 로컬 개발 시 무관 | 배포 시 필수 구현 |
| 파일 타입 검증 | 클라이언트만 | 중 | 서버사이드 검증 추가 필요 |
| 파일 크기 제한 | `bodySizeLimit: 100mb` (next.config) | 낮음 | API 라우트에서 명시적 검증 권장 |
| CSRF 보호 | 없음 | 로컬 개발 시 무관 | SameSite 쿠키 또는 토큰 필요 |
| Path Traversal | UUID 기반 경로로 완화 | 낮음 | 사용자 입력이 경로에 직접 사용되지 않음 |
| API 키 관리 | 환경변수 사용 | 양호 | `.env.example` 문서화 권장 |
| COOP/COEP 헤더 | 설정됨 (`next.config.ts`) | 양호 | Cross-Origin 격리 |
| 입력 검증 | `gridRows`/`gridCols` 범위 미검증 | 낮음 | 서버사이드 bounds check 추가 권장 |

---

## 9. 배포 전략: 로컬 서버 vs 대안

### 서버 필수 의존성

이 프로젝트는 아래 이유로 서버사이드 실행이 **필수**입니다:

| 의존성 | 이유 | 브라우저 대체 불가 |
|--------|------|-------------------|
| Sharp (native C++) | GIF 프레임 추출, 이미지 리사이즈/합성 | WebAssembly 대안 있으나 성능 열세 |
| better-sqlite3 (native C) | 메타데이터 영속 저장 | IndexedDB로 대체 가능하나 쿼리 기능 제한 |
| fs (파일시스템) | 프레임/스프라이트시트 저장 | 브라우저 파일시스템 API는 제한적 |
| Gemini API | AI 분석 (API 키 보호) | 클라이언트 노출 시 보안 위험 |

### 단계별 배포 전략

| 단계 | 추천 환경 | 비용 | 코드 변경 | 적합 시기 |
|------|-----------|------|-----------|-----------|
| **현재: 활발한 개발** | **로컬 서버 (`next dev`)** | 0원 | 없음 | 지금 (잦은 변경, 즉각 피드백) |
| 데모/공유 | Fly.io 또는 Railway | $5~10/월 | Dockerfile 추가만 | 외부 공유 필요 시 |
| 팀 사용 | VPS + Docker Compose | $10~20/월 | Docker 설정, 백업 스크립트 | 다수 사용자 접근 시 |
| 프로덕션 | 아키텍처 재설계 | $30+/월 | PostgreSQL, S3, 큐 시스템 | 대규모 확장 시 |

### 현재 단계에서의 효율화 제안

#### A. 로컬 서버 최적화 (즉시 적용 가능)

1. **`.env.example` 파일 생성** — 환경변수 문서화
   ```
   GEMINI_API_KEY=your_api_key_here
   ```

2. **`data/` 백업 습관** — SQLite DB + 스프라이트 파일 보호
   ```bash
   # 간단한 백업 (PowerShell)
   Copy-Item -Recurse data/ backup/data_$(Get-Date -Format yyyyMMdd)/
   ```

3. **Sharp 설정 통합** — `pipeline.ts`에서 concurrency + cache 설정을 한 곳으로

#### B. Docker 준비 (다음 단계)

Fly.io/Railway 배포를 위해 미리 Dockerfile을 준비해두면 좋습니다:
- Node.js 22 베이스 이미지
- Sharp pre-built 바이너리
- `data/` 볼륨 마운트
- `.dockerignore` (node_modules, .next)

#### C. 고려할 대안 기술

| 기술 | 용도 | 장점 |
|------|------|------|
| **Turso (libSQL)** | SQLite 클라우드 호스팅 | SQLite 호환 유지하면서 원격 접근 가능 |
| **R2/S3** | 파일 스토리지 | 로컬 파일시스템 대체, CDN 연동 |
| **BullMQ + Redis** | 작업 큐 | 동기식 처리를 비동기로 전환 |
| **ffmpeg.wasm** | 브라우저 비디오 처리 | 서버 부하 분산 가능 |

---

## 10. 향후 개발 로드맵

### Phase 1: 안정화 (현재 → 다음)

- [ ] 미사용 의존성 제거 (`swr`, `uuid`, `@types/uuid`)
- [ ] `formatFileSize()` 공통 유틸 추출
- [ ] Sharp 설정 통합 (한 파일에서 관리)
- [ ] 서버사이드 파일 검증 추가
- [ ] `.env.example` 생성
- [ ] Git 저장소 초기화 + `.gitignore`

### Phase 2: 기능 완성

- [ ] Re-process API 구현 (기존 데이터 재생성)
- [ ] 스프라이트시트 직접 다운로드
- [ ] 스프라이트 메타데이터 편집 (태그, 카테고리)
- [ ] 페이지네이션 UI 구현
- [ ] 비디오 처리 구현 (MP4/WebM)

### Phase 3: 배포 준비

- [ ] Dockerfile + docker-compose.yml
- [ ] 기본 인증 시스템
- [ ] Rate limiting
- [ ] 서버사이드 입력 검증 강화
- [ ] 에러 바운더리 컴포넌트 추가

### Phase 4: 확장

- [ ] CDN 연동 (정적 에셋)
- [ ] 비동기 처리 파이프라인 (작업 큐)
- [ ] 벌크 업로드 지원
- [ ] 외부 DB 마이그레이션 (필요 시)

---

## 부록: API 엔드포인트 맵

| Method | Route | 용도 | 파일 |
|--------|-------|------|------|
| POST | `/api/upload` | 파일 업로드 및 처리 | `src/app/api/upload/route.ts` |
| GET | `/api/sprites` | 스프라이트 목록 (검색, 필터, 정렬, 페이지네이션) | `src/app/api/sprites/route.ts` |
| GET | `/api/sprites/[id]` | 개별 스프라이트 메타데이터 | `src/app/api/sprites/[id]/route.ts` |
| DELETE | `/api/sprites/[id]` | 스프라이트 삭제 (DB + 파일) | `src/app/api/sprites/[id]/route.ts` |
| GET | `/api/sprites/[id]/frames/[index]` | 개별 프레임 PNG | `src/app/api/sprites/[id]/frames/[index]/route.ts` |
| GET | `/api/sprites/[id]/thumbnail` | 썸네일 PNG (280x280) | `src/app/api/sprites/[id]/thumbnail/route.ts` |
| GET | `/api/sprites/[id]/original` | 원본 파일 (GIF/MP4/WebM) | `src/app/api/sprites/[id]/original/route.ts` |
| GET | `/api/sprites/[id]/download` | 프레임 ZIP 다운로드 | `src/app/api/sprites/[id]/download/route.ts` |

---

## 부록: 파일 구조 맵

```
src/
├── app/
│   ├── layout.tsx              # 루트 레이아웃 (폰트, 메타데이터)
│   ├── page.tsx                # 메인 페이지 (업로드 + 갤러리)
│   ├── globals.css             # 글로벌 스타일 (CSS 변수, 글래스모피즘)
│   └── api/
│       ├── upload/route.ts     # POST — 파일 업로드 엔드포인트
│       └── sprites/
│           ├── route.ts        # GET — 스프라이트 목록
│           └── [id]/
│               ├── route.ts              # GET/DELETE — 개별 스프라이트
│               ├── download/route.ts     # GET — ZIP 다운로드
│               ├── frames/[index]/route.ts  # GET — 프레임 이미지
│               ├── thumbnail/route.ts    # GET — 썸네일
│               └── original/route.ts     # GET — 원본 파일
├── components/
│   ├── layout/
│   │   ├── Header.tsx          # 상단 네비게이션
│   │   ├── Footer.tsx          # 하단 푸터
│   │   └── ClientProviders.tsx # Toast 프로바이더
│   ├── gallery/
│   │   ├── GalleryGrid.tsx     # 갤러리 그리드 레이아웃
│   │   ├── SpriteCard.tsx      # 스프라이트 카드 (애니메이션 미리보기)
│   │   └── FilterBar.tsx       # 검색, 카테고리, 정렬 필터
│   ├── upload/
│   │   ├── DropZone.tsx        # 드래그앤드롭 업로드 영역
│   │   ├── UploadModal.tsx     # 태그/그리드 설정 모달
│   │   └── ProcessingStatus.tsx # 처리 진행 표시
│   ├── download/
│   │   └── DownloadModal.tsx   # 다운로드 옵션 모달
│   ├── processing/
│   │   └── ManualGridEditor.tsx # 캔버스 기반 그리드 편집기
│   └── ui/
│       ├── Button.tsx          # 다중 변형 버튼
│       ├── Modal.tsx           # 재사용 모달
│       ├── Toast.tsx           # 토스트 알림 시스템
│       ├── ProgressBar.tsx     # 진행 바
│       └── GlassCard.tsx       # 글래스모피즘 카드
├── lib/
│   ├── processing/
│   │   ├── pipeline.ts         # 메인 오케스트레이터
│   │   ├── gif-processor.ts    # GIF 프레임 추출
│   │   ├── sprite-detector.ts  # 스프라이트 자동 감지
│   │   ├── frame-processor.ts  # 프레임 조작 (트림, 리사이즈, 정규화)
│   │   └── sheet-packer.ts     # 스프라이트시트 패킹
│   ├── storage/
│   │   ├── db.ts               # SQLite 초기화 + 스키마
│   │   ├── file-storage.ts     # 파일시스템 I/O
│   │   └── sprites-repo.ts     # DB CRUD 레포지토리
│   ├── ai/
│   │   ├── gemini-client.ts    # Gemini AI 스프라이트 분석
│   │   └── background-remover.ts # AI 배경 제거
│   ├── types/
│   │   ├── sprite.ts           # 스프라이트 관련 인터페이스
│   │   └── processing.ts       # 처리 파이프라인 타입
│   └── utils/
│       └── constants.ts        # 상수 (파일 제한, 카테고리, 프리셋 태그)
└── stores/
    ├── gallery-store.ts        # Zustand — 갤러리 필터/정렬 상태
    └── processing-store.ts     # Zustand — 업로드 진행 상태
```

### 데이터 디렉토리

```
data/
├── vfx_spriter.db              # SQLite 데이터베이스
├── vfx_spriter.db-shm          # WAL 공유 메모리
├── vfx_spriter.db-wal          # WAL 로그
└── sprites/
    └── {uuid}/
        ├── original.gif        # 원본 파일
        ├── spritesheet.png     # 패킹된 스프라이트시트
        ├── thumbnail.png       # 갤러리 미리보기 (280x280)
        ├── metadata.json       # Phaser 호환 메타데이터
        └── frames/
            ├── frame_0000.png
            ├── frame_0001.png
            └── ...
```
