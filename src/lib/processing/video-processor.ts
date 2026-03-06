import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import ffprobeInstaller from '@ffprobe-installer/ffprobe';
import sharp from '@/lib/processing/sharp-config';
import { MAX_FRAMES, PRE_RESIZE_MAX_DIM } from '@/lib/utils/constants';
import fs from 'fs';
import path from 'path';
import os from 'os';

ffmpeg.setFfmpegPath(ffmpegInstaller.path);
ffmpeg.setFfprobePath(ffprobeInstaller.path);

export interface VideoExtractionResult {
  frames: Buffer[];
  width: number;
  height: number;
  fps: number;
  frameCount: number;
}

/**
 * Get video metadata (duration, fps, width, height) using ffprobe.
 */
function probeVideo(filePath: string): Promise<{ width: number; height: number; fps: number; duration: number }> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) return reject(err);
      const videoStream = metadata.streams.find((s) => s.codec_type === 'video');
      if (!videoStream) return reject(new Error('No video stream found'));

      const width = videoStream.width || 256;
      const height = videoStream.height || 256;
      const duration = metadata.format.duration || 10;

      // Parse fps from r_frame_rate (e.g. "30/1")
      let fps = 30;
      if (videoStream.r_frame_rate) {
        const [num, den] = videoStream.r_frame_rate.split('/').map(Number);
        if (den && den > 0) fps = Math.round(num / den);
      }
      fps = Math.max(1, Math.min(fps, 60));

      resolve({ width, height, fps, duration });
    });
  });
}

/**
 * Extract frames from a video (MP4/WebM) using fluent-ffmpeg.
 */
export async function extractVideoFrames(
  buffer: Buffer,
  mimeType: string,
  onProgress?: (completed: number, total: number) => void
): Promise<VideoExtractionResult> {
  // Create temp directory for processing
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vfx-video-'));
  const ext = mimeType === 'video/webm' ? 'webm' : 'mp4';
  const inputPath = path.join(tmpDir, `input.${ext}`);
  const framesDir = path.join(tmpDir, 'frames');
  fs.mkdirSync(framesDir);

  try {
    // Write buffer to temp file
    fs.writeFileSync(inputPath, buffer);

    // Probe video info
    const info = await probeVideo(inputPath);

    // Calculate target fps to stay within MAX_FRAMES
    const maxFpsForDuration = Math.floor(MAX_FRAMES / info.duration);
    const targetFps = Math.min(info.fps, maxFpsForDuration, 30);
    const estimatedFrames = Math.ceil(info.duration * targetFps);

    // Build video filter
    const filters: string[] = [`fps=${targetFps}`];
    if (info.width > PRE_RESIZE_MAX_DIM || info.height > PRE_RESIZE_MAX_DIM) {
      filters.push(`scale='min(${PRE_RESIZE_MAX_DIM},iw)':'min(${PRE_RESIZE_MAX_DIM},ih)':force_original_aspect_ratio=decrease`);
    }

    // Extract frames
    await new Promise<void>((resolve, reject) => {
      ffmpeg(inputPath)
        .outputOptions([
          '-vf', filters.join(','),
          '-vsync', 'vfr',
        ])
        .output(path.join(framesDir, 'frame_%04d.png'))
        .on('end', () => resolve())
        .on('error', (err) => reject(err))
        .run();
    });

    // Read extracted frames
    const frameFiles = fs.readdirSync(framesDir)
      .filter((f) => f.endsWith('.png'))
      .sort()
      .slice(0, MAX_FRAMES);

    if (frameFiles.length === 0) {
      throw new Error('Failed to extract frames from video');
    }

    const frames: Buffer[] = [];
    for (let i = 0; i < frameFiles.length; i++) {
      const frameBuf = fs.readFileSync(path.join(framesDir, frameFiles[i]));
      frames.push(frameBuf);
      if (onProgress) onProgress(i + 1, frameFiles.length);
    }

    // Get actual dimensions from first frame
    const firstMeta = await sharp(frames[0]).metadata();
    const width = firstMeta.width || info.width;
    const height = firstMeta.height || info.height;

    return {
      frames,
      width,
      height,
      fps: targetFps,
      frameCount: frames.length,
    };
  } finally {
    // Cleanup temp directory
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}
