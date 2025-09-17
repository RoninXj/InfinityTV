import he from 'he';
import Hls from 'hls.js';

// 增强的设备检测逻辑，参考最新的设备特征
const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';

// iOS 设备检测 (包括 iPad 的新版本检测)
const isIOS = /iPad|iPhone|iPod/i.test(userAgent) && !(window as any).MSStream;
const isIOS13Plus = isIOS || (
  userAgent.includes('Macintosh') && 
  typeof navigator !== 'undefined' && 
  navigator.maxTouchPoints >= 1
);

// iPad 专门检测 (包括新的 iPad Pro)
const isIPad = /iPad/i.test(userAgent) || (
  userAgent.includes('Macintosh') && 
  typeof navigator !== 'undefined' && 
  navigator.maxTouchPoints > 2
);

// Android 设备检测
const isAndroid = /Android/i.test(userAgent);

// 移动设备检测 (更精确的判断)
const isMobile = isIOS13Plus || isAndroid || /webOS|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);

// 平板设备检测
const isTablet = isIPad || (isAndroid && !/Mobile/i.test(userAgent)) || 
  (typeof screen !== 'undefined' && screen.width >= 768);

// Safari 浏览器检测 (更精确)
const isSafari = /^(?:(?!chrome|android).)*safari/i.test(userAgent) && !isAndroid;

// WebKit 检测
const isWebKit = /WebKit/i.test(userAgent);

// 设备性能等级估算
const getDevicePerformanceLevel = (): 'low' | 'medium' | 'high' => {
  if (typeof navigator === 'undefined') return 'medium';
  
  // 基于硬件并发数判断
  const cores = navigator.hardwareConcurrency || 4;
  
  if (isMobile) {
    return cores >= 6 ? 'medium' : 'low';
  } else {
    return cores >= 8 ? 'high' : cores >= 4 ? 'medium' : 'low';
  }
};

const devicePerformance = getDevicePerformanceLevel();

// 导出设备检测结果供其他模块使用
export {
  isIOS,
  isIOS13Plus,
  isIPad,
  isAndroid,
  isMobile,
  isTablet,
  isSafari,
  isWebKit,
  devicePerformance,
  getDevicePerformanceLevel
};

function getDoubanImageProxyConfig(): {
  proxyType:
  | 'direct'
  | 'server'
  | 'img3'
  | 'cmliussss-cdn-tencent'
  | 'cmliussss-cdn-ali'
  | 'custom';
  proxyUrl: string;
} {
  const doubanImageProxyType =
    localStorage.getItem('doubanImageProxyType') ||
    (window as any).RUNTIME_CONFIG?.DOUBAN_IMAGE_PROXY_TYPE ||
    'cmliussss-cdn-tencent';
  const doubanImageProxy =
    localStorage.getItem('doubanImageProxyUrl') ||
    (window as any).RUNTIME_CONFIG?.DOUBAN_IMAGE_PROXY ||
    '';
  return {
    proxyType: doubanImageProxyType,
    proxyUrl: doubanImageProxy,
  };
}

/**
 * 处理图片 URL，如果设置了图片代理则使用代理
 */
export function processImageUrl(originalUrl: string): string {
  if (!originalUrl) return originalUrl;

  // 仅处理豆瓣图片代理
  if (!originalUrl.includes('doubanio.com')) {
    return originalUrl;
  }

  const { proxyType, proxyUrl } = getDoubanImageProxyConfig();
  switch (proxyType) {
    case 'server':
      return `/api/image-proxy?url=${encodeURIComponent(originalUrl)}`;
    case 'img3':
      return originalUrl.replace(/img\d+\.doubanio\.com/g, 'img3.doubanio.com');
    case 'cmliussss-cdn-tencent':
      return originalUrl.replace(
        /img\d+\.doubanio\.com/g,
        'img.doubanio.cmliussss.net'
      );
    case 'cmliussss-cdn-ali':
      return originalUrl.replace(
        /img\d+\.doubanio\.com/g,
        'img.doubanio.cmliussss.com'
      );
    case 'custom':
      return `${proxyUrl}${encodeURIComponent(originalUrl)}`;
    case 'direct':
    default:
      return originalUrl;
  }
}

/**
 * 从m3u8地址获取视频质量等级和网络信息
 * @param m3u8Url m3u8播放列表的URL
 * @returns Promise<{quality: string, loadSpeed: string, pingTime: number}> 视频质量等级和网络信息
 */
export async function getVideoResolutionFromM3u8(m3u8Url: string): Promise<{
  quality: string;
  loadSpeed: string;
  pingTime: number;
}> {
  try {
    // 检测是否为iPad（无论什么浏览器）
    const isIPad = /iPad/i.test(userAgent);
    
    if (isIPad) {
      // iPad使用最简单的ping测试，不创建任何video或HLS实例
      console.log('iPad检测，使用简化测速避免崩溃');
      
      const startTime = performance.now();
      try {
        await fetch(m3u8Url, { 
          method: 'HEAD', 
          mode: 'no-cors',
          signal: AbortSignal.timeout(2000)
        });
        const pingTime = Math.round(performance.now() - startTime);
        
        return {
          quality: '未知', // iPad不检测视频质量避免崩溃
          loadSpeed: '未知', // iPad不检测下载速度
          pingTime
        };
      } catch (error) {
        return {
          quality: '未知',
          loadSpeed: '未知',
          pingTime: 9999
        };
      }
    }
    
    // 非iPad设备使用优化后的测速逻辑
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.muted = true;
      video.preload = 'metadata';
      
      // 移动设备使用更小的视频元素减少内存占用
      if (isMobile) {
        video.width = 32;
        video.height = 18;
        video.style.display = 'none';
        video.style.position = 'absolute';
        video.style.left = '-9999px';
      }

      // 测量ping时间
      const pingStart = performance.now();
      let pingTime = 0;

      const pingPromise = fetch(m3u8Url, { method: 'HEAD', mode: 'no-cors' })
        .then(() => {
          pingTime = performance.now() - pingStart;
        })
        .catch(() => {
          pingTime = performance.now() - pingStart;
        });

      // 基于最新 hls.js 和设备性能的智能优化配置
      const hlsConfig = {
        debug: false,
        
        // Worker 配置 - 根据设备性能和浏览器能力
        enableWorker: !isMobile && !isSafari && devicePerformance !== 'low',
        
        // 低延迟模式 - 仅在高性能非移动设备上启用
        lowLatencyMode: !isMobile && devicePerformance === 'high',
        
        // 缓冲管理 - 基于设备性能分级
        maxBufferLength: devicePerformance === 'low' ? 3 : 
                        devicePerformance === 'medium' ? 8 : 15,
        maxBufferSize: devicePerformance === 'low' ? 1 * 1024 * 1024 :
                      devicePerformance === 'medium' ? 5 * 1024 * 1024 : 15 * 1024 * 1024,
        backBufferLength: isTablet ? 20 : isMobile ? 10 : 30,
        frontBufferFlushThreshold: devicePerformance === 'low' ? 15 : 
                                  devicePerformance === 'medium' ? 30 : 60,
        
        // 自适应比特率 - 根据设备类型和性能调整
        abrEwmaDefaultEstimate: devicePerformance === 'low' ? 1500000 :
                               devicePerformance === 'medium' ? 3000000 : 6000000,
        abrBandWidthFactor: 0.95,
        abrBandWidthUpFactor: isMobile ? 0.6 : 0.7,
        abrMaxWithRealBitrate: true,
        maxStarvationDelay: isMobile ? 2 : 4,
        maxLoadingDelay: isMobile ? 2 : 4,
        
        // 浏览器特殊优化
        liveDurationInfinity: !isSafari,
        progressive: false,
        
        // 移动设备网络优化
        ...(isMobile && {
          manifestLoadingRetryDelay: 2000,
          levelLoadingRetryDelay: 2000,
          manifestLoadingMaxRetry: 3,
          levelLoadingMaxRetry: 3,
        })
      };

      const hls = new Hls(hlsConfig);

      const timeoutDuration = isMobile ? 3000 : 4000;
      const timeout = setTimeout(() => {
        cleanup();
        reject(new Error('Timeout loading video metadata'));
      }, timeoutDuration);

      const cleanup = () => {
        clearTimeout(timeout);
        try {
          if (hls) hls.destroy();
        } catch (e) {
          console.warn('HLS cleanup error:', e);
        }
        try {
          if (video && video.parentNode) {
            video.parentNode.removeChild(video);
          } else if (video) {
            video.remove();
          }
        } catch (e) {
          console.warn('Video cleanup error:', e);
        }
      };

      video.onerror = () => {
        cleanup();
        reject(new Error('Failed to load video metadata'));
      };

      let actualLoadSpeed = '未知';
      let hasSpeedCalculated = false;
      let hasMetadataLoaded = false;
      let fragmentStartTime = 0;

      const checkAndResolve = async () => {
        if (hasMetadataLoaded && (hasSpeedCalculated || actualLoadSpeed !== '未知')) {
          await pingPromise;
          
          const width = video.videoWidth;
          let quality = '未知';
          
          if (width && width > 0) {
            quality = width >= 3840 ? '4K'
              : width >= 2560 ? '2K'
              : width >= 1920 ? '1080p'
              : width >= 1280 ? '720p'
              : width >= 854 ? '480p'
              : 'SD';
          }

          cleanup();
          resolve({
            quality,
            loadSpeed: actualLoadSpeed,
            pingTime: Math.round(pingTime),
          });
        }
      };

      // 监听片段加载
      hls.on(Hls.Events.FRAG_LOADING, () => {
        if (!hasSpeedCalculated) {
          fragmentStartTime = performance.now();
        }
      });

      hls.on(Hls.Events.FRAG_LOADED, (event: any, data: any) => {
        if (fragmentStartTime > 0 && data && data.payload && !hasSpeedCalculated) {
          const loadTime = performance.now() - fragmentStartTime;
          const size = data.payload.byteLength || 0;

          if (loadTime > 0 && size > 0) {
            const speedKBps = size / 1024 / (loadTime / 1000);
            actualLoadSpeed = speedKBps >= 1024
              ? `${(speedKBps / 1024).toFixed(2)} MB/s`
              : `${speedKBps.toFixed(2)} KB/s`;
            hasSpeedCalculated = true;
            checkAndResolve();
          }
        }
      });

      // 监听视频元数据加载完成
      video.addEventListener('loadedmetadata', () => {
        hasMetadataLoaded = true;
        checkAndResolve();
      });

      // 监听HLS错误
      hls.on(Hls.Events.ERROR, (event: any, data: any) => {
        console.warn('HLS测速错误:', data);
        if (data.fatal) {
          cleanup();
          reject(new Error(`HLS Error: ${data.type} - ${data.details}`));
        }
      });

      // 加载m3u8
      try {
        hls.loadSource(m3u8Url);
        hls.attachMedia(video);
      } catch (error) {
        cleanup();
        reject(error);
      }
    });
  } catch (error) {
    throw new Error(`测速失败: ${error}`);
  }
}

export function cleanHtmlTags(text: string): string {
  if (!text) return '';

  const cleanedText = text
    .replace(/<[^>]+>/g, '\n') // 将 HTML 标签替换为换行
    .replace(/\n+/g, '\n') // 将多个连续换行合并为一个
    .replace(/[ \t]+/g, ' ') // 将多个连续空格和制表符合并为一个空格，但保留换行符
    .replace(/^\n+|\n+$/g, '') // 去掉首尾换行
    .trim(); // 去掉首尾空格

  // 使用 he 库解码 HTML 实体
  return he.decode(cleanedText);
}

/**
 * 判断是否为内网IP地址
 * @param ip IP地址
 * @returns boolean
 */
export function isPrivateIP(ip: string): boolean {
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

/**
 * 获取IP地址的归属地信息
 * @param ip IP地址
 * @returns Promise<string> IP归属地信息
 */
export async function getIpLocation(ip: string): Promise<string> {
  if (!ip || ip === 'localhost' || ip === '127.0.0.1' || ip === '::1') {
    return '本地访问';
  }

  // IPv6地址的简单处理
  if (ip.includes(':')) {
    return 'IPv6地址';
  }

  // 内网IP地址
  if (isPrivateIP(ip)) {
    return '内网地址';
  }

  // API列表，只保留准确性较高的服务
  const apiList = [
    // 高准确性的首选API服务
    {
      name: 'ip9.com.cn',
      url: `https://ip9.com.cn/get?ip=${ip}`,
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
      url: `https://ipapi.co/${ip}/json/`,
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
      url: `https://api.seeip.org/geoip/${ip}`,
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
      url: `https://api.iplocation.net/?ip=${ip}`,
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
      url: `https://json.geoiplookup.io/${ip}`,
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
      url: `https://api.ip2location.io/?ip=${ip}&format=json`,
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

  // 依次尝试API
  for (const api of apiList) {
    try {
      console.log(`尝试使用 ${api.name} 查询IP: ${ip}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8秒超时
      
      const response = await fetch(api.url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'application/json',
          'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
          'Cache-Control': 'no-cache'
        }
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        const result = api.parser(data);
        
        if (result) {
          console.log(`✅ ${api.name} 查询成功: ${ip} -> ${result}`);
          return result;
        } else {
          console.warn(`❌ ${api.name} 返回数据无效:`, data);
        }
      } else {
        console.warn(`❌ ${api.name} HTTP错误: ${response.status} ${response.statusText}`);
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.warn(`⏱️ ${api.name} 请求超时`);
      } else {
        console.warn(`❌ ${api.name} 请求失败:`, error.message);
      }
      // 继续尝试下一个API
    }
  }

  console.error(`❌ 所有IP查询API都失败了: ${ip}`);
  return '查询失败';
}
