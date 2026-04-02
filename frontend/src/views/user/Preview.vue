<template>
  <div class="preview-page">
    <!-- 主要内容区域 -->
    <div class="main-container">
      <!-- 左侧全景图区域 -->
      <main class="preview-content">
        <panorama-viewer
          ref="viewer"
          :auto-rotate="autoRotateSpeed"
          @loaded="onPanoramaLoaded"
        />

        <!-- 顶部AI导航搜索区域 -->
        <div class="top-ai-search" v-if="showAiSearch && !isRoaming && !isNavigating">
          <el-input
            v-model="aiInputText"
            placeholder="输入目的地，如：去办公室"
            class="ai-search-input"
            @keyup.enter.native="handleAiNavigate"
            :disabled="aiLoading"
            clearable
          >
            <el-button
              slot="append"
              icon="el-icon-position"
              @click="handleAiNavigate"
              :loading="aiLoading"
            >
              {{ aiLoading ? '处理中' : '智能导航' }}
            </el-button>
          </el-input>
        </div>

        <!-- 导航进度条 -->
        <div class="navigation-progress" v-if="isNavigating">
          <div class="nav-progress-info">
            <span class="nav-step-text">导航中 {{ navProgressText }}</span>
            <el-button type="text" size="mini" @click="cancelNavigation" class="nav-cancel-btn">
              取消
            </el-button>
          </div>
          <el-progress :percentage="navProgress" :stroke-width="4" :show-text="false" color="#409EFF" />
        </div>

        <!-- 当前场景信息 -->
        <div class="scene-info" v-if="showSceneInfo && currentPanorama">
          <div class="scene-title">
            {{ currentPanorama.name }}
            <span v-if="isRoaming" class="roaming-badge">漫游中</span>
            <el-tag size="mini" v-if="currentPanorama.type === 'main'" type="danger">主图</el-tag>
          </div>
          <div class="scene-desc" v-if="currentPanorama.description">{{ currentPanorama.description }}</div>
         <!--  <div class="marker-count-info">
            标记点数量：{{ currentPanorama.marker_count || 0 }}
          </div> -->
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

        <!-- 场景列表切换按钮 -->
        <div class="tool-item scene-toggle-btn" v-if="sceneList.length > 0 && !isRoaming" @click="toggleSceneList">
          <div class="tool-icon-wrapper">
            <svg class="tool-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path v-if="!showSceneList" d="M3 12h18M3 6h18M3 18h18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path v-else d="M6 18L18 6M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <div class="tool-title">场景选择</div>
        </div>
      </main>

      <!-- 右侧工具栏 -->
      <aside class="tools-sidebar">
        <div class="tool-list">
          <!-- 全屏按钮 -->
          <div class="tool-item" @click="toggleFullscreen">
            <div class="tool-icon-wrapper">
              <svg class="tool-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
            <div class="tool-title">全屏</div>
          </div>

          <!-- 漫游按钮 -->
          <div class="tool-item" @click="roamingPopoverVisible = true" :disabled="isRoaming">
            <div class="tool-icon-wrapper">
              <svg class="tool-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <polyline points="3.27 6.96 12 12.01 20.73 6.96" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <line x1="12" y1="22.08" x2="12" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
            </div>
            <div class="tool-title">漫游</div>
          </div>

          <!-- 版本对比按钮 -->
          <div class="tool-item" @click="goCompare" :disabled="isRoaming">
            <div class="tool-icon-wrapper">
              <svg class="tool-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M3 12h.01M21 12h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
            <div class="tool-title">对比</div>
          </div>

          <!-- 管理员登录按钮 -->
          <div class="tool-item admin-login" @click="goToAdmin">
            <div class="tool-icon-wrapper">
              <svg class="tool-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <circle cx="12" cy="7" r="4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
            <div class="tool-title">管理员</div>
          </div>

          <!-- 查看详情按钮 -->
          <div class="tool-item" @click="toggleSceneInfo" :class="{ 'active': showSceneInfo }">
            <div class="tool-icon-wrapper">
              <svg class="tool-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <line x1="12" y1="16" x2="12" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <line x1="12" y1="8" x2="12.01" y2="8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
            <div class="tool-title">详情</div>
          </div>

          <!-- 智能导航按钮 -->
          <div class="tool-item" @click="toggleAiSearch" :class="{ 'active': showAiSearch }">
            <div class="tool-icon-wrapper">
              <i class="el-icon-position tool-icon-el"></i>
            </div>
            <div class="tool-title">智能导航</div>
          </div>
        </div>

          </aside>
    </div>

    <!-- 底部场景列表 -->
    <section class="scene-list-container" v-if="showSceneList && sceneList.length > 0">
      <div class="scene-cards">
        <div
          v-for="scene in sortedScenes"
          :key="scene.id"
          class="scene-card"
          :class="{ 'current-scene': isCurrentScene(scene.id) }"
          @click="handleSceneCardClick(scene.id)"
        >
          <div class="scene-card-image">
            <img
              :src="getPanoramaImageUrl(scene)"
              :alt="scene.name"
              @error="handleImageError"
              @load="handleImageLoad"
            />
            <div class="scene-card-overlay">
              <div class="scene-card-info">
                <span class="scene-card-name">
                  {{ scene.name }}
                  <el-tag size="mini" v-if="scene.type === 'main'" type="danger" style="margin-left: 4px;;">主</el-tag>
                </span>
              </div>
            </div>
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
          style="margin: 10px 0;"
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
        custom-class="ai-dialog"
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
      ROTATION_SPEED: 10,           // 旋转速度（度/秒）
      showSceneList: false,          // 是否显示场景列表
      isFullscreen: false,          // 是否全屏
      showSceneInfo: true,          // 是否显示场景信息
      showAiSearch: true,           // 是否显示AI导航搜索框

      // 路线动画导航相关
      isNavigating: false,           // 是否正在路线导航中
      _navigationCancelled: false,   // 导航取消标志
      navCurrentStep: 0,            // 当前导航步骤
      navTotalSteps: 0,             // 导航总步骤
      _delayTimer: null,            // 延时定时器
      _delayResolve: null           // 延时Promise的resolve函数
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
      return Math.round(((this.currentRoamingIndex + 1) / this.roamingSceneIds.length) * 100);
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
    },

    /**
     * 路线导航进度百分比
     */
    navProgress() {
      if (this.navTotalSteps === 0) return 0;
      return Math.round((this.navCurrentStep / this.navTotalSteps) * 100);
    },

    /**
     * 路线导航进度文本
     */
    navProgressText() {
      return `${this.navCurrentStep}/${this.navTotalSteps}`;
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
    if (this._delayTimer) {
      clearTimeout(this._delayTimer);
    }
    // 取消正在进行的导航
    this._navigationCancelled = true;
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
      return `${this.currentRoamingIndex + 1}/${this.roamingSceneIds.length}`;
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
        const res = await aiApi.navigate(
          input,
          this.currentPanorama?.id,
          this.currentPanorama?.name
        );

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

        // 清空输入（在动画开始前清空，避免长时间等待）
        this.aiInputText = '';

        // 使用 SafeExecutor 安全执行工具
        const result = await SafeExecutor.executeAsync(action, params);

        if (!result.success) {
          console.error(`[Preview] 工具执行失败:`, result.error);
          this.$message.error(`操作执行失败: ${result.error}`);
        }
      } catch (error) {
        console.error('AI 导航请求失败:', error);
        this.$message.error(error.message || '导航请求失败，请稍后重试');
      } finally {
        this.aiLoading = false;
      }
    },

    /**
     * 导航到指定场景（带路线动画）
     * @param {number} sceneId - 场景 ID
     * @param {string} sceneName - 场景名称
     */
    async navigateToScene(sceneId, sceneName) {
      if (!this.$refs.viewer) return;

      const currentSceneId = this.currentPanorama?.id;

      // 已在目标场景
      if (currentSceneId === sceneId) {
        this.$message.info('您已在目标场景中');
        return;
      }

      try {
        const res = await aiApi.getRoute(currentSceneId, sceneId);

        if (res.success && res.data.route && res.data.route.length > 0) {
          this.$message.success(`正在导航到：${sceneName}`);
          await this.executeRoute(res.data.route);
        } else {
          // 无路径，直接跳转
          this.$refs.viewer.loadPanorama(sceneId);
          this.$message.success(`正在导航到：${sceneName}`);
        }
      } catch (error) {
        console.error('路线计算失败，直接跳转:', error);
        this.$refs.viewer.loadPanorama(sceneId);
        this.$message.success(`正在导航到：${sceneName}`);
      }
    },

    /**
     * 导航到指定标记点（带路线动画）
     * @param {number} markerId - 标记点 ID
     * @param {string} markerTitle - 标记点标题
     * @param {number} sceneId - 场景 ID
     * @param {string} sceneName - 场景名称
     */
    async navigateToMarker(markerId, markerTitle, sceneId, sceneName) {
      if (!this.$refs.viewer) return;

      const currentSceneId = this.currentPanorama?.id;

      try {
        const res = await aiApi.getRoute(currentSceneId, sceneId, markerId);

        if (res.success && res.data.route && res.data.route.length > 0) {
          this.$message.success(`正在导航到：${markerTitle}（${sceneName}）`);
          await this.executeRoute(res.data.route);
        } else if (res.success && res.data.sameScene) {
          // 同场景内，路线中只包含标记点
          if (res.data.route.length > 0) {
            await this.executeRoute(res.data.route);
            this.$message.success(`已指向：${markerTitle}`);
          }
        } else {
          // 无路径，直接跳转并指向标记点
          const { markerApi } = await import('@/api');
          const markerRes = await markerApi.getById(markerId);
          if (markerRes.success && markerRes.data) {
            this.$refs.viewer.loadPanorama(sceneId, {
              pitch: markerRes.data.pitch,
              yaw: markerRes.data.yaw
            });
          } else {
            this.$refs.viewer.loadPanorama(sceneId);
          }
          this.$message.success(`正在导航到：${markerTitle}（${sceneName}）`);
        }
      } catch (error) {
        console.error('路线计算失败，直接跳转:', error);
        this.$refs.viewer.loadPanorama(sceneId);
        this.$message.success(`正在导航到：${markerTitle}`);
      }
    },

    /**
     * 执行路线动画（核心方法）
     * 按顺序处理每个路点，实现真实的导航移动效果
     * @param {Array} route - 路线点列表
     *
     * 路点类型处理逻辑：
     * - navigation: 相机转向导航点 → 停顿 → 缩放 → 停顿 → 加载目标场景
     * - scene: 加载场景 → 等待
     * - marker: 相机转向标记点
     */
    async executeRoute(route) {
      if (!route || route.length === 0) return;

      this.isNavigating = true;
      this._navigationCancelled = false;
      this.navTotalSteps = route.length;
      this.navCurrentStep = 0;

      for (let i = 0; i < route.length; i++) {
        if (this._navigationCancelled) break;

        this.navCurrentStep = i + 1;
        const wp = route[i];
        const isLastWaypoint = i === route.length - 1;

        if (wp.type === 'navigation') {
          // 1. 相机转向导航点 (1.5s)
          await this.$refs.viewer.lookAt(wp.pitch, wp.yaw, 1500);
          if (this._navigationCancelled) break;

          // 2. 停顿让用户看清导航点
          await this.delay(1000);
          if (this._navigationCancelled) break;

          // 3. 缩放至导航点 (1.5s)
          await this.$refs.viewer.zoomTo(30, 1500);
          if (this._navigationCancelled) break;

          // 4. 停顿后准备进入下一场景
          await this.delay(1000);

        } else if (wp.type === 'scene') {
          // 如果是最终目的地场景，启用自动旋转
          if (isLastWaypoint) {
            this.autoRotateSpeed = -this.ROTATION_SPEED;
          }

          // 加载目标场景（等待完全加载）
          await this.$refs.viewer.loadPanoramaAsync(wp.sceneId);
          if (this._navigationCancelled) break;

          // 等待用户感受新场景
          await this.delay(1500);

        } else if (wp.type === 'marker') {
          // 1. 相机转向标记点 (1.5s)
          await this.$refs.viewer.lookAt(wp.pitch, wp.yaw, 1500);
          if (this._navigationCancelled) break;

          // 2. 停顿
          await this.delay(1000);
          if (this._navigationCancelled) break;

          // 3. 缩放至标记点 (1.5s)
          await this.$refs.viewer.zoomTo(30, 1500);
        }
      }

      this.isNavigating = false;
      this.navCurrentStep = 0;
      this.navTotalSteps = 0;
    },

    /**
     * 取消当前导航
     */
    cancelNavigation() {
      this._navigationCancelled = true;
      if (this._delayTimer) {
        clearTimeout(this._delayTimer);
        this._delayTimer = null;
      }
      if (this._delayResolve) {
        this._delayResolve();
        this._delayResolve = null;
      }
      this.autoRotateSpeed = false;
      this.isNavigating = false;
      this.navCurrentStep = 0;
      this.navTotalSteps = 0;
      this.$message.info('导航已取消');
    },

    /**
     * Promise 延时辅助方法
     * @param {number} ms - 延时毫秒数
     */
    delay(ms) {
      return new Promise(resolve => {
        this._delayResolve = resolve;
        this._delayTimer = setTimeout(() => {
          this._delayResolve = null;
          this._delayTimer = null;
          resolve();
        }, ms);
      });
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
    },

    /**
     * 处理图片加载错误
     * @param {Event} event - 图片错误事件
     */
    handleImageError(event) {
      // 图片加载失败时显示默认占位图
      event.target.src = 'data:image/svg+xml;charset=utf-8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100" height="100" fill="%23f0f0f0"/><text x="50" y="50" font-size="14" fill="%23999" text-anchor="middle" dy=".3em">图片加载失败</text></svg>';
    },

    /**
     * 处理图片加载成功
     * @param {Event} event - 图片加载事件
     */
    handleImageLoad(event) {
      // 图片加载成功时的处理
      event.target.classList.add('loaded');
    },

    /**
     * 获取全景图图片URL
     * @param {Object} scene - 场景数据
     * @returns {string} 图片URL
     */
    getPanoramaImageUrl(scene) {
      if (scene.file_path) {
        // scene.file_path 已经包含 /uploads 前缀
        return scene.file_path;
      }
      // 返回默认占位图
      return 'data:image/svg+xml;charset=utf-8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100" height="100" fill="%23f0f0f0"/><text x="50" y="50" font-size="14" fill="%23999" text-anchor="middle" dy=".3em">暂无图片</text></svg>';
    },

    /**
     * 切换全屏
     */
    toggleFullscreen() {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
        this.isFullscreen = true;
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen();
          this.isFullscreen = false;
        }
      }
    },

    /**
     * 跳转到管理员登录页面
     */
    goToAdmin() {
      window.open('/admin/login', '_blank');
    },

    /**
     * 切换场景信息显示
     */
    toggleSceneInfo() {
      this.showSceneInfo = !this.showSceneInfo;
    },

    /**
     * 切换场景列表显示状态
     */
    toggleSceneList() {
      this.showSceneList = !this.showSceneList;
    },

    /**
     * 切换AI导航搜索框显示
     */
    toggleAiSearch() {
      this.showAiSearch = !this.showAiSearch;
    }
  }
};
</script>
<style>
/* 隐藏 Pannellum 控制栏 */
.pnlm-controls-container {
  display: none !important;
}

</style>
<style scoped>
.preview-page {
  height: 100vh;
  background: #f5f7fa;
  display: flex;
  flex-direction: column;
}

/* 主要内容区域 */
.main-container {
  position: relative;
  height: 100vh;
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

/* 顶部AI导航搜索区域 */
.top-ai-search {
  position: absolute;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 60;
  background: rgba(0, 0, 0, 0.75);
  padding: 16px 24px;
  border-radius: 12px;
  backdrop-filter: blur(10px);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  width: 480px;
  max-width: calc(100% - 40px);
}

.ai-search-input {
  width: 100%;
}

.ai-search-input >>> .el-input__inner {
  height: 44px;
  background: rgba(255, 255, 255, 0.95);
  border: none;
  font-size: 15px;
}

.ai-search-input >>> .el-input__inner::placeholder {
  color: #909399;
}

.ai-search-input >>> .el-input-group__append {
  background: #409eff;
  border: none;
  padding: 0 20px;
}

.ai-search-input >>> .el-input-group__append .el-button {
  color: #fff;
  font-weight: 500;
}

/* 右侧工具栏 */
.tools-sidebar {
  position: absolute;
  top: 20px;
  right: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  z-index: 50;
}

/* 工具列表 */
.tool-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px;
}

/* 工具项 */
.tool-item {
  width: 48px;
  height: 64px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
}
.pnlm-controls{
  display: none;
}

/* 图标圆形背景 */
.tool-icon-wrapper {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}

.tool-item:hover:not(:disabled) .tool-icon-wrapper {
 /*  background: rgba(0, 0, 0, 0.5); */
  transform: scale(1.05);
}

/* .tool-item.active .tool-icon-wrapper {
  background: rgba(64, 158, 255, 0.3);
} */

.tool-item:hover:not(:disabled) {
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

/* .tool-item.active {
  background: rgba(64, 158, 255, 0.3);
  border-color: rgba(64, 158, 255, 0.5);
} */

.tool-item:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.tool-item:disabled:hover .tool-icon-wrapper {
  transform: none;
}

.tool-item:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.tool-icon {
  width: 24px;
  height: 24px;
  color: white;
  transition: all 0.3s ease;
  margin-bottom: 4px;
}

.tool-item:hover:not(:disabled) .tool-icon {
  transform: scale(1.1);
}

.tool-title {
  font-size: 12px;
  color: white;
  font-weight: 500;
  line-height: 1.2;
}

.tool-icon-el {
  font-size: 22px;
  color: white;
}

/* 管理员登录特殊样式 */
/* .tool-item.admin-login {
  background: rgba(64, 158, 255, 0.2);
  border-color: rgba(64, 158, 255, 0.5);
}

.tool-item.admin-login:hover {
  background: rgba(64, 158, 255, 0.3);
} */


/* 导航进度条 */
.navigation-progress {
  position: absolute;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 60;
  background: rgba(0, 0, 0, 0.75);
  padding: 12px 20px;
  border-radius: 12px;
  backdrop-filter: blur(10px);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  width: 320px;
  max-width: calc(100% - 40px);
}

.nav-progress-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.nav-step-text {
  color: #fff;
  font-size: 14px;
  font-weight: 500;
}

.nav-cancel-btn {
  color: #f56c6c !important;
  font-size: 13px;
  padding: 0;
}

.nav-cancel-btn:hover {
  color: #f78989 !important;
}

/* 当前场景信息 */
.scene-info {
  position: absolute;
  bottom: 260px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(255, 255, 255, 0.95);
  padding: 14px 22px;
  border-radius: 8px;
  text-align: center;
  z-index: 10;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
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

.marker-count-info {
  color: #606266;
  font-size: 14px;
  margin-top: 8px;
  font-weight: 500;
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
  bottom: 160px;
  right: 20px;
  background: rgba(255, 255, 255, 0.95);
  padding: 12px;
  border-radius: 8px;
  z-index: 10;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  display: none;
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
  bottom: 160px;
  left: 20px;
  z-index: 10;
  display: flex;
  gap: 10px;
}

/* 场景列表切换按钮 */
.scene-toggle-btn {
  position: absolute;
  bottom: 10px;
  left: 10px;
  z-index: 100;
}

.scene-toggle-btn.active .tool-icon-wrapper {
  background: rgba(64, 158, 255, 0.3);
}

/* 系统信息 */
.system-info {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px;
  background: #f5f7fa;
  border-radius: 8px;
}

.info-label {
  color: #606266;
  font-size: 13px;
}

.info-value {
  color: #2c3e50;
  font-weight: 500;
  font-size: 13px;
}

/* 底部场景列表 */
.scene-list-container {
  background: rgba(0, 0, 0, 0.2);
  padding: 16px 20px;
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.1);
  position: absolute;
  bottom: 10px;
  left: 0;
  right: 0;
  z-index: 40;
}

.scene-cards {
  max-width: calc(100% - 40px);
  margin: 0 20px;
  display: flex;
  gap: 16px;
  justify-content: center;
  overflow-x: auto;
  padding-bottom: 8px;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.3) transparent;
}

.scene-cards::-webkit-scrollbar {
  height: 5px;
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
  width: 140px;
  height: 140px;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 4px solid rgba(255, 255, 255, 1);
  border-radius: 8px;
  overflow: hidden;
  flex-shrink: 0;
  position: relative;
}

.scene-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.4);
  border-color: rgba(255, 255, 255,1);
}

.scene-card.current-scene {
  border-color: #409EFF;
  box-shadow: 0 0 20px rgba(64, 158, 255, 0.5);
}

.scene-card-image {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.scene-card-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.scene-card-image img.loaded {
  opacity: 1;
}

.scene-card-name {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 20px;
  background: rgba(0, 0, 0, 0.4);
  color: #fff;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 500;
}

/* 漫游配置弹窗 */
.roaming-dialog >>> .el-dialog__body {
  padding: 20px;
}

/* AI 响应弹窗 */
.ai-response-dialog >>> .el-dialog__body {
  padding: 20px;
}

.ai-response-content {
  padding: 10px 0;
}

.ai-message {
  margin: 0 0 20px 0;
  color: #2c3e50;
  font-size: 14px;
  line-height: 1.6;
}

.scene-marker-list {
  margin-top: 20px;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  overflow: hidden;
}

.list-title {
  margin: 0;
  padding: 12px 16px;
  background: #f5f7fa;
  border-bottom: 1px solid #ebeef5;
  color: #303133;
  font-size: 14px;
  font-weight: 500;
}

.scene-item {
  border-bottom: 1px solid #ebeef5;
}

.scene-item:last-child {
  border-bottom: none;
}

.scene-row {
  padding: 12px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  transition: background-color 0.3s;
}

.scene-row:hover {
  background-color: #f5f7fa;
}

.scene-row.disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.scene-name {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #303133;
}

.scene-name .el-icon-location {
  color: #e6a23c;
}

.marker-count {
  font-size: 12px;
  color: #909399;
}

.marker-list {
  padding: 8px 16px 16px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  background-color: #fafafa;
}

.marker-tag {
  padding: 6px 12px;
  background: #e3f2fd;
  color: #1976d2;
  border-radius: 16px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.3s;
}

.marker-tag:hover {
  background: #bbdefb;
  transform: translateY(-1px);
}

.marker-tag.disabled {
  opacity: 0.6;
  cursor: not-allowed;
  background: #e0e0e0;
  color: #999;
}

.marker-tag.disabled:hover {
  background: #e0e0e0;
  transform: none;
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .tools-sidebar {
    right: 20px;
  }

  .top-ai-search {
    width: 400px;
  }
}

@media (max-width: 768px) {
  .tools-sidebar {
    position: static;
    flex-direction: row;
    justify-content: center;
    padding: 10px;
    margin-bottom: 10px;
    gap: 8px;
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(10px);
    border-radius: 12px;
  }

  .tool-list {
    flex-direction: row;
    background: transparent;
    padding: 8px;
  }

  .tool-item {
    width: 40px;
    height: 40px;
  }

  .tool-icon {
    width: 20px;
    height: 20px;
  }

  .system-info {
    position: static;
    max-width: 100%;
    margin: 10px auto;
  }

  .main-container {
    height: calc(100vh - 60px);
    display: flex;
    flex-direction: column;
  }

  .preview-content {
    height: calc(100% - 200px);
  }

  .top-ai-search {
    width: calc(100% - 20px);
    padding: 12px 16px;
  }

  .scene-info {
    bottom: 240px;
    left: 10px;
    right: 10px;
    transform: none;
    max-width: none;
  }

  .legend {
    bottom: 140px;
    right: 10px;
  }

  .roaming-controls {
    bottom: 140px;
    left: 10px;
  }

  .scene-toggle-btn {
    bottom: 10px;
    left: 10px;
  }

  .scene-toggle-btn .tool-icon-wrapper {
    width: 40px;
    height: 40px;
  }

  .scene-toggle-btn .tool-icon {
    width: 20px;
    height: 20px;
  }

  .scene-card {
    width: 120px;
    height: 120px;
  }

  .scene-card-image {
    width: 100%;
    height: 100%;
  }
}
</style>