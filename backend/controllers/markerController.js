const db = require('../config/db');

/**
 * 获取标记点列表
 * GET /api/v1/markers
 * 查询参数: panorama_id (可选，筛选特定全景图的标记点)
 */
async function list(req, res) {
  try {
    let query = `
      SELECT m.*, p.name as panorama_name, tp.name as target_panorama_name
      FROM markers m
      LEFT JOIN panoramas p ON m.panorama_id = p.id
      LEFT JOIN panoramas tp ON m.target_panorama_id = tp.id
    `;
    const params = [];

    if (req.query.panorama_id) {
      query += ' WHERE m.panorama_id = ?';
      params.push(req.query.panorama_id);
    }

    query += ' ORDER BY m.create_time DESC';

    const [rows] = await db.query(query, params);

    res.json({
      success: true,
      data: rows
    });
  } catch (error) {
    console.error('获取标记点列表错误:', error);
    res.status(500).json({
      success: false,
      message: '获取标记点列表失败'
    });
  }
}

/**
 * 获取单个标记点详情
 * GET /api/v1/markers/:id
 */
async function getById(req, res) {
  try {
    const [rows] = await db.query(
      `SELECT m.*, p.name as panorama_name, tp.name as target_panorama_name
       FROM markers m
       LEFT JOIN panoramas p ON m.panorama_id = p.id
       LEFT JOIN panoramas tp ON m.target_panorama_id = tp.id
       WHERE m.id = ?`,
      [req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '标记点不存在'
      });
    }

    res.json({
      success: true,
      data: rows[0]
    });
  } catch (error) {
    console.error('获取标记点详情错误:', error);
    res.status(500).json({
      success: false,
      message: '获取标记点详情失败'
    });
  }
}

/**
 * 创建标记点
 * POST /api/v1/markers
 */
async function create(req, res) {
  try {
    const { panorama_id, type, title, description, target_panorama_id, pitch, yaw } = req.body;

    // 验证必填字段
    if (!panorama_id || !title || pitch === undefined || yaw === undefined) {
      return res.status(400).json({
        success: false,
        message: '全景图ID、标题、pitch 和 yaw 为必填项'
      });
    }

    // 验证全景图是否存在
    const [panorama] = await db.query('SELECT id FROM panoramas WHERE id = ?', [panorama_id]);

    if (panorama.length === 0) {
      return res.status(400).json({
        success: false,
        message: '关联的全景图不存在'
      });
    }

    // 如果是导航点，验证目标全景图是否存在
    if (type === 'navigation') {
      if (!target_panorama_id) {
        return res.status(400).json({
          success: false,
          message: '导航点必须指定目标全景图'
        });
      }

      const [targetPanorama] = await db.query('SELECT id FROM panoramas WHERE id = ?', [target_panorama_id]);

      if (targetPanorama.length === 0) {
        return res.status(400).json({
          success: false,
          message: '目标全景图不存在'
        });
      }
    }

    const [result] = await db.query(
      `INSERT INTO markers (panorama_id, type, title, description, target_panorama_id, pitch, yaw)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [panorama_id, type || 'normal', title, description || '', target_panorama_id || null, pitch, yaw]
    );

    res.status(201).json({
      success: true,
      message: '标记点创建成功',
      data: {
        id: result.insertId,
        panorama_id,
        type: type || 'normal',
        title,
        description,
        target_panorama_id,
        pitch,
        yaw
      }
    });
  } catch (error) {
    console.error('创建标记点错误:', error);
    res.status(500).json({
      success: false,
      message: '创建标记点失败'
    });
  }
}

/**
 * 更新标记点
 * PUT /api/v1/markers/:id
 */
async function update(req, res) {
  try {
    const { id } = req.params;
    const { panorama_id, type, title, description, target_panorama_id, pitch, yaw } = req.body;

    // 检查标记点是否存在
    const [existing] = await db.query('SELECT * FROM markers WHERE id = ?', [id]);

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: '标记点不存在'
      });
    }

    // 如果是导航点，验证目标全景图
    if (type === 'navigation' && target_panorama_id) {
      const [targetPanorama] = await db.query('SELECT id FROM panoramas WHERE id = ?', [target_panorama_id]);

      if (targetPanorama.length === 0) {
        return res.status(400).json({
          success: false,
          message: '目标全景图不存在'
        });
      }
    }

    await db.query(
      `UPDATE markers SET
        panorama_id = ?,
        type = ?,
        title = ?,
        description = ?,
        target_panorama_id = ?,
        pitch = ?,
        yaw = ?
       WHERE id = ?`,
      [
        panorama_id || existing[0].panorama_id,
        type || existing[0].type,
        title || existing[0].title,
        description !== undefined ? description : existing[0].description,
        type === 'navigation' ? target_panorama_id : null,
        pitch !== undefined ? pitch : existing[0].pitch,
        yaw !== undefined ? yaw : existing[0].yaw,
        id
      ]
    );

    res.json({
      success: true,
      message: '标记点更新成功'
    });
  } catch (error) {
    console.error('更新标记点错误:', error);
    res.status(500).json({
      success: false,
      message: '更新标记点失败'
    });
  }
}

/**
 * 删除标记点
 * DELETE /api/v1/markers/:id
 */
async function remove(req, res) {
  try {
    const { id } = req.params;

    // 检查标记点是否存在
    const [existing] = await db.query('SELECT * FROM markers WHERE id = ?', [id]);

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: '标记点不存在'
      });
    }

    await db.query('DELETE FROM markers WHERE id = ?', [id]);

    res.json({
      success: true,
      message: '标记点删除成功'
    });
  } catch (error) {
    console.error('删除标记点错误:', error);
    res.status(500).json({
      success: false,
      message: '删除标记点失败'
    });
  }
}

module.exports = {
  list,
  getById,
  create,
  update,
  remove
};
