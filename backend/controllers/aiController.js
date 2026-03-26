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
      const { input } = req.body;

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

      const systemPrompt = `你是一个全景图导航助手。用户会告诉你要去的目的地，你需要根据用户意图调用相应的工具。

## 可用的场景列表:
${sceneDescriptions}

## 可用的标记点列表:
${markerDescriptions}

## 工具使用规则:

### 1. 场景导航 (navigate_to_scene)
当用户的目的地是一个"场景名称"时使用：
- 例如: "去大厅"、"去会议室"、"去主场景"
- 优先匹配场景名称
- 返回场景ID和场景名称

### 2. 标记点导航 (navigate_to_marker)
当用户的目的地是一个"具体位置/展品/标记点"时使用：
- 例如: "去看前台"、"去入口处"、"去看那个雕塑"
- 需要返回: markerId(标记点ID), markerTitle(标记点标题), sceneId(所属场景ID), sceneName(所属场景名称)
- 系统会自动跳转到该标记点所在的场景，并将视角对准该标记点

### 3. 多场景漫游 (start_scene_tour)
当用户想要"游览多个地方"、"漫游"时使用：
- 例如: "带我去大厅和会议室"、"漫游所有场景"
- 按照用户提到的顺序排列场景
- 返回 sceneIds 数组和 sceneNames 数组

### 匹配优先级:
1. 首先尝试匹配标记点标题（更具体的位置）
2. 其次匹配场景名称（更大的区域）
3. 支持模糊匹配，找到最相近的目标

### 如果找不到匹配:
在回复中告诉用户可用的场景和标记点列表，让用户重新选择。`;

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
        // 没有工具调用，返回文本响应
        const textContent = choice.message?.content || '';
        res.json({
          success: true,
          data: {
            action: 'text_response',
            message: textContent,
            availableScenes: scenes.map(s => s.name),
            availableMarkers: markers.map(m => m.title)
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

module.exports = aiController;
