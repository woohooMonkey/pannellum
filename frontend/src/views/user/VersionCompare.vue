<template>
  <div class="version-compare-page">
    <!-- 顶部工具栏 -->
    <header class="compare-header">
      <el-button icon="el-icon-back" @click="goBack">返回预览</el-button>
      <div class="scene-selectors">
        <!-- 场景选择（公共） -->
        <div class="selector-group scene-selector">
          <span class="selector-label">场景：</span>
          <el-select v-model="selectedSceneId" placeholder="选择场景" @change="onSceneChange" size="small">
            <el-option v-for="scene in sceneList" :key="scene.id" :label="scene.name" :value="scene.id" />
          </el-select>
        </div>

        <span class="vs-divider">VS</span>

        <!-- 版本选择 -->
        <div class="selector-group">
          <span class="selector-label">左版本：</span>
          <el-select v-model="leftVersion" placeholder="选择版本" @change="onLeftVersionChange" size="small">
            <el-option v-for="v in versions" :key="v.version" :label="`版本 ${v.version}`" :value="v.version" />
          </el-select>
        </div>

        <div class="selector-group">
          <span class="selector-label">右版本：</span>
          <el-select v-model="rightVersion" placeholder="选择版本" @change="onRightVersionChange" size="small">
            <el-option v-for="v in versions" :key="v.version" :label="`版本 ${v.version}`" :value="v.version" />
          </el-select>
        </div>
      </div>
      <div class="sync-controls">
        <el-switch v-model="syncEnabled" active-text="同步" inactive-text="独立" />
      </div>
    </header>

    <!-- 对比内容区 -->
    <main class="compare-content">
      <!-- 左侧面板 -->
      <div class="viewer-panel left">
        <div class="panel-header">
          <span class="scene-name">{{ sceneName }}</span>
          <el-tag size="small" type="primary">版本 {{ leftVersion }}</el-tag>
        </div>
        <div id="left-viewer" ref="leftViewer" class="viewer-container"></div>
      </div>

      <!-- 分隔线 -->
      <div class="divider">
        <div class="divider-line"></div>
      </div>

      <!-- 右侧面板 -->
      <div class="viewer-panel right">
        <div class="panel-header">
          <span class="scene-name">{{ sceneName }}</span>
          <el-tag size="small" type="primary">版本 {{ rightVersion }}</el-tag>
        </div>
        <div id="right-viewer" ref="rightViewer" class="viewer-container"></div>
      </div>
    </main>

    <!-- 底部提示 -->
    <div class="compare-tips">
      <el-alert
        v-if="syncEnabled"
        title="同步模式：拖动任一视图，另一视图将同步移动"
        type="info"
        :closable="false"
        show-icon
      />
      <el-alert
        v-else
        title="独立模式：两个视图可独立操作"
        type="warning"
        :closable="false"
        show-icon
      />
    </div>
  </div>
</template>

<script>
import { panoramaApi, versionApi } from '@/api';

export default {
  name: 'VersionCompare',
  data() {
    return {
      sceneList: [],
      selectedSceneId: null,
      versions: [],
      leftVersion: null,
      rightVersion: null,
      leftViewerInstance: null,
      rightViewerInstance: null,
      syncEnabled: true,
      isSyncing: false,
      syncTimer: null,
      lastSyncValues: { left: null, right: null },
      activeViewer: 'left',
      leftMouseDown: false,
      rightMouseDown: false
    };
  },
  computed: {
    sceneName() {
      const scene = this.sceneList.find(s => s.id === this.selectedSceneId);
      return scene ? scene.name : '';
    }
  },
  mounted() {
    this.fetchSceneList();
    // 从路由参数获取初始场景
    if (this.$route.query.sceneId) {
      this.selectedSceneId = parseInt(this.$route.query.sceneId);
    }
  },
  beforeDestroy() {
    this.stopSyncTimer();
    if (this.leftViewerInstance) {
      this.leftViewerInstance.destroy();
      this.leftViewerInstance = null;
    }
    if (this.rightViewerInstance) {
      this.rightViewerInstance.destroy();
      this.rightViewerInstance = null;
    }
  },
  methods: {
    /**
     * 获取场景列表
     */
    async fetchSceneList() {
      try {
        const res = await panoramaApi.getList();
        if (res.success) {
          this.sceneList = res.data;
          // 默认选择第一个场景
          if (!this.selectedSceneId && this.sceneList.length > 0) {
            this.selectedSceneId = this.sceneList[0].id;
          }
          if (this.selectedSceneId) {
            await this.loadVersions();
          }
        }
      } catch (error) {
        console.error('获取场景列表失败:', error);
        this.$message.error('获取场景列表失败');
      }
    },

    /**
     * 加载版本列表
     */
    async loadVersions() {
      if (!this.selectedSceneId) return;

      try {
        const res = await versionApi.getList(this.selectedSceneId);
        if (res.success) {
          this.versions = res.data.versions;
          const currentVersion = res.data.panorama.current_version;

          if (this.versions.length > 0) {
            // 默认选择当前版本和上一个版本
            this.leftVersion = currentVersion;
            // 如果有多个版本，右侧选择上一个版本，否则选择相同版本
            if (this.versions.length > 1) {
              this.rightVersion = currentVersion > 1 ? currentVersion - 1 : currentVersion;
            } else {
              this.rightVersion = currentVersion;
            }

            await this.initLeftViewer();
            await this.initRightViewer();
          }
        }
      } catch (error) {
        console.error('获取版本列表失败:', error);
        this.$message.error('获取版本列表失败');
      }
    },

    /**
     * 初始化左侧全景图查看器
     */
    async initLeftViewer() {
      if (this.leftViewerInstance) {
        this.leftViewerInstance.destroy();
        this.leftViewerInstance = null;
      }

      this.removeViewerEvents('left');

      if (!this.selectedSceneId || !this.leftVersion) return;

      this.leftMouseDown = false;

      try {
        const res = await versionApi.getById(this.selectedSceneId, this.leftVersion);
        if (res.success) {
          this.leftViewerInstance = window.pannellum.viewer('left-viewer', {
            type: 'equirectangular',
            panorama: res.data.file_path,
            autoLoad: true,
            showFullscreenCtrl: false,
            showZoomCtrl: true,
            mouseZoom: true,
            compass: false,
            showControls: false
          });

          this.setupViewerEvents('left');
          this.startSyncTimer();
        }
      } catch (error) {
        console.error('加载左侧全景图失败:', error);
        this.$message.error('加载左侧全景图失败');
      }
    },

    /**
     * 初始化右侧全景图查看器
     */
    async initRightViewer() {
      if (this.rightViewerInstance) {
        this.rightViewerInstance.destroy();
        this.rightViewerInstance = null;
      }

      this.removeViewerEvents('right');

      if (!this.selectedSceneId || !this.rightVersion) return;

      this.rightMouseDown = false;

      try {
        const res = await versionApi.getById(this.selectedSceneId, this.rightVersion);
        if (res.success) {
          this.rightViewerInstance = window.pannellum.viewer('right-viewer', {
            type: 'equirectangular',
            panorama: res.data.file_path,
            autoLoad: true,
            showFullscreenCtrl: false,
            showZoomCtrl: true,
            mouseZoom: true,
            compass: false,
            showControls: false
          });

          this.setupViewerEvents('right');
          this.startSyncTimer();
        }
      } catch (error) {
        console.error('加载右侧全景图失败:', error);
        this.$message.error('加载右侧全景图失败');
      }
    },

    /**
     * 设置 viewer 的事件监听
     */
    setupViewerEvents(side) {
      const container = side === 'left' ? this.$refs.leftViewer : this.$refs.rightViewer;
      if (!container) return;

      const mouseDownHandler = (e) => this.handleMouseDown(side, e);
      const mouseUpHandler = (e) => this.handleMouseUp(side, e);

      if (side === 'left') {
        this._leftMouseDownHandler = mouseDownHandler;
        this._leftMouseUpHandler = mouseUpHandler;
      } else {
        this._rightMouseDownHandler = mouseDownHandler;
        this._rightMouseUpHandler = mouseUpHandler;
      }

      container.addEventListener('mousedown', mouseDownHandler);
      container.addEventListener('mouseup', mouseUpHandler);
      container.addEventListener('mouseleave', mouseUpHandler);
    },

    /**
     * 移除 viewer 的事件监听
     */
    removeViewerEvents(side) {
      const container = side === 'left' ? this.$refs.leftViewer : this.$refs.rightViewer;
      if (!container) return;

      if (side === 'left' && this._leftMouseDownHandler) {
        container.removeEventListener('mousedown', this._leftMouseDownHandler);
        container.removeEventListener('mouseup', this._leftMouseUpHandler);
        container.removeEventListener('mouseleave', this._leftMouseUpHandler);
      } else if (side === 'right' && this._rightMouseDownHandler) {
        container.removeEventListener('mousedown', this._rightMouseDownHandler);
        container.removeEventListener('mouseup', this._rightMouseUpHandler);
        container.removeEventListener('mouseleave', this._rightMouseUpHandler);
      }
    },

    /**
     * 处理鼠标按下事件
     */
    handleMouseDown(side) {
      if (side === 'left') {
        this.leftMouseDown = true;
        this.activeViewer = 'left';
      } else {
        this.rightMouseDown = true;
        this.activeViewer = 'right';
      }
    },

    /**
     * 处理鼠标释放事件
     */
    handleMouseUp(side) {
      if (side === 'left') {
        this.leftMouseDown = false;
      } else {
        this.rightMouseDown = false;
      }
    },

    /**
     * 启动同步定时器
     */
    startSyncTimer() {
      if (this.syncTimer) return;
      this.syncTimer = setInterval(() => {
        this.syncViewpoints();
      }, 16);
    },

    /**
     * 停止同步定时器
     */
    stopSyncTimer() {
      if (this.syncTimer) {
        clearInterval(this.syncTimer);
        this.syncTimer = null;
      }
    },

    /**
     * 同步视角
     */
    syncViewpoints() {
      if (!this.syncEnabled || this.isSyncing) return;
      if (!this.leftViewerInstance || !this.rightViewerInstance) return;

      let sourceViewer = null;
      let targetViewer = null;

      if (this.leftMouseDown) {
        sourceViewer = this.leftViewerInstance;
        targetViewer = this.rightViewerInstance;
        this.activeViewer = 'left';
      } else if (this.rightMouseDown) {
        sourceViewer = this.rightViewerInstance;
        targetViewer = this.leftViewerInstance;
        this.activeViewer = 'right';
      } else {
        if (this.activeViewer === 'left') {
          sourceViewer = this.leftViewerInstance;
          targetViewer = this.rightViewerInstance;
        } else if (this.activeViewer === 'right') {
          sourceViewer = this.rightViewerInstance;
          targetViewer = this.leftViewerInstance;
        } else {
          return;
        }
      }

      if (!sourceViewer || !targetViewer) return;

      try {
        const pitch = sourceViewer.getPitch();
        const yaw = sourceViewer.getYaw();
        const hfov = sourceViewer.getHfov();

        const side = this.activeViewer;
        const last = this.lastSyncValues[side];

        if (!last || Math.abs(pitch - last.pitch) > 0.1 || Math.abs(yaw - last.yaw) > 0.1 || Math.abs(hfov - last.hfov) > 0.1) {
          this.isSyncing = true;
          targetViewer.lookAt(pitch, yaw, hfov, false);

          this.lastSyncValues[side] = { pitch, yaw, hfov };
          const otherSide = side === 'left' ? 'right' : 'left';
          this.lastSyncValues[otherSide] = { pitch, yaw, hfov };

          setTimeout(() => {
            this.isSyncing = false;
          }, 50);
        }
      } catch (error) {
        // 忽略同步过程中的错误
      }
    },

    /**
     * 场景变化处理
     */
    async onSceneChange() {
      await this.loadVersions();
    },

    /**
     * 左侧版本变化处理
     */
    async onLeftVersionChange() {
      await this.initLeftViewer();
    },

    /**
     * 右侧版本变化处理
     */
    async onRightVersionChange() {
      await this.initRightViewer();
    },

    /**
     * 返回预览页面
     */
    goBack() {
      this.$router.push('/preview');
    }
  }
};
</script>

<style scoped>
.version-compare-page {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #1a1a1a;
}

.compare-header {
  height: 60px;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
  flex-shrink: 0;
}

.scene-selectors {
  display: flex;
  align-items: center;
  gap: 15px;
}

.selector-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.selector-label {
  color: #fff;
  font-size: 13px;
  white-space: nowrap;
}

.scene-selector {
  margin-right: 10px;
}

.vs-divider {
  color: #409eff;
  font-size: 18px;
  font-weight: bold;
  padding: 0 10px;
}

.sync-controls {
  display: flex;
  align-items: center;
}

.compare-content {
  flex: 1;
  display: flex;
  min-height: 0;
}

.viewer-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #000;
}

.panel-header {
  height: 40px;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 15px;
  flex-shrink: 0;
}

.scene-name {
  color: #fff;
  font-size: 14px;
  font-weight: 500;
}

.viewer-container {
  flex: 1;
  min-height: 0;
}

.divider {
  width: 4px;
  background: #409eff;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.divider-line {
  width: 2px;
  height: 100%;
  background: linear-gradient(to bottom, #409eff, #67c23a);
}

.compare-tips {
  height: 40px;
  flex-shrink: 0;
}

.compare-tips .el-alert {
  height: 100%;
  border-radius: 0;
}
</style>
