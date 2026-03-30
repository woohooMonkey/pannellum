/**
 * 版本管理控制器
 * 处理全景图版本相关的业务逻辑
 */
const db = require('../config/db');
const path = require('path');
const fs = require('fs');

/**
 * 获取全景图的所有版本列表
 * GET /api/v1/panoramas/:id/versions
 */
async function listVersions(req, res) {
  try {
    const { id } = req.params;

    // 检查全景图是否存在
    const [panorama] = await db.query('SELECT * FROM panoramas WHERE id = ?', [id]);
    if (panorama.length === 0) {
      return res.status(404).json({
        success: false,
        message: '全景图不存在'
      });
    }

    // 获取所有版本
    const [versions] = await db.query(
      'SELECT * FROM panorama_versions WHERE panorama_id = ? ORDER BY version DESC',
      [id]
    );

    res.json({
      success: true,
      data: {
        panorama: panorama[0],
        versions: versions
      }
    });
  } catch (error) {
    console.error('获取版本列表错误:', error);
    res.status(500).json({
      success: false,
      message: '获取版本列表失败'
    });
  }
}

/**
 * 获取指定版本详情（包含标记点）
 * GET /api/v1/panoramas/:id/versions/:version
 */
async function getVersionById(req, res) {
  try {
    const { id, version } = req.params;

    // 获取版本信息
    const [versionRows] = await db.query(
      'SELECT * FROM panorama_versions WHERE panorama_id = ? AND version = ?',
      [id, version]
    );

    if (versionRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '版本不存在'
      });
    }

    // 获取全景图基础信息
    const [panorama] = await db.query('SELECT * FROM panoramas WHERE id = ?', [id]);

    // 获取标记点（标记点与全景图关联，不区分版本）
    const [markers] = await db.query(
      `SELECT m.*,
        p.name as panorama_name,
        tp.name as target_panorama_name
       FROM markers m
       LEFT JOIN panoramas p ON m.panorama_id = p.id
       LEFT JOIN panoramas tp ON m.target_panorama_id = tp.id
       WHERE m.panorama_id = ?`,
      [id]
    );

    res.json({
      success: true,
      data: {
        ...panorama[0],
        file_path: versionRows[0].file_path,
        version: parseInt(version),
        version_info: versionRows[0],
        markers: markers
      }
    });
  } catch (error) {
    console.error('获取版本详情错误:', error);
    res.status(500).json({
      success: false,
      message: '获取版本详情失败'
    });
  }
}

/**
 * 创建新版本（上传新图片）
 * POST /api/v1/panoramas/:id/versions
 */
async function createVersion(req, res) {
  try {
    const { id } = req.params;
    const { change_description } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({
        success: false,
        message: '请上传图片文件'
      });
    }

    // 检查全景图是否存在
    const [panorama] = await db.query('SELECT * FROM panoramas WHERE id = ?', [id]);
    if (panorama.length === 0) {
      return res.status(404).json({
        success: false,
        message: '全景图不存在'
      });
    }

    // 获取最大版本号
    const [maxVersion] = await db.query(
      'SELECT MAX(version) as max_version FROM panorama_versions WHERE panorama_id = ?',
      [id]
    );
    const newVersion = (maxVersion[0].max_version || 0) + 1;
    const filePath = `/uploads/panoramas/${file.filename}`;

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
        'UPDATE panoramas SET current_version = ?, file_path = ? WHERE id = ?',
        [newVersion, filePath, id]
      );

      await connection.commit();

      res.status(201).json({
        success: true,
        message: '新版本创建成功',
        data: {
          version: newVersion,
          file_path: filePath
        }
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('创建版本错误:', error);
    res.status(500).json({
      success: false,
      message: '创建版本失败'
    });
  }
}

/**
 * 恢复到指定版本
 * PUT /api/v1/panoramas/:id/versions/:version/restore
 */
async function restoreVersion(req, res) {
  try {
    const { id, version } = req.params;
    const { change_description } = req.body;

    // 获取目标版本
    const [versionRows] = await db.query(
      'SELECT * FROM panorama_versions WHERE panorama_id = ? AND version = ?',
      [id, version]
    );

    if (versionRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '版本不存在'
      });
    }

    // 获取最大版本号
    const [maxVersion] = await db.query(
      'SELECT MAX(version) as max_version FROM panorama_versions WHERE panorama_id = ?',
      [id]
    );
    const nextVersion = (maxVersion[0].max_version || 0) + 1;

    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
      // 将恢复的版本作为新版本插入
      await connection.query(
        'INSERT INTO panorama_versions (panorama_id, version, file_path, change_description) VALUES (?, ?, ?, ?)',
        [id, nextVersion, versionRows[0].file_path, change_description || `恢复自版本 ${version}`]
      );

      // 更新全景图表
      await connection.query(
        'UPDATE panoramas SET current_version = ?, file_path = ? WHERE id = ?',
        [nextVersion, versionRows[0].file_path, id]
      );

      await connection.commit();

      res.json({
        success: true,
        message: '版本恢复成功',
        data: {
          version: nextVersion,
          file_path: versionRows[0].file_path
        }
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('恢复版本错误:', error);
    res.status(500).json({
      success: false,
      message: '恢复版本失败'
    });
  }
}

/**
 * 删除指定版本
 * DELETE /api/v1/panoramas/:id/versions/:version
 */
async function deleteVersion(req, res) {
  try {
    const { id, version } = req.params;

    // 获取全景图当前版本
    const [panorama] = await db.query('SELECT current_version FROM panoramas WHERE id = ?', [id]);
    if (panorama.length === 0) {
      return res.status(404).json({
        success: false,
        message: '全景图不存在'
      });
    }

    // 不能删除当前版本
    if (panorama[0].current_version === parseInt(version)) {
      return res.status(400).json({
        success: false,
        message: '不能删除当前正在使用的版本'
      });
    }

    // 获取版本信息
    const [versionRows] = await db.query(
      'SELECT * FROM panorama_versions WHERE panorama_id = ? AND version = ?',
      [id, version]
    );

    if (versionRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '版本不存在'
      });
    }

    // 删除版本记录
    await db.query(
      'DELETE FROM panorama_versions WHERE panorama_id = ? AND version = ?',
      [id, version]
    );

    // 删除文件
    const filePath = path.join(__dirname, '..', versionRows[0].file_path);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    res.json({
      success: true,
      message: '版本删除成功'
    });
  } catch (error) {
    console.error('删除版本错误:', error);
    res.status(500).json({
      success: false,
      message: '删除版本失败'
    });
  }
}

module.exports = {
  listVersions,
  getVersionById,
  createVersion,
  restoreVersion,
  deleteVersion
};
