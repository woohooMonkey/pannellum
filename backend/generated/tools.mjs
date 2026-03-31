/**
 * 后端 MCP 工具定义
 * 更新时间: 2026-03-31
 */

export const tools = [
  {
    name: 'navigate_to_scene',
    description: '跳转到指定的全景图场景。当用户想去的"目的地"是一个场景名称时使用此工具。【重要】必须同时传递sceneId和sceneName两个参数。',
    inputSchema: {
      type: 'object',
      properties: {
        sceneId: {
          type: 'number',
          description: '目标场景的ID'
        },
        sceneName: {
          type: 'string',
          description: '目标场景的名称（必填）'
        }
      },
      required: ['sceneId', 'sceneName']
    }
  },
  {
    name: 'navigate_to_marker',
    description: '导航到指定的标记点。当用户想去的"目的地"是一个具体的标记点（如某个展品、某个位置）时使用此工具。会自动跳转到标记点所在的场景，并将视角对准该标记点。【重要】必须同时传递所有参数。',
    inputSchema: {
      type: 'object',
      properties: {
        markerId: {
          type: 'number',
          description: '目标标记点的ID'
        },
        markerTitle: {
          type: 'string',
          description: '目标标记点的标题'
        },
        sceneId: {
          type: 'number',
          description: '标记点所属的场景ID'
        },
        sceneName: {
          type: 'string',
          description: '标记点所属的场景名称'
        }
      },
      required: ['markerId', 'markerTitle', 'sceneId', 'sceneName']
    }
  },
  {
    name: 'start_scene_tour',
    description: '开始场景漫游，按照指定顺序依次游览多个场景。当用户想要"游览多个地方"、"漫游"、"先...后..."时使用此工具。【重要】sceneIds和sceneNames数组长度必须一致，顺序必须相同。',
    inputSchema: {
      type: 'object',
      properties: {
        sceneIds: {
          type: 'array',
          items: {
            type: 'number'
          },
          description: '漫游场景ID列表，按顺序排列'
        },
        sceneNames: {
          type: 'array',
          items: {
            type: 'string'
          },
          description: '漫游场景名称列表，与sceneIds顺序一致'
        }
      },
      required: ['sceneIds', 'sceneNames']
    }
  }
];

/**
 * 获取工具列表（用于 Anthropic API）
 * @returns {Array} 工具定义数组
 */
export function getToolsForAnthropic() {
  return tools;
}

/**
 * 获取工具名称列表
 * @returns {Array<string>} 工具名称数组
 */
export function getToolNames() {
  return tools.map(t => t.name);
}

export default tools;
