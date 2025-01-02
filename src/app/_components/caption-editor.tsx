"use client";

import { useState } from 'react';
import { api } from "~/trpc/react";
import type { CaptionStyle } from './types';

export function CaptionEditor({ videoId }: { videoId: number }) {
  const [selectedStyle, setSelectedStyle] = useState<CaptionStyle>({
    fontSize: '1em',
    color: '#ffffff',
    position: 'bottom',
    alignment: 'center',
  });

  // Query captions
  const { data: captions } = api.caption.getByVideoId.useQuery({ videoId });
  
  // Mutation for updating captions
  const updateCaption = api.caption.update.useMutation({
    // Optionally invalidate the captions query after update
    onSuccess: () => {
      utils.caption.getByVideoId.invalidate({ videoId });
    },
  });

  const utils = api.useUtils();

  return (
    <div>
      {captions?.map((caption) => (
        <div key={caption.id} className="p-4 border rounded mb-2">
          <div className="flex justify-between mb-2">
            <p>{caption.text}</p>
            <div className="flex gap-2">
              <select
                value={caption.style?.position ?? 'bottom'}
                onChange={(e) => {
                  updateCaption.mutate({
                    ...caption,
                    style: { ...caption.style, position: e.target.value as CaptionStyle['position'] }
                  });
                }}
                className="bg-gray-800 rounded px-2"
              >
                <option value="top">Top</option>
                <option value="middle">Middle</option>
                <option value="bottom">Bottom</option>
              </select>
              
              <input
                type="color"
                value={caption.style?.color ?? '#ffffff'}
                onChange={(e) => {
                  updateCaption.mutate({
                    ...caption,
                    style: { ...caption.style, color: e.target.value }
                  });
                }}
                className="w-8 h-8 rounded"
              />
              
              {/* Add more style controls */}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
} 