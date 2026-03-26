/**
 * 全景图相关 MCP 工具
 */

const db = require('../../config/db');

/**
 * 获取所有全景图列表
 */
async function list_panoramas() {
  try {
    const [rows] = await db.query(
      'SELECT id, name, type, description FROM panoramas ORDER BY create_time DESC'
    );
    return {
      success: true,
      data: rows.map(row => ({
        id: row.id,
        name: row.name,
        type: row.type,
        description: row.description
      }))
    };
  } catch (error) {
    console.error('获取全景图列表失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 根据名称模糊搜索全景图
 * @param {string} name - 场景名称（支持模糊匹配）
 */
async function search_panorama_by_name(name) {
  try {
    const [rows] = await db.query(
      'SELECT id, name, type, description FROM panoramas WHERE name LIKE ? ORDER BY create_time DESC',
      [`%${name}%`]
    );
    return {
      success: true,
      data: rows.map(row => ({
        id: row.id,
        name: row.name,
        type: row.type,
        description: row.description
      }))
    };
  } catch (error) {
    console.error('搜索全景图失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 获取场景间的导航路径
 * 根据导航标记点计算从一个场景到另一个场景的路径
 * @param {number} startId - 起始场景ID
 * @param {number} endId - 目标场景ID
 */
async function get_navigation_path(startId, endId) {
  try {
    // 获取起始场景的导航标记点
    const [startMarkers] = await db.query(
      `SELECT m.id, m.title, m.target_panorama_id, p.name as source_name,
       tp.name as target_name
       FROM markers m
       JOIN panoramas p ON m.panorama_id = p.id
       LEFT JOIN panoramas tp ON m.target_panorama_id = tp.id
       WHERE m.panorama_id = ? AND m.type = 'navigation'`,
      [startId]
    );

    // 获取目标场景的导航标记点
    const [endMarkers] = await db.query(
      `SELECT m.id, m.title, m.target_panorama_id, p.name as source_name,
       tp.name as target_name
       FROM markers m
       JOIN panoramas p ON m.panorama_id = p.id
       LEFT JOIN panoramas tp ON m.target_panorama_id = tp.id
       WHERE m.panorama_id = ? AND m.type = 'navigation'`,
      [endId]
    );

    // 构建路径信息
    const paths = [];

    // 检查是否有直接连接
    const directConnection = startMarkers.find(
      m => m.target_panorama_id === endId
    );

    if (directConnection) {
      paths.push({
        type: 'direct',
        from: directConnection.source_name,
        to: directConnection.target_name,
        marker: directConnection.title
      });
    }

    return {
      success: true,
      data: {
        startScene: startId,
        endScene: endId,
        directConnection: !!directConnection,
        paths: paths,
        startMarkers: startMarkers.map(m => ({
          id: m.id,
          title: m.title,
          targetId: m.target_panorama_id,
          targetName: m.target_name
        })),
        endMarkers: endMarkers.map(m => ({
          id: m.id,
          title: m.title,
          targetId: m.target_panorama_id,
          targetName: m.target_name
        }))
      }
    };
  } catch (error) {
    console.error('获取导航路径失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 获取所有场景名称列表
 * 用于 AI 理解用户意图
 */
async function get_scene_names() {
  try {
    const [rows] = await db.query(
      'SELECT id, name, type FROM panoramas ORDER BY name ASC'
    );
    return {
      success: true,
      data: rows.map(row => ({
        id: row.id,
        name: row.name,
        type: row.type
      }))
    };
  } catch (error) {
    console.error('获取场景名称失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  list_panoramas,
  search_panorama_by_name,
  get_navigation_path,
  get_scene_names
};
