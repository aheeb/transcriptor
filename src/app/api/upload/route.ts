import { writeFile, mkdir } from 'fs/promises';
import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { db } from "~/server/db";

// Configure options for the API route
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '500mb'
    },
    responseLimit: '500mb'
  },
};

export async function POST(req: NextRequest) {
  try {
    const data = await req.formData();
    const video = data.get('video') as File;
    
    if (!video) {
      return NextResponse.json(
        { error: 'No video file provided' },
        { status: 400 }
      );
    }

    // Create uploads directory if it doesn't exist
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    await mkdir(uploadDir, { recursive: true });

    // Generate unique filename
    const filename = `video-${Date.now()}${path.extname(video.name)}`;
    const filepath = path.join('uploads', filename);
    const fullPath = path.join(process.cwd(), 'public', filepath);

    // Convert File to Buffer and save
    const bytes = await video.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(fullPath, buffer);

    // Save to database
    const dbVideo = await db.video.create({
      data: {
        url: filepath,
      },
    });

    return NextResponse.json({ 
      success: true,
      videoId: dbVideo.id,
      url: filepath
    });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Upload failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 