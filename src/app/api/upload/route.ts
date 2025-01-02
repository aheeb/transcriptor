import { writeFile, mkdir } from 'fs/promises';
import { NextResponse } from 'next/server';
import path from 'path';
import { db } from "~/server/db";

// Configure options for the API route
export const config = {
  api: {
    bodyParser: false, // Disable the default body parser
    responseLimit: false, // Remove response size limit
  },
};

export async function POST(req: Request) {
  try {
    // Ensure the request is a FormData request
    if (!req.headers.get('content-type')?.includes('multipart/form-data')) {
      return NextResponse.json({ error: 'Invalid content type' }, { status: 400 });
    }

    const formData = await req.formData();
    const file = formData.get('video') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // Optional: Add file size check
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (file.size > maxSize) {
      return NextResponse.json({ 
        error: 'File too large', 
        details: 'Maximum file size is 100MB' 
      }, { status: 413 });
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
    
    // Create unique filename
    const filename = `video-${Date.now()}${path.extname(file.name)}`;
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