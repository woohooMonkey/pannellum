/**
 * 后端MCP工具定义 - 自动生成
 * 生成时间: 2026-03-23T02:58:28.567Z
 */

const MCPTools = [
  {
    "name": "move",
    "description": "移动对象",
    "input_schema": {
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
    "input_schema": {
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
    "input_schema": {
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
    "input_schema": {
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

// 工具处理函数映射
const ToolHandlers = {
  'move': (params) => {
    // 前端将执行: UI.mv
    return {
      success: true,
      action: 'move',
      params: params,
      frontendCall: 'UI.mv'
    };
  },
  'resize': (params) => {
    // 前端将执行: UI.rs
    return {
      success: true,
      action: 'resize',
      params: params,
      frontendCall: 'UI.rs'
    };
  },
  'change_theme': (params) => {
    // 前端将执行: ui.setTheme
    return {
      success: true,
      action: 'change_theme',
      params: params,
      frontendCall: 'ui.setTheme'
    };
  },
  'show_notification': (params) => {
    // 前端将执行: toast.show
    return {
      success: true,
      action: 'show_notification',
      params: params,
      frontendCall: 'toast.show'
    };
  }
};

// 导出
module.exports = { MCPTools, ToolHandlers };
