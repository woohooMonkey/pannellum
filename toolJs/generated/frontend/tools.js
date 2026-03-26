/**
 * 前端工具方法 - 自动生成
 * 生成时间: 2026-03-23T02:58:28.567Z
 */

const FrontendTools = {
  move: (params) => UI.mv(params.color),
  resize: (params) => UI.rs(params.width, params.height),
  change_theme: (params) => ui.setTheme(params.color),
  show_notification: (params) => toast.show(params.message, params.type)
};

// 工具描述信息
const ToolDescriptions = [
  {
    "name": "move",
    "description": "移动对象",
    "parameters": {
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
    "name": "resize",
    "description": "修改对象的宽度或者高度",
    "parameters": {
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
    "name": "change_theme",
    "description": "改变应用的主题颜色",
    "parameters": {
      "type": "object",
      "properties": {
        "color": {
          "type": "string",
          "description": "颜色值，如 red, #ff0000"
        }
      },
      "required": [
        "color"
      ]
    }
  },
  {
    "name": "show_notification",
    "description": "在屏幕右上角显示通知消息",
    "parameters": {
      "type": "object",
      "properties": {
        "message": {
          "type": "string",
          "description": "通知内容"
        },
        "type": {
          "type": "string",
          "enum": [
            "info",
            "success",
            "error"
          ]
        }
      },
      "required": [
        "message"
      ]
    }
  }
];

// 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { FrontendTools, ToolDescriptions };
}
