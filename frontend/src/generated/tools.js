/**
 * 前端工具定义
 *
 * 本文件定义了 AI 可以调用的工具列表
 * 包含：工具描述、参数定义、白名单校验
 *
 * 注意：处理器(handler)的具体实现需要在 Vue 组件中通过 registerTools() 注册
 */
// 工具描述信息（用于 AI 理解和调用）
export const toolDescriptions = [
  {
    name: 'navigate_to_scene',
    description: '跳转到指定的全景图场景。当用户想去的"目的地"是一个场景名称时使用此工具。',
    parameters: {
      type: 'object',
      properties: {
        sceneId: {
          type: 'number',
          description: '目标场景的ID'
        },
        sceneName: {
          type: 'string',
          description: '目标场景的名称'
        }
      },
      required: ['sceneId']
    }
  },
  {
    name: 'navigate_to_marker',
    description: '导航到指定的标记点。当用户想去的"目的地"是一个具体的标记点（如某个展品、某个位置）时使用此工具。会自动跳转到标记点所在的场景，并将视角对准该标记点。',
    parameters: {
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
      required: ['markerId', 'sceneId']
    }
  },
  {
    name: 'start_scene_tour',
    description: '开始场景漫游，按照用户输入的文本顺序依次游览多个场景。当用户想要"游览多个地方"、"漫游"时使用此工具。',
    parameters: {
      type: 'object',
      properties: {
        sceneIds: {
          type: 'array',
          items: {
            type: 'number'
          },
          description: '漫游场景ID列表，按用户输入的场景顺序排列'
        },
        sceneNames: {
          type: 'array',
          items: {
            type: 'string'
          },
          description: '漫游场景名称列表'
        }
      },
      required: ['sceneIds']
    }
  },
  {
    name: 'text_response',
    description: '当无法匹配到具体操作时，返回文本响应给用户，提供可用场景和标记点列表。',
    parameters: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          description: '返回给用户的文本消息'
        },
        availableScenes: {
          type: 'array',
          items: {
            type: 'string'
          },
          description: '可用场景列表'
        },
        availableMarkers: {
          type: 'array',
          items: {
            type: 'string'
          },
          description: '可用标记点列表'
        }
      },
      required: ['message']
    }
  }
];

// 工具名称列表（白名单）- 用于快速校验
export const toolNames = Object.freeze([
  'navigate_to_scene',
  'navigate_to_marker',
  'start_scene_tour',
  'text_response'
]);

// 工具名称到处理器的映射（字符串标识，实际函数在 Vue 中注册）
export const toolHandlerPaths = {
  'navigate_to_scene': 'navigator.navigateToScene',
  'navigate_to_marker': 'navigator.navigateToMarker',
  'start_scene_tour': 'navigator.startSceneTour',
  'text_response': 'navigator.showTextResponse'
};

/**
 * 检查工具是否在白名单中
 * @param {string} toolName - 工具名称
 * @returns {boolean}
 */
export function isValidTool(toolName) {
  return toolNames.includes(toolName);
}

/**
 * 获取工具处理器路径
 * @param {string} toolName - 工具名称
 * @returns {string|null} 处理器路径
 */
export function getToolHandlerPath(toolName) {
  return toolHandlerPaths[toolName] || null;
}

/**
 * 获取工具定义
 * @param {string} toolName - 工具名称
 * @returns {Object|null} 工具定义
 */
export function getToolDescription(toolName) {
  return toolDescriptions.find(t => t.name === toolName) || null;
}

/**
 * 获取所有工具定义（用于 AI 调用时参考）
 * @returns {Array} 工具定义数组
 */
export function getAllToolDescriptions() {
  return toolDescriptions;
}

export default {
  toolDescriptions,
  toolNames,
  toolHandlerPaths,
  isValidTool,
  getToolHandlerPath,
  getToolDescription,
  getAllToolDescriptions
};
