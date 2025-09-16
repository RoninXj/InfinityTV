/* eslint-disable @typescript-eslint/no-explicit-any,no-console */

import { NextRequest, NextResponse } from 'next/server';

import { getAuthInfoFromCookie } from '@/lib/auth';
import { getAvailableApiSites, getConfig } from '@/lib/config';
import { searchFromApi } from '@/lib/downstream';
import { yellowWords } from '@/lib/yellow';
import { SearchResult } from '@/lib/types';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const authInfo = getAuthInfoFromCookie(request);
  if (!authInfo || !authInfo.username) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  if (!query) {
    return new Response(
      JSON.stringify({ error: '搜索关键词不能为空' }),
      {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }

  const config = await getConfig();
  const apiSites = await getAvailableApiSites(authInfo.username);

  // 共享状态
  let streamClosed = false;

  // 创建可读流
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      // 辅助函数：安全地向控制器写入数据
      const safeEnqueue = (data: Uint8Array) => {
        try {
          if (streamClosed || (!controller.desiredSize && controller.desiredSize !== 0)) {
            // 流已标记为关闭或控制器已关闭
            return false;
          }
          controller.enqueue(data);
          return true;
        } catch (error) {
          // 控制器已关闭或出现其他错误
          console.warn('Failed to enqueue data:', error);
          streamClosed = true;
          return false;
        }
      };

      // 发送开始事件
      const startEvent = `data: ${JSON.stringify({
        type: 'start',
        query,
        totalSources: apiSites.length,
        timestamp: Date.now()
      })}\n\n`;

      if (!safeEnqueue(encoder.encode(startEvent))) {
        return; // 连接已关闭，提前退出
      }

      // 记录已完成的源数量
      let completedSources = 0;
      const allResults: any[] = [];

      // 为每个源创建搜索 Promise
      const searchPromises = apiSites.map(async (site) => {
        try {
          // 添加超时控制
          const searchPromise = Promise.race([
            searchFromApi(site, query),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error(`${site.name} timeout`)), 20000)
            ),
          ]);

          let results = await searchPromise as SearchResult[];

          // 过滤黄色内容
          if (!config.SiteConfig.DisableYellowFilter) {
            results = results.filter((result) => {
              const typeName = result.type_name || '';
              return !yellowWords.some((word: string) => typeName.includes(word));
            });
          }
          
          // 基于相关性对结果进行排序
          results = sortResultsByRelevance(results, query);

          // 发送该源的搜索结果
          completedSources++;

          if (!streamClosed) {
            const sourceEvent = `data: ${JSON.stringify({
              type: 'source_result',
              source: site.key,
              sourceName: site.name,
              results: results,
              timestamp: Date.now()
            })}\n\n`;

            if (!safeEnqueue(encoder.encode(sourceEvent))) {
              streamClosed = true;
              return; // 连接已关闭，停止处理
            }
          }

          if (results.length > 0) {
            allResults.push(...results);
          }

        } catch (error) {
          console.warn(`搜索失败 ${site.name}:`, error);

          // 发送源错误事件
          completedSources++;

          if (!streamClosed) {
            const errorEvent = `data: ${JSON.stringify({
              type: 'source_error',
              source: site.key,
              sourceName: site.name,
              error: error instanceof Error ? error.message : '搜索失败',
              timestamp: Date.now()
            })}\n\n`;

            if (!safeEnqueue(encoder.encode(errorEvent))) {
              streamClosed = true;
              return; // 连接已关闭，停止处理
            }
          }
        }

        // 检查是否所有源都已完成
        if (completedSources === apiSites.length) {
          if (!streamClosed) {
            // 发送最终完成事件
            const completeEvent = `data: ${JSON.stringify({
              type: 'complete',
              totalResults: allResults.length,
              completedSources,
              timestamp: Date.now()
            })}\n\n`;

            if (safeEnqueue(encoder.encode(completeEvent))) {
              // 只有在成功发送完成事件后才关闭流
              try {
                controller.close();
              } catch (error) {
                console.warn('Failed to close controller:', error);
              }
            }
          }
        }
      });

      // 等待所有搜索完成
      await Promise.allSettled(searchPromises);
    },

    cancel() {
      // 客户端断开连接时，标记流已关闭
      streamClosed = true;
      console.log('Client disconnected, cancelling search stream');
    },
  });

  // 返回流式响应
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

// 新增：基于相关性的排序函数
function sortResultsByRelevance(results: SearchResult[], query: string): SearchResult[] {
  const trimmedQuery = query.trim().toLowerCase();
  if (!trimmedQuery) return results;

  // 分词查询词
  const queryWords = trimmedQuery.split(/\s+/).filter(word => word.length > 0);

  return results.sort((a, b) => {
    // 计算a和b的相关性得分
    const scoreA = calculateRelevanceScore(a, query, queryWords);
    const scoreB = calculateRelevanceScore(b, query, queryWords);
    
    // 按得分降序排列
    return scoreB - scoreA;
  });
}

// 新增：计算相关性得分
function calculateRelevanceScore(result: SearchResult, query: string, queryWords: string[]): number {
  const trimmedQuery = query.trim().toLowerCase();
  const title = (result.title || '').toLowerCase();
  const desc = (result.desc || '').toLowerCase();
  const typeName = (result.type_name || '').toLowerCase();
  const year = (result.year || '').toLowerCase();
  
  let score = 0;
  
  // 完全匹配标题得最高分
  if (title === trimmedQuery) {
    score += 1000;
  } else if (title.includes(trimmedQuery)) {
    score += 500;
  }
  
  // 包含所有查询词得高分
  const allWordsInTitle = queryWords.every(word => title.includes(word));
  if (allWordsInTitle) {
    score += 300;
  }
  
  // 查询词在标题中的位置越靠前得分越高
  const firstWordIndex = title.indexOf(queryWords[0] || '');
  if (firstWordIndex === 0) {
    score += 100;
  } else if (firstWordIndex > 0) {
    score += 50;
  }
  
  // 部分匹配查询词得中等分数
  const someWordsInTitle = queryWords.some(word => title.includes(word));
  if (someWordsInTitle) {
    score += 50;
  }
  
  // 标题长度适中加分（避免过短或过长的标题）
  const titleLength = title.length;
  if (titleLength >= 2 && titleLength <= 50) {
    score += 20;
  }
  
  // 描述匹配加分
  const allWordsInDesc = queryWords.every(word => desc.includes(word));
  if (allWordsInDesc) {
    score += 30;
  }
  
  // 类型匹配加分
  const allWordsInType = queryWords.every(word => typeName.includes(word));
  if (allWordsInType) {
    score += 20;
  }
  
  // 年份匹配加分
  if (year.includes(trimmedQuery)) {
    score += 10;
  }
  
  return score;
}