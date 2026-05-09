/* eslint-disable no-console */
import { NextRequest, NextResponse } from 'next/server';

import { getAuthInfoFromCookie } from '@/lib/auth';
import { getConfig } from '@/lib/config';
import { db } from '@/lib/db';

export const runtime = 'nodejs';

/**
 * 迁移脚本：为现有用户添加明文密码存储
 * 注意：此脚本只能为未加密的旧密码创建明文副本
 * 对于已加密的密码（包含冒号的hash格式），无法恢复明文
 */
export async function POST(request: NextRequest) {
  const storageType = process.env.NEXT_PUBLIC_STORAGE_TYPE || 'localstorage';
  if (storageType === 'localstorage') {
    return NextResponse.json(
      { error: '不支持本地存储' },
      { status: 400 }
    );
  }

  const authInfo = getAuthInfoFromCookie(request);
  if (!authInfo || !authInfo.username) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const config = await getConfig();
    const username = authInfo.username;

    // 判定操作者角色
    if (username !== process.env.USERNAME) {
      const userEntry = config.UserConfig.Users.find(
        (u) => u.username === username
      );
      if (!userEntry || userEntry.role !== 'admin' || userEntry.banned) {
        return NextResponse.json({ error: '权限不足，仅管理员可执行' }, { status: 401 });
      }
    }

    const allUsers = config.UserConfig.Users;
    let migratedCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];

    for (const user of allUsers) {
      try {
        // 获取加密密码
        const encryptedPassword = await db.getUserPassword(user.username);

        // 检查是否已经有明文密码
        const existingPlainPassword = await db.getUserPlainPassword(user.username);

        if (existingPlainPassword) {
          console.log(`用户 ${user.username} 已有明文密码，跳过`);
          skippedCount++;
          continue;
        }

        // 如果密码是加密格式（包含冒号），无法恢复明文
        if (encryptedPassword.includes(':')) {
          console.log(`用户 ${user.username} 的密码已加密，无法恢复明文`);
          errors.push(`${user.username}: 密码已加密，无法恢复`);
          skippedCount++;
          continue;
        }

        // 如果是旧的明文密码，保存一份副本
        if (encryptedPassword) {
          await db.setUserPlainPassword(user.username, encryptedPassword);
          console.log(`已为用户 ${user.username} 创建明文密码副本`);
          migratedCount++;
        } else {
          console.log(`用户 ${user.username} 没有密码记录`);
          skippedCount++;
        }
      } catch (err) {
        console.error(`处理用户 ${user.username} 失败:`, err);
        errors.push(`${user.username}: ${(err as Error).message}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: '密码迁移完成',
      migratedCount,
      skippedCount,
      totalUsers: allUsers.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('密码迁移失败:', error);
    return NextResponse.json(
      {
        error: '密码迁移失败',
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
