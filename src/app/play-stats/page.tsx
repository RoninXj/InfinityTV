'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import React, { useCallback, useEffect, useState } from 'react';
import { ChevronUp } from 'lucide-react';

import { getAuthInfoFromBrowserCookie } from '@/lib/auth';
import { PlayRecord } from '@/lib/types';
import { getIpLocation } from '@/lib/utils';

import PageLayout from '@/components/PageLayout';

import { PlayStatsResult } from '@/app/api/admin/play-stats/route';

const PlayStatsPage: React.FC = () => {
  const router = useRouter();
  const [statsData, setStatsData] = useState<PlayStatsResult | null>(null);
  const [userStats, setUserStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());
  const [authInfo, setAuthInfo] = useState<{ username?: string; role?: string } | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [ipLocations, setIpLocations] = useState<Record<string, string>>({});
  const [copiedPasswords, setCopiedPasswords] = useState<Record<string, boolean>>({});

  // 检查用户权限
  useEffect(() => {
    const auth = getAuthInfoFromBrowserCookie();
    if (!auth || !auth.username) {
      router.push('/login');
      return;
    }

    setAuthInfo(auth);
    const adminRole = auth.role === 'admin' || auth.role === 'owner';
    setIsAdmin(adminRole);
  }, [router]);

  // 时间格式化函数
  const formatTime = (seconds: number): string => {
    if (seconds === 0) return '00:00';

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = Math.round(seconds % 60);

    if (hours === 0) {
      return `${minutes.toString().padStart(2, '0')}:${remainingSeconds
        .toString()
        .padStart(2, '0')}`;
    } else {
      return `${hours.toString().padStart(2, '0')}:${minutes
        .toString()
        .padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
  };

  const formatDateTime = (timestamp: number): string => {
    if (!timestamp) return '未知时间';

    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return '时间格式错误';

    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  };

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
    });
  };

  // 获取管理员统计数据
  const fetchAdminStats = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/play-stats');

      if (response.status === 401) {
        router.push('/login');
        return;
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      setStatsData(data);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : '获取播放统计失败';
      setError(errorMessage);
    }
  }, [router]);

  // 获取用户个人统计数据
  const fetchUserStats = useCallback(async () => {
    try {
      const response = await fetch('/api/user/my-stats');

      if (response.status === 401) {
        router.push('/login');
        return;
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      setUserStats(data);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : '获取个人统计失败';
      setError(errorMessage);
    }
  }, [router]);

  // 根据用户角色获取数据
  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);

    if (isAdmin) {
      await fetchAdminStats();
    } else {
      await fetchUserStats();
    }

    setLoading(false);
  }, [isAdmin, fetchAdminStats, fetchUserStats]);

  // 切换用户详情展开状态（仅管理员）
  const toggleUserExpanded = (username: string) => {
    setExpandedUsers((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(username)) {
        newSet.delete(username);
      } else {
        newSet.add(username);
      }
      return newSet;
    });
  };

  // 获取进度百分比
  const getProgressPercentage = (
    playTime: number,
    totalTime: number
  ): number => {
    if (!totalTime || totalTime === 0) return 0;
    return Math.min(Math.round((playTime / totalTime) * 100), 100);
  };

  // 跳转到播放页面
  const handlePlayRecord = (record: PlayRecord) => {
    const searchTitle = record.search_title || record.title;
    const params = new URLSearchParams({
      title: record.title,
      year: record.year,
      stitle: searchTitle,
      stype: record.total_episodes > 1 ? 'tv' : 'movie',
    });

    router.push(`/play?${params.toString()}`);
  };

  // 检查是否支持播放统计
  const storageType =
    typeof window !== 'undefined' && (window as any).RUNTIME_CONFIG?.STORAGE_TYPE
      ? (window as any).RUNTIME_CONFIG.STORAGE_TYPE
      : 'localstorage';

  // 复制密码到剪贴板
  const copyPasswordToClipboard = async (password: string, username: string) => {
    try {
      await navigator.clipboard.writeText(password);
      setCopiedPasswords(prev => ({ ...prev, [username]: true }));
      setTimeout(() => {
        setCopiedPasswords(prev => ({ ...prev, [username]: false }));
      }, 2000);
    } catch (err) {
      console.error('复制密码失败:', err);
    }
  };

  // 查询IP地址归属地
  const fetchIpLocation = async (ip: string) => {
    if (!ip) return;

    try {
      const location = await getIpLocation(ip);
      setIpLocations(prev => ({ ...prev, [ip]: location }));
    } catch (err) {
      console.error('获取IP归属地失败:', err);
      setIpLocations(prev => ({ ...prev, [ip]: '查询失败' }));
    }
  };

  // 获取用户登录历史
  const fetchUserLoginHistory = useCallback(async () => {
    if (!isAdmin) return;
    
    try {
      const response = await fetch('/api/user/login-history');
      if (response.ok) {
        const data = await response.json();
        // 这里可以处理登录历史数据
        console.log('用户登录历史:', data);
      }
    } catch (err) {
      console.error('获取登录历史失败:', err);
    }
  }, [isAdmin]);

  useEffect(() => {
    if (authInfo) {
      fetchStats();
      if (isAdmin) {
        fetchUserLoginHistory();
      }
    }
  }, [authInfo, fetchStats, fetchUserLoginHistory]);

  // 监听滚动位置，显示/隐藏回到顶部按钮
  useEffect(() => {
    const getScrollTop = () => {
      return document.body.scrollTop || document.documentElement.scrollTop || 0;
    };

    const handleScroll = () => {
      const scrollTop = getScrollTop();
      setShowBackToTop(scrollTop > 300);
    };

    window.addEventListener('scroll', handleScroll);

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // 返回顶部功能
  const scrollToTop = () => {
    try {
      document.body.scrollTo({
        top: 0,
        behavior: 'smooth',
      });
    } catch (error) {
      document.body.scrollTop = 0;
    }
  };

  // 未授权时显示加载
  if (!authInfo) {
    return (
      <PageLayout activePath="/play-stats">
        <div className='text-center py-12'>
          <div className='inline-flex items-center space-x-2 text-gray-600 dark:text-gray-400'>
            <svg
              className='w-6 h-6 animate-spin'
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth='2'
                d='M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15'
              />
            </svg>
            <span>检查权限中...</span>
          </div>
        </div>
      </PageLayout>
    );
  }

  if (loading) {
    return (
      <PageLayout activePath="/play-stats">
        <div className='text-center py-12'>
          <div className='inline-flex items-center space-x-2 text-gray-600 dark:text-gray-400'>
            <svg
              className='w-6 h-6 animate-spin'
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth='2'
                d='M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15'
              />
            </svg>
            <span>{isAdmin ? '加载播放统计中...' : '加载个人统计中...'}</span>
          </div>
        </div>
      </PageLayout>
    );
  }

  // 管理员视图
  if (isAdmin && statsData) {
    return (
      <PageLayout activePath="/play-stats">
        <div className='max-w-7xl mx-auto px-4 py-8'>
          {/* 页面标题和刷新按钮 */}
          <div className='flex justify-between items-center mb-8'>
            <div>
              <h1 className='text-3xl font-bold text-gray-900 dark:text-white'>
                播放统计
              </h1>
              <p className='text-gray-600 dark:text-gray-400 mt-2'>
                查看用户播放数据和趋势分析
              </p>
            </div>
            <button
              onClick={fetchStats}
              disabled={loading}
              className='px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm rounded-lg transition-colors flex items-center space-x-2'
            >
              <svg
                className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth='2'
                  d='M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15'
                />
              </svg>
              <span>{loading ? '刷新中...' : '刷新数据'}</span>
            </button>
          </div>

          {/* 错误提示 */}
          {error && (
            <div className='mb-8 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800'>
              <div className='flex items-center space-x-3'>
                <div className='text-red-600 dark:text-red-400'>
                  <svg
                    className='w-5 h-5'
                    fill='none'
                    stroke='currentColor'
                    viewBox='0 0 24 24'
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth='2'
                      d='M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
                    />
                  </svg>
                </div>
                <div>
                  <h4 className='text-sm font-medium text-red-800 dark:text-red-300'>
                    获取播放统计失败
                  </h4>
                  <p className='text-red-700 dark:text-red-400 text-sm mt-1'>
                    {error}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 全站统计概览 */}
          <div className='grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4 mb-8'>
            <div className='p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800'>
              <div className='text-2xl font-bold text-blue-800 dark:text-blue-300'>
                {statsData.totalUsers}
              </div>
              <div className='text-gray-600 dark:text-gray-400 text-sm'>总用户数</div>
            </div>
            <div className='bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-700'>
              <div className='text-xl font-bold text-gray-900 dark:text-white mb-1'>
                {statsData.totalPlays}
              </div>
              <div className='text-gray-600 dark:text-gray-400 text-sm'>总播放次数</div>
            </div>
            <div className='bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-700'>
              <div className='text-xl font-bold text-gray-900 dark:text-white mb-1'>
                {formatTime(statsData.totalWatchTime)}
              </div>
              <div className='text-gray-600 dark:text-gray-400 text-sm'>总观看时长</div>
            </div>
            <div className='bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-700'>
              <div className='text-xl font-bold text-gray-900 dark:text-white mb-1'>
                {statsData.userStats.filter(user => user.totalPlays > 0).length}
              </div>
              <div className='text-gray-600 dark:text-gray-400 text-sm'>活跃用户</div>
            </div>
          </div>

          {/* 按日统计图表 */}
          <div className='bg-white dark:bg-gray-800 rounded-lg shadow mb-6 border border-gray-200 dark:border-gray-700'>
            <div className='p-4'>
              <h2 className='text-lg font-semibold text-gray-900 dark:text-white mb-4'>
                近期播放趋势
              </h2>
              <div className='overflow-x-auto'>
                <table className='min-w-full divide-y divide-gray-200 dark:divide-gray-700'>
                  <thead className='bg-gray-50 dark:bg-gray-700'>
                    <tr>
                      <th className='px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider'>
                        日期
                      </th>
                      <th className='px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider'>
                        播放次数
                      </th>
                      <th className='px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider'>
                        观看时长
                      </th>
                      <th className='px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider'>
                        活跃用户
                      </th>
                    </tr>
                  </thead>
                  <tbody className='bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700'>
                    {statsData.dailyStats.map((stat) => (
                      <tr key={stat.date} className='hover:bg-gray-50 dark:hover:bg-gray-700'>
                        <td className='px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100'>
                          {formatDate(stat.date)}
                        </td>
                        <td className='px-4 py-2 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400'>
                          {stat.plays}
                        </td>
                        <td className='px-4 py-2 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400'>
                          {formatTime(stat.watchTime)}
                        </td>
                        <td className='px-4 py-2 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400'>
                          {statsData.userStats.filter(user => {
                            return user.recentRecords.some(record => {
                              const recordDate = new Date(record.save_time);
                              return recordDate.toISOString().split('T')[0] === stat.date;
                            });
                          }).length}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* 用户播放统计 */}
          <div>
            <h3 className='text-lg font-semibold text-gray-900 dark:text-white mb-4'>
              用户播放统计
            </h3>
            <div className='space-y-3'>
              {statsData.userStats.map((userStat) => (
                <div
                  key={userStat.username}
                  className='border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-800'
                >
                  {/* 用户概览行 */}
                  <div
                    className='p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors'
                    onClick={() => toggleUserExpanded(userStat.username)}
                  >
                    <div className='flex items-center justify-between'>
                      <div className='flex items-center space-x-3'>
                        <div className='flex-shrink-0'>
                          <div className='w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center'>
                            <span className='text-xs font-medium text-blue-600 dark:text-blue-400'>
                              {userStat.username.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        </div>
                        <div>
                          <h5 className='text-sm font-medium text-gray-900 dark:text-gray-100'>
                            {userStat.username}
                          </h5>
                          {/* 显示用户密码和登录IP信息 */}
                          <div className="mt-1">
                            {userStat.password && (
                              <div className="flex items-center space-x-2">
                                <span className='text-xs text-red-500 dark:text-red-400'>
                                  密码:
                                </span>
                                <code 
                                  className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded font-mono cursor-pointer"
                                  title={userStat.password}
                                >
                                  ••••••
                                </code>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (userStat.password) {
                                      copyPasswordToClipboard(userStat.password, userStat.username);
                                    }
                                  }}
                                  className={`p-1 transition-colors ${
                                    copiedPasswords[userStat.username] 
                                      ? 'text-green-500' 
                                      : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                                  }`}
                                  title={copiedPasswords[userStat.username] ? "已复制" : "复制密码"}
                                  aria-label={copiedPasswords[userStat.username] ? "已复制密码" : "复制密码"}
                                >
                                  {copiedPasswords[userStat.username] ? (
                                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                  ) : (
                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                    </svg>
                                  )}
                                </button>
                              </div>
                            )}
                            {userStat.lastLoginIP && (
                              <div className="flex items-center space-x-2 mt-1">
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  最后登录IP: {userStat.lastLoginIP}
                                </span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    fetchIpLocation(userStat.lastLoginIP!);
                                  }}
                                  className="text-xs text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                                  title="查询IP归属地"
                                  aria-label="查询IP归属地"
                                >
                                  查询
                                </button>
                                {ipLocations[userStat.lastLoginIP] && (
                                  <span className="text-xs text-green-600 dark:text-green-400">
                                    ({ipLocations[userStat.lastLoginIP]})
                                  </span>
                                )}
                              </div>
                            )}
                            {userStat.lastLoginTime && (
                              <p className='text-xs text-gray-500 dark:text-gray-400'>
                                最后登录时间: {formatDateTime(new Date(userStat.lastLoginTime).getTime())}
                              </p>
                            )}
                          </div>
                          <p className='text-xs text-gray-500 dark:text-gray-400'>
                            最后播放:{' '}
                            {userStat.lastPlayTime
                              ? formatDateTime(userStat.lastPlayTime)
                              : '从未播放'}
                          </p>
                          {userStat.mostWatchedSource && (
                            <p className='text-xs text-gray-500 dark:text-gray-400'>
                              常用来源: {userStat.mostWatchedSource}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className='flex items-center space-x-4'>
                        <div className='text-right'>
                          <div className='text-sm font-medium text-gray-900 dark:text-gray-100'>
                            {formatTime(userStat.totalWatchTime)}
                          </div>
                          <div className='text-xs text-gray-500 dark:text-gray-400'>
                            总观看时长
                          </div>
                        </div>
                        <div className='text-right'>
                          <div className='text-sm font-medium text-gray-900 dark:text-gray-100'>
                            {userStat.totalPlays}
                          </div>
                          <div className='text-xs text-gray-500 dark:text-gray-400'>
                            播放次数
                          </div>
                        </div>
                        <div className='flex-shrink-0'>
                          <svg
                            className={`w-4 h-4 text-gray-400 transition-transform ${
                              expandedUsers.has(userStat.username)
                                ? 'rotate-180'
                                : ''
                            }`}
                            fill='none'
                            stroke='currentColor'
                            viewBox='0 0 24 24'
                          >
                            <path
                              strokeLinecap='round'
                              strokeLinejoin='round'
                              strokeWidth='2'
                              d='M19 9l-7 7-7-7'
                            />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 展开的播放记录详情 */}
                  {expandedUsers.has(userStat.username) && (
                    <div className='p-3 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700'>
                      {/* 显示登录历史 */}
                      {userStat.loginHistory && userStat.loginHistory.length > 0 && (
                        <div className="mb-4">
                          <h6 className='text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
                            登录历史
                          </h6>
                          <div className="space-y-2">
                            {userStat.loginHistory.slice(0, 5).map((login: any, index: number) => (
                              <div key={index} className="flex items-center justify-between text-xs p-2 bg-white dark:bg-gray-800 rounded">
                                <div>
                                  <div className="flex items-center space-x-2">
                                    <span className="text-gray-900 dark:text-gray-100">
                                      {login.ip}
                                    </span>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        fetchIpLocation(login.ip);
                                      }}
                                      className="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                                      title="查询IP归属地"
                                    >
                                      查询
                                    </button>
                                    {ipLocations[login.ip] && (
                                      <span className="text-green-600 dark:text-green-400">
                                        ({ipLocations[login.ip]})
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-gray-500 dark:text-gray-400 mt-1">
                                    {new Date(login.time).toLocaleString('zh-CN')}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {userStat.recentRecords.length > 0 ? (
                        <>
                          <h6 className='text-sm font-medium text-gray-700 dark:text-gray-300 mb-3'>
                            最近播放记录 (最多显示10条)
                          </h6>
                          <div className='grid grid-cols-1 gap-3'>
                            {userStat.recentRecords.map((record: PlayRecord) => (
                              <div
                                key={record.title + record.save_time}
                                className='flex items-center space-x-3 p-2 bg-white dark:bg-gray-800 rounded cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors'
                                onClick={() => handlePlayRecord(record)}
                              >
                                <div className='flex-shrink-0 w-10 h-14 bg-gray-200 dark:bg-gray-700 rounded overflow-hidden'>
                                  {record.cover ? (
                                    <Image
                                      src={record.cover}
                                      alt={record.title}
                                      width={40}
                                      height={56}
                                      className='w-full h-full object-cover'
                                      onError={(e) => {
                                        (
                                          e.target as HTMLImageElement
                                        ).style.display = 'none';
                                      }}
                                    />
                                  ) : (
                                    <div className='w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-500'>
                                      <svg
                                        className='w-5 h-5'
                                        fill='none'
                                        stroke='currentColor'
                                        viewBox='0 0 24 24'
                                      >
                                        <path
                                          strokeLinecap='round'
                                          strokeLinejoin='round'
                                          strokeWidth='2'
                                          d='M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m0 0V1a1 1 0 011-1h2a1 1 0 011 1v18a1 1 0 01-1 1H4a1 1 0 01-1-1V1a1 1 0 011-1h2a1 1 0 011 1v3'
                                        />
                                      </svg>
                                    </div>
                                  )}
                                </div>
                                <div className='flex-1 min-w-0'>
                                  <h6 className='text-sm font-medium text-gray-900 dark:text-gray-100 truncate'>
                                    {record.title}
                                  </h6>
                                  <p className='text-xs text-gray-500 dark:text-gray-400 mt-1'>
                                    来源: {record.source_name} | 年份:{' '}
                                    {record.year}
                                  </p>
                                  <p className='text-xs text-gray-500 dark:text-gray-400'>
                                    第 {record.index} 集 / 共{' '}
                                    {record.total_episodes} 集
                                  </p>
                                  <div className='mt-1'>
                                    <div className='flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1'>
                                      <span>播放进度</span>
                                      <span>
                                        {formatTime(record.play_time)} /{' '}
                                        {formatTime(record.total_time)} (
                                        {getProgressPercentage(
                                          record.play_time,
                                          record.total_time
                                        )}
                                        %)
                                      </span>
                                    </div>
                                    <div className='w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5'>
                                      <div
                                        className='bg-green-600 h-1.5 rounded-full'
                                        style={{
                                          width: `${getProgressPercentage(
                                            record.play_time,
                                            record.total_time
                                          )}%`,
                                        }}
                                      ></div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </>
                      ) : (
                        <p className='text-gray-500 dark:text-gray-400 text-sm'>
                          该用户暂无播放记录
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </PageLayout>
    );
  }

  // 普通用户视图
  if (userStats) {
    return (
      <PageLayout activePath="/play-stats">
        <div className='max-w-6xl mx-auto px-4 py-8'>
          {/* 页面标题和刷新按钮 */}
          <div className='flex justify-between items-center mb-8'>
            <div>
              <h1 className='text-3xl font-bold text-gray-900 dark:text-white'>
                个人统计
              </h1>
              <p className='text-gray-600 dark:text-gray-400 mt-2'>
                查看您的个人播放记录和统计数据
              </p>
            </div>
            <button
              onClick={fetchStats}
              disabled={loading}
              className='px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm rounded-lg transition-colors flex items-center space-x-2'
            >
              <svg
                className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth='2'
                  d='M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15'
                />
              </svg>
              <span>{loading ? '刷新中...' : '刷新数据'}</span>
            </button>
          </div>

          {/* 个人统计概览 */}
          <div className='grid grid-cols-1 md:grid-cols-3 gap-6 mb-8'>
            <div className='bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700'>
              <div className='text-2xl font-bold text-gray-900 dark:text-white mb-2'>
                {userStats.totalPlays}
              </div>
              <div className='text-gray-600 dark:text-gray-400'>总播放次数</div>
            </div>
            <div className='bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700'>
              <div className='text-2xl font-bold text-gray-900 dark:text-white mb-2'>
                {formatTime(userStats.totalWatchTime)}
              </div>
              <div className='text-gray-600 dark:text-gray-400'>总观看时长</div>
            </div>
            <div className='bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700'>
              <div className='text-2xl font-bold text-gray-900 dark:text-white mb-2'>
                {formatTime(userStats.avgWatchTime)}
              </div>
              <div className='text-gray-600 dark:text-gray-400'>平均观看时长</div>
            </div>
          </div>

          {/* 最近播放记录 */}
          <div className='bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700'>
            <div className='p-6'>
              <h2 className='text-xl font-semibold text-gray-900 dark:text-white mb-6'>
                最近播放记录
              </h2>
              {userStats.recentRecords.length > 0 ? (
                <div className='space-y-4'>
                  {userStats.recentRecords.map((record: PlayRecord) => (
                    <div
                      key={record.title + record.save_time}
                      className='flex items-center space-x-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors'
                      onClick={() => handlePlayRecord(record)}
                    >
                      <div className='flex-shrink-0 w-12 h-16 bg-gray-200 dark:bg-gray-600 rounded overflow-hidden'>
                        {record.cover ? (
                          <Image
                            src={record.cover}
                            alt={record.title}
                            width={48}
                            height={64}
                            className='w-full h-full object-cover'
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display =
                                'none';
                            }}
                          />
                        ) : (
                          <div className='w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-300'>
                            <svg
                              className='w-6 h-6'
                              fill='none'
                              stroke='currentColor'
                              viewBox='0 0 24 24'
                            >
                              <path
                                strokeLinecap='round'
                                strokeLinejoin='round'
                                strokeWidth='2'
                                d='M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m0 0V1a1 1 0 011-1h2a1 1 0 011 1v18a1 1 0 01-1 1H4a1 1 0 01-1-1V1a1 1 0 011-1h2a1 1 0 011 1v3'
                              />
                            </svg>
                          </div>
                        )}
                      </div>
                      <div className='flex-1 min-w-0'>
                        <h3 className='text-lg font-medium text-gray-900 dark:text-gray-100 truncate'>
                          {record.title}
                        </h3>
                        <p className='text-sm text-gray-500 dark:text-gray-400'>
                          来源: {record.source_name} | 年份: {record.year}
                        </p>
                        <p className='text-sm text-gray-500 dark:text-gray-400'>
                          第 {record.index} 集 / 共 {record.total_episodes} 集
                        </p>
                        <div className='mt-2'>
                          <div className='flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1'>
                            <span>播放进度</span>
                            <span>
                              {formatTime(record.play_time)} /{' '}
                              {formatTime(record.total_time)} (
                              {getProgressPercentage(
                                record.play_time,
                                record.total_time
                              )}
                              %)
                            </span>
                          </div>
                          <div className='w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2'>
                            <div
                              className='bg-green-600 h-2 rounded-full'
                              style={{
                                width: `${getProgressPercentage(
                                  record.play_time,
                                  record.total_time
                                )}%`,
                              }}
                            ></div>
                          </div>
                        </div>
                      </div>
                      <div className='text-right'>
                        <div className='text-sm text-gray-500 dark:text-gray-400'>
                          {formatDateTime(record.save_time)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className='text-center py-8'>
                  <div className='mx-auto h-12 w-12 text-gray-400 dark:text-gray-500'>
                    <svg
                      fill='none'
                      viewBox='0 0 24 24'
                      stroke='currentColor'
                      className='h-12 w-12'
                    >
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth='2'
                        d='M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z'
                      />
                    </svg>
                  </div>
                  <h3 className='mt-2 text-sm font-medium text-gray-900 dark:text-gray-100'>
                    暂无播放记录
                  </h3>
                  <p className='mt-1 text-sm text-gray-500 dark:text-gray-400'>
                    开始播放视频后，记录将显示在这里
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </PageLayout>
    );
  }

  // 加载中或错误状态
  return (
    <PageLayout activePath="/play-stats">
      <div className='max-w-6xl mx-auto px-4 py-8'>
        <div className='text-center py-12'>
          {error ? (
            <div className='text-red-600 dark:text-red-400'>{error}</div>
          ) : (
            <div className='text-gray-600 dark:text-gray-400'>
              {isAdmin ? '加载播放统计中...' : '加载个人统计中...'}
            </div>
          )}
        </div>
      </div>

      {/* 返回顶部悬浮按钮 */}
      <button
        onClick={scrollToTop}
        className={`fixed bottom-20 md:bottom-6 right-6 z-[500] w-12 h-12 bg-green-500/90 hover:bg-green-500 text-white rounded-full shadow-lg backdrop-blur-sm transition-all duration-300 ease-in-out flex items-center justify-center group ${showBackToTop
          ? 'opacity-100 translate-y-0 pointer-events-auto'
          : 'opacity-0 translate-y-4 pointer-events-none'
          }`}
        aria-label='返回顶部'
      >
        <ChevronUp className='w-6 h-6 transition-transform group-hover:scale-110' />
      </button>
    </PageLayout>
  );
};

export default PlayStatsPage;