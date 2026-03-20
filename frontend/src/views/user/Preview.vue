<template>
  <div class="preview-page">
    <!-- 顶部导航栏 -->
    <header class="preview-header">
      <h1 class="logo">全景图预览</h1>
      <nav>
        <el-link type="info" href="/admin/login">管理员登录</el-link>
      </nav>
    </header>

    <!-- 全景图查看器 -->
    <main class="preview-content">
      <panorama-viewer
        ref="viewer"
        @loaded="onPanoramaLoaded"
      />
    </main>

    <!-- 当前场景信息 -->
    <div class="scene-info" v-if="currentPanorama">
      <div class="scene-title">{{ currentPanorama.name }}</div>
      <div class="scene-desc" v-if="currentPanorama.description">{{ currentPanorama.description }}</div>
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

export default {
  name: 'Preview',
  components: {
    PanoramaViewer
  },
  data() {
    return {
      currentPanorama: null
    };
  },
  methods: {
    /**
     * 全景图加载完成
     */
    onPanoramaLoaded(panorama) {
      this.currentPanorama = panorama;
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
