/* eslint-disable react-hooks/exhaustive-deps, @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useState } from 'react';
import VideoCard from './VideoCard';
import { getDoubanRecommends } from '@/lib/douban.client';

export default function VideoRecommendations({ 
  currentTitle, 
  currentType,
  currentYear 
}) {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        setLoading(true);
        
        // 根据当前影片类型获取相关推荐
        const kind = currentType === 'movie' ? 'movie' : 'tv';
        
        // 获取豆瓣推荐数据
        const response = await getDoubanRecommends({
          kind: kind,
          pageLimit: 6, // 限制6个推荐
          pageStart: 0,
          // 可以根据影片类型、年份等添加更多筛选条件
        });

        if (response.code === 200 && response.list && response.list.length > 0) {
          // 只取前6个推荐
          setRecommendations(response.list.slice(0, 6));
        }
      } catch (error) {
        console.error('获取豆瓣推荐失败:', error);
      } finally {
        setLoading(false);
      }
    };

    // 只有当有当前标题时才获取推荐
    if (currentTitle) {
      fetchRecommendations();
    } else {
      setLoading(false);
    }
  }, [currentTitle, currentType, currentYear]);

  if (loading) {
    return (
      <div className="py-8">
        <h3 className="text-lg font-semibold mb-4">相关推荐</h3>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className='min-w-[96px] w-24 sm:min-w-[180px] sm:w-44'
            >
              <div className='relative aspect-[2/3] w-full overflow-hidden rounded-lg bg-gray-200 animate-pulse dark:bg-gray-800'>
                <div className='absolute inset-0 bg-gray-300 dark:bg-gray-700'></div>
              </div>
              <div className='mt-2 h-4 bg-gray-200 rounded animate-pulse dark:bg-gray-800'></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (recommendations.length === 0) {
    return null;
  }

  return (
    <div className="py-8">
      <h3 className="text-lg font-semibold mb-4">相关推荐</h3>
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-4">
        {recommendations.map((rec, index) => (
          <div
            key={index}
            className='min-w-[96px] w-24 sm:min-w-[180px] sm:w-44 cursor-pointer'
            onClick={() => {
              // 直接跳转到播放页面，而不是搜索页面
              const url = `/play?title=${encodeURIComponent(rec.title)}&year=${rec.year || ''}&douban_id=${rec.id}&stype=${currentType === 'movie' ? 'movie' : 'tv'}`;
              window.open(url, '_blank');
            }}
          >
            <VideoCard
              title={rec.title}
              poster={rec.poster || ''}
              year={rec.year || ''}
              from="douban"
              douban_id={parseInt(rec.id)}
              rate={rec.rate}
            />
          </div>
        ))}
      </div>
    </div>
  );
}