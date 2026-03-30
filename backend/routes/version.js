/**
 * 版本管理路由
 * 处理全景图版本相关的路由
 */
const express = require('express');
const router = express.Router({ mergeParams: true });
const multer = require('multer');
const path = require('path');
const versionController = require('../controllers/versionController');
const authMiddleware = require('../middleware/auth');

// 配置 multer 文件上传
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../uploads/panoramas'));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'panorama-v' + uniqueSuffix + ext);
  }
});

// 文件类型过滤
const fileFilter = function (req, file, cb) {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('只支持 JPG 和 PNG 格式的图片'));
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024  // 50MB
  }
});

// ==================== 公开接口 ====================

// 获取版本列表
router.get('/', versionController.listVersions);

// 获取指定版本详情
router.get('/:version', versionController.getVersionById);

// ==================== 需要鉴权的接口 ====================

// 创建新版本（上传新图片）
router.post('/', authMiddleware, upload.single('file'), versionController.createVersion);

// 恢复到指定版本
router.put('/:version/restore', authMiddleware, versionController.restoreVersion);

// 删除指定版本
router.delete('/:version', authMiddleware, versionController.deleteVersion);

module.exports = router;
