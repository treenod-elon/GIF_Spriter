import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { processUpload } from '@/lib/processing/pipeline';
import { createJob, updateProgress, removeJob } from '@/lib/processing/progress';
import {
  ALL_ACCEPTED_TYPES,
  MAX_VIDEO_SIZE_MB,
  MAX_GIF_SIZE_MB,
  MAX_IMAGE_SIZE_MB,
  ACCEPTED_VIDEO_TYPES,
  ACCEPTED_GIF_TYPE,
} from '@/lib/utils/constants';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const category = formData.get('category') as string | undefined;
    const gridRows = formData.get('gridRows') as string | undefined;
    const gridCols = formData.get('gridCols') as string | undefined;
    const gridPadding = formData.get('gridPadding') as string | undefined;
    const tagsRaw = formData.get('tags') as string | undefined;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // --- Server-side validation ---

    // MIME type check
    if (!ALL_ACCEPTED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `Unsupported file type: ${file.type}` },
        { status: 400 }
      );
    }

    // File size check per type
    const isVideo = ACCEPTED_VIDEO_TYPES.includes(file.type);
    const isGif = file.type === ACCEPTED_GIF_TYPE;
    const maxMB = isVideo
      ? MAX_VIDEO_SIZE_MB
      : isGif
        ? MAX_GIF_SIZE_MB
        : MAX_IMAGE_SIZE_MB;
    if (file.size > maxMB * 1024 * 1024) {
      return NextResponse.json(
        { error: `File too large. Maximum size for this type is ${maxMB} MB.` },
        { status: 400 }
      );
    }

    // Grid bounds validation
    const parsedRows = gridRows ? parseInt(gridRows) : undefined;
    const parsedCols = gridCols ? parseInt(gridCols) : undefined;
    if (parsedRows !== undefined && (parsedRows < 1 || parsedRows > 100)) {
      return NextResponse.json(
        { error: 'gridRows must be between 1 and 100' },
        { status: 400 }
      );
    }
    if (parsedCols !== undefined && (parsedCols < 1 || parsedCols > 100)) {
      return NextResponse.json(
        { error: 'gridCols must be between 1 and 100' },
        { status: 400 }
      );
    }

    let tags: string[] | undefined;
    if (tagsRaw) {
      try {
        tags = JSON.parse(tagsRaw);
      } catch {
        // ignore invalid JSON
      }
    }

    // --- Fire-and-forget processing ---
    const jobId = randomUUID();
    createJob(jobId);

    processUpload(file, {
      category: category || undefined,
      gridRows: parsedRows,
      gridCols: parsedCols,
      gridPadding: gridPadding ? parseInt(gridPadding) : undefined,
      tags,
    }, jobId)
      .then((result) => {
        updateProgress(jobId, {
          stage: 'complete',
          progress: 100,
          result: JSON.stringify(result),
        });
      })
      .catch((err) => {
        console.error('Processing error:', err);
        updateProgress(jobId, {
          stage: 'error',
          progress: 0,
          error: err instanceof Error ? err.message : 'Processing failed',
        });
      })
      .finally(() => {
        removeJob(jobId);
      });

    return NextResponse.json({ jobId, status: 'processing' }, { status: 202 });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Upload failed' },
      { status: 500 }
    );
  }
}
