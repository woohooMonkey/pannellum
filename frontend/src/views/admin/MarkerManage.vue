<template>
  <div class="marker-manage">
    <el-row :gutter="20" style="height: 100%;">
      <!-- 左侧：标记点列表 -->
      <el-col :span="10" style="height: 100%;">
        <el-card style="height: 100%; display: flex; flex-direction: column;">
          <div slot="header" class="card-header">
            <span>标记点列表</span>
            <el-button type="primary" size="small" icon="el-icon-plus" @click="showAddForm">
              添加标记点
            </el-button>
          </div>

          <!-- 筛选 -->
          <div class="filter-bar">
            <el-select v-model="filterPanoramaId" placeholder="筛选全景图" clearable size="small" @change="loadMarkers">
              <el-option
                v-for="item in panoramas"
                :key="item.id"
                :label="item.name"
                :value="item.id">
              </el-option>
            </el-select>
          </div>

          <!-- 列表 -->
          <el-table
            :data="markers"
            v-loading="loading"
            border
            stripe
            size="small"
            style="flex: 1; overflow: auto;"
            @row-click="selectMarker"
            :row-class-name="getRowClassName"
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
            <el-table-column prop="panorama_name" label="所属全景" min-width="100" show-overflow-tooltip></el-table-column>
            <el-table-column label="操作" width="100" fixed="right">
              <template slot-scope="scope">
                <el-button type="text" size="mini" @click.stop="editMarker(scope.row)">编辑</el-button>
                <el-button type="text" size="mini" style="color: #F56C6C;" @click.stop="deleteMarker(scope.row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>

      <!-- 右侧：标记点编辑器 -->
      <el-col :span="14" style="height: 100%;">
        <el-card style="height: 100%;">
          <div slot="header">
            <span>{{ editingMarker ? '编辑标记点' : '添加标记点' }}</span>
          </div>
          <marker-editor
            ref="markerEditor"
            :marker="editingMarker"
            @success="onMarkerSuccess"
            @cancel="cancelEdit"
          />
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script>
import { panoramaApi, markerApi } from '@/api';
import MarkerEditor from '@/components/MarkerEditor.vue';

export default {
  name: 'MarkerManage',
  components: {
    MarkerEditor
  },
  data() {
    return {
      panoramas: [],
      markers: [],
      loading: false,
      filterPanoramaId: null,
      editingMarker: null
    };
  },
  async mounted() {
    await this.loadPanoramas();
    await this.loadMarkers();
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
        this.$message.error('加载全景图列表失败');
      }
    },

    /**
     * 加载标记点列表
     */
    async loadMarkers() {
      this.loading = true;
      try {
        const params = {};
        if (this.filterPanoramaId) {
          params.panorama_id = this.filterPanoramaId;
        }
        const res = await markerApi.getList(params);
        if (res.success) {
          this.markers = res.data;
        }
      } catch (error) {
        this.$message.error('加载标记点列表失败');
      } finally {
        this.loading = false;
      }
    },

    /**
     * 显示添加表单
     */
    showAddForm() {
      this.editingMarker = null;
    },

    /**
     * 选择标记点
     */
    selectMarker(row) {
      this.editingMarker = row;
    },

    /**
     * 编辑标记点
     */
    editMarker(row) {
      this.editingMarker = { ...row };
    },

    /**
     * 删除标记点
     */
    async deleteMarker(row) {
      try {
        await this.$confirm(`确定要删除标记点 "${row.title}" 吗？`, '提示', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        });

        const res = await markerApi.delete(row.id);
        if (res.success) {
          this.$message.success('删除成功');
          if (this.editingMarker && this.editingMarker.id === row.id) {
            this.editingMarker = null;
          }
          this.loadMarkers();
        }
      } catch (error) {
        if (error !== 'cancel') {
          this.$message.error(error.message || '删除失败');
        }
      }
    },

    /**
     * 标记点操作成功
     */
    onMarkerSuccess() {
      this.editingMarker = null;
      this.loadMarkers();
    },

    /**
     * 取消编辑
     */
    cancelEdit() {
      this.editingMarker = null;
    },

    /**
     * 获取行样式
     */
    getRowClassName({ row }) {
      if (this.editingMarker && this.editingMarker.id === row.id) {
        return 'selected-row';
      }
      return '';
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

.filter-bar {
  margin-bottom: 15px;
}

.el-card {
  overflow: hidden;
}

.el-card /deep/ .el-card__body {
  flex: 1;
  overflow: auto;
  display: flex;
  flex-direction: column;
}

/deep/ .selected-row {
  background-color: #ecf5ff !important;
}
</style>
