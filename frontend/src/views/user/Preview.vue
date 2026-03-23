<template>
  <div class="preview-page">
    <!-- 顶部导航栏 -->
    <header class="preview-header">
      <h1 class="logo">全景图预览</h1>
      <nav class="header-nav">
        <!-- 场景选择下拉框 -->
        <el-select
          v-model="selectedSceneId"
          placeholder="选择场景"
          class="scene-select"
          @change="onSceneChange"
          :loading="sceneListLoading"
          :disabled="isRoaming"
        >
          <el-option
            v-for="scene in sceneList"
            :key="scene.id"
            :label="scene.name + (scene.type === 'main' ? ' (主图)' : '')"
            :value="scene.id"
          />
        </el-select>
        <el-link type="info" href="/admin/login">管理员登录</el-link>
      </nav>
    </header>

    <!-- 全景图查看器 -->
    <main class="preview-content">
      <panorama-viewer
        ref="viewer"
        :auto-rotate="autoRotateSpeed"
        @loaded="onPanoramaLoaded"
      />
    </main>

    <!-- 当前场景信息 -->
    <div class="scene-info" v-if="currentPanorama">
      <div class="scene-title">
        {{ currentPanorama.name }}
        <span v-if="isRoaming" class="roaming-badge">漫游中</span>
      </div>
      <div class="scene-desc" v-if="currentPanorama.description">{{ currentPanorama.description }}</div>
      <div class="roaming-progress" v-if="isRoaming">
        <el-progress
          :percentage="roamingProgress"
          :format="roamingProgressFormat"
          :stroke-width="6"
        />
      </div>
    </div>

    <!-- 漫游控制面板 -->
    <div class="roaming-panel" v-if="!isRoaming">
      <el-popover
        placement="top"
        width="320"
        trigger="click"
        v-model="roamingPopoverVisible"
      >
        <div class="roaming-config">
          <h4>选择漫游场景</h4>
          <p class="roaming-tip">请选择要漫游的场景（按顺序播放）</p>
          <el-select
            v-model="roamingSceneIds"
            multiple
            placeholder="请选择场景"
            class="roaming-scene-select"
            :loading="sceneListLoading"
          >
            <el-option
              v-for="scene in sceneList"
              :key="scene.id"
              :label="scene.name + (scene.type === 'main' ? ' (主图)' : '')"
              :value="scene.id"
            />
          </el-select>
          <div class="roaming-config-footer">
            <el-button size="small" @click="roamingPopoverVisible = false">取消</el-button>
            <el-button
              type="primary"
              size="small"
              @click="startRoaming"
              :disabled="roamingSceneIds.length === 0"
            >
              开始漫游
            </el-button>
          </div>
        </div>
        <el-button
          type="primary"
          slot="reference"
          icon="el-icon-video-play"
        >
          漫游模式
        </el-button>
      </el-popover>
    </div>

    <!-- 漫游控制按钮 -->
    <div class="roaming-controls" v-if="isRoaming">
      <!-- 下一个按钮（不是最后一个场景时显示） -->
      <el-button
        v-if="!isLastScene"
        type="success"
        icon="el-icon-right"
        @click="goToNextScene"
      >
        下一个
      </el-button>
      <!-- 停止漫游按钮 -->
      <el-button
        type="danger"
        icon="el-icon-video-pause"
        @click="stopRoaming"
      >
        停止漫游
      </el-button>
    </div>

    <!-- 图例说明 -->
    <div class="legend">
      <div class="legend-item">
        <span class="marker-icon normal"></span>
        <span>信息点</span>
      </div>
      <div class="legend-item">
        <span class="marker-icon navigation"></span>
        <span>导航点</span>
      </div>
    </div>
  </div>
</template>

<script>
import PanoramaViewer from '@/components/PanoramaViewer.vue';
import { panoramaApi } from '@/api';

export default {
  name: 'Preview',
  components: {
    PanoramaViewer
  },
  data() {
    return {
      currentPanorama: null,
      sceneList: [],           // 所有场景列表
      sceneListLoading: false, // 场景列表加载状态
      selectedSceneId: null,   // 当前选中的场景 ID

      // 漫游相关
      roamingPopoverVisible: false,  // 漫游配置弹窗显示状态
      roamingSceneIds: [],           // 选中的漫游场景 ID 列表
      isRoaming: false,              // 是否正在漫游
      currentRoamingIndex: 0,        // 当前漫游的场景索引
      autoRotateSpeed: false,        // 自动旋转速度（false 表示不旋转，-4 表示每秒顺时针旋转 4 度）
      rotationStartTime: 0,          // 当前场景开始旋转的时间戳
      rotationTimeout: null,         // 旋转完成的定时器
      ROTATION_DEGREES: 360,         // 旋转一周的角度
      ROTATION_SPEED: 10           // 旋转速度（度/秒）
    };
  },
  computed: {
    /**
     * 漫游进度百分比
     */
    roamingProgress() {
      if (this.roamingSceneIds.length === 0) return 0;
      return Math.round((this.currentRoamingIndex / this.roamingSceneIds.length) * 100);
    },
    /**
     * 是否是最后一个场景
     */
    isLastScene() {
      return this.currentRoamingIndex >= this.roamingSceneIds.length - 1;
    },
    /**
     * 旋转一周所需时间（毫秒）
     */
    rotationDuration() {
      // 360度 / 旋转速度(度/秒) = 秒数，再转换为毫秒
      return (this.ROTATION_DEGREES / this.ROTATION_SPEED) * 1000;
    }
  },
  mounted() {
    // 获取所有场景列表
    this.fetchSceneList();
  },
  beforeDestroy() {
    // 组件销毁时清理定时器
    this.clearRotationTimer();
  },
  methods: {
    /**
     * 获取所有场景列表
     */
    async fetchSceneList() {
      this.sceneListLoading = true;
      try {
        const res = await panoramaApi.getList();
        if (res.success) {
          this.sceneList = res.data;
        }
      } catch (error) {
        console.error('获取场景列表失败:', error);
      } finally {
        this.sceneListLoading = false;
      }
    },

    /**
     * 全景图加载完成
     */
    onPanoramaLoaded(panorama) {
      this.currentPanorama = panorama;
      // 同步更新下拉框选中项
      this.selectedSceneId = panorama.id;

      // 如果正在漫游，开始旋转检测
      if (this.isRoaming) {
        this.startRotationDetection();
      }
    },

    /**
     * 场景切换处理
     * @param {number} sceneId - 选中的场景 ID
     */
    onSceneChange(sceneId) {
      if (sceneId && this.$refs.viewer) {
        this.$refs.viewer.loadPanorama(sceneId);
      }
    },

    /**
     * 开始漫游
     */
    startRoaming() {
      if (this.roamingSceneIds.length === 0) {
        this.$message.warning('请至少选择一个场景');
        return;
      }

      this.isRoaming = true;
      this.currentRoamingIndex = 0;
      this.roamingPopoverVisible = false;

      // 设置自动旋转速度（负值表示顺时针）
      this.autoRotateSpeed = -this.ROTATION_SPEED;

      // 加载第一个场景
      this.loadRoamingScene(0);
    },

    /**
     * 停止漫游
     */
    stopRoaming() {
      this.isRoaming = false;
      this.autoRotateSpeed = false;
      this.clearRotationTimer();
      this.$message.info('漫游已停止');
    },

    /**
     * 加载漫游场景
     * @param {number} index - 场景索引
     */
    loadRoamingScene(index) {
      this.currentRoamingIndex = index;
      const sceneId = this.roamingSceneIds[index];

      if (this.$refs.viewer) {
        this.$refs.viewer.loadPanorama(sceneId);
      }
    },

    /**
     * 开始旋转计时
     * 基于时间检测，旋转一周后自动切换场景
     */
    startRotationDetection() {
      // 清理之前的定时器
      this.clearRotationTimer();

      // 记录开始时间
      this.rotationStartTime = Date.now();

      // 设置定时器，旋转一周后触发
      this.rotationTimeout = setTimeout(() => {
        this.onRotationComplete();
      }, this.rotationDuration);
    },

    /**
     * 跳转到下一个场景
     */
    goToNextScene() {
      if (this.isLastScene) return;

      // 清除当前定时器
      this.clearRotationTimer();

      // 切换到下一个场景
      this.currentRoamingIndex++;
      this.loadRoamingScene(this.currentRoamingIndex);
    },

    /**
     * 旋转完成处理
     */
    onRotationComplete() {
      this.clearRotationTimer();

      if (this.isLastScene) {
        // 最后一个场景，保持旋转状态，提示完成
        this.$message.success('已完成所有场景漫游，最后场景持续旋转中');
      } else {
        // 切换到下一个场景
        this.currentRoamingIndex++;
        this.loadRoamingScene(this.currentRoamingIndex);
      }
    },

    /**
     * 清理旋转定时器
     */
    clearRotationTimer() {
      if (this.rotationTimeout) {
        clearTimeout(this.rotationTimeout);
        this.rotationTimeout = null;
      }
      this.rotationStartTime = 0;
    },

    /**
     * 漫游进度格式化
     */
    roamingProgressFormat(percentage) {
      return `${this.currentRoamingIndex}/${this.roamingSceneIds.length}`;
    }
  }
};
</script>

<style scoped>
.preview-page {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #1a1a1a;
}

.preview-header {
  height: 60px;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
  position: relative;
  z-index: 10;
}

.logo {
  color: #fff;
  font-size: 20px;
  font-weight: 500;
  margin: 0;
}

.header-nav {
  display: flex;
  align-items: center;
  gap: 20px;
}

.scene-select {
  width: 200px;
}

/* 下拉框深色主题样式 */
.scene-select >>> .el-input__inner {
  background-color: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.3);
  color: #fff;
}

.scene-select >>> .el-input__inner::placeholder {
  color: rgba(255, 255, 255, 0.6);
}

.scene-select >>> .el-select__caret {
  color: #fff;
}

.preview-content {
  flex: 1;
  position: relative;
}

.scene-info {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.7);
  padding: 15px 25px;
  border-radius: 8px;
  text-align: center;
  z-index: 10;
  max-width: 400px;
}

.scene-title {
  color: #fff;
  font-size: 18px;
  font-weight: 500;
  margin-bottom: 5px;
}

.scene-desc {
  color: #ccc;
  font-size: 14px;
}

/* 漫游徽章 */
.roaming-badge {
  display: inline-block;
  background: #67C23A;
  color: #fff;
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 10px;
  margin-left: 10px;
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

/* 漫游进度条 */
.roaming-progress {
  margin-top: 10px;
}

/* 漫游控制面板 */
.roaming-panel {
  position: absolute;
  bottom: 20px;
  left: 20px;
  z-index: 10;
}

/* 漫游控制按钮组 */
.roaming-controls {
  position: absolute;
  bottom: 20px;
  left: 20px;
  z-index: 10;
  display: flex;
  gap: 10px;
}

/* 漫游配置弹窗 */
.roaming-config h4 {
  margin: 0 0 10px 0;
  font-size: 16px;
  color: #303133;
}

.roaming-tip {
  margin: 0 0 15px 0;
  font-size: 13px;
  color: #909399;
}

.roaming-scene-select {
  width: 100%;
  margin-bottom: 15px;
}

.roaming-config-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.legend {
  position: absolute;
  bottom: 20px;
  right: 20px;
  background: rgba(0, 0, 0, 0.7);
  padding: 15px;
  border-radius: 8px;
  z-index: 10;
}

.legend-item {
  display: flex;
  align-items: center;
  color: #fff;
  font-size: 14px;
  margin-bottom: 10px;
}

.legend-item:last-child {
  margin-bottom: 0;
}

.marker-icon {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  margin-right: 10px;
}

.marker-icon.normal {
  background-color: #409EFF;
  border: 2px solid #fff;
}

.marker-icon.navigation {
  background-color: #67C23A;
  border: 2px solid #fff;
  position: relative;
}

.marker-icon.navigation::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) rotate(45deg);
  width: 0;
  height: 0;
  border-left: 5px solid transparent;
  border-right: 5px solid transparent;
  border-bottom: 8px solid #fff;
}

/* 移动端适配 */
@media (max-width: 768px) {
  .scene-info {
    left: 10px;
    right: 10px;
    transform: none;
    max-width: none;
  }

  .legend {
    right: 10px;
    bottom: 100px;
  }
}
</style>
