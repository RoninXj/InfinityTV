/* eslint-disable @typescript-eslint/no-explicit-any,no-console */

import { NextRequest, NextResponse } from 'next/server';

import { getAuthInfoFromCookie } from '@/lib/auth';
import { getAvailableApiSites, getCacheTime, getConfig } from '@/lib/config';
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
    const cacheTime = await getCacheTime();
    return NextResponse.json(
      { results: [] },
      {
        headers: {
          'Cache-Control': `public, max-age=${cacheTime}, s-maxage=${cacheTime}`,
          'CDN-Cache-Control': `public, s-maxage=${cacheTime}`,
          'Vercel-CDN-Cache-Control': `public, s-maxage=${cacheTime}`,
          'Netlify-Vary': 'query',
        },
      }
    );
  }

  const config = await getConfig();
  const apiSites = await getAvailableApiSites(authInfo.username);

  // 添加超时控制和错误处理，避免慢接口拖累整体响应
  const searchPromises = apiSites.map((site) =>
    Promise.race([
      searchFromApi(site, query),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`${site.name} timeout`)), 20000)
      ),
    ]).catch((err) => {
      console.warn(`搜索失败 ${site.name}:`, err.message);
      return []; // 返回空数组而不是抛出错误
    })
  );

  try {
    const results = await Promise.allSettled(searchPromises);
    const successResults = results
      .filter((result) => result.status === 'fulfilled')
      .map((result) => (result as PromiseFulfilledResult<any>).value);
    let flattenedResults = successResults.flat();
    
    // 基于相关性对结果进行排序
    flattenedResults = sortResultsByRelevance(flattenedResults, query);
    
    if (!config.SiteConfig.DisableYellowFilter) {
      flattenedResults = flattenedResults.filter((result) => {
        const typeName = result.type_name || '';
        return !yellowWords.some((word: string) => typeName.includes(word));
      });
    }
    const cacheTime = await getCacheTime();

    if (flattenedResults.length === 0) {
      // no cache if empty
      return NextResponse.json({ results: [] }, { status: 200 });
    }

    return NextResponse.json(
      { results: flattenedResults },
      {
        headers: {
          'Cache-Control': `public, max-age=${cacheTime}, s-maxage=${cacheTime}`,
          'CDN-Cache-Control': `public, s-maxage=${cacheTime}`,
          'Vercel-CDN-Cache-Control': `public, s-maxage=${cacheTime}`,
          'Netlify-Vary': 'query',
        },
      }
    );
  } catch (error) {
    return NextResponse.json({ error: '搜索失败' }, { status: 500 });
  }
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