# VFX Spriter — 실수 추적 문서

개발 중 발생한 실수를 기록하여 재발을 방지합니다.

| # | 실수 | 원인 | 해결 |
|---|------|------|------|
| 1 | TailwindCSS v4 PostCSS 플러그인 | v4에서 `@tailwindcss/postcss`로 분리됨 | postcss.config.mjs에서 플러그인 변경 |
| 2 | TailwindCSS v4 CSS 구문 | `@tailwind` 지시문이 `@import "tailwindcss"`로 변경 | globals.css 전면 수정 |
| 3 | Buffer → NextResponse 타입 에러 | Buffer가 BodyInit에 할당 불가 | `new Uint8Array(buffer)`로 래핑 |
| 4 | create-next-app 폴더명 거부 | 대문자 포함 이름 npm 거부 | 수동 프로젝트 구성 |
| 5 | maxrects-packer API 불일치 | `addArray` → `add()` 메서드, IOption에 padding 없음 | API 문서 확인 후 수정 |
