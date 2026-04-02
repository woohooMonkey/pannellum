const express = require('express');
const router = express.Router();
const navigationController = require('../controllers/navigationController');

/**
 * 导航相关路由
 */

// 获取场景连通图
router.get('/scene-graph', navigationController.getSceneGraph);

// 查找最短路径
router.post('/find-path', navigationController.findPath);

// 获取指定场景的标记点
router.get('/markers/:sceneId', navigationController.getMarkersByScene);

// 获取所有导航点
router.get('/navigation-markers', navigationController.getNavigationMarkers);

// 计算导航路径（用于AI导航）
router.post('/calculate-path', navigationController.calculatePath);

module.exports = router;