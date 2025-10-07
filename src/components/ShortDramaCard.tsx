/* eslint-disable @typescript-eslint/no-explicit-any */

'use client';

import { Play, Star } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { ShortDramaItem } from '@/lib/types';
import {
  SHORTDRAMA_CACHE_EXPIRE,
  getCacheKey,
  getCache,
  setCache,
} from '@/lib/shortdrama-cache';

interface ShortDramaCardProps {
  drama: ShortDramaItem;
  showDescription?: boolean;
  className?: string;
}

export default function ShortDramaCard({
  drama,
  showDescription = false,
  className = '',
}: ShortDramaCardProps) {
  const [realEpisodeCount, setRealEpisodeCount] = useState<number>(drama.episode_count);
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [tooltipWidth, setTooltipWidth] = useState<number | undefined>(undefined);
  const [showMobileTooltip, setShowMobileTooltip] = useState(false);
  const [mobileTooltipPosition, setMobileTooltipPosition] = useState({ x: 0, y: 0 });
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);

  // 获取真实集数（带统一缓存）
  useEffect(() => {
    const fetchEpisodeCount = async () => {
      const cacheKey = getCacheKey('episodes', { id: drama.id });

      // 检查统一缓存
      const cached = await getCache(cacheKey);
      if (cached && typeof cached === 'number' && cached > 0) {
        setRealEpisodeCount(cached);
        return;
      }

      try {
        // 先尝试第1集（episode=0）
        let response = await fetch(`/api/shortdrama/parse?id=${drama.id}&episode=0`);
        let result = null;

        if (response.ok) {
          result = await response.json();
        }

        // 如果第1集失败，尝试第2集（episode=1）
        if (!result || !result.totalEpisodes) {
          response = await fetch(`/api/shortdrama/parse?id=${drama.id}&episode=1`);
          if (response.ok) {
            result = await response.json();
          }
        }

        if (result && result.totalEpisodes > 0) {
          setRealEpisodeCount(result.totalEpisodes);
          // 使用统一缓存系统缓存结果
          await setCache(cacheKey, result.totalEpisodes, SHORTDRAMA_CACHE_EXPIRE.episodes);
        } else {
          // 如果解析失败，缓存失败结果避免重复请求
          await setCache(cacheKey, 1, SHORTDRAMA_CACHE_EXPIRE.episodes / 24); // 1小时后重试
        }
      } catch (error) {
        console.error('获取集数失败:', error);
        // 网络错误时也缓存失败结果
        await setCache(cacheKey, 1, SHORTDRAMA_CACHE_EXPIRE.episodes / 24); // 1小时后重试
      }
    };

    // 只有当前集数为1（默认值）时才尝试获取真实集数
    if (drama.episode_count === 1) {
      fetchEpisodeCount();
    }
  }, [drama.id, drama.episode_count]);

  const formatScore = (score: number) => {
    return score > 0 ? score.toFixed(1) : '--';
  };

  const formatUpdateTime = (updateTime: string) => {
    try {
      const date = new Date(updateTime);
      return date.toLocaleDateString('zh-CN');
    } catch {
      return updateTime;
    }
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
    
    if (!isMobile() || !shouldShowTooltip(drama.name)) return;
    
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
    if (!isMobile() || !shouldShowTooltip(drama.name)) return;
    
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
    <div className={`group relative ${className}`}>
      <Link
        href={`/play?source=shortdrama&id=${drama.id}&title=${encodeURIComponent(drama.name)}`}
        className="block"
      >
        {/* 封面图片 */}
        <div className="relative aspect-[2/3] w-full overflow-hidden rounded-lg bg-gray-200 dark:bg-gray-800">
          <img
            src={drama.cover}
            alt={drama.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/placeholder-cover.jpg';
            }}
          />

          {/* 悬浮播放按钮 */}
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 text-black shadow-lg">
              <Play className="h-5 w-5 ml-0.5" fill="currentColor" />
            </div>
          </div>

          {/* 集数标识 */}
          <div className="absolute top-2 left-2 rounded bg-black/70 px-2 py-1 text-xs text-white">
            {realEpisodeCount}集
          </div>

          {/* 评分 */}
          {drama.score > 0 && (
            <div className="absolute top-2 right-2 flex items-center rounded bg-yellow-500 px-2 py-1 text-xs text-white">
              <Star className="h-3 w-3 mr-1" fill="currentColor" />
              {formatScore(drama.score)}
            </div>
          )}
        </div>

        {/* 信息区域 */}
        <div className="mt-2 space-y-1">
          <div className="relative">
            <h3 
              className={`text-sm font-medium text-gray-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors cursor-pointer ${
                shouldShowTooltip(drama.name) ? 'mobile-title-clickable mobile-longpress-feedback' : ''
              }`}
              onClick={handleMobileTitleClick}
              onTouchStart={handleMobileTouchStart}
              onTouchEnd={handleMobileTouchEnd}
              onMouseEnter={(e) => {
                if (isMobile()) return; // 移动设备跳过鼠标事件
                
                if (shouldShowTooltip(drama.name)) { // 使用新的判断逻辑
                  // 创建临时元素测量文本宽度
                  const tempElement = document.createElement('span');
                  tempElement.style.visibility = 'hidden';
                  tempElement.style.position = 'absolute';
                  tempElement.style.fontSize = '14px';
                  tempElement.style.fontWeight = '500';
                  tempElement.style.whiteSpace = 'nowrap';
                  tempElement.style.padding = '8px 12px';
                  tempElement.textContent = drama.name;
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
              {drama.name}
            </h3>

          </div>

          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>更新: {formatUpdateTime(drama.update_time)}</span>
          </div>

          {/* 描述信息（可选） */}
          {showDescription && drama.description && (
            <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 mt-1">
              {drama.description}
            </p>
          )}
        </div>
      </Link>
      
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
          {drama.name}
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
          {drama.name}
        </div>
      )}
    </div>
  );
}