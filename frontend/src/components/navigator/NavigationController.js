/**
 * 导航控制器
 * 管理全景图导航的队列执行和平滑过渡
 */
export default class NavigationController {
  constructor(viewer, eventBus) {
    this.viewer = viewer;
    this.eventBus = eventBus;
    this.isNavigating = false;
    this.navigationQueue = [];
    this.currentStepIndex = 0;
    this.currentPanoramaId = null;

    // 导航进度
    this.progress = {
      currentStep: 0,
      totalSteps: 0,
      percentage: 0,
      status: 'idle' // idle, navigating, paused, completed
    };
  }

  /**
   * 设置当前场景ID
   */
  setCurrentPanoramaId(sceneId) {
    this.currentPanoramaId = sceneId;
  }

  /**
   * 开始导航到标记点
   */
  async navigateToMarker(targetMarker) {
    if (this.isNavigating) {
      console.log('导航正在进行中');
      return false;
    }

    try {
      // 获取导航路径
      const response = await fetch('/api/v1/navigation/calculate-path', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          currentSceneId: this.currentPanoramaId,
          targetMarkerId: targetMarker.id
        })
      });

      const result = await response.json();

      if (!result.success || !result.data || result.data.length === 0) {
        console.log('无法获取导航路径');
        return false;
      }

      // 开始执行导航
      await this.executeNavigation(result.data);
      return true;

    } catch (error) {
      console.error('导航失败:', error);
      return false;
    }
  }

  /**
   * 执行导航路径
   */
  async executeNavigation(steps) {
    this.isNavigating = true;
    this.navigationQueue = steps;
    this.currentStepIndex = 0;
    this.progress.totalSteps = steps.length;
    this.progress.status = 'navigating';

    // 通知开始导航
    this.eventBus.$emit('navigation-started', {
      totalSteps: steps.length,
      currentStep: 0
    });

    try {
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];

        // 更新进度
        this.progress.currentStep = i;
        this.progress.percentage = Math.round((i / steps.length) * 100);
        this.eventBus.$emit('navigation-progress', {
          ...this.progress,
          currentStepData: step
        });

        // 执行单个步骤
        await this.executeStep(step);

        // 步骤间暂停
        if (i < steps.length - 1) {
          await this.wait(500);
        }
      }

      // 导航完成
      this.progress.status = 'completed';
      this.eventBus.$emit('navigation-completed');
      console.log('导航完成');

    } catch (error) {
      console.error('导航执行失败:', error);
      this.progress.status = 'error';
      this.eventBus.$emit('navigation-error', error);
    } finally {
      this.isNavigating = false;
      this.progress = {
        currentStep: 0,
        totalSteps: 0,
        percentage: 0,
        status: 'idle'
      };
    }
  }

  /**
   * 执行单个导航步骤
   */
  async executeStep(step) {
    console.log(`执行步骤: ${step.type}`, step.data);

    switch (step.type) {
      case 'navigation':
        await this.executeNavigationStep(step);
        break;
      case 'scene':
        await this.executeSceneStep(step);
        break;
      case 'marker':
        await this.executeMarkerStep(step);
        break;
    }
  }

  /**
   * 执行导航点步骤
   */
  async executeNavigationStep(step) {
    const data = step.data;
    console.log(`导航点: ${data.title} 从 ${data.from_scene_name} 到 ${data.to_scene_name}`);

    // 1. 指向导航点
    this.eventBus.$emit('navigation-look-at', {
      pitch: data.markerPitch,
      yaw: data.markerYaw,
      duration: 1000
    });
    await this.wait(1000);

    // 2. 等待1秒
    await this.wait(1000);

    // 3. 缩放到导航点
    await this.zoomToMarker(2000);

    // 4. 等待1秒后切换场景
    await this.wait(1000);
  }

  /**
   * 执行场景切换步骤
   */
  async executeSceneStep(step) {
    const data = step.data;
    console.log(`切换到场景: ${data.name}`);

    // 1. 加载新场景
    this.eventBus.$emit('navigation-change-scene', {
      sceneId: data.id,
      sceneName: data.name
    });

    // 2. 等待场景加载完成
    await new Promise((resolve) => {
      const handler = () => {
        this.eventBus.$off('scene-loaded', handler);
        this.currentPanoramaId = data.id;
        resolve();
      };
      this.eventBus.$once('scene-loaded', handler);
    });

    // 3. 等待1秒
    await this.wait(1000);
  }

  /**
   * 执行标记点定位步骤
   */
  async executeMarkerStep(step) {
    const data = step.data;
    console.log(`定位到标记点: ${data.title}`);

    // 直接指向标记点
    this.eventBus.$emit('navigation-look-at', {
      pitch: data.pitch,
      yaw: data.yaw,
      duration: 1500
    });
  }

  /**
   * 缩放到标记点
   */
  zoomToMarker(duration) {
    return new Promise((resolve) => {
      let startZoom = 1;
      let endZoom = 2;
      const startTime = Date.now();

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // 线性插值
        const currentZoom = startZoom + (endZoom - startZoom) * progress;

        // 触发缩放事件
        this.eventBus.$emit('navigation-zoom', {
          zoom: currentZoom,
          progress: progress
        });

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          resolve();
        }
      };

      animate();
    });
  }

  /**
   * 等待
   */
  wait(ms) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }

  /**
   * 停止导航
   */
  stop() {
    if (this.isNavigating) {
      this.isNavigating = false;
      this.navigationQueue = [];
      this.progress.status = 'paused';
      this.eventBus.$emit('navigation-stopped');
      console.log('导航已停止');
    }
  }

  /**
   * 获取当前进度
   */
  getProgress() {
    return { ...this.progress };
  }
}