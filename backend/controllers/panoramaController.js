const db = require('../config/db');
const path = require('path');
const fs = require('fs');

/**
 * 获取全景图列表
 * GET /api/v1/panoramas
 * 查询参数: type (可选，筛选类型 main/scene)
 */
async function list(req, res) {
  try {
    let query = 'SELECT * FROM panoramas';
    const params = [];

    if (req.query.type) {
      query += ' WHERE type = ?';
      params.push(req.query.type);
    }

    query += ' ORDER BY create_time DESC';

    const [rows] = await db.query(query, params);

    // 为每个全景图添加标记点数量
    for (const panorama of rows) {
      const [markers] = await db.query(
        'SELECT COUNT(*) as count FROM markers WHERE panorama_id = ?',
        [panorama.id]
      );
      panorama.marker_count = markers[0].count;
    }

    res.json({
      success: true,
      data: rows
    });
  } catch (error) {
    console.error('获取全景图列表错误:', error);
    res.status(500).json({
      success: false,
      message: '获取全景图列表失败'
    });
  }
}

/**
 * 获取主全景图
 * GET /api/v1/panoramas/main
 */
async function getMain(req, res) {
  try {
    const [rows] = await db.query('SELECT * FROM panoramas WHERE type = "main" LIMIT 1');

    if (rows.length === 0) {
      return res.json({
        success: false,
        message: '暂无主全景图',
        data: null
      });
    }

    const panorama = rows[0];

    // 获取关联的标记点
    const [markers] = await db.query(
      'SELECT * FROM markers WHERE panorama_id = ?',
      [panorama.id]
    );
    panorama.markers = markers;

    res.json({
      success: true,
      data: panorama
    });
  } catch (error) {
    console.error('获取主全景图错误:', error);
    res.status(500).json({
      success: false,
      message: '获取主全景图失败'
    });
  }
}

/**
 * 获取单个全景图详情
 * GET /api/v1/panoramas/:id
 */
async function getById(req, res) {
  try {
    const [rows] = await db.query('SELECT * FROM panoramas WHERE id = ?', [req.params.id]);

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '全景图不存在'
      });
    }

    const panorama = rows[0];

    // 获取关联的标记点
    const [markers] = await db.query(
      'SELECT * FROM markers WHERE panorama_id = ?',
      [panorama.id]
    );
    panorama.markers = markers;

    res.json({
      success: true,
      data: panorama
    });
  } catch (error) {
    console.error('获取全景图详情错误:', error);
    res.status(500).json({
      success: false,
      message: '获取全景图详情失败'
    });
  }
}

/**
 * 上传全景图
 * POST /api/v1/panoramas
 * 使用 multer 处理文件上传
 */
async function create(req, res) {
  try {
    const { name, description, type } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({
        success: false,
        message: '请上传全景图文件'
      });
    }

    if (!name) {
      return res.status(400).json({
        success: false,
        message: '全景图名称不能为空'
      });
    }

    const filePath = `/uploads/panoramas/${file.filename}`;
    const panoramaType = type || 'scene';

    // 如果设置为主图，先取消其他主图
    if (panoramaType === 'main') {
      await db.query('UPDATE panoramas SET type = "scene" WHERE type = "main"');
    }

    // 开始事务
    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
      // 插入全景图记录（初始版本为1）
      const [result] = await connection.query(
        'INSERT INTO panoramas (type, name, description, file_path, current_version) VALUES (?, ?, ?, ?, 1)',
        [panoramaType, name, description || '', filePath]
      );

      const panoramaId = result.insertId;

      // 创建初始版本记录
      await connection.query(
        'INSERT INTO panorama_versions (panorama_id, version, file_path, change_description) VALUES (?, ?, ?, ?)',
        [panoramaId, 1, filePath, '初始版本']
      );

      await connection.commit();

      res.status(201).json({
        success: true,
        message: '全景图上传成功',
        data: {
          id: panoramaId,
          type: panoramaType,
          name,
          description,
          file_path: filePath,
          current_version: 1
        }
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('上传全景图错误:', error);
    res.status(500).json({
      success: false,
      message: '上传全景图失败'
    });
  }
}

/**
 * 更新全景图信息
 * PUT /api/v1/panoramas/:id
 * 支持更换图片文件（会创建新版本）
 */
async function update(req, res) {
  try {
    const { id } = req.params;
    const { name, description, type, change_description } = req.body;
    const file = req.file;

    // 检查全景图是否存在
    const [existing] = await db.query('SELECT * FROM panoramas WHERE id = ?', [id]);

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: '全景图不存在'
      });
    }

    // 如果设置为主图，先取消其他主图
    if (type === 'main') {
      await db.query('UPDATE panoramas SET type = "scene" WHERE type = "main"');
    }

    // 如果上传了新文件，创建新版本（保留旧文件）
    let filePath = existing[0].file_path;
    let newVersion = existing[0].current_version || 1;

    if (file) {
      // 获取最大版本号
      const [maxVersion] = await db.query(
        'SELECT MAX(version) as max_version FROM panorama_versions WHERE panorama_id = ?',
        [id]
      );
      newVersion = (maxVersion[0].max_version || 0) + 1;
      filePath = `/uploads/panoramas/${file.filename}`;

      // 开始事务
      const connection = await db.getConnection();
      await connection.beginTransaction();

      try {
        // 插入新版本记录
        await connection.query(
          'INSERT INTO panorama_versions (panorama_id, version, file_path, change_description) VALUES (?, ?, ?, ?)',
          [id, newVersion, filePath, change_description || '']
        );

        // 更新全景图表的当前版本和文件路径
        await connection.query(
          'UPDATE panoramas SET name = ?, description = ?, type = ?, current_version = ?, file_path = ? WHERE id = ?',
          [name, description || '', type || existing[0].type, newVersion, filePath, id]
        );

        await connection.commit();
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    } else {
      // 没有上传新文件，只更新基本信息
      await db.query(
        'UPDATE panoramas SET name = ?, description = ?, type = ? WHERE id = ?',
        [name, description || '', type || existing[0].type, id]
      );
    }

    res.json({
      success: true,
      message: '全景图更新成功',
      data: {
        file_path: filePath,
        current_version: newVersion
      }
    });
  } catch (error) {
    console.error('更新全景图错误:', error);
    res.status(500).json({
      success: false,
      message: '更新全景图失败'
    });
  }
}

/**
 * 删除全景图
 * DELETE /api/v1/panoramas/:id
 */
async function remove(req, res) {
  try {
    const { id } = req.params;

    // 获取全景图信息（用于删除文件）
    const [existing] = await db.query('SELECT * FROM panoramas WHERE id = ?', [id]);

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: '全景图不存在'
      });
    }

    // 删除数据库记录（标记点会级联删除）
    await db.query('DELETE FROM panoramas WHERE id = ?', [id]);

    // 删除文件
    const filePath = path.join(__dirname, '..', existing[0].file_path);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    res.json({
      success: true,
      message: '全景图删除成功'
    });
  } catch (error) {
    console.error('删除全景图错误:', error);
    res.status(500).json({
      success: false,
      message: '删除全景图失败'
    });
  }
}

module.exports = {
  list,
  getMain,
  getById,
  create,
  update,
  remove
};
