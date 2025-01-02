"use client";

import { useState, useEffect, useRef } from 'react';
import { api } from "~/trpc/react";
import { type CaptionStyle } from '~/types/caption';

interface Caption {
  id: number;
  startTime: string;
  endTime: string;
  text: string;
  style?: string;
}

interface VideoPlayerProps {
  videoUrl: string;
  captions: Caption[];
  onCaptionEdit: (captions: Caption[], action: 'update' | 'split') => void;
  videoId: number;
}

interface Position {
  x: number;
  y: number;
}

interface CursorPosition {
  captionId: number;
  textIndex: number;
  timestamp: number;
}

export function VideoPlayer({ videoUrl, captions, onCaptionEdit, videoId }: VideoPlayerProps) {
  const [currentTime, setCurrentTime] = useState(0);
  const [currentCaption, setCurrentCaption] = useState<Caption | null>(null);
  const [dragPosition, setDragPosition] = useState<Position>({ x: 0.5, y: 0.9 });
  const [isDragging, setIsDragging] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const utils = api.useUtils();
  const [selectedCaption, setSelectedCaption] = useState<Caption | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [cursorPosition, setCursorPosition] = useState<CursorPosition | null>(null);
  const [isDraggingPlayhead, setIsDraggingPlayhead] = useState(false);

  useEffect(() => {
    const caption = captions.find(
      cap => parseTimeToSeconds(cap.startTime) <= currentTime && 
             parseTimeToSeconds(cap.endTime) >= currentTime
    );
    setCurrentCaption(caption ?? null);
  }, [currentTime, captions]);

  const parseTimeToSeconds = (timeStr: string): number => {
    const [time, milliseconds] = timeStr.split(',');
    const [hours, minutes, seconds] = time.split(':').map(Number);
    return (hours * 3600) + (minutes * 60) + seconds + (parseInt(milliseconds || '0') / 1000);
  };

  const updateAllCaptionsPosition = api.caption.updateAllPositions.useMutation({
    onSuccess: () => {
      utils.caption.getByVideoId.invalidate({ videoId });
    },
  });

  useEffect(() => {
    if (currentCaption?.style) {
      try {
        const style = JSON.parse(currentCaption.style);
        if (style.position) {
          setDragPosition(style.position);
        }
      } catch (error) {
        console.error('Error parsing caption style:', error);
      }
    }
  }, [currentCaption]);

  const handleDragStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragMove = (e: React.MouseEvent) => {
    if (!isDragging || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const newPosition = {
      x: Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height)),
    };
    setDragPosition(newPosition);
  };

  const handleDragEnd = async () => {
    if (!isDragging) return;
    setIsDragging(false);

    try {
      await updateAllCaptionsPosition.mutateAsync({
        videoId,
        position: dragPosition,
      });
    } catch (error) {
      console.error('Error updating caption positions:', error);
    }
  };

  const togglePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const downloadMutation = api.video.downloadWithCaptions.useMutation({
    onSuccess: (data) => {
      const link = document.createElement('a');
      link.href = data.url;
      link.download = 'video-with-captions.mp4';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setIsDownloading(false);
    },
    onError: (error) => {
      console.error('Download failed:', error);
      alert('Failed to download video with captions');
      setIsDownloading(false);
    }
  });

  const handleCaptionSplit = () => {
    if (!cursorPosition || !selectedCaption) return;
    
    const beforeText = selectedCaption.text.slice(0, cursorPosition.textIndex);
    const afterText = selectedCaption.text.slice(cursorPosition.textIndex);
    
    const firstCaption: Caption = {
      ...selectedCaption,
      endTime: formatTime(cursorPosition.timestamp),
      text: beforeText.trim(),
    };
    
    const secondCaption: Caption = {
      id: -Date.now(),
      startTime: formatTime(cursorPosition.timestamp),
      endTime: selectedCaption.endTime,
      text: afterText.trim(),
      style: selectedCaption.style ?? undefined,
    };

    onCaptionEdit([firstCaption, secondCaption], 'split');
    setSelectedCaption(null);
    setCursorPosition(null);
  };

  const formatTime = (totalSeconds: number): string => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);
    const milliseconds = Math.floor((totalSeconds % 1) * 1000);
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')},${milliseconds.toString().padStart(3, '0')}`;
  };

  const seekTo = (timeInSeconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = timeInSeconds;
    }
  };

  const getTimelinePosition = (time: string) => {
    if (!duration) return 0;
    const seconds = parseTimeToSeconds(time);
    const position = (seconds / duration) * 100;
    return Math.min(Math.max(position, 0), 100);
  };

  const handlePlayheadDragStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDraggingPlayhead(true);
    const rect = e.currentTarget.parentElement?.getBoundingClientRect();
    if (rect) {
      const pos = (e.clientX - rect.left) / rect.width;
      seekTo(pos * duration);
    }
  };

  const handleTimelineMouseMove = (e: React.MouseEvent) => {
    if (isDraggingPlayhead) {
      const rect = e.currentTarget.getBoundingClientRect();
      const pos = (e.clientX - rect.left) / rect.width;
      seekTo(pos * duration);
      
      const captionAtPosition = captions.find(
        cap => parseTimeToSeconds(cap.startTime) <= currentTime && 
               parseTimeToSeconds(cap.endTime) >= currentTime
      );
      if (captionAtPosition && selectedCaption?.id !== captionAtPosition.id) {
        setSelectedCaption(captionAtPosition);
      }
    }
  };

  const handleTimelineDragEnd = () => {
    setIsDraggingPlayhead(false);
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      <div 
        ref={containerRef}
        className="relative aspect-video bg-black"
        onMouseMove={handleDragMove}
        onMouseUp={handleDragEnd}
        onMouseLeave={handleDragEnd}
      >
        <video 
          ref={videoRef}
          src={videoUrl}
          className="w-full h-full"
          onTimeUpdate={() => setCurrentTime(videoRef.current?.currentTime || 0)}
          onLoadedMetadata={() => setDuration(videoRef.current?.duration || 0)}
          onClick={togglePlayPause}
        />

        {currentCaption && (
          <div
            className="absolute cursor-move select-none group"
            style={{
              top: `${dragPosition.y * 100}%`,
              left: `${dragPosition.x * 100}%`,
              transform: 'translate(-50%, -50%)',
              textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
              userSelect: 'none',
            }}
            onMouseDown={(e) => {
              if (e.ctrlKey || e.metaKey) {
                setSelectedCaption(currentCaption);
              } else {
                handleDragStart(e);
              }
            }}
          >
            <span className="bg-black/50 px-2 py-1 rounded text-white whitespace-pre-wrap">
              {currentCaption.text}
            </span>
            <div className="hidden group-hover:block absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-black/80 rounded px-2 py-1 text-xs text-white">
              Ctrl/Cmd + Click to edit
            </div>
          </div>
        )}

        {/* Video controls with timeline */}
        <div className="absolute bottom-0 left-0 right-0 bg-black/50 p-2">
          <div className="flex items-center gap-2">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                togglePlayPause();
              }}
              className="hover:bg-white/20 p-2 rounded"
            >
              {isPlaying ? '⏸️' : '▶️'}
            </button>
            <div 
              className="flex-1 h-2 bg-gray-700 rounded cursor-pointer relative"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const pos = (e.clientX - rect.left) / rect.width;
                seekTo(pos * duration);
              }}
            >
              {/* Playback progress */}
              <div 
                className="absolute top-0 left-0 h-full bg-white rounded"
                style={{ width: `${(currentTime / duration) * 100}%` }}
              />
              {/* Caption markers */}
              {captions.map((caption, index) => (
                <div
                  key={index}
                  className="absolute top-0 h-full w-1 bg-blue-500/50"
                  style={{
                    left: `${getTimelinePosition(caption.startTime)}%`,
                    width: `${getTimelinePosition(caption.endTime) - getTimelinePosition(caption.startTime)}%`,
                  }}
                />
              ))}
            </div>
            <span className="text-sm text-white">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>
        </div>
      </div>

      {/* Timeline section - only show if we have duration */}
      {duration > 0 && (
        <div className="mt-8 bg-gray-900 rounded-lg p-4">
          <div 
            className="relative h-24 bg-gray-800 mb-4"
            onMouseMove={handleTimelineMouseMove}
            onMouseUp={handleTimelineDragEnd}
            onMouseLeave={handleTimelineDragEnd}
          >
            {/* Time markers */}
            {Array.from({ length: Math.ceil(duration / 10) }).map((_, i) => (
              <div
                key={i}
                className="absolute h-2 w-px bg-gray-600"
                style={{ left: `${(i * 10 / duration) * 100}%` }}
              >
                <span className="absolute -top-4 text-xs transform -translate-x-1/2 text-gray-400">
                  {formatTime(i * 10)}
                </span>
              </div>
            ))}

            {/* Caption segments */}
            {captions.map((caption, index) => (
              <div
                key={index}
                className="absolute h-12 bg-blue-500/20 hover:bg-blue-500/30 cursor-pointer"
                style={{
                  left: `${getTimelinePosition(caption.startTime)}%`,
                  width: `${getTimelinePosition(caption.endTime) - getTimelinePosition(caption.startTime)}%`,
                  top: '20px',
                }}
                onClick={() => {
                  setSelectedCaption(caption);
                  seekTo(parseTimeToSeconds(caption.startTime));
                }}
              >
                <div className="p-1 text-xs truncate">
                  {caption.text}
                </div>
              </div>
            ))}

            {/* Updated Playhead */}
            <div
              className="absolute top-0 w-1 h-full bg-white cursor-col-resize hover:bg-blue-400 transition-colors"
              style={{ left: `${(currentTime / duration) * 100}%` }}
              onMouseDown={handlePlayheadDragStart}
            />
          </div>
        </div>
      )}

      {/* Caption Editor */}
      {selectedCaption && (
        <div className="mt-4 bg-gray-900 rounded-lg p-4">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm mb-1">Start Time</label>
              <input
                type="text"
                value={selectedCaption.startTime}
                onChange={(e) => {
                  setSelectedCaption({
                    ...selectedCaption,
                    startTime: e.target.value
                  });
                }}
                className="bg-gray-800 px-2 py-1 rounded"
              />
            </div>
            <div>
              <label className="block text-sm mb-1">End Time</label>
              <input
                type="text"
                value={selectedCaption.endTime}
                onChange={(e) => {
                  setSelectedCaption({
                    ...selectedCaption,
                    endTime: e.target.value
                  });
                }}
                className="bg-gray-800 px-2 py-1 rounded"
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm mb-1">Caption Text</label>
            <textarea
              value={selectedCaption.text}
              onChange={(e) => {
                setSelectedCaption({
                  ...selectedCaption,
                  text: e.target.value
                });
              }}
              onClick={(e) => {
                const textarea = e.target as HTMLTextAreaElement;
                const cursorIndex = textarea.selectionStart;
                
                const captionDuration = parseTimeToSeconds(selectedCaption.endTime) - parseTimeToSeconds(selectedCaption.startTime);
                const textProgress = cursorIndex / selectedCaption.text.length;
                const cursorTimestamp = parseTimeToSeconds(selectedCaption.startTime) + (captionDuration * textProgress);
                
                setCursorPosition({
                  captionId: selectedCaption.id,
                  textIndex: cursorIndex,
                  timestamp: cursorTimestamp,
                });
              }}
              className="w-full bg-gray-800 px-2 py-1 rounded"
              rows={3}
            />
          </div>

          <div className="flex gap-4">
            {cursorPosition && (
              <button
                onClick={handleCaptionSplit}
                className="px-4 py-2 bg-yellow-600 rounded hover:bg-yellow-700"
              >
                Split at Cursor
              </button>
            )}
            <button
              onClick={() => {
                onCaptionEdit([selectedCaption], 'update');
                setSelectedCaption(null);
              }}
              className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700"
            >
              Save Changes
            </button>
            <button
              onClick={() => setSelectedCaption(null)}
              className="px-4 py-2 bg-gray-700 rounded hover:bg-gray-600"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="mt-4 flex justify-center gap-4">
        <button
          onClick={() => {
            setIsDownloading(true);
            downloadMutation.mutate({ videoId });
          }}
          disabled={isDownloading}
          className="px-4 py-2 bg-green-600/20 rounded hover:bg-green-600/30 text-sm disabled:opacity-50"
        >
          {isDownloading ? 'Processing...' : 'Download with Captions'}
        </button>
      </div>
    </div>
  );
} 