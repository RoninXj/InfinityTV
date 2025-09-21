/* eslint-disable @typescript-eslint/no-explicit-any */

'use client';

import { AlertCircle, CheckCircle } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { CURRENT_VERSION } from '@/lib/version';
import { useSite } from '@/components/SiteProvider';
import { ThemeToggle } from '@/components/ThemeToggle';


// 添加动画关键帧的组件内样式
const gradientAnimationStyle = `
  @keyframes gradient-animation {
    0% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }
`;

// 版本显示组件
function VersionDisplay() {
  return (
    <div className='absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400'>
      <span className='font-mono'>v{CURRENT_VERSION}</span>
    </div>
  );
}

function RegisterPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { siteName } = useSite();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [registrationDisabled, setRegistrationDisabled] = useState(false);
  const [disabledReason, setDisabledReason] = useState('');
  const [updateStatus, setUpdateStatus] = useState<
    'checking' | 'has_update' | 'no_update' | 'error'
  >('checking');

  // 检查更新状态
  useEffect(() => {
    const checkForUpdates = async () => {
      try {
        const response = await fetch(
          'https://api.github.com/repos/MoonTechLab/LunaTV/releases/latest'
        );
        const data = await response.json();
        const latestVersion = data.tag_name?.replace('v', '');
        
        if (latestVersion && latestVersion > CURRENT_VERSION) {
          setUpdateStatus('has_update');
        } else {
          setUpdateStatus('no_update');
        }
      } catch (error) {
        console.error('检查更新失败:', error);
        setUpdateStatus('error');
      }
    };

    checkForUpdates();
  }, []);

  // 检查注册是否被禁用
  useEffect(() => {
    const checkRegistrationStatus = async () => {
      try {
        const res = await fetch('/api/admin/config');
        if (res.ok) {
          const config = await res.json();
          setRegistrationDisabled(!config.UserConfig.AllowRegister);
          if (!config.UserConfig.AllowRegister) {
            setDisabledReason('管理员已关闭用户注册功能');
          }
        }
      } catch (err) {
        console.error('获取配置失败:', err);
      }
    };

    checkRegistrationStatus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // 基本验证
    if (username.length < 3 || username.length > 20) {
      setError('用户名长度应在3-20位之间');
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      setError('用户名只能包含字母、数字和下划线');
      return;
    }

    if (password.length < 6) {
      setError('密码长度至少6位');
      return;
    }

    if (password !== confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess('注册成功！正在跳转到登录页面...');
        // 3秒后跳转到登录页面
        setTimeout(() => {
          router.push('/login');
        }, 3000);
      } else {
        setError(data.error || '注册失败');
      }
    } catch (err) {
      setError('网络错误，请稍后重试');
      console.error('注册错误:', err);
    } finally {
      setLoading(false);
    }
  };

  // 在组件挂载时添加样式
  useEffect(() => {
    const styleElement = document.createElement('style');
    styleElement.textContent = gradientAnimationStyle;
    document.head.appendChild(styleElement);

    // 清理函数
    return () => {
      if (styleElement.parentNode) {
        styleElement.parentNode.removeChild(styleElement);
      }
    };
  }, []);

  if (registrationDisabled) {
    return (
      <div className='relative min-h-screen flex items-center justify-center px-4 overflow-hidden'>
        <div className='absolute top-4 right-4'>
          <ThemeToggle />
        </div>
        <div className='relative z-10 w-full max-w-md rounded-3xl bg-gradient-to-b from-white/90 via-white/70 to-white/40 dark:from-zinc-900/90 dark:via-zinc-900/70 dark:to-zinc-900/40 backdrop-blur-xl shadow-2xl p-10 dark:border dark:border-zinc-800'>
          <h1 
            className='text-center text-3xl font-extrabold mb-2 tracking-tight drop-shadow-sm'
            style={{
              background: 'linear-gradient(45deg, #ff0000, #ff8000, #ffff00, #80ff00, #00ff00, #00ff80, #00ffff, #0080ff, #0000ff, #8000ff, #ff00ff, #ff0080)',
              backgroundSize: '1200% 1200%',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              animation: 'gradient-animation 8s ease infinite',
            }}
          >
            {siteName}
          </h1>
          <div className='text-center space-y-6'>
            <div className='flex items-center justify-center mb-4'>
              <AlertCircle className='w-16 h-16 text-yellow-500' />
            </div>
            <h2 className='text-xl font-semibold text-gray-800 dark:text-gray-200'>
              注册功能暂不可用
            </h2>
            <p className='text-gray-600 dark:text-gray-400 text-sm leading-relaxed'>
              {disabledReason || '管理员已关闭用户注册功能'}
            </p>
            <p className='text-gray-500 dark:text-gray-500 text-xs'>
              如需注册账户，请联系网站管理员
            </p>
            <button
              onClick={() => router.push('/login')}
              className='inline-flex w-full justify-center rounded-lg bg-green-600 py-3 text-base font-semibold text-white shadow-lg transition-all duration-200 hover:bg-green-700'
            >
              返回登录
            </button>
          </div>
        </div>
        <VersionDisplay />
      </div>
    );
  }

  return (
    <div className='relative min-h-screen flex items-center justify-center px-4 overflow-hidden'>
      <div className='absolute top-4 right-4'>
        <ThemeToggle />
      </div>
      <div className='relative z-10 w-full max-w-md rounded-3xl bg-gradient-to-b from-white/90 via-white/70 to-white/40 dark:from-zinc-900/90 dark:via-zinc-900/70 dark:to-zinc-900/40 backdrop-blur-xl shadow-2xl p-10 dark:border dark:border-zinc-800'>
        <h1 
          className='text-center text-3xl font-extrabold mb-2 tracking-tight drop-shadow-sm'
          style={{
            background: 'linear-gradient(45deg, #ff0000, #ff8000, #ffff00, #80ff00, #00ff00, #00ff80, #00ffff, #0080ff, #0000ff, #8000ff, #ff00ff, #ff0080)',
            backgroundSize: '1200% 1200%',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            animation: 'gradient-animation 8s ease infinite',
          }}
        >
          {siteName}
        </h1>
        <p className='text-center text-gray-600 dark:text-gray-400 text-sm mb-8'>
          注册新账户
        </p>
        
        <form onSubmit={handleSubmit} className='space-y-6'>
          <div>
            <label htmlFor='username' className='sr-only'>
              用户名
            </label>
            <input
              id='username'
              type='text'
              autoComplete='username'
              className='block w-full rounded-lg border-0 py-3 px-4 text-gray-900 dark:text-gray-100 shadow-sm ring-1 ring-white/60 dark:ring-white/20 placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:ring-2 focus:ring-green-500 focus:outline-none sm:text-base bg-white/60 dark:bg-zinc-800/60 backdrop-blur'
              placeholder='输入用户名 (3-20位字母数字下划线)'
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <div>
            <label htmlFor='password' className='sr-only'>
              密码
            </label>
            <input
              id='password'
              type='password'
              autoComplete='new-password'
              className='block w-full rounded-lg border-0 py-3 px-4 text-gray-900 dark:text-gray-100 shadow-sm ring-1 ring-white/60 dark:ring-white/20 placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:ring-2 focus:ring-green-500 focus:outline-none sm:text-base bg-white/60 dark:bg-zinc-800/60 backdrop-blur'
              placeholder='输入密码 (至少6位)'
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div>
            <label htmlFor='confirmPassword' className='sr-only'>
              确认密码
            </label>
            <input
              id='confirmPassword'
              type='password'
              autoComplete='new-password'
              className='block w-full rounded-lg border-0 py-3 px-4 text-gray-900 dark:text-gray-100 shadow-sm ring-1 ring-white/60 dark:ring-white/20 placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:ring-2 focus:ring-green-500 focus:outline-none sm:text-base bg-white/60 dark:bg-zinc-800/60 backdrop-blur'
              placeholder='再次输入密码'
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>

          {error && (
            <p className='text-sm text-red-600 dark:text-red-400'>{error}</p>
          )}

          {success && (
            <p className='text-sm text-green-600 dark:text-green-400'>{success}</p>
          )}

          <button
            type='submit'
            disabled={
              !username || !password || !confirmPassword || loading || !!success
            }
            className='inline-flex w-full justify-center rounded-lg bg-green-600 py-3 text-base font-semibold text-white shadow-lg transition-all duration-200 hover:from-green-600 hover:to-blue-600 disabled:cursor-not-allowed disabled:opacity-50'
          >
            {loading ? '注册中...' : success ? '注册成功，正在跳转...' : '注册'}
          </button>

          <div className='text-center'>
            <span className='text-gray-600 dark:text-gray-400 text-sm'>
              已有账户？
            </span>
            <button
              type='button'
              onClick={() => router.push('/login')}
              className='ml-2 text-green-600 dark:text-green-400 text-sm font-medium hover:underline'
            >
              立即登录
            </button>
          </div>
        </form>
      </div>

      <VersionDisplay />
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <RegisterPageClient />
    </Suspense>
  );
}