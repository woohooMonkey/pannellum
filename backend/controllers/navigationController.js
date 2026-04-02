const db = require('../config/db');

/**
 * 导航相关API控制器
 */
const navigationController = {
  /**
   * 获取场景连通图
   * GET /api/v1/navigation/scene-graph
   */
  async getSceneGraph(req, res) {
    try {
      // 构建场景连通图
      const graph = new Map();

      // 获取所有场景
      const [scenes] = await db.query(
        'SELECT id, name, type, description FROM panoramas ORDER BY name ASC'
      );

      // 初始化图
      scenes.forEach(scene => {
        graph.set(scene.id, {
          id: scene.id,
          name: scene.name,
          type: scene.type,
          description: scene.description,
          neighbors: []
        });
      });

      // 获取导航点
      const [navigationMarkers] = await db.query(
        `SELECT
          m.id, m.title, m.description, m.pitch, m.yaw,
          m.panorama_id as from_panorama_id,
          m.target_panorama_id as to_panorama_id,
          p_from.name as from_scene_name,
          p_to.name as to_scene_name
         FROM markers m
         LEFT JOIN panoramas p_from ON m.panorama_id = p_from.id
         LEFT JOIN panoramas p_to ON m.target_panorama_id = p_to.id
         WHERE m.type = 'navigation' AND m.target_panorama_id IS NOT NULL`
      );

      // 构建邻接表
      navigationMarkers.forEach(marker => {
        const fromNode = graph.get(marker.from_panorama_id);
        if (fromNode) {
          fromNode.neighbors.push({
            markerId: marker.id,
            markerTitle: marker.title,
            markerDescription: marker.description,
            markerPitch: marker.pitch,
            markerYaw: marker.yaw,
            toSceneId: marker.to_panorama_id,
            toSceneName: marker.to_scene_name
          });
        }
      });

      // 转换为数组格式返回
      const graphArray = Array.from(graph.values());

      res.json({
        success: true,
        data: graphArray
      });
    } catch (error) {
      console.error('获取场景连通图失败:', error);
      res.status(500).json({
        success: false,
        message: '获取场景连通图失败'
      });
    }
  },

  /**
   * 查找最短路径
   * POST /api/v1/navigation/find-path
   */
  async findPath(req, res) {
    try {
      const { fromSceneId, toSceneId } = req.body;

      if (!fromSceneId || !toSceneId) {
        return res.status(400).json({
          success: false,
          message: '请提供起始场景ID和目标场景ID'
        });
      }

      if (fromSceneId === toSceneId) {
        return res.json({
          success: true,
          data: []
        });
      }

      // 构建场景连通图
      const graph = new Map();

      // 获取所有场景
      const [scenes] = await db.query(
        'SELECT id, name, type, description FROM panoramas'
      );

      // 初始化图
      scenes.forEach(scene => {
        graph.set(scene.id, {
          id: scene.id,
          name: scene.name,
          type: scene.type,
          neighbors: []
        });
      });

      // 获取导航点
      const [navigationMarkers] = await db.query(
        `SELECT
          m.id, m.title, m.pitch, m.yaw,
          m.panorama_id as from_panorama_id,
          m.target_panorama_id as to_panorama_id
       FROM markers m
       WHERE m.type = 'navigation' AND m.target_panorama_id IS NOT NULL`
      );

      // 构建邻接表
      navigationMarkers.forEach(marker => {
        const fromNode = graph.get(marker.from_panorama_id);
        const toNode = graph.get(marker.to_panorama_id);

        if (fromNode && toNode) {
          fromNode.neighbors.push({
            markerId: marker.id,
            markerTitle: marker.title,
            markerPitch: marker.pitch,
            markerYaw: marker.yaw,
            toSceneId: marker.to_panorama_id,
            toSceneName: toNode.name
          });
        }
      });

      // BFS查找最短路径
      const queue = [{
        currentSceneId: fromSceneId,
        path: []
      }];

      const visited = new Set();
      visited.add(fromSceneId);

      const resultPath = [];

      while (queue.length > 0) {
        const { currentSceneId, path } = queue.shift();
        const currentNode = graph.get(currentSceneId);

        // 检查所有邻居
        for (const neighbor of currentNode.neighbors) {
          if (neighbor.toSceneId === toSceneId) {
            // 找到目标，返回完整路径
            resultPath.push(...path, {
              type: 'navigation',
              data: neighbor
            });
            resultPath.push({
              type: 'scene',
              data: graph.get(toSceneId)
            });
            goto found;
          }

          if (!visited.has(neighbor.toSceneId)) {
            visited.add(neighbor.toSceneId);
            queue.push({
              currentSceneId: neighbor.toSceneId,
              path: [...path, {
                type: 'navigation',
                data: neighbor
              }]
            });
          }
        }
      }

    found:
      if (resultPath.length > 0) {
        res.json({
          success: true,
          data: resultPath
        });
      } else {
        res.json({
          success: true,
          data: [],
          message: '未找到路径'
        });
      }

    } catch (error) {
      console.error('查找路径失败:', error);
      res.status(500).json({
        success: false,
        message: '查找路径失败'
      });
    }
  },

  /**
   * 获取标记点及其场景信息
   * GET /api/v1/navigation/markers/:sceneId
   */
  async getMarkersByScene(req, res) {
    try {
      const { sceneId } = req.params;

      if (!sceneId) {
        return res.status(400).json({
          success: false,
          message: '请提供场景ID'
        });
      }

      // 获取指定场景的标记点（排除导航点）
      const [markers] = await db.query(
        `SELECT
          m.id, m.title, m.description, m.type, m.pitch, m.yaw,
          p.name as panorama_name, p.type as panorama_type
         FROM markers m
         LEFT JOIN panoramas p ON m.panorama_id = p.id
         WHERE m.panorama_id = ? AND m.type != 'navigation'
         ORDER BY m.title ASC`,
        [sceneId]
      );

      res.json({
        success: true,
        data: markers
      });
    } catch (error) {
      console.error('获取标记点失败:', error);
      res.status(500).json({
        success: false,
        message: '获取标记点失败'
      });
    }
  },

  /**
   * 获取导航点及其目标场景信息
   * GET /api/v1/navigation/navigation-markers
   */
  async getNavigationMarkers(req, res) {
    try {
      // 获取所有导航点
      const [navigationMarkers] = await db.query(
        `SELECT
          m.id, m.title, m.description, m.pitch, m.yaw,
          m.panorama_id as from_panorama_id,
          m.target_panorama_id as to_panorama_id,
          p_from.name as from_scene_name,
          p_to.name as to_scene_name
         FROM markers m
         LEFT JOIN panoramas p_from ON m.panorama_id = p_from.id
         LEFT JOIN panoramas p_to ON m.target_panorama_id = p_to.id
         WHERE m.type = 'navigation' AND m.target_panorama_id IS NOT NULL
         ORDER BY p_from.name ASC, m.title ASC`
      );

      res.json({
        success: true,
        data: navigationMarkers
      });
    } catch (error) {
      console.error('获取导航点失败:', error);
      res.status(500).json({
        success: false,
        message: '获取导航点失败'
      });
    }
  },

  /**
   * 获取导航路径（用于AI导航）
   * POST /api/v1/navigation/calculate-path
   */
  async calculatePath(req, res) {
    try {
      const { currentSceneId, targetMarkerId } = req.body;

      if (!currentSceneId || !targetMarkerId) {
        return res.status(400).json({
          success: false,
          message: '请提供当前场景ID和目标标记点ID'
        });
      }

      // 获取目标标记点信息
      const [marker] = await db.query(
        `SELECT
          m.id, m.title, m.description, m.pitch, m.yaw,
          m.panorama_id, p.name as panorama_name
         FROM markers m
         LEFT JOIN panoramas p ON m.panorama_id = p.id
         WHERE m.id = ? AND m.type != 'navigation'
         LIMIT 1`,
        [targetMarkerId]
      );

      if (marker.length === 0) {
        return res.status(404).json({
          success: false,
          message: '未找到指定的标记点'
        });
      }

      const targetMarker = marker[0];

      // 如果在同一场景，直接返回
      if (currentSceneId === targetMarker.panorama_id) {
        const steps = [
          {
            type: 'marker',
            data: {
              id: targetMarker.id,
              title: targetMarker.title,
              description: targetMarker.description,
              panoramaId: targetMarker.panorama_id,
              pitch: targetMarker.pitch,
              yaw: targetMarker.yaw
            }
          }
        ];

        return res.json({
          success: true,
          data: steps
        });
      }

      // 构建场景连通图
      const graph = new Map();

      // 获取所有场景
      const [scenes] = await db.query(
        'SELECT id, name, type, description FROM panoramas'
      );

      // 初始化图
      scenes.forEach(scene => {
        graph.set(scene.id, {
          id: scene.id,
          name: scene.name,
          type: scene.type,
          description: scene.description,
          neighbors: []
        });
      });

      // 获取导航点
      const [navigationMarkers] = await db.query(
        `SELECT
          m.id, m.title, m.description, m.pitch, m.yaw,
          m.panorama_id as from_panorama_id,
          m.target_panorama_id as to_panorama_id
       FROM markers m
       WHERE m.type = 'navigation' AND m.target_panorama_id IS NOT NULL`
      );

      // 构建邻接表
      navigationMarkers.forEach(navMarker => {
        const fromNode = graph.get(navMarker.from_panorama_id);
        const toNode = graph.get(navMarker.to_panorama_id);

        if (fromNode && toNode) {
          fromNode.neighbors.push({
            markerId: navMarker.id,
            markerTitle: navMarker.title,
            markerDescription: navMarker.description,
            markerPitch: navMarker.pitch,
            markerYaw: navMarker.yaw,
            toSceneId: navMarker.to_panorama_id,
            toSceneName: toNode.name
          });
        }
      });

      // BFS查找路径
      const queue = [{
        currentSceneId: currentSceneId,
        path: []
      }];

      const visited = new Set();
      visited.add(currentSceneId);

      let foundPath = null;

      while (queue.length > 0 && !foundPath) {
        const { currentSceneId, path } = queue.shift();
        const currentNode = graph.get(currentSceneId);

        // 检查所有邻居
        for (const neighbor of currentNode.neighbors) {
          if (neighbor.toSceneId === targetMarker.panorama_id) {
            // 找到目标路径
            foundPath = [...path, {
              type: 'navigation',
              data: neighbor
            }];
            break;
          }

          if (!visited.has(neighbor.toSceneId)) {
            visited.add(neighbor.toSceneId);
            queue.push({
              currentSceneId: neighbor.toSceneId,
              path: [...path, {
                type: 'navigation',
                data: neighbor
              }]
            });
          }
        }
      }

      // 构建完整步骤
      const steps = [];

      if (foundPath) {
        // 添加路径上的导航点和场景
        foundPath.forEach(step => {
          steps.push(step); // 导航点
          if (step.data.toSceneId !== targetMarker.panorama_id) {
            const scene = graph.get(step.data.toSceneId);
            steps.push({
              type: 'scene',
              data: scene
            });
          }
        });

        // 添加目标场景和标记点
        const targetScene = graph.get(targetMarker.panorama_id);
        steps.push({
          type: 'scene',
          data: targetScene
        });
        steps.push({
          type: 'marker',
          data: {
            id: targetMarker.id,
            title: targetMarker.title,
            description: targetMarker.description,
            panoramaId: targetMarker.panorama_id,
            pitch: targetMarker.pitch,
            yaw: targetMarker.yaw
          }
        });
      }

      res.json({
        success: true,
        data: steps
      });
    } catch (error) {
      console.error('计算导航路径失败:', error);
      res.status(500).json({
        success: false,
        message: '计算导航路径失败'
      });
    }
  }
};

module.exports = navigationController;