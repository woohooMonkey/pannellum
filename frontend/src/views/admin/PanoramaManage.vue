<template>
  <div class="panorama-manage">
    <el-card>
      <div slot="header" class="card-header">
        <span>全景图列表</span>
        <el-button type="primary" size="small" icon="el-icon-plus" @click="showUploadDialog">
          上传全景图
        </el-button>
      </div>

      <!-- 表格 -->
      <el-table :data="panoramas" v-loading="loading" border stripe>
        <el-table-column prop="id" label="ID" width="80"></el-table-column>
        <el-table-column label="类型" width="100">
          <template slot-scope="scope">
            <el-tag :type="scope.row.type === 'main' ? 'danger' : 'info'" size="small">
              {{ scope.row.type === 'main' ? '主图' : '场景图' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="name" label="名称" min-width="150"></el-table-column>
        <el-table-column prop="description" label="描述" min-width="200" show-overflow-tooltip></el-table-column>
        <el-table-column label="当前版本" width="100">
          <template slot-scope="scope">
            <el-tag size="small" type="success">v{{ scope.row.current_version || 1 }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="预览" width="100">
          <template slot-scope="scope">
            <el-image
              :src="scope.row.file_path"
              :preview-src-list="[scope.row.file_path]"
              fit="cover"
              style="width: 60px; height: 30px;"
            ></el-image>
          </template>
        </el-table-column>
        <el-table-column prop="marker_count" label="标记点数" width="100"></el-table-column>
        <el-table-column prop="upload_time" label="上传时间" width="180">
          <template slot-scope="scope">
            {{ formatDate(scope.row.upload_time) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="240" fixed="right">
          <template slot-scope="scope">
            <el-button type="text" size="small" @click="showEditDialog(scope.row)">编辑</el-button>
            <el-button
              type="text"
              size="small"
              @click="showVersionDialog(scope.row)"
            >
              版本历史
            </el-button>
            <el-button
              type="text"
              size="small"
              @click="setAsMain(scope.row)"
              :disabled="scope.row.type === 'main'"
            >
              设为主图
            </el-button>
            <el-button type="text" size="small" @click="handleDelete(scope.row)" style="color: #F56C6C;">
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 上传对话框 -->
    <el-dialog title="上传全景图" :visible.sync="uploadDialogVisible" width="500px" :close-on-click-modal="false">
      <el-form ref="uploadForm" :model="uploadForm" :rules="uploadRules" label-width="80px">
        <el-form-item label="文件" prop="file">
          <el-upload
            ref="upload"
            action="#"
            :auto-upload="false"
            :limit="1"
            accept="image/jpeg,image/jpg,image/png"
            :on-change="handleFileChange"
            :on-remove="handleFileRemove"
            :file-list="fileList"
          >
            <el-button size="small" type="primary">选择文件</el-button>
            <div slot="tip" class="el-upload__tip">只支持 JPG/PNG 格式，最大 50MB</div>
          </el-upload>
        </el-form-item>
        <el-form-item label="名称" prop="name">
          <el-input v-model="uploadForm.name" placeholder="请输入全景图名称"></el-input>
        </el-form-item>
        <el-form-item label="类型" prop="type">
          <el-radio-group v-model="uploadForm.type">
            <el-radio label="scene">场景图</el-radio>
            <el-radio label="main">主图</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="描述">
          <el-input type="textarea" v-model="uploadForm.description" :rows="3" placeholder="请输入描述"></el-input>
        </el-form-item>
      </el-form>
      <span slot="footer">
        <el-button @click="uploadDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="uploading" @click="handleUpload">确定上传</el-button>
      </span>
    </el-dialog>

    <!-- 编辑对话框 -->
    <el-dialog title="编辑全景图" :visible.sync="editDialogVisible" width="500px" :close-on-click-modal="false">
      <el-form ref="editForm" :model="editForm" :rules="editRules" label-width="80px">
        <el-form-item label="当前图片">
          <div class="current-image">
            <el-image
              :src="editForm.currentFilePath"
              fit="cover"
              style="width: 100%; height: 120px;"
            ></el-image>
          </div>
        </el-form-item>
        <el-form-item label="更换图片">
          <el-upload
            ref="editUpload"
            action="#"
            :auto-upload="false"
            :limit="1"
            accept="image/jpeg,image/jpg,image/png"
            :on-change="handleEditFileChange"
            :on-remove="handleEditFileRemove"
            :file-list="editFileList"
          >
            <el-button size="small" type="primary">选择新图片</el-button>
            <div slot="tip" class="el-upload__tip">不选择则保留原图片，支持 JPG/PNG 格式，最大 50MB</div>
          </el-upload>
        </el-form-item>
        <el-form-item label="变更说明" v-if="editForm.file">
          <el-input
            type="textarea"
            v-model="editForm.changeDescription"
            :rows="2"
            placeholder="请输入版本变更说明（可选）"
          ></el-input>
        </el-form-item>
        <el-form-item label="名称" prop="name">
          <el-input v-model="editForm.name" placeholder="请输入全景图名称"></el-input>
        </el-form-item>
        <el-form-item label="类型" prop="type">
          <el-radio-group v-model="editForm.type">
            <el-radio label="scene">场景图</el-radio>
            <el-radio label="main">主图</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="描述">
          <el-input type="textarea" v-model="editForm.description" :rows="3" placeholder="请输入描述"></el-input>
        </el-form-item>
      </el-form>
      <span slot="footer">
        <el-button @click="editDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleEdit">保存</el-button>
      </span>
    </el-dialog>

    <!-- 版本历史对话框 -->
    <el-dialog title="版本历史" :visible.sync="versionDialogVisible" width="600px" :close-on-click-modal="false">
      <div class="version-dialog-content">
        <el-table :data="versionList" v-loading="versionLoading" border stripe>
          <el-table-column prop="version" label="版本号" width="80"></el-table-column>
          <el-table-column prop="file_path" label="预览" min-width="100">
            <template slot-scope="scope">
              <el-image
                :src="scope.row.file_path"
                :preview-src-list="[scope.row.file_path]"
                fit="cover"
                style="width: 60px; height: 30px;"
              ></el-image>
            </template>
          </el-table-column>
          <el-table-column prop="change_description" label="变更说明" min-width="150"></el-table-column>
          <el-table-column prop="create_time" label="创建时间" width="180">
            <template slot-scope="scope">
              {{ formatDate(scope.row.create_time) }}
            </template>
          </el-table-column>
          <el-table-column label="操作" width="150">
            <template slot-scope="scope">
              <el-button
                type="text"
                size="small"
                @click="handleRestoreVersion(scope.row)"
                :disabled="scope.row.version === panoramaCurrentVersion"
              >
                恢复
              </el-button>
              <el-button
                type="text"
                size="small"
                @click="handleDeleteVersion(scope.row)"
                style="color: #F56C6C"
              >
                删除
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
      <span slot="footer">
        <el-button @click="versionDialogVisible = false">关闭</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
import { panoramaApi, versionApi } from '@/api';

export default {
  name: 'PanoramaManage',
  data() {
    return {
      panoramas: [],
      loading: false,

      // 上传相关
      uploadDialogVisible: false,
      uploading: false,
      fileList: [],
      uploadForm: {
        name: '',
        type: 'scene',
        description: '',
        file: null
      },
      uploadRules: {
        name: [{ required: true, message: '请输入名称', trigger: 'blur' }],
        type: [{ required: true, message: '请选择类型', trigger: 'change' }]
      },

      // 编辑相关
      editDialogVisible: false,
      saving: false,
      editFileList: [],
      editForm: {
        id: null,
        name: '',
        type: '',
        description: '',
        currentFilePath: '',
        file: null,
      },
      editRules: {
        name: [{ required: true, message: '请输入名称', trigger: 'blur' }],
        type: [{ required: true, message: '请选择类型', trigger: 'change' }]
      },

      // 版本历史相关
      versionDialogVisible: false,
      versionList: [],
      versionLoading: false,
      panoramaCurrentVersion: null
    };
  },
  mounted() {
    this.loadPanoramas();
  },
  methods: {
    /**
     * 加载全景图列表
     */
    async loadPanoramas() {
      this.loading = true;
      try {
        const res = await panoramaApi.getList();
        if (res.success) {
          this.panoramas = res.data;
        }
      } catch (error) {
        this.$message.error('加载全景图列表失败');
      } finally {
        this.loading = false;
      }
    },

    /**
     * 显示上传对话框
     */
    showUploadDialog() {
      this.fileList = [];
      this.uploadForm = {
        name: '',
        type: 'scene',
        description: '',
        file: null
      };
      this.uploadDialogVisible = true;
    },

    /**
     * 文件选择变化
     */
    handleFileChange(file, fileList) {
      this.uploadForm.file = file.raw;
      // 自动填充名称
      if (!this.uploadForm.name) {
        const fileName = file.name.replace(/\.[^/.]+$/, '');
        this.uploadForm.name = fileName;
      }
    },

    /**
     * 文件移除
     */
    handleFileRemove() {
      this.uploadForm.file = null;
    },

    /**
     * 上传全景图
     */
    async handleUpload() {
      this.$refs.uploadForm.validate(async (valid) => {
        if (!valid) return;

        if (!this.uploadForm.file) {
          this.$message.warning('请选择文件');
          return;
        }

        this.uploading = true;
        const formData = new FormData();
        formData.append('file', this.uploadForm.file);
        formData.append('name', this.uploadForm.name);
        formData.append('type', this.uploadForm.type);
        formData.append('description', this.uploadForm.description || '');

        try {
          const res = await panoramaApi.upload(formData);
          if (res.success) {
            this.$message.success('上传成功');
            this.uploadDialogVisible = false;
            this.loadPanoramas();
          }
        } catch (error) {
          this.$message.error(error.message || '上传失败');
        } finally {
          this.uploading = false;
        }
      });
    },

    /**
     * 显示编辑对话框
     */
    showEditDialog(row) {
      this.editFileList = [];
      this.editForm = {
        id: row.id,
        name: row.name,
        type: row.type,
        description: row.description || '',
        currentFilePath: row.file_path,
        file: null,
      };
      this.editDialogVisible = true;
    },

    /**
     * 编辑时文件选择变化
     */
    handleEditFileChange(file, fileList) {
      this.editForm.file = file.raw;
    },

    /**
     * 编辑时文件移除
     */
    handleEditFileRemove() {
      this.editForm.file = null;
    },

    /**
     * 保存编辑
     */
    async handleEdit() {
      this.$refs.editForm.validate(async (valid) => {
        if (!valid) return;

        this.saving = true;
        try {
          let res;
          // 如果选择了新文件，使用 FormData 上传
          if (this.editForm.file) {
            const formData = new FormData();
            formData.append('file', this.editForm.file);
            formData.append('name', this.editForm.name);
            formData.append('type', this.editForm.type);
            formData.append('description', this.editForm.description || '');
            formData.append('change_description', this.editForm.changeDescription || '');

            res = await panoramaApi.updateWithFile(this.editForm.id, formData);
          } else {
            res = await panoramaApi.update(this.editForm.id, {
              name: this.editForm.name,
              type: this.editForm.type,
              description: this.editForm.description
            });
          }

          if (res.success) {
            this.$message.success('保存成功');
            this.editDialogVisible = false;
            this.loadPanoramas();
          }
        } catch (error) {
          this.$message.error(error.message || '保存失败');
        } finally {
          this.saving = false;
        }
      });
    },

    /**
     * 设置为主图
     */
    async setAsMain(row) {
      if (row.type === 'main') return;
      try {
        const res = await panoramaApi.update(row.id, {
          name: row.name,
          description: row.description,
          type: 'main'
        });
        if (res.success) {
          this.$message.success('已设为主图');
          this.loadPanoramas();
        }
      } catch (error) {
        this.$message.error(error.message || '设置失败');
      }
    },

    /**
     * 删除全景图
     */
    async handleDelete(row) {
      try {
        await this.$confirm(`确定要删除全景图 "${row.name}" 吗？关联的标记点也会被删除。`, '提示', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        });

        const res = await panoramaApi.delete(row.id);
        if (res.success) {
          this.$message.success('删除成功');
          this.loadPanoramas();
        }
      } catch (error) {
        if (error !== 'cancel') {
          this.$message.error(error.message || '删除失败');
        }
      }
    },

    /**
     * 格式化日期
     */
    formatDate(dateStr) {
      if (!dateStr) return '';
      const date = new Date(dateStr);
      return date.toLocaleString('zh-CN');
    },

    // ==================== 版本历史相关方法 ====================

    /**
     * 显示版本历史对话框
     */
    async showVersionDialog(row) {
      this.versionList = [];
      this.versionLoading = true;
      this.panoramaCurrentVersion = row.current_version;
      this.versionDialogVisible = true;
      try {
        const res = await versionApi.getList(row.id);
        if (res.success) {
          this.versionList = res.data.versions;
        }
      } catch (error) {
        this.$message.error('获取版本历史失败');
      } finally {
        this.versionLoading = false;
      }
    },

    /**
     * 恢复到指定版本
     */
    async handleRestoreVersion(row) {
      try {
        await this.$confirm(`确定恢复到版本 ${row.version} 吗?`, '提示', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        });

        const description = row.change_description || `恢复自版本 ${row.version}`;
        const res = await versionApi.restore(row.panorama_id, row.version, { change_description: description });
        if (res.success) {
          this.$message.success('恢复成功');
          this.versionDialogVisible = false;
          this.loadPanoramas();
        }
      } catch (error) {
        if (error !== 'cancel') {
          this.$message.error(error.message || '恢复失败');
        }
      }
    },

    /**
     * 删除指定版本
     */
    async handleDeleteVersion(row) {
      try {
        await this.$confirm(`确定删除版本 ${row.version} 吗?`, '提示', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        });

        const res = await versionApi.delete(row.panorama_id, row.version);
        if (res.success) {
          this.$message.success('版本删除成功');
          this.showVersionDialog({ id: row.panorama_id, });
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
.panorama-manage {
  height: 100%;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.current-image {
  width: 100%;
  border-radius: 4px;
  overflow: hidden;
  border: 1px solid #dcdfe6;
}
</style>
