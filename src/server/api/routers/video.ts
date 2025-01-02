import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import path from "path";
import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFile, unlink } from 'fs/promises';

const execAsync = promisify(exec);

export const videoRouter = createTRPCRouter({
  getById: publicProcedure
    .input(z.object({ videoId: z.number() }))
    .query(async ({ ctx, input }) => {
      const video = await ctx.db.video.findUnique({
        where: { id: input.videoId },
      });
      
      if (!video) return null;
      
      return {
        ...video,
        url: video.url.startsWith('/') ? video.url : `/uploads/${path.basename(video.url)}`,
      };
    }),

  downloadWithCaptions: publicProcedure
    .input(z.object({ videoId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const video = await ctx.db.video.findUnique({
        where: { id: input.videoId },
        include: { captions: true }
      });

      if (!video) throw new Error('Video not found');

      const timestamp = Date.now();
      const assPath = path.join(process.cwd(), 'public', 'uploads', `temp-${input.videoId}-${timestamp}.ass`);
      const outputVideoPath = path.join(process.cwd(), 'public', 'uploads', `video-with-captions-${input.videoId}-${timestamp}.mp4`);
      const inputVideoPath = path.join(process.cwd(), 'public', video.url);

      try {
        await writeFile(assPath, generateSrtContent(video.captions));
        await execAsync(`ffmpeg -i "${inputVideoPath}" -vf "ass=${assPath}" "${outputVideoPath}"`);
        await unlink(assPath);

        return { url: `/uploads/video-with-captions-${input.videoId}-${timestamp}.mp4` };
      } catch (error) {
        try {
          await unlink(assPath).catch(() => {});
          await unlink(outputVideoPath).catch(() => {});
        } catch {}
        throw error;
      }
    }),
});

function generateSrtContent(captions: any[]) {
  // Create ASS style header for more precise positioning
  const header = `[Script Info]
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,48,&H00FFFFFF,&H000000FF,&H00000000,&H80000000,0,0,0,0,100,100,0,0,1,2,3,2,10,10,10,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n`;

  const events = captions
    .map((caption) => {
      const startTime = convertSrtToAssTime(caption.startTime);
      const endTime = convertSrtToAssTime(caption.endTime);
      let position = '';

      if (caption.style) {
        try {
          const style = JSON.parse(caption.style);
          if (style.position) {
            // Convert normalized coordinates to actual pixel positions
            const x = Math.round(style.position.x * 1920); // ASS uses actual pixels
            const y = Math.round(style.position.y * 1080);
            position = `{\\pos(${x},${y})}`;
          }
        } catch (error) {
          console.error('Error parsing caption style:', error);
        }
      }

      return `Dialogue: 0,${startTime},${endTime},Default,,0,0,0,,${position}${caption.text}`;
    })
    .join('\n');

  return header + events;
}

function convertSrtToAssTime(srtTime: string): string {
  // Convert from 00:00:00,000 to 0:00:00.00 format
  const [time, milliseconds] = srtTime.split(',');
  const ms = (parseInt(milliseconds) / 10).toFixed(2);
  return `${time.replace(/^0/, '')}.${ms}`;
}