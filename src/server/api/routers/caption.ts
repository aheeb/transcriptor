import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { readFile } from 'fs/promises';
import { env } from "~/env";

const execAsync = promisify(exec);

interface SRTCaption {
  id: number;
  startTime: string;
  endTime: string;
  text: string;
}

function parseSRT(srtText: string): SRTCaption[] {
  const captions: SRTCaption[] = [];
  const blocks = srtText.trim().split('\n\n');

  blocks.forEach((block, index) => {
    const lines = block.split('\n');
    if (lines.length >= 3) {
      const timecode = lines[1].split(' --> ');
      captions.push({
        id: index + 1,
        startTime: timecode[0].trim(),
        endTime: timecode[1].trim(),
        text: lines.slice(2).join('\n').trim()
      });
    }
  });

  return captions;
}

export const captionRouter = createTRPCRouter({
  update: publicProcedure
    .input(z.object({
      id: z.number(),
      text: z.string(),
      startTime: z.string(),
      endTime: z.string(),
      style: z.object({
        fontSize: z.string().optional(),
        color: z.string().optional(),
        position: z.enum(['top', 'middle', 'bottom']).optional(),
        alignment: z.enum(['left', 'center', 'right']).optional(),
      }).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.caption.update({
        where: { id: input.id },
        data: {
          text: input.text,
          startTime: input.startTime,
          endTime: input.endTime,
          style: input.style ? JSON.stringify(input.style) : undefined,
        },
      });
    }),

  getByVideoId: publicProcedure
    .input(z.object({ videoId: z.number() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.caption.findMany({
        where: { videoId: input.videoId },
        orderBy: { startTime: 'asc' },
      });
    }),

  generateFromVideo: publicProcedure
    .input(z.object({ 
      videoId: z.number(),
      apiKey: z.string()
    }))
    .mutation(async ({ ctx, input }) => {
      // 1. Get video from database
      const video = await ctx.db.video.findUnique({
        where: { id: input.videoId },
      });
      
      if (!video) throw new Error('Video not found');
      
      // 2. Extract audio using ffmpeg
      const audioPath = path.join(process.cwd(), 'public', 'uploads', `audio-${input.videoId}.mp3`);
      const videoPath = path.join(process.cwd(), 'public', video.url);
      
      await execAsync(`ffmpeg -i "${videoPath}" -vn -acodec libmp3lame "${audioPath}"`);
      
      // 3. Read the audio file
      const audioFile = await readFile(audioPath);
      
      // 4. Call OpenAI Whisper API
      const formData = new FormData();
      const blob = new Blob([audioFile], { type: 'audio/mpeg' });
      formData.append('file', blob, 'audio.mp3');
      formData.append('model', 'whisper-1');
      formData.append('response_format', 'srt');  // Request SRT format directly
      console.log(process.env.OPENAI_API_KEY);
      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${input.apiKey}`,
        },
        body: formData,
      });
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Whisper API error: ${error}`);
      }
      
      const srtText = await response.text();
      
      // 5. Parse SRT and save captions
      const captions = parseSRT(srtText);
      
      // Create captions one by one, only including fields that exist in the schema
      for (const caption of captions) {
        await ctx.db.caption.create({
          data: {
            videoId: input.videoId,
            startTime: caption.startTime,
            endTime: caption.endTime,
            text: caption.text,
            // style is optional, so we don't include it here
          },
        });
      }
      
      return captions;
    }),

  create: publicProcedure
    .input(z.object({
      videoId: z.number(),
      text: z.string(),
      startTime: z.string(),
      endTime: z.string(),
      style: z.string().optional().nullable(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.caption.create({
        data: {
          videoId: input.videoId,
          text: input.text,
          startTime: input.startTime,
          endTime: input.endTime,
          style: input.style ?? undefined,
        },
      });
    }),

  updateAllPositions: publicProcedure
    .input(z.object({
      videoId: z.number(),
      position: z.object({
        x: z.number(),
        y: z.number(),
      }),
    }))
    .mutation(async ({ ctx, input }) => {
      const captions = await ctx.db.caption.findMany({
        where: { videoId: input.videoId },
      });

      for (const caption of captions) {
        const currentStyle = caption.style ? JSON.parse(caption.style) : {};
        await ctx.db.caption.update({
          where: { id: caption.id },
          data: {
            style: JSON.stringify({
              ...currentStyle,
              position: input.position,
            }),
          },
        });
      }

      return { success: true };
    }),
}); 