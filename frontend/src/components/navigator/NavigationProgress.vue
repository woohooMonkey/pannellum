<template>
  <div class="navigation-progress" v-if="isVisible">
    <div class="progress-container">
      <div class="progress-header">
        <span class="progress-title">导航进度</span>
        <el-button
          type="text"
          size="mini"
          @click="close"
          icon="el-icon-close"
        ></el-button>
      </div>

      <div class="progress-bar-container">
        <el-progress
          :percentage="progress.percentage"
          :status="progress.status"
          :stroke-width="6"
          :show-text="false"
        ></el-progress>
        <span class="progress-text">{{ progress.percentage }}%</span>
      </div>

      <div class="progress-info">
        <div class="step-info">
          <span class="label">当前步骤:</span>
          <span class="value">{{ progress.currentStep + 1 }} / {{ progress.totalSteps }}</span>
        </div>
        <div class="status-info">
          <span class="label">状态:</span>
          <span class="value" :class="progress.status">
            {{ getStatusText(progress.status) }}
          </span>
        </div>
      </div>

      <div class="current-step" v-if="currentStepData">
        <div class="step-title">
          {{ getStepTitle(currentStepData.type) }}
        </div>
        <div class="step-details" v-if="currentStepData.data">
          <div v-if="currentStepData.data.title">
            <strong>{{ currentStepData.data.title }}</strong>
          </div>
          <div v-if="currentStepData.data.name && currentStepData.data.name !== currentStepData.data.title">
            场景: {{ currentStepData.data.name }}
          </div>
          <div v-if="currentStepData.data.sceneName">
            目标场景: {{ currentStepData.data.sceneName }}
          </div>
        </div>
      </div>

      <div class="progress-actions">
        <el-button
          type="primary"
          size="small"
          @click="stop"
          :disabled="progress.status === 'completed'"
        >
          停止导航
        </el-button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'NavigationProgress',

  data() {
    return {
      isVisible: false,
      progress: {
        currentStep: 0,
        totalSteps: 0,
        percentage: 0,
        status: 'idle'
      },
      currentStepData: null,
      interval: null
    };
  },

  mounted() {
    // 监听导航事件
    this.$root.$on('navigation-started', this.onNavigationStarted);
    this.$root.$on('navigation-progress', this.onNavigationProgress);
    this.$root.$on('navigation-completed', this.onNavigationCompleted);
    this.$root.$on('navigation-error', this.onNavigationError);
    this.$root.$on('navigation-stopped', this.onNavigationStopped);
  },

  beforeDestroy() {
    // 移除事件监听
    this.$root.$off('navigation-started', this.onNavigationStarted);
    this.$root.$off('navigation-progress', this.onNavigationProgress);
    this.$root.$off('navigation-completed', this.onNavigationCompleted);
    this.$root.$off('navigation-error', this.onNavigationError);
    this.$root.$off('navigation-stopped', this.onNavigationStopped);

    // 清理定时器
    if (this.interval) {
      clearInterval(this.interval);
    }
  },

  methods: {
    /**
     * 导航开始
     */
    onNavigationStarted(data) {
      this.isVisible = true;
      this.progress = {
        currentStep: 0,
        totalSteps: data.totalSteps,
        percentage: 0,
        status: 'navigating'
      };
    },

    /**
     * 导航进度更新
     */
    onNavigationProgress(data) {
      this.progress = data;
      this.currentStepData = data.currentStepData;
    },

    /**
     * 导航完成
     */
    onNavigationCompleted() {
      this.progress.status = 'completed';
      setTimeout(() => {
        this.close();
      }, 2000);
    },

    /**
     * 导航错误
     */
    onNavigationError(error) {
      this.progress.status = 'error';
      console.error('导航错误:', error);
    },

    /**
     * 导航停止
     */
    onNavigationStopped() {
      this.progress.status = 'paused';
      setTimeout(() => {
        this.close();
      }, 1000);
    },

    /**
     * 获取状态文本
     */
    getStatusText(status) {
      const statusMap = {
        idle: '等待中',
        navigating: '导航中',
        paused: '已暂停',
        completed: '已完成',
        error: '错误'
      };
      return statusMap[status] || status;
    },

    /**
     * 获取步骤标题
     */
    getStepTitle(type) {
      const titleMap = {
        navigation: '导航点',
        scene: '场景切换',
        marker: '标记点'
      };
      return titleMap[type] || type;
    },

    /**
     * 停止导航
     */
    stop() {
      this.$root.$emit('navigation-stop');
    },

    /**
     * 关闭进度条
     */
    close() {
      this.isVisible = false;
    }
  }
};
</script>

<style scoped>
.navigation-progress {
  position: fixed;
  top: 20px;
  right: 20px;
  width: 300px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 9999;
  transition: opacity 0.3s ease;
}

.progress-container {
  padding: 16px;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.progress-title {
  font-weight: bold;
  color: #333;
}

.progress-bar-container {
  position: relative;
  margin-bottom: 16px;
}

.progress-text {
  position: absolute;
  right: 0;
  top: -20px;
  font-size: 12px;
  color: #666;
}

.progress-info {
  display: flex;
  justify-content: space-between;
  margin-bottom: 16px;
  font-size: 14px;
}

.label {
  color: #666;
}

.value {
  font-weight: 500;
}

.current-step {
  background: #f5f7fa;
  border-radius: 4px;
  padding: 12px;
  margin-bottom: 16px;
}

.step-title {
  font-weight: bold;
  color: #333;
  margin-bottom: 8px;
}

.step-details {
  font-size: 14px;
  color: #666;
  line-height: 1.5;
}

.progress-actions {
  display: flex;
  justify-content: flex-end;
}

/* 状态颜色 */
.status-navigating {
  color: #409eff;
}

.status-paused {
  color: #e6a23c;
}

.status-completed {
  color: #67c23a;
}

.status-error {
  color: #f56c6c;
}
</style>