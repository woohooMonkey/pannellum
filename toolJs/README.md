# Auto-MCP

基于配置文件的前后端MCP工具生成框架，实现大模型控制前端UI的完整应用。

## 项目简介

Auto-MCP 是一个基于配置文档，自动生成前端JS工具代码和后端MCP服务代码的应用框架，确保前后端工具定义的一致性。用户可以通过自然语言与大模型对话，大模型自动选择合适的工具并执行前端操作。

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | 原生 JavaScript / CSS / HTML |
| 后端 | Node.js + Express |
| 大模型 | Anthropic Claude API |
| MCP服务 | @anthropic-ai/sdk |

## 项目结构

```
auto-mcp/
├── doc/                        # 配置文件目录
│   ├── template.json           # 主题/通知工具配置
│   └── action.json             # 移动/缩放工具配置
├── generated/                  # 自动生成的代码
│   ├── frontend/
│   │   └── tools.js            # 前端工具方法
│   └── backend/
│       └── mcp-tools.js        # 后端MCP工具定义
├── server/                     # 后端服务
│   ├── index.js                # Express主服务
│   ├── anthropic-client.js     # Anthropic API客户端
│   └── mcp-server.js           # MCP服务处理模块
├── public/                     # 前端静态文件
│   ├── index.html              # 主页面
│   ├── style.css               # 样式文件
│   ├── app.js                  # 主应用逻辑
│   └── executor.js             # 白名单安全执行器
├── scripts/
│   └── generate.js             # 代码生成器
├── .env                        # 环境变量配置
├── .env.example                # 环境变量示例
├── package.json
└── README.md
```

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env`，并填入你的 Anthropic API Key：

```env
# Anthropic API 配置
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# 服务器配置
PORT=3000
HOST=localhost
```

### 3. 生成代码并启动服务

```bash
# 生成代码并启动（推荐）
npm run dev

# 或分步执行
npm run generate   # 生成前后端代码
npm start          # 启动服务
```

### 4. 访问应用

打开浏览器访问：http://localhost:3000

## 配置文件说明

配置文件位于 `doc/` 目录，支持多个JSON文件，每个文件可包含多个工具定义。

### 配置格式示例

```json
[
  {
    "name": "工具名称",
    "description": "工具描述（大模型用于理解工具用途）",
    "parameters": {
      "type": "object",
      "properties": {
        "参数名": { "type": "类型", "description": "参数描述" }
      },
      "required": ["必需参数列表"]
    },
    "frontend": {
      "handler": "前端调用方法路径",
      "comment": "说明"
    },
    "backend": {
      "log": true,
      "comment": "后端处理说明"
    }
  }
]
```

### 当前可用工具

| 工具名称 | 描述 | 参数 |
|---------|------|------|
| `move` | 移动人物位置 | `value`: 移动数值 |
| `resize` | 调整人物大小 | `width`, `height` |
| `change_theme` | 改变主题颜色 | `color`: 颜色值 |
| `show_notification` | 显示通知消息 | `message`, `type` |

## API 接口

### POST /api/chat

发送消息给大模型，获取工具调用结果。

**请求体：**
```json
{
  "message": "请帮我移动200",
  "resetHistory": false
}
```

**响应：**
```json
{
  "success": true,
  "content": [...],
  "toolCalls": [
    {
      "id": "call_xxx",
      "name": "move",
      "input": { "value": "200" }
    }
  ],
  "stopReason": "tool_use"
}
```

### GET /api/tools

获取所有可用工具列表。

### POST /api/execute

直接执行指定工具。

**请求体：**
```json
{
  "toolName": "move",
  "params": { "value": 200 }
}
```

### POST /api/reset

重置对话历史。

## 调用流程

```
用户输入自然语言
       │
       ▼
┌──────────────────┐
│   前端发送请求    │
│  POST /api/chat  │
└──────────────────┘
       │
       ▼
┌──────────────────┐
│  后端调用        │
│  Anthropic API   │
│  + 携带MCP工具   │
└──────────────────┘
       │
       ▼
┌──────────────────┐
│  Claude 大模型   │
│  理解意图        │
│  选择工具+参数   │
└──────────────────┘
       │
       ▼
┌──────────────────┐
│  后端返回        │
│  工具调用信息    │
└──────────────────┘
       │
       ▼
┌──────────────────┐
│  前端安全执行器  │
│  白名单验证      │
│  执行对应方法    │
└──────────────────┘
       │
       ▼
    UI 更新
```

## 安全执行机制

前端使用白名单机制执行方法，不使用 `eval`：

```javascript
// 注册方法到白名单
SafeExecutor.register('move', (params) => {
  UI.mv(params.value);
});

// 安全执行
SafeExecutor.execute('move', { value: 200 });
```

只有预先注册到白名单的方法才能被执行，确保安全性。

## 扩展工具

### 1. 添加新工具配置

在 `doc/` 目录下创建或编辑JSON文件：

```json
{
  "name": "new_tool",
  "description": "新工具描述",
  "parameters": {
    "type": "object",
    "properties": {
      "param1": { "type": "string", "description": "参数1" }
    },
    "required": ["param1"]
  },
  "frontend": {
    "handler": "UI.newMethod",
    "comment": "新方法说明"
  },
  "backend": {
    "log": true
  }
}
```

### 2. 实现前端方法

在 `public/app.js` 中添加：

```javascript
const UI = {
  // ... 现有方法

  newMethod(param1) {
    // 实现逻辑
  }
};

// 注册到安全执行器
SafeExecutor.register('new_tool', (params) => {
  UI.newMethod(params.param1);
});
```

### 3. 重新生成代码

```bash
npm run generate
```

## 前端示例功能

当前前端示例应用包含：

1. **运动人物动画** - CSS关键帧动画实现的人物，支持移动和缩放
2. **大模型对话窗口** - 页面顶部的输入框，支持自然语言交互
3. **Toast通知系统** - 右上角显示操作反馈
4. **状态显示** - 底部显示当前工具数量和状态

## 示例命令

| 自然语言输入 | 执行工具 |
|-------------|---------|
| "把人物移动到右边" | `move` |
| "移动200" | `move` |
| "改变颜色为红色" | `change_theme` |
| "显示消息：操作成功" | `show_notification` |
| "调整大小，宽度150" | `resize` |

## 依赖说明

```json
{
  "express": "^4.18.2",           // Web服务器
  "@anthropic-ai/sdk": "^0.27.0", // Anthropic API SDK
  "dotenv": "^16.3.1",            // 环境变量管理
  "cors": "^2.8.5"                // 跨域支持
}
```

## 许可证

MIT License
