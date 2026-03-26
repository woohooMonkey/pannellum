/**
 * Express 主服务器
 * 提供API端点和静态文件服务
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { chat, getAvailableTools } = require('./anthropic-client');
const { executeTool, executeTools } = require('./mcp-server');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// 对话历史存储（简单实现，实际应用应使用数据库）
let conversationHistory = [];

/**
 * API: 发送消息给大模型
 * POST /api/chat
 */
app.post('/api/chat', async (req, res) => {
  try {
    const { message, resetHistory } = req.body;

    if (!message) {
      return res.status(400).json({ error: '消息不能为空' });
    }

    // 重置对话历史
    if (resetHistory) {
      conversationHistory = [];
    }

    // 调用大模型
    const result = await chat(message, conversationHistory);

    // 更新对话历史
    conversationHistory.push({ role: 'user', content: message });
    if (result.content.length > 0) {
      const assistantContent = result.content
        .filter(c => c.type === 'text')
        .map(c => c.text)
        .join('\n');
      if (assistantContent) {
        conversationHistory.push({ role: 'assistant', content: assistantContent });
      }
    }

    res.json({
      success: true,
      content: result.content,
      toolCalls: result.toolCalls,
      stopReason: result.stopReason
    });
  } catch (error) {
    console.error('聊天错误:', error);
    res.status(500).json({
      success: false,
      error: error.message || '服务器内部错误'
    });
  }
});

/**
 * API: 获取可用工具列表
 * GET /api/tools
 */
app.get('/api/tools', (req, res) => {
  try {
    const tools = getAvailableTools();
    res.json({
      success: true,
      tools: tools
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * API: 执行工具
 * POST /api/execute
 */
app.post('/api/execute', (req, res) => {
  try {
    const { toolName, params } = req.body;

    if (!toolName) {
      return res.status(400).json({ error: '工具名称不能为空' });
    }

    const result = executeTool(toolName, params || {});
    res.json({
      success: true,
      result: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * API: 重置对话历史
 * POST /api/reset
 */
app.post('/api/reset', (req, res) => {
  conversationHistory = [];
  res.json({
    success: true,
    message: '对话历史已重置'
  });
});

/**
 * 主页路由
 */
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`\n========================================`);
  console.log(`  Auto-MCP 服务已启动`);
  console.log(`  地址: http://localhost:${PORT}`);
  console.log(`========================================\n`);
  console.log('API端点:');
  console.log('  POST /api/chat    - 发送消息给大模型');
  console.log('  GET  /api/tools   - 获取可用工具列表');
  console.log('  POST /api/execute - 执行工具');
  console.log('  POST /api/reset   - 重置对话历史');
  console.log('');
});
