# AI 导航功能实现计划

## 需求概述
在首页添加一个导航功能：用户提供输入框输入目的地，大语言模型根据输入的地点个数，判断是进行直接跳转到对应场景，还是创建漫游线路图。

## 技术架构

```
用户输入 → 后端 LLM 服务 → MySQL MCP(场景数据) → 返回操作指令 → 前端执行
```

## 实现步骤

### 1. 创建 guide.json 配置文件
**文件**: `doc/guide.json`

定义两个操作方法：
- `navigate_to_scene`: 跳转到单个场景
- `start_tour`: 场景漫游（多个场景）

```json
[
  {
    "name": "navigate_to_scene",
    "description": "跳转到指定的全景图场景",
    "parameters": {
      "type": "object",
      "properties": {
        "scene_name": { "type": "string", "description": "目标场景名称或关键词" }
      },
      "required": ["scene_name"]
    },
    "frontend": {
      "handler": "guide.navigateTo",
      "comment": "调用前端导航模块跳转到指定场景"
    },
    "backend": {
      "mcp_query": true,
      "comment": "通过 MCP 查询场景信息"
    }
  },
  {
    "name": "start_tour",
    "description": "开始场景漫游，按顺序游览多个场景",
    "parameters": {
      "type": "object",
      "properties": {
        "scenes": {
          "type": "array",
          "items": { "type": "string" },
          "description": "要漫游的场景名称列表（按顺序）"
        }
      },
      "required": ["scenes"]
    },
    "frontend": {
      "handler": "guide.startTour",
      "comment": "调用前端开始漫游模式"
    },
    "backend": {
      "mcp_query": true,
      "comment": "通过 MCP 查询多个场景信息"
    }
  }
]
```

### 2. 创建代码生成器 (generate.js)
**文件**: `backend/generator/generate.js`

功能：
- 读取 `doc/*.json` 配置文件
- 生成前端 `actionMap` 和 `actionCommand` 映射代码
- 生成后端 MCP tools 工具定义

### 3. 创建 MySQL MCP 服务
**文件**: `backend/mcp/mysql-mcp.js`

提供工具：
- `query_scenes`: 根据名称关键词查询场景
- `get_all_scenes`: 获取所有可用场景列表
- `find_scene_by_keyword`: 模糊匹配场景名称

### 4. 创建 AI 导航后端服务
**文件**: `backend/services/aiGuideService.js`

功能：
- 接收用户输入
- 调用 Anthropic API（使用远程 token）
- 通过 MCP 查询场景数据
- 返回结构化操作指令

**路由**: `POST /api/v1/guide/navigate`

### 5. 前端实现

#### 5.1 创建前端 actionMap 和 actionCommand
**文件**: `frontend/src/utils/guideActions.js`

```javascript
// actionMap: 操作名称 -> 处理函数映射
export const actionMap = {
  'navigate_to_scene': (params) => { ... },
  'start_tour': (params) => { ... }
};

// actionCommand: 执行操作指令
export function executeAction(action) {
  const handler = actionMap[action.name];
  if (handler) {
    return handler(action.parameters);
  }
}
```

#### 5.2 修改 Preview.vue 添加导航输入框
在顶部导航栏添加：
- 输入框
- 发送按钮
- AI 回复显示区域

### 6. 配置文件结构

```
doc/
├── template.json     # 模板格式（已存在）
├── action.json       # 通用操作（已存在）
└── guide.json        # 导航操作配置（新建）

backend/
├── generator/
│   └── generate.js   # 代码生成器（新建）
├── mcp/
│   └── mysql-mcp.js  # MySQL MCP 服务（新建）
├── services/
│   └── aiGuideService.js  # AI 导航服务（新建）
└── routes/
    └── guide.js      # 导航路由（新建）

frontend/
└── src/
    └── utils/
        └── guideActions.js  # 前端操作映射（新建）
```

## API 设计

### POST /api/v1/guide/navigate

**请求**:
```json
{
  "query": "我想去大厅"
}
```

**响应（单场景跳转）**:
```json
{
  "success": true,
  "action": {
    "name": "navigate_to_scene",
    "parameters": {
      "scene_id": 1,
      "scene_name": "大厅"
    }
  },
  "message": "正在为您跳转到「大厅」场景"
}
```

**响应（多场景漫游）**:
```json
{
  "success": true,
  "action": {
    "name": "start_tour",
    "parameters": {
      "scenes": [
        { "scene_id": 1, "scene_name": "大厅" },
        { "scene_id": 2, "scene_name": "走廊" },
        { "scene_id": 3, "scene_name": "会议室" }
      ]
    }
  },
  "message": "已为您规划漫游路线：大厅 → 走廊 → 会议室"
}
```

## 关键文件修改清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `doc/guide.json` | 新建 | 导航操作配置 |
| `backend/generator/generate.js` | 新建 | 代码生成器 |
| `backend/mcp/mysql-mcp.js` | 新建 | MySQL MCP 服务 |
| `backend/services/aiGuideService.js` | 新建 | AI 导航服务 |
| `backend/routes/guide.js` | 新建 | 导航路由 |
| `backend/app.js` | 修改 | 注册新路由 |
| `frontend/src/utils/guideActions.js` | 新建 | 前端操作映射 |
| `frontend/src/views/user/Preview.vue` | 修改 | 添加导航输入框 |
| `frontend/src/api/index.js` | 修改 | 添加导航 API |

## 验证步骤

1. 启动后端服务 `npm run dev`
2. 启动前端服务 `npm run serve`
3. 测试单场景跳转：输入"去大厅"
4. 测试多场景漫游：输入"带我从大厅经过走廊到会议室"
5. 测试无效输入：输入"去月球"，验证错误提示

## 依赖项

后端新增依赖：
- `@modelcontextprotocol/sdk` - MCP SDK
- `@anthropic-ai/sdk` - Anthropic API（如未安装）

## 注意事项

1. Anthropic API Token 应配置在 `.env` 文件中
2. MCP 服务需要正确配置 MySQL 连接信息
3. 前端需要处理加载状态和错误提示
