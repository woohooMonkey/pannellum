const express = require('express');
const aiController = require('../controllers/aiController');

const router = express.Router();

/**
 * AI 导航路由
 */

// POST /api/v1/ai/navigate - 处理导航请求
router.post('/navigate', aiController.navigate);

// POST /api/v1/ai/route - 获取导航路线
router.post('/route', aiController.getRoute);

// GET /api/v1/ai/scenes - 获取场景列表
router.get('/scenes', aiController.getScenes);

// GET /api/v1/ai/markers - 获取标记点列表
router.get('/markers', aiController.getMarkers);

module.exports = router;
