<template>
  <div class="marker-editor">
    <div class="editor-toolbar">
      <el-alert
        title="点击全景图上的位置来设置标记点坐标"
        type="info"
        :closable="false"
        show-icon
        style="margin-bottom: 15px;"
      ></el-alert>

      <el-form ref="form" :model="form" :rules="rules" label-width="100px" size="small">
        <el-form-item label="全景图" prop="panorama_id">
          <el-select v-model="form.panorama_id" placeholder="选择全景图" style="width: 100%;" @change="onPanoramaChange">
            <el-option
              v-for="item in panoramas"
              :key="item.id"
              :label="item.name + (item.type === 'main' ? ' (主图)' : '')"
              :value="item.id">
            </el-option>
          </el-select>
        </el-form-item>

        <el-form-item label="标记类型" prop="type">
          <el-radio-group v-model="form.type">
            <el-radio label="normal">普通标记</el-radio>
            <el-radio label="navigation">导航点</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="标题" prop="title">
          <el-input v-model="form.title" placeholder="请输入标记标题"></el-input>
        </el-form-item>

        <el-form-item label="描述">
          <el-input
            type="textarea"
            v-model="form.description"
            :rows="3"
            placeholder="请输入标记描述"
          ></el-input>
        </el-form-item>

        <el-form-item v-if="form.type === 'navigation'" label="目标场景" prop="target_panorama_id">
          <el-select v-model="form.target_panorama_id" placeholder="选择目标全景图" style="width: 100%;">
            <el-option
              v-for="item in targetPanoramas"
              :key="item.id"
              :label="item.name + (item.type === 'main' ? ' (主图)' : '')"
              :value="item.id">
            </el-option>
          </el-select>
        </el-form-item>

        <el-form-item label="坐标位置" required>
          <div class="position-info">
            <span>Pitch: {{ form.pitch !== null ? form.pitch.toFixed(4) : '未设置' }}</span>
            <span style="margin-left: 20px;">Yaw: {{ form.yaw !== null ? form.yaw.toFixed(4) : '未设置' }}</span>
            <el-button type="text" @click="startPickPosition" :disabled="!form.panorama_id">
              {{ pickingPosition ? '点击全景图选择位置...' : '选择位置' }}
            </el-button>
          </div>
        </el-form-item>

        <el-form-item>
          <el-button type="primary" @click="submitForm" :loading="submitting">
            {{ editMode ? '更新' : '创建' }}
          </el-button>
          <el-button @click="resetForm">重置</el-button>
          <el-button v-if="editMode" @click="cancelEdit">取消</el-button>
        </el-form-item>
      </el-form>
    </div>

    <!-- 全景图预览（用于选择位置） -->
    <div class="preview-container" v-if="form.panorama_id">
      <div id="marker-editor-viewer" ref="editorViewer"></div>
    </div>
  </div>
</template>

<script>
import { panoramaApi, markerApi } from '@/api';

export default {
  name: 'MarkerEditor',
  props: {
    // 编辑模式时传入的标记点数据
    marker: {
      type: Object,
      default: null
    }
  },
  data() {
    return {
      panoramas: [],
      viewer: null,
      pickingPosition: false,
      submitting: false,
      form: {
        panorama_id: null,
        type: 'normal',
        title: '',
        description: '',
        target_panorama_id: null,
        pitch: null,
        yaw: null
      },
      rules: {
        panorama_id: [
          { required: true, message: '请选择全景图', trigger: 'change' }
        ],
        type: [
          { required: true, message: '请选择标记类型', trigger: 'change' }
        ],
        title: [
          { required: true, message: '请输入标题', trigger: 'blur' }
        ],
        target_panorama_id: [
          { required: true, message: '请选择目标全景图', trigger: 'change' }
        ]
      }
    };
  },
  computed: {
    editMode() {
      return this.marker !== null;
    },
    targetPanoramas() {
      return this.panoramas.filter(p => p.id !== this.form.panorama_id);
    }
  },
  watch: {
    marker: {
      immediate: true,
      handler(val) {
        if (val) {
          this.form = {
            panorama_id: val.panorama_id,
            type: val.type,
            title: val.title,
            description: val.description || '',
            target_panorama_id: val.target_panorama_id,
            pitch: parseFloat(val.pitch),
            yaw: parseFloat(val.yaw)
          };
          this.$nextTick(() => {
            this.initViewer();
          });
        }
      }
    }
  },
  async mounted() {
    await this.loadPanoramas();
    if (!this.editMode && this.panoramas.length > 0) {
      // 默认选择第一个全景图
      this.form.panorama_id = this.panoramas[0].id;
      // 等待 DOM 更新后再初始化 Pannellum（因为预览容器使用 v-if 条件渲染）
      this.$nextTick(() => {
        this.initViewer();
      });
    }
  },
  beforeDestroy() {
    if (this.viewer) {
      this.viewer.destroy();
    }
  },
  methods: {
    /**
     * 加载全景图列表
     */
    async loadPanoramas() {
      try {
        const res = await panoramaApi.getList();
        if (res.success) {
          this.panoramas = res.data;
        }
      } catch (error) {
        console.error('加载全景图列表失败:', error);
        this.$message.error('加载全景图列表失败');
      }
    },

    /**
     * 全景图选择变化
     */
    onPanoramaChange() {
      // 重置坐标
      this.form.pitch = null;
      this.form.yaw = null;
      this.form.target_panorama_id = null;
      // 重新初始化查看器
      this.$nextTick(() => {
        this.initViewer();
      });
    },

    /**
     * 初始化 Pannellum 查看器
     */
    initViewer() {
      if (!this.form.panorama_id) return;

      const panorama = this.panoramas.find(p => p.id === this.form.panorama_id);
      if (!panorama) return;

      // 销毁已有实例
      if (this.viewer) {
        this.viewer.destroy();
      }

      // 创建 Pannellum 实例
      this.viewer = window.pannellum.viewer('marker-editor-viewer', {
        type: 'equirectangular',
        panorama: panorama.file_path,
        autoLoad: true,
        hotSpots: this.form.pitch !== null ? [{
          pitch: this.form.pitch,
          yaw: this.form.yaw,
          type: 'custom',
          cssClass: this.form.type === 'navigation' ? 'custom-marker-navigation' : 'custom-marker-normal'
        }] : [],
        compass: true
      });

      // 监听点击事件
      this.viewer.on('mousedown', this.handleViewerClick);
    },

    /**
     * 开始选择位置
     */
    startPickPosition() {
      this.pickingPosition = true;
      this.$message.info('请在全景图上点击选择标记位置');
    },

    /**
     * 处理查看器点击
     */
    handleViewerClick(event) {
      if (!this.pickingPosition) return;

      const coords = this.viewer.mouseEventToCoords(event);
      this.form.pitch = coords[0];
      this.form.yaw = coords[1];
      this.pickingPosition = false;

      // 更新标记点显示
      this.updateHotSpot();

      this.$message.success('位置已设置');
    },

    /**
     * 更新标记点显示
     */
    updateHotSpot() {
      if (this.form.pitch === null) return;

      // 移除旧标记点
      try {
        this.viewer.removeHotSpot('temp-marker');
      } catch (e) {}

      // 添加新标记点
      this.viewer.addHotSpot({
        id: 'temp-marker',
        pitch: this.form.pitch,
        yaw: this.form.yaw,
        type: 'custom',
        cssClass: this.form.type === 'navigation' ? 'custom-marker-navigation' : 'custom-marker-normal'
      });
    },

    /**
     * 提交表单
     */
    async submitForm() {
      this.$refs.form.validate(async (valid) => {
        if (!valid) return;

        if (this.form.pitch === null || this.form.yaw === null) {
          this.$message.warning('请选择标记点位置');
          return;
        }

        this.submitting = true;
        try {
          if (this.editMode) {
            // 更新
            await markerApi.update(this.marker.id, this.form);
            this.$message.success('标记点更新成功');
          } else {
            // 创建
            await markerApi.create(this.form);
            this.$message.success('标记点创建成功');
          }
          this.$emit('success');
          this.resetForm();
        } catch (error) {
          this.$message.error(error.message || '操作失败');
        } finally {
          this.submitting = false;
        }
      });
    },

    /**
     * 重置表单
     */
    resetForm() {
      this.$refs.form.resetFields();
      this.form = {
        panorama_id: this.panoramas.length > 0 ? this.panoramas[0].id : null,
        type: 'normal',
        title: '',
        description: '',
        target_panorama_id: null,
        pitch: null,
        yaw: null
      };
      this.pickingPosition = false;
      this.$emit('cancel');
      this.$nextTick(() => {
        this.initViewer();
      });
    },

    /**
     * 取消编辑
     */
    cancelEdit() {
      this.resetForm();
    }
  }
};
</script>

<style scoped>
.marker-editor {
  display: flex;
  height: 100%;
  min-height: 500px;
}

.editor-toolbar {
  width: 400px;
  padding: 20px;
  background: #fff;
  border-right: 1px solid #ebeef5;
  overflow-y: auto;
}

.preview-container {
  flex: 1;
  min-height: 500px;
}

#marker-editor-viewer {
  width: 100%;
  height: 100%;
  min-height: 500px;
}

.position-info {
  display: flex;
  align-items: center;
  font-size: 14px;
  color: #606266;
}
</style>
