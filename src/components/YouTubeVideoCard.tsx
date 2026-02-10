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
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [tooltipWidth, setTooltipWidth] = useState<number | undefined>(undefined);
  const [showMobileTooltip, setShowMobileTooltip] = useState(false);
  const [mobileTooltipPosition, setMobileTooltipPosition] = useState({ x: 0, y: 0 });
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);

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

  // 检测是否为移动设备
  const isMobile = () => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth <= 768 || ('ontouchstart' in window && window.innerWidth <= 1024);
  };

  // 检查标题是否需要显示工具提示
  const shouldShowTooltip = (title: string) => {
    // 对于中文字符，长度超过8个字符就显示工具提示
    // 对于英文字符，长度超过15个字符就显示工具提示
    const chineseCharCount = (title.match(/[\u4e00-\u9fa5]/g) || []).length;
    const totalLength = title.length;

    if (chineseCharCount > 8) return true;
    if (totalLength > 15) return true;

    return false;
  };

  // 移动设备点击标题显示完整内容
  const handleMobileTitleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isMobile() || !shouldShowTooltip(video.snippet.title)) return;

    const rect = (e.target as HTMLElement).getBoundingClientRect();
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;

    // 计算最佳显示位置
    let tooltipX = rect.left + rect.width / 2;
    let tooltipY = rect.bottom + 10;

    // 如果下方空间不够，显示在上方
    if (tooltipY + 100 > screenHeight) {
      tooltipY = rect.top - 10;
    }

    // 水平居中，但确保不超出屏幕
    tooltipX = Math.max(20, Math.min(tooltipX, screenWidth - 20));

    setMobileTooltipPosition({ x: tooltipX, y: tooltipY });
    setShowMobileTooltip(true);

    // 3秒后自动隐藏
    setTimeout(() => {
      setShowMobileTooltip(false);
    }, 3000);
  };

  // 移动设备长按处理
  const handleMobileTouchStart = (e: React.TouchEvent) => {
    if (!isMobile() || !shouldShowTooltip(video.snippet.title)) return;

    const timer = setTimeout(() => {
      const touch = e.touches[0];
      const screenWidth = window.innerWidth;
      const screenHeight = window.innerHeight;

      let tooltipX = touch.clientX;
      let tooltipY = touch.clientY - 60;

      // 确保工具提示在屏幕范围内
      tooltipX = Math.max(20, Math.min(tooltipX, screenWidth - 20));
      tooltipY = Math.max(20, Math.min(tooltipY, screenHeight - 100));

      setMobileTooltipPosition({ x: tooltipX, y: tooltipY });
      setShowMobileTooltip(true);

      // 添加触觉反馈（如果支持）
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }

      // 2秒后自动隐藏
      setTimeout(() => {
        setShowMobileTooltip(false);
      }, 2000);
    }, 500); // 500ms长按触发

    setLongPressTimer(timer);
  };

  const handleMobileTouchEnd = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
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
              className="absolute top-2 right-2 bg-black/75 text-white p-2 rounded-full hover:bg-black/90 transition-opacity"
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
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                </svg>
              </div>
            )}

            {/* 播放按钮覆盖层 */}
            <div className="absolute inset-0 bg-black/0 hover:bg-black/30 transition-all duration-300 flex items-center justify-center group">
              <button
                onClick={handleEmbedPlay}
                className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-red-600 hover:bg-red-700 text-white rounded-full p-4 transform hover:scale-110 transition-transform"
                aria-label="播放视频"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </button>
            </div>

            {/* YouTube标识 */}
            <div className="absolute bottom-2 right-2 bg-red-600 text-white text-xs px-2 py-1 rounded flex items-center">
              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 24 24">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
              </svg>
              YouTube
            </div>
          </>
        )}
      </div>

      {/* 视频信息区域 */}
      <div className="p-4">
        <div className="relative mb-2">
          <h3
            className={`font-semibold text-gray-900 dark:text-white text-sm truncate cursor-pointer ${shouldShowTooltip(video.snippet.title) ? 'mobile-title-clickable mobile-longpress-feedback' : ''
              }`}
            onClick={handleMobileTitleClick}
            onTouchStart={handleMobileTouchStart}
            onTouchEnd={handleMobileTouchEnd}
            onMouseEnter={(e) => {
              if (isMobile()) return; // 移动设备跳过鼠标事件

              if (shouldShowTooltip(video.snippet.title)) {
                // 创建临时元素测量文本宽度
                const tempElement = document.createElement('span');
                tempElement.style.visibility = 'hidden';
                tempElement.style.position = 'absolute';
                tempElement.style.fontSize = '14px';
                tempElement.style.fontWeight = '500';
                tempElement.style.whiteSpace = 'nowrap';
                tempElement.style.padding = '8px 12px';
                tempElement.textContent = video.snippet.title;
                document.body.appendChild(tempElement);

                const textWidth = tempElement.offsetWidth;
                document.body.removeChild(tempElement);

                const finalWidth = Math.min(textWidth, window.innerWidth * 0.8);
                setTooltipWidth(finalWidth);

                // 智能计算工具提示位置
                const mouseX = e.clientX;
                const mouseY = e.clientY;
                const screenWidth = window.innerWidth;
                const screenHeight = window.innerHeight;

                let tooltipX = mouseX + 10; // 默认显示在右边
                let tooltipY = mouseY - 10; // 默认显示在上方

                // 如果右边空间不够，显示在左边
                if (mouseX + finalWidth + 20 > screenWidth) {
                  tooltipX = mouseX - finalWidth - 10;
                }

                // 如果上方空间不够，显示在下方
                if (mouseY - 40 < 0) {
                  tooltipY = mouseY + 20;
                }

                // 确保不超出屏幕边界
                tooltipX = Math.max(10, Math.min(tooltipX, screenWidth - finalWidth - 10));
                tooltipY = Math.max(10, Math.min(tooltipY, screenHeight - 50));

                setShowTooltip(true);
                setTooltipPosition({ x: tooltipX, y: tooltipY });
              }
            }}
            onMouseMove={(e) => {
              if (isMobile()) return; // 移动设备跳过鼠标事件

              if (showTooltip && tooltipWidth) {
                // 鼠标移动时也要重新计算位置
                const mouseX = e.clientX;
                const mouseY = e.clientY;
                const screenWidth = window.innerWidth;
                const screenHeight = window.innerHeight;

                let tooltipX = mouseX + 10;
                let tooltipY = mouseY - 10;

                if (mouseX + tooltipWidth + 20 > screenWidth) {
                  tooltipX = mouseX - tooltipWidth - 10;
                }

                if (mouseY - 40 < 0) {
                  tooltipY = mouseY + 20;
                }

                tooltipX = Math.max(10, Math.min(tooltipX, screenWidth - tooltipWidth - 10));
                tooltipY = Math.max(10, Math.min(tooltipY, screenHeight - 50));

                setTooltipPosition({ x: tooltipX, y: tooltipY });
              }
            }}
            onMouseLeave={() => {
              if (isMobile()) return; // 移动设备跳过鼠标事件
              setShowTooltip(false);
              setTooltipWidth(undefined);
            }}
          >
            {video.snippet.title}
          </h3>

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
              <path d="M8 5v14l11-7z" />
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

      {/* 跟随鼠标的标题提示 */}
      {showTooltip && (
        <div
          className="mouse-tooltip"
          style={{
            left: tooltipPosition.x,
            top: tooltipPosition.y,
            opacity: 1,
            width: tooltipWidth ? `${tooltipWidth}px` : 'fit-content',
          }}
        >
          {video.snippet.title}
        </div>
      )}

      {/* 移动设备标题提示 */}
      {showMobileTooltip && (
        <div
          className={`mobile-title-tooltip ${showMobileTooltip ? 'show' : ''}`}
          style={{
            left: mobileTooltipPosition.x,
            top: mobileTooltipPosition.y,
            transform: `translateX(-50%) ${showMobileTooltip ? 'scale(1) translateY(0)' : 'scale(0.9) translateY(10px)'}`,
          }}
          onClick={() => setShowMobileTooltip(false)}
        >
          {video.snippet.title}
        </div>
      )}
    </div>
  );
};

export default YouTubeVideoCard;