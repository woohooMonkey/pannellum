const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const panoramaController = require('../controllers/panoramaController');
const authMiddleware = require('../middleware/auth');

// 配置 multer 文件上传
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../uploads/panoramas'));
  },
  filename: function (req, file, cb) {
    // 使用时间戳 + 随机数生成唯一文件名
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'panorama-' + uniqueSuffix + ext);
  }
});

// 文件过滤器（只允许图片）
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
    fileSize: 50 * 1024 * 1024 // 限制 50MB
  }
});

// 公开接口（无需鉴权）
router.get('/', panoramaController.list);
router.get('/main', panoramaController.getMain);
router.get('/:id', panoramaController.getById);

// 需要鉴权的接口
router.post('/', authMiddleware, upload.single('file'), panoramaController.create);
router.put('/:id', authMiddleware, panoramaController.update);
router.delete('/:id', authMiddleware, panoramaController.remove);

module.exports = router;
