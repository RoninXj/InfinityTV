/**
 * 弹幕UI优化器
 * 专门处理弹幕配置面板的用户体验优化
 */

// 扩展Window接口
declare global {
  interface Window {
    danmakuPanelHoverTimeout?: number;
    danmakuPanelAutoHideTimeout?: number;
  }
}

/**
 * 弹幕配置面板管理器
 */
export class DanmakuPanelManager {
  private player: any;
  private plugin: any;
  private isPanelVisible: boolean = false;
  private isMouseOverPanel: boolean = false;
  private isMouseOverPlayer: boolean = false;
  private autoHideDelay: number = 3000; // 3秒后自动隐藏

  constructor(player: any) {
    this.player = player;
    this.plugin = player?.plugins?.artplayerPluginDanmuku;
    
    if (this.plugin) {
      this.initPanelEvents();
    }
  }

  /**
   * 初始化面板事件
   */
  private initPanelEvents() {
    // 监听鼠标进入播放器
    this.player.on('mouseenter', () => {
      this.isMouseOverPlayer = true;
      this.showPanelTemporarily();
    });

    // 监听鼠标离开播放器
    this.player.on('mouseleave', () => {
      this.isMouseOverPlayer = false;
      this.schedulePanelHide();
    });

    // 监听播放/暂停事件
    this.player.on('play', () => {
      this.schedulePanelHide();
    });

    this.player.on('pause', () => {
      this.showPanelTemporarily();
    });

    // 监听全屏变化
    this.player.on('fullscreen:change', () => {
      // 全屏切换时重置面板状态
      this.resetPanelState();
    });

    // 如果能获取到面板元素，直接监听面板的鼠标事件
    setTimeout(() => {
      const panel = this.getPanelElement();
      if (panel) {
        panel.addEventListener('mouseenter', () => {
          this.isMouseOverPanel = true;
          this.clearHideTimeout();
        });

        panel.addEventListener('mouseleave', () => {
          this.isMouseOverPanel = false;
          this.schedulePanelHide();
        });
      }
    }, 1000);
  }

  /**
   * 获取面板元素
   */
  private getPanelElement(): HTMLElement | null {
    return this.player.container?.querySelector('.apd-config-panel') || 
           document.querySelector('.apd-config-panel');
  }

  /**
   * 显示面板（临时）
   */
  private showPanelTemporarily() {
    this.clearHideTimeout();
    this.showPanel();
    
    // 设置自动隐藏定时器
    this.schedulePanelHide();
  }

  /**
   * 显示面板
   */
  private showPanel() {
    if (!this.plugin) return;
    
    const panel = this.getPanelElement();
    if (panel) {
      panel.style.opacity = '1';
      panel.style.visibility = 'visible';
      panel.style.transform = 'translateY(0)';
      this.isPanelVisible = true;
    }
  }

  /**
   * 隐藏面板
   */
  private hidePanel() {
    if (!this.plugin) return;
    
    const panel = this.getPanelElement();
    if (panel) {
      panel.style.opacity = '0';
      panel.style.visibility = 'hidden';
      panel.style.transform = 'translateY(10px)';
      this.isPanelVisible = false;
    }
  }

  /**
   * 安排面板隐藏
   */
  private schedulePanelHide() {
    this.clearHideTimeout();
    
    // 如果鼠标在面板上，不隐藏
    if (this.isMouseOverPanel) return;
    
    // 如果鼠标在播放器上且正在暂停，不隐藏
    if (this.isMouseOverPlayer && this.player.paused) return;
    
    window.danmakuPanelAutoHideTimeout = window.setTimeout(() => {
      this.hidePanel();
    }, this.autoHideDelay);
  }

  /**
   * 清除隐藏定时器
   */
  private clearHideTimeout() {
    if (window.danmakuPanelAutoHideTimeout) {
      clearTimeout(window.danmakuPanelAutoHideTimeout);
      window.danmakuPanelAutoHideTimeout = undefined;
    }
  }

  /**
   * 重置面板状态
   */
  private resetPanelState() {
    this.clearHideTimeout();
    this.isMouseOverPanel = false;
    this.isMouseOverPlayer = false;
    
    // 全屏切换后隐藏面板
    this.hidePanel();
  }

  /**
   * 销毁管理器
   */
  public destroy() {
    this.clearHideTimeout();
    
    // 移除事件监听器
    if (this.player) {
      this.player.off('mouseenter');
      this.player.off('mouseleave');
      this.player.off('play');
      this.player.off('pause');
      this.player.off('fullscreen:change');
    }
    
    // 移除面板事件监听器
    const panel = this.getPanelElement();
    if (panel) {
      // 注意：这里无法直接移除匿名函数监听器，但在实际应用中可以改进
    }
    
    this.player = null;
    this.plugin = null;
  }
}

/**
 * 应用弹幕面板样式优化
 */
export function applyDanmakuPanelStyles() {
  // 检查是否已经应用过
  if (document.getElementById('danmaku-panel-styles')) return;
  
  const style = document.createElement('style');
  style.id = 'danmaku-panel-styles';
  style.textContent = `
    /* 弹幕配置面板优化样式 */
    .artplayer-plugin-danmuku .apd-config-panel {
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
      will-change: opacity, transform !important;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
      border-radius: 8px !important;
      backdrop-filter: blur(10px) !important;
      background: rgba(30, 30, 30, 0.9) !important;
    }
    
    /* 面板项样式优化 */
    .artplayer-plugin-danmuku .apd-config-panel .apd-config-item {
      padding: 8px 12px !important;
      transition: background-color 0.2s ease !important;
      border-radius: 4px !important;
      margin: 2px 0 !important;
    }
    
    .artplayer-plugin-danmuku .apd-config-panel .apd-config-item:hover {
      background-color: rgba(255, 255, 255, 0.1) !important;
    }
    
    /* 滑块样式优化 */
    .artplayer-plugin-danmuku .apd-config-panel input[type="range"] {
      height: 4px !important;
      border-radius: 2px !important;
      background: rgba(255, 255, 255, 0.2) !important;
    }
    
    .artplayer-plugin-danmuku .apd-config-panel input[type="range"]::-webkit-slider-thumb {
      width: 16px !important;
      height: 16px !important;
      border-radius: 50% !important;
      background: #fff !important;
      border: none !important;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2) !important;
    }
    
    /* 按钮样式优化 */
    .artplayer-plugin-danmuku .apd-config-panel button {
      padding: 6px 12px !important;
      border-radius: 4px !important;
      background: rgba(255, 255, 255, 0.1) !important;
      border: 1px solid rgba(255, 255, 255, 0.2) !important;
      color: #fff !important;
      transition: all 0.2s ease !important;
    }
    
    .artplayer-plugin-danmuku .apd-config-panel button:hover {
      background: rgba(255, 255, 255, 0.2) !important;
      border-color: rgba(255, 255, 255, 0.3) !important;
    }
    
    /* 移动端适配 */
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
      
      .artplayer-plugin-danmuku .apd-config-panel .apd-config-item {
        padding: 10px 16px !important;
        font-size: 16px !important;
      }
    }
  `;
  
  document.head.appendChild(style);
}

export default {
  DanmakuPanelManager,
  applyDanmakuPanelStyles
};