import { writeFile, mkdir } from 'fs/promises';
import { NextResponse } from 'next/server';
import path from 'path';
import { db } from "~/server/db";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('video');
    
    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // Ensure uploads directory exists
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    try {
      await mkdir(uploadsDir, { recursive: true });
    } catch (err) {
      console.error('Failed to create uploads directory:', err);
    }

    // Save file to disk
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    // Get the filename from the FormData if available, or generate one
    const fileName = (file instanceof File) ? file.name : 'video';
    const fileExt = path.extname(fileName) || '.mp4';
    
    // Create unique filename
    const filename = `video-${Date.now()}${fileExt}`;
    const filepath = path.join(uploadsDir, filename);
    
    await writeFile(filepath, buffer);
    
    // Save to database
    const video = await db.video.create({
      data: {
        url: `/uploads/${filename}`,
      },
    });

    return NextResponse.json({ videoId: video.id, success: true });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ 
      error: 'Upload failed', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Increase the maximum file size limit if needed
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '50mb' // Adjust this value based on your needs
    }
  }
}; 