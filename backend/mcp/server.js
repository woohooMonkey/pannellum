#!/usr/bin/env node

/**
 * MCP Server - Model Context Protocol 服务
 * 提供全景图相关的工具供 LLM 调用
 */

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const panoramaTools = require('./tools/panorama');

// 创建 MCP Server
const server = new Server(
  {
    name: 'panorama-mcp-server',
    version: '1.0.0',
  },
  {
    capabilities: {
    tools: {}
  }
);

// 注册工具列表
server.setRequestHandler('tools/list', async () => {
  return {
    tools: [
      {
        name: 'list_panoramas',
        description: '获取所有全景图场景列表',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      },
      {
        name: 'search_panorama_by_name',
        description: '根据名称模糊搜索全景图场景',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: '场景名称（支持模糊匹配）'
            }
          },
          required: ['name']
        }
      },
      {
        name: 'get_navigation_path',
        description: '获取从一个场景到另一个场景的导航路径',
        inputSchema: {
          type: 'object',
          properties: {
            startSceneName: {
              type: 'string',
              description: '起始场景名称'
            },
            endSceneName: {
              type: 'string',
              description: '目标场景名称'
            }
          },
          required: ['startSceneName', 'endSceneName']
        }
      },
      {
        name: 'get_scene_names',
        description: '获取所有场景名称列表，用于理解用户意图',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      }
    ]
  };
});

// 注册工具调用处理
server.setRequestHandler('tools/call', async (request) => {
  const { name, arguments: args } = request.params;

  try {
    let result;

    switch (name) {
      case 'list_panoramas':
        result = await panoramaTools.list_panoramas();
        break;

      case 'search_panorama_by_name':
        result = await panoramaTools.search_panorama_by_name(args.name);
        break;

      case 'get_navigation_path':
        result = await panoramaTools.get_navigation_path(args.startSceneName, args.endSceneName);
        break;

      case 'get_scene_names':
        result = await panoramaTools.get_scene_names();
        break;

      default:
        throw new Error(`未知的工具: ${name}`);
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2)
        }
      ]
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: error.message
          })
        }
      ],
      isError: true
    };
  }
});

// 启动服务器
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('MCP Server 已启动');
}

main().catch(error => {
  console.error('MCP Server 启动失败:', error);
  process.exit(1);
});
