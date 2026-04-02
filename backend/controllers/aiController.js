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

      // 获取所有标记点（包含所属场景信息）
      // 标记点包括普通标记点和导航标记点，都可以作为用户目的地
      const [markers] = await db.query(
        `SELECT m.id, m.title, m.description, m.type, m.pitch, m.yaw,
                m.panorama_id, p.name as panorama_name, p.type as panorama_type
         FROM markers m
         LEFT JOIN panoramas p ON m.panorama_id = p.id
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

      // 构建场景信息
      const sceneDescriptions = scenes.map(s => {
        const type = s.type === 'main' ? '主场景' : '子场景';
        return `- ID: ${s.id}, 名称: "${s.name}", 类型: ${type}${s.description ? `, 描述: ${s.description}` : ''}`;
      }).join('\n');

      // 构建标记点信息
      const markerDescriptions = markers.length > 0
        ? markers.map(m => {
            const markerType = m.type === 'navigation' ? '导航点' : '信息点';
            return `- ID: ${m.id}, 标题: "${m.title}", 类型: ${markerType}, 所属场景: "${m.panorama_name}"${m.description ? `, 描述: ${m.description}` : ''}`;
          }).join('\n')
        : '暂无标记点';

      // 当前场景信息
      const currentPanoramaName = currentSceneName || (currentSceneId ? scenes.find(s => s.id === currentSceneId)?.name : '未知');

      const systemPrompt = `你是一个全景图导航助手。用户会告诉你要去的目的地，你需要根据用户意图调用相应的工具。

## 当前场景信息:
- 当前场景名称: "${currentPanoramaName || '未知'}"
- 用户当前在这个场景中，如果用户想查看标记点，优先在当前场景内查找

## 可用的场景列表:
${sceneDescriptions}

## 可用的标记点列表:
${markerDescriptions}

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
  }
};

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
        scene.markers.push({
          id: marker.id,
          title: marker.title,
          type: marker.type,
          pitch: marker.pitch,
          yaw: marker.yaw
        });
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
