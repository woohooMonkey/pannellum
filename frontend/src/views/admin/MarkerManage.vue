<template>
  <div class="marker-manage">
    <el-row :gutter="20" style="height: 100%;">
      <!-- 左侧：全景图列表 -->
      <el-col :span="6" style="height: 100%;">
        <el-card style="height: 100%; display: flex; flex-direction: column;">
          <div slot="header" class="card-header">
            <span>全景图列表</span>
          </div>
          <div class="panorama-list">
            <div
              v-for="item in sortedPanoramas"
              :key="item.id"
              class="panorama-item"
              :class="{ active: selectedPanoramaId === item.id }"
              @click="selectPanorama(item)"
            >
              <el-image
                :src="item.file_path"
                fit="cover"
                class="panorama-thumb"
              ></el-image>
              <div class="panorama-info">
                <div class="panorama-name">{{ item.name }}</div>
                <div class="panorama-meta">
                  <el-tag :type="item.type === 'main' ? 'danger' : 'info'" size="mini">
                    {{ item.type === 'main' ? '主图' : '场景' }}
                  </el-tag>
                  <span class="marker-count">{{ item.marker_count || 0 }} 个标记</span>
                </div>
              </div>
            </div>
            <el-empty v-if="panoramas.length === 0" description="暂无全景图" :image-size="80"></el-empty>
          </div>
        </el-card>
      </el-col>

      <!-- 右侧：标记点管理 -->
      <el-col :span="18" style="height: 100%;">
        <el-card style="height: 100%; display: flex; flex-direction: column;" v-if="selectedPanoramaId">
          <div slot="header" class="card-header">
            <span>{{ selectedPanorama ? selectedPanorama.name : '' }} - 标记点管理</span>
            <el-button type="primary" size="small" icon="el-icon-plus" @click="startAddMarker">
              新增标记点
            </el-button>
          </div>

          <!-- 标记点列表 -->
          <div class="marker-list-container">
            <el-table
              :data="markers"
              v-loading="loadingMarkers"
              border
              stripe
              size="small"
              style="width: 100%;"
            >
              <el-table-column prop="id" label="ID" width="60"></el-table-column>
              <el-table-column label="类型" width="80">
                <template slot-scope="scope">
                  <el-tag :type="scope.row.type === 'navigation' ? 'success' : 'info'" size="mini">
                    {{ scope.row.type === 'navigation' ? '导航' : '普通' }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="title" label="标题" min-width="120" show-overflow-tooltip></el-table-column>
              <el-table-column label="坐标" min-width="140">
                <template slot-scope="scope">
                  <span class="coord-text">P: {{ parseFloat(scope.row.pitch).toFixed(2) }}</span>
                  <span class="coord-text">Y: {{ parseFloat(scope.row.yaw).toFixed(2) }}</span>
                </template>
              </el-table-column>
              <el-table-column prop="target_panorama_name" label="目标场景" min-width="100" show-overflow-tooltip>
                <template slot-scope="scope">
                  <span v-if="scope.row.type === 'navigation'">{{ scope.row.target_panorama_name || '-' }}</span>
                  <span v-else>-</span>
                </template>
              </el-table-column>
              <el-table-column label="操作" width="120" fixed="right">
                <template slot-scope="scope">
                  <el-button type="text" size="mini" @click="startEditMarker(scope.row)">编辑</el-button>
                  <el-button type="text" size="mini" style="color: #F56C6C;" @click="deleteMarker(scope.row)">删除</el-button>
                </template>
              </el-table-column>
            </el-table>
          </div>

          <!-- 底部区域：预览 + 编辑面板 -->
          <div class="bottom-area">
            <!-- 全景图预览区域 -->
            <div class="preview-area">
              <div class="preview-header">
                <span>全景图预览（点击选择标记位置）</span>
                <el-tag v-if="pickingPosition" type="warning" size="small">正在选择位置...</el-tag>
              </div>
              <div class="preview-container">
                <div id="marker-preview-viewer" ref="previewViewer"></div>
              </div>
            </div>

            <!-- 右侧编辑面板 -->
            <div class="edit-panel">
              <div class="edit-panel-header">
                <span>{{ editingMarker ? '编辑标记点' : '新增标记点' }}</span>
                <el-button v-if="editingMarker || isAdding" type="text" size="mini" @click="cancelEdit">
                  <i class="el-icon-close"></i> 取消
                </el-button>
              </div>
              <div class="edit-panel-body">
                <template v-if="editingMarker || isAdding">
                  <el-form ref="markerForm" :model="markerForm" :rules="markerRules" label-width="80px" size="small">
                    <el-form-item label="标记类型" prop="type">
                      <el-radio-group v-model="markerForm.type" @change="onMarkerTypeChange">
                        <el-radio label="normal">普通</el-radio>
                        <el-radio label="navigation">导航</el-radio>
                      </el-radio-group>
                    </el-form-item>

                    <el-form-item label="标题" prop="title">
                      <el-input v-model="markerForm.title" placeholder="请输入标记标题"></el-input>
                    </el-form-item>

                    <el-form-item label="描述">
                      <el-input
                        type="textarea"
                        v-model="markerForm.description"
                        :rows="2"
                        placeholder="请输入标记描述"
                      ></el-input>
                    </el-form-item>

                    <el-form-item v-if="markerForm.type === 'navigation'" label="目标场景" prop="target_panorama_id">
                      <el-select v-model="markerForm.target_panorama_id" placeholder="选择目标全景图" style="width: 100%;">
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
                        <el-button type="primary" size="small" @click="startPickPosition" :disabled="pickingPosition">
                          {{ pickingPosition ? '点击图中...' : '选择位置' }}
                        </el-button>
                        <span class="coord-display" v-if="markerForm.pitch !== null">
                          P: {{ markerForm.pitch.toFixed(2) }}, Y: {{ markerForm.yaw.toFixed(2) }}
                        </span>
                        <span class="coord-display" v-else style="color: #909399;">未设置</span>
                      </div>
                    </el-form-item>

                    <el-form-item>
                      <el-button type="primary" :loading="submitting" @click="submitMarker" style="width: 100%;">
                        {{ editingMarker ? '更新' : '创建' }}
                      </el-button>
                    </el-form-item>
                  </el-form>
                </template>
                <template v-else>
                  <div class="empty-hint">
                    <i class="el-icon-edit-outline"></i>
                    <p>点击"新增标记点"或选择表格中的"编辑"按钮</p>
                  </div>
                </template>
              </div>
            </div>
          </div>
        </el-card>

        <!-- 未选择全景图时的提示 -->
        <el-card v-else style="height: 100%; display: flex; align-items: center; justify-content: center;">
          <el-empty description="请从左侧选择一个全景图"></el-empty>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script>
import { panoramaApi, markerApi } from '@/api';

export default {
  name: 'MarkerManage',
  data() {
    return {
      panoramas: [],
      selectedPanoramaId: null,
      selectedPanorama: null,
      markers: [],
      loadingMarkers: false,

      // 全景图查看器
      viewer: null,
      pickingPosition: false,

      // 编辑面板相关
      isAdding: false,
      editingMarker: null,
      submitting: false,
      markerForm: {
        type: 'normal',
        title: '',
        description: '',
        target_panorama_id: null,
        pitch: null,
        yaw: null
      },
      markerRules: {
        type: [{ required: true, message: '请选择标记类型', trigger: 'change' }],
        title: [{ required: true, message: '请输入标题', trigger: 'blur' }],
        target_panorama_id: [{ required: true, message: '请选择目标全景图', trigger: 'change' }]
      }
    };
  },
  computed: {
    targetPanoramas() {
      return this.panoramas.filter(p => p.id !== this.selectedPanoramaId);
    },
    /**
     * 排序后的全景图列表：主图第一，其余按标记点数倒序
     */
    sortedPanoramas() {
      return [...this.panoramas].sort((a, b) => {
        if (a.type === 'main') return -1;
        if (b.type === 'main') return 1;
        return (b.marker_count || 0) - (a.marker_count || 0);
      });
    }
  },
  async mounted() {
    await this.loadPanoramas();
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
          if (this.sortedPanoramas.length > 0) {
            this.selectPanorama(this.sortedPanoramas[0]);
          }
        }
      } catch (error) {
        this.$message.error('加载全景图列表失败');
      }
    },

    /**
     * 选择全景图
     */
    async selectPanorama(panorama) {
      this.selectedPanoramaId = panorama.id;
      this.selectedPanorama = panorama;

      // 重置编辑状态
      this.editingMarker = null;
      this.isAdding = false;
      this.pickingPosition = false;
      this.markerForm = {
        type: 'normal',
        title: '',
        description: '',
        target_panorama_id: null,
        pitch: null,
        yaw: null
      };

      await this.loadMarkers();
      this.$nextTick(() => {
        this.initViewer();
      });
    },

    /**
     * 加载标记点列表
     */
    async loadMarkers() {
      this.loadingMarkers = true;
      try {
        const res = await markerApi.getList({ panorama_id: this.selectedPanoramaId });
        if (res.success) {
          this.markers = res.data;
        }
      } catch (error) {
        this.$message.error('加载标记点列表失败');
      } finally {
        this.loadingMarkers = false;
      }
    },

    /**
     * 初始化全景图查看器
     */
    initViewer() {
      if (!this.selectedPanorama) return;

      if (this.viewer) {
        this.viewer.destroy();
      }

      const hotSpots = this.buildHotSpots();

      this.viewer = window.pannellum.viewer('marker-preview-viewer', {
        type: 'equirectangular',
        panorama: this.selectedPanorama.file_path,
        autoLoad: true,
        hotSpots: hotSpots,
        compass: true
      });

      this.viewer.on('mousedown', this.handleViewerClick);
    },

    /**
     * 构建热点数据
     */
    buildHotSpots() {
      const hotSpots = [];

      this.markers.forEach(m => {
        const cssClass = m.type === 'navigation'
          ? 'custom-marker-navigation'
          : 'custom-marker-normal';

        hotSpots.push({
          id: `marker-${m.id}`,
          pitch: parseFloat(m.pitch),
          yaw: parseFloat(m.yaw),
          type: 'custom',
          cssClass: cssClass,
          createTooltipFunc: (hotSpotDiv, args) => {
            this.createMarkerTooltip(hotSpotDiv, args);
          },
          createTooltipArgs: {
            title: m.title,
            description: m.description,
            type: m.type
          }
        });
      });

      // 如果有临时坐标（新增标记），显示临时标记点
      if (this.isAdding && this.markerForm.pitch !== null) {
        const tempClass = this.markerForm.type === 'navigation'
          ? 'custom-marker-navigation'
          : 'custom-marker-normal';

        hotSpots.push({
          id: 'temp-new-marker',
          pitch: this.markerForm.pitch,
          yaw: this.markerForm.yaw,
          type: 'custom',
          cssClass: tempClass,
          createTooltipFunc: (hotSpotDiv, args) => {
            this.createMarkerTooltip(hotSpotDiv, args);
          },
          createTooltipArgs: {
            title: this.markerForm.title || '新标记点',
            description: this.markerForm.description,
            type: this.markerForm.type
          }
        });
      }

      return hotSpots;
    },

    /**
     * 创建标记点 tooltip
     */
    createMarkerTooltip(hotSpotDiv, args) {
      const tooltip = document.createElement('div');
      tooltip.className = 'custom-tooltip';

      const typeLabel = args.type === 'navigation' ? '导航点' : '信息点';
      const typeClass = args.type === 'navigation' ? 'type-navigation' : 'type-normal';

      tooltip.innerHTML = `
        <div class="tooltip-type ${typeClass}">${typeLabel}</div>
        <div class="tooltip-title">${args.title}</div>
        ${args.description ? `<div class="tooltip-desc">${args.description}</div>` : ''}
      `;

      hotSpotDiv.appendChild(tooltip);

      hotSpotDiv.addEventListener('mouseenter', () => {
        tooltip.style.opacity = '1';
        tooltip.style.visibility = 'visible';
        tooltip.style.transform = 'translateX(-50%) translateY(-5px)';
      });
      hotSpotDiv.addEventListener('mouseleave', () => {
        tooltip.style.opacity = '0';
        tooltip.style.visibility = 'hidden';
        tooltip.style.transform = 'translateX(-50%) translateY(0)';
      });
    },

    /**
     * 处理查看器点击
     */
    handleViewerClick(event) {
      if (!this.pickingPosition) return;

      const coords = this.viewer.mouseEventToCoords(event);
      this.markerForm.pitch = coords[0];
      this.markerForm.yaw = coords[1];
      this.pickingPosition = false;

      // 局部更新热点
      this.updateTempMarker();

      this.$message.success('位置已设置');
    },

    /**
     * 局部更新临时标记点
     */
    updateTempMarker() {
      if (!this.viewer || this.markerForm.pitch === null) return;

      // 移除旧的临时标记点
      try {
        this.viewer.removeHotSpot('temp-new-marker');
      } catch (e) {}

      // 添加新的临时标记点
      const tempClass = this.markerForm.type === 'navigation'
        ? 'custom-marker-navigation'
        : 'custom-marker-normal';

      this.viewer.addHotSpot({
        id: 'temp-new-marker',
        pitch: this.markerForm.pitch,
        yaw: this.markerForm.yaw,
        type: 'custom',
        cssClass: tempClass,
        createTooltipFunc: (hotSpotDiv, args) => {
          this.createMarkerTooltip(hotSpotDiv, args);
        },
        createTooltipArgs: {
          title: this.markerForm.title || '新标记点',
          description: this.markerForm.description,
          type: this.markerForm.type
        }
      });
    },

    /**
     * 开始选择位置
     */
    startPickPosition() {
      this.pickingPosition = true;
      this.$message.info('请在全景图上点击选择标记位置');
    },

    /**
     * 标记类型改变时，更新临时标记点样式
     */
    onMarkerTypeChange() {
      if (this.markerForm.pitch !== null) {
        this.updateTempMarker();
      }
    },

    /**
     * 开始新增标记点
     */
    startAddMarker() {
      this.editingMarker = null;
      this.isAdding = true;
      this.markerForm = {
        type: 'normal',
        title: '',
        description: '',
        target_panorama_id: null,
        pitch: null,
        yaw: null
      };
      this.pickingPosition = false;
    },

    /**
     * 开始编辑标记点
     */
    startEditMarker(marker) {
      this.editingMarker = marker;
      this.isAdding = false;
      this.markerForm = {
        type: marker.type,
        title: marker.title,
        description: marker.description || '',
        target_panorama_id: marker.target_panorama_id,
        pitch: parseFloat(marker.pitch),
        yaw: parseFloat(marker.yaw)
      };
      this.pickingPosition = false;

      // 跳转到该标记点位置
      if (this.viewer) {
        this.viewer.lookAt(parseFloat(marker.pitch), parseFloat(marker.yaw), 90);
      }
    },

    /**
     * 取消编辑
     */
    cancelEdit() {
      this.editingMarker = null;
      this.isAdding = false;
      this.pickingPosition = false;
      this.markerForm = {
        type: 'normal',
        title: '',
        description: '',
        target_panorama_id: null,
        pitch: null,
        yaw: null
      };

      // 移除临时标记点
      try {
        this.viewer.removeHotSpot('temp-new-marker');
      } catch (e) {}
    },

    /**
     * 提交标记点
     */
    async submitMarker() {
      this.$refs.markerForm.validate(async (valid) => {
        if (!valid) return;

        if (this.markerForm.pitch === null || this.markerForm.yaw === null) {
          this.$message.warning('请选择标记点位置');
          return;
        }

        this.submitting = true;
        try {
          const data = {
            ...this.markerForm,
            panorama_id: this.selectedPanoramaId
          };

          if (this.editingMarker) {
            await markerApi.update(this.editingMarker.id, data);
            this.$message.success('标记点更新成功');
          } else {
            await markerApi.create(data);
            this.$message.success('标记点创建成功');
          }

          // 重置编辑状态
          this.editingMarker = null;
          this.isAdding = false;
          this.markerForm = {
            type: 'normal',
            title: '',
            description: '',
            target_panorama_id: null,
            pitch: null,
            yaw: null
          };

          // 重新加载数据
          await this.loadPanoramas();
          const current = this.panoramas.find(p => p.id === this.selectedPanoramaId);
          if (current) {
            this.selectedPanorama = current;
          }
          await this.loadMarkers();
          this.initViewer();
        } catch (error) {
          this.$message.error(error.message || '操作失败');
        } finally {
          this.submitting = false;
        }
      });
    },

    /**
     * 删除标记点
     */
    async deleteMarker(marker) {
      try {
        await this.$confirm(`确定要删除标记点 "${marker.title}" 吗？`, '提示', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        });

        const res = await markerApi.delete(marker.id);
        if (res.success) {
          this.$message.success('删除成功');

          // 如果删除的是正在编辑的标记点，重置编辑状态
          if (this.editingMarker && this.editingMarker.id === marker.id) {
            this.cancelEdit();
          }

          await this.loadPanoramas();
          const current = this.panoramas.find(p => p.id === this.selectedPanoramaId);
          if (current) {
            this.selectedPanorama = current;
          }
          await this.loadMarkers();
          this.initViewer();
        }
      } catch (error) {
        if (error !== 'cancel') {
          this.$message.error(error.message || '删除失败');
        }
      }
    }
  }
};
</script>

<style scoped>
.marker-manage {
  height: calc(100vh - 140px);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

/* 全景图列表 */
.panorama-list {
  flex: 1;
  overflow-y: auto;
}

.panorama-item {
  display: flex;
  padding: 10px;
  margin-bottom: 10px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
  border: 2px solid transparent;
}

.panorama-item:hover {
  background: #f5f7fa;
}

.panorama-item.active {
  background: #ecf5ff;
  border-color: #409eff;
}

.panorama-thumb {
  width: 80px;
  height: 50px;
  border-radius: 4px;
  flex-shrink: 0;
}

.panorama-info {
  flex: 1;
  margin-left: 10px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.panorama-name {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
  margin-bottom: 5px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.panorama-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}

.marker-count {
  font-size: 12px;
  color: #909399;
}

/* 标记点列表 */
.marker-list-container {
  margin-bottom: 15px;
  max-height: 200px;
  overflow-y: auto;
}

.coord-text {
  font-size: 12px;
  color: #606266;
  margin-right: 10px;
}

/* 底部区域 */
.bottom-area {
  flex: 1;
  display: flex;
  gap: 15px;
  min-height: 0;
}

/* 全景图预览区域 */
.preview-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  border: 1px solid #ebeef5;
  border-radius: 4px;
  overflow: hidden;
}

.preview-header {
  padding: 10px 15px;
  background: #f5f7fa;
  border-bottom: 1px solid #ebeef5;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
  color: #606266;
}

.preview-container {
  flex: 1;
  min-height: 300px;
}

#marker-preview-viewer {
  width: 100%;
  height: 100%;
}

/* 编辑面板 */
.edit-panel {
  width: 320px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  border: 1px solid #ebeef5;
  border-radius: 4px;
  overflow: hidden;
}

.edit-panel-header {
  padding: 10px 15px;
  background: #f5f7fa;
  border-bottom: 1px solid #ebeef5;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
  font-weight: 500;
  color: #303133;
}

.edit-panel-body {
  flex: 1;
  padding: 15px;
  overflow-y: auto;
}

.empty-hint {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #909399;
  text-align: center;
}

.empty-hint i {
  font-size: 48px;
  margin-bottom: 15px;
}

.empty-hint p {
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
}

/* 位置选择 */
.position-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.coord-display {
  font-size: 13px;
  color: #606266;
}

/* 卡片样式 */
.el-card {
  overflow: hidden;
}

.el-card /deep/ .el-card__body {
  flex: 1;
  overflow: auto;
  display: flex;
  flex-direction: column;
}
</style>
