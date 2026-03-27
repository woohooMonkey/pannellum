<template>
  <div class="preview-page">
    <!-- 顶部导航栏 -->
    <header class="preview-header">
      <h1 class="logo">全景图预览</h1>
      <nav class="header-nav">
        <!-- AI 导航输入 -->
        <div class="ai-nav-wrapper">
          <el-input
            v-model="aiInputText"
            placeholder="输入目的地，如：去大厅"
            class="ai-nav-input"
            @keyup.enter.native="handleAiNavigate"
            :disabled="aiLoading || isRoaming"
            clearable
          >
            <el-button
              slot="append"
              icon="el-icon-position"
              @click="handleAiNavigate"
              :loading="aiLoading"
              :disabled="!aiInputText.trim() || isRoaming"
            >
              {{ aiLoading ? '处理中' : '导航' }}
            </el-button>
          </el-input>
        </div>
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

    <!-- AI 响应弹窗 -->
    <el-dialog
      :visible.sync="aiResponseDialogVisible"
      title="AI 导航提示"
      width="480px"
      center
      custom-class="ai-response-dialog"
      :close-on-click-modal="true"
    >
      <div class="ai-response-content">
        <p class="ai-message">{{ aiResponseMessage }}</p>

        <!-- 场景-标记点层级展示 -->
        <div class="scene-marker-list" v-if="aiSceneMarkerData.length > 0">
          <p class="list-title">可用场景和标记点：</p>
          <div
            v-for="scene in aiSceneMarkerData"
            :key="scene.id"
            class="scene-item"
            :class="{ 'current-scene': isCurrentScene(scene.id) }"
          >
            <!-- 场景行 -->
            <div
              class="scene-row"
              :class="{ disabled: isCurrentScene(scene.id) }"
              @click="handleSceneClick(scene)"
            >
              <span class="scene-name">
                <i class="el-icon-location" v-if="scene.type === 'main'"></i>
                {{ scene.name }}
                <el-tag size="mini" v-if="scene.type === 'main'" type="danger">主</el-tag>
                <el-tag size="mini" v-if="isCurrentScene(scene.id)" type="info">当前</el-tag>
              </span>
              <span class="marker-count">{{ scene.markers.length }} 个标记点</span>
            </div>
            <!-- 标记点列表 -->
            <div class="marker-list" v-if="scene.markers.length > 0">
              <span
                v-for="marker in scene.markers"
                :key="marker.id"
                class="marker-tag"
                :class="{ disabled: isCurrentScene(scene.id) }"
                @click="handleMarkerClick(scene, marker)"
              >
                {{ marker.title }}
              </span>
            </div>
          </div>
        </div>
      </div>
      <span slot="footer" class="dialog-footer">
        <el-button @click="aiResponseDialogVisible = false">关闭</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
import PanoramaViewer from '@/components/PanoramaViewer.vue';
import { panoramaApi, aiApi } from '@/api';
import SafeExecutor from '@/utils/safeExecutor';
import { toolDescriptions, isValidTool } from '@/generated/tools';

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

      // AI 导航相关
      aiInputText: '',         // AI 导航输入文本
      aiLoading: false,        // AI 处理中状态

      // AI 文本响应相关
      aiResponseDialogVisible: false,  // AI 文本响应弹窗
      aiResponseMessage: '',       // AI 文本消息
      aiSceneMarkerData: [],       // AI 场景-标记点关联数据

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
  created() {
    // 注册工具到安全执行器
    this.registerTools();
  },
  mounted() {
    // 获取所有场景列表
    this.fetchSceneList();
    // 打印已注册的工具（调试用）
    console.log('[Preview] 已注册工具:', SafeExecutor.getMethodNames());
  },
  beforeDestroy() {
    // 组件销毁时清理定时器
    this.clearRotationTimer();
    // 清理注册的工具
    SafeExecutor.clear();
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
    },

    // ==================== AI 导航相关方法 ====================

    /**
     * 注册工具到安全执行器
     * 将 Vue 组件的方法注册为工具处理器，实现工具调用与业务逻辑的解耦
     */
    registerTools() {
      // 注册场景导航工具
      SafeExecutor.register('navigate_to_scene', (params) => {
        this.navigateToScene(params.sceneId, params.sceneName);
      }, toolDescriptions.find(t => t.name === 'navigate_to_scene'));

      // 注册标记点导航工具
      SafeExecutor.register('navigate_to_marker', async (params) => {
        await this.navigateToMarker(
          params.markerId,
          params.markerTitle,
          params.sceneId,
          params.sceneName
        );
      }, toolDescriptions.find(t => t.name === 'navigate_to_marker'));

      // 注册场景漫游工具
      SafeExecutor.register('start_scene_tour', (params) => {
        this.startAiSceneTour(params.sceneIds, params.sceneNames);
      }, toolDescriptions.find(t => t.name === 'start_scene_tour'));

      // 注册文本响应工具
      SafeExecutor.register('text_response', (params) => {
        this.showAiTextResponse(
          params.message,
          params.sceneMarkerData
        );
      }, toolDescriptions.find(t => t.name === 'text_response'));

      console.log('[Preview] 工具注册完成，共注册', SafeExecutor.getMethodNames().length, '个工具');
    },

    /**
     * 处理 AI 导航请求
     */
    async handleAiNavigate() {
      const input = this.aiInputText.trim();
      if (!input) {
        this.$message.warning('请输入目的地');
        return;
      }

      this.aiLoading = true;
      try {
        const res = await aiApi.navigate(input);

        if (!res.success) {
          this.$message.error(res.message || '导航失败');
          // 如果有可用场景列表，提示用户
          if (res.availableScenes && res.availableScenes.length > 0) {
            this.$notify({
              title: '可用场景',
              message: res.availableScenes.join('、'),
              type: 'info',
              duration: 5000
            });
          }
          return;
        }

        const { action, params } = res.data;

        // 使用白名单校验工具名称
        if (!isValidTool(action)) {
          console.error(`[Preview] 拒绝执行未知工具: ${action}`);
          this.$message.error(`无效的操作: ${action}`);
          return;
        }

        // 使用 SafeExecutor 安全执行工具
        const result = await SafeExecutor.executeAsync(action, params);

        if (!result.success) {
          console.error(`[Preview] 工具执行失败:`, result.error);
          this.$message.error(`操作执行失败: ${result.error}`);
        } else {
          // 清空输入
          this.aiInputText = '';
        }
      } catch (error) {
        console.error('AI 导航请求失败:', error);
        this.$message.error(error.message || '导航请求失败，请稍后重试');
      } finally {
        this.aiLoading = false;
      }
    },

    /**
     * 导航到指定场景
     * @param {number} sceneId - 场景 ID
     * @param {string} sceneName - 场景名称
     */
    navigateToScene(sceneId, sceneName) {
      if (this.$refs.viewer) {
        this.$refs.viewer.loadPanorama(sceneId);
        this.$message.success(`正在导航到：${sceneName}`);
        this.aiInputText = '';
      }
    },

    /**
     * 导航到指定标记点
     * @param {number} markerId - 标记点 ID
     * @param {string} markerTitle - 标记点标题
     * @param {number} sceneId - 场景 ID
     * @param {string} sceneName - 场景名称
     */
    async navigateToMarker(markerId, markerTitle, sceneId, sceneName) {
      if (!this.$refs.viewer) return;

      try {
        // 获取标记点详情以获取 pitch 和 yaw
        const { markerApi } = await import('@/api');
        const res = await markerApi.getById(markerId);

        if (res.success && res.data) {
          const marker = res.data;
          // 加载场景并指向标记点位置
          this.$refs.viewer.loadPanorama(sceneId, {
            pitch: marker.pitch,
            yaw: marker.yaw
          });
          this.$message.success(`正在导航到：${markerTitle}（位于${sceneName}）`);
          this.aiInputText = '';
        } else {
          // 如果获取标记点失败，仍然跳转到场景
          this.$refs.viewer.loadPanorama(sceneId);
          this.$message.success(`正在导航到：${sceneName}`);
          this.aiInputText = '';
        }
      } catch (error) {
        console.error('获取标记点信息失败:', error);
        // 如果获取标记点失败，仍然跳转到场景
        this.$refs.viewer.loadPanorama(sceneId);
        this.$message.success(`正在导航到：${sceneName}`);
        this.aiInputText = '';
      }
    },

    /**
     * 开始 AI 推荐的场景漫游
     * @param {number[]} sceneIds - 场景 ID 列表
     * @param {string[]} sceneNames - 场景名称列表
     */
    startAiSceneTour(sceneIds, sceneNames) {
      if (sceneIds.length === 0) {
        this.$message.warning('没有可漫游的场景');
        return;
      }

      // 设置漫游场景
      this.roamingSceneIds = sceneIds;
      this.isRoaming = true;
      this.currentRoamingIndex = 0;
      this.autoRotateSpeed = -this.ROTATION_SPEED;

      // 加载第一个场景
      this.loadRoamingScene(0);

      this.$message.success(`开始漫游：${sceneNames.join(' → ')}`);
      this.aiInputText = '';
    },

    /**
     * 显示 AI 文本响应弹窗
     * @param {string} message - AI 消息
     * @param {Array} sceneMarkerData - 场景-标记点关联数据
     */
    showAiTextResponse(message, sceneMarkerData) {
      this.aiResponseMessage = message;
      this.aiSceneMarkerData = sceneMarkerData || [];
      this.aiResponseDialogVisible = true;
    },

    /**
     * 判断是否为当前场景
     * @param {number} sceneId - 场景ID
     * @returns {boolean}
     */
    isCurrentScene(sceneId) {
      return this.currentPanorama && this.currentPanorama.id === sceneId;
    },

    /**
     * 处理场景点击
     * @param {Object} scene - 场景数据
     */
    handleSceneClick(scene) {
      // 当前场景不跳转
      if (this.isCurrentScene(scene.id)) {
        return;
      }
      this.aiResponseDialogVisible = false;
      this.navigateToScene(scene.id, scene.name);
    },

    /**
     * 处理标记点点击
     * @param {Object} scene - 场景数据
     * @param {Object} marker - 标记点数据
     */
    handleMarkerClick(scene, marker) {
      // 如果是当前场景，重新加载当前场景并指向标记点
      if (this.isCurrentScene(scene.id)) {
        this.$refs.viewer.loadPanorama(scene.id, {
          pitch: marker.pitch,
          yaw: marker.yaw
        });
        this.$message.success(`已指向：${marker.title}`);
      } else {
        // 跳转到标记点所在场景并指向
        this.aiResponseDialogVisible = false;
        this.navigateToMarker(marker.id, marker.title, scene.id, scene.name);
      }
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

/* AI 导航输入框样式 */
.ai-nav-wrapper {
  display: flex;
  align-items: center;
}

.ai-nav-input {
  width: 320px;
}

.ai-nav-input >>> .el-input__inner {
  background-color: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.3);
  color: #fff;
}

.ai-nav-input >>> .el-input__inner::placeholder {
  color: rgba(255, 255, 255, 0.6);
}

.ai-nav-input >>> .el-input-group__append {
  background-color: rgba(255, 255, 255, 0.15);
  border-color: rgba(255, 255, 255, 0.3);
}

.ai-nav-input >>> .el-input-group__append .el-button {
  color: #fff;
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

/* AI 响应弹窗样式 */
.ai-response-content {
  text-align: center;
}

.ai-message {
  color: #606266;
  font-size: 14px;
  line-height: 1.6;
  margin-bottom: 20px;
  white-space: pre-wrap;
}

/* 场景-标记点列表样式 */
.scene-marker-list {
  text-align: left;
  max-height: 400px;
  overflow-y: auto;
  padding: 10px;
  background: #f5f7fa;
  border-radius: 8px;
}

.list-title {
  color: #909399;
  font-size: 13px;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #e4e7ed;
}

.scene-item {
  margin-bottom: 12px;
  padding: 10px;
  background: #fff;
  border-radius: 6px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.scene-item.current-scene {
  opacity: 0.7;
}

.scene-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 8px;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.scene-row:hover:not(.disabled) {
  background-color: #ecf5ff;
}

.scene-row.disabled {
  cursor: default;
  color: #909399;
}

.scene-name {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
  display: flex;
  align-items: center;
  gap: 6px;
}

.scene-name i {
  color: #f56c6c;
}

.marker-count {
  font-size: 12px;
  color: #909399;
}

.marker-list {
  margin-top: 8px;
  padding-left: 20px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.marker-tag {
  display: inline-block;
  padding: 4px 10px;
  font-size: 12px;
  color: #409eff;
  background: #ecf5ff;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.marker-tag:hover:not(.disabled) {
  background: #409eff;
  color: #fff;
}

.marker-tag.disabled {
  color: #c0c4cc;
  background: #f4f4f5;
  cursor: default;
}
</style>
