/**
 * 前端工具定义 - 自动生成，请勿手动修改
 * 生成时间: 2026-04-02T02:28:58.937Z
 */

// 工具描述信息
export const toolDescriptions = [
  {
    "name": "navigate_to_scene",
    "description": "跳转到指定的全景图场景。当用户想去的\"目的地\"是一个场景名称时使用此工具。",
    "parameters": {
      "type": "object",
      "properties": {
        "sceneId": {
          "type": "number",
          "description": "目标场景的ID"
        },
        "sceneName": {
          "type": "string",
          "description": "目标场景的名称"
        }
      },
      "required": [
        "sceneId",
        "sceneName"
      ]
    },
    "handler": "navigator.navigateToScene"
  },
  {
    "name": "navigate_to_marker",
    "description": "导航到指定的普通标记点。当用户想去或者想找的的\"目的地\"是一个具体的普通标记点（如某个展品、某个位置,某个物品/动物）时使用此工具。会自动跳转到标记点所在的场景，并将视角对准该标记点。",
    "parameters": {
      "type": "object",
      "properties": {
        "markerId": {
          "type": "number",
          "description": "目标标记点的ID"
        },
        "markerTitle": {
          "type": "string",
          "description": "目标标记点的标题"
        },
        "sceneId": {
          "type": "number",
          "description": "标记点所属的场景ID"
        },
        "sceneName": {
          "type": "string",
          "description": "标记点所属的场景名称"
        }
      },
      "required": [
        "markerId",
        "sceneId",
        "markerTitle",
        "sceneName"
      ]
    },
    "handler": "navigator.navigateToMarker"
  },
  {
    "name": "start_scene_tour",
    "description": "开始场景漫游，按照指定顺序依次游览多个场景。当用户想要游览多个地方时使用： 例如: \"带我去大厅和会议室\"、\"先去大厅，再去会议室\" ;【重要】sceneIds 必须按用户提到的先后顺序排列",
    "parameters": {
      "type": "object",
      "properties": {
        "sceneIds": {
          "type": "array",
          "items": {
            "type": "number"
          },
          "description": "漫游场景ID列表，按顺序排列"
        },
        "sceneNames": {
          "type": "array",
          "items": {
            "type": "string"
          },
          "description": "漫游场景名称列表"
        }
      },
      "required": [
        "sceneIds"
      ]
    },
    "handler": "navigator.startSceneTour"
  },
  {
    "name": "text_response",
    "description": "当无法匹配到具体操作时，返回文本响应给用户，提供可用场景和标记点列表。",
    "parameters": {
      "type": "object",
      "properties": {
        "message": {
          "type": "string",
          "description": "返回给用户的文本消息"
        },
        "availableScenes": {
          "type": "array",
          "items": {
            "type": "string"
          },
          "description": "可用场景列表"
        },
        "availableMarkers": {
          "type": "array",
          "items": {
            "type": "string"
          },
          "description": "可用标记点列表"
        }
      },
      "required": [
        "message"
      ]
    },
    "handler": "navigator.showTextResponse"
  }
];

// 工具名称列表（白名单）
export const toolNames = ['navigate_to_scene', 'navigate_to_marker', 'start_scene_tour', 'text_response'];

// 工具处理器映射
export const toolHandlers = {
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
 * 获取工具处理器
 * @param {string} toolName - 工具名称
 * @returns {string|null} 处理器路径
 */
export function getToolHandler(toolName) {
  return toolHandlers[toolName] || null;
}

export default {
  toolDescriptions,
  toolNames,
  toolHandlers,
  isValidTool,
  getToolHandler
};
