import { spawn } from 'child_process';
import path from 'path';
import { resolveStoragePath } from './storage';
import { getDb } from './db/client';
import { media } from './db/schema';
import { eq } from 'drizzle-orm';

export async function transcodeVideoToMp4(
  mediaId: number,
  originalStoragePath: string
) {
  const db = getDb();

  // Set status to processing
  await db
    .update(media)
    .set({ conversionStatus: 'processing' })
    .where(eq(media.id, mediaId));

  const absoluteOriginalPath = resolveStoragePath(originalStoragePath);

  // Create output path in the same directory but with .mp4 extension and unique suffix
  const dir = path.dirname(absoluteOriginalPath);
  const ext = path.extname(absoluteOriginalPath);
  const baseName = path.basename(absoluteOriginalPath, ext);
  const outputFileName = `${baseName}_converted.mp4`;
  const absoluteOutputPath = path.join(dir, outputFileName);

  // Relative path to store in DB
  const originalDir = path.dirname(originalStoragePath);
  const playbackStoragePath = path.posix.join(originalDir, outputFileName);

  return new Promise<void>((resolve, reject) => {
    // ffmpeg -i input.wmv -c:v libx264 -c:a aac -movflags +faststart output.mp4
    const ffmpeg = spawn('ffmpeg', [
      '-y', // overwrite output if exists
      '-i', absoluteOriginalPath,
      '-c:v', 'libx264',
      '-c:a', 'aac',
      '-movflags', '+faststart',
      absoluteOutputPath
    ]);

    ffmpeg.on('close', async (code) => {
      if (code === 0) {
        // Success
        try {
          await db
            .update(media)
            .set({
              conversionStatus: 'ready',
              playbackPath: playbackStoragePath,
              playbackMimeType: 'video/mp4'
            })
            .where(eq(media.id, mediaId));
          resolve();
        } catch (e) {
          reject(e);
        }
      } else {
        // Failed
        try {
          await db
            .update(media)
            .set({ conversionStatus: 'failed' })
            .where(eq(media.id, mediaId));
        } catch {
          // ignore DB update failure, primary error is FFmpeg exit code
        }
        reject(new Error(`FFmpeg exited with code ${code}`));
      }
    });

    ffmpeg.on('error', async (err) => {
      // Missing ffmpeg or other error
      try {
        await db
          .update(media)
          .set({ conversionStatus: 'failed' })
          .where(eq(media.id, mediaId));
      } catch {
        // ignore DB update failure, primary error is FFmpeg spawn error
      }
      reject(new Error(`FFmpeg error: ${err.message}`));
    });
  });
}
