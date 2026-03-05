# Background Image Prompts - GIF Spriter

Google Gemini Nano Banana (Image Generation) 용 프롬프트

---

## 페이지 컨셉

- **사이트**: VFX 스프라이트 리소스 라이브러리 (게임 개발자용)
- **테마**: 다크 글래스모피즘 UI, 배경색 `#0A0A0F` (거의 검정)
- **메인 컬러**: 보라색 `#6E56FF`, 보조 민트 `#00D4AA`
- **분위기**: 프리미엄, 테크니컬, 게임 VFX, 파티클 이펙트

---

## Prompt 1 — Hero Section 배경 (메인)

```
Abstract dark background for a game VFX tool website. Deep black base (#0A0A0F) with scattered glowing purple (#6E56FF) and cyan (#00D4AA) particle effects floating in space. Subtle energy trails and light streaks crossing diagonally. Faint grid lines fading into the darkness suggesting a digital workspace. Small scattered spark particles and soft bokeh orbs with purple tint. Very dark overall with elements concentrated in the top-right and bottom-left corners, leaving the center relatively empty for UI overlay. No text, no logos. Cinematic, futuristic, game development aesthetic. 2560x1440 resolution, widescreen landscape format.
```

## Prompt 2 — Hero Section 배경 (대안 - 파티클 집중)

```
Ultra dark abstract digital art background. Base color near-black (#0A0A0F). Floating magical particle effects in purple (#6E56FF) and teal (#00D4AA) scattered across the canvas. Multiple small VFX sprite-like elements: tiny explosions, spark bursts, glowing orbs, and energy wisps at various sizes, all with soft glow and bloom effects. Subtle noise texture overlay. Elements are sparse and spread out, creating depth with larger blurred particles in foreground and smaller sharp ones in the distance. Dark enough to place white text and glass-style UI cards on top. No characters, no text. Ethereal, premium, game-engine aesthetic. 2560x1440, landscape.
```

## Prompt 3 — 헤더 전용 배경 (좁은 스트립)

```
Ultra-wide dark banner background for website header. Near-black base (#0A0A0F) with a subtle horizontal gradient of deep purple (#6E56FF at 8% opacity) flowing from left to right. Tiny scattered particle dots and faint energy lines. Minimal and clean with very low visual noise. A few soft purple bokeh lights along the edges. Dark enough for white text overlay with glassmorphism effect. No text, no logos, no prominent objects. 2560x100 resolution, extreme widescreen strip format.
```

## Prompt 4 — Hero Section 배경 (게임 VFX 강조)

```
Dark atmospheric background inspired by game visual effects. Near-black (#0A0A0F) canvas with floating VFX elements: a faint purple fire wisp in the top-right corner, scattered cyan spark particles in the bottom-left, subtle smoke trails with purple tint drifting across the middle. Soft glow halos around each effect element. Deep space-like depth with stars or dust particles. Everything rendered with bloom and soft focus. Very dark and subdued - the VFX elements should be at 15-25% brightness, serving as ambient decoration not focal points. Suitable as a website background with UI elements on top. No text. 2560x1440, cinematic wide.
```

## Prompt 5 — Hero Section 배경 (미니멀 그라디언트)

```
Minimalist dark gradient background for a premium tech website. Center is pure near-black (#0A0A0F). Large soft radial gradient of deep purple (#6E56FF at 6% opacity) emanating from the top-left corner. Secondary smaller gradient of teal (#00D4AA at 4% opacity) from the bottom-right. Scattered micro-particles like digital dust floating throughout, each with a faint purple or white glow. Extremely subtle noise texture. Clean, modern, no distracting elements. Designed to complement glassmorphism UI with backdrop blur. No text, no icons. 2560x1440, landscape.
```

---

## 사용 가이드

| 위치 | 권장 프롬프트 | 적용 방법 |
|------|-------------|-----------|
| Hero 섹션 전체 배경 | Prompt 1 또는 4 | `section#upload-section`에 `background-image` 적용, `opacity: 0.3~0.5` |
| 헤더 배경 | Prompt 3 | `<header>`에 배경 적용, 기존 `backdrop-filter: blur` 유지 |
| 페이지 전체 배경 | Prompt 5 | `body`에 `background-image` 적용, 기존 CSS orb와 교체 |

### CSS 적용 예시

```css
/* Hero section background */
#upload-section {
  position: relative;
}
#upload-section::before {
  content: '';
  position: absolute;
  inset: 0;
  background: url('/images/hero-bg.webp') center/cover no-repeat;
  opacity: 0.4;
  z-index: -1;
  pointer-events: none;
}
```

### 이미지 최적화

- **포맷**: WebP (PNG 대비 60-80% 용량 절감)
- **해상도**: 2560x1440 원본 → 1920x1080 서빙 (retina 대응)
- **용량 목표**: 200KB 이하 (배경이므로 품질 70-80% 충분)
- **저장 위치**: `public/images/hero-bg.webp`
