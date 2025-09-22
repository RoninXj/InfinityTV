/* eslint-disable react-hooks/exhaustive-deps, @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useState } from 'react';
import VideoCard from './VideoCard';
import { sendAIRecommendMessage } from '@/lib/ai-recommend.client';

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
        // 构造推荐请求
        const message = `基于影片"${currentTitle}"(${currentYear || '未知年份'})，这是一部${currentType === 'movie' ? '电影' : '电视剧'}，请推荐几部相似类型的影片。请直接列出片名，每部影片占一行。`;
        
        const response = await sendAIRecommendMessage([
          {
            role: 'user',
            content: message
          }
        ]);

        // 处理推荐结果
        if (response.recommendations && response.recommendations.length > 0) {
          setRecommendations(response.recommendations.slice(0, 6)); // 限制6个推荐
        } else {
          // 如果没有结构化推荐，从文本中提取
          const titles = extractMovieTitles(response.choices[0].message.content);
          const mockRecommendations = titles.slice(0, 6).map(title => ({
            title,
            description: 'AI推荐影片'
          }));
          setRecommendations(mockRecommendations);
        }
      } catch (error) {
        console.error('获取推荐失败:', error);
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

  // 从文本中提取影片标题的辅助函数
  const extractMovieTitles = (content) => {
    const titles = [];
    const patterns = [
      /《([^》]+)》/g,
      /"([^"]+)"/g,
      /【([^】]+)】/g
    ];
    
    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const title = match[1]?.trim();
        if (title && title.length > 1 && title.length < 50 && !titles.includes(title)) {
          titles.push(title);
        }
      }
    });
    
    return titles;
  };

  if (loading) {
    return (
      <div className="py-8">
        <h3 className="text-lg font-semibold mb-4">相关推荐</h3>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="bg-gray-200 dark:bg-gray-700 aspect-[2/3] rounded-lg"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mt-2"></div>
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
          <div key={index} className="cursor-pointer" 
               onClick={() => window.open(`/search?q=${encodeURIComponent(rec.title)}`, '_blank')}>
            <VideoCard
              title={rec.title}
              poster={rec.poster || ''}
              year={rec.year || ''}
              from="search"
              type={currentType}
            />
          </div>
        ))}
      </div>
    </div>
  );
}