/**
 * Anthropic API 客户端
 * 处理与大模型的对话
 */

const Anthropic = require('@anthropic-ai/sdk');
require('dotenv').config();

// 初始化客户端
const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

// 加载MCP工具定义
const { MCPTools, ToolHandlers } = require('../generated/backend/mcp-tools');

/**
 * 发送消息给大模型并获取工具调用
 * @param {string} userMessage - 用户消息
 * @param {Array} conversationHistory - 对话历史
 * @returns {Promise<Object>} - 响应结果
 */
async function chat(userMessage, conversationHistory = []) {
  try {
    // 构建消息
    const messages = [
      ...conversationHistory,
      { role: 'user', content: userMessage }
    ];

    // 调用API
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      tools: MCPTools,
      messages: messages
    });

    // 处理响应
    const result = {
      content: [],
      toolCalls: [],
      stopReason: response.stop_reason
    };

    for (const block of response.content) {
      if (block.type === 'text') {
        result.content.push({
          type: 'text',
          text: block.text
        });
      } else if (block.type === 'tool_use') {
        const toolCall = {
          id: block.id,
          name: block.name,
          input: block.input
        };
        result.toolCalls.push(toolCall);

        // 执行工具处理函数
        const handler = ToolHandlers[block.name];
        if (handler) {
          const handlerResult = handler(block.input);
          result.content.push({
            type: 'tool_result',
            toolUseId: block.id,
            name: block.name,
            result: handlerResult
          });
        }
      }
    }

    return result;
  } catch (error) {
    console.error('Anthropic API 调用错误:', error);
    throw error;
  }
}

/**
 * 获取可用工具列表
 */
function getAvailableTools() {
  return MCPTools.map(tool => ({
    name: tool.name,
    description: tool.description,
    parameters: tool.input_schema
  }));
}

module.exports = {
  chat,
  getAvailableTools
};
