'use client';

import { useState, useEffect } from 'react';

export default function IpTestPage() {
  const [ip, setIp] = useState('');
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async () => {
    if (!ip) {
      setError('请输入IP地址');
      return;
    }
    
    setLoading(true);
    setError('');
    setLocation('');
    
    try {
      const response = await fetch(`/api/ip-location?ip=${ip}`);
      const data = await response.json();
      
      if (response.ok) {
        setLocation(data.location);
      } else {
        setError(data.error || '查询失败');
      }
    } catch (err: any) {
      setError(err.message || '查询过程中发生错误');
    } finally {
      setLoading(false);
    }
  };

  // 获取当前访问者的IP地址
  useEffect(() => {
    const fetchClientIp = async () => {
      try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        setIp(data.ip);
      } catch (err) {
        console.error('获取IP地址失败:', err);
      }
    };
    
    fetchClientIp();
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            IP归属地查询测试
          </h2>
        </div>
        <div className="mt-8 bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="space-y-6">
            <div>
              <label htmlFor="ip" className="block text-sm font-medium text-gray-700">
                IP地址
              </label>
              <div className="mt-1">
                <input
                  id="ip"
                  name="ip"
                  type="text"
                  required
                  value={ip}
                  onChange={(e) => setIp(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
            </div>

            <div>
              <button
                onClick={handleSearch}
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {loading ? '查询中...' : '查询'}
              </button>
            </div>

            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <div className="text-sm text-red-700">
                  <p>{error}</p>
                </div>
              </div>
            )}

            {location && (
              <div className="rounded-md bg-green-50 p-4">
                <div className="text-sm text-green-700">
                  <p>查询结果: {location}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}