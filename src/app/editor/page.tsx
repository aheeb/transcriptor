"use client";

import { VideoPlayer } from "~/app/_components/video-player";
import { CaptionEditor } from "~/app/_components/caption-editor";
import { VideoUpload } from "~/app/_components/video-upload";
import { api } from "~/trpc/react";
import { useState } from "react";
import type { Caption } from "~/types/caption";

export default function EditorPage() {
  const [currentVideoId, setCurrentVideoId] = useState<number | null>(null);

  const utils = api.useUtils();
  
  const updateCaption = api.caption.update.useMutation({
    onSuccess: () => {
      utils.caption.getByVideoId.invalidate({ videoId: currentVideoId ?? -1 });
    },
  });

  const createCaption = api.caption.create.useMutation({
    onSuccess: () => {
      utils.caption.getByVideoId.invalidate({ videoId: currentVideoId ?? -1 });
    },
  });

  const { data: captions, refetch: refetchCaptions } = api.caption.getByVideoId.useQuery({ 
    videoId: currentVideoId ?? -1 
  }, {
    enabled: currentVideoId !== null
  });

  const { data: video } = api.video.getById.useQuery({ 
    videoId: currentVideoId ?? -1 
  }, {
    enabled: currentVideoId !== null
  });

  const handleCaptionEdit = async (captions: Caption[], action: 'update' | 'split') => {
    if (!currentVideoId) return;

    if (action === 'split') {
      try {
        // First update the original caption
        await updateCaption.mutateAsync({
          id: captions[0].id,
          text: captions[0].text,
          startTime: captions[0].startTime,
          endTime: captions[0].endTime,
        });

        // Then create the new caption
        await createCaption.mutateAsync({
          videoId: currentVideoId,
          text: captions[1].text,
          startTime: captions[1].startTime,
          endTime: captions[1].endTime,
          style: captions[1].style ?? undefined,
        });

        await refetchCaptions();
      } catch (error) {
        console.error('Error splitting caption:', error);
      }
    } else {
      try {
        await updateCaption.mutateAsync({
          id: captions[0].id,
          text: captions[0].text,
          startTime: captions[0].startTime,
          endTime: captions[0].endTime,
        });
      } catch (error) {
        console.error('Error updating caption:', error);
      }
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-start p-8 bg-gradient-to-b from-[#2e026d] to-[#15162c] text-white">
      <h1 className="text-4xl font-bold mb-8">Caption Editor</h1>
      
      <div className="w-full max-w-4xl">
        <VideoUpload onUploadSuccess={(videoId) => {
          console.log("Upload success, setting videoId:", videoId);
          setCurrentVideoId(videoId);
        }} />
        
        {currentVideoId && video && (
          <>
            <VideoPlayer 
              videoUrl={video.url.startsWith('/') ? video.url : `/${video.url}`}
              captions={captions ?? []}
              videoId={currentVideoId}
              onCaptionEdit={handleCaptionEdit}
            />
            
            <CaptionEditor videoId={currentVideoId} />
          </>
        )}
      </div>
    </main>
  );
} 