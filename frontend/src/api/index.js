import axios from 'axios';

// 创建 axios 实例
const api = axios.create({
  baseURL: '/api/v1',
  timeout: 30000
});

// 请求拦截器 - 添加 Token
api.interceptors.request.use(
  config => {
    const token = localStorage.getItem('admin_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  error => {
    return Promise.reject(error);
  }
);

// 响应拦截器 - 处理错误
api.interceptors.response.use(
  response => {
    return response.data;
  },
  error => {
    if (error.response) {
      // 401 未授权
      if (error.response.status === 401) {
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_username');
        // 如果不是登录页面，则跳转到登录页
        if (window.location.pathname !== '/admin/login') {
          window.location.href = '/admin/login';
        }
      }
      return Promise.reject(error.response.data);
    }
    return Promise.reject({ message: '网络错误，请稍后重试' });
  }
);

// ==================== 认证相关 API ====================

export const authApi = {
  // 管理员登录
  login(data) {
    return api.post('/auth/login', data);
  },

  // 验证 Token
  verify() {
    return api.get('/auth/verify');
  }
};

// ==================== 全景图相关 API ====================

export const panoramaApi = {
  // 获取全景图列表
  getList(params) {
    return api.get('/panoramas', { params });
  },

  // 获取主全景图
  getMain() {
    return api.get('/panoramas/main');
  },

  // 获取单个全景图详情
  getById(id) {
    return api.get(`/panoramas/${id}`);
  },

  // 上传全景图
  upload(formData, onProgress) {
    return api.post('/panoramas', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: onProgress
    });
  },

  // 更新全景图
  update(id, data) {
    return api.put(`/panoramas/${id}`, data);
  },

  // 更新全景图（带文件）
  updateWithFile(id, formData) {
    return api.put(`/panoramas/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },

  // 删除全景图
  delete(id) {
    return api.delete(`/panoramas/${id}`);
  }
};

// ==================== 标记点相关 API ====================

export const markerApi = {
  // 获取标记点列表
  getList(params) {
    return api.get('/markers', { params });
  },

  // 获取单个标记点
  getById(id) {
    return api.get(`/markers/${id}`);
  },

  // 创建标记点
  create(data) {
    return api.post('/markers', data);
  },

  // 更新标记点
  update(id, data) {
    return api.put(`/markers/${id}`, data);
  },

  // 删除标记点
  delete(id) {
    return api.delete(`/markers/${id}`);
  }
};

// ==================== AI 导航相关 API ====================

export const aiApi = {
  // AI 导航请求
  navigate(input, currentSceneId, currentSceneName) {
    return api.post('/ai/navigate', {
      input,
      currentSceneId,
      currentSceneName
    });
  },

  // 获取可用场景列表
  getScenes() {
    return api.get('/ai/scenes');
  },

  // 获取可用标记点列表
  getMarkers() {
    return api.get('/ai/markers');
  }
};

// ==================== 版本管理相关 API ====================

export const versionApi = {
  // 获取全景图的版本列表
  getList(panoramaId) {
    return api.get(`/panoramas/${panoramaId}/versions`);
  },

  // 获取指定版本详情
  getById(panoramaId, version) {
    return api.get(`/panoramas/${panoramaId}/versions/${version}`);
  },

  // 创建新版本（上传新图片）
  create(panoramaId, formData) {
    return api.post(`/panoramas/${panoramaId}/versions`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },

  // 恢复到指定版本
  restore(panoramaId, version, data) {
    return api.put(`/panoramas/${panoramaId}/versions/${version}/restore`, data);
  },

  // 删除指定版本
  delete(panoramaId, version) {
    return api.delete(`/panoramas/${panoramaId}/versions/${version}`);
  }
};

export default api;
