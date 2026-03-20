const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');

// 登录接口（无需鉴权）
router.post('/login', authController.login);

// 验证 Token 接口（需要鉴权）
router.get('/verify', authMiddleware, authController.verify);

module.exports = router;
