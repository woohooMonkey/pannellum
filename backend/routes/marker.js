const express = require('express');
const router = express.Router();
const markerController = require('../controllers/markerController');
const authMiddleware = require('../middleware/auth');

// 公开接口（无需鉴权）
router.get('/', markerController.list);
router.get('/:id', markerController.getById);

// 需要鉴权的接口
router.post('/', authMiddleware, markerController.create);
router.put('/:id', authMiddleware, markerController.update);
router.delete('/:id', authMiddleware, markerController.remove);

module.exports = router;
