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

      const systemPrompt = `你是一个全景图导航助手。用户会告诉你要去的目的地，你需要根据用户意图调用相应的工具。

可用的场景列表:
${sceneDescriptions}

规则:
1. 如果用户只提到一个场景名称（或部分名称、模糊匹配），调用 navigate_to_scene 工具
2. 如果用户提到多个场景或要"漫游"/"游览多个地方"， 调用 start_scene_tour 工具
3. 场景名称支持模糊匹配，找到最相近的场景
4. 按照用户提到的顺序排列场景
5. 如果找不到匹配的场景，在回复中告诉用户可用的场景列表`;

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
            availableScenes: scenes.map(s => s.name)
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
  }
};

module.exports = aiController;
