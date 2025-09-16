/**
 * 增强版弹幕优化器
 * 专门处理弹幕的全面优化，包括悬停问题、配置面板优化等
 */

// 扩展Window接口
declare global {
  interface Window {
    resizeResetTimeoutRef?: number;
    danmakuHoverTimeoutRef?: number;
  }
}

// TypeScript类型声明
interface ArtPlayer {
  on: (event: string, callback: (...args: any[]) => void) => void;
  off: (event: string, callback?: (...args: any[]) => void) => void;
  plugins?: {
    artplayerPluginDanmuku?: DanmakuPlugin;
  };
  fullscreen?: boolean;
  container?: HTMLElement;
  paused?: boolean;
  currentTime?: number;
  duration?: number;
  notice?: {
    show?: string;
  };
}

interface DanmakuPlugin {
  danmuku: any[];
  isHide: boolean;
  isStop: boolean;
  load: (data: any[]) => void;
  show: () => void;
  hide: () => void;
  stop: () => void;
  reset: () => void;
  emit: (danmu: any) => void;
  option: any;
}

/**
 * 应用增强的弹幕CSS修复
 */
export function applyEnhancedDanmakuCSSFixes() {
  // 检查是否已经应用过
  if (document.getElementById('enhanced-danmaku-fix')) return;
  
  const style = document.createElement('style');
  style.id = 'enhanced-danmaku-fix';
  style.textContent = `
    /* 修复全屏模式下的弹幕显示问题 */
    .artplayer[data-fullscreen="true"] .art-danmuku {
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      width: 100vw !important;
      height: 100vh !important;
      z-index: 2147483646 !important;
      pointer-events: none !important;
      transform: none !important;
    }
    
    /* 修复全屏模式下弹幕容器的定位问题 */
    .artplayer[data-fullscreen="true"] .art-danmuku-container {
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      width: 100vw !important;
      height: 100vh !important;
      z-index: 2147483645 !important;
      transform: none !important;
    }
    
    /* 确保弹幕在全屏模式下正确显示 */
    .artplayer[data-fullscreen="true"] .art-danmuku-item {
      position: absolute !important;
      z-index: 2147483647 !important;
      transform: translateZ(0) !important; /* 硬件加速 */
    }
    
    /* 修复全屏模式下弹幕配置面板的显示问题 */
    .artplayer[data-fullscreen="true"] .artplayer-plugin-danmuku .apd-config-panel {
      position: fixed !important;
      z-index: 2147483647 !important;
    }
    
    /* 确保弹幕容器在全屏模式下不会被裁剪 */
    .artplayer[data-fullscreen="true"] {
      overflow: hidden !important;
    }
    
    /* 优化弹幕配置面板的悬停效果 */
    .artplayer-plugin-danmuku .apd-config-panel {
      transition: opacity 0.3s ease, transform 0.3s ease !important;
      will-change: opacity, transform !important;
    }
    
    /* 鼠标悬停时显示配置面板 */
    .artplayer-plugin-danmuku:hover .apd-config-panel,
    .artplayer-plugin-danmuku .apd-config-panel:hover {
      opacity: 1 !important;
      visibility: visible !important;
      transform: translateY(0) !important;
    }
    
    /* 默认隐藏配置面板 */
    .artplayer-plugin-danmuku .apd-config-panel {
      opacity: 0 !important;
      visibility: hidden !important;
      transform: translateY(10px) !important;
    }
    
    /* 移动端优化 */
    @media (max-width: 768px) {
      .artplayer-plugin-danmuku .apd-config-panel {
        max-width: 90vw !important;
        left: 50% !important;
        transform: translateX(-50%) translateY(10px) !important;
      }
      
      .artplayer-plugin-danmuku:hover .apd-config-panel,
      .artplayer-plugin-danmuku .apd-config-panel:hover {
        transform: translateX(-50%) translateY(0) !important;
      }
    }
  `;
  
  document.head.appendChild(style);
}

/**
 * 全屏状态变化处理函数
 * @param player ArtPlayer实例
 * @param isFullscreen 是否全屏状态
 */
export function handleFullscreenChange(player: any, isFullscreen: boolean) {
  console.log('全屏状态变化:', isFullscreen);
  
  // 延迟处理以确保全屏状态已完全应用
  setTimeout(() => {
    if (player?.plugins?.artplayerPluginDanmuku) {
      const plugin = player.plugins.artplayerPluginDanmuku;
      
      // 保存当前状态
      const wasHidden = plugin.isHide;
      const wasStopped = plugin.isStop;
      
      // 重新初始化弹幕以适应新的显示状态
      plugin.reset();
      
      // 恢复隐藏状态（如果之前是隐藏的）
      if (wasHidden) {
        plugin.hide();
      }
      
      // 恢复停止状态（如果之前是停止的）
      if (wasStopped) {
        plugin.stop();
      }
      
      console.log('全屏状态变化后弹幕已重新初始化');
    }
  }, 100);
}

/**
 * 窗口大小变化处理函数
 * @param player ArtPlayer实例
 */
export function handleResize(player: any) {
  // 清除之前的重置计时器
  if (window.resizeResetTimeoutRef) {
    clearTimeout(window.resizeResetTimeoutRef);
  }
  
  // 延迟重置弹幕，避免连续触发（全屏切换优化）
  window.resizeResetTimeoutRef = window.setTimeout(() => {
    if (player?.plugins?.artplayerPluginDanmaku) {
      // 检查是否处于全屏状态
      const isFullscreen = player.fullscreen || 
                          (player.container && 
                           player.container.getAttribute('data-fullscreen') === 'true');
      
      if (isFullscreen) {
        // 全屏模式下的特殊处理
        player.plugins.artplayerPluginDanmaku.reset();
        console.log('全屏模式下窗口尺寸变化，弹幕已重置');
      } else {
        // 非全屏模式下的常规处理
        console.log('窗口尺寸变化，但非全屏模式，跳过弹幕重置');
      }
    }
  }, 300); // 300ms防抖，减少全屏切换时的卡顿
}

/**
 * 鼠标悬停处理函数
 * @param player ArtPlayer实例
 * @param isHover 是否悬停状态
 */
export function handleDanmakuHover(player: any, isHover: boolean) {
  // 清除之前的悬停定时器
  if (window.danmakuHoverTimeoutRef) {
    clearTimeout(window.danmakuHoverTimeoutRef);
  }
  
  if (isHover) {
    // 鼠标进入时立即显示配置面板
    showDanmakuConfigPanel(player);
  } else {
    // 鼠标离开时延迟隐藏配置面板
    window.danmakuHoverTimeoutRef = window.setTimeout(() => {
      hideDanmakuConfigPanel(player);
    }, 500); // 500ms延迟隐藏
  }
}

/**
 * 显示弹幕配置面板
 * @param player ArtPlayer实例
 */
function showDanmakuConfigPanel(player: any) {
  if (player?.plugins?.artplayerPluginDanmaku) {
    const configPanel = player.container?.querySelector('.apd-config-panel');
    if (configPanel) {
      configPanel.style.opacity = '1';
      configPanel.style.visibility = 'visible';
      configPanel.style.transform = 'translateY(0)';
    }
  }
}

/**
 * 隐藏弹幕配置面板
 * @param player ArtPlayer实例
 */
function hideDanmakuConfigPanel(player: any) {
  if (player?.plugins?.artplayerPluginDanmaku) {
    const configPanel = player.container?.querySelector('.apd-config-panel');
    if (configPanel) {
      configPanel.style.opacity = '0';
      configPanel.style.visibility = 'hidden';
      configPanel.style.transform = 'translateY(10px)';
    }
  }
}

/**
 * 增强的弹幕优化类
 */
export class EnhancedDanmakuOptimizer {
  private player: ArtPlayer | null = null;
  private plugin: DanmakuPlugin | null = null;
  private isFullscreen = false;
  private danmuData: any[] = [];
  private isVisible = true;
  private isStopped = false;
  private eventListeners: Array<{event: string, handler: (...args: any[]) => void}> = [];

  constructor(player: ArtPlayer) {
    this.player = player;
    this.plugin = player.plugins?.artplayerPluginDanmuku || null;
    
    if (this.plugin) {
      // 保存初始弹幕数据
      this.danmuData = this.plugin.danmuku || [];
      this.isVisible = !this.plugin.isHide;
      this.isStopped = this.plugin.isStop || false;
    }
    
    // 初始化事件监听器
    this.initEventListeners();
  }

  /**
   * 初始化事件监听器
   */
  private initEventListeners() {
    if (!this.player) return;
    
    // 监听全屏状态变化
    const fullscreenHandler = (state: boolean) => {
      this.handleFullscreenChange(state);
    };
    this.player.on('fullscreen:change', fullscreenHandler);
    this.eventListeners.push({event: 'fullscreen:change', handler: fullscreenHandler});
    
    // 监听窗口大小变化
    const resizeHandler = () => {
      this.handleResize();
    };
    this.player.on('resize', resizeHandler);
    this.eventListeners.push({event: 'resize', handler: resizeHandler});
    
    // 监听播放器销毁事件
    const destroyHandler = () => {
      this.destroy();
    };
    this.player.on('destroy', destroyHandler);
    this.eventListeners.push({event: 'destroy', handler: destroyHandler});
  }

  /**
   * 处理全屏状态变化
   */
  private handleFullscreenChange(state: boolean) {
    this.isFullscreen = state;
    console.log('全屏状态变化:', state);
    
    // 延迟处理以确保全屏状态已完全应用
    setTimeout(() => {
      this.reinitializeDanmaku();
    }, 100);
  }

  /**
   * 处理窗口大小变化
   */
  private handleResize() {
    // 在全屏模式下，窗口大小变化可能需要重新调整弹幕
    if (this.isFullscreen) {
      setTimeout(() => {
        this.reinitializeDanmaku();
      }, 50);
    }
  }

  /**
   * 重新初始化弹幕
   */
  private reinitializeDanmaku() {
    if (!this.plugin) return;
    
    try {
      // 保存当前状态
      const wasHidden = this.plugin.isHide;
      const wasStopped = this.plugin.isStop;
      
      // 重新加载弹幕数据
      if (this.danmuData.length > 0) {
        this.plugin.load(this.danmuData);
      }
      
      // 恢复显示状态
      if (wasHidden) {
        this.plugin.hide();
      } else {
        this.plugin.show();
      }
      
      // 恢复停止状态
      if (wasStopped) {
        this.plugin.stop();
      }
      
      console.log('弹幕已重新初始化，当前状态:', {
        fullscreen: this.isFullscreen,
        visible: !wasHidden,
        stopped: wasStopped,
        danmuCount: this.danmuData.length
      });
    } catch (error) {
      console.error('重新初始化弹幕失败:', error);
    }
  }

  /**
   * 更新弹幕数据
   */
  public updateDanmuData(data: any[]) {
    this.danmuData = data || [];
    if (this.plugin) {
      this.plugin.load(data);
    }
  }

  /**
   * 获取当前弹幕数据
   */
  public getDanmuData(): any[] {
    return this.danmuData;
  }

  /**
   * 销毁优化器
   */
  public destroy() {
    // 清理事件监听器
    if (this.player) {
      this.eventListeners.forEach(({event, handler}) => {
        this.player!.off(event, handler);
      });
    }
    
    // 清理可能的定时器
    if (window.danmakuHoverTimeoutRef) {
      clearTimeout(window.danmakuHoverTimeoutRef);
      window.danmakuHoverTimeoutRef = undefined;
    }
    
    // 清理引用
    this.player = null;
    this.plugin = null;
    this.danmuData = [];
    this.eventListeners = [];
  }
}

// 修复导出默认对象的问题
const danmakuOptimizer = {
  applyEnhancedDanmakuCSSFixes,
  handleFullscreenChange,
  handleResize,
  handleDanmakuHover,
  EnhancedDanmakuOptimizer
};

export default danmakuOptimizer;