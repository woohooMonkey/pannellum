const axios = require('axios');
const db = require('../config/db');

// 动态导入 ESM 模块
let toolsModule = null;
let executorModule = null;

/**
 * 获取工具模块（异步加载 ESM）
 */
async function getToolsModule() {
  if (!toolsModule) {
    toolsModule = await import('../generated/tools.mjs');
  }
  return toolsModule;
}

/**
 * 获取执行器模块（异步加载 ESM）
 */
async function getExecutorModule() {
  if (!executorModule) {
    executorModule = await import('../generated/executor.mjs');
  }
  return executorModule;
}

/**
 * AI 导航控制器
 * 使用智谱 AI（OpenAI 兼容接口）
 */
const aiController = {
  /**
   * 处理导航请求
   * POST /api/v1/ai/navigate
   */
  async navigate(req, res) {
    try {
      const { input, currentSceneId, currentSceneName } = req.body;

      if (!input || typeof input !== 'string') {
        return res.status(400).json({
          success: false,
          message: '请输入目的地'
        });
      }

      // 获取所有场景
      const [scenes] = await db.query(
        'SELECT id, name, type, description FROM panoramas ORDER BY name ASC'
      );

      if (scenes.length === 0) {
        return res.json({
          success: false,
          message: '暂无可用场景'
        });
      }

      // 获取所有标记点（包含所属场景信息和导航点指向的场景信息）
      // 标记点包括普通标记点和导航标记点，都可以作为用户目的地
      const [markers] = await db.query(
        `SELECT m.id, m.title, m.description, m.type, m.pitch, m.yaw,
                m.panorama_id, p.name as panorama_name, p.type as panorama_type,
                tp.id as target_panorama_id, tp.name as target_panorama_name
         FROM markers m
         LEFT JOIN panoramas p ON m.panorama_id = p.id
         LEFT JOIN panoramas tp ON m.target_panorama_id = tp.id
         ORDER BY m.title ASC`
      );

      // 获取 API 配置
      const apiKey = process.env.ZHIPU_API_KEY;
      const model = process.env.ZHIPU_MODEL || 'glm-4-flash';

      if (!apiKey) {
        return res.status(500).json({
          success: false,
          message: 'AI API Key 未配置，请在 .env 中设置 ZHIPU_API_KEY'
        });
      }

      // 加载工具定义
      const { tools } = await getToolsModule();

      // 将工具转换为 OpenAI 格式
      const openaiTools = tools.map(tool => ({
        type: 'function',
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.inputSchema
        }
      }));

      // 构建场景信息 - 使用清晰的格式，便于 AI 识别
      const sceneDescriptions = scenes.map(s => {
        const type = s.type === 'main' ? '【主场景】' : '【子场景】';
        return `[场景] ID:${s.id} 完整名称:"${s.name}" ${type}${s.description ? ` 描述:${s.description}` : ''}`;
      }).join('\n');

      // 构建标记点信息 - 使用不同的格式，与场景区分
      const markerDescriptions = markers.length > 0
        ? markers.map(m => {
            const markerType = m.type === 'navigation' ? '【导航点】' : '【信息点】';
            let description = `[标记] ID:${m.id} 标题:"${m.title}" ${markerType} 所属场景:"${m.panorama_name}"`;

            // 如果是导航点，添加目标场景信息
            if (m.type === 'navigation' && m.target_panorama_name) {
              description += ` → 目标场景:"${m.target_panorama_name}"`;
            }

            if (m.description) {
              description += ` 描述:${m.description}`;
            }

            return description;
          }).join('\n')
        : '暂无标记点';

      // 当前场景信息
      const currentPanoramaName = currentSceneName || (currentSceneId ? scenes.find(s => s.id === currentSceneId)?.name : '未知');

      const systemPrompt = `你是一个全景图导航助手。用户会告诉你要去的目的地，你需要根据用户意图调用相应的工具。

## 当前场景信息:
- 当前场景名称: "${currentPanoramaName || '未知'}"

## 可用的场景列表:
${sceneDescriptions}

## 可用的标记点列表:
${markerDescriptions}

## 工具调用规则:
1:**目的地识别** 再进行语义理解识别用户的输入目的地，找到数据库中所有相近的场景或者标记点。
1. **场景匹配**：识别到目的地是场景的时候，使用 navigate_to_scene 工具
   - 例如："去6号楼"（如果6号楼是场景名称）
   - 例如："去大厅"（如果大厅是场景名称）
2. **标记点匹配**：识别到目的是标记点时候：
   - 如果是普通标记点（如"品牌馆"、"展品A"），使用 navigate_to_marker 工具直接跳转到该标记点
   - 如果是导航点（如"南门"、"出口"），使用 navigate_to_scene 工具跳转到该导航点指向的目标场景
   
## 重要判断逻辑:
- 进行语义理解，判断目的地
- 如果匹配到场景，使用 navigate_to_scene
- 如果匹配到普通标记点，使用 navigate_to_marker
- 如果匹配到导航点，使用 navigate_to_scene 跳转到其目标场景



请严格按照以上逻辑进行判断和工具调用。
`;

      // 调用智谱 AI API（OpenAI 兼容）
      const response = await axios.post(
        'https://open.bigmodel.cn/api/paas/v4/chat/completions',
        {
          model: model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: input }
          ],
          tools: openaiTools,
          tool_choice: 'auto'
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          timeout: 30000
        }
      );

      // 处理响应
      const choice = response.data.choices[0];

      // 加载执行器
      const { executeTool } = await getExecutorModule();

      // 检查是否有工具调用
      if (choice.message?.tool_calls && choice.message.tool_calls.length > 0) {
        const toolCall = choice.message.tool_calls[0];
        const toolName = toolCall.function.name;
        const toolArgs = JSON.parse(toolCall.function.arguments);

        // 执行工具
        const toolResult = executeTool(toolName, toolArgs);

        res.json({
          success: true,
          data: toolResult
        });
      } else {
        // 没有工具调用，返回文本响应（带场景-标记点关联数据）
        const textContent = choice.message?.content || '';

        // 构建场景-标记点关联数据
        const sceneMarkerData = buildSceneMarkerData(scenes, markers);

        res.json({
          success: true,
          data: {
            action: 'text_response',
            params: {
              message: textContent,
              sceneMarkerData: sceneMarkerData
            }
          }
        });
      }

    } catch (error) {
      console.error('AI 导航处理失败:', error);

      // 检查是否是 API 错误
      if (error.response) {
        const status = error.response.status;
        const errorData = error.response.data;

        if (status === 401) {
          return res.status(500).json({
            success: false,
            message: 'API Key 无效或未配置'
          });
        }

        return res.status(500).json({
          success: false,
          message: `AI 服务错误: ${errorData?.error?.message || error.message}`
        });
      }

      res.status(500).json({
        success: false,
        message: 'AI 导航处理失败: ' + error.message
      });
    }
  },

  /**
   * 获取可用场景列表（供前端展示）
   * GET /api/v1/ai/scenes
   */
  async getScenes(req, res) {
    try {
      const [scenes] = await db.query(
        'SELECT id, name, type, description FROM panoramas ORDER BY name ASC'
      );

      res.json({
        success: true,
        data: scenes
      });
    } catch (error) {
      console.error('获取场景列表失败:', error);
      res.status(500).json({
        success: false,
        message: '获取场景列表失败'
      });
    }
  },

  /**
   * 获取可用标记点列表（供前端展示）
   * GET /api/v1/ai/markers
   */
  async getMarkers(req, res) {
    try {
      const [markers] = await db.query(
        `SELECT m.id, m.title, m.description, m.type, m.pitch, m.yaw,
                m.panorama_id, p.name as panorama_name
         FROM markers m
         LEFT JOIN panoramas p ON m.panorama_id = p.id
         ORDER BY m.title ASC`
      );

      res.json({
        success: true,
        data: markers
      });
    } catch (error) {
      console.error('获取标记点列表失败:', error);
      res.status(500).json({
        success: false,
        message: '获取标记点列表失败'
      });
    }
  },

  /**
   * 获取导航路线（支持路径动画导航）
   * POST /api/v1/ai/route
   */
  getRoute
};

/**
 * BFS 广度优先搜索查找场景间最短路径
 * @param {Object} graph - 邻接图 { sceneId: [{ targetSceneId, ... }] }
 * @param {number} start - 起始场景ID
 * @param {number} end - 目标场景ID
 * @returns {Array|null} 路径（场景ID数组），找不到返回 null
 */
function bfs(graph, start, end) {
  if (parseInt(start) === parseInt(end)) return [start];

  const visited = new Set([parseInt(start)]);
  const queue = [[parseInt(start), [parseInt(start)]]];

  while (queue.length > 0) {
    const [node, path] = queue.shift();
    const neighbors = graph[node] || [];

    for (const edge of neighbors) {
      const neighbor = parseInt(edge.targetSceneId);
      if (!visited.has(neighbor)) {
        const newPath = [...path, neighbor];
        if (neighbor === parseInt(end)) return newPath;
        visited.add(neighbor);
        queue.push([neighbor, newPath]);
      }
    }
  }

  return null;
}

/**
 * 获取导航路线（支持路径动画导航）
 * POST /api/v1/ai/route
 */
async function getRoute(req, res) {
  try {
    const { fromSceneId, toSceneId, markerId } = req.body;

    if (!fromSceneId || !toSceneId) {
      return res.status(400).json({
        success: false,
        message: '缺少起始场景或目标场景ID'
      });
    }

    const from = parseInt(fromSceneId);
    const to = parseInt(toSceneId);

    // 起始场景就是目标场景
    if (from === to) {
      const route = [];
      if (markerId) {
        const [markers] = await db.query(
          'SELECT id, title, pitch, yaw FROM markers WHERE id = ?',
          [markerId]
        );
        if (markers.length > 0) {
          route.push({
            type: 'marker',
            markerId: markers[0].id,
            title: markers[0].title,
            pitch: parseFloat(markers[0].pitch),
            yaw: parseFloat(markers[0].yaw)
          });
        }
      }
      return res.json({ success: true, data: { route, sameScene: true } });
    }

    // 获取所有导航标记点，构建场景连通图
    const [navMarkers] = await db.query(
      `SELECT m.id, m.title, m.pitch, m.yaw, m.panorama_id, m.target_panorama_id,
              p.name as panorama_name, tp.name as target_panorama_name
       FROM markers m
       LEFT JOIN panoramas p ON m.panorama_id = p.id
       LEFT JOIN panoramas tp ON m.target_panorama_id = tp.id
       WHERE m.type = 'navigation' AND m.target_panorama_id IS NOT NULL`
    );

    // 构建邻接图
    const graph = {};
    navMarkers.forEach(m => {
      const pid = parseInt(m.panorama_id);
      if (!graph[pid]) graph[pid] = [];
      graph[pid].push({
        targetSceneId: parseInt(m.target_panorama_id),
        markerId: m.id,
        title: m.title,
        pitch: parseFloat(m.pitch),
        yaw: parseFloat(m.yaw),
        targetSceneName: m.target_panorama_name
      });
    });

    // BFS 查找最短路径
    const path = bfs(graph, from, to);

    if (!path) {
      return res.json({ success: true, data: { route: [], direct: true } });
    }

    // 将路径转换为路线点列表
    const route = [];
    for (let i = 0; i < path.length - 1; i++) {
      const currentSceneId = path[i];
      const nextSceneId = path[i + 1];
      const edges = graph[currentSceneId] || [];
      const navMarker = edges.find(e => e.targetSceneId === nextSceneId);

      if (navMarker) {
        route.push({
          type: 'navigation',
          markerId: navMarker.markerId,
          title: navMarker.title,
          pitch: navMarker.pitch,
          yaw: navMarker.yaw,
          targetSceneId: navMarker.targetSceneId,
          targetSceneName: navMarker.targetSceneName
        });
        route.push({
          type: 'scene',
          sceneId: navMarker.targetSceneId,
          sceneName: navMarker.targetSceneName
        });
      }
    }

    // 如果有目标标记点，追加到路线末尾
    if (markerId) {
      const [markers] = await db.query(
        'SELECT id, title, pitch, yaw FROM markers WHERE id = ?',
        [markerId]
      );
      if (markers.length > 0) {
        route.push({
          type: 'marker',
          markerId: markers[0].id,
          title: markers[0].title,
          pitch: parseFloat(markers[0].pitch),
          yaw: parseFloat(markers[0].yaw)
        });
      }
    }

    res.json({ success: true, data: { route } });
  } catch (error) {
    console.error('路线计算失败:', error);
    res.status(500).json({
      success: false,
      message: '路线计算失败: ' + error.message
    });
  }
}

/**
 * 构建场景-标记点关联数据
 * @param {Array} scenes - 场景列表
 * @param {Array} markers - 标记点列表
 * @returns {Array} 排序后的场景数据（包含关联的所有标记点）
 */
function buildSceneMarkerData(scenes, markers) {
  // 为每个场景关联其所有标记点
  const sceneMap = new Map();

  scenes.forEach(scene => {
    sceneMap.set(scene.id, {
      id: scene.id,
      name: scene.name,
      type: scene.type,
      description: scene.description,
      markers: []
    });
  });

  // 将所有标记点关联到对应场景
  markers.forEach(marker => {
    if (marker.panorama_id) {
      const scene = sceneMap.get(marker.panorama_id);
      if (scene) {
        const markerInfo = {
          id: marker.id,
          title: marker.title,
          type: marker.type,
          pitch: marker.pitch,
          yaw: marker.yaw
        };

        // 如果是导航点，添加目标场景信息
        if (marker.type === 'navigation' && marker.target_panorama_id && marker.target_panorama_name) {
          markerInfo.targetScene = {
            id: marker.target_panorama_id,
            name: marker.target_panorama_name
          };
        }

        scene.markers.push(markerInfo);
      }
    }
  });

  // 转换为数组并排序
  let result = Array.from(sceneMap.values());

  // 排序规则：
  // 1. 主场景始终在第一位
  // 2. 其他场景按标记点数量倒序排列
  result.sort((a, b) => {
    // 主场景排第一
    if (a.type === 'main' && b.type !== 'main') return -1;
    if (b.type === 'main' && a.type !== 'main') return 1;

    // 其他场景按标记点数量倒序
    return b.markers.length - a.markers.length;
  });

  return result;
}

module.exports = aiController;
