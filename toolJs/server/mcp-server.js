/**
 * MCP 服务模块
 * 处理MCP协议相关的工具调用
 */

const { MCPTools, ToolHandlers } = require('../generated/backend/mcp-tools');

/**
 * 获取所有MCP工具定义
 */
function getToolDefinitions() {
  return MCPTools;
}

/**
 * 执行工具调用
 * @param {string} toolName - 工具名称
 * @param {Object} params - 工具参数
 * @returns {Object} - 执行结果
 */
function executeTool(toolName, params) {
  const handler = ToolHandlers[toolName];

  if (!handler) {
    return {
      success: false,
      error: `未知的工具: ${toolName}`
    };
  }

  try {
    const result = handler(params);
    return result;
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 批量执行工具调用
 * @param {Array} toolCalls - 工具调用列表
 * @returns {Array} - 执行结果列表
 */
function executeTools(toolCalls) {
  return toolCalls.map(call => ({
    id: call.id,
    name: call.name,
    result: executeTool(call.name, call.input || call.params)
  }));
}

module.exports = {
  getToolDefinitions,
  executeTool,
  executeTools
};
