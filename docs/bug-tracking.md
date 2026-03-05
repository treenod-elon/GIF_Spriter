# Bug Tracking

---

## BUG-001: GIF Frame Extraction - Vertical Stacking Bug

**Status:** Fixed (code) / Re-upload Required (data)
**Severity:** Critical
**File:** `src/lib/processing/gif-processor.ts`
**Discovered:** 2026-03-04

---

### Symptom

GIF upload after download, each frame PNG contains all frames stacked vertically, not individual frame content.
- Frame 0: frame 0~N stacked (full height)
- Frame 1: frame 1~N stacked
- Frame 2: frame 2~N stacked
- ...
- Frame N: only frame N (correct)

---

### Root Cause Analysis

#### 1. Primary Cause: Sharp `animated: true` option in extraction loop

```typescript
// BEFORE (buggy) - gif-processor.ts:34
const frameBuffer = await sharp(buffer, { animated: true, page: i })
  .resize(width, height, { fit: 'fill' })
  .png()
  .toBuffer();
```

**Sharp constructor option behavior (v0.34.5):**

| Option | Default | Description |
|--------|---------|-------------|
| `page` | `0` | Starting page index (zero-based) |
| `pages` | `1` | Number of pages to extract from start |
| `animated` | `false` | Shorthand: `true` equals `pages: -1` (all pages) |

`animated: true` is internally converted to `pages: -1`.
Therefore `{ animated: true, page: i }` = "load ALL pages from page i to the last page."

Sharp stacks multi-page images vertically as a "toilet roll" image:
- Total height = pageHeight * (pageCount - i)
- This is why earlier frames have larger stacked heights

#### 2. Secondary Cause: `.resize()` masked the stacking

```typescript
.resize(width, height, { fit: 'fill' })
```

- `width` = single frame width (correct)
- `height` = `metadata.pageHeight` (single frame height, correct)
- `fit: 'fill'` = squash the stacked image into single frame dimensions

Result: the stacked image was squished into `frameWidth x frameHeight`, making it look distorted rather than simply stacked. This made the actual bug harder to identify visually.

#### 3. Cascade Damage: `normalizeFrameSizes()` amplification

```typescript
// pipeline.ts:119-124
if (frames.length > 1) {
  const normalized = await normalizeFrameSizes(frames);
  frames = normalized.frames;
  frameWidth = normalized.width;
  frameHeight = normalized.height;
}
```

`normalizeFrameSizes()` finds the MAX width/height across all frames:
- Frame 0 (with `.resize()` removed but without `pages: 1`): height = pageHeight * N
- Frame 1: height = pageHeight * (N-1)
- ...

`maxH` = frame 0's stacked height = pageHeight * N

All frames then get composited onto this max-height canvas, propagating the wrong dimensions to:
- Saved frame files on disk (`data/sprites/{id}/frames/*.png`)
- Database record (`frame_width`, `frame_height`)
- Spritesheet composition
- Metadata JSON

#### 4. Data Persistence: Old data survives code fix

Even after fixing the code, already-uploaded sprites retain:
- Corrupted frame PNGs on disk
- Wrong `frame_width`/`frame_height` in SQLite database
- Wrong spritesheet layout
- Wrong metadata.json

**This is why the fix appeared to "not work" - the user was viewing previously uploaded data.**

---

### Fix History

#### Attempt 1 (Failed Diagnosis)

```typescript
// Removed animated: true and .resize()
const frameBuffer = await sharp(buffer, { page: i })
  .png()
  .toBuffer();
```

**Assessment:** Actually correct per Sharp docs (`pages` defaults to `1`).
However, the fix was not verified because existing uploaded data was not re-processed.

#### Attempt 2 (Explicit)

```typescript
// Added explicit pages: 1
const frameBuffer = await sharp(buffer, { page: i, pages: 1 })
  .png()
  .toBuffer();
```

**Assessment:** Functionally identical to attempt 1, but more explicit and self-documenting.
`pages: 1` makes the intent unmistakable: extract exactly ONE page.

---

### Final Fix

```typescript
// gif-processor.ts:34 - AFTER
const frameBuffer = await sharp(buffer, { page: i, pages: 1 })
  .png()
  .toBuffer();
```

Changes:
1. `animated: true` removed - prevents loading all remaining pages
2. `pages: 1` added - explicitly limits to single page extraction
3. `.resize()` removed - unnecessary, each page is already `width x pageHeight`

---

### Remaining Action Items

- [ ] Re-upload existing GIF sprites to regenerate frames with fixed code
- [ ] OR implement a re-process API endpoint that re-extracts from saved `original.gif`

---

### Lessons Learned

1. **Sharp's `animated: true` is `pages: -1`**, not "enable animation support."
   It loads ALL pages into a vertically stacked image. Never use it for single-frame extraction.

2. **Always verify fixes with fresh data.** Code fixes to processing pipelines don't retroactively repair already-processed data on disk/DB.

3. **`.resize()` with `fit: 'fill'` can mask dimensional bugs.** It silently squashes any input to target dimensions, hiding evidence of incorrect source data.

4. **Make Sharp options explicit.** Use `{ page: i, pages: 1 }` instead of relying on defaults. Self-documenting code prevents this class of bug.

5. **Pipeline cascade effect.** A bug in the extraction stage propagates through normalization, spritesheet composition, and database storage. All downstream outputs must be regenerated when the source stage is fixed.

---
