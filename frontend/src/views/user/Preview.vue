<template>
  <div class="preview-page">
    <!-- 顶部导航栏 -->
    <header class="preview-header">
      <h1 class="page-title">全景图预览</h1>
    </header>

    <!-- 主要内容区域 -->
    <div class="main-container">
      <!-- 左侧全景图区域 -->
      <main class="preview-content">
        <panorama-viewer
          ref="viewer"
          :auto-rotate="autoRotateSpeed"
          @loaded="onPanoramaLoaded"
        />

        <!-- 当前场景信息 -->
        <div class="scene-info" v-if="currentPanorama">
          <div class="scene-title">
            {{ currentPanorama.name }}
            <span v-if="isRoaming" class="roaming-badge">漫游中</span>
            <el-tag size="mini" v-if="currentPanorama.type === 'main'" type="danger">主图</el-tag>
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
        <div class="legend" v-if="!isRoaming">
          <div class="legend-item">
            <span class="marker-icon normal"></span>
            <span>信息点</span>
          </div>
          <div class="legend-item">
            <span class="marker-icon navigation"></span>
            <span>导航点</span>
          </div>
        </div>
      </main>

      <!-- 右侧工具面板 -->
      <aside class="tools-panel">
        <div class="panel-section">
          <h3 class="section-title">AI 导航</h3>
          <el-input
            v-model="aiInputText"
            placeholder="输入目的地，如：去大厅"
            class="ai-input"
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

        <div class="panel-section">
          <h3 class="section-title">场景选择</h3>
          <el-select
            v-model="selectedSceneId"
            placeholder="选择场景"
            class="scene-select"
            @change="onSceneChange"
            :loading="sceneListLoading"
            :disabled="isRoaming"
          >
            <el-option
              v-for="scene in sortedScenes"
              :key="scene.id"
              :label="scene.name + (scene.type === 'main' ? ' (主图)' : '')"
              :value="scene.id"
            />
          </el-select>
        </div>

        <div class="panel-section">
          <h3 class="section-title">功能</h3>
          <div class="function-buttons">
            <el-button
              type="primary"
              icon="el-icon-video-play"
              @click="roamingPopoverVisible = true"
              :disabled="isRoaming"
              class="function-btn"
            >
              漫游模式
            </el-button>
            <el-button
              type="primary"
              icon="el-icon-data-analysis"
              @click="goCompare"
              :disabled="isRoaming"
              class="function-btn"
            >
              版本对比
            </el-button>
            <el-link
              type="info"
              href="/admin/login"
              class="admin-link"
            >管理员登录</el-link>
          </div>
        </div>

        <div class="panel-section">
          <h3 class="section-title">系统信息</h3>
          <div class="system-info">
            <div class="info-item">
              <span class="info-label">场景总数：</span>
              <span class="info-value">{{ sceneList?.length || 0 }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">当前场景：</span>
              <span class="info-value">{{ currentPanorama?.name || '无' }}</span>
            </div>
            <div class="info-item" v-if="currentPanorama">
              <span class="info-label">标记点数量：</span>
              <span class="info-value">{{ currentPanorama.marker_count || 0 }}</span>
            </div>
          </div>
        </div>
      </aside>
    </div>

    <!-- 底部场景列表（居中显示） -->
    <section class="scene-list-container" v-if="sceneList.length > 0">
      <h3 class="scene-list-title">场景列表</h3>
      <div class="scene-cards">
        <div
          v-for="scene in sortedScenes"
          :key="scene.id"
          class="scene-card"
          :class="{ 'current-scene': isCurrentScene(scene.id) }"
          @click="handleSceneCardClick(scene.id)"
        >
          <div class="scene-card-info">
            <h4 class="scene-card-name">
              {{ scene.name }}
              <el-tag size="mini" v-if="scene.type === 'main'" type="danger">主</el-tag>
            </h4>
            <p class="scene-card-desc" v-if="scene.description">{{ scene.description }}</p>
          </div>
          <div class="scene-card-actions">
            <span class="marker-count">{{ scene.marker_count || 0 }} 个标记点</span>
          </div>
        </div>
      </div>
    </section>

      <!-- 漫游配置弹窗 -->
      <el-dialog
        title="选择漫游场景"
        :visible.sync="roamingPopoverVisible"
        width="400px"
        :close-on-click-modal="true"
        custom-class="roaming-dialog"
      >
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
        <div class="roaming-dialog-footer">
          <el-button @click="roamingPopoverVisible = false">取消</el-button>
          <el-button
            type="primary"
            @click="startRoaming"
            :disabled="roamingSceneIds.length === 0"
          >
            开始漫游
          </el-button>
        </div>
      </el-dialog>

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
    </main>
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
     * 排序后的场景列表：主图排在第一个
     */
    sortedScenes() {
      if (!this.sceneList) return [];
      const mainScene = this.sceneList.find(s => s.type === 'main');
      const otherScenes = this.sceneList.filter(s => s.type !== 'main');
      return mainScene ? [mainScene, ...otherScenes] : [...otherScenes];
    },

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
     * 处理场景卡片点击
     * @param {number} sceneId - 场景ID
     */
    handleSceneCardClick(sceneId) {
      if (this.isCurrentScene(sceneId)) {
        return; // 当前场景不重复加载
      }
      if (this.$refs.viewer) {
        this.$refs.viewer.loadPanorama(sceneId);
        this.$message.success(`切换到：${this.sceneList.find(s => s.id === sceneId)?.name}`);
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
    },

    /**
     * 跳转到版本对比页面
     */
    goCompare() {
      this.$router.push('/compare');
    }
  }
};
</script>

<style scoped>
.preview-page {
  height: 100vh;
  background: #f5f7fa;
  display: flex;
  flex-direction: column;
}

/* 顶部导航栏 */
.preview-header {
  background: #fff;
  padding: 10px 0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  z-index: 100;
  height: 50px;
}

.page-title {
  text-align: center;
  font-size: 24px;
  color: #2c3e50;
  margin: 0;
  font-weight: 500;
}

/* 主要内容区域 */
.main-container {
  position: relative;
  height: 100vh; /* 使用整个视口高度 */
}

/* 左侧全景图区域 */
.preview-content {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

/* 右侧工具面板 */
.tools-panel {
  position: absolute;
  top: 20px;
  right: 20px;
  width: 320px;
  max-height: calc(100vh - 120px); /* 减去顶部header和底部空间 */
  background: rgba(255, 255, 255, 0.95);
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  padding: 24px;
  overflow-y: auto;
  z-index: 50;
  backdrop-filter: blur(10px);
}

.panel-section {
  margin-bottom: 28px;
}

.panel-section:last-child {
  margin-bottom: 0;
}

.section-title {
  font-size: 16px;
  color: #2c3e50;
  margin: 0 0 16px 0;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 8px;
}

.section-title::before {
  content: '';
  width: 3px;
  height: 16px;
  background: #409eff;
  border-radius: 2px;
}

/* AI 输入框样式 */
.ai-input {
  margin-bottom: 0;
}

.ai-input >>> .el-input__inner {
  height: 40px;
}

.ai-input >>> .el-input__inner::placeholder {
  color: #c0c4cc;
}

/* 下拉框样式 */
.scene-select {
  width: 100%;
}

.scene-select >>> .el-input__inner {
  height: 40px;
}

/* 功能按钮组 */
.function-buttons {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.function-btn {
  height: 40px;
  font-size: 14px;
}

.admin-link {
  font-size: 14px;
  text-align: center;
  display: block;
  padding: 0;
}

/* 当前场景信息 */
.scene-info {
  position: absolute;
  bottom: 160px; /* 为底部场景列表留出空间 */
  left: 50%;
  transform: translateX(-50%);
  background: rgba(255, 255, 255, 0.95);
  padding: 16px 24px;
  border-radius: 8px;
  text-align: center;
  z-index: 10;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(10px);
  max-width: 400px;
}

.scene-title {
  color: #2c3e50;
  font-size: 18px;
  font-weight: 500;
  margin-bottom: 4px;
}

.scene-desc {
  color: #606266;
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

/* 图例说明 */
.legend {
  position: absolute;
  bottom: 180px;
  right: 20px;
  background: rgba(255, 255, 255, 0.95);
  padding: 12px;
  border-radius: 8px;
  z-index: 10;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(10px);
}

.legend-item {
  display: flex;
  align-items: center;
  color: #2c3e50;
  font-size: 14px;
  margin-bottom: 8px;
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

/* 漫游控制按钮 */
.roaming-controls {
  position: absolute;
  bottom: 180px;
  left: 20px;
  z-index: 10;
  display: flex;
  gap: 10px;
}

/* 系统信息 */
.system-info {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #f5f7fa;
  border-radius: 8px;
}

.info-label {
  color: #606266;
  font-size: 14px;
}

.info-value {
  color: #2c3e50;
  font-weight: 500;
  font-size: 14px;
}

/* 底部场景列表 */
.scene-list-container {
  background: rgba(0, 0, 0, 0.85);
  padding: 20px;
  box-shadow: 0 -2px 12px rgba(0, 0, 0, 0.2);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 40;
  backdrop-filter: blur(10px);
  max-height: 200px; /* 限制高度，避免覆盖过多图片 */
  overflow-y: auto;
}

.scene-list-title {
  text-align: center;
  color: #2c3e50;
  font-size: 20px;
  margin: 0 0 24px 0;
  font-weight: 500;
}

.scene-cards {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  gap: 20px;
  overflow-x: auto;
  padding-bottom: 10px;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.3) transparent;
}

.scene-cards::-webkit-scrollbar {
  height: 6px;
}

.scene-cards::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
}

.scene-cards::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.3);
  border-radius: 3px;
}

.scene-cards::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.5);
}

.scene-card {
  min-width: 280px;
  background: rgba(255, 255, 255, 0.1);
  border: 2px solid transparent;
  border-radius: 8px;
  padding: 15px;
  cursor: pointer;
  transition: all 0.3s ease;
  backdrop-filter: blur(5px);
}

.scene-card:hover {
  background: rgba(255, 255, 255, 0.15);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.scene-card.current-scene {
  border-color: #409EFF;
  background: rgba(64, 158, 255, 0.2);
  box-shadow: 0 0 20px rgba(64, 158, 255, 0.3);
}

.scene-card-info {
  margin-bottom: 10px;
}

.scene-card-name {
  color: #fff;
  font-size: 16px;
  font-weight: 500;
  margin: 0 0 5px 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.scene-card-desc {
  color: #ccc;
  font-size: 14px;
  margin: 0;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.scene-card-actions {
  display: flex;
  justify-content: flex-end;
}

.marker-count {
  font-size: 13px;
  color: #909399;
}

/* 漫游配置弹窗 */
.roaming-dialog >>> .el-dialog__body {
  padding: 20px;
}

/* AI 响应弹窗 */
.ai-dialog >>> .el-dialog__body {
  padding: 30px;
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .tools-panel {
    width: 280px;
    right: 10px;
  }
}

@media (max-width: 768px) {
  .tools-panel {
    position: static;
    width: 100%;
    height: auto;
    margin: 10px;
  }

  .main-container {
    height: calc(100vh - 60px);
    display: flex;
    flex-direction: column;
  }

  .preview-content {
    height: calc(100% - 200px);
  }

  .scene-cards {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .scene-info {
    bottom: 140px;
    left: 10px;
    right: 10px;
    transform: none;
    max-width: none;
  }

  .legend {
    bottom: 160px;
    right: 10px;
  }

  .roaming-controls {
    bottom: 160px;
    left: 10px;
  }
}

@media (max-width: 768px) {
  .main-container {
    padding: 10px;
  }

  .scene-cards {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .scene-list-container {
    padding: 20px 10px;
  }

  .scene-info {
    bottom: 140px;
    left: 10px;
    right: 10px;
    transform: none;
    max-width: none;
  }

  .legend {
    bottom: 120px;
    right: 10px;
  }

  .roaming-controls {
    bottom: 120px;
    left: 10px;
  }
}
</style>