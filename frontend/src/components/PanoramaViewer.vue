<template>
  <div class="panorama-viewer-container">
    <!-- 加载状态 -->
    <div v-if="loading" class="loading-overlay">
      <el-icon class="is-loading" :size="50">
        <svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
          <path fill="currentColor" d="M512 64 128 192v384c0 212.1 171.9 384 384 384s384-171.9 384-384V192L512 64zm0 832c-176.4 0-320-143.6-320-320V241.9l320-106.7 320 106.7V576c0 176.4-143.6 320-320 320z"/>
        </svg>
      </el-icon>
      <p>全景图加载中...</p>
    </div>

    <!-- 无全景图提示 -->
    <div v-if="!loading && !panorama" class="no-panorama">
      <el-empty description="暂无主全景图，请联系管理员上传"></el-empty>
    </div>

    <!-- 全景图容器 -->
    <div id="panorama-viewer" ref="viewer"></div>

    <!-- 返回主图按钮 -->
    <div v-if="showBackButton" class="back-button">
      <el-button type="primary" icon="el-icon-back" @click="goToMain">返回主全景图</el-button>
    </div>

    <!-- 标记点信息弹窗 -->
    <el-dialog
      :title="markerInfo.title"
      :visible.sync="dialogVisible"
      width="400px"
      center
    >
      <p class="marker-description">{{ markerInfo.description }}</p>
      <span slot="footer" class="dialog-footer">
        <el-button type="primary" @click="dialogVisible = false">确定</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
import { panoramaApi, markerApi } from '@/api';

export default {
  name: 'PanoramaViewer',
  props: {
    // 初始全景图 ID（可选，默认加载主图）
    initialPanoramaId: {
      type: Number,
      default: null
    },
    // 是否显示返回主图按钮
    showBack: {
      type: Boolean,
      default: true
    },
    // 自动旋转速度（度/秒，正值逆时针，负值顺时针，false 或 0 不旋转）
    autoRotate: {
      type: [Number, Boolean],
      default: false
    }
  },
  data() {
    return {
      loading: false,
      panorama: null,
      markers: [],
      viewer: null,
      currentPanoramaId: null,
      isMainPanorama: true,
      dialogVisible: false,
      markerInfo: {
        title: '',
        description: ''
      },
      _pendingLoadResolve: null,
      _pendingLoadReject: null
    };
  },
  computed: {
    showBackButton() {
      return this.showBack && !this.isMainPanorama && this.panorama;
    }
  },
  mounted() {
    // 初始化加载
    if (this.initialPanoramaId) {
      this.loadPanorama(this.initialPanoramaId);
    } else {
      this.loadMainPanorama();
    }
  },
  beforeDestroy() {
    // 销毁 viewer 实例
    if (this.viewer) {
      this.viewer.destroy();
    }
  },
  methods: {
    /**
     * 加载主全景图
     */
    async loadMainPanorama() {
      this.loading = true;
      try {
        const res = await panoramaApi.getMain();
        if (res.success && res.data) {
          this.panorama = res.data;
          this.markers = res.data.markers || [];
          this.currentPanoramaId = res.data.id;
          this.isMainPanorama = true;
          this.$nextTick(() => {
            this.initViewer();
          });
        } else {
          this.panorama = null;
          this.markers = [];
        }
      } catch (error) {
        console.error('加载主全景图失败:', error);
        this.$message.error('加载全景图失败');
      } finally {
        this.loading = false;
      }
    },

    /**
     * 加载指定全景图
     * @param {number} id - 全景图 ID
     * @param {Object} lookAt - 可选，加载后指向的坐标 { pitch, yaw }
     */
    async loadPanorama(id, lookAt = null) {
      this.loading = true;
      try {
        const res = await panoramaApi.getById(id);
        if (res.success && res.data) {
          this.panorama = res.data;
          this.markers = res.data.markers || [];
          this.currentPanoramaId = res.data.id;
          // 检查是否为主图
          this.isMainPanorama = res.data.type === 'main';
          this.$nextTick(() => {
            this.initViewer(lookAt);
          });
        } else {
          this.$message.error('全景图不存在');
        }
      } catch (error) {
        console.error('加载全景图失败:', error);
        this.$message.error('加载全景图失败');
      } finally {
        this.loading = false;
      }
    },

    /**
     * 初始化 Pannellum 查看器
     * @param {Object} lookAt - 可选，初始视角坐标 { pitch, yaw }
     */
    initViewer(lookAt = null) {
      // 销毁已有实例
      if (this.viewer) {
        this.viewer.destroy();
      }

      // 转换标记点数据为 Pannellum 格式
      const hotSpots = this.markers.map(marker => ({
        id: marker.id,
        pitch: parseFloat(marker.pitch),
        yaw: parseFloat(marker.yaw),
        type: 'custom',
        cssClass: marker.type === 'navigation' ? 'custom-marker-navigation' : 'custom-marker-normal',
        // 添加 tooltip 功能
        createTooltipFunc: (hotSpotDiv, args) => {
          this.createCustomTooltip(hotSpotDiv, args);
        },
        createTooltipArgs: {
          title: marker.title,
          description: marker.description,
          type: marker.type
        },
        clickHandlerFunc: () => this.handleMarkerClick(marker)
      }));

      // 创建 Pannellum 实例
      const config = {
        type: 'equirectangular',
        panorama: this.panorama.file_path,
        autoLoad: true,
        hotSpots: hotSpots,
        compass: true,
        showFullscreenCtrl: true,
        showZoomCtrl: true,
        hotSpotDebug: false
      };

      // 如果指定了初始视角，设置 pitch 和 yaw
      if (lookAt && lookAt.pitch !== undefined && lookAt.yaw !== undefined) {
        config.pitch = parseFloat(lookAt.pitch);
        config.yaw = parseFloat(lookAt.yaw);
      }

      // 添加 autoRotate 配置（只有当值为数字且不为 0 时才添加）
      if (typeof this.autoRotate === 'number' && this.autoRotate !== 0) {
        config.autoRotate = this.autoRotate;
      }

      this.viewer = window.pannellum.viewer('panorama-viewer', config);

      // 触发加载完成事件（UI更新用）
      this.$emit('loaded', this.panorama);

      // 全景图完全加载后resolve异步Promise
      this.viewer.on('load', () => {
        if (this._pendingLoadResolve) {
          this._pendingLoadResolve(this.panorama);
          this._pendingLoadResolve = null;
          this._pendingLoadReject = null;
        }
      });
    },

    /**
     * 创建自定义 tooltip
     * @param {Object} hotSpotDiv - hotspot 容器
     * @param {Object} args - 参数 { title, description, type }
     */
    createCustomTooltip(hotSpotDiv, args) {
      const tooltip = document.createElement('div');
      tooltip.className = 'custom-tooltip';

      // 类型标签
      const typeLabel = args.type === 'navigation' ? '导航点' : '信息点';
      const typeClass = args.type === 'navigation' ? 'type-navigation' : 'type-normal';

      tooltip.innerHTML = `
        <div class="tooltip-type ${typeClass}">${typeLabel}</div>
        <div class="tooltip-title">${args.title}</div>
        ${args.description ? `<div class="tooltip-desc">${args.description}</div>` : ''}
      `;

      // 将 tooltip 添加到 hotspot 容器内
      hotSpotDiv.appendChild(tooltip);

      // hover 显示/隐藏
      hotSpotDiv.addEventListener('mouseenter', () => {
        tooltip.style.opacity = '1';
        tooltip.style.visibility = 'visible';
        tooltip.style.transform = 'translateX(-50%) translateY(-5px)';
      });
      hotSpotDiv.addEventListener('mouseleave', () => {
        tooltip.style.opacity = '0';
        tooltip.style.visibility = 'hidden';
        tooltip.style.transform = 'translateX(-50%) translateY(0)';
      });
    },

    /**
     * 处理标记点点击
     * @param {Object} marker - 标记点数据
     */
    handleMarkerClick(marker) {
      if (marker.type === 'navigation') {
        // 导航点 - 切换到目标场景
        if (marker.target_panorama_id) {
          this.loadPanorama(marker.target_panorama_id);
        }
      } else {
        // 普通标记 - 显示信息弹窗
        this.markerInfo = {
          title: marker.title,
          description: marker.description || '暂无描述'
        };
        this.dialogVisible = true;
      }
    },

    /**
     * 返回主全景图
     */
    goToMain() {
      this.loadMainPanorama();
    },

    /**
     * 获取当前点击位置的坐标（用于标记点编辑）
     * 使用方式：在外部调用 this.$refs.viewer.getClickPosition()
     */
    getClickPosition() {
      return new Promise((resolve) => {
        const handler = (event) => {
          const coords = this.viewer.mouseEventToCoords(event);
          this.viewer.off('mousedown', handler);
          resolve({
            pitch: coords[0],
            yaw: coords[1]
          });
        };
        this.viewer.on('mousedown', handler);
      });
    },

    /**
     * 平滑转向目标坐标
     * @param {number} pitch - 目标俯仰角
     * @param {number} yaw - 目标偏航角
     * @param {number} duration - 动画时长(ms)
     */
    lookAt(pitch, yaw, duration = 800) {
      return new Promise((resolve) => {
        if (!this.viewer) { resolve(); return; }

        const startPitch = this.viewer.getPitch();
        const startYaw = this.viewer.getYaw();
        const startTime = performance.now();

        // 处理偏航角环绕（取最短路径）
        let deltaYaw = yaw - startYaw;
        if (deltaYaw > 180) deltaYaw -= 360;
        if (deltaYaw < -180) deltaYaw += 360;

        const animateStep = () => {
          if (!this.viewer) { resolve(); return; }

          const elapsed = performance.now() - startTime;
          const progress = Math.min(elapsed / duration, 1);
          // EaseInOut 缓动函数
          const ease = progress < 0.5
            ? 2 * progress * progress
            : -1 + (4 - 2 * progress) * progress;

          this.viewer.setPitch(startPitch + (pitch - startPitch) * ease, false);
          this.viewer.setYaw(startYaw + deltaYaw * ease, false);

          if (progress < 1) {
            requestAnimationFrame(animateStep);
          } else {
            resolve();
          }
        };

        requestAnimationFrame(animateStep);
      });
    },

    /**
     * 平滑缩放到指定水平视角
     * @param {number} hfov - 目标水平视角（值越小越放大）
     * @param {number} duration - 动画时长(ms)
     */
    zoomTo(hfov, duration = 800) {
      return new Promise((resolve) => {
        if (!this.viewer) { resolve(); return; }

        const startHfov = this.viewer.getHfov();
        const startTime = performance.now();

        const animateStep = () => {
          if (!this.viewer) { resolve(); return; }

          const elapsed = performance.now() - startTime;
          const progress = Math.min(elapsed / duration, 1);
          const ease = progress < 0.5
            ? 2 * progress * progress
            : -1 + (4 - 2 * progress) * progress;

          this.viewer.setHfov(startHfov + (hfov - startHfov) * ease, false);

          if (progress < 1) {
            requestAnimationFrame(animateStep);
          } else {
            resolve();
          }
        };

        requestAnimationFrame(animateStep);
      });
    },

    /**
     * 重置水平视角到默认值
     * @param {number} duration - 动画时长(ms)
     */
    resetHfov(duration = 600) {
      return this.zoomTo(75, duration);
    },

    /**
     * 异步加载全景图（等待Pannellum完全加载完成后resolve）
     * @param {number} id - 全景图 ID
     * @param {Object} lookAt - 可选，加载后指向的坐标 { pitch, yaw }
     */
    loadPanoramaAsync(id, lookAt = null) {
      return new Promise((resolve, reject) => {
        this._pendingLoadResolve = resolve;
        this._pendingLoadReject = reject;
        this.loadPanorama(id, lookAt);
      });
    }
  }
};
</script>

<style scoped>
.panorama-viewer-container {
  position: relative;
  width: 100%;
  height: 100%;
}

#panorama-viewer {
  width: 100%;
  height: 100%;
}
.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.9);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  z-index: 100;
}
.loading-overlay p {
  margin-top: 20px;
  color: #666;
  font-size: 16px;
}
.no-panorama {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  background: #f5f7fa;
}
.back-button {
  position: absolute;
  top: 20px;
  left: 20px;
  z-index: 10;
}
.marker-description {
  line-height: 1.8;
  color: #606266;
}
</style>
</style>