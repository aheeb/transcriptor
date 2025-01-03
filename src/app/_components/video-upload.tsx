"use client";

import { useState } from 'react';
import { api } from "~/trpc/react";

interface VideoUploadProps {
  onUploadSuccess: (videoId: number) => void;
  apiKey: string;
}

export function VideoUpload({ onUploadSuccess, apiKey }: VideoUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  
  const generateCaptions = api.caption.generateFromVideo.useMutation({
    onSuccess: (data) => {
      console.log("Captions generated:", data);
      const videoId = data[0]?.videoId;
      console.log("Setting videoId:", videoId);
      if (videoId) {
        onUploadSuccess(videoId);
      }
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setVideoFile(file);
  };

  const handleUpload = async () => {
    if (!videoFile) return;
    
    setIsUploading(true);
    
    try {
      const formData = new FormData();
      formData.append('video', videoFile);
      
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.details || data.error || 'Upload failed');
      }
      
      // Generate captions with API key
      if (data.videoId) {
        console.log("Upload successful, videoId:", data.videoId);
        await generateCaptions.mutateAsync({ 
          videoId: data.videoId,
          apiKey: apiKey 
        });
        onUploadSuccess(data.videoId);
      } else {
        throw new Error('No videoId returned from upload');
      }
      
    } catch (error) {
      console.error('Upload/caption generation failed:', error);
      alert(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-2 sm:p-4">
      <div className="flex flex-col gap-4">
        <input
          type="file"
          accept="video/*"
          onChange={handleFileChange}
          className="w-full text-sm sm:text-base"
        />
        <button
          onClick={handleUpload}
          disabled={!videoFile || isUploading}
          className="w-full px-4 py-3 bg-blue-600 text-white rounded disabled:opacity-50 text-base"
        >
          {isUploading ? 'Processing...' : 'Upload & Generate Captions'}
        </button>
      </div>
    </div>
  );
} 