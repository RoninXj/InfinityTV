/* eslint-disable @typescript-eslint/no-explicit-any */

'use client';

import { Play, Star, Heart } from 'lucide-react';
import Link from 'next/link';
import { memo, useEffect, useState, useCallback } from 'react';

import { ShortDramaItem } from '@/lib/types';
import {
  SHORTDRAMA_CACHE_EXPIRE,
  getCacheKey,
  getCache,
  setCache,
} from '@/lib/shortdrama-cache';
import {
  isFavorited,
  saveFavorite,
  deleteFavorite,
  generateStorageKey,
  subscribeToDataUpdates,
} from '@/lib/db.client';

interface ShortDramaCardProps {
  drama: ShortDramaItem;
  showDescription?: boolean;
  className?: string;
}

function ShortDramaCard({
  drama,
  showDescription = false,
  className = '',
}: ShortDramaCardProps) {
  const [realEpisodeCount, setRealEpisodeCount] = useState<number>(drama.episode_count);
  const [showEpisodeCount, setShowEpisodeCount] = useState(drama.episode_count > 1); // 如果初始集数>1就显示
  const [imageLoaded, setImageLoaded] = useState(false); // 图片加载状态
  const [favorited, setFavorited] = useState(false); // 收藏状态
  const [isHovered, setIsHovered] = useState(false);
  const [showMobileTooltip, setShowMobileTooltip] = useState(false);
  const [mobileTooltipPosition, setMobileTooltipPosition] = useState({ x: 0, y: 0 });
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);

  // 短剧的source固定为shortdrama
  const source = 'shortdrama';
  const id = drama.id.toString(); // 转换为字符串

  // 检查收藏状态
  useEffect(() => {
    const fetchFavoriteStatus = async () => {
      try {
        const fav = await isFavorited(source, id);
        setFavorited(fav);
      } catch (err) {
        console.error('检查收藏状态失败:', err);
      }
    };

    fetchFavoriteStatus();

    // 监听收藏状态更新事件
    const storageKey = generateStorageKey(source, id);
    const unsubscribe = subscribeToDataUpdates(
      'favoritesUpdated',
      (newFavorites: Record<string, any>) => {
        const isNowFavorited = !!newFavorites[storageKey];
        setFavorited(isNowFavorited);
      }
    );

    return unsubscribe;
  }, [source, id]);

  // 获取真实集数（优先使用备用API）
  useEffect(() => {
    const fetchEpisodeCount = async () => {
      const cacheKey = getCacheKey('episodes', { id: drama.id });

      // 检查统一缓存
      const cached = await getCache(cacheKey);
      if (cached && typeof cached === 'number') {
        if (cached > 1) {
          setRealEpisodeCount(cached);
          setShowEpisodeCount(true);
        } else {
          setShowEpisodeCount(false);
        }
        return;
      }

      try {
        // 优先尝试使用备用API（通过剧名获取集数，更快更可靠）
        const episodeCountResponse = await fetch(
          `/api/shortdrama/episode-count?name=${encodeURIComponent(drama.name)}`
        );

        if (episodeCountResponse.ok) {
          const episodeCountData = await episodeCountResponse.json();
          if (episodeCountData.episodeCount > 1) {
            setRealEpisodeCount(episodeCountData.episodeCount);
            setShowEpisodeCount(true);
            // 使用统一缓存系统缓存结果
            await setCache(cacheKey, episodeCountData.episodeCount, SHORTDRAMA_CACHE_EXPIRE.episodes);
            return; // 成功获取，直接返回
          }
        }

        // 备用API失败，fallback到主API解析方式
        console.log('备用API获取集数失败，尝试主API...');

        // 先尝试第1集（episode=0）
        let response = await fetch(`/api/shortdrama/parse?id=${drama.id}&episode=0&name=${encodeURIComponent(drama.name)}`);
        let result = null;

        if (response.ok) {
          result = await response.json();
        }

        // 如果第1集失败，尝试第2集（episode=1）
        if (!result || !result.totalEpisodes) {
          response = await fetch(`/api/shortdrama/parse?id=${drama.id}&episode=1&name=${encodeURIComponent(drama.name)}`);
          if (response.ok) {
            result = await response.json();
          }
        }

        if (result && result.totalEpisodes > 1) {
          setRealEpisodeCount(result.totalEpisodes);
          setShowEpisodeCount(true);
          // 使用统一缓存系统缓存结果
          await setCache(cacheKey, result.totalEpisodes, SHORTDRAMA_CACHE_EXPIRE.episodes);
        } else {
          // 如果解析失败或集数<=1，不显示集数标签，缓存0避免重复请求
          setShowEpisodeCount(false);
          await setCache(cacheKey, 0, SHORTDRAMA_CACHE_EXPIRE.episodes / 24); // 1小时后重试
        }
      } catch (error) {
        console.error('获取集数失败:', error);
        // 网络错误时不显示集数标签
        setShowEpisodeCount(false);
        await setCache(cacheKey, 0, SHORTDRAMA_CACHE_EXPIRE.episodes / 24); // 1小时后重试
      }
    };

    // 只有当前集数为1（默认值）时才尝试获取真实集数
    if (drama.episode_count === 1) {
      fetchEpisodeCount();
    }
  }, [drama.id, drama.episode_count, drama.name]);

  // 处理收藏切换
  const handleToggleFavorite = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      try {
        if (favorited) {
          // 取消收藏
          await deleteFavorite(source, id);
          setFavorited(false);
        } else {
          // 添加收藏
          await saveFavorite(source, id, {
            title: drama.name,
            source_name: '短剧',
            year: '',
            cover: drama.cover,
            total_episodes: realEpisodeCount,
            save_time: Date.now(),
            search_title: drama.name,
          });
          setFavorited(true);
        }
      } catch (err) {
        console.error('切换收藏状态失败:', err);
      }
    },
    [favorited, source, id, drama.name, drama.cover, realEpisodeCount]
  );

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
  useEffect(() => {
    return () => {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
      }
    };
  }, [longPressTimer]);

  const handleMobileTitleClick = (e: React.MouseEvent) => {
    if (!isMobile() || !shouldShowTooltip(drama.name)) return;

    e.preventDefault();
    e.stopPropagation();

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
    <div
      className={`group relative w-full rounded-lg bg-transparent cursor-pointer transition-all duration-300 ease-in-out hover:scale-[1.05] hover:z-[500] hover:drop-shadow-2xl ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {isHovered && (
        <>
          <div className="short-drama-glow-border" />
          <div className="border-glow-top" />
          <div className="border-glow-right" />
          <div className="border-glow-bottom" />
          <div className="border-glow-left" />
        </>
      )}
      <Link
        href={`/play?title=${encodeURIComponent(drama.name)}&shortdrama_id=${drama.id}`}
        className="block"
      >
        {/* 封面图片 */}
        <div className="relative aspect-[2/3] w-full overflow-hidden rounded-xl bg-gray-200 transition-shadow duration-500 dark:bg-slate-900/80">
          {/* 渐变光泽动画层 */}
          <div
            className='absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none z-10'
            style={{
              background: 'linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.15) 45%, rgba(255,255,255,0.4) 50%, rgba(255,255,255,0.15) 55%, transparent 70%)',
              backgroundSize: '200% 100%',
              animation: 'card-shimmer 2.5s ease-in-out infinite',
            }}
          />

          <img
            src={drama.cover}
            alt={drama.name}
            className={`h-full w-full object-cover transition-all duration-700 ease-out ${imageLoaded ? 'opacity-100 blur-0 scale-100 group-hover:scale-105' : 'opacity-0 blur-md scale-105'
              }`}
            loading="lazy"
            onLoad={() => setImageLoaded(true)}
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/placeholder-cover.jpg';
              setImageLoaded(true);
            }}
          />

          {/* 悬浮播放按钮 - 玻璃态效果 */}
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-t from-black/80 via-black/20 to-transparent backdrop-blur-[2px] opacity-0 transition-all duration-300 group-hover:opacity-100">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 text-black shadow-lg transition-transform group-hover:scale-110">
              <Play className="h-5 w-5 ml-0.5" fill="currentColor" />
            </div>
          </div>

          {/* 集数标识 - 玻璃态美化 - 只在集数>1时显示 */}
          {showEpisodeCount && (
            <div className="absolute top-2 left-2 rounded-full bg-gradient-to-br from-purple-500/90 via-pink-500/90 to-rose-500/90 backdrop-blur-md px-3 py-1.5 text-xs font-bold text-white shadow-lg ring-2 ring-white/30 transition-all duration-300 group-hover:scale-110 group-hover:shadow-purple-500/50">
              <span className="flex items-center gap-1">
                <Play size={10} className="fill-current" />
                {realEpisodeCount}集
              </span>
            </div>
          )}

          {/* 评分 - 使用vote_average字段 */}
          {drama.vote_average && drama.vote_average > 0 && (
            <div className="absolute top-2 right-2 flex items-center rounded-lg bg-gradient-to-br from-yellow-400 to-orange-500 px-2.5 py-1.5 text-xs font-bold text-white shadow-lg backdrop-blur-sm ring-2 ring-white/30 transition-all duration-300 group-hover:scale-110">
              <Star className="h-3 w-3 mr-1 fill-current" />
              {drama.vote_average.toFixed(1)}
            </div>
          )}

          {/* 收藏按钮 - 右下角 */}
          <button
            onClick={handleToggleFavorite}
            className="absolute bottom-2 right-2 h-8 w-8 flex items-center justify-center rounded-full bg-black/50 backdrop-blur-sm opacity-0 transition-all duration-300 group-hover:opacity-100 hover:scale-110 hover:bg-black/70 z-20"
            aria-label={favorited ? '取消收藏' : '添加收藏'}
          >
            <Heart
              className={`h-4 w-4 transition-all duration-300 ${
                favorited
                  ? 'fill-red-500 text-red-500 scale-110'
                  : 'text-white hover:text-red-400'
              }`}
            />
          </button>
        </div>

        {/* 信息区域 */}
        <div className="mt-2 space-y-1.5">
          <div className="relative px-1">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              <span
                className='block text-sm font-semibold text-gray-900 dark:text-white transition-all duration-300 ease-in-out group-hover:scale-[1.02] relative z-10 group-hover:bg-gradient-to-r group-hover:from-green-600 group-hover:via-emerald-600 group-hover:to-teal-600 dark:group-hover:from-green-400 dark:group-hover:via-emerald-400 dark:group-hover:to-teal-400 group-hover:bg-clip-text group-hover:text-transparent group-hover:drop-shadow-[0_2px_8px_rgba(16,185,129,0.3)]'
                style={{
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  lineHeight: '1.4',
                } as React.CSSProperties}
                onClick={handleMobileTitleClick}
                onTouchStart={handleMobileTouchStart}
                onTouchEnd={handleMobileTouchEnd}
              >
                {drama.name}
              </span>
            </h3>
          </div>

          {/* 演员信息 */}
          {drama.author && (
            <div className="flex items-center gap-1.5 text-xs">
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200/50 dark:border-blue-700/50">
                <svg className="w-3 h-3 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                </svg>
                <span className="text-blue-700 dark:text-blue-300 font-medium line-clamp-1">{drama.author}</span>
              </div>
            </div>
          )}

          <div className="flex items-center gap-1.5 text-xs">
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200/50 dark:border-green-700/50">
              <svg className="w-3 h-3 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <span className="text-green-700 dark:text-green-300 font-medium">{formatUpdateTime(drama.update_time)}</span>
            </div>
          </div>

          {/* 描述信息（可选） */}
          {showDescription && drama.description && (
            <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 mt-1">
              {drama.description}
            </p>
          )}
        </div>
      </Link>

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

export default memo(ShortDramaCard);
