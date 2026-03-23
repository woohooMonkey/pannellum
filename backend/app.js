const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// 导入路由
const authRoutes = require('./routes/auth');
const panoramaRoutes = require('./routes/panorama');
const markerRoutes = require('./routes/marker');
const aiRoutes = require('./routes/ai');

const app = express();

// 中间件配置
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 静态文件服务（用于访问上传的全景图）
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API 路由
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/panoramas', panoramaRoutes);
app.use('/api/v1/markers', markerRoutes);
app.use('/api/v1/ai', aiRoutes);

// 健康检查接口
app.get('/api/v1/health', (req, res) => {
  res.json({
    success: true,
    message: '服务运行正常',
    timestamp: new Date().toISOString()
  });
});

// 根路径
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: '全景图管理系统 API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/v1/auth',
      panoramas: '/api/v1/panoramas',
      markers: '/api/v1/markers'
    }
  });
});

// 404 处理
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: '请求的资源不存在'
  });
});

// 全局错误处理
app.use((err, req, res, next) => {
  console.error('服务器错误:', err);

  // Multer 错误处理
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      message: '文件大小超过限制（最大 50MB）'
    });
  }

  if (err.message === '只支持 JPG 和 PNG 格式的图片') {
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }

  res.status(500).json({
    success: false,
    message: '服务器内部错误'
  });
});

// 启动服务器
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
  console.log('==========================================');
  console.log('全景图管理系统 API 已启动');
  console.log('==========================================');
});

module.exports = app;
