import sharp from 'sharp';

// Limit concurrency to prevent memory exhaustion during
// multi-frame GIF extraction and spritesheet composition.
sharp.concurrency(1);

// Disable caching to avoid stale data when processing
// multiple pages from the same GIF buffer.
sharp.cache(false);

export default sharp;
