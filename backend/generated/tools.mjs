/**
 * 后端 MCP 工具定义 - 自动生成，请勿手动修改
 * 生成时间: 2026-03-23T06:18:28.822Z
 */

export const tools = [
  {
    name: 'move',
    description: '移动对象',
    inputSchema: {
        "type": "object",
        "properties": {
            "color": {
                "type": "number",
                "description": "移动的数值，如100"
            }
        },
        "required": [
            "value"
        ]
    }
  },
  {
    name: 'resize',
    description: '修改对象的宽度或者高度',
    inputSchema: {
        "type": "object",
        "properties": {
            "width": {
                "type": "number",
                "description": "宽度"
            },
            "height": {
                "type": "umbe",
                "description": "高度"
            }
        },
        "required": [
            "message"
        ]
    }
  },
  {
    name: 'navigate_to_scene',
    description: '跳转到指定的全景图场景',
    inputSchema: {
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
            "sceneId"
        ]
    }
  },
  {
    name: 'start_scene_tour',
    description: '开始场景漫游，按照指定顺序依次游览多个场景',
    inputSchema: {
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
    }
  },
  {
    name: 'navigate_to_scene',
    description: '跳转到指定的全景图场景',
    inputSchema: {
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
            "sceneId"
        ]
    }
  },
  {
    name: 'start_scene_tour',
    description: '开始场景漫游，按照指定顺序依次游览多个场景',
    inputSchema: {
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
