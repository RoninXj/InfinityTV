/* eslint-disable no-console,@typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';

import { getAuthInfoFromCookie } from '@/lib/auth';
import { getConfig } from '@/lib/config';

export const runtime = 'nodejs';

// 添加这个导出以避免静态渲染错误
export const dynamic = 'force-dynamic';

// 获取用户登录历史记录
export async function GET(req: NextRequest) {
  try {
    // 验证用户身份
    const authInfo = getAuthInfoFromCookie(req);
    if (!authInfo || !authInfo.username) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const targetUsername = searchParams.get('username');

    // 检查权限 - 只有管理员或所有者可以查看其他用户的登录历史
    const config = await getConfig();
    const currentUser = config.UserConfig.Users.find(u => u.username === authInfo.username);
    const isAdmin = (authInfo.username === process.env.USERNAME) || 
                   (currentUser && (currentUser.role === 'admin' || currentUser.role === 'owner'));
    
    if (targetUsername && targetUsername !== authInfo.username && !isAdmin) {
      return NextResponse.json({ error: '权限不足' }, { status: 403 });
    }

    // 确定要查询的用户名
    const usernameToQuery = targetUsername || authInfo.username;
    
    // 查找用户
    const user = config.UserConfig.Users.find(u => u.username === usernameToQuery);
    if (!user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    }

    // 返回登录历史记录
    const loginHistory = user.loginHistory || [];
    
    return NextResponse.json({
      username: user.username,
      loginHistory: loginHistory
    });
  } catch (error) {
    console.error('获取登录历史记录失败:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}