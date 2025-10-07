'use client';

import { useState } from 'react';
import Image from 'next/image';

interface YouTubeVideo {
  id: { videoId: string };
  snippet: {
    title: string;
    description: string;
    thumbnails: {
      medium: {
        url: string;
        width: number;
        height: number;
      };
    };
    channelTitle: string;
    publishedAt: string;
    channelId: string;
  };
}

interface YouTubeVideoCardProps {
  video: YouTubeVideo;
}

const YouTubeVideoCard = ({ video }: YouTubeVideoCardProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [animationKey, setAnimationKey] = useState<number>(0); // 用于重置动画

  const handleEmbedPlay = () => {
    setIsPlaying(true);
  };

  const handleOpenInNewTab = () => {
    window.open(`https://www.youtube.com/watch?v=${video.id.videoId}`, '_blank');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };



  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 overflow-hidden">
      {/* 视频缩略图区域 */}
      <div className="relative aspect-video bg-gray-200 dark:bg-gray-700">
        {isPlaying ? (
          <div className="w-full h-full">
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${video.id.videoId}?autoplay=1&rel=0`}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              title={video.snippet.title}
            />
            {/* 关闭播放按钮 */}
            <button
              onClick={() => setIsPlaying(false)}
              className="absolute top-2 right-2 bg-black bg-opacity-75 text-white p-2 rounded-full hover:bg-opacity-90 transition-opacity"
              aria-label="关闭播放"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ) : (
          <>
            {!imageError ? (
              <Image
                src={video.snippet.thumbnails.medium.url}
                alt={video.snippet.title}
                fill
                className="object-cover"
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-300 dark:bg-gray-600">
                <svg className="w-12 h-12 text-gray-500" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
              </div>
            )}
            
            {/* 播放按钮覆盖层 */}
            <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-30 transition-all duration-300 flex items-center justify-center group">
              <button
                onClick={handleEmbedPlay}
                className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-red-600 hover:bg-red-700 text-white rounded-full p-4 transform hover:scale-110 transition-transform"
                aria-label="播放视频"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z"/>
                </svg>
              </button>
            </div>
            
            {/* YouTube标识 */}
            <div className="absolute bottom-2 right-2 bg-red-600 text-white text-xs px-2 py-1 rounded flex items-center">
              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 24 24">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
              </svg>
              YouTube
            </div>
          </>
        )}
      </div>

      {/* 视频信息区域 */}
      <div className="p-4">
        <div 
          className="relative mb-2 group/title"
          onMouseEnter={() => setAnimationKey(prev => prev + 1)} // 鼠标进入时重置动画
        >
          <h3 className="font-semibold text-gray-900 dark:text-white text-sm truncate">
            {video.snippet.title}
          </h3>
          {/* 滚动显示长标题的 tooltip */}
          <div
            className='absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-gray-800/95 backdrop-blur-sm text-white text-xs rounded-md shadow-xl border border-gray-600/30 opacity-0 invisible group-hover/title:opacity-100 group-hover/title:visible transition-all duration-200 ease-out delay-100 pointer-events-none z-[9999] overflow-hidden'
            style={{
              maxWidth: 'min(280px, 85vw)',
              minWidth: '120px',
              height: '32px',
            }}
          >
            {video.snippet.title.length > 12 ? (
              // 长标题：使用滚动效果
              <div
                key={animationKey} // 使用key来强制重新渲染和重置动画
                className='px-3 py-2 whitespace-nowrap flex items-center h-full'
                style={{
                  animation: 'scroll-text 10s linear infinite 1s',
                  animationFillMode: 'both',
                }}
              >
                {video.snippet.title}
                <span style={{ marginLeft: '60px' }}>{video.snippet.title}</span>
                <span style={{ marginLeft: '60px' }}>{video.snippet.title}</span>
              </div>
            ) : (
              // 短标题：居中显示，不滚动
              <div
                className='px-3 py-2 flex items-center justify-center h-full'
                style={{ textAlign: 'center' }}
              >
                {video.snippet.title}
              </div>
            )}
            
            {/* 左右渐变遮罩，仅在长标题时显示 */}
            {video.snippet.title.length > 12 && (
              <>
                <div className='absolute top-0 left-0 w-6 h-full bg-gradient-to-r from-gray-800/95 via-gray-800/80 to-transparent pointer-events-none z-10'></div>
                <div className='absolute top-0 right-0 w-6 h-full bg-gradient-to-l from-gray-800/95 via-gray-800/80 to-transparent pointer-events-none z-10'></div>
              </>
            )}
            
            <div className='absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800/95'></div>
          </div>
        </div>
        
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-3">
          <span className="truncate">{video.snippet.channelTitle}</span>
          <span>{formatDate(video.snippet.publishedAt)}</span>
        </div>
        
        {/* 操作按钮 */}
        <div className="flex space-x-2">
          <button
            onClick={handleEmbedPlay}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white text-xs py-2 px-3 rounded transition-colors flex items-center justify-center"
          >
            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z"/>
            </svg>
            嵌入播放
          </button>
          <button
            onClick={handleOpenInNewTab}
            className="flex-1 bg-gray-600 hover:bg-gray-700 text-white text-xs py-2 px-3 rounded transition-colors flex items-center justify-center"
          >
            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            新窗口
          </button>
        </div>
      </div>
    </div>
  );
};

export default YouTubeVideoCard;