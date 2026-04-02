/**
 * 后端 MCP 工具定义 - 自动生成，请勿手动修改
 * 生成时间: 2026-04-02T01:38:52.151Z
 */

export const tools = [
  {
    name: 'navigate_to_scene',
    description: '跳转到指定的全景图场景。当用户想去的"目的地"是一个场景名称时使用此工具。',
    inputSchema:     {
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
    }
  },
  {
    name: 'navigate_to_marker',
    description: '导航到指定的标记点。当用户想去或者想找的的"目的地"是一个具体的普通标记点（如某个展品、某个位置,某个物品/动物）时使用此工具。会自动跳转到标记点所在的场景，并将视角对准该标记点。',
    inputSchema:     {
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
    }
  },
  {
    name: 'start_scene_tour',
    description: '开始场景漫游，按照指定顺序依次游览多个场景。当用户想要游览多个地方时使用： 例如: "带我去大厅和会议室"、"先去大厅，再去会议室" ;【重要】sceneIds 必须按用户提到的先后顺序排列',
    inputSchema:     {
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
 * 获取工具列表（用于 Anthropic API)
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
