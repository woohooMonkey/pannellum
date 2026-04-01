<template>
  <div class="home-page">
    <!-- 左侧主要内容区域 -->
    <main class="main-content">
      <!-- 页面标题 -->
      <header class="page-header">
        <h1 class="page-title">全景图管理系统</h1>
        <p class="page-subtitle">点击场景卡片开始探索</p>
      </header>

      <!-- 场景列表 -->
      <section class="scene-list">
        <div
          v-for="scene in sortedScenes"
          :key="scene.id"
          class="scene-card"
          :class="{ 'main-scene': scene.type === 'main' }"
          @click="handleSceneClick(scene)"
        >
          <div class="scene-image-container">
            <img
              v-if="scene.thumbnail"
              :src="`/uploads/panoramas/thumbnails/${scene.thumbnail}`"
              :alt="scene.name"
              class="scene-thumbnail"
              @error="handleImageError"
            />
            <div v-else class="scene-placeholder">
              <i class="el-icon-picture-outline"></i>
            </div>
            <span v-if="scene.type === 'main'" class="main-badge">主图</span>
          </div>
          <div class="scene-info">
            <h3 class="scene-name">{{ scene.name }}</h3>
            <p class="scene-description" v-if="scene.description">
              {{ scene.description }}
            </p>
            <div class="scene-stats">
              <span class="stat-item">
                <i class="el-icon-map-location"></i>
                {{ scene.markerCount || 0 }} 个标记点
              </span>
            </div>
          </div>
          <div class="scene-actions">
            <el-button
              type="primary"
              size="small"
              icon="el-icon-view"
            >
              查看全景
            </el-button>
          </div>
        </div>
      </section>

      <!-- 空状态提示 -->
      <div v-if="!sceneList || sceneList.length === 0" class="empty-state">
        <el-empty description="暂无场景数据">
          <el-button type="primary" @click="$router.push('/admin/login')">登录管理</el-button>
        </el-empty>
      </div>
    </main>

    <!-- 右侧工具面板 -->
    <aside class="tools-panel">
      <div class="panel-section">
        <h3 class="section-title">快速导航</h3>
        <div class="nav-buttons">
          <el-button
            type="primary"
            icon="el-icon-view"
            @click="goToPreview"
            class="nav-btn"
          >
            全景预览
          </el-button>
          <el-button
            type="success"
            icon="el-icon-data-analysis"
            @click="goToCompare"
            class="nav-btn"
          >
            版本对比
          </el-button>
        </div>
      </div>

      <div class="panel-section">
        <h3 class="section-title">管理功能</h3>
        <div class="admin-links">
          <el-button
            type="info"
            icon="el-icon-setting"
            @click="goToAdmin"
            class="admin-btn"
          >
            管理后台
          </el-button>
          <p class="admin-tip" v-if="!isAdminLoggedIn">
            需要管理员权限
          </p>
        </div>
      </div>

      <div class="panel-section">
        <h3 class="section-title">AI助手</h3>
        <div class="ai-tools">
          <el-input
            v-model="aiQuery"
            placeholder="输入问题，如：有多少个场景？"
            class="ai-input"
            @keyup.enter.native="handleAIQuery"
          >
            <el-button
              slot="append"
              icon="el-icon-question"
              @click="handleAIQuery"
              :loading="aiLoading"
            >
              询问
            </el-button>
          </el-input>
          <div class="ai-tip">
            <i class="el-icon-info"></i>
            可以询问关于场景的问题
          </div>
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
            <span class="info-label">标记点总数：</span>
            <span class="info-value">{{ totalMarkers }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">主场景：</span>
            <span class="info-value">{{ mainScene?.name || '无' }}</span>
          </div>
        </div>
      </div>
    </aside>

    <!-- AI响应弹窗 -->
    <el-dialog
      title="AI助手回答"
      :visible.sync="aiDialogVisible"
      width="500px"
      center
      custom-class="ai-dialog"
    >
      <div class="ai-response">
        <p>{{ aiResponse }}</p>
      </div>
      <span slot="footer" class="dialog-footer">
        <el-button @click="aiDialogVisible = false">关闭</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
import { panoramaApi } from '@/api';

export default {
  name: 'Home',
  data() {
    return {
      sceneList: [],
      sceneListLoading: false,
      aiQuery: '',
      aiLoading: false,
      aiResponse: '',
      aiDialogVisible: false,
      isAdminLoggedIn: !!localStorage.getItem('admin_token')
    };
  },
  computed: {
    // 排序后的场景列表：主图排在第一个
    sortedScenes() {
      if (!this.sceneList) return [];
      const mainScene = this.sceneList.find(s => s.type === 'main');
      const otherScenes = this.sceneList.filter(s => s.type !== 'main');
      return mainScene ? [mainScene, ...otherScenes] : [...otherScenes];
    },

    // 主场景信息
    mainScene() {
      return this.sceneList?.find(s => s.type === 'main') || null;
    },

    // 标记点总数
    totalMarkers() {
      return this.sceneList?.reduce((total, scene) => total + (scene.markerCount || 0), 0) || 0;
    }
  },
  mounted() {
    this.fetchSceneList();
    this.checkAdminStatus();
  },
  methods: {
    /**
     * 获取场景列表
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
        this.$message.error('加载场景列表失败');
      } finally {
        this.sceneListLoading = false;
      }
    },

    /**
     * 检查管理员登录状态
     */
    checkAdminStatus() {
      this.isAdminLoggedIn = !!localStorage.getItem('admin_token');
    },

    /**
     * 处理场景点击
     */
    handleSceneClick(scene) {
      this.$router.push(`/preview?sceneId=${scene.id}`);
    },

    /**
     * 处理图片加载失败
     */
    handleImageError(e) {
      e.target.style.display = 'none';
      e.target.nextElementSibling.style.display = 'flex';
    },

    /**
     * 跳转到全景预览
     */
    goToPreview() {
      if (this.mainScene) {
        this.$router.push('/preview');
      } else {
        this.$message.warning('暂无主场景，请先在管理后台设置');
      }
    },

    /**
     * 跳转到版本对比
     */
    goToCompare() {
      this.$router.push('/compare');
    },

    /**
     * 跳转到管理后台
     */
    goToAdmin() {
      if (this.isAdminLoggedIn) {
        this.$router.push('/admin');
      } else {
        this.$router.push('/admin/login');
      }
    },

    /**
     * 处理AI查询
     */
    async handleAIQuery() {
      if (!this.aiQuery.trim()) {
        this.$message.warning('请输入问题');
        return;
      }

      this.aiLoading = true;
      try {
        // 模拟AI响应（实际项目中应该调用AI API）
        const query = this.aiQuery.trim().toLowerCase();
        let response = '';

        if (query.includes('多少') && query.includes('场景')) {
          response = `当前系统共有 ${this.sceneList?.length || 0} 个场景。`;
        } else if (query.includes('多少') && query.includes('标记')) {
          response = `当前系统共有 ${this.totalMarkers} 个标记点。`;
        } else if (query.includes('主') && query.includes('场景')) {
          response = this.mainScene
            ? `主场景是：${this.mainScene.name}。${this.mainScene.description ? '\n描述：' + this.mainScene.description : ''}`
            : '暂未设置主场景。';
        } else {
          response = `已找到 ${this.sceneList?.length || 0} 个场景。您可以询问具体的场景信息或标记点数量。`;
        }

        this.aiResponse = response;
        this.aiDialogVisible = true;
        this.aiQuery = '';
      } catch (error) {
        console.error('AI查询失败:', error);
        this.$message.error('查询失败，请稍后重试');
      } finally {
        this.aiLoading = false;
      }
    }
  }
};
</script>

<style scoped>
.home-page {
  min-height: 100vh;
  background: #f5f7fa;
  display: flex;
}

/* 左侧主要内容区域 */
.main-content {
  flex: 1;
  padding: 40px;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
}

/* 页面标题 */
.page-header {
  text-align: center;
  margin-bottom: 60px;
}

.page-title {
  font-size: 36px;
  color: #2c3e50;
  margin-bottom: 10px;
  font-weight: 600;
}

.page-subtitle {
  font-size: 18px;
  color: #7f8c8d;
  margin: 0;
}

/* 场景列表 */
.scene-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 24px;
  margin-bottom: 40px;
}

/* 场景卡片 */
.scene-card {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  overflow: hidden;
  transition: all 0.3s ease;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.scene-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

.scene-card.main-scene {
  border: 2px solid #409eff;
  position: relative;
}

.scene-card.main-scene::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, #409eff 0%, #67c23a 100%);
}

/* 场景图片容器 */
.scene-image-container {
  position: relative;
  height: 200px;
  overflow: hidden;
}

.scene-thumbnail {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.scene-card:hover .scene-thumbnail {
  transform: scale(1.05);
}

.scene-placeholder {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f0f2f5;
  color: #909399;
  font-size: 48px;
}

.main-badge {
  position: absolute;
  top: 12px;
  right: 12px;
  background: #409eff;
  color: white;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
  z-index: 1;
}

/* 场景信息 */
.scene-info {
  padding: 20px;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.scene-name {
  font-size: 20px;
  font-weight: 500;
  color: #2c3e50;
  margin: 0 0 12px 0;
}

.scene-description {
  color: #606266;
  font-size: 14px;
  line-height: 1.5;
  margin: 0 0 16px 0;
  flex: 1;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.scene-stats {
  display: flex;
  gap: 16px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #909399;
  font-size: 14px;
}

/* 场景操作按钮 */
.scene-actions {
  padding: 0 20px 20px 20px;
}

/* 右侧工具面板 */
.tools-panel {
  width: 340px;
  background: #fff;
  border-left: 1px solid #e4e7ed;
  padding: 40px 30px;
  overflow-y: auto;
}

.panel-section {
  margin-bottom: 40px;
}

.panel-section:last-child {
  margin-bottom: 0;
}

.section-title {
  font-size: 18px;
  color: #2c3e50;
  margin: 0 0 20px 0;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 8px;
}

.section-title::before {
  content: '';
  width: 4px;
  height: 18px;
  background: #409eff;
  border-radius: 2px;
}

/* 导航按钮 */
.nav-buttons {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.nav-btn {
  width: 100%;
  height: 44px;
  font-size: 16px;
  justify-content: flex-start;
  padding-left: 16px;
}

/* 管理链接 */
.admin-links {
  text-align: center;
}

.admin-btn {
  width: 100%;
  height: 44px;
  font-size: 16px;
}

.admin-tip {
  margin-top: 12px;
  color: #909399;
  font-size: 14px;
}

/* AI助手 */
.ai-input {
  margin-bottom: 12px;
}

.ai-input >>> .el-input__inner {
  height: 44px;
}

.ai-input >>> .el-input__inner::placeholder {
  color: #c0c4cc;
}

.ai-tip {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #909399;
  font-size: 13px;
}

/* 系统信息 */
.system-info {
  display: flex;
  flex-direction: column;
  gap: 16px;
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

/* 空状态 */
.empty-state {
  text-align: center;
  padding: 60px 0;
}

/* AI响应弹窗 */
.ai-dialog >>> .el-dialog__body {
  padding: 30px;
}

.ai-response {
  color: #606266;
  line-height: 1.6;
  text-align: center;
}

/* 响应式设计 */
@media (max-width: 1024px) {
  .home-page {
    flex-direction: column;
  }

  .tools-panel {
    width: 100%;
    border-left: none;
    border-top: 1px solid #e4e7ed;
    order: -1;
  }

  .main-content {
    padding: 20px;
  }

  .page-header {
    margin-bottom: 40px;
  }

  .page-title {
    font-size: 28px;
  }

  .page-subtitle {
    font-size: 16px;
  }

  .scene-list {
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 20px;
  }
}

@media (max-width: 640px) {
  .main-content {
    padding: 16px;
  }

  .tools-panel {
    padding: 20px;
  }

  .scene-list {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .page-header {
    margin-bottom: 30px;
  }

  .page-title {
    font-size: 24px;
  }
}
</style>