import { NextResponse } from 'next/server';

// API列表，只保留准确性较高的服务
const apiList = [
  // 高准确性的首选API服务
  {
    name: 'ip9.com.cn',
    url: (ip: string) => `https://ip9.com.cn/get?ip=${ip}`,
    parser: (data: any) => {
      if (data.ret === 200 && data.data) {
        const d = data.data;
        const parts = [];
        if (d.country) parts.push(d.country);
        if (d.prov) parts.push(d.prov);
        if (d.city) parts.push(d.city);
        if (d.isp) parts.push(d.isp);
        return parts.length > 0 ? parts.join(' ') : null;
      }
      return null;
    }
  },
  // 准确性较高的API服务
  {
    name: 'ipapi.co',
    url: (ip: string) => `https://ipapi.co/${ip}/json/`,
    parser: (data: any) => {
      if (data.country_name) {
        const parts = [];
        if (data.country_name) parts.push(data.country_name);
        if (data.region) parts.push(data.region);
        if (data.city) parts.push(data.city);
        if (data.org) parts.push(data.org);
        return parts.length > 0 ? parts.join(' ') : null;
      }
      return null;
    }
  },
  {
    name: 'seeip.org',
    url: (ip: string) => `https://api.seeip.org/geoip/${ip}`,
    parser: (data: any) => {
      if (data.country) {
        const parts = [];
        if (data.country) parts.push(data.country);
        if (data.region) parts.push(data.region);
        if (data.city) parts.push(data.city);
        if (data.organization) parts.push(data.organization);
        return parts.length > 0 ? parts.join(' ') : null;
      }
      return null;
    }
  },
  {
    name: 'iplocation.net',
    url: (ip: string) => `https://api.iplocation.net/?ip=${ip}`,
    parser: (data: any) => {
      if (data.country_name) {
        const parts = [];
        if (data.country_name) parts.push(data.country_name);
        if (data.isp) parts.push(data.isp);
        return parts.length > 0 ? parts.join(' ') : null;
      }
      return null;
    }
  },
  {
    name: 'geoiplookup.io',
    url: (ip: string) => `https://json.geoiplookup.io/${ip}`,
    parser: (data: any) => {
      if (data.country_code) {
        const parts = [];
        if (data.country_name) parts.push(data.country_name);
        if (data.region_name) parts.push(data.region_name);
        if (data.city) parts.push(data.city);
        if (data.org) parts.push(data.org);
        return parts.length > 0 ? parts.join(' ') : null;
      }
      return null;
    }
  },
  {
    name: 'ip2location.io',
    url: (ip: string) => `https://api.ip2location.io/?ip=${ip}&format=json`,
    parser: (data: any) => {
      if (data.country_name) {
        const parts = [];
        if (data.country_name) parts.push(data.country_name);
        if (data.region_name) parts.push(data.region_name);
        if (data.city_name) parts.push(data.city_name);
        if (data.as) parts.push(data.as);
        return parts.length > 0 ? parts.join(' ') : null;
      }
      return null;
    }
  }
];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ip = searchParams.get('ip');

  if (!ip) {
    return NextResponse.json({ error: 'Missing IP parameter' }, { status: 400 });
  }

  // 本地访问
  if (ip === 'localhost' || ip === '127.0.0.1' || ip === '::1') {
    return NextResponse.json({ location: '本地访问' });
  }

  // 内网IP地址
  if (isPrivateIP(ip)) {
    return NextResponse.json({ location: '内网地址' });
  }

  // 依次尝试API
  for (const api of apiList) {
    try {
      console.log(`尝试使用 ${api.name} 查询IP: ${ip}`);
      
      const response = await fetch(api.url(ip), {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'application/json',
          'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
          'Cache-Control': 'no-cache'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        const result = api.parser(data);
        
        if (result) {
          console.log(`✅ ${api.name} 查询成功: ${ip} -> ${result}`);
          return NextResponse.json({ location: result });
        } else {
          console.warn(`❌ ${api.name} 返回数据无效:`, data);
        }
      } else {
        console.warn(`❌ ${api.name} HTTP错误: ${response.status} ${response.statusText}`);
      }
    } catch (error: any) {
      console.warn(`❌ ${api.name} 请求失败:`, error.message);
      // 继续尝试下一个API
    }
  }

  console.error(`❌ 所有IP查询API都失败了: ${ip}`);
  return NextResponse.json({ location: '查询失败' });
}

/**
 * 判断是否为内网IP地址
 * @param ip IP地址
 * @returns boolean
 */
function isPrivateIP(ip: string): boolean {
  // IPv4内网地址检查
  if (!ip.includes(':')) {
    const parts = ip.split('.').map(Number);
    if (parts.length !== 4 || parts.some(isNaN)) {
      return false;
    }

    const [a, b, c, d] = parts;
    
    // 10.0.0.0/8
    if (a === 10) return true;
    
    // 172.16.0.0/12
    if (a === 172 && b >= 16 && b <= 31) return true;
    
    // 192.168.0.0/16
    if (a === 192 && b === 168) return true;
    
    // 169.254.0.0/16 (APIPA)
    if (a === 169 && b === 254) return true;
    
    return false;
  }
  
  // IPv6内网地址检查
  // ::1 localhost
  if (ip === '::1') return true;
  
  // fc00::/7 (唯一本地地址)
  if (ip.toLowerCase().startsWith('fc') || ip.toLowerCase().startsWith('fd')) {
    return true;
  }
  
  // fe80::/10 (链路本地地址)
  if (ip.toLowerCase().startsWith('fe80')) {
    return true;
  }
  
  return false;
}